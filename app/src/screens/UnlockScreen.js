import React, { useEffect } from 'react';
import { View, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import PinPad from '../components/PinPad';
import { useWallet } from '../context/WalletContext';
import { colors } from '../theme';

export default function UnlockScreen() {
  const { unlockWithPin, unlockWithBiometric, biometric } = useWallet();

  useEffect(() => { if (biometric) unlockWithBiometric(); }, [biometric]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <Image source={require('../../assets/logo-mark.png')} style={{ width: 72, height: 72, alignSelf: 'center', marginBottom: 20 }} resizeMode="contain" />
        <PinPad title="Welcome back" subtitle="Enter your PIN to unlock" onComplete={unlockWithPin} onBiometric={biometric ? unlockWithBiometric : undefined} />
      </View>
    </SafeAreaView>
  );
}
