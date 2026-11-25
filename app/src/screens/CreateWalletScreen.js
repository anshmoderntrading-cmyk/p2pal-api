import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePreventScreenCapture } from 'expo-screen-capture';
import { Screen, Btn, H1, Muted, Notice, SeedGrid } from '../components/ui';
import { generateMnemonic } from '../services/wallet';
import { colors } from '../theme';

export default function CreateWalletScreen({ navigation }) {
  usePreventScreenCapture();
  const [phrase] = useState(() => generateMnemonic());
  const [revealed, setRevealed] = useState(false);
  const [saved, setSaved] = useState(false);

  return (
    <Screen>
      <H1>Your recovery phrase</H1>
      <Muted>These 12 words are the only way to restore your wallet. Write them down in order and keep them somewhere safe.</Muted>

      <Pressable onPress={() => setRevealed(true)} disabled={revealed}>
        <View>
          <SeedGrid words={phrase.split(' ')} />
          {!revealed && (
            <View style={{ position: 'absolute', inset: 0, top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.card, borderRadius: 14, alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <Ionicons name="eye-off" size={28} color={colors.textSoft} />
              <Text style={{ color: colors.text, fontWeight: '700' }}>Tap to reveal</Text>
              <Text style={{ color: colors.muted, fontSize: 13 }}>Make sure no one is watching your screen</Text>
            </View>
          )}
        </View>
      </Pressable>

      <Notice tone="danger" icon="lock-closed">
        Never share your recovery phrase. P2Pal support will never ask for it. Do not store it in screenshots, chats or cloud notes.
      </Notice>

      <Pressable onPress={() => setSaved(!saved)} style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
        <Ionicons name={saved ? 'checkbox' : 'square-outline'} size={24} color={saved ? colors.accent : colors.muted} />
        <Text style={{ color: colors.textSoft, flex: 1 }}>I have written down my recovery phrase</Text>
      </Pressable>
      <Btn title="Continue" disabled={!saved || !revealed} onPress={() => navigation.navigate('ConfirmSeed', { phrase })} />
    </Screen>
  );
}
