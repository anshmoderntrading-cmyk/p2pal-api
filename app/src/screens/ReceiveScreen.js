import React, { useState } from 'react';
import { View, Text, Share } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import * as Clipboard from 'expo-clipboard';
import { Screen, Btn, Card, Muted, Warn, Chips } from '../components/ui';
import { useWallet } from '../context/WalletContext';
import { CHAIN_LIST } from '../config/chains';
import { colors } from '../theme';

export default function ReceiveScreen() {
  const { chain, chainKey, setChainKey, address } = useWallet();
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await Clipboard.setStringAsync(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <Screen>
      <Chips items={CHAIN_LIST.map((c) => ({ key: c.key, label: c.name }))} value={chainKey} onChange={setChainKey} />
      <Card style={{ alignItems: 'center', gap: 16, paddingVertical: 24 }}>
        <View style={{ backgroundColor: '#fff', padding: 14, borderRadius: 16 }}>
          <QRCode value={address} size={210} />
        </View>
        <Text selectable style={{ color: colors.text, textAlign: 'center', fontSize: 15 }}>{address}</Text>
        <Muted>{chain.symbol} aur {chain.usdt.label} tokens (USDT) yahan receive karo</Muted>
      </Card>
      <Warn>
        Sirf {chain.name} network se bhejo. Galat network se bheja to paisa wapas nahi aayega.
      </Warn>
      <Btn title={copied ? 'Copied ✓' : 'Address Copy Karo'} onPress={copy} />
      <Btn title="Share" variant="ghost" onPress={() => Share.share({ message: `Mera ${chain.name} address: ${address}` })} />
    </Screen>
  );
}
