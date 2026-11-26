import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, Pressable, FlatList, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useWallet } from '../context/WalletContext';
import { addressFor } from '../config/chains';
import { isSameAddress } from '../services/usdt';
import { getMessages, sendMessage } from '../services/p2pApi';
import { colors, radius } from '../theme';

export default function OrderChatScreen({ route }) {
  const { order } = route.params;
  const network = order.chain;
  const { addresses } = useWallet();
  const me = addressFor(addresses, network);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const poll = useRef(null);

  const load = useCallback(async () => {
    try { setMessages(await getMessages(network, order.id)); } catch {}
  }, [order.id]);

  useEffect(() => {
    load();
    poll.current = setInterval(load, 4000);
    return () => clearInterval(poll.current);
  }, [load]);

  const send = async () => {
    const body = text.trim();
    if (!body) return;
    setText('');
    setSending(true);
    try { await sendMessage(network, order.id, { body }); await load(); }
    catch { setText(body); }
    finally { setSending(false); }
  };

  const render = ({ item: m }) => {
    const mine = isSameAddress(m.sender_address, me);
    return (
      <View style={[s.bubbleRow, { justifyContent: mine ? 'flex-end' : 'flex-start' }]}>
        <View style={[s.bubble, mine ? s.mine : s.theirs]}>
          {!!m.body && <Text style={{ color: mine ? colors.onAccent : colors.text, fontSize: 15 }}>{m.body}</Text>}
          <Text style={[s.time, { color: mine ? 'rgba(3,24,15,0.6)' : colors.muted }]}>
            {new Date(m.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
        <FlatList
          data={messages}
          keyExtractor={(m) => String(m.id)}
          renderItem={render}
          contentContainerStyle={{ padding: 16, gap: 8 }}
          ListEmptyComponent={<Text style={{ color: colors.muted, textAlign: 'center', marginTop: 40 }}>Say hello and coordinate the payment.</Text>}
        />
        <View style={s.inputBar}>
          <TextInput
            style={s.input}
            value={text}
            onChangeText={setText}
            placeholder="Message…"
            placeholderTextColor={colors.muted}
            multiline
          />
          <Pressable onPress={send} disabled={sending || !text.trim()} style={[s.sendBtn, { opacity: text.trim() ? 1 : 0.4 }]}>
            <Ionicons name="arrow-up" size={22} color={colors.onAccent} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  bubbleRow: { flexDirection: 'row' },
  bubble: { maxWidth: '78%', padding: 10, borderRadius: 16 },
  mine: { backgroundColor: colors.accent, borderBottomRightRadius: 4 },
  theirs: { backgroundColor: colors.card, borderBottomLeftRadius: 4 },
  time: { fontSize: 10, marginTop: 4, alignSelf: 'flex-end' },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, padding: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  input: { flex: 1, maxHeight: 120, backgroundColor: colors.card, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, color: colors.text, fontSize: 15 },
  sendBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
});
