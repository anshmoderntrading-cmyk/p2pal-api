import React, { useCallback, useLayoutEffect, useState } from 'react';
import { View, Text, Pressable, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as Clipboard from 'expo-clipboard';
import { Screen, Card, Chips, Muted, ErrorText } from '../components/ui';
import { useWallet } from '../context/WalletContext';
import { CHAIN_LIST } from '../config/chains';
import { getTokens } from '../services/tokens';
import { getBalances } from '../services/balances';
import { getPrices, formatINR } from '../services/prices';
import { shortAddr } from '../services/wallet';
import { colors } from '../theme';

const fmt = (n) => Number(n).toLocaleString('en-IN', { maximumFractionDigits: 6 });

export default function HomeScreen({ navigation }) {
  const { chain, chainKey, setChainKey, address } = useWallet();
  const [tokens, setTokens] = useState([]);
  const [prices, setPrices] = useState({});
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [copied, setCopied] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable onPress={() => navigation.navigate('Settings')} hitSlop={12}>
          <Text style={{ color: colors.text, fontSize: 22 }}>⚙︎</Text>
        </Pressable>
      ),
    });
  }, [navigation]);

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

  const inr = (t) => Number(t.balance) * (prices[t.coingeckoId]?.inr || 0);
  const total = tokens.reduce((s, t) => s + inr(t), 0);

  const copy = async () => {
    await Clipboard.setStringAsync(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const actions = [
    { key: 'Send', icon: '↑', label: 'Send' },
    { key: 'Receive', icon: '↓', label: 'Receive' },
    chain.type === 'evm' && { key: 'Swap', icon: '⇄', label: 'Swap' },
    { key: 'Buy', icon: '₹', label: 'Buy' },
    chain.type === 'tron' && { key: 'Stake', icon: '◎', label: 'Stake' },
    { key: 'History', icon: '≡', label: 'History' },
  ].filter(Boolean);

  return (
    <Screen refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.accent} />}>
      <Chips items={CHAIN_LIST.map((c) => ({ key: c.key, label: c.name }))} value={chainKey} onChange={setChainKey} />

      <Card style={{ alignItems: 'center', paddingVertical: 24 }}>
        <Muted>Total Balance · {chain.name}</Muted>
        <Text style={{ color: colors.text, fontSize: 34, fontWeight: '900' }}>{formatINR(total)}</Text>
        <Pressable onPress={copy}>
          <Muted>{copied ? 'Copied ✓' : `${shortAddr(address)}  ⧉`}</Muted>
        </Pressable>
      </Card>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 }}>
        {actions.map((a) => (
          <Pressable key={a.key} onPress={() => navigation.navigate(a.key)} style={{ width: '31%', alignItems: 'center', gap: 6 }}>
            <View style={{ width: 54, height: 54, borderRadius: 27, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: colors.accent, fontSize: 22, fontWeight: '800' }}>{a.icon}</Text>
            </View>
            <Text style={{ color: colors.text, fontSize: 13 }}>{a.label}</Text>
          </Pressable>
        ))}
      </View>

      <ErrorText>{err}</ErrorText>

      {tokens.map((t) => (
        <Pressable key={t.address || 'native'} onPress={() => navigation.navigate('Send', { token: t })}>
          <Card style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View>
              <Text style={{ color: colors.text, fontWeight: '700', fontSize: 16 }}>
                {t.symbol} {t.featured ? '⭐' : ''}
              </Text>
              <Muted>{t.name}</Muted>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ color: colors.text, fontWeight: '700' }}>{fmt(t.balance)}</Text>
              <Muted>{formatINR(inr(t))}</Muted>
            </View>
          </Card>
        </Pressable>
      ))}
    </Screen>
  );
}
