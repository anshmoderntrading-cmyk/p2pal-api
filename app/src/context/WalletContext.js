import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { AppState, Modal, View, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as secure from '../services/secure';
import { biometricAuth } from '../services/auth';
import { normalizeMnemonic, publicAddresses } from '../services/wallet';
import { registerPush } from '../services/notifications';
import PinPad from '../components/PinPad';
import { colors } from '../theme';

const Ctx = createContext(null);

const pinError = (r) => (r.lockedFor ? `Too many attempts. Try again in ${r.lockedFor}s` : `Incorrect PIN · ${r.attemptsLeft} attempts left`);

export function WalletProvider({ children }) {
  const [status, setStatus] = useState('loading'); // loading | none | locked | unlocked
  const [addresses, setAddresses] = useState(null); // public only
  const [biometric, setBiometricState] = useState(false);
  const [prefs, setPrefsState] = useState({ autoLockMs: 60_000, hideBalance: false });
  const [authReq, setAuthReq] = useState(null); // { reason, pinOnly, resolve }
  const bgAt = useRef(null);
  const prefsRef = useRef(prefs);
  prefsRef.current = prefs;

  useEffect(() => {
    (async () => {
      setPrefsState(await secure.getPrefs());
      if (!(await secure.hasWallet())) return setStatus('none');
      setAddresses(await secure.getAddresses());
      setBiometricState(await secure.getBiometric());
      setStatus('locked');
    })();
  }, []);

  // Auto-lock after the app was in background longer than the chosen time
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'background') bgAt.current = Date.now();
      if (s === 'active' && bgAt.current) {
        if (Date.now() - bgAt.current >= prefsRef.current.autoLockMs) {
          setStatus((st) => (st === 'unlocked' ? 'locked' : st));
        }
        bgAt.current = null;
      }
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (status === 'unlocked' && addresses) registerPush(addresses);
  }, [status, addresses]);

  const setPrefs = useCallback(async (patch) => {
    const next = { ...prefsRef.current, ...patch };
    setPrefsState(next);
    await secure.savePrefs(next);
  }, []);

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
    return r.ok ? null : pinError(r);
  }, []);

  const unlockWithBiometric = useCallback(async () => {
    if (await biometricAuth('Unlock P2Pal')) setStatus('unlocked');
  }, []);

  // Ask for biometric / PIN before a sensitive action. Resolves true/false.
  const requestAuth = useCallback(
    async (reason = 'Confirm with your PIN', { pinOnly = false } = {}) => {
      if (biometric && !pinOnly && (await biometricAuth(reason))) return true;
      return new Promise((resolve) => setAuthReq({ reason, resolve }));
    },
    [biometric]
  );

  const finishAuth = (ok) => {
    authReq?.resolve(ok);
    setAuthReq(null);
  };

  const toggleBiometric = useCallback(async (on) => {
    if (on && !(await biometricAuth('Enable biometric unlock'))) return false;
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

  return (
    <Ctx.Provider
      value={{
        status, addresses, biometric, prefs, setPrefs,
        createWallet, unlockWithPin, unlockWithBiometric, requestAuth, toggleBiometric, lock, reset,
      }}
    >
      {children}
      <Modal visible={!!authReq} animationType="slide" onRequestClose={() => finishAuth(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
          <View style={{ alignItems: 'flex-end', padding: 12 }}>
            <Pressable hitSlop={12} onPress={() => finishAuth(false)}>
              <Ionicons name="close" size={28} color={colors.text} />
            </Pressable>
          </View>
          <View style={{ flex: 1, justifyContent: 'center', paddingBottom: 40 }}>
            <PinPad
              title="Enter PIN"
              subtitle={authReq?.reason}
              onComplete={async (pin) => {
                const r = await secure.verifyPin(pin);
                if (r.ok) {
                  finishAuth(true);
                  return null;
                }
                return pinError(r);
              }}
            />
          </View>
        </SafeAreaView>
      </Modal>
    </Ctx.Provider>
  );
}

export const useWallet = () => useContext(Ctx);
