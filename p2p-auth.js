// Lightweight wallet-signature auth for P2P write endpoints.
// The caller proves ownership of their address by signing a short message.
// Header: x-p2p-auth = base64(JSON{ address, network, ts, signature })
// Message signed: `P2Pal P2P\n<address>\n<ts>`  (ts within 5 minutes)
import { ethers } from 'ethers';
import { TronWeb } from 'tronweb';

const tw = new TronWeb({ fullHost: 'https://api.trongrid.io' });

export const authMessage = (address, ts) => `P2Pal P2P\n${address}\n${ts}`;

export async function verifyAuth(req) {
  const raw = req.headers['x-p2p-auth'];
  if (!raw) return null;
  let a;
  try {
    a = JSON.parse(Buffer.from(raw, 'base64').toString('utf8'));
  } catch {
    return null;
  }
  const { address, network, ts, signature } = a || {};
  if (!address || !ts || !signature) return null;
  if (Math.abs(Date.now() - Number(ts)) > 5 * 60_000) return null;
  const msg = authMessage(address, ts);
  try {
    if (network === 'tron') {
      const signer = await tw.trx.verifyMessageV2(msg, signature);
      return signer === address ? { address, network } : null;
    }
    const signer = ethers.verifyMessage(msg, signature);
    return signer.toLowerCase() === address.toLowerCase() ? { address: signer, network: 'bsc' } : null;
  } catch {
    return null;
  }
}

// Express middleware: attaches req.user = { address, network } or 401s.
export function requireAuth() {
  return async (req, res, next) => {
    const user = await verifyAuth(req);
    if (!user) return res.status(401).json({ error: 'Authentication required' });
    req.user = user;
    next();
  };
}

export const sameAddr = (a, b) => !!a && !!b && a.toLowerCase() === b.toLowerCase();
