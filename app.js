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
    theme: "theme-oled-neon",
    pin: null
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

        const dailyDiff = h.previousClosePrice ? (h.currentPrice - h.previousClosePrice) * h.quantity : 0;
        const dailyPct = h.previousClosePrice ? ((h.currentPrice - h.previousClosePrice) / h.previousClosePrice) * 100 : 0;
        const isDailyPos = dailyDiff >= 0;

        const categoryLabels = { STOCK: "Hisse", FUND: "Fon", FX: "Döviz", CRYPTO: "Kripto" };
        const iconClasses = { STOCK: "stock fa-chart-line", FUND: "fund fa-vault", FX: "fx fa-coins", CRYPTO: "crypto fa-bitcoin" };
        
        // CSS Sınıfından ikon ismini çıkartma (Örn: "stock fa-chart-line" -> "fa-chart-line")
        const iconClassStr = iconClasses[h.category] || "stock fa-coins";
        const iconName = iconClassStr.split(' ').find(c => c.startsWith('fa-')) || "fa-coins";

        return `
            <div class="asset-card" onclick="openDetailModal('${h.id}')" style="display:grid; grid-template-columns: 45px 1fr auto; gap: 15px; align-items: center; padding: 16px; background: rgba(30, 30, 45, 0.4); border: 1px solid rgba(255,255,255,0.04); border-radius: 18px; margin-bottom: 12px; cursor: pointer; transition: all 0.2s ease-out; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
                <div class="asset-icon" style="width:45px; height:45px; border-radius:12px; display:flex; align-items:center; justify-content:center; font-size: 1.25rem; background:rgba(255,255,255,0.06); color: #fff;">
                    <i class="fa-solid ${iconName}"></i>
                </div>
                
                <div class="asset-details" style="display:flex; flex-direction:column; gap:4px;">
                    <div style="font-weight:700; font-size:1.1rem; color:#fff; display:flex; align-items:center; gap:6px;">
                        ${h.symbol}
                        <span style="font-size:0.65rem; background:rgba(255,255,255,0.1); padding:2px 6px; border-radius:4px; font-weight:normal; letter-spacing: 0.5px;">${categoryLabels[h.category]}</span>
                    </div>
                    <div style="font-size:0.8rem; color:var(--text-secondary);">
                        ${formatNumber(h.quantity, h.category === 'CRYPTO' ? 4 : 2)} Adet &bull; Ort: ${formatCurrency(h.avgCost)}
                    </div>
                    <div style="font-size:0.8rem; font-weight: 500; margin-top:2px;">
                        <span class="${isPos ? 'txt-neon-green' : 'txt-neon-red'}">${isPos ? '▲' : '▼'} Toplam: ${isPos ? '+' : ''}${formatCurrency(totalPL)}</span>
                    </div>
                </div>
                
                <div class="asset-right" style="display:flex; flex-direction:column; align-items:flex-end; gap:4px;">
                    <div style="font-weight:700; font-size:1.15rem; color:#fff;">${formatCurrency(h.currentPrice)}</div>
                    <div style="padding:4px 8px; border-radius:6px; font-size:0.85rem; font-weight:700; display:flex; align-items:center; justify-content:center; min-width: 75px; background: ${isDailyPos ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)'}; color: ${isDailyPos ? '#10B981' : '#EF4444'}; box-shadow: inset 0 0 0 1px ${isDailyPos ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'};">
                        ${isDailyPos ? '+' : ''}${formatPercent(dailyPct)}
                    </div>
                    <div style="font-size:0.75rem; color:var(--text-secondary); margin-top:2px;">G. Kâr: ${isDailyPos ? '+' : ''}${formatCurrency(dailyDiff)}</div>
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
            <div style="background: rgba(30, 30, 45, 0.4); border: 1px solid rgba(255,255,255,0.04); border-radius: 18px; margin-bottom: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); transition: transform 0.2s;">
                
                <div style="padding: 16px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.05);">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <div style="width: 40px; height: 40px; border-radius: 12px; background: rgba(255,255,255,0.06); display: flex; align-items: center; justify-content: center; font-size: 1.1rem; color: #fff;">
                            <i class="fa-solid fa-money-bill-wave"></i>
                        </div>
                        <div>
                            <div style="font-weight: 700; font-size: 1.1rem; color: #fff;">${s.symbol}</div>
                            <div style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 2px;">${s.name}</div>
                        </div>
                    </div>
                    
                    <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 6px;">
                        <div style="font-size: 0.75rem; color: var(--text-secondary); font-weight: 500;">Son İz: ${s.saleDate}</div>
                        <button style="background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.1); color: #fff; cursor: pointer; padding: 4px 12px; border-radius: 6px; font-size: 0.75rem; display: flex; gap: 5px; align-items: center; transition: background 0.2s;" onclick="openEditSaleModal('${s.symbol}')" onmouseover="this.style.background='rgba(255,255,255,0.15)'" onmouseout="this.style.background='rgba(255,255,255,0.08)'">
                            <i class="fa-solid fa-pen"></i> Düzenle
                        </button>
                    </div>
                </div>

                <div style="padding: 16px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; text-align: center;">
                    <div style="background: rgba(0,0,0,0.25); padding: 12px 6px; border-radius: 14px;">
                        <div style="font-size: 0.65rem; color: var(--text-secondary); margin-bottom: 6px; font-weight: 600; letter-spacing: 0.5px;">TOPLAM SATIŞ</div>
                        <div style="font-weight: 700; color: #fff; font-size: 0.9rem;">${formatNumber(s.saleQty, s.category === 'CRYPTO' ? 4 : 2)} Adet</div>
                    </div>
                    <div style="background: rgba(0,0,0,0.25); padding: 12px 6px; border-radius: 14px;">
                        <div style="font-size: 0.65rem; color: var(--text-secondary); margin-bottom: 6px; font-weight: 600; letter-spacing: 0.5px;">ORTALAMA FİYAT</div>
                        <div style="font-weight: 700; color: #fff; font-size: 0.9rem;">${formatCurrency(s.salePrice)}</div>
                    </div>
                    <div style="background: rgba(${isPos ? '16,185,129' : '239,68,68'}, 0.1); padding: 12px 6px; border-radius: 14px; box-shadow: inset 0 0 0 1px rgba(${isPos ? '16,185,129' : '239,68,68'}, 0.3);">
                        <div style="font-size: 0.65rem; color: ${isPos ? '#10B981' : '#EF4444'}; margin-bottom: 6px; font-weight: 600; letter-spacing: 0.5px;">GERÇEKLEŞEN KÂR</div>
                        <div style="font-weight: 700; color: ${isPos ? '#10B981' : '#EF4444'}; font-size: 0.9rem;">${isPos ? '+' : ''}${formatCurrency(s.realizedPL)}</div>
                        <div style="font-size: 0.7rem; color: ${isPos ? '#10B981' : '#EF4444'}; opacity: 0.8; margin-top: 2px;">(${isPos ? '+' : ''}${formatPercent(s.realizedPLPercent)})</div>
                    </div>
                </div>

                <div style="padding: 14px 16px; background: ${whatIf.type === 'positive' ? 'rgba(16,185,129,0.05)' : 'rgba(239,68,68,0.05)'}; border-top: 1px solid rgba(255,255,255,0.02); display: flex; gap: 14px; align-items: center;">
                    <div style="color: ${whatIf.type === 'positive' ? '#10B981' : '#EF4444'}; font-size: 1.4rem; flex-shrink: 0;">
                        <i class="fa-solid ${whatIf.icon}"></i>
                    </div>
                    <div style="font-size: 0.8rem; color: var(--text-secondary); line-height: 1.5;">
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

    const rankColors = ["rgba(255, 215, 0, 0.9)", "rgba(192, 192, 192, 0.9)", "rgba(205, 127, 50, 0.9)"];
    const rankBgs = ["rgba(255, 215, 0, 0.15)", "rgba(192, 192, 192, 0.15)", "rgba(205, 127, 50, 0.15)"];
    const rankBadges = ["🥇", "🥈", "🥉"];

    // Make the podium wrapper a flex container with spacing
    podiumElem.style.display = "flex";
    podiumElem.style.justifyContent = "center";
    podiumElem.style.gap = "15px";
    podiumElem.style.alignItems = "flex-end";
    podiumElem.style.marginBottom = "30px";
    podiumElem.style.marginTop = "10px";

    podiumElem.innerHTML = top3.map((s, idx) => {
        // First place gets a slightly taller card
        const heightStr = idx === 0 ? "min-height: 140px;" : "min-height: 120px;";
        
        return `
        <div style="flex: 1; max-width: 33%; ${heightStr} background: rgba(30, 30, 45, 0.6); border-radius: 20px; padding: 16px 10px; display: flex; flex-direction: column; align-items: center; justify-content: center; position: relative; box-shadow: 0 8px 32px rgba(0,0,0,0.2), inset 0 0 0 1px ${rankColors[idx]}; transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1); cursor: pointer;" onmouseover="this.style.transform='translateY(-5px)'" onmouseout="this.style.transform='translateY(0)'">
            
            <div style="background: ${rankBgs[idx]}; width: 44px; height: 44px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.4rem; margin-bottom: 12px; border: 1px solid ${rankColors[idx]}; box-shadow: 0 0 15px ${rankBgs[idx]};">
                ${rankBadges[idx]}
            </div>
            
            <h4 style="margin:0; font-size: 1.05rem; color: #fff; text-align: center; font-weight: 800; letter-spacing: 0.5px;">${s.symbol}</h4>
            
            <span style="font-weight: 800; font-size: 1rem; margin-top: 6px; text-shadow: 0 0 10px rgba(16,185,129,0.3);" class="${s.realizedPL >= 0 ? 'txt-neon-green' : 'txt-neon-red'}">
                ${s.realizedPL >= 0 ? '+' : ''}${formatCurrency(s.realizedPL)}
            </span>
            
            <button onclick="shareToStory('${s.symbol}', '${s.name}', ${s.realizedPLPercent})" style="position: absolute; top: 8px; right: 8px; background: rgba(255,255,255,0.1); border: none; width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #fff; cursor: pointer; transition: 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.2)'" onmouseout="this.style.background='rgba(255,255,255,0.1)'" title="Hikayede Paylaş">
                <i class="fa-brands fa-instagram" style="font-size: 0.8rem;"></i>
            </button>
        </div>
    `}).join("");
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

    } catch (e) {
        console.error("Excel oluşturulurken hata:", e);
        alert("Excel oluşturulurken bir hata oluştu.");
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
        let fetchCount = 0;
        let usdTryRate = 38.0; // Default fallback

        // 1. Fetch FX & Gold (Truncgil API - No CORS, Free, Fast)
        try {
            const res = await fetch("https://finans.truncgil.com/today.json");
            const data = await res.json();
            
            if (data["USD"]) {
                usdTryRate = parseFloat(data["USD"].Satış.replace(',', '.'));
                if (appState.marketPrices["USD/TRY"]) {
                    appState.marketPrices["USD/TRY"].price = usdTryRate;
                    fetchCount++;
                }
            }
            if (data["EUR"] && appState.marketPrices["EUR/TRY"]) {
                appState.marketPrices["EUR/TRY"].price = parseFloat(data["EUR"].Satış.replace(',', '.'));
                fetchCount++;
            }
            if (data["Gram Altın"] && appState.marketPrices["ALTIN"]) {
                appState.marketPrices["ALTIN"].price = parseFloat(data["Gram Altın"].Satış.replace(',', '.'));
                fetchCount++;
            }
        } catch(e) { console.warn("FX fetch failed", e); }

        // 2. Fetch Crypto (Binance API - No CORS, Free, Fast)
        try {
            const res = await fetch("https://api.binance.com/api/v3/ticker/price");
            const data = await res.json();
            
            data.forEach(coin => {
                if (coin.symbol.endsWith("USDT")) {
                    const sym = coin.symbol.replace("USDT", "");
                    if (appState.marketPrices[sym] && appState.marketPrices[sym].category === "CRYPTO") {
                        appState.marketPrices[sym].price = parseFloat(coin.price) * usdTryRate;
                        fetchCount++;
                    }
                }
            });
        } catch(e) { console.warn("Crypto fetch failed", e); }

        // 3. Fetch BIST Stocks (Google Sheets Database)
        try {
            // Kullanıcının paylaştığı Google Sheet CSV gviz linki
            const sheetCsvUrl = "https://docs.google.com/spreadsheets/d/11wcKvLgzw6Aaek5nOWP7daGBJbaSXXEqZVE55IciEzY/gviz/tq?tqx=out:csv";
            const res = await fetch(sheetCsvUrl);
            const csvText = await res.text();
            
            // Gelişmiş CSV Parser (Çift tırnak içindeki virgülleri korur)
            const rows = csvText.split('\n');
            rows.forEach(row => {
                let cols = [];
                // Eğer Google Sheets virgüllü sayıları "125,8" gibi çift tırnakla sardıysa
                if (row.includes('","')) {
                    cols = row.split('","');
                } else {
                    cols = row.split(',');
                }

                if (cols.length >= 2) {
                    let sym = cols[0].replace(/"/g, '').trim().toUpperCase(); // "THYAO " -> THYAO
                    let priceStr = cols[1].replace(/"/g, '').trim();
                    if (!sym) return;
                    
                    // Fiyat içindeki virgülleri noktaya çevir (Örn: 125,8 -> 125.8)
                    priceStr = priceStr.replace(/,/g, '.');
                    const price = parseFloat(priceStr);
                    
                    if (!isNaN(price) && appState.marketPrices[sym]) {
                        appState.marketPrices[sym].price = price;
                        fetchCount++;
                    }
                }
            });
        } catch(e) { console.warn("Google Sheets fetch failed", e); }

        if (fetchCount > 0) {
            // Senkronize et: marketPrices güncellendi, şimdi bunları portföydeki (holdings) varlıklara aktar
            appState.holdings.forEach(h => {
                if (appState.marketPrices[h.symbol]) {
                    // Sadece fiyat gerçekten değişmişse önceki kapanışı güncelle
                    if (h.currentPrice !== appState.marketPrices[h.symbol].price) {
                        h.previousClosePrice = h.currentPrice;
                    }
                    h.currentPrice = appState.marketPrices[h.symbol].price;
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
}

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
        document.querySelectorAll('.asset-val, .h-current, .podium-val, .txt-neon-green, .txt-neon-red, .dashboard-card h3').forEach(el => {
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

function openPinModal() {
    document.getElementById("pinModal").style.display = "flex";
    if (appState.pin) {
        document.getElementById("removePinBtn").style.display = "block";
    } else {
        document.getElementById("removePinBtn").style.display = "none";
    }
}

function closePinModal() {
    document.getElementById("pinModal").style.display = "none";
    document.getElementById("newPinInput").value = "";
}

function savePin() {
    const p = document.getElementById("newPinInput").value;
    if (p.length === 4) {
        appState.pin = p;
        saveData();
        closePinModal();
        alert("PIN başarıyla kaydedildi! Bir sonraki girişinizde sorulacaktır.");
    } else {
        alert("Lütfen 4 haneli bir PIN girin.");
    }
}

function removePin() {
    if(confirm("PIN kodunu kaldırmak istediğinize emin misiniz?")) {
        appState.pin = null;
        saveData();
        closePinModal();
        alert("PIN kaldırıldı.");
    }
}

function initPinLock() {
    if (appState.pin) {
        document.getElementById("pinLockOverlay").style.display = "flex";
    }
}

function updatePinDots() {
    const dots = document.querySelectorAll("#pinDots .pin-dot");
    dots.forEach((dot, index) => {
        if (index < enteredPin.length) {
            dot.classList.add("filled");
        } else {
            dot.classList.remove("filled");
        }
    });
}

function pressPin(num) {
    if (enteredPin.length < 4) {
        enteredPin += num.toString();
        updatePinDots();
        
        if (enteredPin.length === 4) {
            setTimeout(verifyPin, 300);
        }
    }
}

function deletePin() {
    if (enteredPin.length > 0) {
        enteredPin = enteredPin.slice(0, -1);
        updatePinDots();
    }
}

function verifyPin() {
    if (enteredPin === appState.pin) {
        // Unlock
        document.getElementById("pinLockOverlay").style.display = "none";
        enteredPin = "";
        updatePinDots();
        renderAll();
    } else {
        // Wrong PIN
        const dotsContainer = document.getElementById("pinDots");
        dotsContainer.style.animation = "shake 0.5s ease";
        setTimeout(() => {
            dotsContainer.style.animation = "";
            enteredPin = "";
            updatePinDots();
        }, 500);
    }
}

// Add shake animation dynamically
const style = document.createElement('style');
style.textContent = `
@keyframes shake {
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(-10px); }
    75% { transform: translateX(10px); }
}`;
document.head.appendChild(style);

// Check PIN on load
document.addEventListener("DOMContentLoaded", () => {
    if (appState.pin) {
        initPinLock();
    }
});

/* ==========================================================================
   Social Media Story Share
   ========================================================================== */
async function shareToStory(symbol, name, percentRaw) {
    if (!window.html2canvas) {
        alert("Paylaşım modülü yükleniyor, lütfen biraz bekleyip tekrar deneyin.");
        return;
    }
    
    // Setup Template
    document.getElementById("storySymbol").innerText = symbol;
    document.getElementById("storyName").innerText = name;
    
    const isPos = percentRaw >= 0;
    const pctStr = (isPos ? '+' : '') + formatPercent(percentRaw);
    const pctElem = document.getElementById("storyPercent");
    pctElem.innerText = pctStr;
    
    // Style dynamically based on profit/loss
    if (isPos) {
        pctElem.style.color = "#10B981";
        pctElem.style.textShadow = "0 0 20px rgba(16, 185, 129, 0.6)";
        pctElem.parentElement.style.background = "rgba(16, 185, 129, 0.1)";
        pctElem.parentElement.style.boxShadow = "inset 0 0 0 2px rgba(16, 185, 129, 0.4)";
    } else {
        pctElem.style.color = "#EF4444";
        pctElem.style.textShadow = "0 0 20px rgba(239, 68, 68, 0.6)";
        pctElem.parentElement.style.background = "rgba(239, 68, 68, 0.1)";
        pctElem.parentElement.style.boxShadow = "inset 0 0 0 2px rgba(239, 68, 68, 0.4)";
    }

    const template = document.getElementById("storyShareTemplate");
    
    try {
        const canvas = await html2canvas(template, {
            scale: 2, // High quality
            backgroundColor: "#020305",
            logging: false
        });
        
        // Convert to image and trigger download
        const link = document.createElement('a');
        link.download = `Portfoyum_${symbol}_Story.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
        
    } catch (err) {
        console.error("Story oluşturulamadı:", err);
        alert("Görsel oluşturulurken bir hata oluştu.");
    }
}

