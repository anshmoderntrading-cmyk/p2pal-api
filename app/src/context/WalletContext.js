import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { AppState } from 'react-native';
import * as secure from '../services/secure';
import { biometricAuth } from '../services/auth';
import { normalizeMnemonic, publicAddresses } from '../services/wallet';
import { registerPush } from '../services/notifications';
import { CHAINS } from '../config/chains';
import { ENV } from '../config/env';

const Ctx = createContext(null);

export function WalletProvider({ children }) {
  const [status, setStatus] = useState('loading'); // loading | none | locked | unlocked
  const [addresses, setAddresses] = useState(null); // { evm, tron } — sirf public
  const [chainKey, setChainKey] = useState('tron');
  const [biometric, setBiometricState] = useState(false);
  const bgAt = useRef(null);

  useEffect(() => {
    (async () => {
      if (!(await secure.hasWallet())) return setStatus('none');
      setAddresses(await secure.getAddresses());
      setBiometricState(await secure.getBiometric());
      setStatus('locked');
    })();
  }, []);

  // Auto-lock: app background me AUTO_LOCK_MS se zyada raha to lock
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s !== 'active') bgAt.current = Date.now();
      else if (bgAt.current && Date.now() - bgAt.current > ENV.AUTO_LOCK_MS) {
        setStatus((st) => (st === 'unlocked' ? 'locked' : st));
      }
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (status === 'unlocked' && addresses) registerPush(addresses);
  }, [status, addresses]);

  const createWallet = useCallback(async (phrase, pin, useBio) => {
    const m = normalizeMnemonic(phrase);
    const addrs = publicAddresses(m);
    await secure.saveMnemonic(m);
    await secure.savePin(pin);
    await secure.saveAddresses(addrs);
    await secure.setBiometric(!!useBio);
    setAddresses(addrs);
    setBiometricState(!!useBio);
    setStatus('unlocked');
  }, []);

  const unlockWithPin = useCallback(async (pin) => {
    const r = await secure.verifyPin(pin);
    if (r.ok) setStatus('unlocked');
    return r;
  }, []);

  const unlockWithBiometric = useCallback(async () => {
    const ok = await biometricAuth('P2Pal unlock karo');
    if (ok) setStatus('unlocked');
    return ok;
  }, []);

  // Har transaction se pehle dobara verify (biometric ya PIN)
  const confirmAction = useCallback(
    async (pin) => {
      if (pin) return (await secure.verifyPin(pin)).ok;
      if (biometric) return biometricAuth('Transaction confirm karo');
      return false;
    },
    [biometric]
  );

  const toggleBiometric = useCallback(async (on) => {
    if (on && !(await biometricAuth('Fingerprint enable karo'))) return false;
    await secure.setBiometric(on);
    setBiometricState(on);
    return true;
  }, []);

  const lock = useCallback(() => setStatus('locked'), []);

  const reset = useCallback(async () => {
    await secure.wipe();
    setAddresses(null);
    setBiometricState(false);
    setStatus('none');
  }, []);

  const chain = CHAINS[chainKey];
  const address = addresses ? (chain.type === 'tron' ? addresses.tron : addresses.evm) : null;

  return (
    <Ctx.Provider
      value={{
        status, addresses, chain, chainKey, setChainKey, address, biometric,
        createWallet, unlockWithPin, unlockWithBiometric, confirmAction, toggleBiometric, lock, reset,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export const useWallet = () => useContext(Ctx);
