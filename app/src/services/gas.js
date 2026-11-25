// Gas-free withdrawals: network fee is paid in USDT, P2Pal funds TRX/BNB just-in-time.
import { Wallet } from 'ethers';
import { ENV } from '../config/env';
import { getMnemonic } from './secure';
import { deriveAccounts } from './wallet';
import { tronWeb } from './providers';
import { transferUsdt, getNativeRaw, toRaw } from './usdt';

async function api(path, opts = {}) {
  let r;
  try {
    r = await fetch(`${ENV.API_BASE_URL}${path}`, {
      ...opts,
      headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
    });
  } catch {
    throw new Error('No internet connection');
  }
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || 'Service unavailable, please try again');
  return j;
}

let infoCache = null;
export async function getGasInfo() {
  if (!infoCache) infoCache = await api('/gas/info').catch(() => ({ enabled: false, feeAddress: {} }));
  return infoCache;
}

export async function getFeeQuote(network, from, to, amount) {
  const q = new URLSearchParams({ network, from, to, amount: String(amount) });
  return api(`/gas/quote?${q}`);
}

const signMessage = (network, from, ts) => `P2Pal network fee request\nNetwork: ${network}\nAddress: ${from}\nTime: ${ts}`;

async function waitForNative(network, address, required, timeoutMs = 90_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if ((await getNativeRaw(network, address).catch(() => 0n)) >= required) return;
    await new Promise((r) => setTimeout(r, 3000));
  }
  throw new Error('Network fee funding is taking longer than usual. Please try again in a minute.');
}

/**
 * Full withdrawal: prepare gas → pay fee in USDT → send USDT.
 * onStep(step): 'prepare' | 'fund' | 'fee' | 'send' | 'done'
 */
export async function withdrawUsdt({ network, to, amount, onStep = () => {} }) {
  const acc = deriveAccounts(await getMnemonic());
  const account = network === 'tron' ? acc.tron : acc.evm;
  const from = account.address;

  onStep('prepare');
  const ts = Date.now();
  const msg = signMessage(network, from, ts);
  const signature =
    network === 'tron'
      ? await tronWeb().trx.signMessageV2(msg, account.privateKey)
      : await new Wallet(account.privateKey).signMessage(msg);

  const p = await api('/gas/prepare', {
    method: 'POST',
    body: JSON.stringify({ network, from, to, amount: String(amount), ts, signature }),
  });

  onStep('fund');
  await waitForNative(network, from, BigInt(p.requiredNative));

  onStep('fee');
  const feeTx = await transferUsdt(network, account, p.feeAddress, BigInt(p.feeRaw));

  onStep('send');
  const hash = await transferUsdt(network, account, to, toRaw(network, amount));

  onStep('done');
  return { hash, feeTx, fee: p.fee };
}
