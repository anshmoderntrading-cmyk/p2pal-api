import React from 'react';
import { View, Image, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Btn } from '../components/ui';
import { colors } from '../theme';

const POINTS = [
  ['shield-checkmark', 'Self-custody', 'Only you hold your keys'],
  ['flash', 'Gas-free transfers', 'Network fees paid in USDT'],
  ['people', 'P2P with INR', 'Buy & sell USDT via UPI'],
];

export default function WelcomeScreen({ navigation }) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg, padding: 24 }}>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Image source={require('../../assets/logo-mark.png')} style={{ width: 112, height: 112 }} resizeMode="contain" />
        <Image source={require('../../assets/logo-full.png')} style={{ width: 230, height: 52, marginTop: 18 }} resizeMode="contain" />
        <Text style={{ color: colors.muted, fontSize: 16, marginTop: 12 }}>The simple USDT wallet</Text>

        <View style={{ marginTop: 44, gap: 18, alignSelf: 'stretch' }}>
          {POINTS.map(([icon, title, sub]) => (
            <View key={title} style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name={icon} size={22} color={colors.accent} />
              </View>
              <View>
                <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700' }}>{title}</Text>
                <Text style={{ color: colors.muted, fontSize: 14 }}>{sub}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>
      <View style={{ gap: 12 }}>
        <Btn title="Create a new wallet" onPress={() => navigation.navigate('CreateWallet')} />
        <Btn title="I already have a wallet" variant="secondary" onPress={() => navigation.navigate('ImportWallet')} />
        <Text style={{ color: colors.muted, fontSize: 12, textAlign: 'center', marginTop: 4 }}>
          By continuing you agree to the Terms of Service
        </Text>
      </View>
    </SafeAreaView>
  );
}
