import React from 'react';
import { View, Text } from 'react-native';
import { Btn, Muted } from '../components/ui';
import { colors } from '../theme';

export default function WelcomeScreen({ navigation }) {
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, padding: 24, justifyContent: 'space-between' }}>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 }}>
        <View style={{ width: 84, height: 84, borderRadius: 24, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 40, fontWeight: '900', color: '#04210F' }}>P</Text>
        </View>
        <Text style={{ color: colors.text, fontSize: 34, fontWeight: '900' }}>P2Pal</Text>
        <Muted style={{ textAlign: 'center', fontSize: 15 }}>
          Aapki keys, aapka crypto.{'\n'}TRON · BNB Chain · Ethereum · Polygon
        </Muted>
      </View>
      <View style={{ gap: 12, paddingBottom: 24 }}>
        <Btn title="Naya Wallet Banao" onPress={() => navigation.navigate('CreateWallet')} />
        <Btn title="Purana Wallet Import Karo" variant="ghost" onPress={() => navigation.navigate('ImportWallet')} />
      </View>
    </View>
  );
}
