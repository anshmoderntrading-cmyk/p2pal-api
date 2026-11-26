// Client for the P2Pal in-house P2P market backend (/p2p/*).
// Write calls are authenticated by signing a short message with the user's wallet.
import { Wallet } from 'ethers';
import { ENV } from '../config/env';
import { getMnemonic } from './secure';
import { deriveAccounts } from './wallet';
import { tronWeb } from './providers';

const base = `${ENV.API_BASE_URL}/p2p`;

const authMessage = (address, ts) => `P2Pal P2P\n${address}\n${ts}`;

// Build the x-p2p-auth header for a given network (signs with that network's key)
async function authHeader(network) {
  const acc = deriveAccounts(await getMnemonic());
  const ts = Date.now();
  let address, signature;
  if (network === 'tron') {
    address = acc.tron.address;
    signature = await tronWeb().trx.signMessageV2(authMessage(address, ts), acc.tron.privateKey);
  } else {
    address = acc.evm.address;
    signature = await new Wallet(acc.evm.privateKey).signMessage(authMessage(address, ts));
    network = 'bsc';
  }
  const payload = Buffer.from(JSON.stringify({ address, network, ts, signature })).toString('base64');
  return { 'x-p2p-auth': payload };
}

async function req(path, { method = 'GET', body, network } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (network) Object.assign(headers, await authHeader(network));
  let r;
  try {
    r = await fetch(`${base}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  } catch {
    throw new Error('No internet connection');
  }
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || 'Request failed');
  return j;
}

// ----- Ads -----
export const listAds = (side, network) =>
  req(`/ads?${new URLSearchParams({ ...(side ? { side } : {}), ...(network ? { network } : {}) })}`);
export const createAd = (network, ad) => req('/ads', { method: 'POST', network, body: ad });
export const setAdStatus = (network, id, status) => req(`/ads/${id}/status`, { method: 'POST', network, body: { status } });

// ----- Merchant profile -----
export const getMerchant = (address) => req(`/merchants/${address}`);
export const saveMerchant = (network, profile) => req('/merchants', { method: 'POST', network, body: profile });

// ----- Orders -----
export const createOrder = (network, body) => req('/orders', { method: 'POST', network, body });
export const linkOrder = (network, id, body) => req(`/orders/${id}/link`, { method: 'POST', network, body });
export const myOrders = (network) => req('/orders', { method: 'GET', network });
export const getOrder = (id) => req(`/orders/${id}`);
export const markPaidOffchain = (network, id) => req(`/orders/${id}/paid`, { method: 'POST', network });

// ----- Chat -----
export const getMessages = (network, id) => req(`/orders/${id}/messages`, { method: 'GET', network });
export const sendMessage = (network, id, body) => req(`/orders/${id}/messages`, { method: 'POST', network, body });

// ----- Appeal -----
export const openAppeal = (network, id, reason) => req(`/orders/${id}/appeal`, { method: 'POST', network, body: { reason } });
