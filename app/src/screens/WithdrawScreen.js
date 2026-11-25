import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Modal, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as WebBrowser from 'expo-web-browser';
import { Screen, Btn, Field, Label, Muted, Segmented, ErrorText, Notice, Row, IconBtn } from '../components/ui';
import { useWallet } from '../context/WalletContext';
import { NETWORKS, addressFor } from '../config/chains';
import { getUsdtBalances, isSameAddress } from '../services/usdt';
import { getFeeQuote, withdrawUsdt } from '../services/gas';
import { isValidAddress, detectNetwork, parseScanned, normalizeAddress } from '../services/wallet';
import { getRecentAddresses, addRecentAddress } from '../services/secure';
import { fmtUsdt } from '../services/prices';
import { colors, radius, mono } from '../theme';

const STEPS = [
  ['prepare', 'Preparing network fee'],
  ['fund', 'Funding gas'],
  ['fee', 'Paying fee in USDT'],
  ['send', 'Sending USDT'],
];

const round2 = (n) => Math.floor(n * 100) / 100;

function HighlightAddress({ value }) {
  const a = value.slice(0, 6), b = value.slice(6, -6), c = value.slice(-6);
  return (
    <Text style={{ fontFamily: mono, fontSize: 15, lineHeight: 22, color: colors.muted }}>
      <Text style={{ color: colors.text, fontWeight: '800' }}>{a}</Text>{b}<Text style={{ color: colors.text, fontWeight: '800' }}>{c}</Text>
    </Text>
  );
}

