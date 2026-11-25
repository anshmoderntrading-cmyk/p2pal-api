import React, { useCallback, useState } from 'react';
import { View, Text, Pressable, RefreshControl, ScrollView, Image, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useWallet } from '../context/WalletContext';
import { NETWORK_LIST } from '../config/chains';
import { getUsdtBalances } from '../services/usdt';
import { getUsdtInr, fmtUsd, fmtInr, fmtUsdt } from '../services/prices';
import TokenIcon from '../components/TokenIcon';
import { colors, radius } from '../theme';

function Action({ icon, label, onPress, primary }) {
  return (
    <Pressable onPress={onPress} style={{ alignItems: 'center', width: 78 }}>
      {({ pressed }) => (
        <>
          <View style={[s.actionCircle, primary && { backgroundColor: colors.accent }, pressed && { opacity: 0.8 }]}>
            <Ionicons name={icon} size={26} color={primary ? colors.onAccent : colors.text} />
          </View>
          <Text style={s.actionLabel}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

export default function HomeScreen({ navigation }) {
  const { addresses, prefs, setPrefs } = useWallet();
  const [bal, setBal] = useState({ tron: null, bsc: null });
  const [inr, setInr] = useState(null);
  const [loading, setLoading] = useState(false);
  const [offline, setOffline] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [b, rate] = await Promise.all([getUsdtBalances(addresses), getUsdtInr()]);
    setBal(b);
    setInr(rate);
    setOffline(b.tron === null && b.bsc === null);
    setLoading(false);
  }, [addresses]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const total = Number(bal.tron || 0) + Number(bal.bsc || 0);
  const hide = prefs.hideBalance;
  const mask = (v) => (hide ? '••••••' : v);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <View style={s.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Image source={require('../../assets/logo-mark.png')} style={{ width: 34, height: 34 }} resizeMode="contain" />
          <Text style={{ color: colors.text, fontSize: 22, fontWeight: '800' }}>P2Pal</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <Pressable hitSlop={8} style={s.headBtn} onPress={() => navigation.navigate('Scan', { from: 'home' })}>
            <Ionicons name="scan-outline" size={22} color={colors.text} />
          </Pressable>
          <Pressable hitSlop={8} style={s.headBtn} onPress={() => navigation.navigate('Settings')}>
            <Ionicons name="settings-outline" size={22} color={colors.text} />
          </Pressable>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 40, gap: 22 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.accent} />}
      >
        {/* Balance */}
        <View style={s.balanceCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ color: colors.muted, fontSize: 15, fontWeight: '600' }}>Total balance</Text>
            <Pressable hitSlop={10} onPress={() => setPrefs({ hideBalance: !hide })}>
              <Ionicons name={hide ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.muted} />
            </Pressable>
          </View>
          <Text style={s.balance} adjustsFontSizeToFit numberOfLines={1}>{mask(fmtUsd(total))}</Text>
          <Text style={{ color: colors.muted, fontSize: 15 }}>{inr ? mask(`≈ ${fmtInr(total * inr)}`) : ' '}</Text>

          <View style={s.actions}>
            <Action icon="arrow-down" label="Deposit" primary onPress={() => navigation.navigate('Deposit')} />
            <Action icon="arrow-up" label="Withdraw" onPress={() => navigation.navigate('Withdraw')} />
            <Action icon="swap-horizontal" label="P2P" onPress={() => navigation.navigate('P2P')} />
            <Action icon="time-outline" label="Activity" onPress={() => navigation.navigate('Activity')} />
          </View>
        </View>

        {offline && (
          <View style={s.offline}>
            <Ionicons name="cloud-offline-outline" size={18} color={colors.warn} />
            <Text style={{ color: colors.textSoft, flex: 1 }}>Couldn’t load balances. Pull down to retry.</Text>
          </View>
        )}

        {/* Assets */}
        <View>
          <Text style={s.section}>Assets</Text>
          <View style={s.list}>
            {NETWORK_LIST.map((n, i) => (
              <Pressable key={n.key} onPress={() => navigation.navigate('Deposit', { network: n.key })}>
                {({ pressed }) => (
                  <View style={[s.row, i > 0 && s.rowBorder, pressed && { backgroundColor: colors.cardHi }]}>
                    <TokenIcon network={n.key} />
                    <View style={{ flex: 1, marginLeft: 14 }}>
                      <Text style={s.sym}>USDT <Text style={{ color: colors.muted, fontWeight: '600' }}>{n.label}</Text></Text>
                      <Text style={s.sub}>{n.name}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={s.sym}>{bal[n.key] === null ? '—' : mask(fmtUsdt(bal[n.key]))}</Text>
                      <Text style={s.sub}>{bal[n.key] === null || !inr ? ' ' : mask(fmtInr(Number(bal[n.key]) * inr))}</Text>
                    </View>
                  </View>
                )}
              </Pressable>
            ))}
          </View>
        </View>

        {/* Gas-free info */}
        <View style={s.info}>
          <View style={s.infoIcon}><Ionicons name="flash" size={20} color={colors.accent} /></View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.text, fontWeight: '700', fontSize: 15 }}>Gas-free transfers</Text>
            <Text style={{ color: colors.muted, fontSize: 13, marginTop: 2 }}>Network fees are paid in USDT. You never need TRX or BNB.</Text>
          </View>
        </View>

        <Pressable style={s.info} onPress={() => navigation.navigate('P2P')}>
          <View style={s.infoIcon}><Text style={{ color: colors.accent, fontSize: 18, fontWeight: '900' }}>₹</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.text, fontWeight: '700', fontSize: 15 }}>Buy USDT with UPI</Text>
            <Text style={{ color: colors.muted, fontSize: 13, marginTop: 2 }}>Fast INR deposits and withdrawals via P2P</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.muted} />
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 10 },
  headBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  balanceCard: { backgroundColor: colors.card, borderRadius: radius.xl, padding: 22, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  balance: { color: colors.text, fontSize: 46, fontWeight: '800', marginTop: 6, letterSpacing: -1 },
  actions: { flexDirection: 'row', justifyContent: 'space-between', alignSelf: 'stretch', marginTop: 24 },
  actionCircle: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.cardHi, alignItems: 'center', justifyContent: 'center' },
  actionLabel: { color: colors.textSoft, fontSize: 13, marginTop: 8, fontWeight: '600' },
  offline: { flexDirection: 'row', gap: 10, alignItems: 'center', backgroundColor: colors.warnSoft, padding: 12, borderRadius: radius.md },
  section: { color: colors.text, fontSize: 18, fontWeight: '800', marginBottom: 12 },
  list: { backgroundColor: colors.card, borderRadius: radius.lg, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  rowBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  sym: { color: colors.text, fontSize: 17, fontWeight: '700' },
  sub: { color: colors.muted, fontSize: 13, marginTop: 3 },
  info: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: colors.card, borderRadius: radius.lg, padding: 16 },
  infoIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
});
