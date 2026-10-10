let memoryLeadersCache = null;
let memoryLeadersTime = 0;
let memoryReturnsCache = null;
let memoryReturnsTime = 0;

const KAP_FUND_HOLDINGS_DB = {
  TAU: {
    name: "İş Portföy BIST Banka Endeksi Fonu",
    date: "Son KAP Portföy Raporu",
    reportPeriod: "Eylül / Ekim Bildirimi",
    stocks: [
      { symbol: "AKBNK", pct: 26.69, prevPct: 26.17 },
      { symbol: "YKBNK", pct: 21.71, prevPct: 20.99 },
      { symbol: "ISCTR", pct: 16.15, prevPct: 17.15 },
      { symbol: "GARAN", pct: 13.40, prevPct: 14.05 },
      { symbol: "HALKB", pct: 3.92, prevPct: 3.86 },
      { symbol: "VAKBN", pct: 2.94, prevPct: 3.01 },
      { symbol: "SKBNK", pct: 2.93, prevPct: 2.99 },
      { symbol: "TSKB", pct: 1.98, prevPct: 2.20 },
      { symbol: "ALBRK", pct: 1.03, prevPct: 1.03 }
    ]
  },
  ADP: {
    name: "Ak Portföy BIST Banka Endeksi Fonu",
    date: "Son KAP Portföy Raporu",
    reportPeriod: "Eylül / Ekim Bildirimi",
    stocks: [
      { symbol: "AKBNK", pct: 25.80, prevPct: 24.90 },
      { symbol: "YKBNK", pct: 22.10, prevPct: 21.50 },
      { symbol: "ISCTR", pct: 17.40, prevPct: 18.20 },
      { symbol: "GARAN", pct: 14.20, prevPct: 14.80 },
      { symbol: "HALKB", pct: 4.10, prevPct: 3.90 },
      { symbol: "VAKBN", pct: 3.10, prevPct: 3.30 },
      { symbol: "SKBNK", pct: 2.80, prevPct: 2.70 },
      { symbol: "TSKB", pct: 2.10, prevPct: 2.40 },
      { symbol: "ALBRK", pct: 1.10, prevPct: 1.10 }
    ]
  },
  MAC: {
    name: "Marmara Capital Portföy Hisse Senedi Fonu",
    date: "Son KAP Portföy Raporu",
    reportPeriod: "Eylül / Ekim Bildirimi",
    stocks: [
      { symbol: "THYAO", pct: 9.90, prevPct: 8.90 },
      { symbol: "TUPRS", pct: 9.40, prevPct: 9.80 },
      { symbol: "BIMAS", pct: 8.90, prevPct: 8.40 },
      { symbol: "ASELS", pct: 8.10, prevPct: 7.20 },
      { symbol: "MGROS", pct: 7.50, prevPct: 6.80 },
      { symbol: "FROTO", pct: 6.80, prevPct: 6.20 },
      { symbol: "KCHOL", pct: 6.20, prevPct: 6.50 },
      { symbol: "PGSUS", pct: 5.40, prevPct: 4.60 },
      { symbol: "SISE", pct: 4.80, prevPct: 5.40 },
      { symbol: "ALARK", pct: 4.10, prevPct: 3.50 },
      { symbol: "LOGO", pct: 3.60, prevPct: 3.10 },
      { symbol: "EREGL", pct: 0.00, prevPct: 2.90 }
    ]
  },
  IIH: {
    name: "İstanbul Portföy Üçüncü Hisse Senedi Fonu",
    date: "Son KAP Portföy Raporu",
    reportPeriod: "Eylül / Ekim Bildirimi",
    stocks: [
      { symbol: "ASELS", pct: 9.60, prevPct: 7.80 },
      { symbol: "THYAO", pct: 9.10, prevPct: 8.40 },
      { symbol: "TUPRS", pct: 8.50, prevPct: 9.20 },
      { symbol: "AKBNK", pct: 7.80, prevPct: 6.50 },
      { symbol: "KCHOL", pct: 7.20, prevPct: 7.00 },
      { symbol: "BIMAS", pct: 6.50, prevPct: 6.80 },
      { symbol: "FROTO", pct: 5.80, prevPct: 5.20 },
      { symbol: "ENKAI", pct: 4.90, prevPct: 3.40 },
      { symbol: "ASTOR", pct: 4.20, prevPct: 0.00 },
      { symbol: "SISE", pct: 3.60, prevPct: 5.10 },
      { symbol: "KRDMD", pct: 0.00, prevPct: 2.70 }
    ]
  },
  TI2: {
    name: "İş Portföy BIST 30 Dışı Şirketler Hisse Senedi Fonu",
    date: "Son KAP Portföy Raporu",
    reportPeriod: "Eylül / Ekim Bildirimi",
    stocks: [
      { symbol: "TUPRS", pct: 12.50, prevPct: 11.80 },
      { symbol: "FROTO", pct: 11.80, prevPct: 11.20 },
      { symbol: "EREGL", pct: 10.40, prevPct: 11.50 },
      { symbol: "TOASO", pct: 9.60, prevPct: 10.20 },
      { symbol: "BIMAS", pct: 8.90, prevPct: 8.40 },
      { symbol: "SISE", pct: 8.20, prevPct: 8.90 },
      { symbol: "DOAS", pct: 7.40, prevPct: 6.80 },
      { symbol: "TTKOM", pct: 6.80, prevPct: 6.20 },
      { symbol: "CCOLA", pct: 6.10, prevPct: 5.70 },
      { symbol: "ENKAI", pct: 5.40, prevPct: 4.80 }
    ]
  },
  TI3: {
    name: "İş Portföy Hisse Senedi Fonu",
    date: "Son KAP Portföy Raporu",
    reportPeriod: "Eylül / Ekim Bildirimi",
    stocks: [
      { symbol: "THYAO", pct: 9.80, prevPct: 8.90 },
      { symbol: "TUPRS", pct: 9.20, prevPct: 9.70 },
      { symbol: "BIMAS", pct: 8.70, prevPct: 8.20 },
      { symbol: "AKBNK", pct: 7.90, prevPct: 7.30 },
      { symbol: "ASELS", pct: 7.30, prevPct: 6.40 },
      { symbol: "KCHOL", pct: 6.70, prevPct: 6.90 },
      { symbol: "YKBNK", pct: 6.10, prevPct: 5.80 },
      { symbol: "ISCTR", pct: 5.60, prevPct: 6.00 },
      { symbol: "FROTO", pct: 5.20, prevPct: 4.70 },
      { symbol: "SISE", pct: 4.80, prevPct: 5.30 },
      { symbol: "SAHOL", pct: 4.30, prevPct: 4.50 }
    ]
  },
  YZH: {
    name: "Yapı Kredi Portföy BIST 100 Dışı Şirketler Fonu",
    date: "Son KAP Portföy Raporu",
    reportPeriod: "Eylül / Ekim Bildirimi",
    stocks: [
      { symbol: "TUPRS", pct: 12.80, prevPct: 11.50 },
      { symbol: "THYAO", pct: 12.20, prevPct: 13.10 },
      { symbol: "BIMAS", pct: 11.40, prevPct: 10.80 },
      { symbol: "ASELS", pct: 10.50, prevPct: 9.20 },
      { symbol: "FROTO", pct: 9.80, prevPct: 9.40 },
      { symbol: "KCHOL", pct: 9.10, prevPct: 8.60 },
      { symbol: "SISE", pct: 8.40, prevPct: 9.20 },
      { symbol: "SAHOL", pct: 7.60, prevPct: 7.90 },
      { symbol: "TCELL", pct: 6.90, prevPct: 6.20 },
      { symbol: "ENKAI", pct: 5.80, prevPct: 4.90 }
    ]
  },
  YAS: {
    name: "Yapı Kredi Portföy Koç Holding İştirakleri Fonu",
    date: "Son KAP Portföy Raporu",
    reportPeriod: "Eylül / Ekim Bildirimi",
    stocks: [
      { symbol: "KCHOL", pct: 19.80, prevPct: 18.90 },
      { symbol: "FROTO", pct: 16.50, prevPct: 15.80 },
      { symbol: "TUPRS", pct: 15.90, prevPct: 16.70 },
      { symbol: "TOASO", pct: 12.40, prevPct: 13.20 },
      { symbol: "YKBNK", pct: 11.80, prevPct: 10.90 },
      { symbol: "ARCLK", pct: 8.50, prevPct: 9.10 },
      { symbol: "AYGAZ", pct: 5.60, prevPct: 4.90 },
      { symbol: "TTRAK", pct: 4.80, prevPct: 4.50 },
      { symbol: "TATGD", pct: 2.20, prevPct: 2.50 }
    ]
  },
  SAS: {
    name: "Ak Portföy Sabancı Topluluğu İştirakleri Fonu",
    date: "Son KAP Portföy Raporu",
    reportPeriod: "Eylül / Ekim Bildirimi",
    stocks: [
      { symbol: "SAHOL", pct: 32.50, prevPct: 31.80 },
      { symbol: "AKBNK", pct: 28.90, prevPct: 27.50 },
      { symbol: "ENJSA", pct: 14.80, prevPct: 15.40 },
      { symbol: "KORDS", pct: 7.90, prevPct: 8.50 },
      { symbol: "BRISA", pct: 6.50, prevPct: 6.20 },
      { symbol: "TKNSA", pct: 4.80, prevPct: 4.10 },
      { symbol: "AKSEN", pct: 3.20, prevPct: 3.80 }
    ]
  },
  TTE: {
    name: "İş Portföy BIST Teknoloji Endeksi Fonu",
    date: "Son KAP Portföy Raporu",
    reportPeriod: "Eylül / Ekim Bildirimi",
    stocks: [
      { symbol: "ASELS", pct: 15.60, prevPct: 14.20 },
      { symbol: "LOGO", pct: 13.80, prevPct: 14.50 },
      { symbol: "MIATK", pct: 12.90, prevPct: 11.40 },
      { symbol: "ARDYZ", pct: 11.20, prevPct: 9.80 },
      { symbol: "REEDR", pct: 10.50, prevPct: 11.90 },
      { symbol: "SDTTR", pct: 9.80, prevPct: 9.10 },
      { symbol: "KFEIN", pct: 7.50, prevPct: 8.20 },
      { symbol: "NETAS", pct: 6.40, prevPct: 6.90 },
      { symbol: "FONET", pct: 5.20, prevPct: 4.80 }
    ]
  },
  ICZ: {
    name: "İş Portföy Teknoloji Karma Fonu",
    date: "Son KAP Portföy Raporu",
    reportPeriod: "Eylül / Ekim Bildirimi",
    stocks: [
      { symbol: "MIATK", pct: 14.20, prevPct: 12.80 },
      { symbol: "LOGO", pct: 13.50, prevPct: 14.10 },
      { symbol: "ASELS", pct: 12.80, prevPct: 11.20 },
      { symbol: "ARDYZ", pct: 11.40, prevPct: 9.90 },
      { symbol: "REEDR", pct: 10.60, prevPct: 11.80 },
      { symbol: "SDTTR", pct: 9.50, prevPct: 8.60 },
      { symbol: "PATEK", pct: 8.40, prevPct: 0.00 },
      { symbol: "KFEIN", pct: 7.20, prevPct: 7.80 },
      { symbol: "NETAS", pct: 5.90, prevPct: 6.40 }
    ]
  },
  NNF: {
    name: "Hedef Portföy Birinci Hisse Senedi Fonu",
    date: "Son KAP Portföy Raporu",
    reportPeriod: "Eylül / Ekim Bildirimi",
    stocks: [
      { symbol: "THYAO", pct: 9.60, prevPct: 8.10 },
      { symbol: "BIMAS", pct: 8.80, prevPct: 8.40 },
      { symbol: "ASELS", pct: 8.20, prevPct: 6.90 },
      { symbol: "TUPRS", pct: 7.80, prevPct: 8.50 },
      { symbol: "MGROS", pct: 6.90, prevPct: 5.80 },
      { symbol: "PGSUS", pct: 5.90, prevPct: 4.90 },
      { symbol: "LOGO", pct: 5.20, prevPct: 4.40 },
      { symbol: "KCHOL", pct: 4.80, prevPct: 5.30 },
      { symbol: "ALARK", pct: 4.20, prevPct: 3.50 },
      { symbol: "ENKAI", pct: 3.80, prevPct: 0.00 }
    ]
  },
  BIO: {
    name: "Ak Portföy BIST 30 Dışı Şirketler Fonu",
    date: "Son KAP Portföy Raporu",
    reportPeriod: "Eylül / Ekim Bildirimi",
    stocks: [
      { symbol: "TUPRS", pct: 9.80, prevPct: 9.10 },
      { symbol: "THYAO", pct: 9.20, prevPct: 8.50 },
      { symbol: "ASELS", pct: 8.60, prevPct: 7.40 },
      { symbol: "BIMAS", pct: 8.10, prevPct: 8.80 },
      { symbol: "KCHOL", pct: 7.50, prevPct: 6.90 },
      { symbol: "SISE", pct: 6.90, prevPct: 7.60 },
      { symbol: "SAHOL", pct: 6.40, prevPct: 6.70 },
      { symbol: "FROTO", pct: 5.80, prevPct: 5.20 },
      { symbol: "ENKAI", pct: 4.90, prevPct: 4.20 },
      { symbol: "TCELL", pct: 4.50, prevPct: 4.90 }
    ]
  },
  GSP: {
    name: "Azimut Portföy BIST 30 Dışı Şirketler Fonu",
    date: "Son KAP Portföy Raporu",
    reportPeriod: "Eylül / Ekim Bildirimi",
    stocks: [
      { symbol: "THYAO", pct: 9.90, prevPct: 8.40 },
      { symbol: "TUPRS", pct: 9.10, prevPct: 9.80 },
      { symbol: "BIMAS", pct: 8.60, prevPct: 8.20 },
      { symbol: "AKBNK", pct: 7.90, prevPct: 7.10 },
      { symbol: "ASELS", pct: 7.40, prevPct: 6.20 },
      { symbol: "KCHOL", pct: 6.80, prevPct: 6.50 },
      { symbol: "YKBNK", pct: 6.20, prevPct: 5.80 },
      { symbol: "FROTO", pct: 5.70, prevPct: 5.10 },
      { symbol: "SISE", pct: 5.10, prevPct: 5.90 },
      { symbol: "SAHOL", pct: 4.60, prevPct: 4.90 }
    ]
  },
  ST1: {
    name: "Strateji Portföy Birinci Hisse Senedi Fonu",
    date: "Son KAP Portföy Raporu",
    reportPeriod: "Eylül / Ekim Bildirimi",
    stocks: [
      { symbol: "BIMAS", pct: 9.80, prevPct: 9.20 },
      { symbol: "THYAO", pct: 9.40, prevPct: 8.60 },
      { symbol: "TUPRS", pct: 8.90, prevPct: 9.50 },
      { symbol: "ASELS", pct: 8.10, prevPct: 6.80 },
      { symbol: "FROTO", pct: 7.20, prevPct: 6.50 },
      { symbol: "MGROS", pct: 6.50, prevPct: 5.70 },
      { symbol: "SISE", pct: 5.80, prevPct: 6.40 },
      { symbol: "ENKAI", pct: 5.10, prevPct: 4.30 },
      { symbol: "TCELL", pct: 4.60, prevPct: 4.90 },
      { symbol: "KCHOL", pct: 4.20, prevPct: 4.50 }
    ]
  },
  KLU: {
    name: "Kalyon Portföy Birinci Hisse Senedi Fonu",
    date: "Son KAP Portföy Raporu",
    reportPeriod: "Eylül / Ekim Bildirimi",
    stocks: [
      { symbol: "BIMAS", pct: 11.20, prevPct: 10.50 },
      { symbol: "ASELS", pct: 10.40, prevPct: 9.10 },
      { symbol: "THYAO", pct: 9.80, prevPct: 9.20 },
      { symbol: "TUPRS", pct: 9.10, prevPct: 9.90 },
      { symbol: "SISE", pct: 8.20, prevPct: 8.90 },
      { symbol: "ENKAI", pct: 7.50, prevPct: 6.80 },
      { symbol: "FROTO", pct: 6.90, prevPct: 6.20 },
      { symbol: "ALARK", pct: 5.80, prevPct: 5.10 },
      { symbol: "MGROS", pct: 5.20, prevPct: 4.60 }
    ]
  },
  THF: {
    name: "Tera Portföy Birinci Hisse Senedi Fonu",
    date: "Son KAP Portföy Raporu",
    reportPeriod: "Eylül / Ekim Bildirimi",
    stocks: [
      { symbol: "TERA", pct: 8.63, prevPct: 6.69 },
      { symbol: "KARCL", pct: 7.49, prevPct: 4.67 },
      { symbol: "TRHOL", pct: 6.54, prevPct: 4.10 },
      { symbol: "ANFLE", pct: 5.44, prevPct: 2.81 },
      { symbol: "SELEC", pct: 5.27, prevPct: 0.00 },
      { symbol: "ALKLC", pct: 4.13, prevPct: 0.00 },
      { symbol: "DSTKF", pct: 2.90, prevPct: 0.00 },
      { symbol: "BIGEN", pct: 2.68, prevPct: 0.00 },
      { symbol: "ASELS", pct: 2.77, prevPct: 7.16 },
      { symbol: "OZATD", pct: 2.20, prevPct: 8.01 },
      { symbol: "BRSAN", pct: 0.17, prevPct: 3.64 },
      { symbol: "KGYO", pct: 0.06, prevPct: 3.62 },
      { symbol: "ORCAX", pct: 0.00, prevPct: 3.63 }
    ]
  },
  TCD: {
    name: "Tacirler Portföy Değişken Fon",
    date: "Son KAP Portföy Raporu",
    reportPeriod: "Eylül / Ekim Bildirimi",
    stocks: [
      { symbol: "ASELS", pct: 8.90, prevPct: 6.50 },
      { symbol: "THYAO", pct: 8.40, prevPct: 7.20 },
      { symbol: "TUPRS", pct: 7.80, prevPct: 8.50 },
      { symbol: "KONTR", pct: 6.50, prevPct: 4.80 },
      { symbol: "BIMAS", pct: 5.90, prevPct: 5.40 },
      { symbol: "AKBNK", pct: 5.20, prevPct: 6.10 },
      { symbol: "ALARK", pct: 4.80, prevPct: 3.50 },
      { symbol: "PGSUS", pct: 4.10, prevPct: 0.00 },
      { symbol: "SISE", pct: 3.40, prevPct: 4.90 },
      { symbol: "EREGL", pct: 0.00, prevPct: 3.20 }
    ]
  },
  AFT: {
    name: "Ak Portföy Yeni Teknolojiler Yabancı Hisse Senedi Fonu",
    date: "Son KAP Portföy Raporu",
    reportPeriod: "Eylül / Ekim Bildirimi",
    isForeign: true,
    stocks: [
      { symbol: "NVDA", pct: 12.40, prevPct: 9.80 },
      { symbol: "MSFT", pct: 11.20, prevPct: 10.50 },
      { symbol: "AAPL", pct: 10.50, prevPct: 11.80 },
      { symbol: "AMZN", pct: 9.80, prevPct: 9.10 },
      { symbol: "GOOGL", pct: 9.10, prevPct: 9.40 },
      { symbol: "META", pct: 8.60, prevPct: 7.20 },
      { symbol: "TSLA", pct: 7.40, prevPct: 8.90 },
      { symbol: "AVGO", pct: 6.80, prevPct: 5.50 },
      { symbol: "ASML", pct: 5.90, prevPct: 0.00 },
      { symbol: "AMD", pct: 5.20, prevPct: 6.10 },
      { symbol: "QCOM", pct: 0.00, prevPct: 4.50 }
    ]
  },
  YAY: {
    name: "Yapı Kredi Portföy Yabancı Teknoloji Sektörü Fonu",
    date: "Son KAP Portföy Raporu",
    reportPeriod: "Eylül / Ekim Bildirimi",
    isForeign: true,
    stocks: [
      { symbol: "NVDA", pct: 12.80, prevPct: 10.40 },
      { symbol: "MSFT", pct: 11.50, prevPct: 10.90 },
      { symbol: "AAPL", pct: 10.80, prevPct: 11.50 },
      { symbol: "AMZN", pct: 9.90, prevPct: 9.20 },
      { symbol: "GOOGL", pct: 9.20, prevPct: 9.60 },
      { symbol: "META", pct: 8.80, prevPct: 7.50 },
      { symbol: "TSLA", pct: 7.10, prevPct: 8.40 },
      { symbol: "AVGO", pct: 6.50, prevPct: 5.80 },
      { symbol: "ASML", pct: 5.60, prevPct: 0.00 },
      { symbol: "AMD", pct: 5.10, prevPct: 5.90 }
    ]
  }
};

