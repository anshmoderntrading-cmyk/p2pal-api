// P2Pal API
// 1) Gasless USDT: users pay network fees in USDT; the treasury tops up TRX / BNB just-in-time.
// 2) Push notifications for incoming USDT.
// User keys never touch this server. Only the TREASURY wallet key (fees only) lives here.
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { TronWeb } from 'tronweb';
import { ethers } from 'ethers';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const E = process.env;
const PORT = E.PORT || 8080;
const TRONGRID_API_KEY = E.TRONGRID_API_KEY && E.TRONGRID_API_KEY !== 'CHANGE_ME' ? E.TRONGRID_API_KEY : '';
const ETHERSCAN_API_KEY = E.ETHERSCAN_API_KEY && E.ETHERSCAN_API_KEY !== 'CHANGE_ME' ? E.ETHERSCAN_API_KEY : '';
const BSC_RPC = E.BSC_RPC || 'https://bsc-dataseed.bnbchain.org';
const MNEMONIC = (E.TREASURY_MNEMONIC || '').trim();

// Fee policy: fee = treasury cost x (1 + margin) + flat
const FEE_MARGIN = Number(E.FEE_MARGIN_PCT ?? 25) / 100;
const FEE_FLAT = { tron: Number(E.FEE_FLAT_TRC20 ?? 0.5), bsc: Number(E.FEE_FLAT_BEP20 ?? 0.1) };
const MIN_FEE = { tron: Number(E.MIN_FEE_TRC20 ?? 1), bsc: Number(E.MIN_FEE_BEP20 ?? 0.2) };
// Safety limits
const MAX_TOPUP = { tron: Number(E.MAX_TOPUP_TRX ?? 60), bsc: Number(E.MAX_TOPUP_BNB ?? 0.003) };
const DAILY_PER_ADDRESS = Number(E.DAILY_TOPUPS_PER_ADDRESS ?? 8);
const DAILY_BUDGET_USD = Number(E.TREASURY_DAILY_BUDGET_USD ?? 50);

