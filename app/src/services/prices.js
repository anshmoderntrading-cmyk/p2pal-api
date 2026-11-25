let cache = { at: 0, inr: null };

// USDT → INR rate (60s cache)
export async function getUsdtInr() {
  if (cache.inr && Date.now() - cache.at < 60_000) return cache.inr;
  try {
    const r = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=tether&vs_currencies=inr');
    const j = await r.json();
    if (j.tether?.inr) cache = { at: Date.now(), inr: j.tether.inr };
  } catch {}
  return cache.inr;
}

export const fmtUsd = (n) =>
  `$${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const fmtInr = (n) =>
  `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const fmtUsdt = (n) =>
  Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 6 });
