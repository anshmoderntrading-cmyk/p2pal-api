import React, { useEffect, useState } from 'react';
import { Alert, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { Screen, Btn, Field, Label, Muted, Chips, PinField, ErrorText, Card, Warn } from '../components/ui';
import { useWallet } from '../context/WalletContext';
import { getTokens } from '../services/tokens';
import { getBalances } from '../services/balances';
import { sendAsset } from '../services/send';
import { isValidAddress, parseScanned } from '../services/wallet';

export default function SendScreen({ route, navigation }) {
  const { chain, chainKey, address, biometric, confirmAction } = useWallet();
  const [tokens, setTokens] = useState([]);
  const [sel, setSel] = useState(route.params?.token?.address || 'native');
  const [to, setTo] = useState('');
  const [amount, setAmount] = useState('');
  const [pin, setPin] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const [txHash, setTxHash] = useState('');

  useEffect(() => {
    (async () => setTokens(await getBalances(chain, address, await getTokens(chainKey))))();
  }, [chainKey]);

  useEffect(() => {
    if (route.params?.scanned) setTo(parseScanned(route.params.scanned));
  }, [route.params?.scanned]);

  const token = tokens.find((t) => (t.address || 'native') === sel);

  const validate = () => {
    if (!token) return 'Token select karo';
    if (!isValidAddress(chain, to.trim())) return `Ye ${chain.name} address nahi hai. Network check karo!`;
    if (to.trim() === address) return 'Apne hi address pe nahi bhej sakte';
    const a = Number(amount);
    if (!a || a <= 0) return 'Amount daalo';
    if (a > Number(token.balance)) return 'Balance kam hai';
    if (!biometric && pin.length !== 6) return 'PIN daalo';
    return '';
  };

  const doSend = async () => {
    setLoading(true);
    try {
      if (!(await confirmAction(biometric ? undefined : pin))) throw new Error('Verify nahi hua');
      const hash = await sendAsset({ chain, token, to: to.trim(), amount });
      setTxHash(hash);
    } catch (e) {
      setErr(e.shortMessage || e.message);
    } finally {
      setLoading(false);
      setPin('');
    }
  };

  const onSend = () => {
    const v = validate();
    if (v) return setErr(v);
    Alert.alert('Confirm Send', `${amount} ${token.symbol}\n${chain.name} pe\n→ ${to.trim()}`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Send', onPress: doSend },
    ]);
  };

  if (txHash) {
    return (
      <Screen>
        <Card style={{ alignItems: 'center', paddingVertical: 28 }}>
          <Label style={{ fontSize: 20 }}>✅ Transaction bhej diya</Label>
          <Muted style={{ textAlign: 'center' }}>{txHash}</Muted>
        </Card>
        <Btn title="Explorer pe dekho" variant="ghost" onPress={() => WebBrowser.openBrowserAsync(chain.explorerTx(txHash))} />
        <Btn title="Done" onPress={() => navigation.goBack()} />
      </Screen>
    );
  }

  return (
    <Screen>
      <Label>Token ({chain.name})</Label>
      <Chips
        items={tokens.map((t) => ({ key: t.address || 'native', label: t.symbol }))}
        value={sel}
        onChange={setSel}
      />
      {token && <Muted>Balance: {token.balance} {token.symbol}</Muted>}

      <Label>Kisko bhejna hai</Label>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Field
          value={to}
          onChangeText={(t) => { setTo(t); setErr(''); }}
          placeholder={chain.type === 'tron' ? 'T... address' : '0x... address'}
          autoCapitalize="none"
          autoCorrect={false}
          style={{ flex: 1 }}
        />
        <Btn title="QR" variant="ghost" style={{ paddingHorizontal: 18 }} onPress={() => navigation.navigate('Scan')} />
      </View>

      <Label>Amount</Label>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Field value={amount} onChangeText={(t) => { setAmount(t.replace(',', '.')); setErr(''); }} placeholder="0.00" keyboardType="decimal-pad" style={{ flex: 1 }} />
        {token?.address && <Btn title="MAX" variant="ghost" style={{ paddingHorizontal: 18 }} onPress={() => setAmount(token.balance)} />}
      </View>

      {chain.type === 'tron' && token?.address && (
        <Warn>TRC20 USDT bhejne me Energy lagti hai. Energy na ho to ~5–15 TRX fee kat sakti hai, isliye thoda TRX wallet me rakho.</Warn>
      )}

      {!biometric && (<><Label>PIN</Label><PinField value={pin} onChangeText={setPin} /></>)}
      <ErrorText>{err}</ErrorText>
      <Btn title="Send" onPress={onSend} loading={loading} />
    </Screen>
  );
}