export default function WithdrawScreen({ route, navigation }) {
  const { addresses, requestAuth } = useWallet();
  const [network, setNetwork] = useState(route.params?.network || 'tron');
  const [to, setTo] = useState('');
  const [amount, setAmount] = useState('');
  const [balances, setBalances] = useState({ tron: null, bsc: null });
  const [quote, setQuote] = useState(null);
  const [quoting, setQuoting] = useState(false);
  const [err, setErr] = useState('');
  const [recent, setRecent] = useState([]);
  const [confirm, setConfirm] = useState(false);
  const [step, setStep] = useState(null);
  const [result, setResult] = useState(null);
  const [sendErr, setSendErr] = useState('');
  const qid = useRef(0);

  const n = NETWORKS[network];
  const from = addressFor(addresses, network);
  const balance = Number(balances[network] || 0);
  const dest = to.trim();
  const addrOk = isValidAddress(network, dest);
  const amt = Number(amount);
  const fee = quote ? Number(quote.fee) : null;

  useEffect(() => {
    getUsdtBalances(addresses).then(setBalances);
    getRecentAddresses().then(setRecent);
  }, []);

  useEffect(() => {
    if (route.params?.scanned) onAddress(parseScanned(route.params.scanned));
  }, [route.params?.scanned]);

  // Live fee quote (debounced)
  useEffect(() => {
    setQuote(null);
    if (!addrOk || !(amt > 0)) return;
    const id = ++qid.current;
    setQuoting(true);
    const t = setTimeout(async () => {
      try {
        const q = await getFeeQuote(network, from, dest, amt);
        if (id === qid.current) { setQuote(q); setErr(''); }
      } catch (e) {
        if (id === qid.current) setErr(e.message);
      } finally {
        if (id === qid.current) setQuoting(false);
      }
    }, 600);
    return () => clearTimeout(t);
  }, [network, dest, amount]);

  function onAddress(v) {
    setTo(v);
    setErr('');
    const d = detectNetwork(v);
    if (d && d !== network) setNetwork(d);
  }

  const setMax = async () => {
    if (!balance) return;
    if (fee != null) return setAmount(String(round2(Math.max(0, balance - fee))));
    if (!addrOk) return setErr('Enter the recipient address first');
    try {
      const q = await getFeeQuote(network, from, dest, balance);
      setAmount(String(round2(Math.max(0, balance - Number(q.fee)))));
    } catch (e) {
      setErr(e.message);
    }
  };

  // Address-poisoning check: looks like a previous address but isn't
  const lookalike = addrOk && recent.find((r) => r !== dest && r.slice(0, 4) === dest.slice(0, 4) && r.slice(-4) === dest.slice(-4));
  const isNew = addrOk && !recent.includes(dest);
  const total = fee != null && amt > 0 ? amt + fee : null;

  const validate = () => {
    if (!dest) return 'Enter a recipient address';
    if (!addrOk) return `This is not a valid ${n.label} address`;
    if (isSameAddress(dest, from)) return 'You can’t send to your own address';
    if (!(amt > 0)) return 'Enter an amount';
    if (amt < 1) return 'Minimum withdrawal is 1 USDT';
    if (fee == null) return quoting ? 'Calculating network fee…' : 'Network fee unavailable';
    if (total > balance + 1e-9) return `Insufficient balance. You need ${fmtUsdt(total)} USDT including fee.`;
    return '';
  };

  const onContinue = () => {
    const v = validate();
    if (v) return setErr(v);
    setSendErr('');
    setStep(null);
    setResult(null);
    setConfirm(true);
  };

  const onConfirm = async () => {
    if (!(await requestAuth('Approve withdrawal'))) return;
    setSendErr('');
    try {
      const r = await withdrawUsdt({ network, to: normalizeAddress(network, dest), amount: amt, onStep: setStep });
      await addRecentAddress(dest);
      setResult(r);
    } catch (e) {
      setSendErr(e.shortMessage || e.message || 'Transfer failed');
      setStep(null);
    }
  };

  const busy = step && !result;

  return (
    <Screen>
      <Segmented
        items={[{ key: 'tron', label: 'TRC20 · TRON' }, { key: 'bsc', label: 'BEP20 · BNB' }]}
        value={network}
        onChange={(k) => { setNetwork(k); setErr(''); }}
      />

      <View style={{ gap: 8 }}>
        <Label>Recipient address</Label>
        <Field
          value={to}
          onChangeText={onAddress}
          placeholder={`${n.label} address (${n.placeholder})`}
          autoCapitalize="none"
          autoCorrect={false}
          right={
            <View style={{ flexDirection: 'row' }}>
              <IconBtn name="clipboard-outline" onPress={async () => onAddress((await Clipboard.getStringAsync()).trim())} />
              <IconBtn name="scan-outline" onPress={() => navigation.navigate('Scan')} />
            </View>
          }
        />
      </View>

      <View style={{ gap: 8 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Label>Amount</Label>
          <Muted style={{ fontSize: 13 }}>Available: {balances[network] === null ? '—' : `${fmtUsdt(balance)} USDT`}</Muted>
        </View>
        <Field
          value={amount}
          onChangeText={(t) => { setAmount(t.replace(',', '.').replace(/[^0-9.]/g, '')); setErr(''); }}
          placeholder="0.00"
          keyboardType="decimal-pad"
          right={
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Text style={{ color: colors.muted, fontWeight: '700' }}>USDT</Text>
              <Pressable onPress={setMax} hitSlop={8} style={{ backgroundColor: colors.accentSoft, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 }}>
                <Text style={{ color: colors.accent, fontWeight: '800' }}>MAX</Text>
              </Pressable>
            </View>
          }
        />
      </View>

      <View style={{ backgroundColor: colors.card, borderRadius: radius.lg, padding: 16 }}>
        <Row label="Network fee" value={quoting ? 'Calculating…' : fee != null ? `${fmtUsdt(fee)} USDT` : '—'} />
        <Row label="Recipient gets" value={amt > 0 ? `${fmtUsdt(amt)} USDT` : '—'} />
        <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginVertical: 6 }} />
        <Row label="Total" value={total != null ? `${fmtUsdt(total)} USDT` : '—'} strong />
        <Text style={{ color: colors.muted, fontSize: 12, marginTop: 6 }}>Fee is paid in USDT — no TRX or BNB needed.</Text>
      </View>

      {lookalike && (
        <Notice tone="danger">
          This address looks similar to one you used before, but it is different. Scammers use look-alike addresses. Double-check every character.
        </Notice>
      )}
      <ErrorText>{err}</ErrorText>
      <Btn title="Continue" onPress={onContinue} />

      {/* Confirm / progress / result sheet */}
      <Modal visible={confirm} animationType="slide" transparent onRequestClose={() => !busy && setConfirm(false)}>
        <View style={s.overlay}>
          <SafeAreaView edges={['bottom']} style={s.sheet}>
            {!step && !result && (
              <>
                <View style={s.sheetHead}>
                  <Text style={s.sheetTitle}>Confirm withdrawal</Text>
                  <IconBtn name="close" onPress={() => setConfirm(false)} />
                </View>
                <Text style={s.bigAmt}>{fmtUsdt(amt)} USDT</Text>
                <View style={s.box}>
                  <Muted style={{ fontSize: 13 }}>To {isNew ? '· new address' : ''}</Muted>
                  <HighlightAddress value={dest} />
                </View>
                <View style={s.box}>
                  <Row label="Network" value={`${n.name} (${n.label})`} />
                  <Row label="Network fee" value={`${fmtUsdt(fee)} USDT`} />
                  <Row label="Total deducted" value={`${fmtUsdt(total)} USDT`} strong />
                </View>
                {isNew && <Notice tone="warn">First time sending to this address. Make sure it is correct — blockchain transfers can’t be reversed.</Notice>}
                <ErrorText>{sendErr}</ErrorText>
                <Btn title="Confirm & send" icon="lock-closed" onPress={onConfirm} />
              </>
            )}

            {busy && (
              <View style={{ gap: 18, paddingVertical: 10 }}>
                <Text style={s.sheetTitle}>Sending…</Text>
                {STEPS.map(([k, label], i) => {
                  const cur = STEPS.findIndex(([x]) => x === step);
                  const state = i < cur ? 'done' : i === cur ? 'active' : 'todo';
                  return (
                    <View key={k} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      {state === 'done' ? (
                        <Ionicons name="checkmark-circle" size={24} color={colors.accent} />
                      ) : state === 'active' ? (
                        <ActivityIndicator color={colors.accent} style={{ width: 24 }} />
                      ) : (
                        <Ionicons name="ellipse-outline" size={24} color={colors.border} />
                      )}
                      <Text style={{ color: state === 'todo' ? colors.muted : colors.text, fontSize: 16 }}>{label}</Text>
                    </View>
                  );
                })}
                <Muted>Please keep the app open.</Muted>
              </View>
            )}

            {result && (
              <View style={{ alignItems: 'center', gap: 14, paddingVertical: 10 }}>
                <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="checkmark" size={40} color={colors.accent} />
                </View>
                <Text style={s.sheetTitle}>Withdrawal sent</Text>
                <Muted style={{ textAlign: 'center' }}>{fmtUsdt(amt)} USDT is on its way. It usually arrives within a minute.</Muted>
                <Btn title="View on explorer" variant="secondary" icon="open-outline" style={{ alignSelf: 'stretch' }} onPress={() => WebBrowser.openBrowserAsync(n.explorerTx(result.hash))} />
                <Btn title="Done" style={{ alignSelf: 'stretch' }} onPress={() => { setConfirm(false); navigation.goBack(); }} />
              </View>
            )}
          </SafeAreaView>
        </View>
      </Modal>
    </Screen>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, gap: 14 },
  sheetHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sheetTitle: { color: colors.text, fontSize: 20, fontWeight: '800' },
  bigAmt: { color: colors.text, fontSize: 34, fontWeight: '800', textAlign: 'center', marginVertical: 6 },
  box: { backgroundColor: colors.card, borderRadius: radius.md, padding: 14, gap: 4 },
});
