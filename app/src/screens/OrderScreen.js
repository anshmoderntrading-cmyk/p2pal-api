import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, Alert, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { Screen, Btn, Field, Label, Muted, Row, Notice, ErrorText } from '../components/ui';
import { useWallet } from '../context/WalletContext';
import { addressFor, NETWORKS } from '../config/chains';
import { isSameAddress } from '../services/usdt';
import { fmtInr, fmtUsdt } from '../services/prices';
import { escrowReady, escrowAddress } from '../config/env';
import * as api from '../services/p2pApi';
import * as escrow from '../services/escrow';
import { colors, radius, mono } from '../theme';

const PAY_SECONDS = 15 * 60;

export default function OrderScreen({ route, navigation }) {
  const { ad, takerSide } = route.params;
  const { addresses, requestAuth } = useWallet();
  const network = ad.network;
  const myAddr = addressFor(addresses, network);

  const [inr, setInr] = useState(String(ad.min_inr || ''));
  const [order, setOrder] = useState(null);
  const [busy, setBusy] = useState('');
  const [err, setErr] = useState('');
  const [left, setLeft] = useState(PAY_SECONDS);
  const poll = useRef(null);

  const usdt = Number(inr) > 0 && Number(ad.price_inr) > 0 ? (Number(inr) / Number(ad.price_inr)) : 0;
  const isSeller = order ? isSameAddress(order.seller_address, myAddr) : takerSide === 'sell';

  // Poll order status
  useEffect(() => {
    if (!order) return;
    poll.current = setInterval(async () => {
      try { setOrder(await api.getOrder(order.id)); } catch {}
    }, 5000);
    return () => clearInterval(poll.current);
  }, [order?.id]);

  // Pay countdown
  useEffect(() => {
    if (!order || !['created', 'funded'].includes(order.status)) return;
    const end = new Date(order.pay_deadline).getTime();
    const t = setInterval(() => setLeft(Math.max(0, Math.floor((end - Date.now()) / 1000))), 1000);
    return () => clearInterval(t);
  }, [order?.pay_deadline, order?.status]);

  const run = async (key, fn, needAuth = true) => {
    setErr('');
    if (needAuth && !(await requestAuth('Approve transaction'))) return;
    setBusy(key);
    try { await fn(); } catch (e) { setErr(e.shortMessage || e.message); } finally { setBusy(''); }
  };

  const placeOrder = () =>
    run('place', async () => {
      if (!(Number(inr) >= Number(ad.min_inr || 0))) throw new Error(`Minimum is ${fmtInr(ad.min_inr)}`);
      if (ad.max_inr && Number(inr) > Number(ad.max_inr)) throw new Error(`Maximum is ${fmtInr(ad.max_inr)}`);
      const o = await api.createOrder(network, { ad_id: ad.id, amount_usdt: usdt.toFixed(6), inr_amount: Number(inr) });
      setOrder(await api.getOrder(o.id));
    }, false);

  const fundEscrow = () =>
    run('fund', async () => {
      if (!escrowReady(network)) throw new Error('Escrow contract is not live yet (test setup)');
      const fee = 0; // fee policy wired later
      const r = await escrow.createEscrowOrder(network, { buyer: order.buyer_address, amount: order.amount_usdt, fee, payWindowSeconds: PAY_SECONDS });
      await api.linkOrder(network, order.id, { onchain_id: r.onchainId ?? 0, fee_usdt: fee });
      setOrder(await api.getOrder(order.id));
    });

  const markPaid = () =>
    run('paid', async () => {
      await api.markPaidOffchain(network, order.id);
      if (escrowReady(network) && order.onchain_id != null) await escrow.escrowMarkPaid(network, order.onchain_id);
      setOrder(await api.getOrder(order.id));
    });

  const release = () =>
    run('release', async () => {
      if (escrowReady(network) && order.onchain_id != null) await escrow.escrowRelease(network, order.onchain_id);
      setOrder(await api.getOrder(order.id));
    });

  const appeal = () =>
    Alert.alert('Open a dispute?', 'An arbitrator will review this trade. Only do this if something is wrong.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Open dispute', style: 'destructive', onPress: () => run('appeal', async () => {
        await api.openAppeal(network, order.id, 'Opened from app');
        setOrder(await api.getOrder(order.id));
      }, false) },
    ]);

  const copy = (v) => Clipboard.setStringAsync(v);
  const mm = `${String(Math.floor(left / 60)).padStart(2, '0')}:${String(left % 60).padStart(2, '0')}`;

  // ---------- Pre-order: enter amount ----------
  if (!order) {
    return (
      <Screen>
        <View style={s.head}>
          <Text style={s.price}>{fmtInr(ad.price_inr)}<Text style={s.unit}> / USDT</Text></Text>
          <Muted>{ad.display_name || 'Merchant'} · {ad.pay_methods} · Limit {fmtInr(ad.min_inr)}–{fmtInr(ad.max_inr)}</Muted>
        </View>
        {!!ad.terms && <Notice tone="info">{ad.terms}</Notice>}
        <Label>{takerSide === 'buy' ? 'You pay (INR)' : 'You receive (INR)'}</Label>
        <Field value={inr} onChangeText={(t) => { setInr(t.replace(/[^0-9.]/g, '')); setErr(''); }} placeholder="0" keyboardType="decimal-pad" />
        <View style={s.box}>
          <Row label={takerSide === 'buy' ? 'You get' : 'You sell'} value={`${fmtUsdt(usdt)} USDT`} strong />
          <Row label="Network" value={NETWORKS[network].label} />
        </View>
        <ErrorText>{err}</ErrorText>
        <Btn title={takerSide === 'buy' ? 'Buy USDT' : 'Sell USDT'} onPress={placeOrder} loading={busy === 'place'} disabled={!(usdt > 0)} />
      </Screen>
    );
  }

  // ---------- Active order ----------
  const st = order.status;
  const done = ['released', 'resolved'].includes(st);
  const cancelled = st === 'cancelled';

  return (
    <Screen>
      <View style={s.statusCard}>
        <Ionicons
          name={done ? 'checkmark-circle' : cancelled ? 'close-circle' : st === 'disputed' ? 'alert-circle' : 'time'}
          size={40}
          color={done ? colors.accent : cancelled ? colors.danger : st === 'disputed' ? colors.warn : colors.blue}
        />
        <Text style={s.statusText}>
          {done ? 'Trade complete' : cancelled ? 'Cancelled' : st === 'disputed' ? 'Under dispute' :
           st === 'paid' ? (isSeller ? 'Buyer marked paid' : 'Waiting for release') :
           st === 'funded' ? (isSeller ? 'Waiting for buyer payment' : 'Pay the seller now') :
           isSeller ? 'Lock USDT in escrow' : 'Waiting for seller to fund'}
        </Text>
        {['created', 'funded'].includes(st) && <Text style={s.timer}>⏱ {mm}</Text>}
      </View>

      <View style={s.box}>
        <Row label="Amount" value={`${fmtUsdt(order.amount_usdt)} USDT`} strong />
        <Row label="INR" value={fmtInr(order.inr_amount)} />
        <Row label="Price" value={`${fmtInr(order.price_inr)} / USDT`} />
        <Row label="Network" value={NETWORKS[network].label} />
      </View>

      {/* Seller UPI shown to buyer when they must pay */}
      {!isSeller && ['funded', 'paid'].includes(st) && (
        <View style={s.box}>
          <Label>Pay this UPI</Label>
          <Pressable onPress={() => copy(order.seller_upi || '')} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ color: colors.text, fontFamily: mono, fontSize: 16, flex: 1 }}>{order.seller_upi || '—'}</Text>
            <Ionicons name="copy-outline" size={18} color={colors.muted} />
          </Pressable>
          <Muted style={{ fontSize: 12 }}>Pay exactly {fmtInr(order.inr_amount)}. Add the order ID #{order.id} in the UPI note.</Muted>
        </View>
      )}

      {!escrowReady(network) && !done && (
        <Notice tone="warn">Escrow contract is not live yet (test setup). On-chain lock/release is disabled; the flow below is for testing the backend.</Notice>
      )}
      <ErrorText>{err}</ErrorText>

      {/* Role actions */}
      {isSeller && st === 'created' && <Btn title="Lock USDT in escrow" icon="lock-closed" onPress={fundEscrow} loading={busy === 'fund'} />}
      {isSeller && st === 'paid' && <Btn title="Release USDT to buyer" icon="checkmark" onPress={release} loading={busy === 'release'} />}
      {!isSeller && st === 'funded' && <Btn title="I have paid" icon="checkmark-done" onPress={markPaid} loading={busy === 'paid'} />}

      {/* Chat + dispute */}
      {!done && !cancelled && (
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Btn title="Chat" icon="chatbubble-ellipses-outline" variant="secondary" style={{ flex: 1 }} onPress={() => navigation.navigate('OrderChat', { order })} />
          {['funded', 'paid'].includes(st) && (
            <Btn title="Dispute" icon="flag-outline" variant="danger" style={{ flex: 1 }} onPress={appeal} loading={busy === 'appeal'} />
          )}
        </View>
      )}

      {done && <Btn title="Done" onPress={() => navigation.popToTop()} />}
    </Screen>
  );
}

const s = StyleSheet.create({
  head: { gap: 4 },
  price: { color: colors.text, fontSize: 26, fontWeight: '800' },
  unit: { color: colors.muted, fontSize: 14, fontWeight: '600' },
  box: { backgroundColor: colors.card, borderRadius: radius.lg, padding: 16, gap: 2 },
  statusCard: { alignItems: 'center', gap: 8, backgroundColor: colors.card, borderRadius: radius.lg, paddingVertical: 24 },
  statusText: { color: colors.text, fontSize: 18, fontWeight: '800', textAlign: 'center' },
  timer: { color: colors.blue, fontSize: 16, fontWeight: '700' },
});
