import React, { useRef, useState } from 'react';
import { View, ActivityIndicator, Linking, Alert, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { colors } from '../theme';

// Schemes that must leave the WebView and open a native app (UPI, intents, etc.)
const EXTERNAL = /^(upi|intent|phonepe|tez|gpay|paytmmp|bhim|credpay|mailto|tel|whatsapp):/i;

export default function WebViewScreen({ route }) {
  const { url } = route.params;
  const [progress, setProgress] = useState(0);
  const ref = useRef(null);

  // Open UPI / native-app links outside the WebView
  const onRequest = (req) => {
    const u = req.url || '';
    if (EXTERNAL.test(u)) {
      Linking.openURL(u).catch(() =>
        Alert.alert('App not found', 'The payment app could not be opened. Please install it and try again.')
      );
      return false;
    }
    return true;
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['bottom']}>
      {progress < 1 && (
        <View style={[s.bar, { width: `${Math.max(8, progress * 100)}%` }]} />
      )}
      <WebView
        ref={ref}
        source={{ uri: url }}
        originWhitelist={['*']}
        onShouldStartLoadWithRequest={onRequest}
        onLoadProgress={({ nativeEvent }) => setProgress(nativeEvent.progress)}
        javaScriptEnabled
        domStorageEnabled
        setSupportMultipleWindows={false}
        allowsInlineMediaPlayback
        mediaCapturePermissionGrantType="grant"
        allowsBackForwardNavigationGestures
        style={{ flex: 1, backgroundColor: colors.bg }}
        startInLoadingState
        renderLoading={() => (
          <View style={s.loading}><ActivityIndicator color={colors.accent} size="large" /></View>
        )}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  bar: { height: 3, backgroundColor: colors.accent },
  loading: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
});
