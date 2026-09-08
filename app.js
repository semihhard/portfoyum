/* ==========================================================================
   iOS Portfolio Tracker - Core Logic & State Engine
   ========================================================================== */

// --- Default Market Prices Mock Feed ---
const DEFAULT_MARKET_PRICES = {
    "THYAO": { price: 312.50, prevClose: 305.00, name: "Türk Hava Yolları", category: "STOCK" },
    "EREGL": { price: 54.20, prevClose: 55.10, name: "Ereğli Demir Çelik", category: "STOCK" },
    "GARAN": { price: 118.40, prevClose: 116.00, name: "Garanti BBVA", category: "STOCK" },
    "AAPL":  { price: 7850.00, prevClose: 7720.00, name: "Apple Inc. (TL Equivalent)", category: "STOCK" },
    "TI1":   { price: 4.825, prevClose: 4.790, name: "İş Portföy Para Piyasası Fonu", category: "FUND" },
    "AFT":   { price: 0.428, prevClose: 0.421, name: "Ak Portföy Yeni Teknolojiler Fonu", category: "FUND" },
    "USD/TRY": { price: 38.45, prevClose: 38.38, name: "Amerikan Doları", category: "FX" },
    "EUR/TRY": { price: 41.20, prevClose: 41.15, name: "Euro", category: "FX" },
    "ALTIN": { price: 3080.00, prevClose: 3040.00, name: "Gram Altın", category: "FX" },
    "BTC":   { price: 3750000.00, prevClose: 3680000.00, name: "Bitcoin", category: "CRYPTO" },
    "ETH":   { price: 128000.00, prevClose: 131000.00, name: "Ethereum", category: "CRYPTO" }
};

// --- BIST Stocks Catalog (TradingView Live Feed) ---
let bistCatalog = [];
try {
    const cachedBist = localStorage.getItem("bist_catalog_cache");
    if (cachedBist) bistCatalog = JSON.parse(cachedBist);
} catch (e) {
    console.warn("BIST catalog cache load failed", e);
}

// --- Theme & Layout List ---
const THEMES = [
    "theme-oled-neon", 
    "theme-emerald-wealth", 
    "theme-bloomberg-amber", 
    "theme-midnight-violet", 
    "theme-titanium-light", 
    "theme-pure-light",
    "theme-neo-brutalism"
];
let currentThemeIndex = 0;

// --- State Object ---
let appState = {
    holdings: [],
    sales: [],
    manualT2Entries: [],
    settledSaleIds: [],
    marketPrices: { ...DEFAULT_MARKET_PRICES },
    privacyMode: false,
    activeCategory: "ALL",
    sortBy: "default",
    theme: "theme-oled-neon",
    layout: "layout-standard",
    pin: null,
    biometricEnabled: false,
    biometricCredentialId: null,
    lastCloseUpdateDate: null,
    notifications: []
};

// --- Initial Sample Data ---
function loadInitialSampleData() {
    appState.holdings = [];
    appState.sales = [];
    appState.manualT2Entries = [];
    appState.settledSaleIds = [];
}

// --- Storage Controls ---
function saveData() {
    localStorage.setItem("ios_portfolio_state_v5", JSON.stringify(appState));
}

function loadData() {
    const saved = localStorage.getItem("ios_portfolio_state_v5");
    if (saved) {
        try {
            appState = JSON.parse(saved);
            appState.marketPrices = { ...DEFAULT_MARKET_PRICES, ...appState.marketPrices };
            if (!appState.manualT2Entries) appState.manualT2Entries = [];
            if (!appState.settledSaleIds) appState.settledSaleIds = [];
            if (!appState.sortBy) appState.sortBy = "default";
        } catch (e) {
            console.error("Storage load error", e);
            loadInitialSampleData();
        }
    } else {
        loadInitialSampleData();
        saveData();
    }
    updateSortButtonUI();
    applyTheme(appState.theme || "theme-oled-neon");
    applyLayout(appState.layout || "layout-standard");
}

function applyTheme(themeClass) {
    if (!THEMES.includes(themeClass)) themeClass = "theme-oled-neon";
    document.body.className = themeClass;
    appState.theme = themeClass;
    currentThemeIndex = THEMES.indexOf(themeClass);
    if (currentThemeIndex < 0) currentThemeIndex = 0;
    
    // Update theme card active state in Theme Studio modal
    document.querySelectorAll(".theme-option-card").forEach(el => {
        if (el.getAttribute("data-theme") === themeClass) {
            el.classList.add("active");
        } else {
            el.classList.remove("active");
        }
    });

    saveData();
}

function selectTheme(themeClass) {
    applyTheme(themeClass);
}

function applyLayout(layoutClass) {
    const validLayouts = ["layout-standard", "layout-compact", "layout-grid", "layout-bento", "layout-terminal", "layout-minimal"];
    if (!validLayouts.includes(layoutClass)) layoutClass = "layout-standard";
    
    const container = document.getElementById("appContainer");
    if (container) {
        container.classList.remove("layout-standard", "layout-compact", "layout-grid", "layout-bento", "layout-terminal", "layout-minimal");
        container.classList.add(layoutClass);
    }
    
    appState.layout = layoutClass;

    // Update layout buttons
    const btnStandard = document.getElementById("btnLayoutStandard");
    const btnCompact = document.getElementById("btnLayoutCompact");
    const btnGrid = document.getElementById("btnLayoutGrid");
    const btnBento = document.getElementById("btnLayoutBento");
    const btnTerminal = document.getElementById("btnLayoutTerminal");
    const btnMinimal = document.getElementById("btnLayoutMinimal");

    if (btnStandard) btnStandard.classList.toggle("active", layoutClass === "layout-standard");
    if (btnCompact) btnCompact.classList.toggle("active", layoutClass === "layout-compact");
    if (btnGrid) btnGrid.classList.toggle("active", layoutClass === "layout-grid");
    if (btnBento) btnBento.classList.toggle("active", layoutClass === "layout-bento");
    if (btnTerminal) btnTerminal.classList.toggle("active", layoutClass === "layout-terminal");
    if (btnMinimal) btnMinimal.classList.toggle("active", layoutClass === "layout-minimal");

    saveData();
}

function selectLayout(layoutClass) {
    applyLayout(layoutClass);
}

function openThemeStudioModal() {
    applyTheme(appState.theme || "theme-oled-neon");
    applyLayout(appState.layout || "layout-standard");
    const modal = document.getElementById("themeStudioModal");
    if (modal) modal.classList.add("active");
}

function closeThemeStudioModal() {
    const modal = document.getElementById("themeStudioModal");
    if (modal) modal.classList.remove("active");
}

function cycleTheme() {
    openThemeStudioModal();
}

// --- Sorting System ---
const SORT_LABELS = {
    "default": "Varsayılan",
    "profit-desc": "Kâra Göre",
    "profit-pct-desc": "Getiri (%)",
    "loss-desc": "Zarara Göre",
    "daily-desc": "Günlük Artış",
    "weight-desc": "Portföy Payı",
    "alpha-asc": "Alfabetik"
};

function toggleSortMenu(e) {
    if (e) e.stopPropagation();
    const wrap = document.querySelector(".sort-dropdown-wrap");
    if (wrap) {
        wrap.classList.toggle("open");
    }
}

function selectSortOption(sortKey) {
    appState.sortBy = sortKey;
    saveData();
    updateSortButtonUI();
    const wrap = document.querySelector(".sort-dropdown-wrap");
    if (wrap) wrap.classList.remove("open");
    renderDashboard();
}

function updateSortButtonUI() {
    const currentKey = appState.sortBy || "default";
    const labelElem = document.getElementById("sortCurrentLabel");
    if (labelElem) {
        labelElem.innerText = SORT_LABELS[currentKey] || "Varsayılan";
    }
    const triggerBtn = document.getElementById("btnSortMenu");
    if (triggerBtn) {
        triggerBtn.classList.toggle("active", currentKey !== "default");
    }
    document.querySelectorAll(".sort-option").forEach(btn => {
        const k = btn.getAttribute("data-sort");
        btn.classList.toggle("active", k === currentKey);
    });
}

// --- Format Utilities ---
function formatCurrency(val) {
    if (appState.privacyMode) return "••••••";
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(val);
}

function formatNumber(val, decimals = 2) {
    if (appState.privacyMode) return "••••";
    return new Intl.NumberFormat('tr-TR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(val);
}

function formatPercent(val) {
    const sign = val > 0 ? "+" : "";
    return `${sign}${val.toFixed(2)}%`;
}

// --- T+2 Valör & Takas Calculation Engine ---
function toLocalDateStringISO(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function calculateBusinessDaysSettlement(startDateStr, businessDays = 2) {
    if (!startDateStr) startDateStr = toLocalDateStringISO(new Date());
    const parts = startDateStr.split('-');
    let current = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10), 12, 0, 0);
    while (current.getDay() === 0 || current.getDay() === 6) {
        current.setDate(current.getDate() + 1);
    }
    let added = 0;
    while (added < businessDays) {
        current.setDate(current.getDate() + 1);
        const day = current.getDay();
        if (day !== 0 && day !== 6) {
            added++;
        }
    }
    return toLocalDateStringISO(current);
}

function formatSettlementDateDisplay(dateStr) {
    if (!dateStr) return "";
    const parts = dateStr.split('-');
    const date = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10), 12, 0, 0);
    const options = { day: 'numeric', month: 'short', weekday: 'short' };
    return date.toLocaleDateString('tr-TR', options);
}

function formatFullDateDisplay(dateStr) {
    if (!dateStr) return "";
    const parts = dateStr.split('-');
    const date = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10), 12, 0, 0);
    const options = { day: 'numeric', month: 'long', year: 'numeric', weekday: 'long' };
    return date.toLocaleDateString('tr-TR', options);
}

function getPendingT2Data() {
    const todayStr = toLocalDateStringISO(new Date());
    const tomorrowDate = new Date();
    tomorrowDate.setDate(tomorrowDate.getDate() + 1);
    while (tomorrowDate.getDay() === 0 || tomorrowDate.getDay() === 6) {
        tomorrowDate.setDate(tomorrowDate.getDate() + 1);
    }
    const nextBusinessDayStr = toLocalDateStringISO(tomorrowDate);

    let totalPending = 0;
    let t1Pending = 0;
    let t2Pending = 0;
    const pendingItems = [];
    const settledItems = [];

    if (!appState.settledSaleIds) appState.settledSaleIds = [];
    if (!appState.manualT2Entries) appState.manualT2Entries = [];

    // 1. Process Stock Sales from appState.sales
    appState.sales.forEach(sale => {
        const isStock = !sale.category || sale.category === "STOCK";
        if (!isStock) return;

        const saleRevenue = (sale.saleQty || 0) * (sale.salePrice || 0);
        const settlementDate = sale.settlementDate || calculateBusinessDaysSettlement(sale.saleDate, 2);
        const isManuallySettled = appState.settledSaleIds.includes(sale.id);

        let status = 'pending';
        if (isManuallySettled || settlementDate < todayStr) {
            status = 'settled';
        } else if (settlementDate === todayStr) {
            status = 'today';
        } else {
            status = 'pending';
        }

        const itemObj = {
            id: sale.id,
            type: 'sale',
            symbol: sale.symbol,
            name: sale.name || sale.symbol,
            amount: saleRevenue,
            saleDate: sale.saleDate,
            settlementDate: settlementDate,
            status: status,
            isManual: false,
            qty: sale.saleQty,
            price: sale.salePrice
        };

        if (status === 'pending' || status === 'today') {
            totalPending += saleRevenue;
            if (settlementDate <= nextBusinessDayStr) {
                t1Pending += saleRevenue;
            } else {
                t2Pending += saleRevenue;
            }
            pendingItems.push(itemObj);
        } else {
            settledItems.push(itemObj);
        }
    });

    // 2. Process Manual Entries
    appState.manualT2Entries.forEach(entry => {
        const settlementDate = entry.settlementDate;
        let status = entry.status || 'pending';
        if (status !== 'settled' && settlementDate < todayStr) {
            status = 'settled';
        } else if (status !== 'settled' && settlementDate === todayStr) {
            status = 'today';
        }

        const itemObj = {
            id: entry.id,
            type: 'manual',
            symbol: entry.description,
            name: 'Manuel Valör Kaydı',
            amount: entry.amount || 0,
            saleDate: entry.createdDate || todayStr,
            settlementDate: settlementDate,
            status: status,
            isManual: true
        };

        if (status === 'pending' || status === 'today') {
            totalPending += entry.amount;
            if (settlementDate <= nextBusinessDayStr) {
                t1Pending += entry.amount;
            } else {
                t2Pending += entry.amount;
            }
            pendingItems.push(itemObj);
        } else {
            settledItems.push(itemObj);
        }
    });

    pendingItems.sort((a, b) => new Date(a.settlementDate) - new Date(b.settlementDate));
    settledItems.sort((a, b) => new Date(b.settlementDate) - new Date(a.settlementDate));

    const nearestDate = pendingItems.length > 0 ? pendingItems[0].settlementDate : null;

    return {
        totalPending,
        t1Pending,
        t2Pending,
        pendingItems,
        settledItems,
        nearestDate
    };
}

// --- Portfolio Calculation Engine ---
function calculateMetrics() {
    let totalNAV = 0;
    let totalCost = 0;
    let dailyPL = 0;
    let totalRealizedPL = 0;

    appState.holdings.forEach(h => {
        const marketVal = h.quantity * h.currentPrice;
        const costVal = h.quantity * h.avgCost;
        const prevVal = h.quantity * (h.previousClosePrice || h.currentPrice);

        totalNAV += marketVal;
        totalCost += costVal;
        dailyPL += (marketVal - prevVal);
    });

    appState.sales.forEach(s => {
        totalRealizedPL += s.realizedPL;
    });

    const totalUnrealizedPL = totalNAV - totalCost;
    const totalUnrealizedPLPct = totalCost > 0 ? (totalUnrealizedPL / totalCost) * 100 : 0;
    const prevTotalNAV = totalNAV - dailyPL;
    const dailyPLPct = prevTotalNAV > 0 ? (dailyPL / prevTotalNAV) * 100 : 0;

    return {
        totalNAV,
        totalCost,
        totalUnrealizedPL,
        totalUnrealizedPLPct,
        dailyPL,
        dailyPLPct,
        totalRealizedPL
    };
}

// --- Buy Action Logic ---
function addBuyTransaction(category, symbol, name, quantity, price, date, fee) {
    symbol = symbol.toUpperCase().trim();
    const catalogItem = bistCatalog.find(item => item.symbol === symbol);
    
    if (!name || name.trim() === '') {
        name = catalogItem?.name || appState.marketPrices[symbol]?.name || symbol;
    } else {
        name = name.trim();
    }

    let currentPrice = price;
    let prevClose = price;
    if (appState.marketPrices[symbol]) {
        currentPrice = appState.marketPrices[symbol].price;
        prevClose = appState.marketPrices[symbol].prevClose;
    } else if (catalogItem) {
        currentPrice = catalogItem.price;
        prevClose = catalogItem.prevClose;
        appState.marketPrices[symbol] = { price: catalogItem.price, prevClose: catalogItem.prevClose, name, category };
    } else {
        appState.marketPrices[symbol] = { price, prevClose: price, name, category };
    }

    const existingIndex = appState.holdings.findIndex(h => h.symbol === symbol);

    if (existingIndex >= 0) {
        const h = appState.holdings[existingIndex];
        const oldTotalCost = h.quantity * h.avgCost;
        const newBuyCost = (quantity * price) + fee;
        const newTotalQty = h.quantity + quantity;
        const newAvgCost = (oldTotalCost + newBuyCost) / newTotalQty;

        h.quantity = newTotalQty;
        h.avgCost = newAvgCost;
        h.currentPrice = currentPrice;
        h.transactions.push({ id: "t_" + Date.now(), date, price, qty: quantity, fee });
    } else {
        const totalBuyCost = (quantity * price) + fee;
        const avgCost = totalBuyCost / quantity;
        
        appState.holdings.push({
            id: "h_" + Date.now(),
            symbol,
            name,
            category,
            quantity,
            avgCost,
            currentPrice,
            previousClosePrice: prevClose,
            transactions: [{ id: "t_" + Date.now(), date, price, qty: quantity, fee }]
        });
    }

    saveData();
    renderAll();
}

// --- Sell Action Logic ---
function executeSaleTransaction(holdingId, saleQty, salePrice, saleDate) {
    const holdingIndex = appState.holdings.findIndex(h => h.id === holdingId);
    if (holdingIndex < 0) return false;

    const h = appState.holdings[holdingIndex];
    if (saleQty > h.quantity) {
        alert("Satış miktarı mevcut adetten fazla olamaz!");
        return false;
    }

    const costBasisAtSale = h.avgCost;
    const realizedPL = (salePrice - costBasisAtSale) * saleQty;
    const realizedPLPercent = costBasisAtSale > 0 ? ((salePrice - costBasisAtSale) / costBasisAtSale) * 100 : 0;
    const settlementDate = calculateBusinessDaysSettlement(saleDate, 2);

    appState.sales.unshift({
        id: "s_" + Date.now(),
        symbol: h.symbol,
        name: h.name,
        category: h.category,
        saleDate,
        settlementDate,
        saleQty,
        salePrice,
        costBasisAtSale,
        realizedPL,
        realizedPLPercent
    });

    h.quantity -= saleQty;

    if (h.quantity <= 0.000001) {
        appState.holdings.splice(holdingIndex, 1);
    }

    saveData();
    renderAll();
    return true;
}

function deleteAsset(holdingId) {
    if (confirm("Bu varlığı portföyden silmek istediğinize emin misiniz?")) {
        appState.holdings = appState.holdings.filter(h => h.id !== holdingId);
        saveData();
        renderAll();
    }
}

function checkAndRolloverDailyPrices() {
    const todayStr = new Date().toISOString().split('T')[0];
    
    // If it's a new day, rollover the current prices to previous close
    if (appState.lastCloseUpdateDate && appState.lastCloseUpdateDate !== todayStr) {
        appState.holdings.forEach(h => {
            h.previousClosePrice = h.currentPrice;
        });
        Object.keys(appState.marketPrices).forEach(sym => {
            if (appState.marketPrices[sym].price) {
                appState.marketPrices[sym].prevClose = appState.marketPrices[sym].price;
            }
        });
        console.log("Daily Rollover Triggered for:", todayStr);
    }
    
    appState.lastCloseUpdateDate = todayStr;
}

function updateMarketPrice(symbol, newPrice) {
    checkAndRolloverDailyPrices(); // Ensure daily rollover before updating

    const h = appState.holdings.find(item => item.symbol === symbol);
    if (h) {
        // If it's a brand new holding with no previous close, initialize it
        if (!h.previousClosePrice) h.previousClosePrice = h.currentPrice;
        h.currentPrice = newPrice;
    }
    if (appState.marketPrices[symbol]) {
        if (!appState.marketPrices[symbol].prevClose) appState.marketPrices[symbol].prevClose = appState.marketPrices[symbol].price;
        appState.marketPrices[symbol].price = newPrice;
    }
    saveData();
    renderAll();
}

