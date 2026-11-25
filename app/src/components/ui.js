import React from 'react';
import { ScrollView, View, Text, TextInput, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../theme';

export function Screen({ children, refreshControl, style }) {
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={[{ padding: 20, paddingBottom: 48, gap: 16 }, style]}
      keyboardShouldPersistTaps="handled"
      refreshControl={refreshControl}
    >
      {children}
    </ScrollView>
  );
}

export function Btn({ title, onPress, variant = 'primary', disabled, loading, icon, style }) {
  const bg = { primary: colors.accent, danger: colors.dangerSoft, secondary: colors.card, ghost: 'transparent' }[variant];
  const fg = { primary: colors.onAccent, danger: colors.danger, secondary: colors.text, ghost: colors.text }[variant];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        s.btn,
        { backgroundColor: bg, opacity: disabled ? 0.4 : pressed ? 0.85 : 1 },
        variant === 'ghost' && { borderWidth: 1, borderColor: colors.border },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {icon && <Ionicons name={icon} size={20} color={fg} />}
          <Text style={[s.btnText, { color: fg }]}>{title}</Text>
        </View>
      )}
    </Pressable>
  );
}

export const Card = ({ children, style }) => <View style={[s.card, style]}>{children}</View>;
export const H1 = ({ children, style }) => <Text style={[s.h1, style]}>{children}</Text>;
export const Label = ({ children, style }) => <Text style={[s.label, style]}>{children}</Text>;
export const Muted = ({ children, style }) => <Text style={[s.muted, style]}>{children}</Text>;
export const ErrorText = ({ children }) =>
  children ? (
    <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
      <Ionicons name="alert-circle" size={16} color={colors.danger} />
      <Text style={{ color: colors.danger, flex: 1 }}>{children}</Text>
    </View>
  ) : null;

export function Notice({ children, tone = 'warn', icon }) {
  const c = { warn: [colors.warnSoft, colors.warn], danger: [colors.dangerSoft, colors.danger], info: [colors.accentSoft, colors.accent] }[tone];
  return (
    <View style={[s.notice, { backgroundColor: c[0] }]}>
      <Ionicons name={icon || (tone === 'info' ? 'shield-checkmark' : 'warning')} size={18} color={c[1]} />
      <Text style={{ color: colors.textSoft, fontSize: 13, lineHeight: 19, flex: 1 }}>{children}</Text>
    </View>
  );
}

export function Field({ right, style, ...props }) {
  return (
    <View style={[s.field, style]}>
      <TextInput placeholderTextColor={colors.muted} {...props} style={[s.input, props.multiline && { minHeight: 110, textAlignVertical: 'top' }]} />
      {right}
    </View>
  );
}

export function Segmented({ items, value, onChange }) {
  return (
    <View style={s.seg}>
      {items.map((it) => {
        const on = value === it.key;
        return (
          <Pressable key={it.key} onPress={() => onChange(it.key)} style={[s.segItem, on && s.segOn]}>
            <Text style={{ color: on ? colors.text : colors.muted, fontWeight: '700', fontSize: 15 }}>{it.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Row({ label, value, strong, valueColor }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 }}>
      <Text style={{ color: colors.muted, fontSize: 15 }}>{label}</Text>
      <Text style={{ color: valueColor || colors.text, fontSize: 15, fontWeight: strong ? '800' : '600' }}>{value}</Text>
    </View>
  );
}

export function SeedGrid({ words }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {words.map((w, i) => (
        <View key={i} style={s.word}>
          <Text style={{ color: colors.muted, width: 24, fontSize: 13 }}>{i + 1}</Text>
          <Text style={{ color: colors.text, fontWeight: '700', fontSize: 15 }}>{w}</Text>
        </View>
      ))}
    </View>
  );
}

export function IconBtn({ name, onPress, size = 22, color = colors.textSoft }) {
  return (
    <Pressable onPress={onPress} hitSlop={10} style={({ pressed }) => [{ padding: 6, opacity: pressed ? 0.6 : 1 }]}>
      <Ionicons name={name} size={size} color={color} />
    </Pressable>
  );
}

const s = StyleSheet.create({
  btn: { height: 54, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 },
  btnText: { fontSize: 16, fontWeight: '700' },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: 18, gap: 8 },
  h1: { color: colors.text, fontSize: 26, fontWeight: '800', letterSpacing: -0.3 },
  label: { color: colors.textSoft, fontSize: 14, fontWeight: '600' },
  muted: { color: colors.muted, fontSize: 14, lineHeight: 20 },
  notice: { flexDirection: 'row', gap: 10, padding: 14, borderRadius: radius.md, alignItems: 'flex-start' },
  field: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, paddingRight: 8 },
  input: { flex: 1, color: colors.text, padding: 16, fontSize: 16 },
  seg: { flexDirection: 'row', backgroundColor: colors.card, borderRadius: radius.md, padding: 4 },
  segItem: { flex: 1, alignItems: 'center', paddingVertical: 11, borderRadius: radius.sm },
  segOn: { backgroundColor: colors.cardHi },
  word: { width: '31.5%', flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: radius.sm, paddingVertical: 12, paddingHorizontal: 10 },
});
