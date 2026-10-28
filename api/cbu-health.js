// Temporary preview-only connectivity check; does not affect order creation.
export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const base = 'https://cbu.uz/uz/arkhiv-kursov-valyut/json/';
  const urls = [base, base + 'all/2026-10-28/'];
  const results = [];
  for (const url of urls) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(6000), headers: { Accept: 'application/json' } });
      const data = await response.json();
      results.push({ path: new URL(url).pathname, status: response.status, validJson: Array.isArray(data),
        rub: Array.isArray(data) && data.some((row) => row.Ccy === 'RUB') });
    } catch (error) {
      results.push({ path: new URL(url).pathname, failed: error?.cause?.code || error?.code || error?.name });
    }
  }
  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json({ source: 'cbu.uz', results });
}
