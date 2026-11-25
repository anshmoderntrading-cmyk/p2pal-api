import { Mnemonic, HDNodeWallet, randomBytes, isAddress, getAddress } from 'ethers';
import { TronWeb } from 'tronweb';

export const EVM_PATH = "m/44'/60'/0'/0/0";
export const TRON_PATH = "m/44'/195'/0'/0/0";

export const normalizeMnemonic = (p) => p.trim().toLowerCase().split(/\s+/).join(' ');

export function generateMnemonic() {
  return Mnemonic.fromEntropy(randomBytes(16)).phrase;
}

export function isValidMnemonic(p) {
  const n = normalizeMnemonic(p);
  const words = n.split(' ').length;
  return (words === 12 || words === 24) && Mnemonic.isValidMnemonic(n);
}

export function deriveAccounts(phrase) {
  const root = HDNodeWallet.fromSeed(Mnemonic.fromPhrase(normalizeMnemonic(phrase)).computeSeed());
  const evm = root.derivePath(EVM_PATH);
  const tronPk = root.derivePath(TRON_PATH).privateKey.slice(2);
  return {
    evm: { address: evm.address, privateKey: evm.privateKey },
    tron: { address: TronWeb.address.fromPrivateKey(tronPk), privateKey: tronPk },
  };
}

export function publicAddresses(phrase) {
  const a = deriveAccounts(phrase);
  return { evm: a.evm.address, tron: a.tron.address };
}

export function isValidAddress(network, addr) {
  if (!addr) return false;
  return network === 'tron' ? TronWeb.isAddress(addr) : isAddress(addr);
}

export const normalizeAddress = (network, a) => (network === 'tron' ? a : getAddress(a));

// T… → TRC20, 0x… → BEP20
export function detectNetwork(addr) {
  const a = (addr || '').trim();
  if (/^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(a)) return 'tron';
  if (/^0x[0-9a-fA-F]{40}$/.test(a)) return 'bsc';
  return null;
}

// QR payloads like "tron:T...", "ethereum:0x...@56?value=1"
export function parseScanned(data) {
  let s = String(data || '').trim();
  s = s.replace(/^[a-z]+:/i, '');
  return s.split(/[?@/]/)[0];
}

export const shortAddr = (a, n = 6) => (a ? `${a.slice(0, n)}…${a.slice(-n + 2)}` : '');