/* ==========================================================================
   News & KAP Radar
   ========================================================================== */
async function fetchNews() {
    const container = document.getElementById("newsList");
    if (!container) return;
    
    // Sadece bir kere yükle
    if (container.children.length > 1 || (container.children[0] && !container.children[0].classList.contains('empty-state'))) {
        return;
    }

    try {
        // Fetch from a public RSS feed converted to JSON via rss2json
        const rssUrl = "https://www.trthaber.com/ekonomi_articles.rss";
        const apiUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}`;
        
        const res = await fetch(apiUrl);
        const data = await res.json();
        
        if (data.status === 'ok' && data.items) {
            // Get user's current holdings symbols to highlight relevant news
            const mySymbols = appState.holdings.map(h => h.symbol.toLowerCase());
            
            const html = data.items.map(item => {
                const titleLower = item.title.toLowerCase();
                let isRelevant = false;
                
                // Check if any holding symbol is mentioned in the title
                for (let sym of mySymbols) {
                    if (titleLower.includes(sym)) {
                        isRelevant = true;
                        break;
                    }
                }
                
                const pubDate = new Date(item.pubDate).toLocaleDateString('tr-TR', { hour: '2-digit', minute: '2-digit' });
                
                return `
                    <a href="${item.link}" target="_blank" class="news-item ${isRelevant ? 'highlight' : ''}">
                        ${isRelevant ? '<div class="news-tag"><i class="fa-solid fa-bullseye"></i> Portföyünüzle İlgili</div>' : ''}
                        <div class="news-title">${item.title}</div>
                        <div class="news-meta">
                            <span>TRT Haber Ekonomi</span>
                            <span>${pubDate}</span>
                        </div>
                    </a>
                `;
            }).join('');
            
            container.innerHTML = html;
        } else {
            container.innerHTML = `<div class="empty-state"><p>Haberler yüklenemedi.</p></div>`;
        }
    } catch (err) {
        console.error("News fetch error:", err);
        container.innerHTML = `<div class="empty-state"><p>Bağlantı hatası.</p></div>`;
    }
}
