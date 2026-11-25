import { Mnemonic, HDNodeWallet, randomBytes, isAddress, getAddress } from 'ethers';
import { TronWeb } from 'tronweb';

export const EVM_PATH = "m/44'/60'/0'/0/0"; // ETH / BSC / Polygon — ek hi address
export const TRON_PATH = "m/44'/195'/0'/0/0"; // Trust Wallet jaisa hi TRON path

export const normalizeMnemonic = (p) => p.trim().toLowerCase().split(/\s+/).join(' ');

// 12-word seed phrase (128-bit entropy, secure random)
export function generateMnemonic() {
  return Mnemonic.fromEntropy(randomBytes(16)).phrase;
}

export function isValidMnemonic(p) {
  const n = normalizeMnemonic(p);
  const words = n.split(' ').length;
  return (words === 12 || words === 24) && Mnemonic.isValidMnemonic(n);
}

// Seed sirf ek baar compute (PBKDF2 slow hai), phir dono paths derive
export function deriveAccounts(phrase) {
  const seed = Mnemonic.fromPhrase(normalizeMnemonic(phrase)).computeSeed();
  const root = HDNodeWallet.fromSeed(seed);
  const evm = root.derivePath(EVM_PATH);
  const tron = root.derivePath(TRON_PATH);
  const tronPk = tron.privateKey.slice(2);
  return {
    evm: { address: evm.address, privateKey: evm.privateKey },
    tron: { address: TronWeb.address.fromPrivateKey(tronPk), privateKey: tronPk },
  };
}

export function publicAddresses(phrase) {
  const a = deriveAccounts(phrase);
  return { evm: a.evm.address, tron: a.tron.address };
}

export function isValidAddress(chain, addr) {
  if (!addr) return false;
  return chain.type === 'tron' ? TronWeb.isAddress(addr) : isAddress(addr);
}

export function normalizeAddress(chain, addr) {
  return chain.type === 'tron' ? addr : getAddress(addr);
}

// QR se aaya data saaf karo: "ethereum:0xabc@56?value=1" → "0xabc", "tron:T..." → "T..."
export function parseScanned(data) {
  let s = String(data || '').trim();
  s = s.replace(/^[a-z]+:/i, '');
  s = s.split(/[?@/]/)[0];
  return s;
}

export const shortAddr = (a) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : '');
