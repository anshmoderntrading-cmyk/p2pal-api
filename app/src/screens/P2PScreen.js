import React, { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { Screen, Btn, Field, Label, Muted, Segmented, Notice } from '../components/ui';
import { useWallet } from '../context/WalletContext';
import { NETWORKS, addressFor } from '../config/chains';
import { P2P_PROVIDERS } from '../services/p2p';
import { colors, radius } from '../theme';

export default function P2PScreen({ navigation }) {
  const { addresses } = useWallet();
  const [side, setSide] = useState('buy');
  const [network, setNetwork] = useState('tron');
  const [amount, setAmount] = useState('');
  const available = P2P_PROVIDERS.filter((p) => p.ready());
  const [provider, setProvider] = useState(available[0]?.key || null);
  const n = NETWORKS[network];
  const p = P2P_PROVIDERS.find((x) => x.key === provider);

  const open = () => {
    if (!p) return;
    WebBrowser.openBrowserAsync(
      p.url({ side, network, address: addressFor(addresses, network), amount: Number(amount) || undefined }),
      { toolbarColor: colors.bg, controlsColor: colors.accent }
    );
  };

  return (
    <Screen>
      <Segmented items={[{ key: 'buy', label: 'Buy USDT' }, { key: 'sell', label: 'Sell USDT' }]} value={side} onChange={setSide} />

      <View style={{ gap: 8 }}>
        <Label>Network</Label>
        <Segmented items={[{ key: 'tron', label: 'TRC20' }, { key: 'bsc', label: 'BEP20' }]} value={network} onChange={setNetwork} />
      </View>

      <View style={{ gap: 8 }}>
        <Label>{side === 'buy' ? 'You pay' : 'You sell'}</Label>
        <Field
          value={amount}
          onChangeText={(t) => setAmount(t.replace(/[^0-9.]/g, ''))}
          placeholder="0"
          keyboardType="decimal-pad"
          right={<Text style={{ color: colors.muted, fontWeight: '700', marginRight: 8 }}>{side === 'buy' ? 'INR' : 'USDT'}</Text>}
        />
      </View>

      <View style={{ gap: 10 }}>
        <Label>Pay with</Label>
        {P2P_PROVIDERS.map((x) => {
          const ready = x.ready();
          const on = provider === x.key;
          return (
            <Pressable
              key={x.key}
              disabled={!ready}
              onPress={() => setProvider(x.key)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: radius.lg, backgroundColor: colors.card, borderWidth: 1.5, borderColor: on ? colors.accent : 'transparent', opacity: ready ? 1 : 0.5 }}
            >
              <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name={x.key === 'custom' ? 'people' : 'card'} size={22} color={colors.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700' }}>{x.name}</Text>
                <Text style={{ color: colors.muted, fontSize: 13, marginTop: 2 }}>{ready ? x.tagline : 'Coming soon'}</Text>
              </View>
              {ready && (
                <View style={{ backgroundColor: colors.cardHi, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
                  <Text style={{ color: colors.textSoft, fontSize: 11, fontWeight: '700' }}>{x.badge}</Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>

      {side === 'buy' ? (
        <Notice tone="info">USDT will be delivered directly to your P2Pal {n.label} address. Payment and KYC are handled securely by the partner.</Notice>
      ) : (
        <Notice tone="info">The partner will show a deposit address. Send USDT to it from Withdraw — INR is paid to your bank or UPI.</Notice>
      )}

      <Btn
        title={p ? `Continue with ${p.name}` : 'P2P is coming soon'}
        icon="open-outline"
        disabled={!p}
        onPress={open}
      />
      {side === 'sell' && (
        <Btn title="Go to Withdraw" variant="secondary" onPress={() => navigation.navigate('Withdraw', { network })} />
      )}
      <Muted style={{ textAlign: 'center', fontSize: 12 }}>P2Pal never holds your funds. Trades are executed by licensed third-party partners.</Muted>
    </Screen>
  );
}
