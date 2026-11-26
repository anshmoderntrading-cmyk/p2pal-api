import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as WebBrowser from 'expo-web-browser';
import { Btn } from '../components/ui';
import TokenIcon from '../components/TokenIcon';
import { NETWORKS } from '../config/chains';
import { fmtUsdt, fmtUsd } from '../services/prices';
import { colors, radius, mono } from '../theme';

const fmtDate = (t) =>
  new Date(t).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

function DetailRow({ label, children, onCopy, last }) {
  return (
    <View style={[s.row, !last && s.rowBorder]}>
      <Text style={s.label}>{label}</Text>
      <View style={{ flex: 1, alignItems: 'flex-end' }}>{children}</View>
      {onCopy && (
        <Pressable hitSlop={10} onPress={onCopy} style={{ marginLeft: 8 }}>
          <Ionicons name="copy-outline" size={16} color={colors.muted} />
        </Pressable>
      )}
    </View>
  );
}

export default function TxDetailScreen({ route }) {
  const { tx } = route.params; // { network, hash, amount, dir, counterparty, time, fee }
  const n = NETWORKS[tx.network];
  const incoming = tx.dir === 'in';
  const [copied, setCopied] = useState('');

  const copy = async (key, value) => {
    await Clipboard.setStringAsync(value);
    setCopied(key);
    setTimeout(() => setCopied(''), 1500);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Hero */}
      <View style={s.hero}>
        <View style={{ position: 'relative' }}>
          <TokenIcon network={tx.network} size={56} />
          <View style={[s.badge, { backgroundColor: incoming ? colors.accent : colors.cardHi }]}>
            <Ionicons name={incoming ? 'arrow-down' : 'arrow-up'} size={14} color={incoming ? colors.onAccent : colors.text} />
          </View>
        </View>
        <Text style={s.usd}>≈ {fmtUsd(tx.amount)}</Text>
        <Text style={[s.amt, { color: incoming ? colors.accent : colors.text }]}>
          {incoming ? '+' : '−'}{fmtUsdt(tx.amount)} USDT
        </Text>
      </View>

      <View style={s.card}>
        <DetailRow label="Date">
          <Text style={s.value}>{fmtDate(tx.time)}</Text>
        </DetailRow>
        <DetailRow label="Status">
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <Ionicons name="checkmark-circle" size={16} color={colors.accent} />
            <Text style={[s.value, { color: colors.accent, fontWeight: '700' }]}>Completed</Text>
          </View>
        </DetailRow>
        <DetailRow label="Network">
          <Text style={s.value}>{n.name} · {n.label}</Text>
        </DetailRow>
        <DetailRow label={incoming ? 'From' : 'Recipient'} onCopy={() => copy('addr', tx.counterparty)} last>
          <Text style={[s.value, { fontFamily: mono, fontSize: 13 }]} numberOfLines={2}>
            {copied === 'addr' ? 'Copied ✓' : tx.counterparty}
          </Text>
        </DetailRow>
      </View>

      <View style={s.card}>
        <DetailRow label="Network fee">
          <Text style={s.value}>{tx.fee != null ? `${fmtUsdt(tx.fee)} USDT` : 'Gas-free'}</Text>
        </DetailRow>
        <DetailRow label="Transaction hash" onCopy={() => copy('hash', tx.hash)} last>
          <Text style={[s.value, { fontFamily: mono, fontSize: 13 }]} numberOfLines={1}>
            {copied === 'hash' ? 'Copied ✓' : `${tx.hash.slice(0, 10)}…${tx.hash.slice(-8)}`}
          </Text>
        </DetailRow>
      </View>

      <View style={{ padding: 20 }}>
        <Btn title="View on block explorer" variant="secondary" icon="open-outline" onPress={() => WebBrowser.openBrowserAsync(n.explorerTx(tx.hash))} />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  hero: { alignItems: 'center', paddingVertical: 28, gap: 6 },
  badge: { position: 'absolute', right: -4, bottom: -4, width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.bg },
  usd: { color: colors.text, fontSize: 30, fontWeight: '800', marginTop: 10 },
  amt: { fontSize: 16, fontWeight: '600' },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, marginHorizontal: 20, marginTop: 14, paddingHorizontal: 16 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, gap: 10 },
  rowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  label: { color: colors.muted, fontSize: 15 },
  value: { color: colors.text, fontSize: 15, textAlign: 'right' },
});
