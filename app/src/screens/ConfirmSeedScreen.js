import React, { useMemo, useState } from 'react';
import { usePreventScreenCapture } from 'expo-screen-capture';
import { Screen, Btn, Title, Muted, Field, Label, ErrorText } from '../components/ui';

function pickThree(n) {
  const s = new Set();
  while (s.size < 3) s.add(Math.floor(Math.random() * n));
  return [...s].sort((a, b) => a - b);
}

export default function ConfirmSeedScreen({ route, navigation }) {
  usePreventScreenCapture();
  const { phrase } = route.params;
  const words = phrase.split(' ');
  const idx = useMemo(() => pickThree(words.length), []);
  const [ans, setAns] = useState({});
  const [err, setErr] = useState('');

  const verify = () => {
    const ok = idx.every((i) => (ans[i] || '').trim().toLowerCase() === words[i]);
    if (!ok) return setErr('Words match nahi hue. Apna likha hua dobara check karo.');
    navigation.navigate('SetPin', { phrase });
  };

  return (
    <Screen>
      <Title>Confirm Karo</Title>
      <Muted>Check kar rahe hain ki aapne sahi likha hai.</Muted>
      {idx.map((i) => (
        <React.Fragment key={i}>
          <Label>Word #{i + 1}</Label>
          <Field
            value={ans[i] || ''}
            onChangeText={(t) => { setAns({ ...ans, [i]: t }); setErr(''); }}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder={`Word ${i + 1}`}
          />
        </React.Fragment>
      ))}
      <ErrorText>{err}</ErrorText>
      <Btn title="Confirm" onPress={verify} />
    </Screen>
  );
}
