import React, { useState } from 'react';
import * as Clipboard from 'expo-clipboard';
import { usePreventScreenCapture } from 'expo-screen-capture';
import { Screen, Btn, H1, Muted, Field, ErrorText, Notice, IconBtn } from '../components/ui';
import { isValidMnemonic, normalizeMnemonic } from '../services/wallet';

export default function ImportWalletScreen({ navigation }) {
  usePreventScreenCapture();
  const [phrase, setPhrase] = useState('');
  const [err, setErr] = useState('');

  const next = () => {
    if (!isValidMnemonic(phrase)) return setErr('Invalid recovery phrase. Enter 12 or 24 words separated by spaces.');
    navigation.navigate('CreatePin', { phrase: normalizeMnemonic(phrase) });
  };

  return (
    <Screen>
      <H1>Import wallet</H1>
      <Muted>Enter the 12 or 24-word recovery phrase from Trust Wallet, MetaMask, TronLink or any other wallet.</Muted>
      <Field
        value={phrase}
        onChangeText={(t) => { setPhrase(t); setErr(''); }}
        placeholder="word1 word2 word3 …"
        multiline
        autoCapitalize="none"
        autoCorrect={false}
        secureTextEntry={false}
        right={<IconBtn name="clipboard-outline" onPress={async () => setPhrase(await Clipboard.getStringAsync())} />}
      />
      <ErrorText>{err}</ErrorText>
      <Notice tone="info">Your phrase is encrypted and stored only on this device. It is never sent anywhere.</Notice>
      <Btn title="Import" onPress={next} disabled={!phrase.trim()} />
    </Screen>
  );
}