const USDT = { tron: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t', bsc: '0x55d398326f99059fF775485246999027B3197955' };
const DEC = { tron: 6, bsc: 18 };
const NETWORKS = ['tron', 'bsc'];

// ---------- Treasury ----------
const bscProvider = new ethers.JsonRpcProvider(BSC_RPC, 56, { staticNetwork: true });
let T = null;
if (MNEMONIC) {
  try {
    const root = ethers.HDNodeWallet.fromSeed(ethers.Mnemonic.fromPhrase(MNEMONIC).computeSeed());
    const evm = root.derivePath("m/44'/60'/0'/0/0");
    const tronPk = root.derivePath("m/44'/195'/0'/0/0").privateKey.slice(2);
    T = { bsc: new ethers.Wallet(evm.privateKey, bscProvider), tronPk, tronAddress: TronWeb.address.fromPrivateKey(tronPk) };
    console.log(`[treasury] TRON ${T.tronAddress} | BSC ${T.bsc.address}`);
  } catch (e) {
    console.error('[treasury] invalid TREASURY_MNEMONIC');
  }
} else {
  console.warn('[treasury] TREASURY_MNEMONIC not set — gasless disabled');
}
const FEE_ADDRESS = {
  tron: E.FEE_ADDRESS_TRON || T?.tronAddress || null,
  bsc: E.FEE_ADDRESS_BSC || T?.bsc.address || null,
};

const tw = new TronWeb({
  fullHost: 'https://api.trongrid.io',
  headers: TRONGRID_API_KEY ? { 'TRON-PRO-API-KEY': TRONGRID_API_KEY } : {},
  ...(T ? { privateKey: T.tronPk } : {}),
});

// ---------- Helpers ----------
const httpError = (status, message) => Object.assign(new Error(message), { status });
const wrap = (fn) => (req, res) => fn(req, res).catch((e) => {
  if (!e.status) console.error('[error]', req.path, e.message);
  res.status(e.status || 500).json({ error: e.status ? e.message : 'Server error, please try again' });
});
const ceil2 = (n) => Math.ceil(n * 100) / 100;
const today = () => new Date().toISOString().slice(0, 10);

function validNetwork(n) {
  if (!NETWORKS.includes(n)) throw httpError(400, 'Unsupported network');
  return n;
}
function validAddress(n, a) {
  const ok = n === 'tron' ? TronWeb.isAddress(a || '') : ethers.isAddress(a || '');
  if (!ok) throw httpError(400, 'Invalid address');
  return n === 'tron' ? a : ethers.getAddress(a);
}
function parseAmount(n, a) {
  try {
    const raw = ethers.parseUnits(String(a), DEC[n]);
    if (raw <= 0n) throw 0;
    return raw;
  } catch {
    throw httpError(400, 'Invalid amount');
  }
}

let priceCache = { at: 0, v: null };
async function nativeUsd() {
  if (priceCache.v && Date.now() - priceCache.at < 120_000) return priceCache.v;
  const r = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=tron,binancecoin&vs_currencies=usd');
  const j = await r.json().catch(() => ({}));
  const v = { tron: j.tron?.usd, bsc: j.binancecoin?.usd };
  if (!v.tron || !v.bsc) {
    if (priceCache.v) return priceCache.v;
    throw httpError(503, 'Price feed unavailable, try again');
  }
  priceCache = { at: Date.now(), v };
  return v;
}

let tronParams = { at: 0, v: null };
async function tronChainParams() {
  if (tronParams.v && Date.now() - tronParams.at < 600_000) return tronParams.v;
  const list = await tw.trx.getChainParameters();
  const v = Object.fromEntries(list.map((p) => [p.key, p.value]));
  tronParams = { at: Date.now(), v };
  return v;
}

async function tronUsdtBalance(addr) {
  const r = await tw.transactionBuilder.triggerConstantContract(
    USDT.tron, 'balanceOf(address)', {}, [{ type: 'address', value: addr }], addr
  );
  return BigInt('0x' + (r.constant_result?.[0] || '0'));
}

async function tronTransferEnergy(from, to, raw) {
  try {
    const r = await tw.transactionBuilder.triggerConstantContract(
      USDT.tron, 'transfer(address,uint256)', {},
      [{ type: 'address', value: to }, { type: 'uint256', value: raw.toString() }], from
    );
    if (r.result?.result === false || !r.energy_used) return null;
    return (r.energy_used || 0) + (r.energy_penalty || 0);
  } catch {
    return null;
  }
}

const bscIface = new ethers.Interface(['function transfer(address,uint256)', 'function balanceOf(address) view returns (uint256)']);
async function bscUsdtBalance(addr) {
  const data = await bscProvider.call({ to: USDT.bsc, data: bscIface.encodeFunctionData('balanceOf', [addr]) });
  return BigInt(data);
}
async function bscTransferGas(from, to, raw) {
  try {
    return await bscProvider.estimateGas({ from, to: USDT.bsc, data: bscIface.encodeFunctionData('transfer', [to, raw]) });
  } catch {
    return 65_000n;
  }
}

// ---------- Quote ----------
// Returns what the user must pay in USDT and what the treasury must send.
async function quote(network, from, to, amountRaw) {
  const prices = await nativeUsd();

  if (network === 'tron') {
    const [acct, res, params, recipientUsdt] = await Promise.all([
      tw.trx.getAccount(from),
      tw.trx.getAccountResources(from),
      tronChainParams(),
      tronUsdtBalance(to).catch(() => 0n),
    ]);
    const energyPrice = params.getEnergyFee || 100; // sun per energy
    const bwPrice = params.getTransactionFee || 1000; // sun per byte
    const e1 = (await tronTransferEnergy(from, to, amountRaw)) ?? (recipientUsdt > 0n ? 65_000 : 131_000);
    const e2 = (await tronTransferEnergy(from, FEE_ADDRESS.tron, 1n)) ?? 65_000;
    const energyAvail = Math.max(0, (res.EnergyLimit || 0) - (res.EnergyUsed || 0));
    const bwAvail = Math.max(0, (res.freeNetLimit || 0) - (res.freeNetUsed || 0)) + Math.max(0, (res.NetLimit || 0) - (res.NetUsed || 0));
    const needSun = Math.ceil(
      (Math.max(0, e1 + e2 - energyAvail) * energyPrice + Math.max(0, 2 * 360 - bwAvail) * bwPrice) * 1.1
    );
    const balanceSun = Number(acct.balance || 0);
    const activated = !!acct.address;
    const topupSun = Math.max(0, needSun - balanceSun);
    const treasurySun = topupSun + (topupSun > 0 && !activated ? 1_100_000 : 0) + (topupSun > 0 ? 300_000 : 0);
    const costUsd = (treasurySun / 1e6) * prices.tron;
    const fee = Math.max(MIN_FEE.tron, ceil2(costUsd * (1 + FEE_MARGIN) + FEE_FLAT.tron));
    return {
      fee, feeRaw: ethers.parseUnits(fee.toFixed(2), 6), feeAddress: FEE_ADDRESS.tron,
      topup: BigInt(topupSun), requiredNative: BigInt(needSun), costUsd,
    };
  }

  // BSC
  const fd = await bscProvider.getFeeData();
  const gasPrice = fd.gasPrice ?? ethers.parseUnits('0.1', 'gwei');
  const gas = (await bscTransferGas(from, to, amountRaw)) + (await bscTransferGas(from, FEE_ADDRESS.bsc, 1n));
  const need = (gas * gasPrice * 13n) / 10n;
  const bal = await bscProvider.getBalance(from);
  const topup = need > bal ? need - bal : 0n;
  const treasuryWei = topup > 0n ? topup + 21_000n * gasPrice : 0n;
  const costUsd = Number(ethers.formatEther(treasuryWei)) * prices.bsc;
  const fee = Math.max(MIN_FEE.bsc, ceil2(costUsd * (1 + FEE_MARGIN) + FEE_FLAT.bsc));
  return {
    fee, feeRaw: ethers.parseUnits(fee.toFixed(2), 18), feeAddress: FEE_ADDRESS.bsc,
    topup, requiredNative: need, costUsd,
  };
}

// ---------- Abuse protection ----------
const DATA_DIR = path.join(__dirname, 'data');
fs.mkdirSync(DATA_DIR, { recursive: true });
const GAS_FILE = path.join(DATA_DIR, 'gas.json');
let gasState = (() => { try { return JSON.parse(fs.readFileSync(GAS_FILE, 'utf8')); } catch { return { day: today(), spentUsd: 0, addr: {} }; } })();
const saveGas = () => fs.writeFile(GAS_FILE, JSON.stringify(gasState), () => {});
function rollDay() {
  if (gasState.day !== today()) gasState = { day: today(), spentUsd: 0, addr: {} };
}

// TRON: was the fee for the previous top-up actually paid?
async function tronFeePaidSince(from, since) {
  const r = await fetch(
    `https://api.trongrid.io/v1/accounts/${from}/transactions/trc20?only_from=true&contract_address=${USDT.tron}&min_timestamp=${since}&limit=50`,
    { headers: TRONGRID_API_KEY ? { 'TRON-PRO-API-KEY': TRONGRID_API_KEY } : {} }
  );
  const j = await r.json().catch(() => ({}));
  return (j.data || []).some((x) => x.to === FEE_ADDRESS.tron);
}

const ipHits = new Map();
function ipLimit(req, res, next) {
  const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress;
  const now = Date.now();
  const hits = (ipHits.get(ip) || []).filter((t) => now - t < 60_000);
  hits.push(now);
  ipHits.set(ip, hits);
  if (hits.length > 40) return res.status(429).json({ error: 'Too many requests, slow down' });
  next();
}

// ---------- App ----------
const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '10kb' }));
app.use(ipLimit);

