import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { usePreventScreenCapture } from 'expo-screen-capture';
import { Screen, Btn, Title, Muted, Warn, SeedGrid } from '../components/ui';
import { generateMnemonic } from '../services/wallet';
import { colors } from '../theme';

export default function CreateWalletScreen({ navigation }) {
  usePreventScreenCapture(); // seed ka screenshot block
  const [phrase] = useState(() => generateMnemonic());
  const [saved, setSaved] = useState(false);

  return (
    <Screen>
      <Title>Apna Seed Phrase Likh Lo</Title>
      <Muted>Ye 12 words hi aapka wallet hain. Phone kho gaya to sirf inhi se wallet wapas milega.</Muted>
      <SeedGrid words={phrase.split(' ')} />
      <Warn>
        Kaagaz pe likho. Screenshot, WhatsApp, Google Drive pe kabhi mat rakho. P2Pal team kabhi bhi seed phrase nahi maangti.
      </Warn>
      <Pressable onPress={() => setSaved(!saved)} style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
        <View style={{ width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: colors.accent, backgroundColor: saved ? colors.accent : 'transparent' }} />
        <Text style={{ color: colors.text, flex: 1 }}>Maine 12 words safe jagah likh liye hain</Text>
      </Pressable>
      <Btn title="Aage Badho" disabled={!saved} onPress={() => navigation.navigate('ConfirmSeed', { phrase })} />
    </Screen>
  );
}
