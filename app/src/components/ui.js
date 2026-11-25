import React from 'react';
import { ScrollView, View, Text, TextInput, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { colors } from '../theme';

export function Screen({ children, refreshControl, style }) {
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={[{ padding: 16, paddingBottom: 48, gap: 14 }, style]}
      keyboardShouldPersistTaps="handled"
      refreshControl={refreshControl}
    >
      {children}
    </ScrollView>
  );
}

export function Btn({ title, onPress, variant = 'primary', disabled, loading, style }) {
  const bg = variant === 'primary' ? colors.accent : variant === 'danger' ? colors.danger : colors.card;
  const fg = variant === 'primary' ? '#04210F' : colors.text;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        s.btn,
        { backgroundColor: bg, opacity: disabled ? 0.4 : pressed ? 0.8 : 1 },
        variant === 'ghost' && { borderWidth: 1, borderColor: colors.border },
        style,
      ]}
    >
      {loading ? <ActivityIndicator color={fg} /> : <Text style={[s.btnText, { color: fg }]}>{title}</Text>}
    </Pressable>
  );
}

export const Card = ({ children, style }) => <View style={[s.card, style]}>{children}</View>;
export const Title = ({ children, style }) => <Text style={[s.title, style]}>{children}</Text>;
export const Label = ({ children, style }) => <Text style={[s.label, style]}>{children}</Text>;
export const Muted = ({ children, style }) => <Text style={[s.muted, style]}>{children}</Text>;
export const Warn = ({ children }) => (
  <View style={s.warn}>
    <Text style={{ color: colors.warn, fontSize: 13, lineHeight: 19 }}>⚠️ {children}</Text>
  </View>
);
export const ErrorText = ({ children }) => (children ? <Text style={{ color: colors.danger }}>{children}</Text> : null);

export function Field(props) {
  return <TextInput placeholderTextColor={colors.muted} {...props} style={[s.input, props.style]} />;
}

export function PinField({ value, onChangeText, placeholder = '6-digit PIN', autoFocus }) {
  return (
    <Field
      value={value}
      onChangeText={(t) => onChangeText(t.replace(/\D/g, '').slice(0, 6))}
      placeholder={placeholder}
      keyboardType="number-pad"
      secureTextEntry
      maxLength={6}
      autoFocus={autoFocus}
      style={{ textAlign: 'center', fontSize: 22, letterSpacing: 8 }}
    />
  );
}

export function Chips({ items, value, onChange }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {items.map((it) => (
        <Pressable
          key={it.key}
          onPress={() => onChange(it.key)}
          style={[s.chip, value === it.key && { backgroundColor: colors.accent, borderColor: colors.accent }]}
        >
          <Text style={{ color: value === it.key ? '#04210F' : colors.text, fontWeight: '600' }}>{it.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export function SeedGrid({ words }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {words.map((w, i) => (
        <View key={i} style={s.word}>
          <Text style={{ color: colors.muted, width: 22 }}>{i + 1}.</Text>
          <Text style={{ color: colors.text, fontWeight: '600' }}>{w}</Text>
        </View>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  btn: { paddingVertical: 15, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  btnText: { fontSize: 16, fontWeight: '700' },
  card: { backgroundColor: colors.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.border, gap: 8 },
  title: { color: colors.text, fontSize: 24, fontWeight: '800' },
  label: { color: colors.text, fontSize: 14, fontWeight: '600' },
  muted: { color: colors.muted, fontSize: 13, lineHeight: 19 },
  input: {
    backgroundColor: colors.card, color: colors.text, borderRadius: 12, borderWidth: 1,
    borderColor: colors.border, padding: 14, fontSize: 16,
  },
  warn: { backgroundColor: '#2A1F0A', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#4A3510' },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card },
  word: {
    width: '31%', flexDirection: 'row', backgroundColor: colors.card, borderRadius: 10,
    paddingVertical: 10, paddingHorizontal: 8, borderWidth: 1, borderColor: colors.border,
  },
});
