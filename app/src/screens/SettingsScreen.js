import React, { useEffect, useState } from 'react';
import { Alert, Switch, View, Text, Pressable, ScrollView, StyleSheet, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useWallet } from '../context/WalletContext';
import { biometricAvailable } from '../services/auth';
import { shortAddr } from '../services/wallet';
import { ENV, APP_VERSION } from '../config/env';
import { colors, radius } from '../theme';

const AUTOLOCK = [
  { ms: 0, label: 'Immediately' },
  { ms: 60_000, label: 'After 1 minute' },
  { ms: 300_000, label: 'After 5 minutes' },
  { ms: 900_000, label: 'After 15 minutes' },
];

function Item({ icon, label, value, onPress, right, danger }) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={({ pressed }) => [s.item, pressed && { backgroundColor: colors.cardHi }]}>
      <Ionicons name={icon} size={22} color={danger ? colors.danger : colors.textSoft} />
      <Text style={[s.label, danger && { color: colors.danger }]}>{label}</Text>
      {value ? <Text style={s.value}>{value}</Text> : null}
      {right || (onPress && <Ionicons name="chevron-forward" size={18} color={colors.muted} />)}
    </Pressable>
  );
}

const Group = ({ title, children }) => (
  <View style={{ gap: 8 }}>
    <Text style={s.group}>{title}</Text>
    <View style={s.card}>{children}</View>
  </View>
);

export default function SettingsScreen({ navigation }) {
  const { addresses, biometric, toggleBiometric, prefs, setPrefs, lock, reset, requestAuth } = useWallet();
  const [bioAvail, setBioAvail] = useState(false);
  const [copied, setCopied] = useState('');

  useEffect(() => { biometricAvailable().then(setBioAvail); }, []);

  const copy = async (k, v) => {
    await Clipboard.setStringAsync(v);
    setCopied(k);
    setTimeout(() => setCopied(''), 1500);
  };

  const pickAutoLock = () =>
    Alert.alert('Auto-lock', 'Lock P2Pal when it has been in the background:', [
      ...AUTOLOCK.map((o) => ({ text: o.label, onPress: () => setPrefs({ autoLockMs: o.ms }) })),
      { text: 'Cancel', style: 'cancel' },
    ]);

  const confirmRemove = () =>
    Alert.alert(
      'Remove wallet from this device?',
      'Without your recovery phrase your funds cannot be recovered. Make sure you have it written down.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: async () => { if (await requestAuth('Confirm wallet removal', { pinOnly: true })) reset(); } },
      ]
    );

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={{ padding: 20, gap: 24, paddingBottom: 48 }}>
      <Group title="SECURITY">
        {bioAvail && (
          <Item icon="finger-print" label="Biometric unlock" right={<Switch value={biometric} onValueChange={toggleBiometric} trackColor={{ true: colors.accent }} thumbColor="#fff" />} />
        )}
        <Item icon="timer-outline" label="Auto-lock" value={AUTOLOCK.find((o) => o.ms === prefs.autoLockMs)?.label} onPress={pickAutoLock} />
        <Item icon="keypad-outline" label="Change PIN" onPress={() => navigation.navigate('ChangePin')} />
        <Item icon="key-outline" label="Recovery phrase" onPress={() => navigation.navigate('ShowSeed')} />
        <Item icon="lock-closed-outline" label="Lock now" onPress={lock} />
      </Group>

      <Group title="ADDRESSES">
        <Item icon="copy-outline" label="TRC20 (TRON)" value={copied === 't' ? 'Copied' : shortAddr(addresses?.tron)} onPress={() => copy('t', addresses.tron)} />
        <Item icon="copy-outline" label="BEP20 (BNB)" value={copied === 'b' ? 'Copied' : shortAddr(addresses?.evm)} onPress={() => copy('b', addresses.evm)} />
      </Group>

      <Group title="COMMUNITY">
        {!!ENV.TELEGRAM_URL && <Item icon="paper-plane-outline" label="Telegram channel" onPress={() => Linking.openURL(ENV.TELEGRAM_URL)} />}
        {!!ENV.SUPPORT_URL && <Item icon="chatbubble-ellipses-outline" label="Support" onPress={() => Linking.openURL(ENV.SUPPORT_URL)} />}
        {!!ENV.WEBSITE_URL && <Item icon="globe-outline" label="Website" onPress={() => Linking.openURL(ENV.WEBSITE_URL)} />}
      </Group>

      <Group title="LEGAL">
        {!!ENV.PRIVACY_URL && <Item icon="shield-checkmark-outline" label="Privacy policy" onPress={() => Linking.openURL(ENV.PRIVACY_URL)} />}
        {!!ENV.TERMS_URL && <Item icon="document-text-outline" label="Terms of service" onPress={() => Linking.openURL(ENV.TERMS_URL)} />}
        <Item icon="information-circle-outline" label="Version" value={APP_VERSION} />
      </Group>

      <View style={s.card}>
        <Item icon="trash-outline" label="Remove wallet" danger onPress={confirmRemove} />
      </View>
      <Text style={{ color: colors.muted, textAlign: 'center', fontSize: 12 }}>P2Pal is a self-custody wallet. Only you control your funds.</Text>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  group: { color: colors.muted, fontSize: 12, fontWeight: '800', letterSpacing: 0.8, marginLeft: 4 },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, overflow: 'hidden' },
  item: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingVertical: 15 },
  label: { color: colors.text, fontSize: 16, flex: 1 },
  value: { color: colors.muted, fontSize: 14 },
});
