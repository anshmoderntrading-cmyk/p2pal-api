// P2Pal in-house P2P market — REST API.
// Off-chain data only (ads, orders metadata, chat, appeals). Funds are held by
// the on-chain escrow contract; signing happens in the user's wallet. This
// server never holds keys.
import { Router } from 'express';
import { dbEnabled, q } from './db.js';
import { requireAuth, sameAddr } from './p2p-auth.js';

const router = Router();
const NETWORKS = ['tron', 'bsc'];
const bad = (res, m, c = 400) => res.status(c).json({ error: m });
const wrap = (fn) => (req, res) => fn(req, res).catch((e) => {
  console.error('[p2p]', req.path, e.message);
  res.status(500).json({ error: 'Server error' });
});

// Guard: every route needs the DB
router.use((req, res, next) => (dbEnabled ? next() : bad(res, 'P2P market not configured', 503)));

// ---------------- Merchants ----------------
router.get('/merchants/:address', wrap(async (req, res) => {
  const { rows } = await q('SELECT address, network, display_name, upi_id, kyc_status, trades_done, created_at FROM merchants WHERE address=$1', [req.params.address]);
  res.json(rows[0] || null);
}));

router.post('/merchants', requireAuth(), wrap(async (req, res) => {
  const { display_name, upi_id } = req.body || {};
  const { address, network } = req.user;
  await q(
    `INSERT INTO merchants (address, network, display_name, upi_id)
     VALUES ($1,$2,$3,$4)
     ON CONFLICT (address) DO UPDATE SET display_name=EXCLUDED.display_name, upi_id=EXCLUDED.upi_id`,
    [address, network, display_name || null, upi_id || null]
  );
  res.json({ ok: true });
}));

// ---------------- Ads ----------------
router.get('/ads', wrap(async (req, res) => {
  const { side, network } = req.query;
  const cond = ['a.status=$1'];
  const args = ['active'];
  if (side && ['buy', 'sell'].includes(side)) { args.push(side); cond.push(`a.side=$${args.length}`); }
  if (network && NETWORKS.includes(network)) { args.push(network); cond.push(`a.network=$${args.length}`); }
  const { rows } = await q(
    `SELECT a.*, m.display_name, m.trades_done, m.kyc_status
     FROM ads a LEFT JOIN merchants m ON m.address=a.maker_address
     WHERE ${cond.join(' AND ')}
     ORDER BY a.price_inr ${side === 'sell' ? 'ASC' : 'DESC'} LIMIT 100`,
    args
  );
  res.json(rows);
}));

