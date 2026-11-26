import React, { useCallback, useState } from 'react';
import { View, Text, Pressable, RefreshControl, FlatList } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { Segmented, Muted } from '../components/ui';
import { NetworkTag } from '../components/TokenIcon';
import { useWallet } from '../context/WalletContext';
import { NETWORKS } from '../config/chains';
import { getHistory, isSameAddress } from '../services/usdt';
import { getGasInfo } from '../services/gas';
import { shortAddr } from '../services/wallet';
import { fmtUsdt } from '../services/prices';
import { colors, radius } from '../theme';

const fmtDate = (t) =>
  new Date(t).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

export default function ActivityScreen({ navigation }) {
  const { addresses } = useWallet();
  const [filter, setFilter] = useState('all');
  const [data, setData] = useState({ items: [], bscAvailable: true });
  const [feeAddr, setFeeAddr] = useState({});
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [h, g] = await Promise.all([getHistory(addresses), getGasInfo()]);
    setData(h);
    setFeeAddr(g.feeAddress || {});
    setLoading(false);
    setLoaded(true);
  }, [addresses]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const items = data.items.filter((x) => filter === 'all' || x.network === filter);

  const render = ({ item: t }) => {
    const isFee = t.dir === 'out' && isSameAddress(t.counterparty, feeAddr[t.network]);
    const icon = isFee ? 'flash' : t.dir === 'in' ? 'arrow-down' : 'arrow-up';
    const title = isFee ? 'Network fee' : t.dir === 'in' ? 'Received' : 'Sent';
    return (
      <Pressable onPress={() => navigation.navigate('TxDetail', { tx: t })}>
        {({ pressed }) => (
          <View style={{ flexDirection: 'row', alignItems: 'center', padding: 14, gap: 14, backgroundColor: pressed ? colors.cardHi : colors.card, borderRadius: radius.md }}>
            <View style={{ width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: t.dir === 'in' ? colors.accentSoft : colors.cardHi }}>
              <Ionicons name={icon} size={20} color={t.dir === 'in' ? colors.accent : colors.textSoft} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700' }}>{title}</Text>
                <NetworkTag network={t.network} />
              </View>
              <Text style={{ color: colors.muted, fontSize: 13, marginTop: 3 }}>
                {isFee ? 'Gas-free transfer' : `${t.dir === 'in' ? 'From' : 'To'} ${shortAddr(t.counterparty)}`} · {fmtDate(t.time)}
              </Text>
            </View>
            <Text style={{ color: t.dir === 'in' ? colors.accent : colors.text, fontSize: 16, fontWeight: '700' }}>
              {t.dir === 'in' ? '+' : '−'}{fmtUsdt(t.amount)}
            </Text>
          </View>
        )}
      </Pressable>
    );
  };

  return (
    <FlatList
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: 20, gap: 10, paddingBottom: 40 }}
      data={items}
      keyExtractor={(t, i) => `${t.hash}-${i}`}
      renderItem={render}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.accent} />}
      ListHeaderComponent={
        <View style={{ gap: 12, marginBottom: 6 }}>
          <Segmented items={[{ key: 'all', label: 'All' }, { key: 'tron', label: 'TRC20' }, { key: 'bsc', label: 'BEP20' }]} value={filter} onChange={setFilter} />
          {!data.bscAvailable && filter !== 'tron' && (
            <Muted style={{ fontSize: 12 }}>BEP20 history is temporarily unavailable.</Muted>
          )}
        </View>
      }
      ListEmptyComponent={
        loaded && !loading ? (
          <View style={{ alignItems: 'center', marginTop: 80, gap: 10 }}>
            <Ionicons name="receipt-outline" size={44} color={colors.border} />
            <Text style={{ color: colors.text, fontSize: 17, fontWeight: '700' }}>No transactions yet</Text>
            <Muted>Your USDT deposits and withdrawals will appear here.</Muted>
          </View>
        ) : null
      }
    />
  );
}
