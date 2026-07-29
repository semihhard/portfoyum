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

// --- Theme List ---
const THEMES = ["theme-oled-neon", "theme-midnight-violet", "theme-titanium-light"];
let currentThemeIndex = 0;

// --- State Object ---
let appState = {
    holdings: [],
    sales: [],
    marketPrices: { ...DEFAULT_MARKET_PRICES },
    privacyMode: false,
    activeCategory: "ALL",
    theme: "theme-oled-neon"
};

// --- Initial Sample Data ---
function loadInitialSampleData() {
    appState.holdings = [];
    appState.sales = [];
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
        } catch (e) {
            console.error("Storage load error", e);
            loadInitialSampleData();
        }
    } else {
        loadInitialSampleData();
        saveData();
    }
    applyTheme(appState.theme || "theme-oled-neon");
}

function applyTheme(themeClass) {
    document.body.className = themeClass;
    appState.theme = themeClass;
    currentThemeIndex = THEMES.indexOf(themeClass);
    if (currentThemeIndex < 0) currentThemeIndex = 0;
    saveData();
}

function cycleTheme() {
    currentThemeIndex = (currentThemeIndex + 1) % THEMES.length;
    applyTheme(THEMES[currentThemeIndex]);
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
    name = name ? name.trim() : (appState.marketPrices[symbol]?.name || symbol);

    let currentPrice = price;
    let prevClose = price;
    if (appState.marketPrices[symbol]) {
        currentPrice = appState.marketPrices[symbol].price;
        prevClose = appState.marketPrices[symbol].prevClose;
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

    appState.sales.unshift({
        id: "s_" + Date.now(),
        symbol: h.symbol,
        name: h.name,
        category: h.category,
        saleDate,
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

function updateMarketPrice(symbol, newPrice) {
    const h = appState.holdings.find(item => item.symbol === symbol);
    if (h) {
        h.previousClosePrice = h.currentPrice;
        h.currentPrice = newPrice;
    }
    if (appState.marketPrices[symbol]) {
        appState.marketPrices[symbol].prevClose = appState.marketPrices[symbol].price;
        appState.marketPrices[symbol].price = newPrice;
    }
    saveData();
    renderAll();
}

// --- Render Dashboard ---
function renderDashboard() {
    const m = calculateMetrics();

    document.getElementById("totalNAV").innerText = formatCurrency(m.totalNAV);
    document.getElementById("totalCost").innerText = formatCurrency(m.totalCost);
    document.getElementById("totalRealizedPL").innerText = formatCurrency(m.totalRealizedPL);

    const dailyElem = document.getElementById("dailyPL");
    const dailyClass = m.dailyPL > 0 ? "pos" : (m.dailyPL < 0 ? "neg" : "neut");
    const dailySign = m.dailyPL > 0 ? "+" : "";
    dailyElem.innerHTML = `<span class="pl-badge ${dailyClass}">${dailySign}${formatCurrency(m.dailyPL)} (${formatPercent(m.dailyPLPct)})</span>`;

    const totalPLElem = document.getElementById("totalPL");
    const totalPLClass = m.totalUnrealizedPL > 0 ? "pos" : (m.totalUnrealizedPL < 0 ? "neg" : "neut");
    const totalPLSign = m.totalUnrealizedPL > 0 ? "+" : "";
    totalPLElem.innerHTML = `<span class="pl-badge ${totalPLClass}">${totalPLSign}${formatCurrency(m.totalUnrealizedPL)} (${formatPercent(m.totalUnrealizedPLPct)})</span>`;

    const listContainer = document.getElementById("assetsList");
    const filteredHoldings = appState.activeCategory === "ALL" 
        ? appState.holdings 
        : appState.holdings.filter(h => h.category === appState.activeCategory);

    document.getElementById("assetCount").innerText = filteredHoldings.length;

    if (filteredHoldings.length === 0) {
        listContainer.innerHTML = `
            <div class="empty-state">
                <i class="fa-solid fa-folder-open"></i>
                <p>Bu kategoride gösterilecek varlık bulunamadı.</p>
                <button class="btn-sm primary" onclick="openAddModal()" style="margin-top: 10px;">+ Varlık Ekle</button>
            </div>
        `;
        return;
    }

    listContainer.innerHTML = filteredHoldings.map(h => {
        const marketValue = h.quantity * h.currentPrice;
        const totalPL = marketValue - (h.quantity * h.avgCost);
        const totalPLPct = h.avgCost > 0 ? ((h.currentPrice - h.avgCost) / h.avgCost) * 100 : 0;
        const isPos = totalPL >= 0;
        const categoryLabels = { STOCK: "Hisse", FUND: "Fon", FX: "Döviz", CRYPTO: "Kripto" };
        const iconClasses = { STOCK: "stock fa-chart-line", FUND: "fund fa-vault", FX: "fx fa-coins", CRYPTO: "crypto fa-bitcoin" };

        return `
            <div class="asset-card" onclick="openDetailModal('${h.id}')">
                <div class="asset-left">
                    <div class="asset-icon ${iconClasses[h.category] || 'stock fa-coins'}">
                        <i class="fa-solid fa-${iconClasses[h.category].split(' ')[1]}"></i>
                    </div>
                    <div class="asset-details">
                        <h4>${h.symbol} <span class="asset-cat-tag">${categoryLabels[h.category]}</span></h4>
                        <div class="asset-sub">
                            ${formatNumber(h.quantity, h.category === 'CRYPTO' ? 4 : 2)} Adet • Ort: ${formatCurrency(h.avgCost)}
                        </div>
                    </div>
                </div>
                <div class="asset-right">
                    <div class="asset-val">${formatCurrency(marketValue)}</div>
                    <div class="asset-pl ${isPos ? 'txt-neon-green' : 'txt-neon-red'}">
                        ${isPos ? '+' : ''}${formatCurrency(totalPL)} (${formatPercent(totalPLPct)})
                    </div>
                </div>
            </div>
        `;
    }).join("");
}

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
            <div class="sale-card">
                <div class="sale-top">
                    <span class="sale-symbol">${s.symbol} - ${s.name}</span>
                    <div style="display:flex; align-items:center; gap:8px;">
                        <span class="sale-date">Son: ${s.saleDate}</span>
                        <button style="background:none; border:none; color:var(--text-muted); cursor:pointer; padding:4px;" onclick="openEditSaleModal('${s.symbol}')">
                            <i class="fa-solid fa-pen"></i>
                        </button>
                    </div>
                </div>
                <div class="sale-grid">
                    <div class="sale-cell">
                        <span>Toplam Satış</span>
                        <strong>${formatNumber(s.saleQty, s.category === 'CRYPTO' ? 4 : 2)} Adet</strong>
                    </div>
                    <div class="sale-cell">
                        <span>Ortalama Fiyat</span>
                        <strong>${formatCurrency(s.salePrice)}</strong>
                    </div>
                    <div class="sale-cell">
                        <span>Toplam Kâr</span>
                        <strong class="${isPos ? 'txt-neon-green' : 'txt-neon-red'}">
                            ${isPos ? '+' : ''}${formatCurrency(s.realizedPL)} (${formatPercent(s.realizedPLPercent)})
                        </strong>
                    </div>
                </div>

                <!-- "Satılmasaydı Ne Olurdu?" Opportunity Cost Banner -->
                <div class="what-if-box ${whatIf.type}">
                    <i class="fa-solid ${whatIf.icon}"></i>
                    <span>${whatIf.text}</span>
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

    const rankClasses = ["rank-1", "rank-2", "rank-3"];
    const rankBadges = ["🥇 1", "🥈 2", "🥉 3"];

    podiumElem.innerHTML = top3.map((s, idx) => `
        <div class="top-sale-card ${rankClasses[idx]}">
            <div class="rank-badge">${rankBadges[idx]}</div>
            <h4>${s.symbol}</h4>
            <span class="podium-val ${s.realizedPL >= 0 ? 'txt-neon-green' : 'txt-neon-red'}">
                ${s.realizedPL >= 0 ? '+' : ''}${formatCurrency(s.realizedPL)}
            </span>
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
        // Price went up after selling -> Missed gain
        return {
            type: "missed-gain",
            icon: "fa-triangle-exclamation",
            text: `<strong>Satılmasaydı:</strong> Anlık piyasa fiyatı (${formatCurrency(currentPrice)}) ile bu varlık bugün <strong>+${formatCurrency(diff)} (${formatPercent(diffPct)})</strong> daha yüksek değerde olacaktı.`
        };
    } else if (currentPrice < sale.salePrice) {
        // Price went down after selling -> Good sell decision!
        const savedAmount = Math.abs(diff);
        return {
            type: "good-sell",
            icon: "fa-circle-check",
            text: `<strong>Doğru Zamanlama!</strong> Fiyat geriledi (${formatCurrency(currentPrice)}). Satılmasaydı elinizde kalsaydı <strong>${formatCurrency(savedAmount)} (${formatPercent(diffPct)})</strong> daha az değerde olacaktı.`
        };
    } else {
        return {
            type: "equal",
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
    if (sorted.length === 0) {
        topContainer.innerHTML = "<p class='txt-muted'>Portföyde varlık bulunmuyor.</p>";
    } else {
        topContainer.innerHTML = sorted.slice(0, 4).map(h => {
            const pct = ((h.currentPrice - h.avgCost) / h.avgCost) * 100;
            const isPos = pct >= 0;
            return `
                <div class="top-item">
                    <span><strong>${h.symbol}</strong> - ${h.name}</span>
                    <span class="${isPos ? 'txt-neon-green' : 'txt-neon-red'}"><strong>${isPos ? '+' : ''}${formatPercent(pct)}</strong></span>
                </div>
            `;
        }).join("");
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
    const items = Object.entries(appState.marketPrices);

    container.innerHTML = items.map(([symbol, data]) => {
        const diff = data.price - data.prevClose;
        const pct = (diff / data.prevClose) * 100;
        const isPos = diff >= 0;

        return `
            <div class="asset-card">
                <div class="asset-left">
                    <div class="asset-details">
                        <h4>${symbol}</h4>
                        <div class="asset-sub">${data.name}</div>
                    </div>
                </div>
                <div class="asset-right">
                    <div class="asset-val">${formatCurrency(data.price)}</div>
                    <div class="asset-pl ${isPos ? 'txt-neon-green' : 'txt-neon-red'}">
                        ${isPos ? '+' : ''}${formatPercent(pct)}
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
function openAddModal() {
    document.getElementById("inputDate").value = new Date().toISOString().split('T')[0];
    document.getElementById("modalAddTransaction").classList.add("active");
}

function closeAddModal() {
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
    document.getElementById("modalSellAsset").classList.add("active");
}

function closeSellModal() {
    document.getElementById("modalSellAsset").classList.remove("active");
}

let activeDetailHoldingId = null;

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
    document.getElementById("detailTotalVal").innerText = formatCurrency(mVal);
    document.getElementById("detailPL").innerText = `${pl >= 0 ? '+' : ''}${formatCurrency(pl)}`;
    document.getElementById("detailPL").className = pl >= 0 ? "txt-neon-green" : "txt-neon-red";

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
        <button class="btn-sm danger" onclick="closeDetailModal(); deleteAsset('${h.id}');">
            <i class="fa-solid fa-trash"></i> Sil
        </button>
    `;

    document.getElementById("modalAssetDetail").classList.add("active");
}

function closeDetailModal() {
    document.getElementById("modalAssetDetail").classList.remove("active");
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

function initEvents() {
    document.getElementById("btnQuickAdd").addEventListener("click", openAddModal);
    document.getElementById("btnNavAdd").addEventListener("click", openAddModal);
    document.getElementById("btnCloseAddModal").addEventListener("click", closeAddModal);
    document.getElementById("btnCloseSellModal").addEventListener("click", closeSellModal);
    document.getElementById("btnCloseDetailModal").addEventListener("click", closeDetailModal);

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
    if(btn) btn.classList.add("loading");

    try {
        const uniqueSymbols = new Set();
        appState.holdings.forEach(h => {
            if (h.category === "STOCK") uniqueSymbols.add(h.symbol + ".IS");
            if (h.category === "FUND") uniqueSymbols.add(h.symbol + ".IS"); // some funds work with .IS
            if (h.category === "CRYPTO") uniqueSymbols.add(h.symbol + "-USD");
            if (h.category === "FX" && h.symbol === "USD/TRY") uniqueSymbols.add("USDTRY=X");
            if (h.category === "FX" && h.symbol === "EUR/TRY") uniqueSymbols.add("EURTRY=X");
            if (h.category === "FX" && h.symbol === "ALTIN") uniqueSymbols.add("XAUTRY=X"); 
        });

        if (uniqueSymbols.size === 0) return;

        uniqueSymbols.add("USDTRY=X"); // ALWAYS needed for crypto conversion

        const symbolsParam = Array.from(uniqueSymbols).join(",");
        const yfUrl = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbolsParam}`;
        const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(yfUrl)}`;

        const res = await fetch(proxyUrl);
        const json = await res.json();
        const data = JSON.parse(json.contents);
        
        if (data && data.quoteResponse && data.quoteResponse.result) {
            const results = data.quoteResponse.result;
            
            let usdTryRate = 38.0;
            const usdTryItem = results.find(r => r.symbol === "USDTRY=X");
            if (usdTryItem) usdTryRate = usdTryItem.regularMarketPrice;

            results.forEach(quote => {
                let localSymbol = quote.symbol;
                let price = quote.regularMarketPrice;
                let prevClose = quote.regularMarketPreviousClose || quote.regularMarketPrice;

                if (localSymbol.endsWith(".IS")) {
                    localSymbol = localSymbol.replace(".IS", "");
                } else if (localSymbol.endsWith("-USD")) {
                    localSymbol = localSymbol.replace("-USD", "");
                    price = price * usdTryRate;
                    prevClose = prevClose * usdTryRate;
                } else if (localSymbol === "USDTRY=X") {
                    localSymbol = "USD/TRY";
                } else if (localSymbol === "EURTRY=X") {
                    localSymbol = "EUR/TRY";
                } else if (localSymbol === "XAUTRY=X") {
                    localSymbol = "ALTIN";
                }

                if (appState.marketPrices[localSymbol]) {
                    appState.marketPrices[localSymbol].price = price;
                    appState.marketPrices[localSymbol].prevClose = prevClose;
                } else {
                    appState.marketPrices[localSymbol] = { price: price, prevClose: prevClose, name: localSymbol, category: "UNKNOWN" };
                }
            });
            
            saveData();
            renderAll();
        }
    } catch (e) {
        console.error("Fiyatlar güncellenemedi:", e);
        alert("Fiyatlar güncellenirken proxy hatası oluştu. Varlıklarınızı girip daha sonra tekrar deneyin.");
    } finally {
        if(btn) btn.classList.remove("loading");
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
