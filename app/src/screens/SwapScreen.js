import React, { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { Screen, Btn, Field, Label, Muted, Chips, PinField, ErrorText, Card } from '../components/ui';
import { useWallet } from '../context/WalletContext';
import { getTokens } from '../services/tokens';
import { getBalances } from '../services/balances';
import { getQuote, executeSwap, getSwapConfig } from '../services/swap';

export default function SwapScreen({ navigation }) {
  const { chain, chainKey, address, biometric, confirmAction } = useWallet();
  const [tokens, setTokens] = useState([]);
  const [from, setFrom] = useState('native');
  const [to, setTo] = useState('');
  const [amount, setAmount] = useState('');
  const [quote, setQuote] = useState(null);
  const [fee, setFee] = useState(null);
  const [pin, setPin] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState('');
  const [txHash, setTxHash] = useState('');

  useEffect(() => {
    if (chain.type !== 'evm') return;
    (async () => {
      const list = await getBalances(chain, address, await getTokens(chainKey));
      setTokens(list);
      setTo(list[1]?.address || '');
      setFee((await getSwapConfig()).feePercent);
    })();
  }, [chainKey]);

  if (chain.type !== 'evm') {
    return (
      <Screen>
        <Muted>Swap abhi BNB Chain, Ethereum aur Polygon pe hai. Home pe network badlo.</Muted>
        <Btn title="Wapas" onPress={() => navigation.goBack()} />
      </Screen>
    );
  }

  const fT = tokens.find((t) => (t.address || 'native') === from);
  const tT = tokens.find((t) => (t.address || 'native') === to);
  const items = tokens.map((t) => ({ key: t.address || 'native', label: t.symbol }));

  const fetchQuote = async () => {
    setErr(''); setQuote(null);
    if (!fT || !tT || from === to) return setErr('Alag-alag tokens chuno');
    if (!(Number(amount) > 0)) return setErr('Amount daalo');
    if (Number(amount) > Number(fT.balance)) return setErr('Balance kam hai');
    setBusy('quote');
    try { setQuote(await getQuote(chain, fT, tT, amount)); }
    catch (e) { setErr(e.message); }
    finally { setBusy(''); }
  };

  const doSwap = async () => {
    setBusy('swap');
    try {
      if (!(await confirmAction(biometric ? undefined : pin))) throw new Error('Verify nahi hua');
      setTxHash(await executeSwap(chain, fT, tT, amount, 1));
    } catch (e) {
      setErr(e.shortMessage || e.message);
    } finally {
      setBusy(''); setPin('');
    }
  };

  if (txHash) {
    return (
      <Screen>
        <Card style={{ alignItems: 'center', paddingVertical: 28 }}>
          <Label style={{ fontSize: 20 }}>✅ Swap submit ho gaya</Label>
          <Muted style={{ textAlign: 'center' }}>{txHash}</Muted>
        </Card>
        <Btn title="Explorer pe dekho" variant="ghost" onPress={() => WebBrowser.openBrowserAsync(chain.explorerTx(txHash))} />
        <Btn title="Done" onPress={() => navigation.goBack()} />
      </Screen>
    );
  }

  return (
    <Screen>
      <Label>From</Label>
      <Chips items={items} value={from} onChange={(k) => { setFrom(k); setQuote(null); }} />
      {fT && <Muted>Balance: {fT.balance} {fT.symbol}</Muted>}
      <Field value={amount} onChangeText={(t) => { setAmount(t.replace(',', '.')); setQuote(null); }} placeholder="0.00" keyboardType="decimal-pad" />

      <Label>To</Label>
      <Chips items={items} value={to} onChange={(k) => { setTo(k); setQuote(null); }} />

      {quote && (
        <Card>
          <Label>Aapko milega ≈ {Number(quote.amountOut).toLocaleString('en-IN', { maximumFractionDigits: 6 })} {tT.symbol}</Label>
          <Muted>Slippage 1%{fee != null ? ` · P2Pal fee ${fee}%` : ''} · Network gas alag se</Muted>
        </Card>
      )}

      {quote && !biometric && (<><Label>PIN</Label><PinField value={pin} onChangeText={setPin} /></>)}
      <ErrorText>{err}</ErrorText>
      {!quote ? (
        <Btn title="Rate Dekho" onPress={fetchQuote} loading={busy === 'quote'} />
      ) : (
        <Btn
          title="Swap Karo"
          loading={busy === 'swap'}
          disabled={!biometric && pin.length !== 6}
          onPress={() =>
            Alert.alert('Confirm Swap', `${amount} ${fT.symbol} → ≈${Number(quote.amountOut).toFixed(4)} ${tT.symbol}`, [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Swap', onPress: doSwap },
            ])
          }
        />
      )}
    </Screen>
  );
}