router.post('/ads', requireAuth(), wrap(async (req, res) => {
  const { side, network, price_inr, min_inr = 0, max_inr = 0, available_usdt = 0, pay_methods = 'UPI', terms } = req.body || {};
  if (!['buy', 'sell'].includes(side)) return bad(res, 'bad side');
  if (!NETWORKS.includes(network)) return bad(res, 'bad network');
  if (!(Number(price_inr) > 0)) return bad(res, 'bad price');
  const { rows } = await q(
    `INSERT INTO ads (maker_address, side, network, price_inr, min_inr, max_inr, available_usdt, pay_methods, terms)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
    [req.user.address, side, network, price_inr, min_inr, max_inr, available_usdt, pay_methods, terms || null]
  );
  res.json({ id: rows[0].id });
}));

router.post('/ads/:id/status', requireAuth(), wrap(async (req, res) => {
  const { status } = req.body || {};
  if (!['active', 'paused'].includes(status)) return bad(res, 'bad status');
  const { rowCount } = await q('UPDATE ads SET status=$1 WHERE id=$2 AND maker_address=$3', [status, req.params.id, req.user.address]);
  if (!rowCount) return bad(res, 'not found', 404);
  res.json({ ok: true });
}));

// ---------------- Orders ----------------
// Create an off-chain order record. The app then calls the escrow contract and
// links the on-chain id with /orders/:id/link.
router.post('/orders', requireAuth(), wrap(async (req, res) => {
  const { ad_id, amount_usdt, inr_amount } = req.body || {};
  const { rows: adRows } = await q('SELECT * FROM ads WHERE id=$1 AND status=$2', [ad_id, 'active']);
  const ad = adRows[0];
  if (!ad) return bad(res, 'ad not available', 404);

  // taker is the authed user; maker is the ad owner
  const taker = req.user.address;
  if (sameAddr(taker, ad.maker_address)) return bad(res, 'cannot trade your own ad');
  // ad.side = 'sell' => maker sells USDT => maker is seller, taker is buyer
  const seller = ad.side === 'sell' ? ad.maker_address : taker;
  const buyer = ad.side === 'sell' ? taker : ad.maker_address;

  const { rows: mRows } = await q('SELECT upi_id FROM merchants WHERE address=$1', [seller]);
  const payWindowMin = 15;

  const { rows } = await q(
    `INSERT INTO orders (chain, ad_id, buyer_address, seller_address, amount_usdt, fee_usdt, price_inr, inr_amount, seller_upi, status, pay_deadline)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'created', now() + ($10 || ' minutes')::interval) RETURNING id`,
    [ad.network, ad.id, buyer, seller, amount_usdt, 0, ad.price_inr, inr_amount, mRows[0]?.upi_id || null, String(payWindowMin)]
  );
  res.json({ id: rows[0].id, buyer, seller, network: ad.network });
}));

router.post('/orders/:id/link', requireAuth(), wrap(async (req, res) => {
  const { onchain_id, fee_usdt } = req.body || {};
  if (!(Number(onchain_id) >= 0)) return bad(res, 'bad onchain_id');
  const { rowCount } = await q(
    `UPDATE orders SET onchain_id=$1, fee_usdt=COALESCE($2,fee_usdt), status='funded', updated_at=now()
     WHERE id=$3 AND seller_address=$4`,
    [onchain_id, fee_usdt ?? null, req.params.id, req.user.address]
  );
  if (!rowCount) return bad(res, 'not found', 404);
  res.json({ ok: true });
}));

router.get('/orders', requireAuth(), wrap(async (req, res) => {
  const { rows } = await q(
    `SELECT * FROM orders WHERE buyer_address=$1 OR seller_address=$1 ORDER BY id DESC LIMIT 100`,
    [req.user.address]
  );
  res.json(rows);
}));

router.get('/orders/:id', wrap(async (req, res) => {
  const { rows } = await q('SELECT * FROM orders WHERE id=$1', [req.params.id]);
  res.json(rows[0] || null);
}));

// Buyer marks INR paid (off-chain flag; the on-chain markPaid is a separate wallet tx)
router.post('/orders/:id/paid', requireAuth(), wrap(async (req, res) => {
  const { rowCount } = await q(
    `UPDATE orders SET status='paid', updated_at=now() WHERE id=$1 AND buyer_address=$2 AND status IN ('funded','created')`,
    [req.params.id, req.user.address]
  );
  if (!rowCount) return bad(res, 'not allowed', 403);
  res.json({ ok: true });
}));

// ---------------- Chat ----------------
router.get('/orders/:id/messages', requireAuth(), wrap(async (req, res) => {
  const { rows: o } = await q('SELECT buyer_address, seller_address FROM orders WHERE id=$1', [req.params.id]);
  if (!o[0] || (!sameAddr(o[0].buyer_address, req.user.address) && !sameAddr(o[0].seller_address, req.user.address)))
    return bad(res, 'not a party', 403);
  const { rows } = await q('SELECT id, sender_address, body, image_url, created_at FROM messages WHERE order_id=$1 ORDER BY id ASC LIMIT 500', [req.params.id]);
  res.json(rows);
}));

router.post('/orders/:id/messages', requireAuth(), wrap(async (req, res) => {
  const { body, image_url } = req.body || {};
  if (!body && !image_url) return bad(res, 'empty message');
  const { rows: o } = await q('SELECT buyer_address, seller_address FROM orders WHERE id=$1', [req.params.id]);
  if (!o[0] || (!sameAddr(o[0].buyer_address, req.user.address) && !sameAddr(o[0].seller_address, req.user.address)))
    return bad(res, 'not a party', 403);
  // NOTE: image_url should be a URL from object storage (S3/Cloudinary). Wire
  // an /upload endpoint before production; base64 payloads are rejected here.
  if (image_url && image_url.startsWith('data:')) return bad(res, 'upload images to storage first');
  const { rows } = await q(
    'INSERT INTO messages (order_id, sender_address, body, image_url) VALUES ($1,$2,$3,$4) RETURNING id, created_at',
    [req.params.id, req.user.address, body || null, image_url || null]
  );
  res.json(rows[0]);
}));

// ---------------- Appeals ----------------
router.post('/orders/:id/appeal', requireAuth(), wrap(async (req, res) => {
  const { reason } = req.body || {};
  const { rows: o } = await q('SELECT buyer_address, seller_address FROM orders WHERE id=$1', [req.params.id]);
  if (!o[0] || (!sameAddr(o[0].buyer_address, req.user.address) && !sameAddr(o[0].seller_address, req.user.address)))
    return bad(res, 'not a party', 403);
  await q('UPDATE orders SET status=$1, updated_at=now() WHERE id=$2', ['disputed', req.params.id]);
  const { rows } = await q(
    'INSERT INTO appeals (order_id, opened_by, reason) VALUES ($1,$2,$3) RETURNING id',
    [req.params.id, req.user.address, reason || null]
  );
  res.json({ id: rows[0].id });
}));

export default router;
