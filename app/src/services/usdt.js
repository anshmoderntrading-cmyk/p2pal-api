// USDT balances, history and transfers on TRC20 + BEP20.
import { Contract, Wallet, formatUnits, parseUnits } from 'ethers';
import { TronWeb } from 'tronweb';
import { NETWORKS } from '../config/chains';
import { ENV } from '../config/env';
import { bscProvider, tronWeb, tronHeaders } from './providers';

const ERC20 = [
  'function balanceOf(address) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
];

async function tronUsdt(address) {
  const tw = tronWeb();
  const r = await tw.transactionBuilder.triggerConstantContract(
    NETWORKS.tron.usdt.address, 'balanceOf(address)', {}, [{ type: 'address', value: address }], address
  );
  return BigInt('0x' + (r.constant_result?.[0] || '0'));
}

export async function getNativeRaw(network, address) {
  if (network === 'tron') return BigInt(await tronWeb().trx.getBalance(address));
  return bscProvider().getBalance(address);
}

export const NATIVE_DECIMALS = { tron: 6, bsc: 18 };

// Native coin balances used for network fees: { tron: '25.4', bsc: '0.003' } — failed network returns null
export async function getNativeBalances(addresses) {
  const [tron, bsc] = await Promise.allSettled([getNativeRaw('tron', addresses.tron), getNativeRaw('bsc', addresses.evm)]);
  return {
    tron: tron.status === 'fulfilled' ? formatUnits(tron.value, 6) : null,
    bsc: bsc.status === 'fulfilled' ? formatUnits(bsc.value, 18) : null,
  };
}

/**
 * Estimated network fee (raw TRX sun / BNB wei) for sending USDT directly from the wallet.
 * Includes a 15% safety buffer. Accounts for free/staked TRON energy and bandwidth.
 */
export async function estimateNativeFee(network, from, to, rawAmount) {
  if (network === 'tron') {
    const tw = tronWeb();
    const [sim, res, params] = await Promise.all([
      tw.transactionBuilder.triggerConstantContract(
        NETWORKS.tron.usdt.address, 'transfer(address,uint256)', {},
        [{ type: 'address', value: to }, { type: 'uint256', value: rawAmount.toString() }], from
      ),
      tw.trx.getAccountResources(from).catch(() => ({})),
      tw.trx.getChainParameters(),
    ]);
    const energyUsed = BigInt(sim.energy_used || 65000);
    const energyFee = BigInt(params.find((p) => p.key === 'getEnergyFee')?.value || 210); // sun per energy
    const freeEnergy = BigInt(Math.max(0, (res.EnergyLimit || 0) - (res.EnergyUsed || 0)));
    const needEnergy = energyUsed > freeEnergy ? energyUsed - freeEnergy : 0n;
    const freeBw = (res.freeNetLimit || 0) - (res.freeNetUsed || 0) + (res.NetLimit || 0) - (res.NetUsed || 0);
    const bwCost = freeBw >= 350 ? 0n : 350n * 1000n; // ~350 bytes at 1000 sun/byte
    return ((needEnergy * energyFee + bwCost) * 115n) / 100n;
  }
  const p = bscProvider();
  const data = new Contract(NETWORKS.bsc.usdt.address, ERC20).interface.encodeFunctionData('transfer', [to, rawAmount]);
  const [gas, feeData] = await Promise.all([
    p.estimateGas({ from, to: NETWORKS.bsc.usdt.address, data }),
    p.getFeeData(),
  ]);
  const price = feeData.gasPrice || 1_000_000_000n;
  return (gas * price * 115n) / 100n;
}

export const fmtNative = (network, raw) => {
  const v = Number(formatUnits(raw, NATIVE_DECIMALS[network]));
  return v.toLocaleString('en-US', { maximumFractionDigits: network === 'tron' ? 2 : 6 });
};

// { tron: '12.50', bsc: '0.00' } — failed network returns null
export async function getUsdtBalances(addresses) {
  const [tron, bsc] = await Promise.allSettled([
    tronUsdt(addresses.tron),
    new Contract(NETWORKS.bsc.usdt.address, ERC20, bscProvider()).balanceOf(addresses.evm),
  ]);
  return {
    tron: tron.status === 'fulfilled' ? formatUnits(tron.value, 6) : null,
    bsc: bsc.status === 'fulfilled' ? formatUnits(bsc.value, 18) : null,
  };
}

// Sign and broadcast a USDT transfer. Returns tx hash.
export async function transferUsdt(network, account, to, rawAmount) {
  if (network === 'tron') {
    const tw = tronWeb(account.privateKey);
    const { transaction, result } = await tw.transactionBuilder.triggerSmartContract(
      NETWORKS.tron.usdt.address,
      'transfer(address,uint256)',
      { feeLimit: 60_000_000 },
      [{ type: 'address', value: to }, { type: 'uint256', value: rawAmount.toString() }],
      account.address
    );
    if (!result?.result) throw new Error('Could not build transaction');
    const signed = await tw.trx.sign(transaction);
    const r = await tw.trx.sendRawTransaction(signed);
    if (!r.result) throw new Error(r.code ? `Network rejected: ${r.code}` : 'Network rejected the transaction');
    return signed.txID;
  }
  const wallet = new Wallet(account.privateKey, bscProvider());
  const tx = await new Contract(NETWORKS.bsc.usdt.address, ERC20, wallet).transfer(to, rawAmount);
  return tx.hash;
}

export const toRaw = (network, amount) => parseUnits(String(amount), NETWORKS[network].usdt.decimals);

// ---------- History ----------
async function tronHistory(address) {
  const r = await fetch(
    `https://api.trongrid.io/v1/accounts/${address}/transactions/trc20?limit=40&contract_address=${NETWORKS.tron.usdt.address}`,
    { headers: tronHeaders }
  );
  const j = await r.json();
  return (j.data || []).map((x) => ({
    network: 'tron',
    hash: x.transaction_id,
    amount: formatUnits(BigInt(x.value), 6),
    dir: x.from === address ? 'out' : 'in',
    counterparty: x.from === address ? x.to : x.from,
    time: x.block_timestamp,
  }));
}

async function bscHistory(address) {
  if (!ENV.ETHERSCAN_API_KEY) return [];
  const r = await fetch(
    `https://api.etherscan.io/v2/api?chainid=56&module=account&action=tokentx&contractaddress=${NETWORKS.bsc.usdt.address}&address=${address}&sort=desc&page=1&offset=40&apikey=${ENV.ETHERSCAN_API_KEY}`
  );
  const j = await r.json();
  const me = address.toLowerCase();
  return (Array.isArray(j.result) ? j.result : []).map((x) => ({
    network: 'bsc',
    hash: x.hash,
    amount: formatUnits(x.value, 18),
    dir: x.from.toLowerCase() === me ? 'out' : 'in',
    counterparty: x.from.toLowerCase() === me ? x.to : x.from,
    time: Number(x.timeStamp) * 1000,
  }));
}

export async function getHistory(addresses) {
  const [t, b] = await Promise.allSettled([tronHistory(addresses.tron), bscHistory(addresses.evm)]);
  const list = [...(t.status === 'fulfilled' ? t.value : []), ...(b.status === 'fulfilled' ? b.value : [])];
  return {
    items: list.sort((a, b2) => b2.time - a.time),
    bscAvailable: !!ENV.ETHERSCAN_API_KEY && b.status === 'fulfilled',
  };
}

export const isSameAddress = (a, b) => !!a && !!b && a.toLowerCase() === b.toLowerCase();
export { TronWeb };
