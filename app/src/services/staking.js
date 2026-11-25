// TRX staking (Stake 2.0): TRX freeze → Energy/Bandwidth + TRON Power milti hai,
// phir votes aapke (ya partner) Super Representative ko jaate hain. SR rewards share karta hai → aapka "cut".
import { formatUnits, parseUnits } from 'ethers';
import { getMnemonic } from './secure';
import { deriveAccounts } from './wallet';
import { tronWeb } from './providers';
import { ENV } from '../config/env';

async function signer() {
  const { tron } = deriveAccounts(await getMnemonic());
  return { tw: tronWeb({ privateKey: tron.privateKey }), address: tron.address };
}

async function broadcast(tw, tx) {
  const signed = await tw.trx.sign(tx);
  const r = await tw.trx.sendRawTransaction(signed);
  if (!r.result) throw new Error(r.code || r.message || 'Broadcast fail');
  return r.txid || signed.txID;
}

export async function getStakeInfo(address) {
  const tw = tronWeb({ address });
  const acc = await tw.trx.getAccount(address);
  const frozen = { ENERGY: 0n, BANDWIDTH: 0n };
  for (const f of acc.frozenV2 || []) {
    const type = f.type || 'BANDWIDTH';
    if (f.amount) frozen[type] = (frozen[type] || 0n) + BigInt(f.amount);
  }
  const unfreezing = (acc.unfrozenV2 || []).map((u) => ({
    amount: formatUnits(BigInt(u.unfreeze_amount || 0), 6),
    readyAt: u.unfreeze_expire_time,
  }));
  const votes = (acc.votes || []).reduce((s, v) => s + Number(v.vote_count), 0);
  return {
    energy: formatUnits(frozen.ENERGY, 6),
    bandwidth: formatUnits(frozen.BANDWIDTH, 6),
    totalFrozen: Number(formatUnits(frozen.ENERGY + frozen.BANDWIDTH, 6)),
    votes,
    unfreezing,
    srConfigured: !!ENV.TRON_SR_ADDRESS,
  };
}

export async function stakeTRX(amountTrx, resource = 'ENERGY', vote = true) {
  const { tw, address } = await signer();
  const sun = Number(parseUnits(String(amountTrx), 6));
  const txid = await broadcast(tw, await tw.transactionBuilder.freezeBalanceV2(sun, resource, address));

  if (vote && ENV.TRON_SR_ADDRESS) {
    // 1 TRX frozen = 1 vote. Saare votes ek SR ko.
    await new Promise((r) => setTimeout(r, 4000)); // freeze confirm hone do
    const info = await getStakeInfo(address);
    const votes = Math.floor(info.totalFrozen);
    if (votes > 0) {
      await broadcast(tw, await tw.transactionBuilder.vote({ [ENV.TRON_SR_ADDRESS]: votes }, address));
    }
  }
  return txid;
}

export async function unstakeTRX(amountTrx, resource = 'ENERGY') {
  const { tw, address } = await signer();
  const sun = Number(parseUnits(String(amountTrx), 6));
  return broadcast(tw, await tw.transactionBuilder.unfreezeBalanceV2(sun, resource, address));
}

// Unstake ke 14 din baad TRX wapas balance me lao
export async function withdrawUnstaked() {
  const { tw, address } = await signer();
  return broadcast(tw, await tw.transactionBuilder.withdrawExpireUnfreeze(address));
}

// SR rewards claim
export async function claimRewards() {
  const { tw, address } = await signer();
  return broadcast(tw, await tw.transactionBuilder.withdrawBlockRewards(address));
}
