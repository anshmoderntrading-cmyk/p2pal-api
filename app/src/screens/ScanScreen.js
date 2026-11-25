import React, { useRef } from 'react';
import { View, Text } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Screen, Btn, Muted } from '../components/ui';
import { colors } from '../theme';

export default function ScanScreen({ navigation, route }) {
  const [perm, requestPerm] = useCameraPermissions();
  const done = useRef(false);

  if (!perm) return null;
  if (!perm.granted) {
    return (
      <Screen>
        <Muted>Camera access is needed to scan QR codes.</Muted>
        <Btn title="Allow camera" onPress={requestPerm} />
      </Screen>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <CameraView
        style={{ flex: 1 }}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={({ data }) => {
          if (done.current) return;
          done.current = true;
          if (route.params?.from === 'home') navigation.replace('Withdraw', { scanned: data });
          else navigation.popTo('Withdraw', { scanned: data }, { merge: true });
        }}
      />
      <View style={{ position: 'absolute', top: '30%', alignSelf: 'center', width: 250, height: 250, borderWidth: 3, borderColor: colors.accent, borderRadius: 24 }} />
      <Text style={{ position: 'absolute', bottom: 60, alignSelf: 'center', color: '#fff', fontSize: 16 }}>Scan a USDT address QR code</Text>
    </View>
  );
}
