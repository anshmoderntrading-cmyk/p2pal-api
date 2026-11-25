let cache = { at: 0, data: {} };

// CoinGecko se INR + USD price aur 24h change (60 sec cache)
export async function getPrices(ids) {
  const uniq = [...new Set(ids.filter(Boolean))];
  const missing = uniq.filter((id) => !cache.data[id]);
  if (missing.length === 0 && Date.now() - cache.at < 60_000) return cache.data;
  try {
    const r = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${uniq.join(',')}&vs_currencies=inr,usd&include_24hr_change=true`
    );
    if (r.ok) cache = { at: Date.now(), data: { ...cache.data, ...(await r.json()) } };
  } catch {}
  return cache.data;
}

export const formatINR = (n) =>
  `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const formatPct = (n) => (n == null ? '' : `${n >= 0 ? '+' : ''}${Number(n).toFixed(2)}%`);
