import React, { useState } from 'react';
import { View, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import PinPad from '../components/PinPad';
import { useWallet } from '../context/WalletContext';
import { biometricAvailable } from '../services/auth';
import { colors } from '../theme';

const WEAK = ['000000', '111111', '123456', '654321', '121212', '112233', '123123', '999999'];

export default function CreatePinScreen({ route }) {
  const { phrase } = route.params;
  const { createWallet } = useWallet();
  const [first, setFirst] = useState(null);

  const finish = async (pin) => {
    const bio = await biometricAvailable();
    const go = (useBio) => setTimeout(() => createWallet(phrase, pin, useBio), 30);
    if (!bio) return go(false);
    Alert.alert('Enable biometric unlock?', 'Use fingerprint or face to unlock P2Pal and confirm transfers.', [
      { text: 'Not now', style: 'cancel', onPress: () => go(false) },
      { text: 'Enable', onPress: () => go(true) },
    ]);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['bottom']}>
      <View style={{ flex: 1, justifyContent: 'center' }}>
        {!first ? (
          <PinPad
            key="a"
            title="Create a PIN"
            subtitle="You’ll use this 6-digit PIN to unlock the app and approve transfers."
            onComplete={(pin) => {
              if (WEAK.includes(pin)) return 'This PIN is too easy to guess';
              setFirst(pin);
              return null;
            }}
          />
        ) : (
          <PinPad
            key="b"
            title="Confirm your PIN"
            subtitle="Enter the same PIN again."
            onComplete={async (pin) => {
              if (pin !== first) {
                setTimeout(() => setFirst(null), 900);
                return 'PINs don’t match. Start again.';
              }
              await finish(pin);
              return null;
            }}
          />
        )}
      </View>
    </SafeAreaView>
  );
}
