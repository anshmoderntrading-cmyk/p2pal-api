import React, { useRef, useState } from 'react';
import { View, Text, Pressable, Animated, Vibration, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'bio', '0', 'del'];

/**
 * 6-digit PIN keypad.
 * onComplete(pin) → return an error string to reject (dots shake), or nothing to accept.
 */
export default function PinPad({ title, subtitle, onComplete, onBiometric, length = 6 }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const shake = useRef(new Animated.Value(0)).current;

  const doShake = () => {
    Vibration.vibrate(180);
    Animated.sequence(
      [12, -12, 8, -8, 0].map((v) => Animated.timing(shake, { toValue: v, duration: 55, useNativeDriver: true }))
    ).start();
  };

  const press = async (k) => {
    if (busy) return;
    if (k === 'del') return setPin((p) => p.slice(0, -1));
    if (k === 'bio') return onBiometric?.();
    if (pin.length >= length) return;
    const next = pin + k;
    setPin(next);
    setError('');
    if (next.length === length) {
      setBusy(true);
      const err = await onComplete(next);
      setBusy(false);
      setPin('');
      if (err) {
        setError(err);
        doShake();
      }
    }
  };

  return (
    <View style={{ alignItems: 'center', width: '100%' }}>
      {!!title && <Text style={s.title}>{title}</Text>}
      {!!subtitle && <Text style={s.sub}>{subtitle}</Text>}
      <Animated.View style={[s.dots, { transform: [{ translateX: shake }] }]}>
        {busy ? (
          <ActivityIndicator color={colors.accent} />
        ) : (
          Array.from({ length }).map((_, i) => (
            <View key={i} style={[s.dot, i < pin.length && s.dotOn, !!error && s.dotErr]} />
          ))
        )}
      </Animated.View>
      <Text style={s.err}>{error}</Text>
      <View style={s.grid}>
        {KEYS.map((k) => {
          if (k === 'bio' && !onBiometric) return <View key={k} style={s.key} />;
          return (
            <Pressable key={k} onPress={() => press(k)} style={({ pressed }) => [s.key, pressed && { backgroundColor: colors.cardHi }]}>
              {k === 'del' ? (
                <Ionicons name="backspace-outline" size={28} color={colors.text} />
              ) : k === 'bio' ? (
                <Ionicons name="finger-print" size={30} color={colors.accent} />
              ) : (
                <Text style={s.keyText}>{k}</Text>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  title: { color: colors.text, fontSize: 22, fontWeight: '800', textAlign: 'center' },
  sub: { color: colors.muted, fontSize: 15, marginTop: 8, textAlign: 'center', paddingHorizontal: 24 },
  dots: { flexDirection: 'row', gap: 18, marginTop: 32, height: 20, alignItems: 'center' },
  dot: { width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: colors.muted },
  dotOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  dotErr: { borderColor: colors.danger },
  err: { color: colors.danger, marginTop: 14, height: 20, fontSize: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', width: 300, justifyContent: 'space-between', rowGap: 14, marginTop: 18 },
  key: { width: 84, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  keyText: { color: colors.text, fontSize: 30, fontWeight: '500' },
});
