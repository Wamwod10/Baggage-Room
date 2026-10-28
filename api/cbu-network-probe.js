// Temporary diagnostic only. No app/DB integration. Do not merge into production.
export default async function handler(req, res) {
  res.setHeader("Cache-Control", "public, max-age=0, s-maxage=3600");
  res.setHeader("X-Content-Type-Options", "nosniff");
  if (req.method !== "GET") return res.status(405).json({ error: "method_not_allowed" });
  const day = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tashkent", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date());
  const paths = [
    "https://cbu.uz/uz/arkhiv-kursov-valyut/json/all/" + day + "/",
    "https://cbu.uz/uz/arkhiv-kursov-valyut/json/",
  ];
  let result = { reachable: false, checkedDate: day, region: process.env.VERCEL_REGION || "unknown", checks: [] };
  for (const endpoint of paths) {
    try {
      const response = await fetch(endpoint, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(5500) });
      const rows = await response.json();
      const rub = Array.isArray(rows) && rows.find(x => x.Ccy === "RUB");
      const usd = Array.isArray(rows) && rows.find(x => x.Ccy === "USD");
      if (response.ok && rub && usd && Number(rub.Rate) > 0 && Number(usd.Rate) > 0) {
        result.reachable = true;
        result.sampleEffectiveDate = rub.Date;
        result.checks.push({ endpoint: new URL(endpoint).pathname, ok: true });
        break;
      }
      result.checks.push({ endpoint: new URL(endpoint).pathname, ok: false, status: response.status });
    } catch (e) {
      result.checks.push({ endpoint: new URL(endpoint).pathname, ok: false, error: e?.name || "Error" });
    }
  }
  return res.status(result.reachable ? 200 : 503).json(result);
}