app.get('/', (req, res) => res.json({ name: 'P2Pal API', status: 'running' }));
app.get('/health', (req, res) => res.json({ ok: true }));

app.get('/gas/info', (req, res) =>
  res.json({ enabled: !!T, feeAddress: FEE_ADDRESS, networks: NETWORKS })
);

app.get('/gas/quote', wrap(async (req, res) => {
  if (!T) throw httpError(503, 'Gas-free transfers are not available right now');
  const network = validNetwork(req.query.network);
  const from = validAddress(network, req.query.from);
  const to = validAddress(network, req.query.to);
  const amountRaw = parseAmount(network, req.query.amount);
  const q = await quote(network, from, to, amountRaw);
  res.json({ network, fee: q.fee.toFixed(2), feeAddress: q.feeAddress });
}));

const signMessage = (network, from, ts) => `P2Pal network fee request\nNetwork: ${network}\nAddress: ${from}\nTime: ${ts}`;

app.post('/gas/prepare', wrap(async (req, res) => {
  if (!T) throw httpError(503, 'Gas-free transfers are not available right now');
  const { network: n, from: f, to: t, amount, ts, signature } = req.body || {};
  const network = validNetwork(n);
  const from = validAddress(network, f);
  const to = validAddress(network, t);
  const amountRaw = parseAmount(network, amount);

  // 1) Prove the caller owns `from`
  if (!ts || Math.abs(Date.now() - Number(ts)) > 5 * 60_000) throw httpError(400, 'Request expired, please retry');
  const msg = signMessage(network, from, ts);
  let signer;
  try {
    signer = network === 'tron' ? await tw.trx.verifyMessageV2(msg, signature) : ethers.verifyMessage(msg, signature);
  } catch {
    signer = null;
  }
  if (!signer || (network === 'tron' ? signer !== from : signer.toLowerCase() !== from.toLowerCase())) {
    throw httpError(401, 'Signature check failed');
  }

  // 2) Limits
  rollDay();
  const key = `${network}:${from}`;
  const st = gasState.addr[key] || { count: 0, lastTopupAt: 0 };
  if (st.count >= DAILY_PER_ADDRESS) throw httpError(429, 'Daily gas-free limit reached for this wallet');
  if (network === 'tron' && st.lastTopupAt && !(await tronFeePaidSince(from, st.lastTopupAt))) {
    throw httpError(403, 'Previous network fee was not paid. Contact support.');
  }

  // 3) Quote + balance check
  const q = await quote(network, from, to, amountRaw);
  const usdt = network === 'tron' ? await tronUsdtBalance(from) : await bscUsdtBalance(from);
  if (usdt < amountRaw + q.feeRaw) throw httpError(400, `Insufficient USDT. You need ${ethers.formatUnits(amountRaw + q.feeRaw, DEC[network])} USDT including the network fee.`);

  // 4) Top up native gas if needed
  let topupTx = null;
  if (q.topup > 0n) {
    if (gasState.spentUsd + q.costUsd > DAILY_BUDGET_USD) throw httpError(503, 'Gas-free service is busy. Please try again later.');
    if (network === 'tron') {
      if (Number(q.topup) / 1e6 > MAX_TOPUP.tron) throw httpError(400, 'Network fee too high right now, try later');
      const r = await tw.trx.sendTransaction(from, Number(q.topup));
      if (!r.result) throw httpError(502, 'Could not fund network fee, try again');
      topupTx = r.txid || r.transaction?.txID;
    } else {
      if (Number(ethers.formatEther(q.topup)) > MAX_TOPUP.bsc) throw httpError(400, 'Network fee too high right now, try later');
      const tx = await T.bsc.sendTransaction({ to: from, value: q.topup });
      await tx.wait(1);
      topupTx = tx.hash;
    }
    gasState.spentUsd += q.costUsd;
    gasState.addr[key] = { count: st.count + 1, lastTopupAt: Date.now() };
    saveGas();
    console.log(`[gas] ${network} ${from} topup=${q.topup} fee=${q.fee}`);
  }

  res.json({
    network,
    fee: q.fee.toFixed(2),
    feeRaw: q.feeRaw.toString(),
    feeAddress: q.feeAddress,
    requiredNative: q.requiredNative.toString(),
    topupTx,
  });
}));

