import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { WalletProvider, useWallet } from './src/context/WalletContext';
import { colors } from './src/theme';

import WelcomeScreen from './src/screens/WelcomeScreen';
import CreateWalletScreen from './src/screens/CreateWalletScreen';
import ConfirmSeedScreen from './src/screens/ConfirmSeedScreen';
import ImportWalletScreen from './src/screens/ImportWalletScreen';
import CreatePinScreen from './src/screens/CreatePinScreen';
import UnlockScreen from './src/screens/UnlockScreen';
import HomeScreen from './src/screens/HomeScreen';
import DepositScreen from './src/screens/DepositScreen';
import WithdrawScreen from './src/screens/WithdrawScreen';
import ScanScreen from './src/screens/ScanScreen';
import P2PScreen from './src/screens/P2PScreen';
import ActivityScreen from './src/screens/ActivityScreen';
import WebViewScreen from './src/screens/WebViewScreen';
import TxDetailScreen from './src/screens/TxDetailScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import ShowSeedScreen from './src/screens/ShowSeedScreen';
import ChangePinScreen from './src/screens/ChangePinScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const navTheme = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, background: colors.bg, card: colors.bg, primary: colors.accent, text: colors.text, border: colors.border },
};

const headerOpts = {
  headerStyle: { backgroundColor: colors.bg },
  headerTintColor: colors.text,
  headerShadowVisible: false,
  headerTitleStyle: { fontWeight: '700', fontSize: 18 },
  headerTitleAlign: 'center',
};

const TAB_ICONS = { Wallet: 'wallet', P2P: 'swap-horizontal', Activity: 'time' };

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        ...headerOpts,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: { backgroundColor: colors.bgDeep, borderTopColor: colors.border, height: 72, paddingTop: 8 },
        tabBarLabelStyle: { fontSize: 12, fontWeight: '700' },
        tabBarIcon: ({ color, focused }) => (
          <Ionicons name={focused ? TAB_ICONS[route.name] : `${TAB_ICONS[route.name]}-outline`} size={24} color={color} />
        ),
        sceneStyle: { backgroundColor: colors.bg },
      })}
    >
      <Tab.Screen name="Wallet" component={HomeScreen} options={{ headerShown: false }} />
      <Tab.Screen name="P2P" component={P2PScreen} options={{ title: 'P2P Trade' }} />
      <Tab.Screen name="Activity" component={ActivityScreen} />
    </Tab.Navigator>
  );
}

function Routes() {
  const { status } = useWallet();

  if (status === 'loading') {
    return (
      <View style={{ flex: 1, justifyContent: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ ...headerOpts, contentStyle: { backgroundColor: colors.bg }, headerBackButtonDisplayMode: 'minimal' }}>
      {status === 'none' && (
        <>
          <Stack.Screen name="Welcome" component={WelcomeScreen} options={{ headerShown: false }} />
          <Stack.Screen name="CreateWallet" component={CreateWalletScreen} options={{ title: '' }} />
          <Stack.Screen name="ConfirmSeed" component={ConfirmSeedScreen} options={{ title: '' }} />
          <Stack.Screen name="ImportWallet" component={ImportWalletScreen} options={{ title: '' }} />
          <Stack.Screen name="CreatePin" component={CreatePinScreen} options={{ title: '' }} />
        </>
      )}
      {status === 'locked' && <Stack.Screen name="Unlock" component={UnlockScreen} options={{ headerShown: false }} />}
      {status === 'unlocked' && (
        <>
          <Stack.Screen name="Main" component={MainTabs} options={{ headerShown: false }} />
          <Stack.Screen name="Deposit" component={DepositScreen} />
          <Stack.Screen name="Withdraw" component={WithdrawScreen} />
          <Stack.Screen name="Scan" component={ScanScreen} options={{ title: 'Scan QR' }} />
          <Stack.Screen name="TxDetail" component={TxDetailScreen} options={{ title: 'Transaction' }} />
          <Stack.Screen name="Checkout" component={WebViewScreen} options={({ route }) => ({ title: route.params?.title || 'Checkout' })} />
          <Stack.Screen name="Settings" component={SettingsScreen} />
          <Stack.Screen name="ShowSeed" component={ShowSeedScreen} options={{ title: '' }} />
          <Stack.Screen name="ChangePin" component={ChangePinScreen} options={{ title: '' }} />
        </>
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <WalletProvider>
        <NavigationContainer theme={navTheme}>
          <StatusBar style="light" />
          <Routes />
        </NavigationContainer>
      </WalletProvider>
    </SafeAreaProvider>
  );
}
