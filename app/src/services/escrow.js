// On-chain escrow client for P2PalEscrow.sol. Signs with the user's wallet.
// Needs ESCROW_BSC / ESCROW_TRON addresses (set after deploying to testnet).
import { Contract, Wallet, parseUnits, MaxUint256 } from 'ethers';
import { NETWORKS } from '../config/chains';
import { escrowAddress, escrowReady } from '../config/env';
import { getMnemonic } from './secure';
import { deriveAccounts } from './wallet';
import { bscProvider, tronWeb } from './providers';

const ESCROW_ABI = [
  'function createOrder(address buyer,address token,uint256 amount,uint256 fee,uint64 payWindowSeconds) payable returns (uint256)',
  'function markPaid(uint256 id)',
  'function release(uint256 id)',
  'function cancel(uint256 id)',
  'function dispute(uint256 id)',
  'function getOrder(uint256 id) view returns (tuple(address seller,address buyer,address token,uint256 amount,uint256 fee,uint64 payDeadline,uint8 state))',
];
const ERC20_ABI = [
  'function allowance(address,address) view returns (uint256)',
  'function approve(address,uint256) returns (bool)',
];

export { escrowReady };

async function evmWallet() {
  const acc = deriveAccounts(await getMnemonic());
  return new Wallet(acc.evm.privateKey, bscProvider());
}

// Seller: approve USDT to the escrow (BSC), then create the order. Returns on-chain id.
export async function createEscrowOrderBsc({ buyer, amount, fee, payWindowSeconds = 900 }) {
  const n = NETWORKS.bsc;
  const addr = escrowAddress('bsc');
  const wallet = await evmWallet();
  const usdt = new Contract(n.usdt.address, ERC20_ABI, wallet);
  const total = parseUnits(String(amount), n.usdt.decimals) + parseUnits(String(fee), n.usdt.decimals);
  const allowance = await usdt.allowance(wallet.address, addr);
  if (allowance < total) {
    const atx = await usdt.approve(addr, MaxUint256);
    await atx.wait();
  }
  const escrow = new Contract(addr, ESCROW_ABI, wallet);
  const tx = await escrow.createOrder(
    buyer, n.usdt.address,
    parseUnits(String(amount), n.usdt.decimals),
    parseUnits(String(fee), n.usdt.decimals),
    payWindowSeconds
  );
  const receipt = await tx.wait();
  // Parse OrderCreated id from logs
  const parsed = receipt.logs.map((l) => { try { return escrow.interface.parseLog(l); } catch { return null; } }).find((x) => x?.name === 'OrderCreated');
  return { onchainId: parsed ? Number(parsed.args.id) : null, hash: tx.hash };
}

async function tronContract() {
  const acc = deriveAccounts(await getMnemonic());
  const tw = tronWeb(acc.tron.privateKey);
  return { tw, addr: escrowAddress('tron'), usdt: NETWORKS.tron.usdt.address };
}

// Seller (TRON): approve + createOrder.
export async function createEscrowOrderTron({ buyer, amount, fee, payWindowSeconds = 900 }) {
  const { tw, addr, usdt } = await tronContract();
  const total = (parseUnits(String(amount), 6) + parseUnits(String(fee), 6)).toString();
  // approve
  const approve = await tw.transactionBuilder.triggerSmartContract(
    usdt, 'approve(address,uint256)', { feeLimit: 100_000_000 },
    [{ type: 'address', value: addr }, { type: 'uint256', value: total }]
  );
  await tw.trx.sendRawTransaction(await tw.trx.sign(approve.transaction));
  await new Promise((r) => setTimeout(r, 3000));
  // createOrder
  const call = await tw.transactionBuilder.triggerSmartContract(
    addr, 'createOrder(address,address,uint256,uint256,uint64)', { feeLimit: 200_000_000 },
    [
      { type: 'address', value: buyer },
      { type: 'address', value: usdt },
      { type: 'uint256', value: parseUnits(String(amount), 6).toString() },
      { type: 'uint256', value: parseUnits(String(fee), 6).toString() },
      { type: 'uint64', value: payWindowSeconds },
    ]
  );
  const res = await tw.trx.sendRawTransaction(await tw.trx.sign(call.transaction));
  return { onchainId: null, hash: res.txid || call.transaction.txID }; // id read via listener/backend
}

export const createEscrowOrder = (network, args) =>
  network === 'tron' ? createEscrowOrderTron(args) : createEscrowOrderBsc(args);

// Generic single-arg calls: markPaid / release / cancel / dispute
async function callById(network, fn, id) {
  if (network === 'tron') {
    const { tw, addr } = await tronContract();
    const c = await tw.transactionBuilder.triggerSmartContract(
      addr, `${fn}(uint256)`, { feeLimit: 100_000_000 }, [{ type: 'uint256', value: String(id) }]
    );
    const res = await tw.trx.sendRawTransaction(await tw.trx.sign(c.transaction));
    if (!res.result) throw new Error('Transaction rejected');
    return res.txid;
  }
  const escrow = new Contract(escrowAddress('bsc'), ESCROW_ABI, await evmWallet());
  const tx = await escrow[fn](id);
  await tx.wait();
  return tx.hash;
}

export const escrowMarkPaid = (network, id) => callById(network, 'markPaid', id);
export const escrowRelease = (network, id) => callById(network, 'release', id);
export const escrowCancel = (network, id) => callById(network, 'cancel', id);
export const escrowDispute = (network, id) => callById(network, 'dispute', id);
