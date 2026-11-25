import { Wallet, Contract, parseUnits } from 'ethers';
import { getMnemonic } from './secure';
import { deriveAccounts, isValidAddress, normalizeAddress } from './wallet';
import { evmProvider, tronWeb } from './providers';
import { ERC20_ABI } from './balances';

// Returns tx hash
export async function sendAsset({ chain, token, to, amount }) {
  if (!isValidAddress(chain, to)) throw new Error(`Ye ${chain.name} ka valid address nahi hai`);
  const value = parseUnits(String(amount), token.decimals);
  if (value <= 0n) throw new Error('Amount 0 se zyada hona chahiye');

  const acc = deriveAccounts(await getMnemonic());

  if (chain.type === 'evm') {
    const wallet = new Wallet(acc.evm.privateKey, evmProvider(chain));
    const dest = normalizeAddress(chain, to);
    const tx = token.address
      ? await new Contract(token.address, ERC20_ABI, wallet).transfer(dest, value)
      : await wallet.sendTransaction({ to: dest, value });
    return tx.hash;
  }

  // TRON
  const tw = tronWeb({ privateKey: acc.tron.privateKey });
  if (!token.address) {
    const r = await tw.trx.sendTransaction(to, Number(value));
    if (!r.result) throw new Error(r.code || 'TRX send fail');
    return r.txid || r.transaction?.txID;
  }
  const c = await tw.contract().at(token.address);
  // feeLimit 100 TRX max (energy na ho to TRX burn hota hai)
  return c.transfer(to, value.toString()).send({ feeLimit: 100_000_000 });
}
