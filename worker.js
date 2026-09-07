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

      const year1 = url.searchParams.get("year1") || "2024";
      const period1 = url.searchParams.get("period1") || "3";
      const year2 = url.searchParams.get("year2") || "2024";
      const period2 = url.searchParams.get("period2") || "6";
      const year3 = url.searchParams.get("year3") || "2024";
      const period3 = url.searchParams.get("period3") || "9";
      const year4 = url.searchParams.get("year4") || "2024";
      const period4 = url.searchParams.get("period4") || "12";

      const groups = ["XI_29", "UFRS_K", "UFRS"];
      let resultData = null;
      let matchedGroup = "XI_29";

      for (const group of groups) {
        const isUrl = `https://www.isyatirim.com.tr/_layouts/15/IsYatirim.Website/Common/Data.aspx/MaliTablo?companyCode=${symbol}&exchange=TRY&financialGroup=${group}&year1=${year1}&period1=${period1}&year2=${year2}&period2=${period2}&year3=${year3}&period3=${period3}&year4=${year4}&period4=${period4}`;

        const isRes = await fetch(isUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
            "Accept": "application/json, text/plain, */*"
          }
        });

        if (isRes.ok) {
          const json = await isRes.json();
          if (json && json.value && json.value.length > 0) {
            resultData = json;
            matchedGroup = group;
            break;
          }
        }
      }

      if (!resultData) {
        return new Response(JSON.stringify({ ok: false, error: "Şirket verisi bulunamadı", symbol }), {
          status: 404,
          headers: {
            "Content-Type": "application/json; charset=utf-8",
            "Access-Control-Allow-Origin": "*",
          },
        });
      }

      return new Response(JSON.stringify({
        ok: true,
        symbol,
        group: matchedGroup,
        periods: [
          `${year1}/${period1.padStart(2, '0')}`,
          `${year2}/${period2.padStart(2, '0')}`,
          `${year3}/${period3.padStart(2, '0')}`,
          `${year4}/${period4.padStart(2, '0')}`
        ],
        value: resultData.value
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
