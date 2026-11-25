import React, { useRef } from 'react';
import { View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Screen, Btn, Muted } from '../components/ui';

export default function ScanScreen({ navigation }) {
  const [perm, requestPerm] = useCameraPermissions();
  const done = useRef(false);

  if (!perm) return null;
  if (!perm.granted) {
    return (
      <Screen>
        <Muted>QR scan karne ke liye camera permission chahiye.</Muted>
        <Btn title="Permission do" onPress={requestPerm} />
      </Screen>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <CameraView
        style={{ flex: 1 }}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={({ data }) => {
          if (done.current) return;
          done.current = true;
          navigation.popTo('Send', { scanned: data }, { merge: true });
        }}
      />
    </View>
  );
}
