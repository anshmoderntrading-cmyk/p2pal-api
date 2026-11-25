import React, { useState } from 'react';
import { usePreventScreenCapture } from 'expo-screen-capture';
import { Screen, Btn, Title, Muted, Field, ErrorText, Warn } from '../components/ui';
import { isValidMnemonic, normalizeMnemonic } from '../services/wallet';

export default function ImportWalletScreen({ navigation }) {
  usePreventScreenCapture();
  const [phrase, setPhrase] = useState('');
  const [err, setErr] = useState('');

  const next = () => {
    if (!isValidMnemonic(phrase)) return setErr('Seed phrase galat hai. 12 ya 24 words, space se alag.');
    navigation.navigate('SetPin', { phrase: normalizeMnemonic(phrase) });
  };

  return (
    <Screen>
      <Title>Wallet Import Karo</Title>
      <Muted>Trust Wallet, MetaMask, TronLink — kisi ka bhi 12/24-word seed phrase daalo.</Muted>
      <Field
        value={phrase}
        onChangeText={(t) => { setPhrase(t); setErr(''); }}
        placeholder="word1 word2 word3 ..."
        multiline
        autoCapitalize="none"
        autoCorrect={false}
        style={{ minHeight: 120, textAlignVertical: 'top' }}
      />
      <ErrorText>{err}</ErrorText>
      <Warn>Seed phrase sirf is phone me encrypted save hoga. Kahin bheja nahi jaata.</Warn>
      <Btn title="Import" onPress={next} disabled={!phrase.trim()} />
    </Screen>
  );
}