// --- Render Dashboard ---
function renderDashboard() {
    const m = calculateMetrics();

    // Classic Hero Elements
    const classicNAV = document.getElementById("totalNAV");
    if (classicNAV) classicNAV.innerText = formatCurrency(m.totalNAV);

    const classicCost = document.getElementById("totalCost");
    if (classicCost) classicCost.innerText = formatCurrency(m.totalCost);

    const classicRealized = document.getElementById("totalRealizedPL");
    if (classicRealized) classicRealized.innerText = formatCurrency(m.totalRealizedPL);

    // T+2 Valör Bekleyen Bakiye Metrics
    const t2Data = getPendingT2Data();

    const heroT2Elem = document.getElementById("heroT2Pending");
    if (heroT2Elem) heroT2Elem.innerText = formatCurrency(t2Data.totalPending);

    const dashT2Val = document.getElementById("dashboardT2Value");
    if (dashT2Val) dashT2Val.innerText = formatCurrency(t2Data.totalPending);

    const dashT2Badge = document.getElementById("t2BadgeCount");
    if (dashT2Badge) dashT2Badge.innerText = `${t2Data.pendingItems.length} İşlem`;

    const dashT2Pulse = document.getElementById("t2PulseDot");
    if (dashT2Pulse) dashT2Pulse.style.display = t2Data.pendingItems.length > 0 ? "block" : "none";

    const dashT2Sub = document.getElementById("dashboardT2Sub");
    if (dashT2Sub) {
        if (t2Data.pendingItems.length > 0) {
            const nearestFormatted = formatSettlementDateDisplay(t2Data.nearestDate);
            dashT2Sub.innerHTML = `<i class="fa-solid fa-clock-rotate-left" style="color: #38BDF8;"></i> En yakın valör: <strong style="color: #BAE6FD;">${nearestFormatted}</strong> (${t2Data.pendingItems.length} satış takasta)`;
        } else {
            dashT2Sub.innerHTML = `<i class="fa-solid fa-shield-check" style="color: #10B981;"></i> Takasta bekleyen bakiye bulunmuyor`;
        }
    }

    const dailyClass = m.dailyPL > 0 ? "pos" : (m.dailyPL < 0 ? "neg" : "neut");
    const dailySign = m.dailyPL > 0 ? "+" : "";
    const dailyElem = document.getElementById("dailyPL");
    if (dailyElem) {
        dailyElem.innerHTML = `<span class="pl-badge ${dailyClass}">${dailySign}${formatCurrency(m.dailyPL)} (${formatPercent(m.dailyPLPct)})</span>`;
    }

    const totalPLClass = m.totalUnrealizedPL > 0 ? "pos" : (m.totalUnrealizedPL < 0 ? "neg" : "neut");
    const totalPLSign = m.totalUnrealizedPL > 0 ? "+" : "";
    const totalPLElem = document.getElementById("totalPL");
    if (totalPLElem) {
        totalPLElem.innerHTML = `<span class="pl-badge ${totalPLClass}">${totalPLSign}${formatCurrency(m.totalUnrealizedPL)} (${formatPercent(m.totalUnrealizedPLPct)})</span>`;
    }

    // Bento Modular Grid Widgets
    const bentoNav = document.getElementById("bentoTotalNAV");
    if (bentoNav) bentoNav.innerText = formatCurrency(m.totalNAV);

    const bentoCost = document.getElementById("bentoTotalCost");
    if (bentoCost) bentoCost.innerText = formatCurrency(m.totalCost);

    const bentoRealized = document.getElementById("bentoRealizedPL");
    if (bentoRealized) bentoRealized.innerText = `${m.totalRealizedPL >= 0 ? '+' : ''}${formatCurrency(m.totalRealizedPL)}`;

    const bentoT2Chip = document.getElementById("bentoT2Pending");
    if (bentoT2Chip) bentoT2Chip.innerText = formatCurrency(t2Data.totalPending);

    // Module 2: Daily Pulse
    const bentoDailyPLElem = document.getElementById("bentoDailyPL");
    if (bentoDailyPLElem) bentoDailyPLElem.innerText = `${dailySign}${formatCurrency(m.dailyPL)}`;

    const bentoDailyBadgeElem = document.getElementById("bentoDailyBadge");
    if (bentoDailyBadgeElem) {
        bentoDailyBadgeElem.className = `bento-pill ${dailyClass}`;
        bentoDailyBadgeElem.innerHTML = `<i class="fa-solid ${m.dailyPL >= 0 ? 'fa-arrow-trend-up' : 'fa-arrow-trend-down'}"></i> ${formatPercent(m.dailyPLPct)}`;
    }

    const bentoPulseCard = document.getElementById("bentoPulseCard");
    if (bentoPulseCard) {
        bentoPulseCard.classList.remove("glow-pos", "glow-neg", "glow-neut");
        bentoPulseCard.classList.add(`glow-${dailyClass}`);
    }

    // Module 3: Total Yield & Capital Multiplier
    const bentoTotalPLElem = document.getElementById("bentoTotalPL");
    if (bentoTotalPLElem) bentoTotalPLElem.innerText = `${totalPLSign}${formatCurrency(m.totalUnrealizedPL)}`;

    const bentoTotalBadgeElem = document.getElementById("bentoTotalBadge");
    if (bentoTotalBadgeElem) {
        bentoTotalBadgeElem.className = `bento-pill ${totalPLClass}`;
        bentoTotalBadgeElem.innerHTML = `<i class="fa-solid ${m.totalUnrealizedPL >= 0 ? 'fa-arrow-trend-up' : 'fa-arrow-trend-down'}"></i> ${formatPercent(m.totalUnrealizedPLPct)}`;
    }

    const multiplier = m.totalCost > 0 ? (m.totalNAV / m.totalCost) : 1;
    const multLbl = document.getElementById("bentoMultiplierLbl");
    if (multLbl) {
        multLbl.innerHTML = `Sermaye Çarpanı: <strong>${multiplier.toFixed(2)}x</strong>`;
    }

    const bentoYieldCard = document.getElementById("bentoYieldCard");
    if (bentoYieldCard) {
        bentoYieldCard.classList.remove("glow-pos", "glow-neg", "glow-neut");
        bentoYieldCard.classList.add(`glow-${totalPLClass}`);
    }

    // Module 1: Live Multi-Asset Allocation Ribbon inside Balance Box & Module 6 Category Breakdown
    const catTotals = { STOCK: 0, FUND: 0, FX: 0, CRYPTO: 0 };
    appState.holdings.forEach(h => {
        const val = h.quantity * h.currentPrice;
        if (catTotals[h.category] !== undefined) {
            catTotals[h.category] += val;
        } else {
            catTotals.STOCK += val;
        }
    });

    const totalNavVal = m.totalNAV || 0;
    const stockPct = totalNavVal > 0 ? (catTotals.STOCK / totalNavVal) * 100 : 0;
    const fundPct = totalNavVal > 0 ? (catTotals.FUND / totalNavVal) * 100 : 0;
    const fxPct = totalNavVal > 0 ? (catTotals.FX / totalNavVal) * 100 : 0;
    const cryptoPct = totalNavVal > 0 ? (catTotals.CRYPTO / totalNavVal) * 100 : 0;

    const segStock = document.getElementById("bentoSegStock");
    if (segStock) segStock.style.width = `${stockPct.toFixed(1)}%`;
    const segFund = document.getElementById("bentoSegFund");
    if (segFund) segFund.style.width = `${fundPct.toFixed(1)}%`;
    const segFx = document.getElementById("bentoSegFx");
    if (segFx) segFx.style.width = `${fxPct.toFixed(1)}%`;
    const segCrypto = document.getElementById("bentoSegCrypto");
    if (segCrypto) segCrypto.style.width = `${cryptoPct.toFixed(1)}%`;

    const allocLegend = document.getElementById("bentoAllocLegend");
    if (allocLegend) {
        allocLegend.innerHTML = `
            <span class="bento-leg-item stock"><span class="dot"></span> Hisse %${stockPct.toFixed(0)}</span>
            <span class="bento-leg-item fund"><span class="dot"></span> Fon %${fundPct.toFixed(0)}</span>
            <span class="bento-leg-item fx"><span class="dot"></span> Döviz %${fxPct.toFixed(0)}</span>
            <span class="bento-leg-item crypto"><span class="dot"></span> Kripto %${cryptoPct.toFixed(0)}</span>
        `;
    }

    // Module 4: Top Performer of the Day (Günün Yıldızı)
    let topHolding = null;
    let topPct = -Infinity;
    appState.holdings.forEach(h => {
        const pct = h.previousClosePrice ? ((h.currentPrice - h.previousClosePrice) / h.previousClosePrice) * 100 : 0;
        if (pct > topPct) {
            topPct = pct;
            topHolding = { ...h, pct };
        }
    });

    const bentoStarSym = document.getElementById("bentoStarSymbol");
    const bentoStarPct = document.getElementById("bentoStarChange");
    const bentoStarName = document.getElementById("bentoStarName");
    if (bentoStarSym && bentoStarPct && bentoStarName) {
        if (topHolding && appState.holdings.length > 0) {
            bentoStarSym.innerText = topHolding.symbol;
            bentoStarPct.className = `bento-star-pct ${topHolding.pct >= 0 ? 'pos' : 'neg'}`;
            bentoStarPct.innerHTML = `<i class="fa-solid ${topHolding.pct >= 0 ? 'fa-arrow-trend-up' : 'fa-arrow-trend-down'}"></i> ${formatPercent(topHolding.pct)}`;
            bentoStarName.innerText = topHolding.name || topHolding.symbol;
        } else {
            bentoStarSym.innerText = "---";
            bentoStarPct.className = "bento-star-pct neut";
            bentoStarPct.innerText = "%0,00";
            bentoStarName.innerText = "Varlık bekleniyor";
        }
    }

    // Module 6: Diversification & Category Chips
    const activeCountElem = document.getElementById("bentoActiveCount");
    if (activeCountElem) {
        activeCountElem.innerText = `${appState.holdings.length} Aktif Varlık`;
    }

    const bentoCatChipsRow = document.getElementById("bentoCatChipsRow");
    if (bentoCatChipsRow) {
        bentoCatChipsRow.innerHTML = `
            <div class="bento-cat-chip stock">
                <span class="chip-title"><i class="fa-solid fa-chart-line"></i> Hisse</span>
                <strong class="chip-val">${formatCurrency(catTotals.STOCK)}</strong>
                <span class="chip-pct">%${stockPct.toFixed(1)}</span>
            </div>
            <div class="bento-cat-chip fund">
                <span class="chip-title"><i class="fa-solid fa-vault"></i> Fon</span>
                <strong class="chip-val">${formatCurrency(catTotals.FUND)}</strong>
                <span class="chip-pct">%${fundPct.toFixed(1)}</span>
            </div>
            <div class="bento-cat-chip fx">
                <span class="chip-title"><i class="fa-solid fa-coins"></i> Döviz</span>
                <strong class="chip-val">${formatCurrency(catTotals.FX)}</strong>
                <span class="chip-pct">%${fxPct.toFixed(1)}</span>
            </div>
            <div class="bento-cat-chip crypto">
                <span class="chip-title"><i class="fa-brands fa-bitcoin"></i> Kripto</span>
                <strong class="chip-val">${formatCurrency(catTotals.CRYPTO)}</strong>
                <span class="chip-pct">%${cryptoPct.toFixed(1)}</span>
            </div>
        `;
    }

    const listContainer = document.getElementById("assetsList");
    let displayHoldings = appState.activeCategory === "ALL" 
        ? [...appState.holdings] 
        : appState.holdings.filter(h => h.category === appState.activeCategory);

    document.getElementById("assetCount").innerText = displayHoldings.length;

    if (displayHoldings.length === 0) {
        listContainer.innerHTML = `
            <div class="empty-state">
                <i class="fa-solid fa-folder-open"></i>
                <p>Bu kategoride gösterilecek varlık bulunamadı.</p>
                <button class="btn-sm primary" onclick="openAddModal()" style="margin-top: 10px;">+ Varlık Ekle</button>
            </div>
        `;
        return;
    }

    // Apply active sorting
    const sortType = appState.sortBy || "default";
    if (sortType === "profit-desc") {
        displayHoldings.sort((a, b) => {
            const plA = (a.quantity * a.currentPrice) - (a.quantity * a.avgCost);
            const plB = (b.quantity * b.currentPrice) - (b.quantity * b.avgCost);
            return plB - plA;
        });
    } else if (sortType === "profit-pct-desc") {
        displayHoldings.sort((a, b) => {
            const pctA = a.avgCost > 0 ? ((a.currentPrice - a.avgCost) / a.avgCost) : 0;
            const pctB = b.avgCost > 0 ? ((b.currentPrice - b.avgCost) / b.avgCost) : 0;
            return pctB - pctA;
        });
    } else if (sortType === "loss-desc") {
        displayHoldings.sort((a, b) => {
            const plA = (a.quantity * a.currentPrice) - (a.quantity * a.avgCost);
            const plB = (b.quantity * b.currentPrice) - (b.quantity * b.avgCost);
            return plA - plB;
        });
    } else if (sortType === "daily-desc") {
        displayHoldings.sort((a, b) => {
            const pctA = a.previousClosePrice ? ((a.currentPrice - a.previousClosePrice) / a.previousClosePrice) : 0;
            const pctB = b.previousClosePrice ? ((b.currentPrice - b.previousClosePrice) / b.previousClosePrice) : 0;
            return pctB - pctA;
        });
    } else if (sortType === "weight-desc") {
        displayHoldings.sort((a, b) => {
            const valA = a.quantity * a.currentPrice;
            const valB = b.quantity * b.currentPrice;
            return valB - valA;
        });
    } else if (sortType === "alpha-asc") {
        displayHoldings.sort((a, b) => (a.symbol || "").localeCompare(b.symbol || ""));
    }

    listContainer.innerHTML = displayHoldings.map(h => {
        const marketValue = h.quantity * h.currentPrice;
        const totalPL = marketValue - (h.quantity * h.avgCost);
        const totalPLPct = h.avgCost > 0 ? ((h.currentPrice - h.avgCost) / h.avgCost) * 100 : 0;
        const isPos = totalPL >= 0;

        const dailyDiff = h.previousClosePrice ? (h.currentPrice - h.previousClosePrice) * h.quantity : 0;
        const dailyPct = h.previousClosePrice ? ((h.currentPrice - h.previousClosePrice) / h.previousClosePrice) * 100 : 0;
        const isDailyPos = dailyDiff >= 0;

        const weightPct = m.totalNAV > 0 ? (marketValue / m.totalNAV) * 100 : 0;

        const categoryLabels = { STOCK: "Hisse", FUND: "Fon", FX: "Döviz", CRYPTO: "Kripto" };
        const iconClasses = { STOCK: "stock fa-chart-line", FUND: "fund fa-vault", FX: "fx fa-coins", CRYPTO: "crypto fa-bitcoin" };
        
        const iconClassStr = iconClasses[h.category] || "stock fa-coins";
        const iconName = iconClassStr.split(' ').find(c => c.startsWith('fa-')) || "fa-coins";

        return `
            <div class="asset-card" onclick="openDetailModal('${h.id}')">
                <div class="asset-left">
                    <div class="asset-icon ${h.category ? h.category.toLowerCase() : 'stock'}">
                        <i class="fa-solid ${iconName}"></i>
                    </div>
                    
                    <div class="asset-details">
                        <div class="asset-title-row">
                            <span class="asset-symbol">${h.symbol}</span>
                            <span class="asset-cat-tag">${categoryLabels[h.category] || 'Hisse'}</span>
                            <span class="asset-weight-tag" title="Portföydeki Ağırlığı">%${weightPct.toFixed(1)} Pay</span>
                        </div>
                        <div class="asset-sub">
                            ${formatNumber(h.quantity, h.category === 'CRYPTO' ? 4 : 2)} Adet &bull; Ort: ${formatCurrency(h.avgCost)}
                        </div>
                        <div class="asset-pl-summary">
                            <span class="pl-tag total">Toplam:</span>
                            <span class="asset-pl-val ${isPos ? 'txt-neon-green' : 'txt-neon-red'}">
                                ${isPos ? '+' : ''}${formatCurrency(totalPL)} (${formatPercent(totalPLPct)})
                            </span>
                        </div>
                        <div class="asset-weight-bar-bg" title="Portföy Payı: %${weightPct.toFixed(1)}">
                            <div class="asset-weight-bar-fill" style="width: ${Math.min(weightPct, 100).toFixed(1)}%;"></div>
                        </div>
                    </div>
                </div>
                
                <div class="asset-right">
                    <div class="asset-val" title="Toplam Varlık Değeri">${formatCurrency(marketValue)}</div>
                    <div class="asset-unit-price" title="Anlık Fiyat">Fiyat: ${formatCurrency(h.currentPrice)}</div>
                    <div class="daily-badge-container">
                        <span class="pl-tag daily">Bugün:</span>
                        <div class="daily-badge ${isDailyPos ? 'pos' : 'neg'}" title="Bugünkü Değişim">
                            <i class="fa-solid ${isDailyPos ? 'fa-arrow-trend-up' : 'fa-arrow-trend-down'}"></i>
                            ${formatPercent(dailyPct)}
                        </div>
                    </div>
                    <div class="daily-diff-val ${isDailyPos ? 'txt-neon-green' : 'txt-neon-red'}" title="Bugünkü Tutar">
                        ${isDailyPos ? '+' : ''}${formatCurrency(dailyDiff)}
                    </div>
                </div>
            </div>
        `;
    }).join("");
}

// Close sort dropdown when clicking outside
document.addEventListener("click", (e) => {
    const sortWrap = document.querySelector(".sort-dropdown-wrap");
    if (sortWrap && sortWrap.classList.contains("open") && !e.target.closest(".sort-dropdown-wrap")) {
        sortWrap.classList.remove("open");
    }
});

// --- Render Sales Tab with Top 3 Podium & "Satılmasaydı Ne Olurdu?" Analysis ---
function renderSalesTab() {
    let totalRevenue = 0;
    let totalCost = 0;
    let totalPL = 0;
    let winCount = 0;
    let totalTrades = appState.sales.length;

    appState.sales.forEach(s => {
        const rev = s.saleQty * s.salePrice;
        const cost = s.saleQty * s.costBasisAtSale;
        totalRevenue += rev;
        totalCost += cost;
        totalPL += s.realizedPL;
        if (s.realizedPL > 0) winCount++;
    });

    const totalPLPercent = totalCost > 0 ? (totalPL / totalCost) * 100 : 0;
    const successRate = totalTrades > 0 ? (winCount / totalTrades) * 100 : 0;

    document.getElementById("salesTotalRevenue").innerText = formatCurrency(totalRevenue);
    document.getElementById("salesTotalCost").innerText = formatCurrency(totalCost);
    
    const plElem = document.getElementById("salesTotalPL");
    plElem.innerText = `${totalPL >= 0 ? '+' : ''}${formatCurrency(totalPL)} (${formatPercent(totalPLPercent)})`;
    plElem.className = `pl-badge ${totalPL >= 0 ? 'pos' : 'neg'}`;

    document.getElementById("salesSuccessRate").innerText = `%${successRate.toFixed(1)}`;
    document.getElementById("salesSuccessRate").className = successRate >= 50 ? "txt-neon-green" : "txt-neon-amber";
    // Group sales by symbol for aggregated view
    const groupedSales = {};
    appState.sales.forEach(s => {
        if (!groupedSales[s.symbol]) {
            groupedSales[s.symbol] = {
                symbol: s.symbol,
                name: s.name,
                category: s.category,
                saleQty: 0,
                totalRevenue: 0,
                totalCostBasis: 0,
                realizedPL: 0,
                saleDate: s.saleDate
            };
        }
        const g = groupedSales[s.symbol];
        g.saleQty += s.saleQty;
        g.totalRevenue += (s.saleQty * s.salePrice);
        g.totalCostBasis += (s.saleQty * s.costBasisAtSale);
        g.realizedPL += s.realizedPL;
        if (new Date(s.saleDate) > new Date(g.saleDate)) {
            g.saleDate = s.saleDate; // Keep latest sale date
        }
    });

    const aggregatedSales = Object.values(groupedSales).map(g => {
        g.salePrice = g.saleQty > 0 ? g.totalRevenue / g.saleQty : 0;
        g.costBasisAtSale = g.saleQty > 0 ? g.totalCostBasis / g.saleQty : 0;
        g.realizedPLPercent = g.totalCostBasis > 0 ? (g.realizedPL / g.totalCostBasis) * 100 : 0;
        return g;
    });

    // Sort by latest sale date (descending)
    aggregatedSales.sort((a, b) => new Date(b.saleDate) - new Date(a.saleDate));

    // 1. Render Top 3 Sales Leaderboard (using aggregated data)
    renderTopSalesPodium(aggregatedSales);

    // 2. Render Full Sales Log with What-If Analysis
    const container = document.getElementById("salesList");
    if (aggregatedSales.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fa-solid fa-receipt"></i>
                <p>Henüz satış işlemi yapılmadı.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = aggregatedSales.map(s => {
        const isPos = s.realizedPL >= 0;
        const whatIf = calculateWhatIf(s);

        return `
            <div class="sales-card-item">
                <div class="sales-card-header">
                    <div class="sales-card-header-left">
                        <div class="sales-avatar-icon">
                            <i class="fa-solid fa-money-bill-wave"></i>
                        </div>
                        <div>
                            <div class="sales-card-symbol">${s.symbol}</div>
                            <div class="sales-card-name">${s.name}</div>
                        </div>
                    </div>
                    
                    <div class="sales-card-header-right">
                        <div class="sales-card-date">Son İşlem: ${s.saleDate}</div>
                        <div class="sales-card-actions">
                            <button class="sales-action-btn" onclick="shareToStory('${s.symbol}', '${s.name}', ${s.costBasisAtSale * s.saleQty}, ${s.salePrice * s.saleQty}, ${s.realizedPL}, ${s.realizedPLPercent || 0}, 100, true)" title="Hikayede Paylaş">
                                <i class="fa-brands fa-instagram"></i> Paylaş
                            </button>
                            <button class="sales-action-btn" onclick="openEditSaleModal('${s.symbol}')" title="Düzenle">
                                <i class="fa-solid fa-pen"></i> Düzenle
                            </button>
                        </div>
                    </div>
                </div>

                <div class="sales-stats-row">
                    <div class="sales-stat-cell">
                        <div class="sales-stat-label">TOPLAM SATIŞ</div>
                        <div class="sales-stat-val">${formatNumber(s.saleQty, s.category === 'CRYPTO' ? 4 : 2)} Adet</div>
                    </div>
                    <div class="sales-stat-cell">
                        <div class="sales-stat-label">ORTALAMA FİYAT</div>
                        <div class="sales-stat-val">${formatCurrency(s.salePrice)}</div>
                    </div>
                    <div class="sales-stat-cell pl ${isPos ? 'pos' : 'neg'}">
                        <div class="sales-stat-label">GERÇEKLEŞEN KÂR</div>
                        <div class="sales-stat-val ${isPos ? 'txt-neon-green' : 'txt-neon-red'}">${isPos ? '+' : ''}${formatCurrency(s.realizedPL)}</div>
                        <div class="sales-stat-pct ${isPos ? 'txt-neon-green' : 'txt-neon-red'}">(${formatPercent(s.realizedPLPercent)})</div>
                    </div>
                </div>

                <div class="sales-what-if-banner ${whatIf.type}">
                    <div class="sales-what-if-icon">
                        <i class="fa-solid ${whatIf.icon}"></i>
                    </div>
                    <div class="sales-what-if-text">
                        ${whatIf.text}
                    </div>
                </div>
            </div>
        `;
    }).join("");
}

// Render Top 3 Sales Leaderboard
function renderTopSalesPodium(aggregatedSales) {
    const podiumElem = document.getElementById("topSalesPodium");
    const sorted = [...aggregatedSales].sort((a, b) => b.realizedPL - a.realizedPL);
    const top3 = sorted.slice(0, 3);

    if (top3.length === 0) {
        podiumElem.innerHTML = "<p class='txt-muted' style='padding: 10px; text-align: center;'>Satış kaydı yok.</p>";
        return;
    }

    const rankBadges = ["🥇", "🥈", "🥉"];

    podiumElem.className = "top-sales-grid";
    podiumElem.innerHTML = top3.map((s, idx) => `
        <div class="podium-card-item rank-${idx + 1}" onclick="shareToStory('${s.symbol}', '${s.name}', ${s.costBasisAtSale * s.saleQty}, ${s.salePrice * s.saleQty}, ${s.realizedPL}, ${s.realizedPLPercent || 0}, 100, true)">
            <div class="podium-badge">${rankBadges[idx]}</div>
            <h4 class="podium-symbol">${s.symbol}</h4>
            <span class="podium-gain ${s.realizedPL >= 0 ? 'txt-neon-green' : 'txt-neon-red'}">
                ${s.realizedPL >= 0 ? '+' : ''}${formatCurrency(s.realizedPL)}
            </span>
            <button class="podium-share-btn" title="Hikayede Paylaş">
                <i class="fa-brands fa-instagram"></i>
            </button>
        </div>
    `).join("");
}

// Calculate "Satılmasaydı Ne Olurdu?" Difference
function calculateWhatIf(sale) {
    // Current price of the asset today
    let currentPrice = sale.salePrice;
    if (appState.marketPrices[sale.symbol]) {
        currentPrice = appState.marketPrices[sale.symbol].price;
    } else {
        const h = appState.holdings.find(item => item.symbol === sale.symbol);
        if (h) currentPrice = h.currentPrice;
    }

    const proceedsReceived = sale.saleQty * sale.salePrice;
    const valueIfHeld = sale.saleQty * currentPrice;
    const diff = valueIfHeld - proceedsReceived;
    const diffPct = sale.salePrice > 0 ? ((currentPrice - sale.salePrice) / sale.salePrice) * 100 : 0;

    if (currentPrice > sale.salePrice) {
        // Price went up after selling -> Missed gain (Bad decision, Red)
        return {
            type: "negative",
            icon: "fa-triangle-exclamation",
            text: `<strong>Satılmasaydı:</strong> Anlık piyasa fiyatı (${formatCurrency(currentPrice)}) ile bu varlık bugün <strong>+${formatCurrency(diff)} (${formatPercent(diffPct)})</strong> daha yüksek değerde olacaktı.`
        };
    } else if (currentPrice < sale.salePrice) {
        // Price went down after selling -> Good sell decision! (Good decision, Green)
        const savedAmount = Math.abs(diff);
        return {
            type: "positive",
            icon: "fa-circle-check",
            text: `<strong>Doğru Zamanlama!</strong> Fiyat geriledi (${formatCurrency(currentPrice)}). Satılmasaydı elinizde kalsaydı <strong>${formatCurrency(savedAmount)} (${formatPercent(diffPct)})</strong> daha az değerde olacaktı.`
        };
    } else {
        return {
            type: "neutral",
            icon: "fa-equals",
            text: `<strong>Fiyat Değişmedi:</strong> Güncel piyasa fiyatı satış fiyatıyla aynı seviyede (${formatCurrency(currentPrice)}).`
        };
    }
}

let allocationChartInstance = null;

function renderAnalyticsTab() {
    const sorted = [...appState.holdings].sort((a, b) => {
        const plA = (a.currentPrice - a.avgCost) / a.avgCost;
        const plB = (b.currentPrice - b.avgCost) / b.avgCost;
        return plB - plA;
    });

    const topContainer = document.getElementById("topPerformersList");
    const rankBadges = ["🥇", "🥈", "🥉", "⭐"];
    if (sorted.length === 0) {
        topContainer.innerHTML = "<p class='txt-muted'>Portföyde varlık bulunmuyor.</p>";
    } else {
        topContainer.innerHTML = sorted.slice(0, 4).map((h, idx) => {
            const pct = ((h.currentPrice - h.avgCost) / h.avgCost) * 100;
            const isPos = pct >= 0;
            return `
                <div class="top-item">
                    <div class="top-item-left">
                        <span class="top-rank-badge">${rankBadges[idx] || '⭐'}</span>
                        <div class="top-info">
                            <span class="top-sym">${h.symbol}</span>
                            <span class="top-name">${h.name || h.symbol}</span>
                        </div>
                    </div>
                    <span class="top-val ${isPos ? 'txt-neon-green' : 'txt-neon-red'}">
                        <strong>${isPos ? '+' : ''}${formatPercent(pct)}</strong>
                    </span>
                </div>
            `;
        }).join("");
    }

    // Populate Analytics Bento Insight Metrics
    const topWinnerElem = document.getElementById("analyticsTopWinner");
    if (topWinnerElem) {
        if (sorted.length > 0) {
            const topPct = ((sorted[0].currentPrice - sorted[0].avgCost) / sorted[0].avgCost) * 100;
            topWinnerElem.innerHTML = `<span class="sym">${sorted[0].symbol}</span> <span class="pct ${topPct >= 0 ? 'txt-neon-green' : 'txt-neon-red'}">${topPct >= 0 ? '+' : ''}${formatPercent(topPct)}</span>`;
        } else {
            topWinnerElem.innerText = "---";
        }
    }

    const activeClassesElem = document.getElementById("analyticsActiveClasses");
    if (activeClassesElem) {
        const activeCats = new Set(appState.holdings.map(h => h.category));
        activeClassesElem.innerHTML = `<span class="classes-num">${activeCats.size} Sınıf</span> <small class="txt-muted">(${appState.holdings.length} Varlık)</small>`;
    }

    const categoryTotals = { STOCK: 0, FUND: 0, FX: 0, CRYPTO: 0 };
    appState.holdings.forEach(h => {
        categoryTotals[h.category] += (h.quantity * h.currentPrice);
    });

    const ctx = document.getElementById('allocationChart').getContext('2d');
    if (allocationChartInstance) {
        allocationChartInstance.destroy();
    }

    allocationChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Hisseler', 'Fonlar', 'Döviz/Altın', 'Kripto'],
            datasets: [{
                data: [categoryTotals.STOCK, categoryTotals.FUND, categoryTotals.FX, categoryTotals.CRYPTO],
                backgroundColor: ['#00E5FF', '#D946EF', '#F59E0B', '#FF922B'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { color: '#94A3B8', font: { family: 'Plus Jakarta Sans', weight: '700' } }
                }
            },
            cutout: '72%'
        }
    });
}

function renderMarketTab() {
    const container = document.getElementById("marketList");
    if (!container) return;
    const items = Object.entries(appState.marketPrices);

    container.innerHTML = items.map(([symbol, data]) => {
        const prev = data.prevClose || data.price;
        const diff = data.price - prev;
        const pct = prev > 0 ? (diff / prev) * 100 : 0;
        const isPos = diff >= 0;

        return `
            <div class="asset-card">
                <div class="asset-left">
                    <div class="asset-details">
                        <h4>${symbol}</h4>
                        <div class="asset-sub">${data.name || symbol}</div>
                    </div>
                </div>
                <div class="asset-right">
                    <div class="asset-val">${formatCurrency(data.price)}</div>
                    <div class="asset-pl ${isPos ? 'txt-neon-green' : 'txt-neon-red'}">
                        ${formatPercent(pct)}
                    </div>
                </div>
            </div>
        `;
    }).join("");
}

function renderAll() {
    renderDashboard();
    renderSalesTab();
    renderAnalyticsTab();
    renderMarketTab();
}

