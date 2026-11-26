import React, { useState } from 'react';
import { View, Text, Share } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import * as Clipboard from 'expo-clipboard';
import { Screen, Btn, Notice, Segmented, Muted } from '../components/ui';
import TokenIcon from '../components/TokenIcon';
import { useWallet } from '../context/WalletContext';
import { NETWORKS, addressFor } from '../config/chains';
import { colors, radius, mono } from '../theme';

export default function DepositScreen({ route }) {
  const { addresses } = useWallet();
  const [network, setNetwork] = useState(route.params?.network || 'tron');
  const [asset, setAsset] = useState(route.params?.asset === 'native' ? 'native' : 'usdt');
  const [copied, setCopied] = useState(false);
  const n = NETWORKS[network];
  const sym = asset === 'native' ? n.nativeSymbol : 'USDT';
  const address = addressFor(addresses, network);

  const copy = async () => {
    await Clipboard.setStringAsync(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <Screen>
      <Segmented
        items={[{ key: 'tron', label: 'TRC20 · TRON' }, { key: 'bsc', label: 'BEP20 · BNB' }]}
        value={network}
        onChange={setNetwork}
      />
      <Segmented
        items={[{ key: 'usdt', label: 'USDT' }, { key: 'native', label: `${n.nativeSymbol} (for fees)` }]}
        value={asset}
        onChange={setAsset}
      />

      <View style={{ backgroundColor: colors.card, borderRadius: radius.xl, padding: 24, alignItems: 'center', gap: 18 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <TokenIcon network={network} size={34} />
          <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800' }}>Deposit {asset === 'native' ? n.nativeSymbol : `USDT (${n.label})`}</Text>
        </View>
        <View style={{ backgroundColor: '#fff', padding: 16, borderRadius: radius.lg }}>
          <QRCode value={address} size={200} />
        </View>
        <View style={{ alignSelf: 'stretch', gap: 6 }}>
          <Muted style={{ fontSize: 13 }}>Your {n.label} address</Muted>
          <Text selectable style={{ color: colors.text, fontSize: 15, fontFamily: mono, lineHeight: 22 }}>{address}</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 10, alignSelf: 'stretch' }}>
          <Btn title={copied ? 'Copied' : 'Copy'} icon={copied ? 'checkmark' : 'copy-outline'} onPress={copy} style={{ flex: 1 }} />
          <Btn
            title="Share"
            icon="share-outline"
            variant="secondary"
            style={{ flex: 1 }}
            onPress={() => Share.share({ message: `My ${sym} (${n.name}) address:\n${address}` })}
          />
        </View>
      </View>

      {asset === 'native' ? (
        <Notice tone="info" icon="flash">
          Send only {n.nativeSymbol} on the {n.name} network to this address. {n.nativeSymbol} is used to pay network fees directly from your wallet.
        </Notice>
      ) : (
        <Notice tone="warn">
          Send only USDT on the {n.name} ({n.label}) network to this address. Other tokens or networks may be lost permanently.
        </Notice>
      )}
    </Screen>
  );
}
