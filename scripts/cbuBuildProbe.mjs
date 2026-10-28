// Build-only diagnostic: does not affect the frontend bundle or production branch.
const day = new Intl.DateTimeFormat('en-CA', { timeZone:'Asia/Tashkent', year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
for (const path of [
  `https://cbu.uz/uz/arkhiv-kursov-valyut/json/all/${day}/`,
  'https://cbu.uz/uz/arkhiv-kursov-valyut/json/',
]) {
  try {
    const response = await fetch(path, { signal: AbortSignal.timeout(6000), headers: {Accept:'application/json'} });
    const rows = await response.json();
    const rub = Array.isArray(rows) ? rows.find(r=>r.Ccy==='RUB') : null;
    console.log(JSON.stringify({ probe:'VERCEL_BUILDER_CBU', reachable: response.ok && Boolean(rub?.Rate), status:response.status, officialEffectiveDate:rub?.Date ?? null }));
    if (response.ok && rub?.Rate) break;
  } catch (error) {
    console.log(JSON.stringify({ probe:'VERCEL_BUILDER_CBU', reachable:false, name:error?.name||'Error' }));
  }
}
