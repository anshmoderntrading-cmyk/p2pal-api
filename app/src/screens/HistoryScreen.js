import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, Pressable, RefreshControl } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { Screen, Card, Muted, ErrorText } from '../components/ui';
import { useWallet } from '../context/WalletContext';
import { getHistory } from '../services/history';
import { shortAddr } from '../services/wallet';
import { colors } from '../theme';

export default function HistoryScreen() {
  const { chain, address } = useWallet();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setErr('');
    try {
      setItems(await getHistory(chain, address));
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }, [chain.key, address]);

  useEffect(() => { load(); }, [load]);

  return (
    <Screen refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.accent} />}>
      <Muted>{chain.name} · last 25 transactions</Muted>
      <ErrorText>{err}</ErrorText>
      {!loading && !err && items.length === 0 && <Muted>Abhi koi transaction nahi hai.</Muted>}
      {items.map((t, i) => (
        <Pressable key={`${t.hash}-${i}`} onPress={() => WebBrowser.openBrowserAsync(chain.explorerTx(t.hash))}>
          <Card style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View>
              <Text style={{ color: colors.text, fontWeight: '700' }}>
                {t.dir === 'in' ? '↓ Received' : '↑ Sent'} {t.failed ? '(Failed)' : ''}
              </Text>
              <Muted>{t.dir === 'in' ? 'From' : 'To'} {shortAddr(t.other)}</Muted>
              <Muted>{new Date(t.time).toLocaleString('en-IN')}</Muted>
            </View>
            <Text style={{ color: t.dir === 'in' ? colors.accent : colors.text, fontWeight: '700' }}>
              {t.dir === 'in' ? '+' : '-'}{Number(t.amount).toLocaleString('en-IN', { maximumFractionDigits: 6 })} {t.symbol}
            </Text>
          </Card>
        </Pressable>
      ))}
    </Screen>
  );
}
