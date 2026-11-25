// P2Pal API — halka backend. Isme koi private key / seed NAHI hota.
// Kaam: 1) 1inch swap proxy (fee + secret key yahin), 2) featured tokens list, 3) receive notifications.
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const {
  PORT = 8080,
  ONEINCH_API_KEY = '',
  FEE_PERCENT = '0.75', // 0.5–1% rakho
  FEE_RECEIVER = '', // aapka EVM address jahan swap fee aayegi
  TRONGRID_API_KEY = '',
  ETHERSCAN_API_KEY = '',
  POLL_SECONDS = '60',
} = process.env;

const DATA_DIR = path.join(__dirname, 'data');
const SUBS_FILE = path.join(DATA_DIR, 'subscribers.json');
fs.mkdirSync(DATA_DIR, { recursive: true });

const app = express();
app.use(express.json({ limit: '20kb' }));

const wrap = (fn) => (req, res) =>
  fn(req, res).catch((e) => res.status(e.status || 500).json({ error: e.message }));

// ---------- 1) Swap proxy (1inch v6) ----------
const ONEINCH = 'https://api.1inch.com/swap/v6.0';
const SWAP_CHAINS = new Set(['1', '56', '137']);

async function oneinch(chainId, endpoint, params) {
  if (!SWAP_CHAINS.has(chainId)) throw Object.assign(new Error('Chain supported nahi'), { status: 400 });
  if (!ONEINCH_API_KEY) throw Object.assign(new Error('ONEINCH_API_KEY set nahi'), { status: 500 });
  const qs = new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([, v]) => v != null && v !== '')));
  const r = await fetch(`${ONEINCH}/${chainId}/${endpoint}?${qs}`, {
    headers: { Authorization: `Bearer ${ONEINCH_API_KEY}`, accept: 'application/json' },
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    console.error('[1inch]', r.status, endpoint, JSON.stringify(j).slice(0, 300));
    throw Object.assign(new Error(j.description || j.error || '1inch error'), { status: r.status });
  }
  return j;
}

const feeParams = () => (FEE_RECEIVER ? { fee: FEE_PERCENT } : {});

app.get('/swap/config', (req, res) => res.json({ feePercent: FEE_RECEIVER ? Number(FEE_PERCENT) : 0 }));

app.get('/swap/:chainId/quote', wrap(async (req, res) => {
  const { src, dst, amount } = req.query;
  res.json(await oneinch(req.params.chainId, 'quote', { src, dst, amount, ...feeParams() }));
}));

app.get('/swap/:chainId/swap', wrap(async (req, res) => {
  const { src, dst, amount, from, slippage = '1' } = req.query;
  if (Number(slippage) > 5) throw Object.assign(new Error('Slippage max 5%'), { status: 400 });
  res.json(await oneinch(req.params.chainId, 'swap', {
    src, dst, amount, from, origin: from, slippage,
    ...feeParams(), ...(FEE_RECEIVER ? { referrer: FEE_RECEIVER } : {}),
  }));
}));

app.get('/swap/:chainId/allowance', wrap(async (req, res) => {
  const { tokenAddress, walletAddress } = req.query;
  res.json(await oneinch(req.params.chainId, 'approve/allowance', { tokenAddress, walletAddress }));
}));

app.get('/swap/:chainId/approve', wrap(async (req, res) => {
  const { tokenAddress, amount } = req.query;
  res.json(await oneinch(req.params.chainId, 'approve/transaction', { tokenAddress, amount }));
}));

// ---------- 2) Featured tokens (listing fee) ----------
app.get('/tokens/featured', (req, res) => {
  try {
    res.json(JSON.parse(fs.readFileSync(path.join(__dirname, 'featured-tokens.json'), 'utf8')));
  } catch {
    res.json([]);
  }
});

// ---------- 3) Push notifications ----------
const loadSubs = () => { try { return JSON.parse(fs.readFileSync(SUBS_FILE, 'utf8')); } catch { return {}; } };
const saveSubs = (s) => fs.writeFileSync(SUBS_FILE, JSON.stringify(s, null, 2));

app.post('/notify/register', (req, res) => {
  const { pushToken, evm, tron } = req.body || {};
  if (!/^ExponentPushToken\[.+\]$/.test(pushToken || '')) return res.status(400).json({ error: 'bad token' });
  const subs = loadSubs();
  subs[pushToken] = { evm, tron, since: Date.now(), ...(subs[pushToken] || {}), evm, tron };
  saveSubs(subs);
  res.json({ ok: true });
});

async function push(to, title, body) {
  await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ to, title, body, sound: 'default' }),
  }).catch(() => {});
}

const fmt = (v, d) => (Number(v) / 10 ** Number(d)).toLocaleString('en-IN', { maximumFractionDigits: 6 });

async function checkTron(sub) {
  if (!sub.tron) return [];
  const r = await fetch(
    `https://api.trongrid.io/v1/accounts/${sub.tron}/transactions/trc20?only_to=true&limit=20&min_timestamp=${sub.since + 1}`,
    { headers: TRONGRID_API_KEY ? { 'TRON-PRO-API-KEY': TRONGRID_API_KEY } : {} }
  );
  const j = await r.json();
  return (j.data || []).map((x) => ({
    time: x.block_timestamp,
    text: `+${fmt(x.value, x.token_info?.decimals ?? 6)} ${x.token_info?.symbol || 'TRC20'} (TRON) receive hua`,
  }));
}

const EVM_NAMES = { 1: 'Ethereum', 56: 'BNB Chain', 137: 'Polygon' };
async function checkEvm(sub) {
  if (!sub.evm || !ETHERSCAN_API_KEY) return [];
  const out = [];
  for (const chainid of [56, 1, 137]) {
    const r = await fetch(
      `https://api.etherscan.io/v2/api?chainid=${chainid}&module=account&action=tokentx&address=${sub.evm}&sort=desc&page=1&offset=20&apikey=${ETHERSCAN_API_KEY}`
    );
    const j = await r.json();
    for (const x of Array.isArray(j.result) ? j.result : []) {
      const time = Number(x.timeStamp) * 1000;
      if (time > sub.since && x.to.toLowerCase() === sub.evm.toLowerCase()) {
        out.push({ time, text: `+${fmt(x.value, x.tokenDecimal)} ${x.tokenSymbol} (${EVM_NAMES[chainid]}) receive hua` });
      }
    }
  }
  return out;
}

async function poll() {
  const subs = loadSubs();
  for (const [token, sub] of Object.entries(subs)) {
    try {
      const events = [...(await checkTron(sub)), ...(await checkEvm(sub))];
      for (const e of events.slice(0, 5)) await push(token, 'P2Pal 💰', e.text);
      if (events.length) sub.since = Math.max(...events.map((e) => e.time));
    } catch {}
  }
  saveSubs(subs);
}
setInterval(poll, Number(POLL_SECONDS) * 1000);

app.get('/', (req, res) => res.json({ name: 'P2Pal API', status: 'running' }));
app.get('/health', (req, res) => res.json({ ok: true }));
app.listen(PORT, () => console.log(`P2Pal API on :${PORT}`));
