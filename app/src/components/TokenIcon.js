import React from 'react';
import { View, Text } from 'react-native';
import { coinColors, colors } from '../theme';

export default function TokenIcon({ symbol, size = 48 }) {
  const bg = coinColors[symbol] || colors.cardHi;
  const label = symbol === 'USDT' ? '₮' : symbol.slice(0, symbol.length > 3 ? 1 : 3);
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: '#fff', fontWeight: '900', fontSize: label.length > 2 ? size * 0.28 : size * 0.42 }}>{label}</Text>
    </View>
  );
}
