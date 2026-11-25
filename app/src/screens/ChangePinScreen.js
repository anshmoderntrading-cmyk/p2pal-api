import React, { useState } from 'react';
import { View, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import PinPad from '../components/PinPad';
import { verifyPin, savePin } from '../services/secure';
import { colors } from '../theme';

const WEAK = ['000000', '111111', '123456', '654321', '121212', '112233', '123123', '999999'];

export default function ChangePinScreen({ navigation }) {
  const [stage, setStage] = useState('old'); // old → new → confirm
  const [next, setNext] = useState(null);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['bottom']}>
      <View style={{ flex: 1, justifyContent: 'center' }}>
        {stage === 'old' && (
          <PinPad
            key="old"
            title="Current PIN"
            subtitle="Enter your current PIN"
            onComplete={async (pin) => {
              const r = await verifyPin(pin);
              if (!r.ok) return r.lockedFor ? `Try again in ${r.lockedFor}s` : 'Incorrect PIN';
              setStage('new');
            }}
          />
        )}
        {stage === 'new' && (
          <PinPad
            key="new"
            title="New PIN"
            subtitle="Choose a new 6-digit PIN"
            onComplete={(pin) => {
              if (WEAK.includes(pin)) return 'This PIN is too easy to guess';
              setNext(pin);
              setStage('confirm');
            }}
          />
        )}
        {stage === 'confirm' && (
          <PinPad
            key="confirm"
            title="Confirm new PIN"
            onComplete={async (pin) => {
              if (pin !== next) {
                setTimeout(() => setStage('new'), 900);
                return 'PINs don’t match';
              }
              await savePin(pin);
              Alert.alert('PIN updated', 'Your new PIN is active.');
              navigation.goBack();
            }}
          />
        )}
      </View>
    </SafeAreaView>
  );
}