// ---------- Push notifications (incoming USDT) ----------
const SUBS_FILE = path.join(DATA_DIR, 'subscribers.json');
const loadSubs = () => { try { return JSON.parse(fs.readFileSync(SUBS_FILE, 'utf8')); } catch { return {}; } };
const saveSubs = (s) => fs.writeFileSync(SUBS_FILE, JSON.stringify(s));

app.post('/notify/register', (req, res) => {
  const { pushToken, evm, tron } = req.body || {};
  if (!/^ExponentPushToken\[.+\]$/.test(pushToken || '')) return res.status(400).json({ error: 'bad token' });
  const subs = loadSubs();
  subs[pushToken] = { since: Date.now(), ...(subs[pushToken] || {}), evm, tron };
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
const fmt = (v, d) => (Number(v) / 10 ** Number(d)).toLocaleString('en-US', { maximumFractionDigits: 2 });

async function incomingTron(sub) {
  if (!sub.tron) return [];
  const r = await fetch(
    `https://api.trongrid.io/v1/accounts/${sub.tron}/transactions/trc20?only_to=true&contract_address=${USDT.tron}&limit=20&min_timestamp=${sub.since + 1}`,
    { headers: TRONGRID_API_KEY ? { 'TRON-PRO-API-KEY': TRONGRID_API_KEY } : {} }
  );
  const j = await r.json().catch(() => ({}));
  return (j.data || []).map((x) => ({ time: x.block_timestamp, text: `You received ${fmt(x.value, 6)} USDT (TRC20)` }));
}
async function incomingBsc(sub) {
  if (!sub.evm || !ETHERSCAN_API_KEY) return [];
  const r = await fetch(
    `https://api.etherscan.io/v2/api?chainid=56&module=account&action=tokentx&contractaddress=${USDT.bsc}&address=${sub.evm}&sort=desc&page=1&offset=20&apikey=${ETHERSCAN_API_KEY}`
  );
  const j = await r.json().catch(() => ({}));
  return (Array.isArray(j.result) ? j.result : [])
    .filter((x) => Number(x.timeStamp) * 1000 > sub.since && x.to.toLowerCase() === sub.evm.toLowerCase())
    .map((x) => ({ time: Number(x.timeStamp) * 1000, text: `You received ${fmt(x.value, 18)} USDT (BEP20)` }));
}
async function poll() {
  const subs = loadSubs();
  for (const [token, sub] of Object.entries(subs)) {
    try {
      const ev = [...(await incomingTron(sub)), ...(await incomingBsc(sub))];
      for (const e of ev.slice(0, 5)) await push(token, 'P2Pal', e.text);
      if (ev.length) sub.since = Math.max(...ev.map((e) => e.time));
    } catch {}
  }
  saveSubs(subs);
}
setInterval(poll, Number(E.POLL_SECONDS || 60) * 1000);

app.listen(PORT, () => console.log(`P2Pal API on :${PORT}`));
