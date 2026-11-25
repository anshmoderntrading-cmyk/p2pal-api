import React, { useEffect, useState } from 'react';
import { usePreventScreenCapture } from 'expo-screen-capture';
import { Screen, Btn, H1, Muted, Notice, SeedGrid } from '../components/ui';
import { useWallet } from '../context/WalletContext';
import { getMnemonic } from '../services/secure';

export default function ShowSeedScreen({ navigation }) {
  usePreventScreenCapture();
  const { requestAuth } = useWallet();
  const [words, setWords] = useState(null);

  const reveal = async () => {
    // Always PIN (not biometric) for the recovery phrase
    if (await requestAuth('Enter PIN to view your recovery phrase', { pinOnly: true })) {
      setWords((await getMnemonic()).split(' '));
    }
  };

  useEffect(() => { reveal(); }, []);

  return (
    <Screen>
      <H1>Recovery phrase</H1>
      <Muted>Anyone with these words can take your funds. Never share them.</Muted>
      {words ? <SeedGrid words={words} /> : <Btn title="Reveal phrase" icon="eye-outline" onPress={reveal} />}
      <Notice tone="danger" icon="lock-closed">P2Pal support will never ask for your recovery phrase.</Notice>
      {words && <Btn title="Done" variant="secondary" onPress={() => navigation.goBack()} />}
    </Screen>
  );
}
