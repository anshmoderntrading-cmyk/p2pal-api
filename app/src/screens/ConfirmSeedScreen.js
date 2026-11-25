import React, { useMemo, useState } from 'react';
import { View, Pressable, Text } from 'react-native';
import { usePreventScreenCapture } from 'expo-screen-capture';
import { Screen, Btn, H1, Muted, ErrorText, Label } from '../components/ui';
import { colors } from '../theme';

function pick(n, k) {
  const s = new Set();
  while (s.size < k) s.add(Math.floor(Math.random() * n));
  return [...s].sort((a, b) => a - b);
}

// Tap-to-select verification (no typing): pick the right word for 3 positions
export default function ConfirmSeedScreen({ route, navigation }) {
  usePreventScreenCapture();
  const { phrase } = route.params;
  const words = phrase.split(' ');
  const idx = useMemo(() => pick(words.length, 3), []);
  const options = useMemo(
    () =>
      idx.map((i) => {
        const others = pick(words.length, 6).filter((j) => j !== i).slice(0, 2).map((j) => words[j]);
        return [words[i], ...others].sort(() => Math.random() - 0.5);
      }),
    []
  );
  const [ans, setAns] = useState({});
  const [err, setErr] = useState('');

  const verify = () => {
    if (!idx.every((i) => ans[i] === words[i])) return setErr('That doesn’t match. Check your written phrase and try again.');
    navigation.navigate('CreatePin', { phrase });
  };

  return (
    <Screen>
      <H1>Verify your phrase</H1>
      <Muted>Select the correct word for each position.</Muted>
      {idx.map((i, n) => (
        <View key={i} style={{ gap: 10 }}>
          <Label>Word #{i + 1}</Label>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {options[n].map((w) => {
              const on = ans[i] === w;
              return (
                <Pressable
                  key={w}
                  onPress={() => { setAns({ ...ans, [i]: w }); setErr(''); }}
                  style={{ flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center', backgroundColor: on ? colors.accentSoft : colors.card, borderWidth: 1, borderColor: on ? colors.accent : colors.border }}
                >
                  <Text style={{ color: on ? colors.accent : colors.text, fontWeight: '700' }}>{w}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ))}
      <ErrorText>{err}</ErrorText>
      <Btn title="Verify" disabled={Object.keys(ans).length < 3} onPress={verify} />
    </Screen>
  );
}
