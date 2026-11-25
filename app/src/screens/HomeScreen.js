import React, { useCallback, useState } from 'react';
import { View, Text, Pressable, RefreshControl, ScrollView, Modal, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useWallet } from '../context/WalletContext';
import { CHAIN_LIST } from '../config/chains';
import { getTokens } from '../services/tokens';
import { getBalances } from '../services/balances';
import { getPrices, formatINR, formatPct } from '../services/prices';
import { shortAddr } from '../services/wallet';
import TokenIcon from '../components/TokenIcon';
import { colors } from '../theme';

const fmtBal = (n) => {
  const v = Number(n);
  if (v === 0) return '0';
  return v.toLocaleString('en-IN', { maximumFractionDigits: v < 1 ? 6 : 4 });
};

function Action({ icon, label, onPress }) {
  return (
    <Pressable onPress={onPress} style={s.action}>
      {({ pressed }) => (
        <>
          <View style={[s.actionCircle, pressed && { backgroundColor: colors.cardHi }]}>
            <Ionicons name={icon} size={30} color={colors.text} />
          </View>
          <Text style={s.actionLabel}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

export default function HomeScreen({ navigation }) {
  const { chain, chainKey, setChainKey, address } = useWallet();
  const [tokens, setTokens] = useState([]);
  const [prices, setPrices] = useState({});
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [copied, setCopied] = useState(false);
  const [picker, setPicker] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setErr('');
    try {
      const list = await getTokens(chainKey);
      const [bals, pr] = await Promise.all([
        getBalances(chain, address, list),
        getPrices(list.map((t) => t.coingeckoId)),
      ]);
      setTokens(bals);
      setPrices(pr);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }, [chainKey, address]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const price = (t) => prices[t.coingeckoId] || {};
  const inr = (t) => Number(t.balance) * (price(t).inr || 0);
  const total = tokens.reduce((sum, t) => sum + inr(t), 0);

  const copy = async () => {
    await Clipboard.setStringAsync(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <Pressable hitSlop={12} onPress={() => navigation.navigate('Scan', { from: 'home' })}>
          <Ionicons name="scan-outline" size={30} color={colors.muted} />
        </Pressable>
        <Pressable style={s.pill} onPress={() => setPicker(true)}>
          <Ionicons name="wallet" size={20} color={colors.text} />
          <Text style={s.pillText}>{chain.name}</Text>
          <Ionicons name="chevron-down" size={18} color={colors.muted} />
        </Pressable>
        <View style={{ flexDirection: 'row', gap: 18 }}>
          <Pressable hitSlop={10} onPress={() => navigation.navigate('History')}>
            <Ionicons name="time-outline" size={28} color={colors.muted} />
          </Pressable>
          <Pressable hitSlop={10} onPress={() => navigation.navigate('Settings')}>
            <Ionicons name="settings-outline" size={28} color={colors.muted} />
          </Pressable>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.accent} />}
      >
        {/* Balance */}
        <View style={{ alignItems: 'center', marginTop: 36 }}>
          <Text style={s.balance} adjustsFontSizeToFit numberOfLines={1}>{formatINR(total)}</Text>
          <Pressable onPress={copy} style={s.addrRow}>
            <Text style={s.addr}>{copied ? 'Copied ✓' : shortAddr(address)}</Text>
            {!copied && <Ionicons name="copy-outline" size={16} color={colors.muted} />}
          </Pressable>
        </View>

        {/* Actions */}
        <View style={s.actions}>
          <Action icon="arrow-up" label="Send" onPress={() => navigation.navigate('Send')} />
          <Action icon="arrow-down" label="Receive" onPress={() => navigation.navigate('Receive')} />
          <Action icon="add" label="Add Funds" onPress={() => navigation.navigate('Buy')} />
          {chain.type === 'evm' ? (
            <Action icon="swap-vertical" label="Swap" onPress={() => navigation.navigate('Trade')} />
          ) : (
            <Action icon="trending-up" label="Stake" onPress={() => navigation.navigate('Stake')} />
          )}
        </View>

        {/* Promo banner */}
        <Pressable style={s.banner} onPress={() => navigation.navigate('Buy')}>
          <View style={s.bannerIcon}><Text style={{ fontSize: 22, fontWeight: '900', color: '#04210F' }}>₹</Text></View>
          <Text style={s.bannerText}>UPI se USDT kharido</Text>
          <View style={s.newTag}><Text style={s.newTagText}>NEW</Text></View>
          <View style={{ flex: 1 }} />
          <Ionicons name="chevron-forward" size={22} color={colors.muted} />
        </Pressable>

        {/* Crypto list */}
        <View style={s.sectionRow}>
          <Text style={s.sectionTitle}>Crypto</Text>
          <Text style={{ color: colors.muted, fontSize: 15 }}>{chain.name}</Text>
        </View>
        {!!err && <Text style={{ color: colors.danger, marginHorizontal: 20 }}>{err}</Text>}

        <View style={s.list}>
          {tokens.map((t, i) => {
            const p = price(t);
            const ch = p.inr_24h_change;
            return (
              <Pressable key={t.address || 'native'} onPress={() => navigation.navigate('Send', { token: t })}>
                {({ pressed }) => (
                  <View style={[s.row, i > 0 && s.rowBorder, pressed && { backgroundColor: colors.cardHi }]}>
                    <TokenIcon symbol={t.symbol} />
                    <View style={{ flex: 1, marginLeft: 14 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={s.sym}>{t.symbol}</Text>
                        {!t.featured && <Ionicons name="checkmark-circle" size={18} color={colors.blue} />}
                        {t.featured && (
                          <View style={s.featTag}><Text style={s.featText}>FEATURED</Text></View>
                        )}
                      </View>
                      <Text style={s.price}>
                        {p.inr ? formatINR(p.inr) : '—'}{' '}
                        <Text style={{ color: ch >= 0 ? colors.up : colors.down }}>{formatPct(ch)}</Text>
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={s.bal}>{fmtBal(t.balance)}</Text>
                      <Text style={s.price}>{formatINR(inr(t))}</Text>
                    </View>
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      {/* Chain picker */}
      <Modal visible={picker} transparent animationType="fade" onRequestClose={() => setPicker(false)}>
        <Pressable style={s.overlay} onPress={() => setPicker(false)}>
          <View style={s.sheet}>
            <Text style={[s.sectionTitle, { marginBottom: 8 }]}>Network chuno</Text>
            {CHAIN_LIST.map((c) => (
              <Pressable key={c.key} style={s.sheetRow} onPress={() => { setChainKey(c.key); setPicker(false); }}>
                <TokenIcon symbol={c.symbol} size={40} />
                <Text style={[s.sym, { flex: 1, marginLeft: 14 }]}>{c.name}</Text>
                {chainKey === c.key && <Ionicons name="checkmark-circle" size={24} color={colors.accent} />}
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 8 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.card, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 30 },
  pillText: { color: colors.text, fontSize: 18, fontWeight: '700' },
  balance: { color: colors.text, fontSize: 52, fontWeight: '800', paddingHorizontal: 20 },
  addrRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  addr: { color: colors.muted, fontSize: 17 },
  actions: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 36, paddingHorizontal: 12 },
  action: { alignItems: 'center', width: 82 },
  actionCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  actionLabel: { color: colors.muted, fontSize: 14, marginTop: 10, fontWeight: '600' },
  banner: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.card, marginHorizontal: 20, marginTop: 32, padding: 18, borderRadius: 20 },
  bannerIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  bannerText: { color: colors.text, fontSize: 17, fontWeight: '700' },
  newTag: { backgroundColor: '#123B2C', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  newTagText: { color: colors.accent, fontSize: 12, fontWeight: '800' },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: 20, marginTop: 28, marginBottom: 14 },
  sectionTitle: { color: colors.text, fontSize: 22, fontWeight: '800' },
  list: { backgroundColor: colors.card, marginHorizontal: 20, borderRadius: 22, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 18 },
  rowBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  sym: { color: colors.text, fontSize: 18, fontWeight: '700' },
  price: { color: colors.muted, fontSize: 14, marginTop: 3 },
  bal: { color: colors.text, fontSize: 18, fontWeight: '700' },
  featTag: { backgroundColor: '#123B2C', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  featText: { color: colors.accent, fontSize: 10, fontWeight: '800' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.card, padding: 20, paddingBottom: 36, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  sheetRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
});
