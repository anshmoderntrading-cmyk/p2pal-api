import React from 'react';
import { View, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Btn, Muted } from '../components/ui';
import { colors } from '../theme';

export default function WelcomeScreen({ navigation }) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg, padding: 24, justifyContent: 'space-between' }}>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 20 }}>
        <Image source={require('../../assets/logo-mark.png')} style={{ width: 140, height: 140 }} resizeMode="contain" />
        <Image source={require('../../assets/logo-full.png')} style={{ width: 260, height: 60 }} resizeMode="contain" />
        <Muted style={{ textAlign: 'center', fontSize: 16 }}>
          Aapki keys, aapka crypto.{'\n'}TRON · BNB Chain · Ethereum · Polygon
        </Muted>
      </View>
      <View style={{ gap: 12, paddingBottom: 12 }}>
        <Btn title="Naya Wallet Banao" onPress={() => navigation.navigate('CreateWallet')} />
        <Btn title="Purana Wallet Import Karo" variant="ghost" onPress={() => navigation.navigate('ImportWallet')} />
      </View>
    </SafeAreaView>
  );
}
