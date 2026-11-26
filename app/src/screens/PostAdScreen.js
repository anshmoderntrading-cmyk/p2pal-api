import React, { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { Screen, Btn, Field, Label, Muted, Segmented, ErrorText, Notice } from '../components/ui';
import { createAd, saveMerchant, getMerchant } from '../services/p2pApi';
import { useWallet } from '../context/WalletContext';
import { addressFor } from '../config/chains';
import { colors } from '../theme';

export default function PostAdScreen({ navigation }) {
  const { addresses } = useWallet();
  const [side, setSide] = useState('sell');
  const [network, setNetwork] = useState('tron');
  const [price, setPrice] = useState('');
  const [min, setMin] = useState('');
  const [max, setMax] = useState('');
  const [available, setAvailable] = useState('');
  const [upi, setUpi] = useState('');
  const [name, setName] = useState('');
  const [terms, setTerms] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getMerchant(addressFor(addresses, network)).then((m) => {
      if (m) { setUpi(m.upi_id || ''); setName(m.display_name || ''); }
    }).catch(() => {});
  }, [network]);

  const submit = async () => {
    setErr('');
    if (!(Number(price) > 0)) return setErr('Enter a valid price');
    if (side === 'sell' && !upi.trim()) return setErr('Add your UPI ID so buyers can pay you');
    setBusy(true);
    try {
      await saveMerchant(network, { display_name: name.trim() || undefined, upi_id: upi.trim() || undefined });
      await createAd(network, {
        side, network,
        price_inr: Number(price),
        min_inr: Number(min) || 0,
        max_inr: Number(max) || 0,
        available_usdt: Number(available) || 0,
        terms: terms.trim() || undefined,
      });
      navigation.goBack();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <Label>I want to</Label>
      <Segmented items={[{ key: 'sell', label: 'Sell USDT' }, { key: 'buy', label: 'Buy USDT' }]} value={side} onChange={setSide} />
      <Label>Network</Label>
      <Segmented items={[{ key: 'tron', label: 'TRC20' }, { key: 'bsc', label: 'BEP20' }]} value={network} onChange={setNetwork} />

      <Label>Price (INR per USDT)</Label>
      <Field value={price} onChangeText={setPrice} placeholder="e.g. 95.50" keyboardType="decimal-pad" />

      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={{ flex: 1, gap: 8 }}>
          <Label>Min (INR)</Label>
          <Field value={min} onChangeText={setMin} placeholder="500" keyboardType="number-pad" />
        </View>
        <View style={{ flex: 1, gap: 8 }}>
          <Label>Max (INR)</Label>
          <Field value={max} onChangeText={setMax} placeholder="50000" keyboardType="number-pad" />
        </View>
      </View>

      <Label>Available USDT</Label>
      <Field value={available} onChangeText={setAvailable} placeholder="e.g. 500" keyboardType="decimal-pad" />

      <Label>Display name</Label>
      <Field value={name} onChangeText={setName} placeholder="Shown to traders" />

      {side === 'sell' && (<><Label>Your UPI ID</Label><Field value={upi} onChangeText={setUpi} placeholder="name@bank" autoCapitalize="none" /></>)}

      <Label>Terms (optional)</Label>
      <Field value={terms} onChangeText={setTerms} placeholder="e.g. Pay within 15 min, add order ID in note" multiline />

      <Notice tone="info">When someone takes your sell ad, you’ll be asked to lock the USDT in escrow. P2Pal never holds your funds.</Notice>
      <ErrorText>{err}</ErrorText>
      <Btn title="Post ad" onPress={submit} loading={busy} />
    </Screen>
  );
}
