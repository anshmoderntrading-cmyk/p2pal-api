import React, { useCallback, useLayoutEffect, useState } from 'react';
import { View, Text, Pressable, RefreshControl, FlatList, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Segmented, Muted, Notice } from '../components/ui';
import { NetworkTag } from '../components/TokenIcon';
import { listAds } from '../services/p2pApi';
import { escrowReady } from '../config/env';
import { fmtInr } from '../services/prices';
import { colors, radius } from '../theme';

export default function MarketScreen({ navigation }) {
  // User wants to BUY → show sellers' ads (side='sell'); user SELL → buyers' ads (side='buy')
  const [tab, setTab] = useState('buy');
  const [network, setNetwork] = useState('tron');
  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable hitSlop={10} onPress={() => navigation.navigate('PostAd')} style={{ marginRight: 4 }}>
          <Ionicons name="add-circle" size={26} color={colors.accent} />
        </Pressable>
      ),
    });
  }, [navigation]);

  const load = useCallback(async () => {
    setLoading(true); setErr('');
    try {
      setAds(await listAds(tab === 'buy' ? 'sell' : 'buy', network));
    } catch (e) { setErr(e.message); }
    finally { setLoading(false); }
  }, [tab, network]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const render = ({ item: ad }) => (
    <Pressable onPress={() => navigation.navigate('Order', { ad, takerSide: tab })}>
      {({ pressed }) => (
        <View style={[s.card, pressed && { backgroundColor: colors.cardHi }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={s.avatar}><Text style={{ color: colors.onAccent, fontWeight: '800' }}>{(ad.display_name || 'P')[0].toUpperCase()}</Text></View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={s.name}>{ad.display_name || 'Merchant'}</Text>
                {ad.kyc_status === 'verified' && <Ionicons name="checkmark-circle" size={15} color={colors.blue} />}
              </View>
              <Text style={s.sub}>{ad.trades_done || 0} trades · {ad.pay_methods}</Text>
            </View>
            <NetworkTag network={ad.network} />
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 12 }}>
            <View>
              <Text style={s.price}>{fmtInr(ad.price_inr)}<Text style={s.unit}> / USDT</Text></Text>
              <Text style={s.sub}>Limit {fmtInr(ad.min_inr)} – {fmtInr(ad.max_inr)}</Text>
            </View>
            <View style={[s.btn, { backgroundColor: tab === 'buy' ? colors.accent : colors.danger }]}>
              <Text style={{ color: tab === 'buy' ? colors.onAccent : '#fff', fontWeight: '800' }}>{tab === 'buy' ? 'Buy' : 'Sell'}</Text>
            </View>
          </View>
        </View>
      )}
    </Pressable>
  );

  return (
    <FlatList
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: 20, gap: 12, paddingBottom: 40 }}
      data={ads}
      keyExtractor={(a) => String(a.id)}
      renderItem={render}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.accent} />}
      ListHeaderComponent={
        <View style={{ gap: 12, marginBottom: 4 }}>
          {!escrowReady(network) && (
            <Notice tone="warn">P2P trading is in test setup for this network. You can browse and post ads; on-chain escrow activates once the contract is live.</Notice>
          )}
          <Segmented items={[{ key: 'buy', label: 'Buy USDT' }, { key: 'sell', label: 'Sell USDT' }]} value={tab} onChange={setTab} />
          <Segmented items={[{ key: 'tron', label: 'TRC20' }, { key: 'bsc', label: 'BEP20' }]} value={network} onChange={setNetwork} />
          {!!err && <Text style={{ color: colors.danger }}>{err}</Text>}
        </View>
      }
      ListEmptyComponent={!loading ? (
        <View style={{ alignItems: 'center', marginTop: 60, gap: 10 }}>
          <Ionicons name="storefront-outline" size={44} color={colors.border} />
          <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700' }}>No offers yet</Text>
          <Muted style={{ textAlign: 'center' }}>Be the first — tap + to post an ad.</Muted>
        </View>
      ) : null}
    />
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: 16 },
  avatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  name: { color: colors.text, fontSize: 15, fontWeight: '700' },
  sub: { color: colors.muted, fontSize: 12, marginTop: 2 },
  price: { color: colors.text, fontSize: 20, fontWeight: '800' },
  unit: { color: colors.muted, fontSize: 13, fontWeight: '600' },
  btn: { paddingHorizontal: 22, paddingVertical: 10, borderRadius: 10 },
});
