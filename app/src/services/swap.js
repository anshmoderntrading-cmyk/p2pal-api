// In-app swap (EVM chains) — 1inch API aapke backend ke through jaati hai.
// Backend khud fee (0.5–1%) aur aapka fee-receiver address add karta hai, aur 1inch key secret rehti hai.
import { Wallet, parseUnits, formatUnits } from 'ethers';
import { ENV } from '../config/env';
import { getMnemonic } from './secure';
import { deriveAccounts } from './wallet';
import { evmProvider } from './providers';

const NATIVE = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';
const tokenAddr = (t) => t.address || NATIVE;

async function api(path, params) {
  const r = await fetch(`${ENV.API_BASE_URL}${path}?${new URLSearchParams(params)}`);
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || 'Swap server error');
  return j;
}

export async function getSwapConfig() {
  try {
    return await api('/swap/config', {});
  } catch {
    return { feePercent: null };
  }
}

export async function getQuote(chain, from, to, amountStr) {
  const amount = parseUnits(String(amountStr), from.decimals).toString();
  const q = await api(`/swap/${chain.chainId}/quote`, { src: tokenAddr(from), dst: tokenAddr(to), amount });
  return { amountOut: formatUnits(q.dstAmount, to.decimals) };
}

export async function executeSwap(chain, from, to, amountStr, slippage = 1) {
  const amount = parseUnits(String(amountStr), from.decimals).toString();
  const { evm } = deriveAccounts(await getMnemonic());
  const wallet = new Wallet(evm.privateKey, evmProvider(chain));
  const id = chain.chainId;

  // ERC20 ho to pehle approve (sirf utna hi amount — unlimited approve nahi)
  if (from.address) {
    const { allowance } = await api(`/swap/${id}/allowance`, {
      tokenAddress: from.address,
      walletAddress: wallet.address,
    });
    if (BigInt(allowance) < BigInt(amount)) {
      const ap = await api(`/swap/${id}/approve`, { tokenAddress: from.address, amount });
      const atx = await wallet.sendTransaction({ to: ap.to, data: ap.data, value: BigInt(ap.value || 0) });
      await atx.wait();
    }
  }

  const s = await api(`/swap/${id}/swap`, {
    src: tokenAddr(from),
    dst: tokenAddr(to),
    amount,
    from: wallet.address,
    slippage: String(slippage),
  });
  const tx = await wallet.sendTransaction({
    to: s.tx.to,
    data: s.tx.data,
    value: BigInt(s.tx.value || 0),
    ...(s.tx.gas ? { gasLimit: BigInt(Math.ceil(Number(s.tx.gas) * 1.2)) } : {}),
  });
  return tx.hash;
}
