// Token list = native coin + USDT + "featured" tokens (listing fee wale) jo backend se aate hain.
import { CHAINS } from '../config/chains';
import { ENV } from '../config/env';

let featuredCache = null;

export async function loadFeatured(force = false) {
  if (featuredCache && !force) return featuredCache;
  try {
    const r = await fetch(`${ENV.API_BASE_URL}/tokens/featured`);
    featuredCache = r.ok ? await r.json() : [];
  } catch {
    featuredCache = [];
  }
  return featuredCache;
}

export async function getTokens(chainKey) {
  const c = CHAINS[chainKey];
  const native = { symbol: c.symbol, address: null, decimals: c.decimals, coingeckoId: c.coingeckoId, name: c.name };
  const usdt = { ...c.usdt, name: `Tether (${c.usdt.label})` };
  const featured = (await loadFeatured())
    .filter((t) => t.chain === chainKey && t.address)
    .map((t) => ({ ...t, featured: true }));
  return [native, usdt, ...featured];
}
