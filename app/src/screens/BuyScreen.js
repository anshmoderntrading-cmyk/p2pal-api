import React, { useState } from 'react';
import { Pressable, View, Text } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { Screen, Card, Label, Muted, Chips, Warn } from '../components/ui';
import { useWallet } from '../context/WalletContext';
import { CHAIN_LIST } from '../config/chains';
import { PROVIDERS } from '../services/onramp';
import { colors } from '../theme';

export default function BuyScreen() {
  const { chain, chainKey, setChainKey, address } = useWallet();
  const [coin, setCoin] = useState('USDT');

  return (
    <Screen>
      <Label>Network</Label>
      <Chips items={CHAIN_LIST.map((c) => ({ key: c.key, label: c.name }))} value={chainKey} onChange={setChainKey} />
      <Label>Kya kharidna hai</Label>
      <Chips items={[{ key: 'USDT', label: 'USDT' }, { key: chain.symbol, label: chain.symbol }]} value={coin} onChange={setCoin} />
      <Muted>Crypto seedha is address pe aayega: {address}</Muted>

      {PROVIDERS.map((p) => (
        <Pressable
          key={p.key}
          disabled={!p.ready()}
          onPress={() => WebBrowser.openBrowserAsync(p.build({ chainKey, coin, address }))}
        >
          <Card style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', opacity: p.ready() ? 1 : 0.4 }}>
            <View>
              <Text style={{ color: colors.text, fontWeight: '700', fontSize: 16 }}>{p.name}</Text>
              <Muted>{p.ready() ? p.note : 'API key set nahi hai (.env)'}</Muted>
            </View>
            <Text style={{ color: colors.accent, fontSize: 20 }}>›</Text>
          </Card>
        </Pressable>
      ))}

      <Warn>Payment partner ki website pe hota hai. P2Pal aapka bank/UPI data nahi dekhta.</Warn>
    </Screen>
  );
}
