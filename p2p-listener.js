// Watches the escrow contracts and syncs order status into Postgres.
// Reads on-chain events (MarkedPaid, Released, Cancelled, Resolved) and updates
// the matching order by (chain, onchain_id). Runs only when addresses are set.
import { ethers } from 'ethers';
import { TronWeb } from 'tronweb';
import { dbEnabled, q } from './db.js';

const E = process.env;
const BSC_ESCROW = E.BSC_ESCROW_ADDRESS || '';
const TRON_ESCROW = E.TRON_ESCROW_ADDRESS || '';
const BSC_RPC = E.BSC_RPC || 'https://bsc-dataseed.bnbchain.org';
const POLL_MS = Number(E.P2P_LISTENER_MS || 30_000);

const EVENT_STATUS = { MarkedPaid: 'paid', Released: 'released', Cancelled: 'cancelled', Resolved: 'resolved' };

const ESCROW_EVENTS = [
  'event OrderCreated(uint256 indexed id, address indexed seller, address indexed buyer, address token, uint256 amount, uint256 fee, uint64 payDeadline)',
  'event MarkedPaid(uint256 indexed id)',
  'event Released(uint256 indexed id)',
  'event Cancelled(uint256 indexed id)',
  'event Disputed(uint256 indexed id, address by)',
  'event Resolved(uint256 indexed id, bool toBuyer)',
];

async function syncOrder(chain, onchainId, status) {
  // Don't move a terminal order backwards
  await q(
    `UPDATE orders SET status=$1, updated_at=now()
     WHERE chain=$2 AND onchain_id=$3 AND status NOT IN ('released','cancelled','resolved')`,
    [status, chain, Number(onchainId)]
  );
}

// ---------- BSC ----------
let bscProvider, bscContract, bscFromBlock;
async function pollBsc() {
  if (!BSC_ESCROW) return;
  if (!bscProvider) {
    bscProvider = new ethers.JsonRpcProvider(BSC_RPC, 56, { staticNetwork: true });
    bscContract = new ethers.Contract(BSC_ESCROW, ESCROW_EVENTS, bscProvider);
    bscFromBlock = await bscProvider.getBlockNumber();
  }
  const to = await bscProvider.getBlockNumber();
  if (to < bscFromBlock) return;
  for (const name of Object.keys(EVENT_STATUS)) {
    const logs = await bscContract.queryFilter(bscContract.filters[name](), bscFromBlock, to).catch(() => []);
    for (const l of logs) await syncOrder('bsc', l.args.id, EVENT_STATUS[name]);
  }
  bscFromBlock = to + 1;
}

// ---------- TRON ----------
let tron, tronSince;
async function pollTron() {
  if (!TRON_ESCROW) return;
  if (!tron) {
    tron = new TronWeb({
      fullHost: 'https://api.trongrid.io',
      headers: E.TRONGRID_API_KEY ? { 'TRON-PRO-API-KEY': E.TRONGRID_API_KEY } : {},
    });
    tronSince = Date.now() - 60_000;
  }
  for (const name of Object.keys(EVENT_STATUS)) {
    const events = await tron.event
      .getEventsByContractAddress(TRON_ESCROW, { eventName: name, sinceTimestamp: tronSince, onlyConfirmed: true, limit: 50 })
      .catch(() => ({ data: [] }));
    for (const ev of events.data || []) {
      const id = ev.result?.id ?? ev.result?.['0'];
      if (id != null) await syncOrder('tron', id, EVENT_STATUS[name]);
    }
  }
  tronSince = Date.now() - 60_000; // small overlap window
}

export function startP2PListener() {
  if (!dbEnabled) return;
  if (!BSC_ESCROW && !TRON_ESCROW) {
    console.warn('[p2p-listener] no escrow addresses set — listener idle');
    return;
  }
  const tick = async () => {
    try { await pollBsc(); } catch (e) { console.error('[p2p-listener bsc]', e.message); }
    try { await pollTron(); } catch (e) { console.error('[p2p-listener tron]', e.message); }
  };
  setInterval(tick, POLL_MS);
  console.log(`[p2p-listener] running every ${POLL_MS}ms (bsc:${!!BSC_ESCROW} tron:${!!TRON_ESCROW})`);
}
