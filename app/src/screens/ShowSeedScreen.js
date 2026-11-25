import React, { useState } from 'react';
import { usePreventScreenCapture } from 'expo-screen-capture';
import { Screen, Btn, PinField, Muted, Warn, SeedGrid, ErrorText } from '../components/ui';
import { verifyPin, getMnemonic } from '../services/secure';

export default function ShowSeedScreen() {
  usePreventScreenCapture();
  const [pin, setPin] = useState('');
  const [words, setWords] = useState(null);
  const [err, setErr] = useState('');

  const reveal = async () => {
    const r = await verifyPin(pin); // seed ke liye hamesha PIN (sirf fingerprint nahi)
    setPin('');
    if (!r.ok) return setErr(r.lockedFor ? `${r.lockedFor} sec baad try karo` : 'Galat PIN');
    setWords((await getMnemonic()).split(' '));
  };

  if (words) {
    return (
      <Screen>
        <SeedGrid words={words} />
        <Warn>Ye kisi ko mat dikhana. Jo bhi ye words jaanta hai, wo aapka saara paisa le sakta hai.</Warn>
      </Screen>
    );
  }

  return (
    <Screen>
      <Muted>Seed phrase dekhne ke liye PIN daalo.</Muted>
      <PinField value={pin} onChangeText={(t) => { setPin(t); setErr(''); }} autoFocus />
      <ErrorText>{err}</ErrorText>
      <Btn title="Dikhao" onPress={reveal} disabled={pin.length !== 6} />
    </Screen>
  );
}
