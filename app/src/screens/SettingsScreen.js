import React, { useEffect, useState } from 'react';
import { Alert, Switch, View, Text } from 'react-native';
import { Screen, Card, Btn, Muted } from '../components/ui';
import { useWallet } from '../context/WalletContext';
import { biometricAvailable } from '../services/auth';
import { colors } from '../theme';

export default function SettingsScreen({ navigation }) {
  const { addresses, biometric, toggleBiometric, lock, reset } = useWallet();
  const [bioAvail, setBioAvail] = useState(false);

  useEffect(() => { biometricAvailable().then(setBioAvail); }, []);

  const confirmReset = () =>
    Alert.alert(
      'Wallet hatao?',
      'Is phone se wallet delete ho jayega. Seed phrase ke bina paisa WAPAS NAHI milega. Pakka?',
      [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: reset }]
    );

  return (
    <Screen>
      <Card>
        <Muted>EVM address (ETH / BSC / Polygon)</Muted>
        <Text selectable style={{ color: colors.text }}>{addresses?.evm}</Text>
        <Muted style={{ marginTop: 8 }}>TRON address</Muted>
        <Text selectable style={{ color: colors.text }}>{addresses?.tron}</Text>
      </Card>

      {bioAvail && (
        <Card style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ color: colors.text, fontSize: 15 }}>Fingerprint / Face unlock</Text>
          <Switch value={biometric} onValueChange={toggleBiometric} trackColor={{ true: colors.accent }} />
        </Card>
      )}

      <Btn title="Seed Phrase Dekho (Backup)" variant="ghost" onPress={() => navigation.navigate('ShowSeed')} />
      <Btn title="Abhi Lock Karo" variant="ghost" onPress={lock} />
      <View style={{ height: 20 }} />
      <Btn title="Wallet Remove Karo" variant="danger" onPress={confirmReset} />
      <Muted style={{ textAlign: 'center' }}>P2Pal v1.0.0 · Non-custodial wallet</Muted>
    </Screen>
  );
}
