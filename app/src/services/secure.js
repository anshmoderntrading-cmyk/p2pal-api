// All sensitive data stays on the device (iOS Keychain / Android Keystore).
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';

const OPTS = { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY };
const K = {
  mnemonic: 'p2pal.mnemonic',
  pin: 'p2pal.pin',
  addresses: 'p2pal.addresses',
  bio: 'p2pal.biometric',
  attempts: 'p2pal.attempts',
  prefs: 'p2pal.prefs',
  recent: 'p2pal.recent',
};

const get = (k) => SecureStore.getItemAsync(k, OPTS);
const set = (k, v) => SecureStore.setItemAsync(k, v, OPTS);
const del = (k) => SecureStore.deleteItemAsync(k, OPTS);

const toHex = (bytes) => Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');

// PIN hash: salted SHA-256, iterated to slow down brute force
async function hashPin(salt, pin) {
  let h = `${salt}:${pin}:p2pal`;
  for (let i = 0; i < 300; i++) {
    h = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, h + salt);
  }
  return h;
}

export const hasWallet = async () => !!(await get(K.mnemonic));
export const saveMnemonic = (m) => set(K.mnemonic, m);
export async function getMnemonic() {
  const m = await get(K.mnemonic);
  if (!m) throw new Error('Wallet not found');
  return m;
}

export const saveAddresses = (a) => set(K.addresses, JSON.stringify(a));
export const getAddresses = async () => JSON.parse((await get(K.addresses)) || 'null');

export const setBiometric = (on) => set(K.bio, on ? '1' : '0');
export const getBiometric = async () => (await get(K.bio)) === '1';

const DEFAULT_PREFS = { autoLockMs: 60_000, hideBalance: false };
export async function getPrefs() {
  try { return { ...DEFAULT_PREFS, ...JSON.parse((await get(K.prefs)) || '{}') }; } catch { return DEFAULT_PREFS; }
}
export const savePrefs = (p) => set(K.prefs, JSON.stringify(p));

// Recently used withdrawal addresses (for address-poisoning checks)
export async function getRecentAddresses() {
  try { return JSON.parse((await get(K.recent)) || '[]'); } catch { return []; }
}
export async function addRecentAddress(addr) {
  const list = (await getRecentAddresses()).filter((a) => a !== addr);
  await set(K.recent, JSON.stringify([addr, ...list].slice(0, 30)));
}

export async function savePin(pin) {
  const salt = toHex(Crypto.getRandomBytes(16));
  await set(K.pin, `${salt}:${await hashPin(salt, pin)}`);
  await set(K.attempts, JSON.stringify({ count: 0, until: 0 }));
}

const MAX_TRIES = 5;
const LOCK_MS = 60_000;

export async function verifyPin(pin) {
  const st = JSON.parse((await get(K.attempts)) || '{"count":0,"until":0}');
  if (Date.now() < st.until) return { ok: false, lockedFor: Math.ceil((st.until - Date.now()) / 1000) };
  const [salt, hash] = ((await get(K.pin)) || ':').split(':');
  if (salt && (await hashPin(salt, pin)) === hash) {
    await set(K.attempts, JSON.stringify({ count: 0, until: 0 }));
    return { ok: true };
  }
  const count = st.count + 1;
  const until = count >= MAX_TRIES ? Date.now() + LOCK_MS * 2 ** (count - MAX_TRIES) : 0;
  await set(K.attempts, JSON.stringify({ count, until }));
  return { ok: false, attemptsLeft: Math.max(0, MAX_TRIES - count), lockedFor: until ? Math.ceil((until - Date.now()) / 1000) : 0 };
}

export async function wipe() {
  await Promise.all(Object.values(K).map(del));
}
