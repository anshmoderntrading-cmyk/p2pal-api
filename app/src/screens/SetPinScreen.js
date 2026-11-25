import React, { useEffect, useState } from 'react';
import { Switch, View, Text } from 'react-native';
import { Screen, Btn, Title, Muted, PinField, ErrorText } from '../components/ui';
import { useWallet } from '../context/WalletContext';
import { biometricAvailable } from '../services/auth';
import { colors } from '../theme';

const WEAK = ['000000', '111111', '123456', '654321', '121212', '112233'];

export default function SetPinScreen({ route }) {
  const { phrase } = route.params;
  const { createWallet } = useWallet();
  const [pin, setPin] = useState('');
  const [pin2, setPin2] = useState('');
  const [bioAvail, setBioAvail] = useState(false);
  const [bio, setBio] = useState(true);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => { biometricAvailable().then(setBioAvail); }, []);

  const submit = async () => {
    if (pin.length !== 6) return setErr('PIN 6 digit ka hona chahiye');
    if (WEAK.includes(pin)) return setErr('Ye PIN bahut easy hai, dusra rakho');
    if (pin !== pin2) return setErr('Dono PIN match nahi hue');
    setLoading(true);
    // Seed se keys derive hone me 1-2 sec lagte hain
    setTimeout(async () => {
      try {
        await createWallet(phrase, pin, bioAvail && bio);
      } catch (e) {
        setErr(e.message);
        setLoading(false);
      }
    }, 50);
  };

  return (
    <Screen>
      <Title>PIN Set Karo</Title>
      <Muted>App kholne aur har transaction confirm karne ke liye.</Muted>
      <PinField value={pin} onChangeText={(t) => { setPin(t); setErr(''); }} autoFocus />
      <PinField value={pin2} onChangeText={(t) => { setPin2(t); setErr(''); }} placeholder="PIN dobara" />
      {bioAvail && (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ color: colors.text, fontSize: 15 }}>Fingerprint / Face unlock</Text>
          <Switch value={bio} onValueChange={setBio} trackColor={{ true: colors.accent }} />
        </View>
      )}
      <ErrorText>{err}</ErrorText>
      <Btn title="Wallet Banao" onPress={submit} loading={loading} />
    </Screen>
  );
}
