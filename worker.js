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
