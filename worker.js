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

      const isLeaders = url.searchParams.get("leaders") === "1" || url.searchParams.get("liderler") === "1" || fonCode === "LEADERS";
      if (isLeaders) {
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
              const curShares = parseFloat(cur.tedPaySayisi) || 0;
              const prevShares = parseFloat(prev.tedPaySayisi) || 0;
              const curInv = parseInt(cur.kisiSayisi) || 0;
              const prevInv = parseInt(prev.kisiSayisi) || 0;
              const dInv = curInv - prevInv;
              const dShares = curShares - prevShares;
              const flow = dShares * curPrice;
              const aum = cur.portfoyBuyukluk || (curPrice * curShares);
              diffs.push({
                code,
                name: cur.fonUnvan || `${code} YATIRIM FONU`,
                date: cur.tarih,
                price: curPrice,
                aum,
                investors: curInv,
                deltaInvestors: dInv,
                deltaShares: dShares,
                cashFlow: flow,
                perPerson: Math.abs(dInv) > 0 ? Math.abs(flow) / Math.abs(dInv) : 0
              });
            }

            const limit = Math.min(100, Math.max(3, parseInt(url.searchParams.get("limit") || "50", 10)));

            const topInvestorInflow = [...diffs].filter(d => d.deltaInvestors > 0).sort((a,b) => b.deltaInvestors - a.deltaInvestors).slice(0, limit);
            const topInvestorOutflow = [...diffs].filter(d => d.deltaInvestors < 0).sort((a,b) => a.deltaInvestors - b.deltaInvestors).slice(0, limit);
            const topCashInflow = [...diffs].filter(d => d.cashFlow > 0).sort((a,b) => b.cashFlow - a.cashFlow).slice(0, limit);
            const topCashOutflow = [...diffs].filter(d => d.cashFlow < 0).sort((a,b) => a.cashFlow - b.cashFlow).slice(0, limit);

            return new Response(JSON.stringify({
              ok: true,
              date: diffs[0]?.date || dStr(now),
              totalAnalyzed: diffs.length,
              categories: {
                topInvestorInflow,
                topInvestorOutflow,
                topCashInflow,
                topCashOutflow
              }
            }), {
              headers: {
                "Content-Type": "application/json; charset=utf-8",
                "Access-Control-Allow-Origin": "*",
                "Cache-Control": "public, max-age=1800",
              },
            });
          }
        } catch(e) {
          console.warn("Worker leaders calculation error:", e);
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

        async function fetchChunk(st, en) {
          const body = {
            fonTipi: kind,
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

        const merged = [];
        for (let i = 0; i < chunks.length; i++) {
          const chunkData = await fetchChunk(chunks[i].start, chunks[i].end);
          if (chunkData && chunkData.length > 0) {
            merged.push(...chunkData);
          }
          if (chunks.length > 1 && i < chunks.length - 1) {
            await new Promise(res => setTimeout(res, 150));
          }
        }

        const seenDates = new Set();
        const sorted = [];
        merged.sort((a, b) => (a.tarih || "").localeCompare(b.tarih || ""));
        for (const item of merged) {
          if (item.tarih && !seenDates.has(item.tarih)) {
            seenDates.add(item.tarih);
            sorted.push(item);
          }
        }

        return new Response(JSON.stringify({
          ok: true,
          fon: fonCode,
          kind,
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
