import React, { useCallback, useState } from 'react';
import { View, Text, Pressable, RefreshControl, ScrollView, Image, Linking, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useWallet } from '../context/WalletContext';
import { NETWORK_LIST } from '../config/chains';
import { getUsdtBalances } from '../services/usdt';
import { getUsdtInr, fmtUsd, fmtInr, fmtUsdt } from '../services/prices';
import { ENV } from '../config/env';
import TokenIcon from '../components/TokenIcon';
import { colors, radius } from '../theme';

function Action({ icon, label, onPress, primary }) {
  return (
    <Pressable onPress={onPress} style={{ alignItems: 'center', width: 76 }}>
      {({ pressed }) => (
        <>
          <View style={[s.actionCircle, primary ? s.actionPrimary : s.actionSecondary, pressed && { transform: [{ scale: 0.94 }] }]}>
            <Ionicons name={icon} size={25} color={primary ? colors.onAccent : colors.accent} />
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
  const isEmpty = total === 0 && !offline;
  const hide = prefs.hideBalance;
  const mask = (v) => (hide ? '••••' : v);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <View style={s.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
          <Image source={require('../../assets/logo-mark.png')} style={{ width: 32, height: 32 }} resizeMode="contain" />
          <Text style={{ color: colors.text, fontSize: 21, fontWeight: '800' }}>P2Pal</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Pressable hitSlop={8} style={s.headBtn} onPress={() => Linking.openURL(ENV.TELEGRAM_URL)}>
            <Ionicons name="paper-plane" size={19} color={colors.accent} />
          </Pressable>
          <Pressable hitSlop={8} style={s.headBtn} onPress={() => navigation.navigate('Scan', { from: 'home' })}>
            <Ionicons name="scan-outline" size={21} color={colors.text} />
          </Pressable>
          <Pressable hitSlop={8} style={s.headBtn} onPress={() => navigation.navigate('Settings')}>
            <Ionicons name="settings-outline" size={21} color={colors.text} />
          </Pressable>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 40, gap: 18 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.accent} />}
      >
        {/* Hero balance */}
        <LinearGradient
          colors={['#13302A', '#15202B', colors.card]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={s.hero}
        >
          <Image source={require('../../assets/logo-mark.png')} style={s.heroWatermark} resizeMode="contain" />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={s.heroLabel}>Total balance</Text>
            <Pressable hitSlop={10} onPress={() => setPrefs({ hideBalance: !hide })}>
              <Ionicons name={hide ? 'eye-off-outline' : 'eye-outline'} size={17} color={colors.muted} />
            </Pressable>
          </View>
          <Text style={s.balance} adjustsFontSizeToFit numberOfLines={1}>{mask(fmtUsd(total))}</Text>
          <View style={s.inrChip}>
            <Text style={{ color: colors.accent, fontWeight: '700', fontSize: 13 }}>
              {inr ? mask(`≈ ${fmtInr(total * inr)}`) : 'USDT'}
            </Text>
          </View>

          <View style={s.actions}>
            <Action icon="arrow-down" label="Deposit" primary onPress={() => navigation.navigate('Deposit')} />
            <Action icon="arrow-up" label="Withdraw" onPress={() => navigation.navigate('Withdraw')} />
            <Action icon="swap-horizontal" label="P2P" onPress={() => navigation.navigate('P2P')} />
            <Action icon="time-outline" label="Activity" onPress={() => navigation.navigate('Activity')} />
          </View>
        </LinearGradient>

        {offline && (
          <View style={s.offline}>
            <Ionicons name="cloud-offline-outline" size={18} color={colors.warn} />
            <Text style={{ color: colors.textSoft, flex: 1 }}>Couldn’t load balances. Pull down to retry.</Text>
          </View>
        )}

        {/* Empty-state CTA */}
        {isEmpty && (
          <Pressable onPress={() => navigation.navigate('Deposit')}>
            <LinearGradient colors={[colors.accent, '#0AA876']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.cta}>
              <View style={{ flex: 1 }}>
                <Text style={s.ctaTitle}>Add your first USDT</Text>
                <Text style={s.ctaSub}>Deposit from any wallet or buy with UPI to get started</Text>
              </View>
              <View style={s.ctaArrow}><Ionicons name="arrow-forward" size={22} color={colors.onAccent} /></View>
            </LinearGradient>
          </Pressable>
        )}

        {/* Assets */}
        <View>
          <Text style={s.section}>Assets</Text>
          <View style={s.list}>
            {NETWORK_LIST.map((n, i) => (
              <Pressable key={n.key} onPress={() => navigation.navigate('Deposit', { network: n.key })}>
                {({ pressed }) => (
                  <View style={[s.row, i > 0 && s.rowBorder, pressed && { backgroundColor: colors.cardHi }]}>
                    <TokenIcon network={n.key} size={46} />
                    <View style={{ flex: 1, marginLeft: 14 }}>
                      <Text style={s.sym}>USDT <Text style={{ color: colors.muted, fontWeight: '600' }}>{n.label}</Text></Text>
                      <Text style={s.sub}>{n.name}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end', marginRight: 8 }}>
                      <Text style={s.sym}>{bal[n.key] === null ? '—' : mask(fmtUsdt(bal[n.key]))}</Text>
                      <Text style={s.sub}>{bal[n.key] === null || !inr ? ' ' : mask(fmtInr(Number(bal[n.key]) * inr))}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={colors.muted} />
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
            <Text style={s.infoTitle}>Gas-free transfers</Text>
            <Text style={s.infoSub}>Network fees are paid in USDT. You never need TRX or BNB.</Text>
          </View>
        </View>

        <Pressable onPress={() => navigation.navigate('P2P')}>
          {({ pressed }) => (
            <View style={[s.info, pressed && { backgroundColor: colors.cardHi }]}>
              <View style={s.infoIcon}><Text style={{ color: colors.accent, fontSize: 18, fontWeight: '900' }}>₹</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={s.infoTitle}>Buy USDT with UPI</Text>
                <Text style={s.infoSub}>Fast INR deposits and withdrawals via P2P</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.muted} />
            </View>
          )}
        </Pressable>

        {/* Telegram community */}
        <Pressable onPress={() => Linking.openURL(ENV.TELEGRAM_URL)}>
          {({ pressed }) => (
            <View style={[s.info, pressed && { backgroundColor: colors.cardHi }]}>
              <View style={[s.infoIcon, { backgroundColor: 'rgba(59,130,246,0.14)' }]}>
                <Ionicons name="paper-plane" size={18} color={colors.blue} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.infoTitle}>Join our Telegram</Text>
                <Text style={s.infoSub}>News, support and updates from the P2Pal team</Text>
              </View>
              <Ionicons name="open-outline" size={18} color={colors.muted} />
            </View>
          )}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 10 },
  headBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },

  hero: { borderRadius: radius.xl, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  heroWatermark: { position: 'absolute', right: -24, top: -24, width: 150, height: 150, opacity: 0.06 },
  heroLabel: { color: colors.textSoft, fontSize: 15, fontWeight: '600' },
  balance: { color: colors.text, fontSize: 48, fontWeight: '800', marginTop: 8, letterSpacing: -1.2 },
  inrChip: { marginTop: 8, backgroundColor: colors.accentSoft, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
  actions: { flexDirection: 'row', justifyContent: 'space-between', alignSelf: 'stretch', marginTop: 26 },
  actionCircle: { width: 58, height: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center' },
  actionPrimary: { backgroundColor: colors.accent },
  actionSecondary: { backgroundColor: 'rgba(14,207,142,0.12)', borderWidth: 1, borderColor: 'rgba(14,207,142,0.25)' },
  actionLabel: { color: colors.textSoft, fontSize: 13, marginTop: 9, fontWeight: '600' },

  offline: { flexDirection: 'row', gap: 10, alignItems: 'center', backgroundColor: colors.warnSoft, padding: 12, borderRadius: radius.md },

  cta: { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: radius.lg, padding: 18 },
  ctaTitle: { color: colors.onAccent, fontSize: 17, fontWeight: '800' },
  ctaSub: { color: 'rgba(3,24,15,0.75)', fontSize: 13, marginTop: 3, fontWeight: '500' },
  ctaArrow: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center' },

  section: { color: colors.text, fontSize: 18, fontWeight: '800', marginBottom: 12 },
  list: { backgroundColor: colors.card, borderRadius: radius.lg, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  rowBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  sym: { color: colors.text, fontSize: 17, fontWeight: '700' },
  sub: { color: colors.muted, fontSize: 13, marginTop: 3 },

  info: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: colors.card, borderRadius: radius.lg, padding: 16 },
  infoIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  infoTitle: { color: colors.text, fontWeight: '700', fontSize: 15 },
  infoSub: { color: colors.muted, fontSize: 13, marginTop: 2 },
});
