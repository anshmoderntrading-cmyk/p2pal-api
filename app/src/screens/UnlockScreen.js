import React, { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { Btn, PinField, Muted, ErrorText } from '../components/ui';
import { useWallet } from '../context/WalletContext';
import { colors } from '../theme';

export default function UnlockScreen() {
  const { unlockWithPin, unlockWithBiometric, biometric } = useWallet();
  const [pin, setPin] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (biometric) unlockWithBiometric(); }, [biometric]);

  const submit = async (p = pin) => {
    setLoading(true);
    const r = await unlockWithPin(p);
    setLoading(false);
    if (r.ok) return;
    setPin('');
    if (r.lockedFor) setErr(`Bahut galat try. ${r.lockedFor} sec baad try karo.`);
    else setErr(`Galat PIN. ${r.attemptsLeft} try bache.`);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, padding: 24, justifyContent: 'center', gap: 16 }}>
      <Text style={{ color: colors.text, fontSize: 30, fontWeight: '900', textAlign: 'center' }}>P2Pal</Text>
      <Muted style={{ textAlign: 'center' }}>PIN daalo</Muted>
      <PinField
        value={pin}
        autoFocus
        onChangeText={(t) => { setPin(t); setErr(''); if (t.length === 6) submit(t); }}
      />
      <ErrorText>{err}</ErrorText>
      <Btn title="Unlock" onPress={() => submit()} loading={loading} disabled={pin.length !== 6} />
      {biometric && <Btn title="Fingerprint se Unlock" variant="ghost" onPress={unlockWithBiometric} />}
    </View>
  );
}