// --- Data Export (Modern Excel .xlsx) ---
async function exportToExcel() {
    try {
        const btn = event.currentTarget;
        const originalHtml = btn.innerHTML;
        btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Hazırlanıyor...`;
        btn.style.pointerEvents = "none";

        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'Portföyüm App';
        
        // --- Tab 1: Portföy ---
        const ws1 = workbook.addWorksheet('Portföyüm');
        ws1.columns = [
            { header: 'Varlık Adı', key: 'name', width: 25 },
            { header: 'Sembol', key: 'symbol', width: 12 },
            { header: 'Kategori', key: 'cat', width: 15 },
            { header: 'Adet', key: 'qty', width: 12 },
            { header: 'Ort. Maliyet', key: 'avgCost', width: 15 },
            { header: 'Güncel Fiyat', key: 'curPrice', width: 15 },
            { header: 'Toplam Maliyet', key: 'tCost', width: 18 },
            { header: 'Güncel Değer', key: 'tVal', width: 18 },
            { header: 'Kâr/Zarar (₺)', key: 'pl', width: 18 }
        ];

        // Header Style
        ws1.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
        ws1.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF8B5CF6' } };
        ws1.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

        appState.holdings.forEach(h => {
            const totalCost = h.quantity * h.avgCost;
            const totalValue = h.quantity * h.currentPrice;
            const pl = totalValue - totalCost;

            const row = ws1.addRow({
                name: h.name, symbol: h.symbol, cat: h.category,
                qty: h.quantity, avgCost: h.avgCost, curPrice: h.currentPrice,
                tCost: totalCost, tVal: totalValue, pl: pl
            });

            // Format numbers
            row.getCell('qty').numFmt = '#,##0.00';
            row.getCell('avgCost').numFmt = '₺#,##0.00';
            row.getCell('curPrice').numFmt = '₺#,##0.00';
            row.getCell('tCost').numFmt = '₺#,##0.00';
            row.getCell('tVal').numFmt = '₺#,##0.00';
            
            const plCell = row.getCell('pl');
            plCell.numFmt = '₺#,##0.00';
            if (pl > 0) plCell.font = { color: { argb: 'FF10B981' }, bold: true };
            else if (pl < 0) plCell.font = { color: { argb: 'FFEF4444' }, bold: true };
        });

        // --- Tab 2: Satış Geçmişi ---
        const ws2 = workbook.addWorksheet('Satış Geçmişi');
        ws2.columns = [
            { header: 'Tarih', key: 'date', width: 15 },
            { header: 'Sembol', key: 'symbol', width: 12 },
            { header: 'Satış Adedi', key: 'qty', width: 15 },
            { header: 'Alış Fiyatı', key: 'buyPrice', width: 15 },
            { header: 'Satış Fiyatı', key: 'sellPrice', width: 15 },
            { header: 'Gerçekleşen Kâr/Zarar', key: 'rPl', width: 22 }
        ];

        // Header Style
        ws2.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
        ws2.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0EA5E9' } };
        ws2.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

        appState.sales.forEach(s => {
            const row = ws2.addRow({
                date: s.saleDate, symbol: s.symbol, qty: s.saleQty,
                buyPrice: s.costBasisAtSale || 0, sellPrice: s.salePrice, rPl: s.realizedPL
            });

            row.getCell('qty').numFmt = '#,##0.00';
            row.getCell('buyPrice').numFmt = '₺#,##0.00';
            row.getCell('sellPrice').numFmt = '₺#,##0.00';
            
            const plCell = row.getCell('rPl');
            plCell.numFmt = '₺#,##0.00';
            if (s.realizedPL > 0) plCell.font = { color: { argb: 'FF10B981' }, bold: true };
            else if (s.realizedPL < 0) plCell.font = { color: { argb: 'FFEF4444' }, bold: true };
        });

        // Generate .xlsx Blob
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        
        // Download
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        const today = new Date().toLocaleDateString('tr-TR').replace(/\./g, '-');
        link.download = `Portfoy_Modern_Rapor_${today}.xlsx`;
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        // Reset Button
        setTimeout(() => {
            btn.innerHTML = originalHtml;
            btn.style.pointerEvents = "auto";
        }, 1000);

    } catch (err) {
        console.error("Excel Export Error:", err);
        alert("Excel oluşturulurken hata oluştu. Lütfen konsolu kontrol edin.");
        btn.innerHTML = originalHtml;
        btn.style.pointerEvents = "auto";
    }
}

// --- Data Import (Restore from .xlsx) ---
async function importFromExcel(event) {
    const file = event.target.files[0];
    if (!file) return;

    try {
        const reader = new FileReader();
        reader.onload = async (e) => {
            const buffer = e.target.result;
            const workbook = new ExcelJS.Workbook();
            await workbook.xlsx.load(buffer);

            let newHoldings = [];
            let newSales = [];

            // Read Holdings
            const wsHoldings = workbook.getWorksheet('Portföyüm');
            if (wsHoldings) {
                wsHoldings.eachRow((row, rowNumber) => {
                    if (rowNumber > 1) { // Skip header
                        const symbol = row.getCell(2).value;
                        if (symbol) {
                            newHoldings.push({
                                name: row.getCell(1).value,
                                symbol: symbol,
                                category: row.getCell(3).value,
                                quantity: parseFloat(row.getCell(4).value) || 0,
                                avgCost: parseFloat(row.getCell(5).value) || 0,
                                currentPrice: parseFloat(row.getCell(6).value) || 0
                            });
                        }
                    }
                });
            }

            // Read Sales
            const wsSales = workbook.getWorksheet('Satış Geçmişi');
            if (wsSales) {
                wsSales.eachRow((row, rowNumber) => {
                    if (rowNumber > 1) { // Skip header
                        const symbol = row.getCell(2).value;
                        if (symbol) {
                            // Trying to reconstruct missing fields for backward compatibility
                            const sQty = parseFloat(row.getCell(3).value) || 0;
                            const buyPrice = parseFloat(row.getCell(4).value) || 0;
                            const sellPrice = parseFloat(row.getCell(5).value) || 0;
                            
                            newSales.push({
                                saleDate: row.getCell(1).value,
                                symbol: symbol,
                                name: symbol, // Best effort
                                category: "STOCK", // Best effort fallback
                                saleQty: sQty,
                                costBasisAtSale: buyPrice,
                                salePrice: sellPrice,
                                realizedPL: parseFloat(row.getCell(6).value) || 0
                            });
                        }
                    }
                });
            }

            if (newHoldings.length > 0 || newSales.length > 0) {
                appState.holdings = newHoldings;
                appState.sales = newSales;
                saveData();
                renderAll();
                alert("Veriler başarıyla yüklendi!");
            } else {
                alert("Uygun Excel formatı bulunamadı. Lütfen 'Portföyüm' ve 'Satış Geçmişi' sekmeleri olan orijinal yedek dosyasını yükleyin.");
            }
        };
        reader.readAsArrayBuffer(file);
    } catch (err) {
        console.error("Excel Import Error:", err);
        alert("Excel okunurken hata oluştu. Dosya bozuk veya yanlış formatta olabilir.");
    } finally {
        event.target.value = ""; // Reset input
    }
}

// --- Navigation ---
function initNavigation() {
    const tabBtns = document.querySelectorAll(".ios-tab-bar .tab-item[data-tab]");
    tabBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            tabBtns.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");

            const targetTab = btn.getAttribute("data-tab");
            document.querySelectorAll(".tab-page").forEach(page => page.classList.remove("active"));
            document.getElementById(targetTab).classList.add("active");

            if (targetTab === "tab-analytics") renderAnalyticsTab();
            if (targetTab === "tab-sales") renderSalesTab();
            if (targetTab === "tab-news") fetchNews();
        });
    });

    document.querySelectorAll(".chip-btn").forEach(chip => {
        chip.addEventListener("click", () => {
            document.querySelectorAll(".chip-btn").forEach(c => c.classList.remove("active"));
            chip.classList.add("active");
            appState.activeCategory = chip.getAttribute("data-cat");
            renderDashboard();
        });
    });

    document.getElementById("btnToggleVisibility").addEventListener("click", () => {
        appState.privacyMode = !appState.privacyMode;
        document.getElementById("eyeIcon").className = appState.privacyMode ? "fa-solid fa-eye-slash" : "fa-solid fa-eye";
        renderAll();
    });

    document.getElementById("btnThemeToggle").addEventListener("click", () => {
        cycleTheme();
    });
}

// --- Modals ---
function openAddModal(presetSymbol = null) {
    document.getElementById("inputDate").value = new Date().toISOString().split('T')[0];
    const suggestionsBox = document.getElementById("symbolSuggestions");
    if (suggestionsBox) {
        suggestionsBox.classList.remove("active");
        suggestionsBox.innerHTML = "";
    }
    const symInput = document.getElementById("inputSymbol");
    if (presetSymbol && symInput) {
        symInput.value = presetSymbol;
        const found = bistCatalog.find(b => b.symbol === presetSymbol) || (appState.marketPrices && appState.marketPrices[presetSymbol]);
        if (found) {
            const nameInput = document.getElementById("inputName");
            if (nameInput && found.name) nameInput.value = found.name;
            const priceInput = document.getElementById("inputPrice");
            if (priceInput && found.price) priceInput.value = found.price;
            if (found.category) {
                const catRadio = document.querySelector(`input[name="assetCategory"][value="${found.category}"]`);
                if (catRadio) catRadio.checked = true;
            }
        }
    }
    document.getElementById("modalAddTransaction").classList.add("active");
}

function closeAddModal() {
    const suggestionsBox = document.getElementById("symbolSuggestions");
    if (suggestionsBox) {
        suggestionsBox.classList.remove("active");
        suggestionsBox.innerHTML = "";
    }
    document.getElementById("modalAddTransaction").classList.remove("active");
}

function openSellModal(holdingId) {
    const h = appState.holdings.find(item => item.id === holdingId);
    if (!h) return;

    document.getElementById("sellAssetId").value = h.id;
    document.getElementById("sellSymbolName").innerText = `${h.symbol} - ${h.name}`;
    document.getElementById("sellAvailableQty").innerText = `${formatNumber(h.quantity, h.category === 'CRYPTO' ? 4 : 2)} Adet`;
    document.getElementById("sellCurrentCost").innerText = formatCurrency(h.avgCost);
    document.getElementById("inputSellDate").value = new Date().toISOString().split('T')[0];
    document.getElementById("inputSellPrice").value = h.currentPrice;
    document.getElementById("inputSellQty").value = "";

    updateEstimatedRealizedPL();
    updateSellT2EstimatedDate();
    document.getElementById("modalSellAsset").classList.add("active");
}

function updateSellT2EstimatedDate() {
    const dateInput = document.getElementById("inputSellDate");
    const previewElem = document.getElementById("sellT2EstimatedDate");
    if (!previewElem) return;
    const saleDate = (dateInput && dateInput.value) ? dateInput.value : new Date().toISOString().split('T')[0];
    const settlementDate = calculateBusinessDaysSettlement(saleDate, 2);
    previewElem.innerText = formatFullDateDisplay(settlementDate);
}

function closeSellModal() {
    document.getElementById("modalSellAsset").classList.remove("active");
}

// --- T+2 Valör & Takas Takibi Modal Management ---
function openT2Modal() {
    renderT2ModalList();
    const modal = document.getElementById("modalT2Detail");
    if (modal) modal.classList.add("active");
}

function closeT2Modal() {
    const modal = document.getElementById("modalT2Detail");
    if (modal) modal.classList.remove("active");
    const formBox = document.getElementById("manualT2FormContainer");
    if (formBox) formBox.style.display = "none";
}

function toggleManualT2Form() {
    const formBox = document.getElementById("manualT2FormContainer");
    if (!formBox) return;
    const isHidden = formBox.style.display === "none" || formBox.style.display === "";
    formBox.style.display = isHidden ? "block" : "none";
    if (isHidden) {
        const dateInput = document.getElementById("manualT2SettlementDate");
        if (dateInput) {
            dateInput.value = calculateBusinessDaysSettlement(new Date().toISOString().split('T')[0], 2);
        }
    }
}

function saveManualT2Entry(e) {
    e.preventDefault();
    const desc = document.getElementById("manualT2Desc").value.trim();
    const amount = parseFloat(document.getElementById("manualT2Amount").value);
    const settlementDate = document.getElementById("manualT2SettlementDate").value;

    if (!desc || isNaN(amount) || amount <= 0 || !settlementDate) {
        alert("Lütfen tüm alanları geçerli şekilde doldurun.");
        return;
    }

    if (!appState.manualT2Entries) appState.manualT2Entries = [];

    appState.manualT2Entries.unshift({
        id: "m_t2_" + Date.now(),
        description: desc,
        amount: amount,
        createdDate: new Date().toISOString().split('T')[0],
        settlementDate: settlementDate,
        status: 'pending'
    });

    saveData();
    renderAll();
    renderT2ModalList();
    toggleManualT2Form();
    e.target.reset();
}

function deleteManualT2Entry(id) {
    if (confirm("Bu manuel valör kaydını silmek istediğinize emin misiniz?")) {
        appState.manualT2Entries = appState.manualT2Entries.filter(item => item.id !== id);
        saveData();
        renderAll();
        renderT2ModalList();
    }
}

function toggleSaleSettled(saleId) {
    if (!appState.settledSaleIds) appState.settledSaleIds = [];
    const index = appState.settledSaleIds.indexOf(saleId);
    if (index >= 0) {
        appState.settledSaleIds.splice(index, 1);
    } else {
        appState.settledSaleIds.push(saleId);
    }
    saveData();
    renderAll();
    renderT2ModalList();
}

function renderT2ModalList() {
    const t2Data = getPendingT2Data();

    const totalElem = document.getElementById("modalT2TotalVal");
    if (totalElem) totalElem.innerText = formatCurrency(t2Data.totalPending);

    const t1Elem = document.getElementById("modalT2T1Val");
    if (t1Elem) t1Elem.innerText = formatCurrency(t2Data.t1Pending);

    const t2Elem = document.getElementById("modalT2T2Val");
    if (t2Elem) t2Elem.innerText = formatCurrency(t2Data.t2Pending);

    const countElem = document.getElementById("modalT2Count");
    if (countElem) countElem.innerText = t2Data.pendingItems.length;

    const listContainer = document.getElementById("modalT2ItemsList");
    if (!listContainer) return;

    if (t2Data.pendingItems.length === 0 && t2Data.settledItems.length === 0) {
        listContainer.innerHTML = `
            <div class="empty-state" style="padding: 24px 15px;">
                <i class="fa-solid fa-hourglass-start" style="font-size: 2.2rem; color: #38BDF8; opacity: 0.7; margin-bottom: 10px;"></i>
                <p style="font-size: 0.9rem; margin-bottom: 6px; font-weight: 600;">Valör Bekleyen İşlem Yok</p>
                <small style="color: var(--text-muted); line-height: 1.4;">Hisse senedi sattığınızda 2 iş günü sürecek olan takas süreci burada otomatik listelenir.</small>
            </div>
        `;
        return;
    }

    let html = '';

    // Pending Items
    if (t2Data.pendingItems.length > 0) {
        html += t2Data.pendingItems.map(item => {
            const dateStr = formatFullDateDisplay(item.settlementDate);
            const pillClass = item.status === 'today' ? 'today' : 'pending';
            const pillText = item.status === 'today' 
                ? '<i class="fa-solid fa-bell"></i> Bugün Hesaba Geçiyor' 
                : `<i class="fa-solid fa-clock"></i> T+2 Bekliyor (${formatSettlementDateDisplay(item.settlementDate)})`;
            
            const detailSub = item.isManual 
                ? `Manuel Kayıt &bull; İşlem Tarihi: ${formatSettlementDateDisplay(item.saleDate)}`
                : `${item.qty} Adet @ ${formatCurrency(item.price)} &bull; Satış: ${formatSettlementDateDisplay(item.saleDate)}`;

            return `
                <div class="t2-item-card">
                    <div class="t2-item-header">
                        <div class="t2-item-title">
                            <i class="fa-solid ${item.isManual ? 'fa-pen-to-square' : 'fa-chart-line'}" style="color: #38BDF8;"></i>
                            <span>${item.symbol}</span>
                            <span class="valeur-pill ${pillClass}">${pillText}</span>
                        </div>
                        <div class="t2-item-amount">+${formatCurrency(item.amount)}</div>
                    </div>
                    <div class="t2-item-details-row">
                        <span>${detailSub}</span>
                        <span style="color: #BAE6FD; font-weight: 600;"><i class="fa-solid fa-calendar-check"></i> Valör: ${dateStr}</span>
                    </div>
                    <div class="t2-item-actions">
                        ${item.isManual 
                            ? `<button class="btn-sm" style="background: rgba(239,68,68,0.15); color: #EF4444; border: 1px solid rgba(239,68,68,0.3); font-size: 0.75rem; padding: 4px 10px; border-radius: 6px; cursor: pointer;" onclick="deleteManualT2Entry('${item.id}')"><i class="fa-solid fa-trash"></i> Sil</button>`
                            : `<button class="btn-sm" style="background: rgba(16,185,129,0.15); color: #10B981; border: 1px solid rgba(16,185,129,0.3); font-size: 0.75rem; padding: 4px 10px; border-radius: 6px; cursor: pointer;" onclick="toggleSaleSettled('${item.id}')"><i class="fa-solid fa-check"></i> Hesaba Geçti Olarak İşaretle</button>`
                        }
                    </div>
                </div>
            `;
        }).join("");
    }

    // Settled Items
    if (t2Data.settledItems.length > 0) {
        html += `
            <div style="margin-top: 14px; margin-bottom: 8px;">
                <span style="font-size: 0.8rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px;">
                    <i class="fa-solid fa-clock-rotate-left"></i> Tamamlanan / Serbest Kalan Valörler (${t2Data.settledItems.length})
                </span>
            </div>
        `;
        html += t2Data.settledItems.slice(0, 5).map(item => {
            return `
                <div class="t2-item-card" style="opacity: 0.65;">
                    <div class="t2-item-header">
                        <div class="t2-item-title" style="font-size: 13px;">
                            <i class="fa-solid fa-circle-check" style="color: #10B981;"></i>
                            <span>${item.symbol}</span>
                            <span class="valeur-pill settled">Valör Tamamlandı</span>
                        </div>
                        <div class="t2-item-amount" style="color: #94A3B8; font-size: 13px;">+${formatCurrency(item.amount)}</div>
                    </div>
                    <div class="t2-item-details-row">
                        <span>Valör Tarihi: ${formatSettlementDateDisplay(item.settlementDate)}</span>
                        ${!item.isManual && appState.settledSaleIds.includes(item.id) 
                            ? `<button class="btn-sm" style="background: transparent; color: var(--text-muted); border: 1px solid rgba(255,255,255,0.1); font-size: 0.7rem; padding: 2px 6px; border-radius: 4px; cursor: pointer;" onclick="toggleSaleSettled('${item.id}')">Geri Al</button>` 
                            : ''}
                    </div>
                </div>
            `;
        }).join("");
    }

    listContainer.innerHTML = html;
}

// --- Financial Health Score & Fundamental Analysis Engine ---
function calculateHealthScore(stock) {
    if (!stock) return null;

    const pe = stock.pe;
    const pb = stock.pb;
    const debt = stock.debtToEquity;
    const roe = stock.roe;

    let points = 0;
    let maxPoints = 0;

    let peText = "Bilanço Bekleniyor";
    let pbText = "Hesaplanamadı";
    let debtText = "Bilinmiyor";
    let roeText = "Hesaplanamadı";

    // 1. F/K Değerlendirmesi (Max 30 Puan)
    if (pe !== null && pe !== undefined && !isNaN(pe)) {
        maxPoints += 30;
        if (pe > 0 && pe <= 12) {
            points += 30;
            peText = "İskontolu / Cazip Çarpan";
        } else if (pe > 12 && pe <= 22) {
            points += 22;
            peText = "Makul Piyasa Seviyesi";
        } else if (pe > 22 && pe <= 45) {
            points += 14;
            peText = "Büyüme / Primli Fiyat";
        } else if (pe > 45) {
            points += 6;
            peText = "Yüksek Çarpan (Primli)";
        } else {
            points += 4;
            peText = "Zararda (Negatif Kâr)";
        }
    }

    // 2. PD/DD Değerlendirmesi (Max 25 Puan)
    if (pb !== null && pb !== undefined && !isNaN(pb)) {
        maxPoints += 25;
        if (pb > 0 && pb <= 1.5) {
            points += 25;
            pbText = "Defter Değerinde / Ucuz";
        } else if (pb > 1.5 && pb <= 3.5) {
            points += 18;
            pbText = "Dengeli Piyasa Değeri";
        } else if (pb > 3.5 && pb <= 7.0) {
            points += 12;
            pbText = "Primli Değerleme";
        } else if (pb > 7.0) {
            points += 5;
            pbText = "Yüksek Defter Primi";
        } else {
            points += 5;
            pbText = "Negatif Özkaynak";
        }
    }

    // 3. Borçluluk (Debt to Equity) Değerlendirmesi (Max 25 Puan)
    if (debt !== null && debt !== undefined && !isNaN(debt)) {
        maxPoints += 25;
        if (debt >= 0 && debt <= 0.40) {
            points += 25;
            debtText = "Çok Düşük Borç (Güvenli)";
        } else if (debt > 0.40 && debt <= 1.0) {
            points += 20;
            debtText = "Dengeli / Sağlam Borç";
        } else if (debt > 1.0 && debt <= 2.0) {
            points += 12;
            debtText = "Yüksek Kaldıraç / Dikkat";
        } else {
            points += 5;
            debtText = "Aşırı Borçlu Yapı";
        }
    }

    // 4. Özkaynak Kârlılığı (ROE) Değerlendirmesi (Max 20 Puan)
    if (roe !== null && roe !== undefined && !isNaN(roe)) {
        maxPoints += 20;
        if (roe >= 30) {
            points += 20;
            roeText = "Çok Yüksek Sermaye Kârı";
        } else if (roe >= 15 && roe < 30) {
            points += 16;
            roeText = "Güçlü Sermaye Kârı";
        } else if (roe > 0 && roe < 15) {
            points += 10;
            roeText = "Pozitif Kâr";
        } else {
            points += 3;
            roeText = "Negatif Kârlılık (Zarar)";
        }
    }

    let finalScore = maxPoints > 0 ? Math.round((points / maxPoints) * 100) : 60;
    
    let label = "Dengeli Finansal Yapı";
    let colorClass = "score-cyan";

    if (finalScore >= 80) {
        label = "Mükemmel & Sağlam";
        colorClass = "score-green";
    } else if (finalScore >= 65) {
        label = "Güçlü & İskontolu";
        colorClass = "score-cyan";
    } else if (finalScore >= 50) {
        label = "Orta / Büyüme Hissesi";
        colorClass = "score-amber";
    } else {
        label = "Yüksek Riskli / Dikkat";
        colorClass = "score-red";
    }

    return {
        score: finalScore,
        label,
        colorClass,
        peVal: pe !== null && pe !== undefined && !isNaN(pe) ? `${pe.toFixed(2)}x` : "—",
        peDesc: peText,
        pbVal: pb !== null && pb !== undefined && !isNaN(pb) ? `${pb.toFixed(2)}x` : "—",
        pbDesc: pbText,
        debtVal: debt !== null && debt !== undefined && !isNaN(debt) ? `%${(debt * 100).toFixed(1)}` : "—",
        debtDesc: debtText,
        roeVal: roe !== null && roe !== undefined && !isNaN(roe) ? `%${roe.toFixed(1)}` : "—",
        roeDesc: roeText
    };
}

let activeDetailHoldingId = null;

// ==========================================================================
// Quarterly Balance Sheet & Financial Statements Engine
// ==========================================================================
const IS_YATIRIM_WORKER_URL = "https://portfoyum.semih-hard.workers.dev";
const isYatirimCache = {};

let chartQuarterlyFinancialsInstance = null;
let chartProfitMarginsInstance = null;
let chartFinancialRatiosInstance = null;
let chartCapitalStructureInstance = null;

// Landscape Panoramic View State & Chart Instances
let chartLandscapeFinancialsInstance = null;
let chartLandscapeMarginsInstance = null;
let chartLandscapeRatiosInstance = null;
let currentActiveStatement = null;
let currentActiveStock = null;
let currentActiveSymbol = null;
let currentLandscapeQuarterFilter = 'all';

function destroyLandscapeCharts() {
    if (chartLandscapeFinancialsInstance) {
        chartLandscapeFinancialsInstance.destroy();
        chartLandscapeFinancialsInstance = null;
    }
    if (chartLandscapeMarginsInstance) {
        chartLandscapeMarginsInstance.destroy();
        chartLandscapeMarginsInstance = null;
    }
    if (chartLandscapeRatiosInstance) {
        chartLandscapeRatiosInstance.destroy();
        chartLandscapeRatiosInstance = null;
    }
}

function sliceStatementToQuarters(statement, count = 5) {
    if (!statement || !statement.quarters) return statement;
    if (!count || count === 'all' || count >= statement.quarters.length) return statement;

    const n = parseInt(count, 10);
    if (isNaN(n) || n <= 0) return statement;
    const startIdx = Math.max(0, statement.quarters.length - n);

    return {
        ...statement,
        quarters: statement.quarters.slice(startIdx),
        revenue: (statement.revenue || []).slice(startIdx),
        ebitda: (statement.ebitda || []).slice(startIdx),
        netIncome: (statement.netIncome || []).slice(startIdx),
        grossMargin: (statement.grossMargin || []).slice(startIdx),
        ebitdaMargin: (statement.ebitdaMargin || []).slice(startIdx),
        netMargin: (statement.netMargin || []).slice(startIdx),
        currentRatio: (statement.currentRatio || []).slice(startIdx),
        leverage: (statement.leverage || []).slice(startIdx),
        roe: (statement.roe || []).slice(startIdx),
        shortDebt: statement.shortDebt,
        longDebt: statement.longDebt,
        equity: statement.equity
    };
}

async function fetchIsYatirimStatement(symbol) {
    if (!IS_YATIRIM_WORKER_URL || !symbol) return null;
    const sym = symbol.toUpperCase().trim();
    if (isYatirimCache[sym]) return isYatirimCache[sym];

    try {
        const res = await fetch(`${IS_YATIRIM_WORKER_URL}?symbol=${encodeURIComponent(sym)}`);
        if (!res.ok) return null;
        const json = await res.json();
        if (!json || !json.ok || !json.value || json.value.length === 0) return null;

        const items = json.value;
        const periods = json.periods || ['2024/03', '2024/06', '2024/09', '2024/12', '2025/03', '2025/06', '2025/09', '2025/12', '2026/03', '2026/06'];

        function getItemVals(codes) {
            let it = null;
            for (const c of codes) {
                const found = items.find(x => x.itemCode === c);
                if (found) { it = found; break; }
            }
            if (!it) return new Array(periods.length).fill(0);
            if (it.values && Array.isArray(it.values) && it.values.length > 0) {
                return it.values.map(v => parseFloat(v) || 0);
            }
            return [
                parseFloat(it.value1) || 0,
                parseFloat(it.value2) || 0,
                parseFloat(it.value3) || 0,
                parseFloat(it.value4) || 0
            ];
        }

        const cumRev = getItemVals(['3C', '1AA', '3AA', '3CA']);
        const cumGross = getItemVals(['3D', '3CAB']);
        const cumOp = getItemVals(['3DF', '3HACA', '3CH', '3D']);
        const cumNet = getItemVals(['2OCF', '3Z', '2OV', '2OA', '2N']);

        // Standalone quarterly conversion from Turkish cumulative UFRS statements:
        function cumToQuarterly(cumArr) {
            const res = [];
            for (let i = 0; i < cumArr.length; i++) {
                const p = periods[i] || '';
                if (p.endsWith('/03') || p.endsWith('/1Q') || i % 4 === 0) {
                    res.push(cumArr[i]);
                } else {
                    res.push(cumArr[i] - cumArr[i - 1]);
                }
            }
            return res;
        }

        const revenue = cumToQuarterly(cumRev).map(v => Math.max(0, v));
        const grossProfit = cumToQuarterly(cumGross);
        const ebitda = cumToQuarterly(cumOp);
        const netIncome = cumToQuarterly(cumNet);

        const shortDebtArr = getItemVals(['2A']);
        const longDebtArr = getItemVals(['2B']);
        const equityArr = getItemVals(['2O', '2N']);
        const totalAssetsArr = getItemVals(['1BL', '1B']);
        const currentAssetsArr = getItemVals(['1A']);

        const lastI = periods.length - 1;
        const shortDebt = shortDebtArr[lastI] || 0;
        const longDebt = longDebtArr[lastI] || 0;
        const equity = equityArr[lastI] || 0;

        const grossMargin = revenue.map((r, i) => {
            if (r > 0 && grossProfit[i] !== undefined && grossProfit[i] !== 0) {
                return parseFloat(Math.min(100, Math.max(-100, (grossProfit[i] / r) * 100)).toFixed(1));
            }
            const ratio = (ebitda[i] / (r || 1)) * 1.25;
            return parseFloat(Math.min(95, Math.max(0, ratio * 100)).toFixed(1));
        });
        const ebitdaMargin = revenue.map((r, i) => r > 0 ? parseFloat(((ebitda[i] / r) * 100).toFixed(1)) : 0);
        const netMargin = revenue.map((r, i) => r > 0 ? parseFloat(((netIncome[i] / r) * 100).toFixed(1)) : 0);

        const currentRatio = periods.map((p, i) => {
            const sd = shortDebtArr[i] || 0;
            const ca = currentAssetsArr[i] || (sd * 1.3);
            return sd > 0 ? parseFloat((ca / sd).toFixed(2)) : 1.35;
        });

        const leverage = periods.map((p, i) => {
            const sd = shortDebtArr[i] || 0;
            const ld = longDebtArr[i] || 0;
            const ta = totalAssetsArr[i] || (sd + ld + (equityArr[i] || 0));
            return ta > 0 ? parseFloat(((sd + ld) / ta * 100).toFixed(1)) : 52.0;
        });

        const roe = periods.map((p, i) => {
            const eq = equityArr[i] || equity || 1;
            const net = netIncome[i] || 0;
            return eq > 0 ? parseFloat(((net * 4) / eq * 100).toFixed(1)) : 28.0;
        });

        const statement = {
            quarters: periods,
            revenue,
            ebitda,
            netIncome,
            grossMargin,
            ebitdaMargin,
            netMargin,
            currentRatio,
            leverage,
            roe,
            shortDebt,
            longDebt,
            equity
        };

        isYatirimCache[sym] = statement;
        return statement;
    } catch (e) {
        console.warn("İş Yatırım fetch warning:", e);
        return null;
    }
}

function formatBillionOrMillion(val) {
    if (val === null || val === undefined || isNaN(val)) return "—";
    const absVal = Math.abs(val);
    const sign = val < 0 ? "-" : "";
    if (absVal >= 1e9) {
        return `${sign}₺${(absVal / 1e9).toFixed(2)} Mr`;
    } else if (absVal >= 1e6) {
        return `${sign}₺${(absVal / 1e6).toFixed(1)} Mn`;
    } else if (absVal >= 1e3) {
        return `${sign}₺${(absVal / 1e3).toFixed(0)} B`;
    } else {
        return `${sign}₺${absVal.toFixed(0)}`;
    }
}

function destroyBalanceSheetCharts() {
    if (chartQuarterlyFinancialsInstance) {
        chartQuarterlyFinancialsInstance.destroy();
        chartQuarterlyFinancialsInstance = null;
    }
    if (chartProfitMarginsInstance) {
        chartProfitMarginsInstance.destroy();
        chartProfitMarginsInstance = null;
    }
    if (chartFinancialRatiosInstance) {
        chartFinancialRatiosInstance.destroy();
        chartFinancialRatiosInstance = null;
    }
    if (chartCapitalStructureInstance) {
        chartCapitalStructureInstance.destroy();
        chartCapitalStructureInstance = null;
    }
}

window.switchBalanceTab = function(tabName) {
    const tabBtns = document.querySelectorAll(".balance-tabs-bar .b-tab-btn");
    tabBtns.forEach(btn => {
        if (btn.getAttribute("data-btab") === tabName) {
            btn.classList.add("active");
        } else {
            btn.classList.remove("active");
        }
    });

    const panels = {
        'revenue': document.getElementById('btabRevenue'),
        'margins': document.getElementById('btabMargins'),
        'ratios': document.getElementById('btabRatios'),
        'table': document.getElementById('btabTable')
    };

    Object.keys(panels).forEach(key => {
        const panel = panels[key];
        if (!panel) return;
        if (key === tabName) {
            panel.style.display = 'block';
            panel.classList.add('active');
        } else {
            panel.style.display = 'none';
            panel.classList.remove('active');
        }
    });

    // Handle Chart.js responsive redraw when tabs change from display:none
    setTimeout(() => {
        if (tabName === 'revenue' && chartQuarterlyFinancialsInstance) chartQuarterlyFinancialsInstance.resize();
        if (tabName === 'margins' && chartProfitMarginsInstance) chartProfitMarginsInstance.resize();
        if (tabName === 'ratios') {
            if (chartFinancialRatiosInstance) chartFinancialRatiosInstance.resize();
            if (chartCapitalStructureInstance) chartCapitalStructureInstance.resize();
        }
    }, 50);
};

window.toggleFinancialSeries = function(type, btn) {
    if (!chartQuarterlyFinancialsInstance) return;
    const parent = btn && btn.parentElement;
    if (parent) {
        parent.querySelectorAll('.c-toggle-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
    }

    if (type === 'all') {
        chartQuarterlyFinancialsInstance.setDatasetVisibility(0, true);
        chartQuarterlyFinancialsInstance.setDatasetVisibility(1, true);
        chartQuarterlyFinancialsInstance.setDatasetVisibility(2, true);
    } else if (type === 'sales') {
        chartQuarterlyFinancialsInstance.setDatasetVisibility(0, true);
        chartQuarterlyFinancialsInstance.setDatasetVisibility(1, false);
        chartQuarterlyFinancialsInstance.setDatasetVisibility(2, false);
    } else if (type === 'ebitda') {
        chartQuarterlyFinancialsInstance.setDatasetVisibility(0, false);
        chartQuarterlyFinancialsInstance.setDatasetVisibility(1, true);
        chartQuarterlyFinancialsInstance.setDatasetVisibility(2, false);
    } else if (type === 'net') {
        chartQuarterlyFinancialsInstance.setDatasetVisibility(0, false);
        chartQuarterlyFinancialsInstance.setDatasetVisibility(1, false);
        chartQuarterlyFinancialsInstance.setDatasetVisibility(2, true);
    }
    chartQuarterlyFinancialsInstance.update();
};

// Flagship historical multi-quarter statement datasets for top Turkish stocks
const BIST_HISTORICAL_STATEMENTS = {
    "THYAO": {
        "quarters": [
            "2024/03",
            "2024/06",
            "2024/09",
            "2024/12",
            "2025/03",
            "2025/06",
            "2025/09",
            "2025/12",
            "2026/03",
            "2026/06"
        ],
        "revenue": [
            147238000000,
            182875000000,
            221815000000,
            423782686451,
            176712000000,
            231324000000,
            282789000000,
            434324219659,
            257961000000,
            327108000000
        ],
        "ebitda": [
            1203000000,
            19104000000,
            45048000000,
            39873269879,
            -2879000000,
            27408000000,
            43078000000,
            38527532481,
            -2451000000,
            -2647000000
        ],
        "netIncome": [
            6918000000,
            30391000000,
            51522000000,
            59544617139,
            -1854000000,
            26867000000,
            56051000000,
            58135933601,
            9915000000,
            8949000000
        ],
        "grossMargin": [
            11,
            19.3,
            27.5,
            17.6,
            6.6,
            19.2,
            22.1,
            14.9,
            8.4,
            6.4
        ],
        "ebitdaMargin": [
            0.8,
            10.4,
            20.3,
            9.4,
            -1.6,
            11.8,
            15.2,
            8.9,
            -1,
            -0.8
        ],
        "netMargin": [
            4.7,
            16.6,
            23.2,
            14.1,
            -1,
            11.6,
            19.8,
            13.4,
            3.8,
            2.7
        ],
        "currentRatio": [
            0.9,
            0.94,
            0.97,
            1.01,
            0.9,
            0.92,
            0.98,
            0.99,
            0.97,
            0.9
        ],
        "leverage": [
            55.8,
            54.8,
            54.3,
            51.4,
            53.3,
            54.5,
            53,
            54.4,
            55.2,
            56.8
        ],
        "roe": [
            5.4,
            21.8,
            33.3,
            26.8,
            -1,
            14.3,
            26.6,
            21.7,
            4.1,
            3.5
        ],
        "shortDebt": 566751000000,
        "longDebt": 774833000000,
        "equity": 1018517000000
    },
    "ASELS": {
        "quarters": [
            "2024/03",
            "2024/06",
            "2024/09",
            "2024/12",
            "2025/03",
            "2025/06",
            "2025/09",
            "2025/12",
            "2026/03",
            "2026/06"
        ],
        "revenue": [
            20907611000,
            27330130000,
            32693008000,
            76409152315,
            29825146000,
            41130858000,
            19916866000,
            121616330293,
            34305800000,
            54188452000
        ],
        "ebitda": [
            6190328000,
            6387980000,
            6573431000,
            16602331773,
            9692489000,
            13371214000,
            3210095000,
            31599609492,
            8549768000,
            13981197000
        ],
        "netIncome": [
            1403761000,
            2395121000,
            2342834000,
            13883164987,
            2274816000,
            4129928000,
            5245944000,
            23617405342,
            5539312000,
            8899994000
        ],
        "grossMargin": [
            28.9,
            34.2,
            29.4,
            32.6,
            29.9,
            33.5,
            27,
            32.5,
            30.7,
            32.4
        ],
        "ebitdaMargin": [
            29.6,
            23.4,
            20.1,
            21.7,
            32.5,
            32.5,
            16.1,
            26,
            24.9,
            25.8
        ],
        "netMargin": [
            6.7,
            8.8,
            7.2,
            18.2,
            7.6,
            10,
            26.3,
            19.4,
            16.1,
            16.4
        ],
        "currentRatio": [
            1.64,
            1.44,
            1.52,
            1.52,
            1.5,
            1.34,
            1.42,
            1.39,
            1.54,
            1.47
        ],
        "leverage": [
            36.9,
            38.9,
            41,
            41.8,
            41.6,
            41.3,
            42.1,
            41.7,
            41.7,
            43.9
        ],
        "roe": [
            5.5,
            8.5,
            7.6,
            30.2,
            5.8,
            9.8,
            11.3,
            32,
            7.9,
            11.6
        ],
        "shortDebt": 169003469000,
        "longDebt": 72219957000,
        "equity": 306744183000
    },
    "EREGL": {
        "quarters": [
            "2024/03",
            "2024/06",
            "2024/09",
            "2024/12",
            "2025/03",
            "2025/06",
            "2025/09",
            "2025/12",
            "2026/03",
            "2026/06"
        ],
        "revenue": [
            49747633000,
            50470421000,
            48728709000,
            118152044580,
            53544627000,
            41412965000,
            52957615000,
            98093902074,
            59684847000,
            64882557000
        ],
        "ebitda": [
            8810833000,
            4556860000,
            2485837000,
            11707446712,
            1897402000,
            1839314000,
            2187871000,
            5794577077,
            2427230000,
            2808488000
        ],
        "netIncome": [
            5600923000,
            4385872000,
            800675000,
            6858580349,
            426389000,
            1306555000,
            651157000,
            -1781411967,
            383856000,
            8549106000
        ],
        "grossMargin": [
            14.1,
            12.4,
            8.9,
            7.3,
            7.1,
            9.3,
            7.9,
            10.2,
            8.1,
            9.1
        ],
        "ebitdaMargin": [
            17.7,
            9,
            5.1,
            9.9,
            3.5,
            4.4,
            4.1,
            5.9,
            4.1,
            4.3
        ],
        "netMargin": [
            11.3,
            8.7,
            1.6,
            5.8,
            0.8,
            3.2,
            1.2,
            -1.8,
            0.6,
            13.2
        ],
        "currentRatio": [
            1.49,
            1.64,
            2.17,
            2.4,
            2.62,
            2.35,
            2.24,
            2.14,
            2.03,
            1.78
        ],
        "leverage": [
            38.8,
            38.6,
            42.5,
            42.5,
            42.7,
            44.1,
            44.8,
            46.8,
            47.1,
            45.1
        ],
        "roe": [
            10.8,
            8.1,
            1.4,
            8.8,
            0.7,
            2,
            0.9,
            -2.1,
            0.5,
            10.7
        ],
        "shortDebt": 148785900000,
        "longDebt": 121532394000,
        "equity": 318646912000
    },
    "TUPRS": {
        "quarters": [
            "2024/03",
            "2024/06",
            "2024/09",
            "2024/12",
            "2025/03",
            "2025/06",
            "2025/09",
            "2025/12",
            "2026/03",
            "2026/06"
        ],
        "revenue": [
            228524890000,
            271287033000,
            299061674000,
            261858971259,
            207582495000,
            256536903000,
            134224649000,
            379470638134,
            258253850000,
            404534160000
        ],
        "ebitda": [
            5495520000,
            14617551000,
            16949342000,
            9679193105,
            5091901000,
            13069017000,
            11743047000,
            19138784197,
            11392484000,
            47632760000
        ],
        "netIncome": [
            320345000,
            5031000000,
            8221386000,
            10400404518,
            97077000,
            8889621000,
            12836011000,
            12943339942,
            3709759000,
            46137925000
        ],
        "grossMargin": [
            8,
            9.1,
            9.4,
            6.9,
            8.3,
            9.7,
            11.8,
            10,
            8.4,
            15.5
        ],
        "ebitdaMargin": [
            2.4,
            5.4,
            5.7,
            3.7,
            2.5,
            5.1,
            8.7,
            5,
            4.4,
            11.8
        ],
        "netMargin": [
            0.1,
            1.9,
            2.7,
            4,
            0,
            3.5,
            9.6,
            3.4,
            1.4,
            11.4
        ],
        "currentRatio": [
            1.28,
            1.2,
            1.21,
            1.25,
            1.08,
            1.22,
            1.26,
            1.4,
            1.1,
            1.35
        ],
        "leverage": [
            42.9,
            43.7,
            45.8,
            37,
            39.8,
            42.9,
            42.9,
            37.5,
            48.9,
            46.1
        ],
        "roe": [
            0.6,
            8.7,
            13.6,
            11.3,
            0.1,
            11.6,
            15,
            12.1,
            4.2,
            40.5
        ],
        "shortDebt": 325369321000,
        "longDebt": 71311414000,
        "equity": 456139125000
    },
    "BIMAS": {
        "quarters": [
            "2024/03",
            "2024/06",
            "2024/09",
            "2024/12",
            "2025/03",
            "2025/06",
            "2025/09",
            "2025/12",
            "2026/03",
            "2026/06"
        ],
        "revenue": [
            143308140000,
            156152615000,
            190340741000,
            190271369516,
            193317926000,
            215985300000,
            103463873000,
            336345084247,
            212862328000,
            236832907000
        ],
        "ebitda": [
            1658360000,
            290471000,
            1343509000,
            3647213936,
            -1698200000,
            4871022000,
            5580785000,
            10024240066,
            2539812000,
            5509710000
        ],
        "netIncome": [
            3877861000,
            4847338000,
            5129233000,
            10474190067,
            2705109000,
            2855764000,
            5692034000,
            10687978528,
            6460986000,
            8473490000
        ],
        "grossMargin": [
            17.2,
            16.8,
            17.6,
            18.1,
            17.5,
            20.4,
            20.8,
            19.3,
            18.9,
            19.2
        ],
        "ebitdaMargin": [
            1.2,
            0.2,
            0.7,
            1.9,
            -0.9,
            2.3,
            5.4,
            3,
            1.2,
            2.3
        ],
        "netMargin": [
            2.7,
            3.1,
            2.7,
            5.5,
            1.4,
            1.3,
            5.5,
            3.2,
            3,
            3.6
        ],
        "currentRatio": [
            1.03,
            0.94,
            0.97,
            0.99,
            1.01,
            0.95,
            1.01,
            1.03,
            1.07,
            1.03
        ],
        "leverage": [
            55.5,
            55.4,
            54.6,
            49.7,
            53.6,
            53.7,
            53,
            50.6,
            52.1,
            52.6
        ],
        "roe": [
            18.6,
            21.9,
            20.3,
            27.2,
            8.2,
            8.4,
            15,
            21.9,
            13.7,
            16.8
        ],
        "shortDebt": 147697793000,
        "longDebt": 77739194000,
        "equity": 201353398000
    },
    "KCHOL": {
        "quarters": [
            "2024/03",
            "2024/06",
            "2024/09",
            "2024/12",
            "2025/03",
            "2025/06",
            "2025/09",
            "2025/12",
            "2026/03",
            "2026/06"
        ],
        "revenue": [
            430550000000,
            520878000000,
            595326000000,
            562561480190,
            460110000000,
            569159000000,
            273119000000,
            862740447460,
            494094000000,
            686402000000
        ],
        "ebitda": [
            29267000000,
            45671000000,
            15756000000,
            -3322061614,
            19750000000,
            34021000000,
            16625000000,
            48736712529,
            27943000000,
            61014000000
        ],
        "netIncome": [
            1354000000,
            278000000,
            -3537000000,
            3614453814,
            -1415000000,
            7650000000,
            8117000000,
            11556041242,
            522000000,
            19784000000
        ],
        "grossMargin": [
            23.9,
            20.2,
            18.9,
            19.3,
            26.2,
            25.7,
            23.4,
            25.8,
            26.4,
            25.7
        ],
        "ebitdaMargin": [
            6.8,
            8.8,
            2.6,
            -0.6,
            4.3,
            6,
            6.1,
            5.6,
            5.7,
            8.9
        ],
        "netMargin": [
            0.3,
            0.1,
            -0.6,
            0.6,
            -0.3,
            1.3,
            3,
            1.3,
            0.1,
            2.9
        ],
        "currentRatio": [
            0.92,
            0.91,
            0.92,
            0.9,
            0.91,
            0.89,
            0.9,
            0.87,
            0.86,
            0.9
        ],
        "leverage": [
            76.7,
            77.8,
            78.1,
            78,
            78.2,
            79.4,
            79.6,
            79.5,
            80.1,
            79.3
        ],
        "roe": [
            1.2,
            0.2,
            -2.8,
            2.1,
            -1,
            5.1,
            5,
            5.8,
            0.3,
            10
        ],
        "shortDebt": 3995224000000,
        "longDebt": 946293000000,
        "equity": 792639000000
    },
    "GARAN": {
        "quarters": [
            "2024/03",
            "2024/06",
            "2024/09",
            "2024/12",
            "2025/03",
            "2025/06",
            "2025/09",
            "2025/12",
            "2026/03",
            "2026/06"
        ],
        "revenue": [
            24939752000,
            32789736000,
            31825847000,
            36483164000,
            38191970000,
            41691030000,
            57966436000,
            66895938000,
            71431416000,
            67727584000
        ],
        "ebitda": [
            27515046000,
            29220017000,
            30000038000,
            35167539000,
            33560582000,
            36111418000,
            41646265000,
            39727063000,
            46547446000,
            41652554000
        ],
        "netIncome": [
            22479583000,
            22110227000,
            22360553000,
            25228523000,
            25398699000,
            28214301000,
            30860850000,
            26788347000,
            33615247000,
            30798753000
        ],
        "grossMargin": [
            45,
            45,
            45,
            45,
            45,
            45,
            45,
            45,
            45,
            45
        ],
        "ebitdaMargin": [
            110.3,
            89.1,
            94.3,
            96.4,
            87.9,
            86.6,
            71.8,
            59.4,
            65.2,
            61.5
        ],
        "netMargin": [
            90.1,
            67.4,
            70.3,
            69.2,
            66.5,
            67.7,
            53.2,
            40,
            47.1,
            45.5
        ],
        "currentRatio": [
            0.21,
            0.19,
            0.18,
            0.17,
            0.21,
            0.2,
            0.2,
            0.2,
            0.18,
            0.23
        ],
        "leverage": [
            88,
            88,
            88,
            88,
            88,
            88,
            88,
            88,
            88,
            88
        ],
        "roe": [
            35.1,
            31.6,
            29.4,
            30.5,
            29.8,
            29.8,
            29.9,
            24,
            29.7,
            25.2
        ],
        "shortDebt": 3466148000000,
        "longDebt": 620000000000,
        "equity": 489428000000
    },
    "FROTO": {
        "quarters": [
            "2024/03",
            "2024/06",
            "2024/09",
            "2024/12",
            "2025/03",
            "2025/06",
            "2025/09",
            "2025/12",
            "2026/03",
            "2026/06"
        ],
        "revenue": [
            171508365000,
            154505794000,
            213381788000,
            239407045277,
            210563327000,
            272109779000,
            99687525000,
            396009640956,
            192442597000,
            234626583000
        ],
        "ebitda": [
            12276277000,
            6183229000,
            12121581000,
            7357388256,
            10168087000,
            16556201000,
            3324345000,
            20120246345,
            4938527000,
            6706622000
        ],
        "netIncome": [
            8973032000,
            6729696000,
            9962863000,
            25203835586,
            6487096000,
            6500465000,
            9376041000,
            17657950986,
            5498818000,
            4837895000
        ],
        "grossMargin": [
            10.6,
            9.7,
            9.6,
            7.4,
            8.6,
            8.3,
            8.1,
            8.3,
            6.9,
            6.8
        ],
        "ebitdaMargin": [
            7.2,
            4,
            5.7,
            3.1,
            4.8,
            6.1,
            3.3,
            5.1,
            2.6,
            2.9
        ],
        "netMargin": [
            5.2,
            4.4,
            4.7,
            10.5,
            3.1,
            2.4,
            9.4,
            4.5,
            2.9,
            2.1
        ],
        "currentRatio": [
            1.16,
            1.18,
            1.21,
            1.25,
            1.2,
            1.27,
            1.3,
            1.24,
            1.26,
            1.28
        ],
        "leverage": [
            66.1,
            68.6,
            67.8,
            64.7,
            67,
            66.3,
            62.9,
            65.4,
            64.1,
            63.4
        ],
        "roe": [
            39.9,
            30.8,
            39.3,
            66.8,
            20.8,
            18.5,
            23.6,
            38.4,
            13.4,
            10.8
        ],
        "shortDebt": 186133489000,
        "longDebt": 123912312000,
        "equity": 179191213000
    }
};

function getStockQuarterlyStatement(stock, symbol) {
    const sym = (symbol || (stock && stock.symbol) || "").toUpperCase();
    if (BIST_HISTORICAL_STATEMENTS[sym]) {
        const base = JSON.parse(JSON.stringify(BIST_HISTORICAL_STATEMENTS[sym]));
        if (stock) {
            const lastIdx = base.revenue.length - 1;
            if (stock.totalRevenue) base.revenue[lastIdx] = stock.totalRevenue;
            if (stock.ebitda) base.ebitda[lastIdx] = stock.ebitda;
            if (stock.netIncome) base.netIncome[lastIdx] = stock.netIncome;
            if (stock.currentRatio) base.currentRatio[lastIdx] = parseFloat(stock.currentRatio.toFixed(2));
            if (stock.roe) base.roe[lastIdx] = parseFloat(stock.roe.toFixed(1));
            if (stock.totalAssets && stock.totalLiabilities) {
                base.leverage[lastIdx] = parseFloat(((stock.totalLiabilities / stock.totalAssets) * 100).toFixed(1));
            }
            if (stock.totalCurrentLiabilities) base.shortDebt = stock.totalCurrentLiabilities;
            if (stock.totalLiabilities && stock.totalCurrentLiabilities) {
                base.longDebt = Math.max(0, stock.totalLiabilities - stock.totalCurrentLiabilities);
            }
            if (stock.totalEquity) base.equity = stock.totalEquity;
        }
        return base;
    }

    // Dynamic generation anchored to live TradingView Scanner fundamentals (10 Quarters)
    const quarters = ['2024/03', '2024/06', '2024/09', '2024/12', '2025/03', '2025/06', '2025/09', '2025/12', '2026/03', '2026/06'];
    const s = stock || {};
    const latestRev = (s.totalRevenue && !isNaN(s.totalRevenue)) ? s.totalRevenue : ((s.marketCap || 5000000000) * 0.7);
    const revFactors = [0.60, 0.68, 0.72, 0.76, 0.82, 0.85, 0.89, 0.93, 0.96, 1.0];
    const revenue = revFactors.map(f => Math.round(latestRev * f));

    const latestEbitda = (s.ebitda && !isNaN(s.ebitda)) ? s.ebitda : (latestRev * 0.16);
    const ebitdaFactors = [0.55, 0.65, 0.70, 0.73, 0.80, 0.84, 0.88, 0.92, 0.95, 1.0];
    const ebitda = ebitdaFactors.map(f => Math.round(latestEbitda * f));

    const latestNet = (s.netIncome && !isNaN(s.netIncome)) ? s.netIncome : (latestRev * 0.09);
    const netFactors = [0.52, 0.62, 0.68, 0.71, 0.78, 0.83, 0.86, 0.90, 0.94, 1.0];
    const netIncome = netFactors.map(f => Math.round(latestNet * f));

    const grossMargin = revenue.map((r, i) => {
        const gpRatio = s.grossProfit && s.totalRevenue ? (s.grossProfit / s.totalRevenue) : 0.22;
        return parseFloat((gpRatio * 100 * (0.90 + (i * 0.012))).toFixed(1));
    });

    const ebitdaMargin = revenue.map((r, i) => parseFloat(((ebitda[i] / (r || 1)) * 100).toFixed(1)));
    const netMargin = revenue.map((r, i) => parseFloat(((netIncome[i] / (r || 1)) * 100).toFixed(1)));

    const baseCR = (s.currentRatio && !isNaN(s.currentRatio)) ? s.currentRatio : 1.35;
    const currentRatio = [
        parseFloat((baseCR * 0.90).toFixed(2)),
        parseFloat((baseCR * 0.92).toFixed(2)),
        parseFloat((baseCR * 0.91).toFixed(2)),
        parseFloat((baseCR * 0.93).toFixed(2)),
        parseFloat((baseCR * 0.95).toFixed(2)),
        parseFloat((baseCR * 0.94).toFixed(2)),
        parseFloat((baseCR * 0.97).toFixed(2)),
        parseFloat((baseCR * 0.95).toFixed(2)),
        parseFloat((baseCR * 0.98).toFixed(2)),
        parseFloat(baseCR.toFixed(2))
    ];

    let baseLev = 52.0;
    if (s.totalAssets && s.totalLiabilities) {
        baseLev = (s.totalLiabilities / s.totalAssets) * 100;
    } else if (s.debtToEquity) {
        baseLev = (s.debtToEquity / (1 + s.debtToEquity)) * 100;
    }
    const leverage = [
        parseFloat((baseLev * 1.08).toFixed(1)),
        parseFloat((baseLev * 1.06).toFixed(1)),
        parseFloat((baseLev * 1.05).toFixed(1)),
        parseFloat((baseLev * 1.03).toFixed(1)),
        parseFloat((baseLev * 1.02).toFixed(1)),
        parseFloat((baseLev * 1.04).toFixed(1)),
        parseFloat((baseLev * 1.02).toFixed(1)),
        parseFloat((baseLev * 1.01).toFixed(1)),
        parseFloat((baseLev * 1.00).toFixed(1)),
        parseFloat(baseLev.toFixed(1))
    ];

    const baseRoe = (s.roe && !isNaN(s.roe)) ? s.roe : 24.5;
    const roe = [
        parseFloat((baseRoe * 0.85).toFixed(1)),
        parseFloat((baseRoe * 0.88).toFixed(1)),
        parseFloat((baseRoe * 0.89).toFixed(1)),
        parseFloat((baseRoe * 0.90).toFixed(1)),
        parseFloat((baseRoe * 0.92).toFixed(1)),
        parseFloat((baseRoe * 0.91).toFixed(1)),
        parseFloat((baseRoe * 0.94).toFixed(1)),
        parseFloat((baseRoe * 0.97).toFixed(1)),
        parseFloat((baseRoe * 0.99).toFixed(1)),
        parseFloat(baseRoe.toFixed(1))
    ];

    const totalAssets = s.totalAssets || ((s.marketCap || 5000000000) * 1.4);
    const shortDebt = s.totalCurrentLiabilities || Math.round(totalAssets * 0.36);
    const equity = s.totalEquity || (s.marketCap && s.pb ? Math.round(s.marketCap / s.pb) : Math.round(totalAssets * 0.44));
    let longDebt = Math.max(0, Math.round(totalAssets - shortDebt - equity));
    if (longDebt <= 0) {
        longDebt = Math.round(totalAssets * 0.20);
    }

    return {
        quarters,
        revenue,
        ebitda,
        netIncome,
        grossMargin,
        ebitdaMargin,
        netMargin,
        currentRatio,
        leverage,
        roe,
        shortDebt,
        longDebt,
        equity
    };
}

function formatChangePill(elemId, currentVal, prevVal, isMarginOrRatio = false) {
    const elem = document.getElementById(elemId);
    if (!elem) return;
    if (prevVal === undefined || prevVal === null || isNaN(prevVal) || prevVal === 0) {
        elem.innerText = "—";
        elem.className = "hero-change-pill";
        return;
    }
    
    if (isMarginOrRatio) {
        const diff = currentVal - prevVal;
        const sign = diff >= 0 ? "+" : "";
        elem.innerText = `${sign}${diff.toFixed(1)}p QoQ`;
        elem.className = `hero-change-pill ${diff >= 0 ? 'pos' : 'neg'}`;
    } else {
        const pct = ((currentVal - prevVal) / Math.abs(prevVal)) * 100;
        const sign = pct >= 0 ? "+" : "";
        elem.innerText = `${sign}%${pct.toFixed(1)} QoQ`;
        elem.className = `hero-change-pill ${pct >= 0 ? 'pos' : 'neg'}`;
    }
}

function renderFintablesTable(statement, headElemId = "fintablesTableHead", bodyElemId = "fintablesTableBody") {
    const thead = document.getElementById(headElemId);
    const tbody = document.getElementById(bodyElemId);
    if (!thead || !tbody || !statement || !statement.quarters) return;

    const quarters = statement.quarters;
    const lastIdx = quarters.length - 1;

    // Header Row
    thead.innerHTML = `
        <tr>
            <th>Finansal Kalem</th>
            ${quarters.map(q => `<th>${q}</th>`).join('')}
            <th>QoQ</th>
            <th>YoY</th>
        </tr>
    `;

    const grossProfitArr = statement.revenue.map((r, i) => Math.round(r * (statement.grossMargin[i] / 100)));

    const rows = [
        { isSection: true, title: "GELİR TABLOSU (ÇEYREKLİK)" },
        { name: "Satış Gelirleri (Ciro)", data: statement.revenue, isMoney: true },
        { name: "Brüt Kâr", data: grossProfitArr, isMoney: true },
        { name: "FAVÖK", data: statement.ebitda, isMoney: true },
        { name: "Net Dönem Kârı", data: statement.netIncome, isMoney: true },
        { isSection: true, title: "KÂRLILIK MARJLARI" },
        { name: "Brüt Kâr Marjı", data: statement.grossMargin, isPct: true },
        { name: "FAVÖK Marjı", data: statement.ebitdaMargin, isPct: true },
        { name: "Net Kâr Marjı", data: statement.netMargin, isPct: true },
        { isSection: true, title: "BİLANÇO & ORANLAR" },
        { name: "Cari Oran", data: statement.currentRatio, isRatio: true },
        { name: "Kaldıraç Oranı", data: statement.leverage, isPct: true },
        { name: "Özkaynak Kârlılığı (ROE)", data: statement.roe, isPct: true }
    ];

    tbody.innerHTML = rows.map(r => {
        if (r.isSection) {
            return `
                <tr class="fintables-section-row">
                    <td colspan="${quarters.length + 3}">${r.title}</td>
                </tr>
            `;
        }

        const curr = r.data[lastIdx];
        const prev = r.data[lastIdx - 1];
        const yoyVal = (lastIdx >= 4 && r.data[lastIdx - 4] !== undefined) ? r.data[lastIdx - 4] : r.data[0];

        // QoQ calculation
        let qoqBadge = "—";
        if (prev !== undefined && prev !== null && prev !== 0 && !isNaN(prev)) {
            if (r.isPct || r.isRatio) {
                const diff = curr - prev;
                const sign = diff >= 0 ? "+" : "";
                qoqBadge = `<span class="fintables-badge ${diff >= 0 ? 'pos' : 'neg'}">${sign}${diff.toFixed(1)}p</span>`;
            } else {
                const pct = ((curr - prev) / Math.abs(prev)) * 100;
                const sign = pct >= 0 ? "+" : "";
                qoqBadge = `<span class="fintables-badge ${pct >= 0 ? 'pos' : 'neg'}">${sign}%${pct.toFixed(1)}</span>`;
            }
        }

        // YoY calculation
        let yoyBadge = "—";
        if (yoyVal !== undefined && yoyVal !== null && yoyVal !== 0 && !isNaN(yoyVal)) {
            if (r.isPct || r.isRatio) {
                const diff = curr - yoyVal;
                const sign = diff >= 0 ? "+" : "";
                yoyBadge = `<span class="fintables-badge ${diff >= 0 ? 'pos' : 'neg'}">${sign}${diff.toFixed(1)}p</span>`;
            } else {
                const pct = ((curr - yoyVal) / Math.abs(yoyVal)) * 100;
                const sign = pct >= 0 ? "+" : "";
                yoyBadge = `<span class="fintables-badge ${pct >= 0 ? 'pos' : 'neg'}">${sign}%${pct.toFixed(1)}</span>`;
            }
        }

        const cells = r.data.map(val => {
            let formatted = val;
            if (r.isMoney) formatted = formatBillionOrMillion(val);
            else if (r.isPct) formatted = `%${val}`;
            else if (r.isRatio) formatted = `${val}x`;
            return `<td>${formatted}</td>`;
        }).join('');

        return `
            <tr>
                <td class="fintables-row-header">${r.name}</td>
                ${cells}
                <td>${qoqBadge}</td>
                <td>${yoyBadge}</td>
            </tr>
        `;
    }).join('');
}

function renderStockBalanceSheetCharts(stock, symbol, isYatirimOverride = null) {
    destroyBalanceSheetCharts();

    const fullStatement = isYatirimOverride || getStockQuarterlyStatement(stock, symbol);
    if (!fullStatement) return;

    currentActiveStatement = fullStatement;
    currentActiveStock = stock;
    currentActiveSymbol = (symbol || (stock && stock.symbol) || "").toUpperCase();

    // Default standard view: strictly the last 5 quarters
    const statement = sliceStatementToQuarters(fullStatement, 5);

    // If landscape modal is already active, sync it with latest data
    const landscapeModal = document.getElementById("modalLandscapeFinancials");
    if (landscapeModal && landscapeModal.classList.contains("active")) {
        renderLandscapeFinancials();
    }

    // 1. Top 6 Multiples and Key Ratios Grid
    const peElem = document.getElementById("fundamentalPE");
    if (peElem) peElem.innerText = (stock.pe !== null && stock.pe !== undefined && !isNaN(stock.pe)) ? `${stock.pe.toFixed(2)}x` : "—";

    const pbElem = document.getElementById("fundamentalPB");
    if (pbElem) pbElem.innerText = (stock.pb !== null && stock.pb !== undefined && !isNaN(stock.pb)) ? `${stock.pb.toFixed(2)}x` : "—";

    const evElem = document.getElementById("fundamentalEVToEbitda");
    if (evElem) {
        const evVal = stock.evToEbitda || (stock.pe ? stock.pe * 0.82 : null);
        evElem.innerText = (evVal !== null && !isNaN(evVal)) ? `${evVal.toFixed(2)}x` : "—";
    }

    const crElem = document.getElementById("fundamentalCurrentRatio");
    if (crElem) {
        const latestCR = statement.currentRatio[statement.currentRatio.length - 1];
        crElem.innerText = (latestCR !== null && !isNaN(latestCR)) ? `${latestCR.toFixed(2)}x` : "—";
    }

    const levElem = document.getElementById("fundamentalLeverage");
    if (levElem) {
        const latestLev = statement.leverage[statement.leverage.length - 1];
        levElem.innerText = (latestLev !== null && !isNaN(latestLev)) ? `%${latestLev.toFixed(1)}` : "—";
    }

    const roeElem = document.getElementById("fundamentalROE");
    if (roeElem) {
        const latestRoe = statement.roe[statement.roe.length - 1];
        roeElem.innerText = (latestRoe !== null && !isNaN(latestRoe)) ? `%${latestRoe.toFixed(1)}` : "—";
    }

    // 2. Populate Hero Cards & Quarterly Stats
    const lastIdx = statement.revenue.length - 1;
    const prevIdx = lastIdx - 1;

    // Tab 1 Hero Cards (Revenue, EBITDA, Net Income)
    const valRev = document.getElementById("bValRevenue");
    if (valRev) valRev.innerText = formatBillionOrMillion(statement.revenue[lastIdx]);
    formatChangePill("bChangeRevenue", statement.revenue[lastIdx], statement.revenue[prevIdx]);

    const valEbitda = document.getElementById("bValEbitda");
    if (valEbitda) valEbitda.innerText = formatBillionOrMillion(statement.ebitda[lastIdx]);
    formatChangePill("bChangeEbitda", statement.ebitda[lastIdx], statement.ebitda[prevIdx]);

    const valNet = document.getElementById("bValNetIncome");
    if (valNet) valNet.innerText = formatBillionOrMillion(statement.netIncome[lastIdx]);
    formatChangePill("bChangeNetIncome", statement.netIncome[lastIdx], statement.netIncome[prevIdx]);

    // Tab 2 Hero Cards (Margins)
    const valGrossM = document.getElementById("bValGrossMargin");
    if (valGrossM) valGrossM.innerText = `%${statement.grossMargin[lastIdx]}`;
    formatChangePill("bChangeGrossMargin", statement.grossMargin[lastIdx], statement.grossMargin[prevIdx], true);

    const valEbitdaM = document.getElementById("bValEbitdaMargin");
    if (valEbitdaM) valEbitdaM.innerText = `%${statement.ebitdaMargin[lastIdx]}`;
    formatChangePill("bChangeEbitdaMargin", statement.ebitdaMargin[lastIdx], statement.ebitdaMargin[prevIdx], true);

    const valNetM = document.getElementById("bValNetMargin");
    if (valNetM) valNetM.innerText = `%${statement.netMargin[lastIdx]}`;
    formatChangePill("bChangeNetMargin", statement.netMargin[lastIdx], statement.netMargin[prevIdx], true);

    // Tab 3 Hero Cards (Ratios)
    const valCR = document.getElementById("bValCurrentRatio");
    if (valCR) valCR.innerText = `${statement.currentRatio[lastIdx]}x`;
    formatChangePill("bChangeCurrentRatio", statement.currentRatio[lastIdx], statement.currentRatio[prevIdx], true);

    const valLev = document.getElementById("bValLeverageRatio");
    if (valLev) valLev.innerText = `%${statement.leverage[lastIdx]}`;
    formatChangePill("bChangeLeverageRatio", statement.leverage[lastIdx], statement.leverage[prevIdx], true);

    const valRoe = document.getElementById("bValRoeRatio");
    if (valRoe) valRoe.innerText = `%${statement.roe[lastIdx]}`;
    formatChangePill("bChangeRoeRatio", statement.roe[lastIdx], statement.roe[prevIdx], true);

    // 3. Capital Distribution (Pasif Yapısı)
    const totalPassives = statement.shortDebt + statement.longDebt + statement.equity;
    const valTotAssets = document.getElementById("bValTotalAssets");
    if (valTotAssets) valTotAssets.innerText = `Toplam: ${formatBillionOrMillion(totalPassives)}`;

    const valShort = document.getElementById("bValShortDebt");
    if (valShort) {
        const pct = totalPassives > 0 ? ((statement.shortDebt / totalPassives) * 100).toFixed(0) : 0;
        valShort.innerText = `${formatBillionOrMillion(statement.shortDebt)} (%${pct})`;
    }

    const valLong = document.getElementById("bValLongDebt");
    if (valLong) {
        const pct = totalPassives > 0 ? ((statement.longDebt / totalPassives) * 100).toFixed(0) : 0;
        valLong.innerText = `${formatBillionOrMillion(statement.longDebt)} (%${pct})`;
    }

    const valEq = document.getElementById("bValEquity");
    if (valEq) {
        const pct = totalPassives > 0 ? ((statement.equity / totalPassives) * 100).toFixed(0) : 0;
        valEq.innerText = `${formatBillionOrMillion(statement.equity)} (%${pct})`;
    }

    // Tab 4: Render Fintables Table
    renderFintablesTable(statement);

    // Reset toggle pills and activate first tab
    const pills = document.querySelectorAll('.chart-toggle-pills .c-toggle-btn');
    pills.forEach((p, idx) => {
        if (idx === 0) p.classList.add('active');
        else p.classList.remove('active');
    });
    switchBalanceTab('revenue');

    if (typeof Chart === 'undefined') return;

    // 4. Render Chart 1: Simplified Quarterly Financials (Bar Chart)
    const ctxRevenue = document.getElementById("chartQuarterlyFinancials");
    if (ctxRevenue) {
        chartQuarterlyFinancialsInstance = new Chart(ctxRevenue, {
            type: 'bar',
            data: {
                labels: statement.quarters,
                datasets: [
                    {
                        label: 'Satışlar',
                        data: statement.revenue,
                        backgroundColor: 'rgba(56, 189, 248, 0.82)',
                        borderRadius: 6,
                        barPercentage: 0.8,
                        categoryPercentage: 0.72
                    },
                    {
                        label: 'FAVÖK',
                        data: statement.ebitda,
                        backgroundColor: 'rgba(168, 85, 247, 0.82)',
                        borderRadius: 6,
                        barPercentage: 0.8,
                        categoryPercentage: 0.72
                    },
                    {
                        label: 'Net Kâr',
                        data: statement.netIncome,
                        backgroundColor: statement.netIncome.map(v => v >= 0 ? 'rgba(16, 185, 129, 0.82)' : 'rgba(239, 68, 68, 0.82)'),
                        borderRadius: 6,
                        barPercentage: 0.8,
                        categoryPercentage: 0.72
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: { duration: 350 },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        labels: {
                            color: '#94A3B8',
                            font: { size: 10, family: "'Plus Jakarta Sans', sans-serif" },
                            boxWidth: 8,
                            boxHeight: 8
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(11, 15, 25, 0.94)',
                        titleColor: '#F8FAFC',
                        bodyColor: '#CBD5E1',
                        borderColor: 'rgba(255, 255, 255, 0.12)',
                        borderWidth: 1,
                        padding: 8,
                        callbacks: {
                            label: function(ctx) {
                                return ` ${ctx.dataset.label}: ${formatBillionOrMillion(ctx.raw)}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: { color: '#94A3B8', font: { size: 10 } }
                    },
                    y: {
                        grid: { color: 'rgba(255, 255, 255, 0.04)' },
                        ticks: {
                            color: '#94A3B8',
                            font: { size: 9 },
                            callback: function(v) { return formatBillionOrMillion(v); }
                        }
                    }
                }
            }
        });
    }

    // 5. Render Chart 2: Simplified Profit Margins (Line Chart)
    const ctxMargins = document.getElementById("chartProfitMargins");
    if (ctxMargins) {
        chartProfitMarginsInstance = new Chart(ctxMargins, {
            type: 'line',
            data: {
                labels: statement.quarters,
                datasets: [
                    {
                        label: 'Brüt Kâr Marjı',
                        data: statement.grossMargin,
                        borderColor: '#06B6D4',
                        backgroundColor: 'transparent',
                        tension: 0.35,
                        borderWidth: 2,
                        pointRadius: 3,
                        pointBackgroundColor: '#06B6D4',
                        fill: false
                    },
                    {
                        label: 'FAVÖK Marjı',
                        data: statement.ebitdaMargin,
                        borderColor: '#A855F7',
                        backgroundColor: 'transparent',
                        tension: 0.35,
                        borderWidth: 2,
                        pointRadius: 3,
                        pointBackgroundColor: '#A855F7',
                        fill: false
                    },
                    {
                        label: 'Net Kâr Marjı',
                        data: statement.netMargin,
                        borderColor: '#10B981',
                        backgroundColor: 'transparent',
                        tension: 0.35,
                        borderWidth: 2,
                        pointRadius: 3,
                        pointBackgroundColor: '#10B981',
                        fill: false
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: { duration: 350 },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        labels: {
                            color: '#94A3B8',
                            font: { size: 10, family: "'Plus Jakarta Sans', sans-serif" },
                            boxWidth: 8,
                            boxHeight: 8
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(11, 15, 25, 0.94)',
                        titleColor: '#F8FAFC',
                        bodyColor: '#CBD5E1',
                        borderColor: 'rgba(255, 255, 255, 0.12)',
                        borderWidth: 1,
                        padding: 8,
                        callbacks: {
                            label: function(ctx) {
                                return ` ${ctx.dataset.label}: %${Number(ctx.raw).toFixed(1)}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: { color: '#94A3B8', font: { size: 10 } }
                    },
                    y: {
                        grid: { color: 'rgba(255, 255, 255, 0.04)' },
                        ticks: {
                            color: '#94A3B8',
                            font: { size: 9 },
                            callback: function(v) { return `%${v}`; }
                        }
                    }
                }
            }
        });
    }

    // 6. Render Chart 3: Simplified Financial Ratios (Dual-Axis Line Chart)
    const ctxRatios = document.getElementById("chartFinancialRatios");
    if (ctxRatios) {
        chartFinancialRatiosInstance = new Chart(ctxRatios, {
            type: 'line',
            data: {
                labels: statement.quarters,
                datasets: [
                    {
                        label: 'Cari Oran (x)',
                        data: statement.currentRatio,
                        borderColor: '#38BDF8',
                        backgroundColor: 'transparent',
                        yAxisID: 'y1',
                        tension: 0.35,
                        borderWidth: 2,
                        pointRadius: 3,
                        pointBackgroundColor: '#38BDF8'
                    },
                    {
                        label: 'Kaldıraç Oranı (%)',
                        data: statement.leverage,
                        borderColor: '#F59E0B',
                        backgroundColor: 'transparent',
                        yAxisID: 'y',
                        tension: 0.35,
                        borderWidth: 2,
                        pointRadius: 3,
                        pointBackgroundColor: '#F59E0B'
                    },
                    {
                        label: 'Özkaynak Kârı / ROE (%)',
                        data: statement.roe,
                        borderColor: '#10B981',
                        backgroundColor: 'transparent',
                        yAxisID: 'y',
                        tension: 0.35,
                        borderWidth: 2,
                        pointRadius: 3,
                        pointBackgroundColor: '#10B981'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: { duration: 350 },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        labels: {
                            color: '#94A3B8',
                            font: { size: 10, family: "'Plus Jakarta Sans', sans-serif" },
                            boxWidth: 8,
                            boxHeight: 8
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(11, 15, 25, 0.94)',
                        titleColor: '#F8FAFC',
                        bodyColor: '#CBD5E1',
                        borderColor: 'rgba(255, 255, 255, 0.12)',
                        borderWidth: 1,
                        padding: 8,
                        callbacks: {
                            label: function(ctx) {
                                if (ctx.dataset.yAxisID === 'y1') {
                                    return ` ${ctx.dataset.label}: ${Number(ctx.raw).toFixed(2)}x`;
                                } else {
                                    return ` ${ctx.dataset.label}: %${Number(ctx.raw).toFixed(1)}`;
                                }
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: { color: '#94A3B8', font: { size: 10 } }
                    },
                    y: {
                        type: 'linear',
                        position: 'left',
                        grid: { color: 'rgba(255, 255, 255, 0.04)' },
                        ticks: {
                            color: '#F59E0B',
                            font: { size: 9 },
                            callback: function(v) { return `%${v}`; }
                        }
                    },
                    y1: {
                        type: 'linear',
                        position: 'right',
                        grid: { drawOnChartArea: false },
                        ticks: {
                            color: '#38BDF8',
                            font: { size: 9 },
                            callback: function(v) { return `${v}x`; }
                        }
                    }
                }
            }
        });
    }

    // 7. Render Chart 4: Capital Structure (Donut Chart)
    const ctxCap = document.getElementById("chartCapitalStructure");
    if (ctxCap) {
        chartCapitalStructureInstance = new Chart(ctxCap, {
            type: 'doughnut',
            data: {
                labels: ['KV Borçlar', 'UV Borçlar', 'Özkaynaklar'],
                datasets: [{
                    data: [statement.shortDebt, statement.longDebt, statement.equity],
                    backgroundColor: ['#EF4444', '#F59E0B', '#10B981'],
                    borderColor: '#0B0F19',
                    borderWidth: 2,
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '70%',
                animation: { duration: 350 },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: 'rgba(11, 15, 25, 0.94)',
                        titleColor: '#F8FAFC',
                        bodyColor: '#CBD5E1',
                        borderColor: 'rgba(255, 255, 255, 0.12)',
                        borderWidth: 1,
                        padding: 8,
                        callbacks: {
                            label: function(ctx) {
                                const val = ctx.raw;
                                const pct = totalPassives > 0 ? ((val / totalPassives) * 100).toFixed(1) : 0;
                                return ' ' + ctx.label + ': ' + formatBillionOrMillion(val) + ' (%' + pct + ')';
                            }
                        }
                    }
                }
            }
        });
    }
}

// ==========================================================================
// Landscape Panoramic Multi-Quarter Controller & Charts
// ==========================================================================
async function openLandscapeFinancials() {
    const modal = document.getElementById("modalLandscapeFinancials");
    if (!modal) return;

    modal.classList.add("active");
    document.body.classList.add("landscape-open");

    // Attempt Screen Orientation lock and Fullscreen
    try {
        if (document.documentElement.requestFullscreen) {
            await document.documentElement.requestFullscreen().catch(() => {});
        }
        if (screen.orientation && screen.orientation.lock) {
            await screen.orientation.lock('landscape').catch(() => {});
        }
    } catch (e) {
        console.log("Screen orientation lock info:", e);
    }

    // Auto-detect mobile portrait where physical orientation lock isn't supported (e.g. iOS Safari)
    if (window.innerHeight > window.innerWidth && window.innerWidth <= 768) {
        modal.classList.add("force-rotate-90");
    } else {
        modal.classList.remove("force-rotate-90");
    }

    // Set initial filter to 'all'
    currentLandscapeQuarterFilter = 'all';
    const pills = document.querySelectorAll("#landscapeQuarterPills .l-pill");
    pills.forEach((p, idx) => {
        if (idx === 0) p.classList.add("active");
        else p.classList.remove("active");
    });

    const secPills = document.querySelectorAll("#landscapeSectionPills .l-pill");
    secPills.forEach((p, idx) => {
        if (idx === 0) p.classList.add("active");
        else p.classList.remove("active");
    });
    switchLandscapeSection('all');

    renderLandscapeFinancials();
}

async function closeLandscapeFinancials() {
    const modal = document.getElementById("modalLandscapeFinancials");
    if (modal) {
        modal.classList.remove("active");
        modal.classList.remove("force-rotate-90");
    }
    document.body.classList.remove("landscape-open");

    // Unlock screen orientation and exit fullscreen
    try {
        if (screen.orientation && screen.orientation.unlock) {
            screen.orientation.unlock();
        }
        if (document.exitFullscreen && document.fullscreenElement) {
            await document.exitFullscreen().catch(() => {});
        }
    } catch (e) {
        console.log("Screen orientation unlock info:", e);
    }

    destroyLandscapeCharts();
}

function toggleLandscapeOrientation() {
    const modal = document.getElementById("modalLandscapeFinancials");
    if (!modal) return;
    modal.classList.toggle("force-rotate-90");
    setTimeout(() => {
        if (chartLandscapeFinancialsInstance) chartLandscapeFinancialsInstance.resize();
        if (chartLandscapeMarginsInstance) chartLandscapeMarginsInstance.resize();
        if (chartLandscapeRatiosInstance) chartLandscapeRatiosInstance.resize();
    }, 150);
}

function setLandscapeQuarterFilter(filter, btn) {
    currentLandscapeQuarterFilter = filter;
    const parent = btn && btn.parentElement;
    if (parent) {
        parent.querySelectorAll(".l-pill").forEach(p => p.classList.remove("active"));
        btn.classList.add("active");
    }
    renderLandscapeFinancials();
}

function switchLandscapeSection(sec, btn) {
    if (btn) {
        const parent = btn.parentElement;
        if (parent) {
            parent.querySelectorAll(".l-pill").forEach(p => p.classList.remove("active"));
            btn.classList.add("active");
        }
    }
    const secCharts = document.getElementById("lsecCharts");
    const secTable = document.getElementById("lsecTable");
    if (sec === 'all') {
        if (secCharts) secCharts.style.display = 'flex';
        if (secTable) secTable.style.display = 'block';
    } else if (sec === 'charts') {
        if (secCharts) secCharts.style.display = 'flex';
        if (secTable) secTable.style.display = 'none';
    } else if (sec === 'table') {
        if (secCharts) secCharts.style.display = 'none';
        if (secTable) secTable.style.display = 'block';
    }
    setTimeout(() => {
        if (chartLandscapeFinancialsInstance) chartLandscapeFinancialsInstance.resize();
        if (chartLandscapeMarginsInstance) chartLandscapeMarginsInstance.resize();
        if (chartLandscapeRatiosInstance) chartLandscapeRatiosInstance.resize();
    }, 60);
}

function toggleLandscapeFinancialSeries(type, btn) {
    if (!chartLandscapeFinancialsInstance) return;
    const parent = btn && btn.parentElement;
    if (parent) {
        parent.querySelectorAll('.c-toggle-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
    }
    if (type === 'all') {
        chartLandscapeFinancialsInstance.setDatasetVisibility(0, true);
        chartLandscapeFinancialsInstance.setDatasetVisibility(1, true);
        chartLandscapeFinancialsInstance.setDatasetVisibility(2, true);
    } else if (type === 'sales') {
        chartLandscapeFinancialsInstance.setDatasetVisibility(0, true);
        chartLandscapeFinancialsInstance.setDatasetVisibility(1, false);
        chartLandscapeFinancialsInstance.setDatasetVisibility(2, false);
    } else if (type === 'ebitda') {
        chartLandscapeFinancialsInstance.setDatasetVisibility(0, false);
        chartLandscapeFinancialsInstance.setDatasetVisibility(1, true);
        chartLandscapeFinancialsInstance.setDatasetVisibility(2, false);
    } else if (type === 'net') {
        chartLandscapeFinancialsInstance.setDatasetVisibility(0, false);
        chartLandscapeFinancialsInstance.setDatasetVisibility(1, false);
        chartLandscapeFinancialsInstance.setDatasetVisibility(2, true);
    }
    chartLandscapeFinancialsInstance.update();
}

function renderLandscapeFinancials() {
    destroyLandscapeCharts();

    if (!currentActiveStatement) return;
    const stmt = sliceStatementToQuarters(currentActiveStatement, currentLandscapeQuarterFilter);
    if (!stmt || !stmt.quarters || stmt.quarters.length === 0) return;

    // 1. Header Badges & Labels
    const symElem = document.getElementById("landscapeStockSymbol");
    if (symElem) symElem.innerText = currentActiveSymbol || "BIST";

    const nameElem = document.getElementById("landscapeStockName");
    if (nameElem) {
        const s = currentActiveStock || {};
        nameElem.innerText = s.companyTitle || s.name || currentActiveSymbol || "";
    }

    const badgeElem = document.getElementById("landscapePeriodBadge");
    if (badgeElem && stmt.quarters.length > 0) {
        badgeElem.innerText = stmt.quarters.length + ' Çeyrek (' + stmt.quarters[0] + ' - ' + stmt.quarters[stmt.quarters.length - 1] + ')';
    }

    // 2. Render Full Panoramic Fintables Comparative Table
    renderFintablesTable(stmt, "landscapeFintablesTableHead", "landscapeFintablesTableBody");

    if (typeof Chart === 'undefined') return;

    // 3. Panoramic Revenue, EBITDA & Net Profit (Bar Chart)
    const ctxFin = document.getElementById("chartLandscapeFinancials");
    if (ctxFin) {
        chartLandscapeFinancialsInstance = new Chart(ctxFin, {
            type: 'bar',
            data: {
                labels: stmt.quarters,
                datasets: [
                    {
                        label: 'Satış Gelirleri',
                        data: stmt.revenue,
                        backgroundColor: 'rgba(56, 189, 248, 0.85)',
                        borderRadius: 6,
                        barPercentage: 0.82,
                        categoryPercentage: 0.76
                    },
                    {
                        label: 'FAVÖK',
                        data: stmt.ebitda,
                        backgroundColor: 'rgba(168, 85, 247, 0.85)',
                        borderRadius: 6,
                        barPercentage: 0.82,
                        categoryPercentage: 0.76
                    },
                    {
                        label: 'Net Kâr',
                        data: stmt.netIncome,
                        backgroundColor: stmt.netIncome.map(v => v >= 0 ? 'rgba(16, 185, 129, 0.85)' : 'rgba(239, 68, 68, 0.85)'),
                        borderRadius: 6,
                        barPercentage: 0.82,
                        categoryPercentage: 0.76
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: { duration: 300 },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        labels: {
                            color: '#94A3B8',
                            font: { size: 10, family: "'Plus Jakarta Sans', sans-serif" },
                            boxWidth: 8,
                            boxHeight: 8
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(11, 15, 25, 0.95)',
                        titleColor: '#F8FAFC',
                        bodyColor: '#CBD5E1',
                        borderColor: 'rgba(255, 255, 255, 0.15)',
                        borderWidth: 1,
                        padding: 10,
                        callbacks: {
                            label: function(ctx) {
                                return ' ' + ctx.dataset.label + ': ' + formatBillionOrMillion(ctx.raw);
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: { color: '#94A3B8', font: { size: 11, weight: '600' } }
                    },
                    y: {
                        grid: { color: 'rgba(255, 255, 255, 0.05)' },
                        ticks: {
                            color: '#64748B',
                            font: { size: 10 },
                            callback: function(v) { return formatBillionOrMillion(v); }
                        }
                    }
                }
            }
        });
    }

    // 4. Panoramic Margins Trend (Line Chart)
    const ctxMargins = document.getElementById("chartLandscapeMargins");
    if (ctxMargins) {
        chartLandscapeMarginsInstance = new Chart(ctxMargins, {
            type: 'line',
            data: {
                labels: stmt.quarters,
                datasets: [
                    {
                        label: 'Brüt Kâr Marjı',
                        data: stmt.grossMargin,
                        borderColor: '#06B6D4',
                        backgroundColor: 'rgba(6, 182, 212, 0.08)',
                        borderWidth: 2.5,
                        pointRadius: 4,
                        pointHoverRadius: 6,
                        pointBackgroundColor: '#06B6D4',
                        tension: 0.35,
                        fill: true
                    },
                    {
                        label: 'FAVÖK Marjı',
                        data: stmt.ebitdaMargin,
                        borderColor: '#A855F7',
                        backgroundColor: 'rgba(168, 85, 247, 0.06)',
                        borderWidth: 2.5,
                        pointRadius: 4,
                        pointHoverRadius: 6,
                        pointBackgroundColor: '#A855F7',
                        tension: 0.35,
                        fill: true
                    },
                    {
                        label: 'Net Kâr Marjı',
                        data: stmt.netMargin,
                        borderColor: '#10B981',
                        backgroundColor: 'rgba(16, 185, 129, 0.06)',
                        borderWidth: 2.5,
                        pointRadius: 4,
                        pointHoverRadius: 6,
                        pointBackgroundColor: '#10B981',
                        tension: 0.35,
                        fill: true
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: { duration: 300 },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: 'rgba(11, 15, 25, 0.95)',
                        titleColor: '#F8FAFC',
                        bodyColor: '#CBD5E1',
                        borderColor: 'rgba(255, 255, 255, 0.15)',
                        borderWidth: 1,
                        padding: 10,
                        callbacks: {
                            label: function(ctx) {
                                return ' ' + ctx.dataset.label + ': %' + ctx.raw;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: { color: '#94A3B8', font: { size: 11, weight: '600' } }
                    },
                    y: {
                        grid: { color: 'rgba(255, 255, 255, 0.05)' },
                        ticks: {
                            color: '#64748B',
                            font: { size: 10 },
                            callback: function(v) { return '%' + v; }
                        }
                    }
                }
            }
        });
    }

    // 5. Panoramic Ratios & ROE (Dual Axis Line Chart)
    const ctxRatios = document.getElementById("chartLandscapeRatios");
    if (ctxRatios) {
        chartLandscapeRatiosInstance = new Chart(ctxRatios, {
            type: 'line',
            data: {
                labels: stmt.quarters,
                datasets: [
                    {
                        label: 'Cari Oran (x)',
                        data: stmt.currentRatio,
                        borderColor: '#38BDF8',
                        borderWidth: 2.5,
                        pointRadius: 4,
                        pointHoverRadius: 6,
                        pointBackgroundColor: '#38BDF8',
                        tension: 0.35,
                        yAxisID: 'yRatio'
                    },
                    {
                        label: 'Kaldıraç Oranı (%)',
                        data: stmt.leverage,
                        borderColor: '#F59E0B',
                        borderWidth: 2.5,
                        pointRadius: 4,
                        pointHoverRadius: 6,
                        pointBackgroundColor: '#F59E0B',
                        tension: 0.35,
                        yAxisID: 'yPct'
                    },
                    {
                        label: 'Özkaynak Kârlılığı / ROE (%)',
                        data: stmt.roe,
                        borderColor: '#10B981',
                        borderWidth: 2.5,
                        pointRadius: 4,
                        pointHoverRadius: 6,
                        pointBackgroundColor: '#10B981',
                        tension: 0.35,
                        yAxisID: 'yPct'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: { duration: 300 },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        labels: {
                            color: '#94A3B8',
                            font: { size: 10, family: "'Plus Jakarta Sans', sans-serif" },
                            boxWidth: 8,
                            boxHeight: 8
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(11, 15, 25, 0.95)',
                        titleColor: '#F8FAFC',
                        bodyColor: '#CBD5E1',
                        borderColor: 'rgba(255, 255, 255, 0.15)',
                        borderWidth: 1,
                        padding: 10,
                        callbacks: {
                            label: function(ctx) {
                                if (ctx.dataset.yAxisID === 'yRatio') {
                                    return ' ' + ctx.dataset.label + ': ' + ctx.raw + 'x';
                                }
                                return ' ' + ctx.dataset.label + ': %' + ctx.raw;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: { color: '#94A3B8', font: { size: 11, weight: '600' } }
                    },
                    yPct: {
                        type: 'linear',
                        position: 'left',
                        grid: { color: 'rgba(255, 255, 255, 0.05)' },
                        ticks: {
                            color: '#64748B',
                            font: { size: 10 },
                            callback: function(v) { return '%' + v; }
                        }
                    },
                    yRatio: {
                        type: 'linear',
                        position: 'right',
                        grid: { display: false },
                        ticks: {
                            color: '#38BDF8',
                            font: { size: 10 },
                            callback: function(v) { return v + 'x'; }
                        }
                    }
                }
            }
        });
    }
}

window.openLandscapeFinancials = openLandscapeFinancials;
window.closeLandscapeFinancials = closeLandscapeFinancials;
window.toggleLandscapeOrientation = toggleLandscapeOrientation;
window.setLandscapeQuarterFilter = setLandscapeQuarterFilter;
window.switchLandscapeSection = switchLandscapeSection;
window.toggleLandscapeFinancialSeries = toggleLandscapeFinancialSeries;

function openDetailModal(holdingId) {
    activeDetailHoldingId = holdingId;
    const h = appState.holdings.find(item => item.id === holdingId);
    if (!h) return;

    document.getElementById("detailSymbolTitle").innerText = `${h.symbol} Detayı`;
    document.getElementById("detailMarketPrice").innerText = formatCurrency(h.currentPrice);
    document.getElementById("detailAvgCost").innerText = formatCurrency(h.avgCost);
    document.getElementById("detailQty").innerText = `${formatNumber(h.quantity, h.category === 'CRYPTO' ? 4 : 2)} Adet`;
    
    const mVal = h.quantity * h.currentPrice;
    const pl = mVal - (h.quantity * h.avgCost);
    const plPct = h.avgCost > 0 ? ((h.currentPrice - h.avgCost) / h.avgCost) * 100 : 0;
    document.getElementById("detailTotalVal").innerText = formatCurrency(mVal);
    document.getElementById("detailPL").innerText = `${pl >= 0 ? '+' : ''}${formatCurrency(pl)} (${formatPercent(plPct)})`;
    document.getElementById("detailPL").className = pl >= 0 ? "txt-neon-green" : "txt-neon-red";

    // Render Company Fundamentals & Balance Sheet Charts for Stocks
    const fundamentalsCard = document.getElementById("companyFundamentalsCard");
    if (fundamentalsCard) {
        if (h.category === "STOCK") {
            const stockData = bistCatalog.find(b => b.symbol === h.symbol) || appState.marketPrices[h.symbol] || { symbol: h.symbol };
            const health = calculateHealthScore(stockData);
            
            if (health) {
                const badge = document.getElementById("fundamentalHealthBadge");
                if (badge) {
                    badge.className = `health-score-badge ${health.colorClass}`;
                }
                const scoreElem = document.getElementById("fundamentalHealthScore");
                if (scoreElem) scoreElem.innerText = `${health.score}/100`;

                const labelElem = document.getElementById("fundamentalHealthLabel");
                if (labelElem) labelElem.innerText = health.label;

                // Render Balance Sheet Charts, Tabs and Multiples (Immediate render)
                renderStockBalanceSheetCharts(stockData, h.symbol);

                // Asynchronously fetch 100% real İş Yatırım statements from Cloudflare Worker
                fetchIsYatirimStatement(h.symbol).then(isStatement => {
                    if (isStatement && activeDetailHoldingId === h.id) {
                        renderStockBalanceSheetCharts(stockData, h.symbol, isStatement);
                    }
                });

                fundamentalsCard.style.display = "block";
            } else {
                fundamentalsCard.style.display = "none";
                destroyBalanceSheetCharts();
            }
        } else {
            fundamentalsCard.style.display = "none";
            destroyBalanceSheetCharts();
        }
    }

    const historyList = document.getElementById("detailHistoryList");
    historyList.innerHTML = h.transactions.map(t => `
        <div class="history-item">
            <span>${t.date} • ${formatNumber(t.qty, h.category === 'CRYPTO' ? 4 : 2)} Adet @ ${formatCurrency(t.price)}</span>
            <span class="txt-muted">Toplam: ${formatCurrency(t.qty * t.price)}</span>
        </div>
    `).join("");

    const actionsDiv = document.querySelector(".detail-actions");
    actionsDiv.innerHTML = `
        <button class="btn-sm primary neon-glow" onclick="closeDetailModal(); openSellModal('${h.id}');">
            <i class="fa-solid fa-hand-holding-dollar"></i> Satış Yap
        </button>
        <button class="btn-sm" style="background: rgba(16,185,129,0.15); color: #10B981; border: 1px solid rgba(16,185,129,0.3);" onclick="shareHoldingToStory('${h.id}');">
            <i class="fa-solid fa-share-nodes"></i> Paylaş
        </button>
        <button class="btn-sm danger" onclick="closeDetailModal(); deleteAsset('${h.id}');">
            <i class="fa-solid fa-trash"></i> Sil
        </button>
    `;

    document.getElementById("modalAssetDetail").classList.add("active");
}

function closeDetailModal() {
    document.getElementById("modalAssetDetail").classList.remove("active");
    destroyBalanceSheetCharts();
}

function updateEstimatedRealizedPL() {
    const holdingId = document.getElementById("sellAssetId").value;
    const h = appState.holdings.find(item => item.id === holdingId);
    if (!h) return;

    const qty = parseFloat(document.getElementById("inputSellQty").value) || 0;
    const price = parseFloat(document.getElementById("inputSellPrice").value) || 0;

    const realized = (price - h.avgCost) * qty;
    const elem = document.getElementById("estimatedRealizedPL");
    
    if (qty > 0 && price > 0) {
        elem.innerText = `${realized >= 0 ? '+' : ''}${formatCurrency(realized)}`;
        elem.className = realized >= 0 ? "txt-neon-green" : "txt-neon-red";
    } else {
        elem.innerText = "₺0,00";
        elem.className = "neut";
    }
}

function setupSymbolAutocomplete() {
    const inputSymbol = document.getElementById("inputSymbol");
    const inputName = document.getElementById("inputName");
    const inputPrice = document.getElementById("inputPrice");
    const suggestionsBox = document.getElementById("symbolSuggestions");
    if (!inputSymbol || !suggestionsBox) return;

    let selectedIndex = -1;
    let currentMatches = [];

    function renderSuggestions(matches) {
        currentMatches = matches;
        selectedIndex = -1;
        if (!matches || matches.length === 0) {
            suggestionsBox.innerHTML = "";
            suggestionsBox.classList.remove("active");
            return;
        }

        suggestionsBox.innerHTML = matches.map((item, idx) => {
            const isPos = item.change >= 0;
            const changeStr = item.change !== undefined && item.change !== null ? `${isPos ? '+' : ''}${item.change.toFixed(2)}%` : '';
            return `
                <div class="suggestion-item" data-idx="${idx}">
                    <div class="suggestion-item-left">
                        <div class="suggestion-item-symbol">${item.symbol}</div>
                        <div class="suggestion-item-name" title="${item.name}">${item.name}</div>
                    </div>
                    <div class="suggestion-item-right">
                        <div class="suggestion-item-price">${formatCurrency(item.price)}</div>
                        ${changeStr ? `<div class="suggestion-item-change ${isPos ? 'txt-neon-green' : 'txt-neon-red'}">${changeStr}</div>` : ''}
                    </div>
                </div>
            `;
        }).join("");

        suggestionsBox.classList.add("active");

        suggestionsBox.querySelectorAll(".suggestion-item").forEach(el => {
            el.addEventListener("mousedown", (e) => {
                e.preventDefault(); // Prevent blur from firing before click
                const idx = parseInt(el.getAttribute("data-idx"));
                selectSuggestion(currentMatches[idx]);
            });
        });
    }

    function selectSuggestion(item) {
        if (!item) return;
        inputSymbol.value = item.symbol;
        if (inputName) inputName.value = item.name;
        if (inputPrice) inputPrice.value = item.price;
        suggestionsBox.classList.remove("active");
        suggestionsBox.innerHTML = "";
    }

    inputSymbol.addEventListener("input", () => {
        const query = inputSymbol.value.trim().toUpperCase();
        const category = document.querySelector('input[name="assetCategory"]:checked')?.value || "STOCK";

        if (!query) {
            renderSuggestions([]);
            return;
        }

        if (category === "STOCK") {
            if (bistCatalog.length === 0 && appState.marketPrices) {
                const matches = Object.entries(appState.marketPrices)
                    .filter(([sym, data]) => data.category === "STOCK" && (sym.includes(query) || (data.name && data.name.toUpperCase().includes(query))))
                    .slice(0, 15)
                    .map(([sym, data]) => ({
                        symbol: sym,
                        name: data.name || sym,
                        price: data.price,
                        change: data.prevClose ? ((data.price - data.prevClose) / data.prevClose) * 100 : 0
                    }));
                renderSuggestions(matches);
                return;
            }

            const queryLower = query.toLocaleLowerCase('tr-TR');
            const filtered = bistCatalog.filter(item => {
                return item.symbol.includes(query) || 
                       (item.name && item.name.toLocaleLowerCase('tr-TR').includes(queryLower));
            });

            filtered.sort((a, b) => {
                if (a.symbol === query) return -1;
                if (b.symbol === query) return 1;
                if (a.symbol.startsWith(query) && !b.symbol.startsWith(query)) return -1;
                if (!a.symbol.startsWith(query) && b.symbol.startsWith(query)) return 1;
                return a.symbol.localeCompare(b.symbol);
            });

            renderSuggestions(filtered.slice(0, 15));
        } else {
            const matches = Object.entries(appState.marketPrices)
                .filter(([sym, data]) => (data.category === category || category === "ALL") && (sym.includes(query) || (data.name && data.name.toUpperCase().includes(query))))
                .slice(0, 10)
                .map(([sym, data]) => ({
                    symbol: sym,
                    name: data.name || sym,
                    price: data.price,
                    change: data.prevClose ? ((data.price - data.prevClose) / data.prevClose) * 100 : 0
                }));
            renderSuggestions(matches);
        }
    });

    inputSymbol.addEventListener("keydown", (e) => {
        if (!suggestionsBox.classList.contains("active") || currentMatches.length === 0) return;

        const items = suggestionsBox.querySelectorAll(".suggestion-item");
        if (e.key === "ArrowDown") {
            e.preventDefault();
            selectedIndex = (selectedIndex + 1) % items.length;
            updateHighlight(items);
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            selectedIndex = (selectedIndex - 1 + items.length) % items.length;
            updateHighlight(items);
        } else if (e.key === "Enter" && selectedIndex >= 0) {
            e.preventDefault();
            selectSuggestion(currentMatches[selectedIndex]);
        } else if (e.key === "Escape") {
            suggestionsBox.classList.remove("active");
        }
    });

    function updateHighlight(items) {
        items.forEach((item, idx) => {
            if (idx === selectedIndex) {
                item.classList.add("active");
                item.scrollIntoView({ block: "nearest" });
            } else {
                item.classList.remove("active");
            }
        });
    }

    inputSymbol.addEventListener("blur", () => {
        setTimeout(() => {
            suggestionsBox.classList.remove("active");
            
            const sym = inputSymbol.value.trim().toUpperCase();
            if (sym) {
                const found = bistCatalog.find(s => s.symbol === sym) || 
                              (appState.marketPrices[sym] ? { symbol: sym, name: appState.marketPrices[sym].name, price: appState.marketPrices[sym].price } : null);
                if (found) {
                    if (inputName && !inputName.value) inputName.value = found.name;
                    if (inputPrice && (!inputPrice.value || parseFloat(inputPrice.value) === 0)) inputPrice.value = found.price;
                }
            }
        }, 200);
    });

    document.querySelectorAll('input[name="assetCategory"]').forEach(radio => {
        radio.addEventListener("change", () => {
            suggestionsBox.classList.remove("active");
            suggestionsBox.innerHTML = "";
            inputSymbol.dispatchEvent(new Event("input"));
        });
    });

    document.addEventListener("click", (e) => {
        if (!e.target.closest("#inputSymbol") && !e.target.closest("#symbolSuggestions")) {
            suggestionsBox.classList.remove("active");
        }
    });
}

function initEvents() {
    updateSortButtonUI();
    document.getElementById("btnQuickAdd").addEventListener("click", openAddModal);
    document.getElementById("btnNavAdd").addEventListener("click", openAddModal);
    document.getElementById("btnCloseAddModal").addEventListener("click", closeAddModal);
    document.getElementById("btnCloseSellModal").addEventListener("click", closeSellModal);
    document.getElementById("btnCloseDetailModal").addEventListener("click", closeDetailModal);

    setupSymbolAutocomplete();

    document.getElementById("formAddTransaction").addEventListener("submit", (e) => {
        e.preventDefault();
        const category = document.querySelector('input[name="assetCategory"]:checked').value;
        const symbol = document.getElementById("inputSymbol").value;
        const name = document.getElementById("inputName").value;
        const quantity = parseFloat(document.getElementById("inputQuantity").value);
        const price = parseFloat(document.getElementById("inputPrice").value);
        const date = document.getElementById("inputDate").value;
        const fee = parseFloat(document.getElementById("inputFee").value) || 0;

        addBuyTransaction(category, symbol, name, quantity, price, date, fee);
        closeAddModal();
        e.target.reset();
    });

    document.getElementById("formSellAsset").addEventListener("submit", (e) => {
        e.preventDefault();
        const holdingId = document.getElementById("sellAssetId").value;
        const qty = parseFloat(document.getElementById("inputSellQty").value);
        const price = parseFloat(document.getElementById("inputSellPrice").value);
        const date = document.getElementById("inputSellDate").value;

        if (executeSaleTransaction(holdingId, qty, price, date)) {
            closeSellModal();
            e.target.reset();
        }
    });

    document.getElementById("inputSellQty").addEventListener("input", updateEstimatedRealizedPL);
    document.getElementById("inputSellPrice").addEventListener("input", updateEstimatedRealizedPL);
    document.getElementById("inputSellDate").addEventListener("change", updateSellT2EstimatedDate);
    document.getElementById("inputSellDate").addEventListener("input", updateSellT2EstimatedDate);

    document.getElementById("btnUpdatePricePrompt").addEventListener("click", () => {
        const h = appState.holdings.find(item => item.id === activeDetailHoldingId);
        if (!h) return;

        const newP = prompt(`${h.symbol} için yeni canlı piyasa fiyatını girin (₺):`, h.currentPrice);
        if (newP && !isNaN(newP)) {
            updateMarketPrice(h.symbol, parseFloat(newP));
            closeDetailModal();
        }
    });

    document.getElementById("btnRefreshPrices").addEventListener("click", () => {
        fetchLivePrices();
    });

    document.getElementById("btnSimulateMarket").addEventListener("click", () => {
        fetchLivePrices();
    });
}

function simulateMarketFluctuation() {
    appState.holdings.forEach(h => {
        const changePercent = (Math.random() * 4 - 2);
        const newPrice = Math.max(0.01, h.currentPrice * (1 + changePercent / 100));
        updateMarketPrice(h.symbol, newPrice);
    });
}

async function fetchLivePrices() {
    const btn = document.getElementById("btnRefreshPrices");
    const overlay = document.getElementById("liveUpdateOverlay");
    
    if(btn) btn.classList.add("loading");
    if(overlay) {
        overlay.style.display = "flex";
        void overlay.offsetWidth;
        overlay.style.opacity = "1";
    }

    try {
        let fetchCount = 0;
        let usdTryRate = 47.90; // Current market default baseline

        // 1. Fetch FX Rates (Open Exchange Rates API - 100% Free, CORS-friendly, Global)
        try {
            const fxRes = await fetch("https://open.er-api.com/v6/latest/USD");
            if (fxRes.ok) {
                const fxData = await fxRes.json();
                if (fxData && fxData.rates && fxData.rates.TRY) {
                    usdTryRate = fxData.rates.TRY;
                    if (appState.marketPrices["USD/TRY"]) {
                        appState.marketPrices["USD/TRY"].price = usdTryRate;
                        fetchCount++;
                    }
                    if (fxData.rates.EUR && appState.marketPrices["EUR/TRY"]) {
                        appState.marketPrices["EUR/TRY"].price = usdTryRate / fxData.rates.EUR;
                        fetchCount++;
                    }
                }
            }
        } catch(e) {
            console.warn("Open ER API failed, trying Truncgil", e);
            try {
                const res = await fetch("https://finans.truncgil.com/today.json");
                const data = await res.json();
                if (data["USD"] && data["USD"].Satış) {
                    usdTryRate = parseFloat(data["USD"].Satış.replace(/\./g, '').replace(',', '.'));
                    if (appState.marketPrices["USD/TRY"]) {
                        appState.marketPrices["USD/TRY"].price = usdTryRate;
                        fetchCount++;
                    }
                }
                if (data["EUR"] && data["EUR"].Satış && appState.marketPrices["EUR/TRY"]) {
                    appState.marketPrices["EUR/TRY"].price = parseFloat(data["EUR"].Satış.replace(/\./g, '').replace(',', '.'));
                    fetchCount++;
                }
            } catch(tErr) { console.warn("FX fetch fallback failed", tErr); }
        }

        // 2. Fetch Crypto & Gold (Binance API - No CORS, Fast, Live)
        try {
            const res = await fetch("https://api.binance.com/api/v3/ticker/price");
            if (res.ok) {
                const data = await res.json();
                
                // PAXG (Physical Gold Ounce Token) -> Convert to Gram Gold (TL)
                const paxg = data.find(c => c.symbol === "PAXGUSDT");
                if (paxg && appState.marketPrices["ALTIN"]) {
                    const gramGoldTL = (parseFloat(paxg.price) * usdTryRate) / 31.1034768;
                    appState.marketPrices["ALTIN"].price = gramGoldTL;
                    fetchCount++;
                }

                data.forEach(coin => {
                    if (coin.symbol.endsWith("USDT")) {
                        const sym = coin.symbol.replace("USDT", "");
                        if (appState.marketPrices[sym] && appState.marketPrices[sym].category === "CRYPTO") {
                            appState.marketPrices[sym].price = parseFloat(coin.price) * usdTryRate;
                            fetchCount++;
                        }
                    }
                });
            }
        } catch(e) { console.warn("Crypto fetch failed", e); }

        // 3. Fetch BIST Stocks (TradingView Scanner API - Realtime, All 640+ Stocks + New IPOs)
        try {
            // Using text/plain Content-Type to completely avoid browser CORS preflight (OPTIONS) rejection
            const tvRes = await fetch("https://scanner.tradingview.com/turkey/scan", {
                method: "POST",
                headers: { "Content-Type": "text/plain" },
                body: JSON.stringify({
                    symbols: { query: { types: [] }, tickers: [] },
                    columns: [
                        "name", 
                        "description", 
                        "close", 
                        "change", 
                        "change_abs",
                        "price_earnings_ttm",
                        "price_book_fq",
                        "debt_to_equity_fq",
                        "return_on_equity_fq",
                        "market_cap_basic",
                        "total_revenue_fq",
                        "ebitda_fq",
                        "net_income_fq",
                        "gross_profit_fq",
                        "total_assets_fq",
                        "total_liabilities_fq",
                        "total_current_liabilities_fq",
                        "total_equity_fq",
                        "current_ratio_fq",
                        "enterprise_value_ebitda_ttm"
                    ],
                    range: [0, 1000]
                })
            });

            if (tvRes.ok) {
                const tvData = await tvRes.json();
                if (tvData && tvData.data && Array.isArray(tvData.data)) {
                    bistCatalog = [];
                    tvData.data.forEach(item => {
                        const d = item.d;
                        if (d && d.length >= 4) {
                            const sym = (d[0] || "").trim().toUpperCase();
                            const desc = (d[1] || sym).trim();
                            const closePrice = parseFloat(d[2]);
                            const changePct = parseFloat(d[3]) || 0;
                            const changeAbs = d[4] !== undefined && d[4] !== null ? parseFloat(d[4]) : 0;
                            
                            const pe = (d[5] !== undefined && d[5] !== null && !isNaN(d[5])) ? parseFloat(d[5]) : null;
                            const pb = (d[6] !== undefined && d[6] !== null && !isNaN(d[6])) ? parseFloat(d[6]) : null;
                            const debtToEquity = (d[7] !== undefined && d[7] !== null && !isNaN(d[7])) ? parseFloat(d[7]) : null;
                            const roe = (d[8] !== undefined && d[8] !== null && !isNaN(d[8])) ? parseFloat(d[8]) : null;
                            const marketCap = (d[9] !== undefined && d[9] !== null && !isNaN(d[9])) ? parseFloat(d[9]) : null;

                            const totalRevenue = (d[10] !== undefined && d[10] !== null && !isNaN(d[10])) ? parseFloat(d[10]) : null;
                            const ebitda = (d[11] !== undefined && d[11] !== null && !isNaN(d[11])) ? parseFloat(d[11]) : null;
                            const netIncome = (d[12] !== undefined && d[12] !== null && !isNaN(d[12])) ? parseFloat(d[12]) : null;
                            const grossProfit = (d[13] !== undefined && d[13] !== null && !isNaN(d[13])) ? parseFloat(d[13]) : null;
                            const totalAssets = (d[14] !== undefined && d[14] !== null && !isNaN(d[14])) ? parseFloat(d[14]) : null;
                            const totalLiabilities = (d[15] !== undefined && d[15] !== null && !isNaN(d[15])) ? parseFloat(d[15]) : null;
                            const totalCurrentLiabilities = (d[16] !== undefined && d[16] !== null && !isNaN(d[16])) ? parseFloat(d[16]) : null;
                            const totalEquity = (d[17] !== undefined && d[17] !== null && !isNaN(d[17])) ? parseFloat(d[17]) : null;
                            const currentRatio = (d[18] !== undefined && d[18] !== null && !isNaN(d[18])) ? parseFloat(d[18]) : null;
                            const evToEbitda = (d[19] !== undefined && d[19] !== null && !isNaN(d[19])) ? parseFloat(d[19]) : null;

                            if (sym && !isNaN(closePrice)) {
                                const prevClose = changeAbs !== 0 
                                    ? (closePrice - changeAbs) 
                                    : (closePrice / (1 + (changePct / 100)));

                                const stockEntry = {
                                    symbol: sym,
                                    name: desc,
                                    price: closePrice,
                                    prevClose: prevClose,
                                    change: changePct,
                                    category: "STOCK",
                                    pe: pe,
                                    pb: pb,
                                    debtToEquity: debtToEquity,
                                    roe: roe,
                                    marketCap: marketCap,
                                    totalRevenue: totalRevenue,
                                    ebitda: ebitda,
                                    netIncome: netIncome,
                                    grossProfit: grossProfit,
                                    totalAssets: totalAssets,
                                    totalLiabilities: totalLiabilities,
                                    totalCurrentLiabilities: totalCurrentLiabilities,
                                    totalEquity: totalEquity,
                                    currentRatio: currentRatio,
                                    evToEbitda: evToEbitda
                                };

                                bistCatalog.push(stockEntry);

                                // Update marketPrices if symbol exists in tracked list or holdings
                                if (appState.marketPrices[sym] || appState.holdings.some(h => h.symbol === sym)) {
                                    appState.marketPrices[sym] = Object.assign(appState.marketPrices[sym] || {}, stockEntry);
                                }
                            }
                        }
                    });

                    if (bistCatalog.length > 0) {
                        fetchCount += bistCatalog.length;
                        try {
                            localStorage.setItem("bist_catalog_cache", JSON.stringify(bistCatalog));
                        } catch(e) {}
                        console.log(`TradingView Scanner: ${bistCatalog.length} BIST hissesi başarıyla yüklendi.`);
                    }
                }
            } else {
                throw new Error("TradingView scanner HTTP " + tvRes.status);
            }
        } catch(e) {
            console.warn("TradingView Scanner direct fetch failed, trying Google Sheets fallback", e);
            try {
                const sheetCsvUrl = "https://docs.google.com/spreadsheets/d/11wcKvLgzw6Aaek5nOWP7daGBJbaSXXEqZVE55IciEzY/gviz/tq?tqx=out:csv";
                const res = await fetch(sheetCsvUrl);
                const csvText = await res.text();
                const rows = csvText.split('\n');
                rows.forEach(row => {
                    let cols = row.includes('","') ? row.split('","') : row.split(',');
                    if (cols.length >= 2) {
                        let sym = cols[0].replace(/"/g, '').trim().toUpperCase();
                        let priceStr = cols[1].replace(/"/g, '').trim().replace(/,/g, '.');
                        const price = parseFloat(priceStr);
                        if (sym && !isNaN(price)) {
                            if (!appState.marketPrices[sym] && appState.holdings.some(h => h.symbol === sym)) {
                                appState.marketPrices[sym] = { price: price, prevClose: price, name: sym, category: "STOCK" };
                            }
                            if (appState.marketPrices[sym]) {
                                appState.marketPrices[sym].price = price;
                                fetchCount++;
                            }
                        }
                    }
                });
            } catch(sheetErr) {
                console.warn("Google Sheets fallback failed", sheetErr);
            }
        }

        if (fetchCount > 0) {
            checkAndRolloverDailyPrices(); // Ensure daily rollover before updating

            // Synchronize all holdings with fresh market prices
            appState.holdings.forEach(h => {
                const catalogMatch = bistCatalog.find(b => b.symbol === h.symbol);
                if (catalogMatch) {
                    h.currentPrice = catalogMatch.price;
                    h.previousClosePrice = catalogMatch.prevClose || h.currentPrice;
                    appState.marketPrices[h.symbol] = {
                        price: catalogMatch.price,
                        prevClose: catalogMatch.prevClose,
                        name: catalogMatch.name,
                        category: h.category || "STOCK"
                    };
                } else if (appState.marketPrices[h.symbol]) {
                    h.currentPrice = appState.marketPrices[h.symbol].price;
                    if (appState.marketPrices[h.symbol].prevClose) {
                        h.previousClosePrice = appState.marketPrices[h.symbol].prevClose;
                    } else if (!h.previousClosePrice) {
                        h.previousClosePrice = h.currentPrice;
                    }
                }
            });

            saveData();
            renderAll();
        } else {
            throw new Error("Tüm servisler yanıt vermedi");
        }
    } catch (e) {
        console.error("Fiyatlar güncellenemedi, simülasyona geçiliyor:", e);
        simulateMarketFluctuation();
    } finally {
        if(btn) btn.classList.remove("loading");
        if(overlay) {
            overlay.style.opacity = "0";
            setTimeout(() => {
                overlay.style.display = "none";
            }, 300);
        }
    }
}

// --- Edit Sales ---
let currentEditSaleSymbol = null;

function openEditSaleModal(symbol) {
    currentEditSaleSymbol = symbol;
    let saleQty = 0;
    let totalRev = 0;
    let totalCost = 0;
    appState.sales.forEach(s => {
        if (s.symbol === symbol) {
            saleQty += s.saleQty;
            totalRev += (s.saleQty * s.salePrice);
            totalCost += (s.saleQty * s.costBasisAtSale);
        }
    });

    const avgPrice = saleQty > 0 ? totalRev / saleQty : 0;
    const avgCost = saleQty > 0 ? totalCost / saleQty : 0;

    document.getElementById("editSaleSymbol").innerText = symbol;
    document.getElementById("editSaleQty").value = parseFloat(saleQty.toFixed(4));
    document.getElementById("editSalePrice").value = parseFloat(avgPrice.toFixed(4));
    document.getElementById("editSaleCost").value = parseFloat(avgCost.toFixed(4));

    document.getElementById("editSaleModal").classList.add("active");
}

function closeEditSaleModal() {
    document.getElementById("editSaleModal").classList.remove("active");
    currentEditSaleSymbol = null;
}

function saveSaleEdit() {
    if (!currentEditSaleSymbol) return;

    const qty = parseFloat(document.getElementById("editSaleQty").value) || 0;
    const price = parseFloat(document.getElementById("editSalePrice").value) || 0;
    const cost = parseFloat(document.getElementById("editSaleCost").value) || 0;

    if (qty <= 0) {
        alert("Satış adedi 0'dan büyük olmalıdır.");
        return;
    }

    // Find original sale to preserve name/category/date
    let latestDate = "2000-01-01";
    let repName = "";
    let repCat = "STOCK";
    appState.sales.forEach(s => {
        if (s.symbol === currentEditSaleSymbol) {
            repName = s.name;
            repCat = s.category;
            if (new Date(s.saleDate) > new Date(latestDate)) latestDate = s.saleDate;
        }
    });

    // Remove old records
    appState.sales = appState.sales.filter(s => s.symbol !== currentEditSaleSymbol);

    // Add unified edited record
    appState.sales.push({
        id: "s_" + Date.now(),
        symbol: currentEditSaleSymbol,
        name: repName,
        category: repCat,
        saleDate: latestDate !== "2000-01-01" ? latestDate : new Date().toISOString().split('T')[0],
        saleQty: qty,
        salePrice: price,
        costBasisAtSale: cost,
        realizedPL: (price - cost) * qty,
        realizedPLPercent: cost > 0 ? ((price - cost) / cost) * 100 : 0
    });

    saveData();
    closeEditSaleModal();
    renderSalesTab();
}

function deleteSale() {
    if (!currentEditSaleSymbol) return;
    if (confirm(currentEditSaleSymbol + " varlığına ait TÜM satış geçmişi silinecek. Emin misiniz?")) {
        appState.sales = appState.sales.filter(s => s.symbol !== currentEditSaleSymbol);
        saveData();
        closeEditSaleModal();
        renderSalesTab();
    }
}

document.addEventListener("DOMContentLoaded", () => {
    loadData();
    initNavigation();
    initEvents();
    renderAll();
    
    // Automatically fetch live prices on startup
    fetchLivePrices();
});

/* ==========================================================================
   PIN & Privacy Logic
   ========================================================================== */
function togglePrivacy() {
    appState.privacyMode = !appState.privacyMode;
    saveData();
    applyPrivacyMode();
}

function applyPrivacyMode() {
    const btn = document.getElementById("privacyBtn");
    if (appState.privacyMode) {
        document.body.classList.add("privacy-active");
        if(btn) btn.innerHTML = '<i class="fa-solid fa-eye"></i>';
        
        // Add blur to all sensitive elements
        document.querySelectorAll('.asset-val, .h-current, .podium-val, .txt-neon-green, .txt-neon-red, .dashboard-card h3, .bento-balance-val, .bento-stat-num, .bento-vault-chips strong, .bento-cat-chip strong').forEach(el => {
            if (!el.classList.contains('no-blur') && !el.textContent.includes('%')) {
                el.classList.add('privacy-blur');
            }
        });
    } else {
        document.body.classList.remove("privacy-active");
        if(btn) btn.innerHTML = '<i class="fa-solid fa-eye-slash"></i>';
        
        // Remove blur
        document.querySelectorAll('.privacy-blur').forEach(el => {
            el.classList.remove('privacy-blur');
        });
    }
}

// Ensure privacy is applied after every render
const originalRenderAll = renderAll;
renderAll = function() {
    originalRenderAll();
    applyPrivacyMode();
}

let enteredPin = "";
let isPinSetupMode = false;
let isPinVisible = false;
let pinAudioCtx = null;

// Audio & Haptic Feedback Engines
function playKeyClickSound() {
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        if (!pinAudioCtx) {
            pinAudioCtx = new AudioContext();
        }
        if (pinAudioCtx.state === 'suspended') {
            pinAudioCtx.resume();
        }
        const osc = pinAudioCtx.createOscillator();
        const gain = pinAudioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1400, pinAudioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(320, pinAudioCtx.currentTime + 0.025);
        gain.gain.setValueAtTime(0.045, pinAudioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, pinAudioCtx.currentTime + 0.025);
        osc.connect(gain);
        gain.connect(pinAudioCtx.destination);
        osc.start();
        osc.stop(pinAudioCtx.currentTime + 0.03);
    } catch(e) {}
}

function triggerHaptic(type = 'tap') {
    if (!navigator.vibrate) return;
    try {
        if (type === 'tap') navigator.vibrate(12);
        else if (type === 'error') navigator.vibrate([40, 50, 40]);
        else if (type === 'success') navigator.vibrate([25, 40, 30]);
    } catch(e) {}
}

function updatePinGreeting() {
    const el = document.getElementById("pinGreetingText");
    if (!el) return;
    const hour = new Date().getHours();
    let msg = "Hoş Geldiniz, Yatırımcı";
    if (hour >= 5 && hour < 12) msg = "Günaydın, Yatırımcı";
    else if (hour >= 12 && hour < 18) msg = "İyi günler, Yatırımcı";
    else if (hour >= 18 && hour < 23) msg = "İyi akşamlar, Yatırımcı";
    else msg = "İyi geceler, Yatırımcı";
    el.textContent = msg;
}

function openPinModal() {
    const modal = document.getElementById("pinModal");
    if (modal) modal.classList.add("active");

    // Clear digit boxes
    document.querySelectorAll(".pin-digit-box").forEach(b => {
        b.value = "";
        b.classList.remove("filled");
        b.type = "password";
    });
    isPinVisible = false;
    const btnEye = document.getElementById("btnTogglePinVisibility");
    if (btnEye) btnEye.innerHTML = '<i class="fa-solid fa-eye"></i> Rakamları Göster';

    // Update banner & active actions
    const icon = document.getElementById("pinStatusIcon");
    const title = document.getElementById("pinStatusTitle");
    const desc = document.getElementById("pinStatusDesc");
    const badge = document.getElementById("pinStatusBadge");
    const activeActions = document.getElementById("pinActiveActions");

    if (appState.pin) {
        if (icon) {
            icon.className = "pin-status-icon active";
            icon.innerHTML = '<i class="fa-solid fa-shield-halved"></i>';
        }
        if (title) title.textContent = "PIN Koruması Aktif";
        if (desc) desc.textContent = "Uygulamanız 4 haneli PIN kodu ile güvence altında";
        if (badge) {
            badge.className = "pin-badge active";
            badge.textContent = "Aktif";
        }
        if (activeActions) activeActions.style.display = "block";
    } else {
        if (icon) {
            icon.className = "pin-status-icon inactive";
            icon.innerHTML = '<i class="fa-solid fa-lock-open"></i>';
        }
        if (title) title.textContent = "PIN Koruması Pasif";
        if (desc) desc.textContent = "Portföyünüzü korumak için 4 haneli PIN belirleyin";
        if (badge) {
            badge.className = "pin-badge inactive";
            badge.textContent = "Pasif";
        }
        if (activeActions) activeActions.style.display = "none";
    }

    updateBiometricButtonState();

    // Focus first box
    setTimeout(() => {
        const firstBox = document.querySelector('.pin-digit-box[data-step="new"][data-index="0"]');
        if (firstBox) firstBox.focus();
    }, 200);
}

function closePinModal() {
    const modal = document.getElementById("pinModal");
    if (modal) modal.classList.remove("active");
}

function togglePinVisibility() {
    isPinVisible = !isPinVisible;
    const boxes = document.querySelectorAll(".pin-digit-box");
    const btn = document.getElementById("btnTogglePinVisibility");

    boxes.forEach(box => {
        box.type = isPinVisible ? "text" : "password";
    });

    if (btn) {
        btn.innerHTML = isPinVisible 
            ? '<i class="fa-solid fa-eye-slash"></i> Gizle' 
            : '<i class="fa-solid fa-eye"></i> Rakamları Göster';
    }
}

function setupSegmentedPinInputs() {
    const boxes = document.querySelectorAll(".pin-digit-box");
    boxes.forEach((input) => {
        input.addEventListener("input", (e) => {
            const val = e.target.value.replace(/[^0-9]/g, '');
            e.target.value = val ? val.slice(-1) : '';
            if (val) {
                e.target.classList.add("filled");
                const nextIndex = parseInt(e.target.getAttribute("data-index")) + 1;
                const step = e.target.getAttribute("data-step");
                const nextBox = document.querySelector(`.pin-digit-box[data-step="${step}"][data-index="${nextIndex}"]`);
                if (nextBox) {
                    nextBox.focus();
                } else if (step === "new") {
                    // move to confirm step first box
                    const firstConfirm = document.querySelector('.pin-digit-box[data-step="confirm"][data-index="0"]');
                    if (firstConfirm) firstConfirm.focus();
                }
            } else {
                e.target.classList.remove("filled");
            }
        });

        input.addEventListener("keydown", (e) => {
            if (e.key === "Backspace" && !e.target.value) {
                const prevIndex = parseInt(e.target.getAttribute("data-index")) - 1;
                const step = e.target.getAttribute("data-step");
                const prevBox = document.querySelector(`.pin-digit-box[data-step="${step}"][data-index="${prevIndex}"]`);
                if (prevBox) {
                    prevBox.focus();
                    prevBox.value = "";
                    prevBox.classList.remove("filled");
                }
            }
        });

        input.addEventListener("paste", (e) => {
            e.preventDefault();
            const text = (e.clipboardData || window.clipboardData).getData('text').replace(/[^0-9]/g, '');
            if (!text) return;
            const step = e.target.getAttribute("data-step");
            const stepBoxes = document.querySelectorAll(`.pin-digit-box[data-step="${step}"]`);
            text.split('').slice(0, 4).forEach((char, idx) => {
                if (stepBoxes[idx]) {
                    stepBoxes[idx].value = char;
                    stepBoxes[idx].classList.add("filled");
                }
            });
            if (step === "new") {
                const firstConfirm = document.querySelector('.pin-digit-box[data-step="confirm"][data-index="0"]');
                if (firstConfirm) firstConfirm.focus();
            }
        });
    });
}

function savePinFromBoxes() {
    const newBoxes = document.querySelectorAll('.pin-digit-box[data-step="new"]');
    const confirmBoxes = document.querySelectorAll('.pin-digit-box[data-step="confirm"]');
    
    let p1 = "";
    newBoxes.forEach(b => p1 += b.value.trim());

    let p2 = "";
    confirmBoxes.forEach(b => p2 += b.value.trim());

    if (p1.length !== 4) {
        alert("Lütfen 4 haneli yeni bir PIN kodu girin.");
        return;
    }

    if (p1 !== p2) {
        alert("Girdiğiniz PIN kodları birbiriyle eşleşmiyor! Lütfen PIN tekrarını kontrol edin.");
        confirmBoxes.forEach(b => {
            b.value = "";
            b.classList.remove("filled");
        });
        if (confirmBoxes[0]) confirmBoxes[0].focus();
        return;
    }

    appState.pin = p1;
    saveData();
    closePinModal();
    alert("PIN kodu başarıyla kaydedildi! Bir sonraki girişinizde veya 'Şimdi Kilitle'ye bastığınızda sorulacaktır.");
}

const savePin = savePinFromBoxes;

function lockAppNow() {
    if (!appState.pin) {
        alert("Önce 4 haneli bir PIN belirlemelisiniz.");
        return;
    }
    closePinModal();
    initPinLock();
}

function removePin() {
    if (confirm("PIN kodunu kaldırmak istediğinize emin misiniz? Portföy kilit koruması devre dışı bırakılacak.")) {
        appState.pin = null;
        appState.biometricEnabled = false;
        appState.biometricCredentialId = null;
        saveData();
        closePinModal();
        alert("PIN kilidi ve biyometrik giriş kaldırıldı.");
    }
}

// --- Biometric (WebAuthn) Logic ---

function base64UrlToUint8Array(base64Url) {
    const padding = '='.repeat((4 - base64Url.length % 4) % 4);
    const base64 = (base64Url + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

function uint8ArrayToBase64Url(array) {
    const base64 = window.btoa(String.fromCharCode(...array));
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function toggleBiometric() {
    if (!appState.pin) {
        alert("Biyometrik girişi aktif etmeden önce bir PIN belirlemelisiniz.");
        return;
    }
    
    if (appState.biometricEnabled) {
        if(confirm("Biyometrik girişi kapatmak istediğinize emin misiniz?")) {
            appState.biometricEnabled = false;
            appState.biometricCredentialId = null;
            saveData();
            updateBiometricButtonState();
            alert("Biyometrik giriş kapatıldı.");
        }
    } else {
        await registerBiometric();
    }
}

async function registerBiometric() {
    if (!window.PublicKeyCredential) {
        alert("Cihazınız veya tarayıcınız Biyometrik Giriş (WebAuthn) desteklemiyor.");
        return;
    }

    try {
        const userId = new Uint8Array(16);
        window.crypto.getRandomValues(userId);
        
        const challenge = new Uint8Array(32);
        window.crypto.getRandomValues(challenge);

        const publicKey = {
            challenge: challenge,
            rp: { name: "Portföyüm App" },
            user: {
                id: userId,
                name: "user@portfoyum.app",
                displayName: "Portföy Kullanıcısı"
            },
            pubKeyCredParams: [{ type: "public-key", alg: -7 }], // ES256
            authenticatorSelection: {
                authenticatorAttachment: "platform", // FaceID / TouchID / Windows Hello
                userVerification: "required"
            },
            timeout: 60000,
            attestation: "none"
        };

        const credential = await navigator.credentials.create({ publicKey });
        
        if (credential) {
            appState.biometricEnabled = true;
            appState.biometricCredentialId = uint8ArrayToBase64Url(new Uint8Array(credential.rawId));
            saveData();
            updateBiometricButtonState();
            alert("Harika! Biyometrik Giriş (FaceID/TouchID) başarıyla aktif edildi.");
        }
    } catch (err) {
        console.error("Biometric registration failed:", err);
        alert("Biyometrik kayıt iptal edildi veya desteklenmiyor.\nDetay: " + err.message);
    }
}

async function authenticateBiometric() {
    if (!appState.biometricEnabled || !appState.biometricCredentialId) return;

    try {
        const challenge = new Uint8Array(32);
        window.crypto.getRandomValues(challenge);
        
        const credentialIdRaw = base64UrlToUint8Array(appState.biometricCredentialId);

        const publicKey = {
            challenge: challenge,
            allowCredentials: [{
                id: credentialIdRaw,
                type: "public-key"
            }],
            userVerification: "required",
            timeout: 60000
        };

        const assertion = await navigator.credentials.get({ publicKey });
        
        if (assertion) {
            // Success! Unlock the app.
            triggerHaptic('success');
            const overlay = document.getElementById("pinLockOverlay");
            if (overlay) {
                overlay.style.opacity = "0";
                overlay.style.transform = "scale(1.04)";
                overlay.style.transition = "all 0.35s cubic-bezier(0.4, 0, 0.2, 1)";
                setTimeout(() => {
                    overlay.style.display = "none";
                    overlay.style.opacity = "1";
                    overlay.style.transform = "scale(1)";
                    enteredPin = "";
                    updatePinDots();
                    renderAll();
                }, 350);
            }
        }
    } catch (err) {
        console.error("Biometric auth failed:", err);
        // Silently fail to let the user fallback to PIN input
    }
}

function updateBiometricButtonState() {
    const btn = document.getElementById("btnToggleBiometric");
    if (btn) {
        if (appState.biometricEnabled) {
            btn.innerHTML = '<i class="fa-solid fa-fingerprint" style="margin-right: 8px;"></i> Biyometrik Girişi Kapat';
            btn.style.background = 'linear-gradient(90deg, rgba(239,68,68,0.1) 0%, rgba(239,68,68,0.2) 100%)';
            btn.style.color = '#EF4444';
            btn.style.borderColor = 'rgba(239,68,68,0.3)';
        } else {
            btn.innerHTML = '<i class="fa-solid fa-fingerprint" style="margin-right: 8px;"></i> Biyometrik Girişi Aktif Et';
            btn.style.background = 'linear-gradient(90deg, rgba(56,189,248,0.1) 0%, rgba(56,189,248,0.2) 100%)';
            btn.style.color = '#38BDF8';
            btn.style.borderColor = 'rgba(56,189,248,0.3)';
        }
    }
}

function initPinLock() {
    if (appState.pin) {
        updatePinGreeting();
        enteredPin = "";
        updatePinDots();
        const overlay = document.getElementById("pinLockOverlay");
        if (overlay) {
            overlay.style.display = "flex";
            overlay.style.opacity = "1";
            overlay.style.transform = "scale(1)";
        }
        
        const bioBtn = document.getElementById("btnKeypadBiometric");
        if (bioBtn) {
            if (appState.biometricEnabled) {
                bioBtn.style.display = "flex";
                bioBtn.style.opacity = "1";
                // Auto-trigger biometric on load
                setTimeout(() => {
                    authenticateBiometric();
                }, 400);
            } else {
                bioBtn.style.opacity = "0.3";
            }
        }
    }
}

function updatePinDots() {
    const dots = document.querySelectorAll("#pinDots .pin-dot");
    const errorMsg = document.getElementById("pinErrorMessage");
    if (errorMsg && enteredPin.length > 0) {
        errorMsg.style.display = "none";
    }
    
    dots.forEach((dot, index) => {
        if (index < enteredPin.length) {
            dot.classList.add("filled");
        } else {
            dot.classList.remove("filled");
            dot.classList.remove("error");
            dot.style.background = "";
            dot.style.borderColor = "";
            dot.style.boxShadow = "";
        }
    });
}

function pressPin(num) {
    if (enteredPin.length < 4) {
        enteredPin += num.toString();
        playKeyClickSound();
        triggerHaptic('tap');
        updatePinDots();
        
        if (enteredPin.length === 4) {
            setTimeout(verifyPin, 160);
        }
    }
}

function deletePin() {
    if (enteredPin.length > 0) {
        enteredPin = enteredPin.slice(0, -1);
        playKeyClickSound();
        triggerHaptic('tap');
        updatePinDots();
    }
}

function verifyPin() {
    if (enteredPin === appState.pin) {
        // Unlock with smooth emerald green transformation and holographic burst
        triggerHaptic('success');
        const dots = document.querySelectorAll("#pinDots .pin-dot");
        dots.forEach(d => d.classList.add("success"));

        const shield = document.getElementById("pinShieldIcon");
        if (shield) {
            shield.classList.add("unlocked");
            shield.innerHTML = '<i class="fa-solid fa-lock-open"></i>';
        }

        setTimeout(() => {
            const overlay = document.getElementById("pinLockOverlay");
            if (overlay) {
                overlay.style.opacity = "0";
                overlay.style.transform = "scale(1.04)";
                overlay.style.transition = "all 0.35s cubic-bezier(0.4, 0, 0.2, 1)";
                setTimeout(() => {
                    overlay.style.display = "none";
                    overlay.style.opacity = "1";
                    overlay.style.transform = "scale(1)";
                    if (shield) {
                        shield.classList.remove("unlocked");
                        shield.innerHTML = '<i class="fa-solid fa-shield-halved"></i>';
                    }
                    enteredPin = "";
                    updatePinDots();
                    renderAll();
                }, 350);
            }
        }, 280);
    } else {
        // Wrong PIN: shake & turn red with glitch effect
        triggerHaptic('error');
        const dots = document.querySelectorAll("#pinDots .pin-dot");
        dots.forEach(d => d.classList.add("error"));

        const shield = document.getElementById("pinShieldIcon");
        if (shield) {
            shield.classList.add("error");
            shield.style.animation = "shake 0.45s cubic-bezier(0.36, 0.07, 0.19, 0.97) both";
        }

        const errorMsg = document.getElementById("pinErrorMessage");
        if (errorMsg) errorMsg.style.display = "flex";

        const dotsContainer = document.getElementById("pinDots");
        if (dotsContainer) {
            dotsContainer.style.animation = "shake 0.45s cubic-bezier(0.36, 0.07, 0.19, 0.97) both";
        }

        setTimeout(() => {
            if (dotsContainer) dotsContainer.style.animation = "";
            if (shield) {
                shield.style.animation = "shieldFloat 4s ease-in-out infinite";
                shield.classList.remove("error");
            }
            dots.forEach(d => d.classList.remove("error"));
            enteredPin = "";
            updatePinDots();
        }, 650);
    }
}

// Forgot PIN Confirmation Dialog
function openForgotPinModal() {
    const m = document.getElementById("modalForgotPinConfirm");
    if (m) m.style.display = "flex";
}

function closeForgotPinModal() {
    const m = document.getElementById("modalForgotPinConfirm");
    if (m) m.style.display = "none";
}

function confirmResetPin() {
    delete appState.pin;
    delete appState.biometricEnabled;
    delete appState.biometricCredentialId;
    saveData();
    closeForgotPinModal();
    
    const overlay = document.getElementById("pinLockOverlay");
    if (overlay) overlay.style.display = "none";
    enteredPin = "";
    updatePinDots();
    renderAll();
    alert("PIN kodu başarıyla sıfırlandı. İstediğiniz zaman Güvenlik Ayarlarından yeni bir PIN belirleyebilirsiniz.");
}

const promptForgotPin = openForgotPinModal;

// Physical Keyboard Listener
window.addEventListener("keydown", (e) => {
    const overlay = document.getElementById("pinLockOverlay");
    if (!overlay || overlay.style.display === "none") return;
    
    // Ignore if typing in another input
    if (e.target && (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA")) return;

    if (e.key >= "0" && e.key <= "9") {
        e.preventDefault();
        pressPin(parseInt(e.key));
        const btn = document.querySelector(`.pin-key[data-pin-key="${e.key}"]`);
        if (btn) {
            btn.classList.add("key-pressed");
            setTimeout(() => btn.classList.remove("key-pressed"), 140);
        }
    } else if (e.key === "Backspace" || e.key === "Delete") {
        e.preventDefault();
        deletePin();
        const btn = document.querySelector('.pin-key[data-pin-key="backspace"]');
        if (btn) {
            btn.classList.add("key-pressed");
            setTimeout(() => btn.classList.remove("key-pressed"), 140);
        }
    }
});

// Add shake animation dynamically
const style = document.createElement('style');
style.textContent = `
@keyframes shake {
    0%, 100% { transform: translateX(0); }
    20%, 60% { transform: translateX(-10px); }
    40%, 80% { transform: translateX(10px); }
}`;
document.head.appendChild(style);

// Check PIN on load & setup inputs
document.addEventListener("DOMContentLoaded", () => {
    setupSegmentedPinInputs();
    if (appState.pin) {
        initPinLock();
    }
});

/* ==========================================================================
   Social Media Story Share
   ========================================================================== */
function generateAvatarBase64(symbol) {
    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext("2d");
    
    // Background
    ctx.fillStyle = "#1e222d"; // Dark background
    ctx.beginPath();
    ctx.arc(64, 64, 64, 0, Math.PI * 2);
    ctx.fill();
    
    // Border
    ctx.lineWidth = 4;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
    ctx.stroke();
    
    // Text
    ctx.font = "bold 56px Inter, sans-serif";
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    
    // Get up to first 2 letters
    const initials = symbol.substring(0, 2).toUpperCase();
    ctx.fillText(initials, 64, 68);
    
    return canvas.toDataURL("image/png");
}

function shareHoldingToStory(holdingId) {
    const h = appState.holdings.find(item => item.id === holdingId);
    if (!h) return;
    
    const marketValue = h.quantity * h.currentPrice;
    const totalPL = marketValue - (h.quantity * h.avgCost);
    const totalPLPct = h.avgCost > 0 ? ((h.currentPrice - h.avgCost) / h.avgCost) * 100 : 0;
    
    const totalPortfolioValue = calculateMetrics().totalNAV;
    const weightPct = totalPortfolioValue > 0 ? (marketValue / totalPortfolioValue) * 100 : 0;

    shareToStory(
        h.symbol, 
        h.name || h.symbol, 
        h.avgCost * h.quantity, 
        marketValue, 
        totalPL, 
        totalPLPct, 
        weightPct, 
        false
    );
}

// Ensure old sales also use this function correctly
// For sales: shareToStory(symbol, name, buyTotal, sellTotal, profit, profitPct, 100, true)
async function shareToStory(symbol, name, costTotal, currentTotal, profitRaw, percentRaw, weightPct = 100, isSale = false) {
    if (!window.html2canvas) {
        alert("Paylaşım modülü yükleniyor, lütfen biraz bekleyip tekrar deneyin.");
        return;
    }
    
    const isPos = percentRaw >= 0;
    const sign = isPos ? '+' : '';
    const color = isPos ? '#10B981' : '#EF4444';
    const colorRgba = isPos ? '16,185,129' : '239,68,68';
    
    // Top Card
    document.getElementById("storyBoxLabel").innerText = isPos ? "KÂR" : "ZARAR";
    document.getElementById("storyBoxLabel").style.background = `rgba(${colorRgba},0.15)`;
    document.getElementById("storyBoxLabel").style.color = color;
    
    document.getElementById("storyTopGlow").style.background = `radial-gradient(circle, rgba(${colorRgba},0.15) 0%, transparent 70%)`;
    
    document.getElementById("storyMoney").innerText = `${sign}${formatCurrency(profitRaw)}`;
    document.getElementById("storyMoney").style.color = color;
    
    document.getElementById("storyPercentPill").style.background = `rgba(${colorRgba},0.08)`;
    document.getElementById("storyPercentPill").style.border = `1px solid rgba(${colorRgba},0.2)`;
    document.getElementById("storyPercentIcon").style.color = color;
    document.getElementById("storyPercentIcon").innerHTML = isPos ? '<i class="fa-solid fa-arrow-trend-up"></i>' : '<i class="fa-solid fa-arrow-trend-down"></i>';
    document.getElementById("storyPercent").innerText = `%${Math.abs(percentRaw).toFixed(2).replace('.', ',')}`;
    document.getElementById("storyPercent").style.color = color;
    
    if (isPos) {
        document.getElementById("storyBigArrow").innerHTML = `
            <svg viewBox="0 0 400 220" style="width: 100%; height: 100%;">
                <rect x="50" y="180" width="15" height="20" fill="rgba(16,185,129,0.1)" rx="2"/>
                <rect x="80" y="170" width="15" height="30" fill="rgba(16,185,129,0.15)" rx="2"/>
                <rect x="110" y="160" width="15" height="40" fill="rgba(16,185,129,0.2)" rx="2"/>
                <rect x="140" y="140" width="15" height="60" fill="rgba(16,185,129,0.25)" rx="2"/>
                <rect x="170" y="150" width="15" height="50" fill="rgba(16,185,129,0.3)" rx="2"/>
                <rect x="200" y="120" width="15" height="80" fill="rgba(16,185,129,0.35)" rx="2"/>
                <rect x="230" y="100" width="15" height="100" fill="rgba(16,185,129,0.4)" rx="2"/>
                <rect x="260" y="80" width="15" height="120" fill="rgba(16,185,129,0.5)" rx="2"/>
                <rect x="290" y="60" width="15" height="140" fill="rgba(16,185,129,0.6)" rx="2"/>
                <rect x="320" y="40" width="15" height="160" fill="rgba(16,185,129,0.7)" rx="2"/>
                <rect x="350" y="20" width="15" height="180" fill="rgba(16,185,129,0.8)" rx="2"/>
                <path d="M 20 180 Q 80 170 120 150 T 220 130 T 360 30" fill="none" stroke="#10B981" stroke-width="12" stroke-linecap="round" stroke-linejoin="round" filter="drop-shadow(0 10px 10px rgba(16,185,129,0.5))"/>
                <polygon points="370,15 340,25 365,50" fill="#10B981" filter="drop-shadow(0 10px 10px rgba(16,185,129,0.5))"/>
            </svg>
        `;
    } else {
        document.getElementById("storyBigArrow").innerHTML = `
            <svg viewBox="0 0 400 220" style="width: 100%; height: 100%;">
                <rect x="50" y="20" width="15" height="180" fill="rgba(239,68,68,0.1)" rx="2"/>
                <rect x="80" y="40" width="15" height="160" fill="rgba(239,68,68,0.15)" rx="2"/>
                <rect x="110" y="60" width="15" height="140" fill="rgba(239,68,68,0.2)" rx="2"/>
                <rect x="140" y="80" width="15" height="120" fill="rgba(239,68,68,0.25)" rx="2"/>
                <rect x="170" y="100" width="15" height="100" fill="rgba(239,68,68,0.3)" rx="2"/>
                <rect x="200" y="120" width="15" height="80" fill="rgba(239,68,68,0.35)" rx="2"/>
                <rect x="230" y="150" width="15" height="50" fill="rgba(239,68,68,0.4)" rx="2"/>
                <rect x="260" y="140" width="15" height="60" fill="rgba(239,68,68,0.5)" rx="2"/>
                <rect x="290" y="160" width="15" height="40" fill="rgba(239,68,68,0.6)" rx="2"/>
                <rect x="320" y="170" width="15" height="30" fill="rgba(239,68,68,0.7)" rx="2"/>
                <rect x="350" y="180" width="15" height="20" fill="rgba(239,68,68,0.8)" rx="2"/>
                <path d="M 20 30 Q 80 50 120 70 T 220 90 T 360 180" fill="none" stroke="#EF4444" stroke-width="12" stroke-linecap="round" stroke-linejoin="round" filter="drop-shadow(0 10px 10px rgba(239,68,68,0.5))"/>
                <polygon points="370,195 340,185 365,160" fill="#EF4444" filter="drop-shadow(0 10px 10px rgba(239,68,68,0.5))"/>
            </svg>
        `;
    }

    // Mid Cards
    document.getElementById("storyCol1Val").innerText = formatCurrency(costTotal);
    document.getElementById("storyCol2Val").innerText = formatCurrency(currentTotal);
    document.getElementById("storyCol3Val").innerText = `${sign}${formatCurrency(profitRaw)}`;
    document.getElementById("storyCol3Val").style.color = color;
    document.getElementById("storyCol3Icon").style.color = color;
    document.getElementById("storyCol3Icon").className = isPos ? "fa-solid fa-arrow-trend-up" : "fa-solid fa-arrow-trend-down";
    
    document.getElementById("storyCol4Val").innerText = `%${Math.abs(percentRaw).toFixed(2).replace('.', ',')}`;
    document.getElementById("storyCol4Val").style.color = color;
    document.getElementById("storyCol4Icon").style.color = color;

    // Line Chart
    document.getElementById("storyChartSymbol").innerText = symbol;
    const svgLine = isPos 
        ? `<svg viewBox="0 0 500 120" style="width:100%; height:100%; overflow:visible;">
            <defs>
                <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="rgba(16,185,129,0.3)"/>
                    <stop offset="100%" stop-color="rgba(16,185,129,0)"/>
                </linearGradient>
            </defs>
            <path d="M0,100 Q40,90 80,100 T160,80 T240,60 T320,50 T400,30 T500,10 L500,120 L0,120 Z" fill="url(#chartGrad)"/>
            <path d="M0,100 Q40,90 80,100 T160,80 T240,60 T320,50 T400,30 T500,10" fill="none" stroke="#10B981" stroke-width="4" stroke-linecap="round"/>
            <circle cx="500" cy="10" r="6" fill="#10B981" filter="drop-shadow(0 0 8px #10B981)"/>
           </svg>`
        : `<svg viewBox="0 0 500 120" style="width:100%; height:100%; overflow:visible;">
            <defs>
                <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="rgba(239,68,68,0.3)"/>
                    <stop offset="100%" stop-color="rgba(239,68,68,0)"/>
                </linearGradient>
            </defs>
            <path d="M0,10 Q40,20 80,10 T160,30 T240,50 T320,60 T400,80 T500,100 L500,120 L0,120 Z" fill="url(#chartGrad)"/>
            <path d="M0,10 Q40,20 80,10 T160,30 T240,50 T320,60 T400,80 T500,100" fill="none" stroke="#EF4444" stroke-width="4" stroke-linecap="round"/>
            <circle cx="500" cy="100" r="6" fill="#EF4444" filter="drop-shadow(0 0 8px #EF4444)"/>
           </svg>`;
    document.getElementById("storyChartSvgContainer").innerHTML = svgLine;

    // Donut
    const pctInt = Math.min(100, Math.max(0, Math.round(weightPct)));
    document.getElementById("storyDonutPath").setAttribute("stroke-dasharray", `${pctInt}, 100`);
    document.getElementById("storyDonutPath").setAttribute("stroke", color);
    document.getElementById("storyDonutColor").style.background = color;
    document.getElementById("storyDonutPct").innerText = `%${pctInt}`;
    document.getElementById("storyDonutRem").innerText = `%${100 - pctInt}`;

    const template = document.getElementById("storyShareTemplate");
    
    try {
        const canvas = await html2canvas(template, {
            scale: 2, 
            backgroundColor: "#080A10",
            logging: false,
            useCORS: true
        });
        
        const dataUrl = canvas.toDataURL("image/png");
        
        // Show Preview Modal
        const previewImg = document.getElementById("sharePreviewImage");
        previewImg.src = dataUrl;
        
        const modal = document.getElementById("modalSharePreview");
        modal.classList.add("active");
        
        // Native Share Setup
        const btnShare = document.getElementById("btnNativeShare");
        btnShare.onclick = async () => {
            if (navigator.share) {
                canvas.toBlob(async (blob) => {
                    const file = new File([blob], `Portfoy_${symbol}.png`, { type: "image/png" });
                    try {
                        await navigator.share({
                            title: "Portföyüm Kâr/Zarar",
                            files: [file]
                        });
                    } catch (e) {
                        console.log("Share cancelled or failed", e);
                    }
                });
            } else {
                alert("Cihazınız bu paylaşım yöntemini desteklemiyor. Görsele basılı tutarak kaydedebilirsiniz.");
            }
        };

    } catch (err) {
        console.error("html2canvas error:", err);
        alert("Görsel oluşturulurken bir hata oluştu.");
    }
}

document.getElementById("btnCloseShareModal").addEventListener("click", () => {
    document.getElementById("modalSharePreview").classList.remove("active");
});

/* ==========================================================================
   News & KAP Radar
   ========================================================================== */
async function fetchNews() {
    const container = document.getElementById("newsList");
    if (!container) return;

    try {
        container.innerHTML = `<div class="empty-state"><i class="fa-solid fa-spinner fa-spin"></i><p>KAP Verileri Taranıyor...</p></div>`;
        
        // Simüle edilmiş bekleme süresi (gerçekçi hissettirmek için)
        await new Promise(r => setTimeout(r, 800));

        const myHoldings = appState.holdings.filter(h => h.category === "STOCK");
        
        if (myHoldings.length === 0) {
            container.innerHTML = `<div class="empty-state"><i class="fa-solid fa-folder-open"></i><p>KAP Radarı için portföyünüze hisse senedi ekleyin.</p></div>`;
            return;
        }

        const kapTypes = [
            "Finansal Rapor (Bilanço)",
            "Yeni İş İlişkisi",
            "Sermaye Artırımı (Bedelsiz)",
            "Kar Payı Dağıtım İşlemleri (Temettü)",
            "Pay Alım Satım Bildirimi",
            "Genel Kurul Toplantısı Sonucu",
            "Özel Durum Açıklaması (Genel)"
        ];

        let mockNews = [];

        // Portföydeki her hisse için rastgele 1-2 haber üret
        myHoldings.forEach(stock => {
            const numNews = Math.floor(Math.random() * 2) + 1;
            for(let i=0; i<numNews; i++) {
                const randomType = kapTypes[Math.floor(Math.random() * kapTypes.length)];
                
                // Zamanı bugünün rastgele bir saatine ayarla
                const date = new Date();
                date.setHours(Math.floor(Math.random() * 9) + 9); // 09:00 - 18:00 arası
                date.setMinutes(Math.floor(Math.random() * 60));
                
                let title = `${stock.symbol} - ${randomType}`;
                if (randomType === "Yeni İş İlişkisi") {
                    title += ` (Şirketimiz ile yurt içi yerleşik bir müşteri arasında ${Math.floor(Math.random()*100)+50} Milyon TL tutarında anlaşma sağlanmıştır)`;
                } else if (randomType === "Sermaye Artırımı (Bedelsiz)") {
                    title += ` (%${Math.floor(Math.random()*20)*10 + 100} oranında bedelsiz sermaye artırımı SPK tarafından onaylandı)`;
                } else if (randomType === "Kar Payı Dağıtım İşlemleri (Temettü)") {
                    title += ` (Pay başına net ${Math.floor(Math.random()*5)+1},${Math.floor(Math.random()*99)} TL temettü dağıtım kararı)`;
                }

                mockNews.push({
                    symbol: stock.symbol,
                    title: title,
                    date: date,
                    timeStr: date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
                });
            }
        });

        // Haberleri zamana göre sırala (en yeni en üstte)
        mockNews.sort((a, b) => b.date - a.date);

        const html = mockNews.map((item, idx) => {
            // Encode content for safe HTML attribute injection
            const safeTitle = item.title.replace(/'/g, "\\'").replace(/"/g, '&quot;');
            
            // Create a fake, long, and realistic detailed content for the modal
            const detailText = `Şirketimiz Yönetim Kurulu'nun ${item.timeStr} tarihli toplantısında;
            
Sermaye Piyasası Kurulu'nun (SPK) Seri: II, No: 14.1 sayılı Tebliği hükümleri çerçevesinde hazırlanan finansal tablolarımız ve faaliyet raporlarımız incelenmiş olup, ${item.title} kapsamında belirtilen hususların kamuoyu ile şeffaf bir şekilde paylaşılmasına karar verilmiştir.

Bu kapsamda şirketimizin ilgili dönemdeki faaliyetleri ve stratejik hedefleri doğrultusunda yatırımlarımız planlandığı şekilde devam etmektedir. Detaylı bağımsız denetim raporu ve ek dosyalar KAP sistemine yüklenmiştir.

Yatırımcılarımıza saygıyla duyurulur.`.replace(/'/g, "\\'").replace(/"/g, '&quot;').replace(/\n/g, '\\n');

            return `
                <a href="#" class="news-item highlight" onclick="openKapModal('${item.symbol}', '${safeTitle}', '${item.timeStr}', '${detailText}'); return false;">
                    <div class="news-tag"><i class="fa-solid fa-bullseye"></i> Portföyünüzdeki Hisse (${item.symbol})</div>
                    <div class="news-title">${item.title}</div>
                    <div class="news-meta">
                        <span style="color: #F59E0B; font-weight: bold;">KAP Bildirimi</span>
                        <span>Bugün, ${item.timeStr}</span>
                    </div>
                </a>
            `;
        }).join('');
        
        container.innerHTML = html;
        
    } catch (err) {
        console.error("News fetch error:", err);
        container.innerHTML = `<div class="empty-state"><p>KAP bağlantı hatası.</p></div>`;
    }
}

function openKapModal(symbol, title, time, content) {
    document.getElementById("kapDetailSymbol").innerText = symbol;
    document.getElementById("kapDetailTitle").innerText = title;
    document.getElementById("kapDetailDate").innerText = `Tarih: Bugün, ${time}`;
    
    // Replace \n back to actual newlines for textContent
    document.getElementById("kapDetailContent").textContent = content.replace(/\\n/g, '\n');
    
    document.getElementById("modalKapDetail").classList.add("active");
}

function closeKapModal() {
    document.getElementById("modalKapDetail").classList.remove("active");
}

/// --- Screen Stability, Gesture & Zoom Prevention (Non-Destructive) ---
(function initTouchZoomPrevention() {
    // 1. Prevent iOS Safari multi-touch gestures (pinch-to-zoom / rotate)
    document.addEventListener('gesturestart', function (e) {
        e.preventDefault();
    }, { passive: false });
    document.addEventListener('gesturechange', function (e) {
        e.preventDefault();
    }, { passive: false });
    document.addEventListener('gestureend', function (e) {
        e.preventDefault();
    }, { passive: false });

    // 2. Prevent multi-finger pinch zoom on touch devices without blocking single-finger taps
    document.addEventListener('touchstart', function (e) {
        if (e.touches && e.touches.length > 1) {
            e.preventDefault();
        }
    }, { passive: false });

    // 3. Prevent trackpad / mouse pinch-to-zoom (Ctrl + Wheel)
    window.addEventListener('wheel', function (e) {
        if (e.ctrlKey) {
            e.preventDefault();
        }
    }, { passive: false });

    // 4. Prevent desktop dblclick zoom
    document.addEventListener('dblclick', function (e) {
        e.preventDefault();
    }, { passive: false });
})();
