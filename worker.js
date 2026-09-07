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
      let data2024 = null;

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

      // 1. Identify valid financialGroup using current year
      for (const group of groups) {
        const resVal = await fetchIsYatirimYear(symbol, group, "2024");
        if (resVal) {
          data2024 = resVal;
          matchedGroup = group;
          break;
        }
      }

      if (!data2024) {
        return new Response(JSON.stringify({ ok: false, error: "Şirket verisi bulunamadı", symbol }), {
          status: 404,
          headers: {
            "Content-Type": "application/json; charset=utf-8",
            "Access-Control-Allow-Origin": "*",
          },
        });
      }

      // 2. Fetch previous year (2023) for extended historical 8-quarter depth
      let data2023 = null;
      try {
        data2023 = await fetchIsYatirimYear(symbol, matchedGroup, "2023");
      } catch (e) {
        data2023 = null;
      }

      const m23 = new Map((data2023 || []).map(x => [x.itemCode, x]));
      const periods = [
        "2023/03", "2023/06", "2023/09", "2023/12",
        "2024/03", "2024/06", "2024/09", "2024/12"
      ];

      const mergedValue = data2024.map(it24 => {
        const it23 = m23.get(it24.itemCode);
        const v23 = it23 ? [
          parseFloat(it23.value1) || 0,
          parseFloat(it23.value2) || 0,
          parseFloat(it23.value3) || 0,
          parseFloat(it23.value4) || 0
        ] : [0, 0, 0, 0];
        const v24 = [
          parseFloat(it24.value1) || 0,
          parseFloat(it24.value2) || 0,
          parseFloat(it24.value3) || 0,
          parseFloat(it24.value4) || 0
        ];
        return {
          itemCode: it24.itemCode,
          itemDescTr: it24.itemDescTr,
          values: [...v23, ...v24],
          value1: it24.value1,
          value2: it24.value2,
          value3: it24.value3,
          value4: it24.value4
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
