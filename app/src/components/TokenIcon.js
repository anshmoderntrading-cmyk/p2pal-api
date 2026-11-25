import React from 'react';
import { View, Text } from 'react-native';
import { colors } from '../theme';

// USDT logo with a small network badge (TRON / BNB)
export default function TokenIcon({ network, size = 46 }) {
  const badge = Math.round(size * 0.42);
  return (
    <View style={{ width: size, height: size }}>
      <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.usdt, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: '#fff', fontWeight: '900', fontSize: size * 0.48 }}>₮</Text>
      </View>
      {network && (
        <View
          style={{
            position: 'absolute', right: -3, bottom: -3, width: badge, height: badge, borderRadius: badge / 2,
            backgroundColor: network === 'tron' ? colors.tron : colors.bsc, borderWidth: 2, borderColor: colors.card,
            alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Text style={{ color: network === 'tron' ? '#fff' : '#1A1A1A', fontSize: badge * 0.5, fontWeight: '900' }}>
            {network === 'tron' ? 'T' : 'B'}
          </Text>
        </View>
      )}
    </View>
  );
}

export function NetworkTag({ network }) {
  return (
    <View style={{ backgroundColor: colors.cardHi, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 }}>
      <Text style={{ color: colors.textSoft, fontSize: 11, fontWeight: '800' }}>{network === 'tron' ? 'TRC20' : 'BEP20'}</Text>
    </View>
  );
}
