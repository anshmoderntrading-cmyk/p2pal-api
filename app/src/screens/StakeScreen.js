import React, { useCallback, useEffect, useState } from 'react';
import { RefreshControl } from 'react-native';
import { Screen, Card, Btn, Field, Label, Muted, Chips, PinField, ErrorText, Warn } from '../components/ui';
import { useWallet } from '../context/WalletContext';
import { getStakeInfo, stakeTRX, unstakeTRX, withdrawUnstaked, claimRewards } from '../services/staking';
import { colors } from '../theme';

export default function StakeScreen({ navigation }) {
  const { chain, addresses, biometric, confirmAction } = useWallet();
  const [info, setInfo] = useState(null);
  const [amount, setAmount] = useState('');
  const [resource, setResource] = useState('ENERGY');
  const [pin, setPin] = useState('');
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState('');

  const load = useCallback(async () => {
    try { setInfo(await getStakeInfo(addresses.tron)); } catch (e) { setErr(e.message); }
  }, [addresses.tron]);

  useEffect(() => { load(); }, [load]);

  if (chain.type !== 'tron') {
    return (
      <Screen>
        <Muted>Staking abhi TRON pe hai. Home pe TRON select karo.</Muted>
        <Btn title="Wapas" onPress={() => navigation.goBack()} />
      </Screen>
    );
  }

  const run = async (key, fn) => {
    setErr(''); setMsg('');
    if (!biometric && pin.length !== 6) return setErr('PIN daalo');
    setBusy(key);
    try {
      if (!(await confirmAction(biometric ? undefined : pin))) throw new Error('Verify nahi hua');
      const tx = await fn();
      setMsg(`✅ Done: ${String(tx).slice(0, 16)}…`);
      setAmount('');
      setTimeout(load, 4000);
    } catch (e) {
      setErr(e.message || String(e));
    } finally {
      setBusy(''); setPin('');
    }
  };

  const ready = (info?.unfreezing || []).filter((u) => u.readyAt <= Date.now());

  return (
    <Screen refreshControl={<RefreshControl refreshing={false} onRefresh={load} tintColor={colors.accent} />}>
      <Card>
        <Label>Staked TRX</Label>
        <Muted>Energy ke liye: {info?.energy ?? '…'} TRX</Muted>
        <Muted>Bandwidth ke liye: {info?.bandwidth ?? '…'} TRX</Muted>
        <Muted>Votes: {info?.votes ?? '…'}</Muted>
        {(info?.unfreezing || []).map((u, i) => (
          <Muted key={i}>Unstaking {u.amount} TRX · {u.readyAt <= Date.now() ? 'ready ✓' : new Date(u.readyAt).toLocaleDateString('en-IN')}</Muted>
        ))}
      </Card>

      <Label>Amount (TRX)</Label>
      <Field value={amount} onChangeText={setAmount} placeholder="min 1 TRX" keyboardType="decimal-pad" />
      <Chips items={[{ key: 'ENERGY', label: 'Energy (USDT fee bachao)' }, { key: 'BANDWIDTH', label: 'Bandwidth' }]} value={resource} onChange={setResource} />
      {!biometric && (<><Label>PIN</Label><PinField value={pin} onChangeText={setPin} /></>)}

      <ErrorText>{err}</ErrorText>
      {!!msg && <Muted style={{ color: colors.accent }}>{msg}</Muted>}

      <Btn title="Stake + Vote" loading={busy === 'stake'} disabled={!(Number(amount) >= 1)}
        onPress={() => run('stake', () => stakeTRX(amount, resource, true))} />
      <Btn title="Unstake" variant="ghost" loading={busy === 'unstake'} disabled={!(Number(amount) > 0)}
        onPress={() => run('unstake', () => unstakeTRX(amount, resource))} />
      {ready.length > 0 && (
        <Btn title="Unstaked TRX Withdraw Karo" variant="ghost" loading={busy === 'withdraw'} onPress={() => run('withdraw', withdrawUnstaked)} />
      )}
      <Btn title="Voting Rewards Claim Karo" variant="ghost" loading={busy === 'claim'} onPress={() => run('claim', claimRewards)} />

      {info && !info.srConfigured && <Warn>EXPO_PUBLIC_TRON_SR_ADDRESS set nahi hai, isliye votes nahi jaayenge (sirf freeze hoga).</Warn>}
      <Warn>Unstake karne ke 14 din baad TRX wapas withdraw hota hai.</Warn>
    </Screen>
  );
}