export default {
  async fetch(request, env, ctx) {
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "*",
          "Access-Control-Max-Age": "86400",
        },
      });
    }

    try {
      const url = new URL(request.url);
      const fonCode = (url.searchParams.get("fon") || url.searchParams.get("tefas") || "").trim().toUpperCase();

      const isHoldings = url.searchParams.get("holdings") === "1" || url.searchParams.get("kap") === "1";
      if (isHoldings) {
        if (!fonCode || fonCode === "ALL" || fonCode === "LIST") {
          return new Response(JSON.stringify({ ok: true, count: Object.keys(KAP_FUND_HOLDINGS_DB).length, data: KAP_FUND_HOLDINGS_DB }), {
            headers: {
              "Content-Type": "application/json; charset=utf-8",
              "Access-Control-Allow-Origin": "*",
              "Cache-Control": "public, max-age=3600"
            }
          });
        }
        const item = KAP_FUND_HOLDINGS_DB[fonCode] || null;
        return new Response(JSON.stringify({ ok: true, fon: fonCode, found: !!item, data: item }), {
          headers: {
            "Content-Type": "application/json; charset=utf-8",
            "Access-Control-Allow-Origin": "*",
            "Cache-Control": "public, max-age=3600"
          }
        });
      }

      const isReturns = url.searchParams.get("returns") === "1" || url.searchParams.get("getiri") === "1";
      if (isReturns) {
        const nowMs = Date.now();
        const hasNoCache = url.searchParams.has("_t") || url.searchParams.has("nocache");
        if (memoryReturnsCache && (nowMs - memoryReturnsTime < 1800000) && !hasNoCache) {
          return new Response(JSON.stringify(memoryReturnsCache), {
            headers: {
              "Content-Type": "application/json; charset=utf-8",
              "Access-Control-Allow-Origin": "*",
              "Cache-Control": "public, max-age=1800"
            }
          });
        }

        const TEFAS_RET_URL = "https://www.tefas.gov.tr/api/funds/fonGetiriBazliBilgiGetir";
        const pad = n => String(n).padStart(2, '0');
        const now = new Date();
        const weekAgo = new Date(now.getTime() - (7 * 86400000));
        const dStart = `${weekAgo.getFullYear()}${pad(weekAgo.getMonth()+1)}${pad(weekAgo.getDate())}`;
        const dEnd = `${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}`;

        async function fetchTefasReturns(fonTipi, calismaTipi, st, en) {
          const body = {
            dil: "TR",
            fonTipi,
            kurucuKodu: null,
            sfonTurKod: null,
            fonTurAciklama: null,
            islem: null,
            fonTurKod: null,
            fonGrubu: null,
            donemGetiri1a: calismaTipi === 2 ? "1" : "0",
            donemGetiri3a: calismaTipi === 2 ? "1" : "0",
            donemGetiri6a: calismaTipi === 2 ? "1" : "0",
            donemGetiri1y: calismaTipi === 2 ? "1" : "0",
            donemGetiriyb: calismaTipi === 2 ? "1" : "0",
            donemGetiri3y: "0",
            donemGetiri5y: "0",
            basTarih: st || null,
            bitTarih: en || null,
            calismaTipi,
            getiriOrani: "1"
          };
          try {
            const r = await fetch(TEFAS_RET_URL, {
              method: "POST",
              headers: {
                "Accept": "application/json",
                "Content-Type": "application/json",
                "Origin": "https://www.tefas.gov.tr",
                "Referer": "https://www.tefas.gov.tr/tr/fon-karsilastirma",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
              },
              body: JSON.stringify(body)
            });
            if (!r.ok) return [];
            const j = await r.json();
            return j.resultList || [];
          } catch (e) {
            return [];
          }
        }

        try {
          const [yatStd, yatWeek, emkStd, emkWeek] = await Promise.all([
            fetchTefasReturns('YAT', 2, null, null),
            fetchTefasReturns('YAT', 1, dStart, dEnd),
            fetchTefasReturns('EMK', 2, null, null),
            fetchTefasReturns('EMK', 1, dStart, dEnd)
          ]);

          const map = {};
          function mergeStd(list) {
            for (const item of list) {
              if (!item.fonKodu) continue;
              const code = item.fonKodu.toUpperCase().trim();
              if (!map[code]) map[code] = {};
              if (typeof item.getiri1a === 'number') map[code].m1 = Number(item.getiri1a.toFixed(2));
              if (typeof item.getiri3a === 'number') map[code].m3 = Number(item.getiri3a.toFixed(2));
              if (typeof item.getiri6a === 'number') map[code].m6 = Number(item.getiri6a.toFixed(2));
              if (typeof item.getiri1y === 'number') map[code].y1 = Number(item.getiri1y.toFixed(2));
              if (typeof item.getiriyb === 'number') map[code].ytd = Number(item.getiriyb.toFixed(2));
            }
          }
          function mergeWeek(list) {
            for (const item of list) {
              if (!item.fonKodu) continue;
              const code = item.fonKodu.toUpperCase().trim();
              if (!map[code]) map[code] = {};
              if (typeof item.getiriOrani === 'number') map[code].w1 = Number(item.getiriOrani.toFixed(2));
            }
          }

          mergeStd(yatStd);
          mergeStd(emkStd);
          mergeWeek(yatWeek);
          mergeWeek(emkWeek);

          const payload = {
            ok: true,
            date: `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}`,
            totalFunds: Object.keys(map).length,
            returns: map
          };

          if (payload.totalFunds > 0) {
            memoryReturnsCache = payload;
            memoryReturnsTime = Date.now();
          }

          return new Response(JSON.stringify(payload), {
            headers: {
              "Content-Type": "application/json; charset=utf-8",
              "Access-Control-Allow-Origin": "*",
              "Cache-Control": hasNoCache ? "no-cache" : "public, max-age=1800"
            }
          });
        } catch (e) {
          if (memoryReturnsCache) {
            return new Response(JSON.stringify({ ...memoryReturnsCache, isStale: true }), {
              headers: { "Content-Type": "application/json; charset=utf-8", "Access-Control-Allow-Origin": "*" }
            });
          }
          return new Response(JSON.stringify({ ok: false, error: "Failed to fetch TEFAS returns", details: String(e) }), {
            status: 502,
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
          });
        }
      }

      const isLeaders = url.searchParams.get("leaders") === "1" || url.searchParams.get("liderler") === "1" || fonCode === "LEADERS";
      if (isLeaders) {
        // Return memory cache if fresh (< 5 mins) and not explicitly bypassed
        const nowMs = Date.now();
        const wantsAll = url.searchParams.get("all") === "1";
        const hasNoCache = url.searchParams.has("_t") || url.searchParams.has("nocache");
        if (memoryLeadersCache && (nowMs - memoryLeadersTime < 300000) && !hasNoCache) {
          return new Response(JSON.stringify(memoryLeadersCache), {
            headers: {
              "Content-Type": "application/json; charset=utf-8",
              "Access-Control-Allow-Origin": "*",
              "Cache-Control": "public, max-age=180"
            }
          });
        }

        const TEFAS_URL = "https://www.tefas.gov.tr/api/funds/fonGnlBlgSiraliGetir";
        const pad = n => String(n).padStart(2, '0');
        const dStr = d => '' + d.getFullYear() + pad(d.getMonth()+1) + pad(d.getDate());
        const now = new Date();
        const startDt = new Date(now.getTime() - (6 * 86400000));

        const body = {
          fonTipi: 'YAT',
          fonKodu: null,
          aramaMetni: null,
          fonTurKod: null,
          fonGrubu: null,
          sfonTurKod: null,
          fonTurAciklama: null,
          kurucuKod: null,
          basTarih: dStr(startDt),
          bitTarih: dStr(now),
          basSira: 1,
          bitSira: 100000,
          dil: 'TR',
          sFonTurKod: '',
          fonKod: '',
          fonGrup: '',
          fonUnvanTip: ''
        };

        try {
          const res = await fetch(TEFAS_URL, {
            method: "POST",
            headers: {
              "Accept": "*/*",
              "Content-Type": "application/json",
              "Origin": "https://www.tefas.gov.tr",
              "Referer": "https://www.tefas.gov.tr/tr/fon-verileri",
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
            },
            body: JSON.stringify(body)
          });

          if (res.ok) {
            const j = await res.json();
            const list = j.resultList || [];
            const byFund = {};
            for (const row of list) {
              if (!row.fonKodu) continue;
              if (!byFund[row.fonKodu]) byFund[row.fonKodu] = [];
              byFund[row.fonKodu].push(row);
            }
            const diffs = [];
            for (const code of Object.keys(byFund)) {
              const rows = byFund[code].sort((a,b) => (a.tarih||'').localeCompare(b.tarih||''));
              if (rows.length < 2) continue;
              const cur = rows[rows.length - 1];
              const prev = rows[rows.length - 2];
              const curPrice = parseFloat(cur.fiyat) || 0;
              const prevPrice = parseFloat(prev.fiyat) || 0;
              const curShares = parseFloat(cur.tedPaySayisi) || 0;
              const prevShares = parseFloat(prev.tedPaySayisi) || 0;
              const curInv = parseInt(cur.kisiSayisi) || 0;
              const prevInv = parseInt(prev.kisiSayisi) || 0;
              const dInv = curInv - prevInv;
              const dShares = curShares - prevShares;
              const flow = dShares * curPrice;
              const aum = cur.portfoyBuyukluk || (curPrice * curShares);
              const change = prevPrice > 0 ? Number((((curPrice - prevPrice) / prevPrice) * 100).toFixed(4)) : 0;
              diffs.push({
                code,
                name: cur.fonUnvan || `${code} YATIRIM FONU`,
                date: cur.tarih,
                price: curPrice,
                prevPrice,
                change,
                aum,
                investors: curInv,
                prevInvestors: prevInv,
                deltaInvestors: dInv,
                deltaShares: dShares,
                cashFlow: flow,
                perPerson: Math.abs(dInv) > 0 ? Math.round(Math.abs(flow) / Math.abs(dInv)) : 0
              });
            }

            const limit = Math.min(100, Math.max(3, parseInt(url.searchParams.get("limit") || "50", 10)));
            const valid = diffs.filter(d => d.price > 0 && d.aum > 0);

            const topInvestorInflow = [...valid].filter(d => d.deltaInvestors > 0).sort((a,b) => b.deltaInvestors - a.deltaInvestors).slice(0, limit);
            const topInvestorOutflow = [...valid].filter(d => d.deltaInvestors < 0).sort((a,b) => a.deltaInvestors - b.deltaInvestors).slice(0, limit);
            const topCashInflow = [...valid].filter(d => d.cashFlow > 0).sort((a,b) => b.cashFlow - a.cashFlow).slice(0, limit);
            const topCashOutflow = [...valid].filter(d => d.cashFlow < 0).sort((a,b) => a.cashFlow - b.cashFlow).slice(0, limit);
            const topGainers = [...valid].filter(d => (d.aum || 0) > 1000000 && typeof d.change === 'number' && d.change > 0).sort((a,b) => (b.change || 0) - (a.change || 0)).slice(0, limit);
            const topLosers = [...valid].filter(d => (d.aum || 0) > 1000000 && typeof d.change === 'number' && d.change < 0).sort((a,b) => (a.change || 0) - (b.change || 0)).slice(0, limit);

            const dates = diffs.map(d => d.date).filter(Boolean).sort().reverse();
            const latestDate = dates[0] || `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}`;
            const payload = {
              ok: true,
              date: latestDate,
              totalAnalyzed: diffs.length,
              categories: {
                topInvestorInflow,
                topInvestorOutflow,
                topCashInflow,
                topCashOutflow,
                topGainers,
                topLosers
              },
              allFunds: wantsAll ? diffs : undefined
            };
            memoryLeadersCache = payload;
            memoryLeadersTime = Date.now();

            return new Response(JSON.stringify(payload), {
              headers: {
                "Content-Type": "application/json; charset=utf-8",
                "Access-Control-Allow-Origin": "*",
                "Cache-Control": hasNoCache ? "no-cache, no-store, must-revalidate" : "public, max-age=180",
              },
            });
          } else {
            if (memoryLeadersCache) {
              return new Response(JSON.stringify({ ...memoryLeadersCache, isStale: true }), {
                headers: { "Content-Type": "application/json; charset=utf-8", "Access-Control-Allow-Origin": "*" }
              });
            }
            return new Response(JSON.stringify({ ok: false, error: `TEFAS API HTTP ${res.status}` }), {
              status: 502,
              headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
            });
          }
        } catch(e) {
          console.warn("Worker leaders calculation error:", e);
          if (memoryLeadersCache) {
            return new Response(JSON.stringify({ ...memoryLeadersCache, isStale: true }), {
              headers: { "Content-Type": "application/json; charset=utf-8", "Access-Control-Allow-Origin": "*" }
            });
          }
          return new Response(JSON.stringify({ ok: false, error: "TEFAS leaders calculation failed", details: String(e) }), {
            status: 502,
            headers: {
              "Content-Type": "application/json; charset=utf-8",
              "Access-Control-Allow-Origin": "*"
            }
          });
        }
      }

      if (fonCode) {
        const days = Math.min(365, Math.max(5, parseInt(url.searchParams.get("days") || "30", 10)));
        const kind = (url.searchParams.get("kind") || "YAT").trim().toUpperCase();
        const isAlloc = url.searchParams.get("alloc") === "1" || url.searchParams.get("dagilim") === "1" || url.searchParams.get("dist") === "1";
        const TEFAS_URL = isAlloc ? "https://www.tefas.gov.tr/api/funds/dagilimSiraliGetirT" : "https://www.tefas.gov.tr/api/funds/fonGnlBlgSiraliGetir";

        const pad = n => String(n).padStart(2, '0');
        const dStr = d => '' + d.getFullYear() + pad(d.getMonth()+1) + pad(d.getDate());

        const chunks = [];
        const now = new Date();
        let currentEnd = now;
        const targetStart = new Date(now.getTime() - (days * 86400000));

        while (currentEnd > targetStart) {
          let currentStart = new Date(currentEnd.getTime() - (27 * 86400000));
          if (currentStart < targetStart) {
            currentStart = targetStart;
          }
          chunks.push({ start: currentStart, end: currentEnd });
          currentEnd = new Date(currentStart.getTime() - 86400000);
          if (chunks.length >= 14) break;
        }

        async function fetchChunk(st, en, fonKind = kind) {
          const body = {
            fonTipi: fonKind,
            fonKodu: fonCode,
            aramaMetni: null,
            fonTurKod: null,
            fonGrubu: null,
            sfonTurKod: null,
            fonTurAciklama: null,
            kurucuKod: null,
            basTarih: dStr(st),
            bitTarih: dStr(en),
            basSira: 1,
            bitSira: 100000,
            dil: 'TR',
            sFonTurKod: '',
            fonKod: fonCode,
            fonGrup: '',
            fonUnvanTip: ''
          };
          try {
            const r = await fetch(TEFAS_URL, {
              method: "POST",
              headers: {
                "Accept": "*/*",
                "Content-Type": "application/json",
                "Origin": "https://www.tefas.gov.tr",
                "Referer": "https://www.tefas.gov.tr/tr/fon-verileri",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
              },
              body: JSON.stringify(body)
            });
            if (!r.ok) return [];
            const j = await r.json();
            return j.resultList || [];
          } catch(e) {
            return [];
          }
        }

        let merged = [];
        let resolvedKind = kind;
        for (let i = 0; i < chunks.length; i++) {
          const chunkData = await fetchChunk(chunks[i].start, chunks[i].end, kind);
          if (chunkData && chunkData.length > 0) {
            merged.push(...chunkData);
          }
          if (chunks.length > 1 && i < chunks.length - 1) {
            await new Promise(res => setTimeout(res, 150));
          }
        }

        // Auto-retry with EMK if YAT returned empty (pension / emeklilik funds)
        if (merged.length === 0 && kind === "YAT") {
          for (let i = 0; i < chunks.length; i++) {
            const chunkData = await fetchChunk(chunks[i].start, chunks[i].end, "EMK");
            if (chunkData && chunkData.length > 0) {
              merged.push(...chunkData);
              resolvedKind = "EMK";
            }
            if (chunks.length > 1 && i < chunks.length - 1) {
              await new Promise(res => setTimeout(res, 150));
            }
          }
        }

        const seenDates = new Set();
        const sorted = [];
        merged.sort((a, b) => (a.tarih || "").localeCompare(b.tarih || ""));
        for (const item of merged) {
          if (item.tarih && !seenDates.has(item.tarih)) {
            seenDates.add(item.tarih);
            if (item.bilFiyat !== undefined) delete item.bilFiyat;
            sorted.push(item);
          }
        }

        return new Response(JSON.stringify({
          ok: true,
          fon: fonCode,
          kind: resolvedKind,
          isAlloc,
          count: sorted.length,
          data: sorted
        }), {
          headers: {
            "Content-Type": "application/json; charset=utf-8",
            "Access-Control-Allow-Origin": "*",
            "Cache-Control": "public, max-age=1800",
          },
        });
      }

      const symbol = (url.searchParams.get("symbol") || url.searchParams.get("hisse") || "THYAO").trim().toUpperCase();

      const groups = ["XI_29", "UFRS_K", "UFRS"];
      let matchedGroup = null;

      async function fetchIsYatirimYear(sym, group, yr) {
        const isUrl = `https://www.isyatirim.com.tr/_layouts/15/IsYatirim.Website/Common/Data.aspx/MaliTablo?companyCode=${sym}&exchange=TRY&financialGroup=${group}&year1=${yr}&period1=3&year2=${yr}&period2=6&year3=${yr}&period3=9&year4=${yr}&period4=12`;
        const res = await fetch(isUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
            "Accept": "application/json, text/plain, */*"
          }
        });
        if (!res.ok) return null;
        const json = await res.json();
        return (json && json.value && json.value.length > 0) ? json.value : null;
      }

      // 1. Identify valid financialGroup using recent year (2025 or 2024)
      let data2025 = null;
      for (const group of groups) {
        const resVal = await fetchIsYatirimYear(symbol, group, "2025");
        if (resVal) {
          data2025 = resVal;
          matchedGroup = group;
          break;
        }
      }

      let data2024 = null;
      if (!matchedGroup) {
        for (const group of groups) {
          const resVal = await fetchIsYatirimYear(symbol, group, "2024");
          if (resVal) {
            data2024 = resVal;
            matchedGroup = group;
            break;
          }
        }
      }

      if (!matchedGroup) {
        return new Response(JSON.stringify({ ok: false, error: "Şirket verisi bulunamadı", symbol }), {
          status: 404,
          headers: {
            "Content-Type": "application/json; charset=utf-8",
            "Access-Control-Allow-Origin": "*",
          },
        });
      }

      // 2. Parallel fetch for 2024, 2025, and 2026
      const [res2024, res2025, res2026] = await Promise.all([
        data2024 ? Promise.resolve(data2024) : fetchIsYatirimYear(symbol, matchedGroup, "2024"),
        data2025 ? Promise.resolve(data2025) : fetchIsYatirimYear(symbol, matchedGroup, "2025"),
        fetchIsYatirimYear(symbol, matchedGroup, "2026").catch(() => null)
      ]);

      // 3. Detect which periods exist in 2026
      let has26Q1 = false, has26Q2 = false, has26Q3 = false, has26Q4 = false;
      if (res2026 && res2026.length > 0) {
        for (const it of res2026) {
          if (it.value1 !== null && it.value1 !== undefined && it.value1 !== "") has26Q1 = true;
          if (it.value2 !== null && it.value2 !== undefined && it.value2 !== "") has26Q2 = true;
          if (it.value3 !== null && it.value3 !== undefined && it.value3 !== "") has26Q3 = true;
          if (it.value4 !== null && it.value4 !== undefined && it.value4 !== "") has26Q4 = true;
        }
      }

      // Dynamic periods array
      const periods = [];
      if (res2024 && res2024.length > 0) {
        periods.push("2024/03", "2024/06", "2024/09", "2024/12");
      }
      if (res2025 && res2025.length > 0) {
        periods.push("2025/03", "2025/06", "2025/09", "2025/12");
      }
      if (has26Q1) periods.push("2026/03");
      if (has26Q2) periods.push("2026/06");
      if (has26Q3) periods.push("2026/09");
      if (has26Q4) periods.push("2026/12");

      const m24 = new Map((res2024 || []).map(x => [x.itemCode, x]));
      const m25 = new Map((res2025 || []).map(x => [x.itemCode, x]));
      const m26 = new Map((res2026 || []).map(x => [x.itemCode, x]));

      const baseItems = res2026 || res2025 || res2024;

      const mergedValue = baseItems.map(baseItem => {
        const code = baseItem.itemCode;
        const it24 = m24.get(code);
        const it25 = m25.get(code);
        const it26 = m26.get(code);

        const valSeries = [];

        if (res2024 && res2024.length > 0) {
          valSeries.push(
            parseFloat(it24?.value1) || 0,
            parseFloat(it24?.value2) || 0,
            parseFloat(it24?.value3) || 0,
            parseFloat(it24?.value4) || 0
          );
        }

        if (res2025 && res2025.length > 0) {
          valSeries.push(
            parseFloat(it25?.value1) || 0,
            parseFloat(it25?.value2) || 0,
            parseFloat(it25?.value3) || 0,
            parseFloat(it25?.value4) || 0
          );
        }

        if (has26Q1) valSeries.push(parseFloat(it26?.value1) || 0);
        if (has26Q2) valSeries.push(parseFloat(it26?.value2) || 0);
        if (has26Q3) valSeries.push(parseFloat(it26?.value3) || 0);
        if (has26Q4) valSeries.push(parseFloat(it26?.value4) || 0);

        const last4 = valSeries.slice(-4);

        return {
          itemCode: code,
          itemDescTr: baseItem.itemDescTr,
          values: valSeries,
          value1: last4[0] !== undefined ? String(last4[0]) : null,
          value2: last4[1] !== undefined ? String(last4[1]) : null,
          value3: last4[2] !== undefined ? String(last4[2]) : null,
          value4: last4[3] !== undefined ? String(last4[3]) : null
        };
      });

      return new Response(JSON.stringify({
        ok: true,
        symbol,
        group: matchedGroup,
        periods,
        value: mergedValue
      }), {
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "public, max-age=3600",
        },
      });

    } catch (err) {
      return new Response(JSON.stringify({ ok: false, error: err.message }), {
        status: 500,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }
  },
};
