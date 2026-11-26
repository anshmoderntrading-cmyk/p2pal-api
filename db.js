// Postgres pool + schema for the P2Pal in-house P2P market.
// On Render, set DATABASE_URL to the Postgres connection string.
import pg from 'pg';

const { Pool } = pg;
const url = process.env.DATABASE_URL || '';

export const dbEnabled = !!url;

export const pool = dbEnabled
  ? new Pool({
      connectionString: url,
      // Render managed Postgres requires SSL; local may not.
      ssl: url.includes('localhost') ? false : { rejectUnauthorized: false },
      max: 5,
    })
  : null;

export const q = (text, params) => pool.query(text, params);

const SCHEMA = `
CREATE TABLE IF NOT EXISTS merchants (
  address      TEXT PRIMARY KEY,
  network      TEXT NOT NULL,                 -- bsc | tron (address type)
  display_name TEXT,
  upi_id       TEXT,
  kyc_status   TEXT NOT NULL DEFAULT 'none',  -- none | pending | verified | rejected
  trades_done  INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ads (
  id             BIGSERIAL PRIMARY KEY,
  maker_address  TEXT NOT NULL,
  side           TEXT NOT NULL,               -- buy | sell (maker's side)
  network        TEXT NOT NULL,               -- tron | bsc
  price_inr      NUMERIC(18,2) NOT NULL,      -- INR per USDT
  min_inr        NUMERIC(18,2) NOT NULL DEFAULT 0,
  max_inr        NUMERIC(18,2) NOT NULL DEFAULT 0,
  available_usdt NUMERIC(24,6) NOT NULL DEFAULT 0,
  pay_methods    TEXT NOT NULL DEFAULT 'UPI',
  terms          TEXT,
  status         TEXT NOT NULL DEFAULT 'active', -- active | paused
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ads_lookup ON ads (status, side, network);

CREATE TABLE IF NOT EXISTS orders (
  id             BIGSERIAL PRIMARY KEY,
  onchain_id     BIGINT,                      -- escrow order id, set after on-chain createOrder
  chain          TEXT NOT NULL,               -- tron | bsc
  ad_id          BIGINT REFERENCES ads(id),
  buyer_address  TEXT NOT NULL,
  seller_address TEXT NOT NULL,
  amount_usdt    NUMERIC(24,6) NOT NULL,
  fee_usdt       NUMERIC(24,6) NOT NULL DEFAULT 0,
  price_inr      NUMERIC(18,2) NOT NULL,
  inr_amount     NUMERIC(18,2) NOT NULL,
  seller_upi     TEXT,
  status         TEXT NOT NULL DEFAULT 'created', -- created|funded|paid|released|cancelled|disputed|resolved
  pay_deadline   TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS orders_party ON orders (buyer_address, seller_address);
CREATE UNIQUE INDEX IF NOT EXISTS orders_onchain ON orders (chain, onchain_id) WHERE onchain_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS messages (
  id             BIGSERIAL PRIMARY KEY,
  order_id       BIGINT NOT NULL REFERENCES orders(id),
  sender_address TEXT NOT NULL,
  body           TEXT,
  image_url      TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS messages_order ON messages (order_id, id);

CREATE TABLE IF NOT EXISTS appeals (
  id          BIGSERIAL PRIMARY KEY,
  order_id    BIGINT NOT NULL REFERENCES orders(id),
  opened_by   TEXT NOT NULL,
  reason      TEXT,
  status      TEXT NOT NULL DEFAULT 'open',  -- open | resolved
  resolution  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS upi_blacklist (
  upi_id     TEXT PRIMARY KEY,
  reason     TEXT,
  added_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
`;

export async function initDb() {
  if (!dbEnabled) {
    console.warn('[db] DATABASE_URL not set — P2P market disabled');
    return false;
  }
  await pool.query(SCHEMA);
  console.log('[db] P2P schema ready');
  return true;
}
