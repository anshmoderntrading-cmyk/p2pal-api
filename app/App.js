import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { WalletProvider, useWallet } from './src/context/WalletContext';
import { colors } from './src/theme';

import WelcomeScreen from './src/screens/WelcomeScreen';
import CreateWalletScreen from './src/screens/CreateWalletScreen';
import ConfirmSeedScreen from './src/screens/ConfirmSeedScreen';
import ImportWalletScreen from './src/screens/ImportWalletScreen';
import SetPinScreen from './src/screens/SetPinScreen';
import UnlockScreen from './src/screens/UnlockScreen';
import HomeScreen from './src/screens/HomeScreen';
import SendScreen from './src/screens/SendScreen';
import ScanScreen from './src/screens/ScanScreen';
import ReceiveScreen from './src/screens/ReceiveScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import SwapScreen from './src/screens/SwapScreen';
import BuyScreen from './src/screens/BuyScreen';
import StakeScreen from './src/screens/StakeScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import ShowSeedScreen from './src/screens/ShowSeedScreen';

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
  headerTitleStyle: { fontWeight: '700' },
};

const TAB_ICONS = { Wallet: 'wallet', Trade: 'trending-up', History: 'time' };

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        ...headerOpts,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: { backgroundColor: colors.bgDeep, borderTopColor: colors.border, height: 76, paddingTop: 8 },
        tabBarLabelStyle: { fontSize: 13, fontWeight: '700' },
        tabBarIcon: ({ color, focused }) => (
          <Ionicons name={focused ? TAB_ICONS[route.name] : `${TAB_ICONS[route.name]}-outline`} size={26} color={color} />
        ),
        sceneStyle: { backgroundColor: colors.bg },
      })}
    >
      <Tab.Screen name="Wallet" component={HomeScreen} options={{ headerShown: false }} />
      <Tab.Screen name="Trade" component={SwapScreen} options={{ title: 'Swap', tabBarLabel: 'Trade' }} />
      <Tab.Screen name="History" component={HistoryScreen} />
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
    <Stack.Navigator screenOptions={{ ...headerOpts, contentStyle: { backgroundColor: colors.bg } }}>
      {status === 'none' && (
        <>
          <Stack.Screen name="Welcome" component={WelcomeScreen} options={{ headerShown: false }} />
          <Stack.Screen name="CreateWallet" component={CreateWalletScreen} options={{ title: 'Seed Phrase' }} />
          <Stack.Screen name="ConfirmSeed" component={ConfirmSeedScreen} options={{ title: 'Confirm Karo' }} />
          <Stack.Screen name="ImportWallet" component={ImportWalletScreen} options={{ title: 'Wallet Import' }} />
          <Stack.Screen name="SetPin" component={SetPinScreen} options={{ title: 'PIN Set Karo' }} />
        </>
      )}
      {status === 'locked' && (
        <Stack.Screen name="Unlock" component={UnlockScreen} options={{ headerShown: false }} />
      )}
      {status === 'unlocked' && (
        <>
          <Stack.Screen name="Main" component={MainTabs} options={{ headerShown: false }} />
          <Stack.Screen name="Send" component={SendScreen} options={{ title: 'Send' }} />
          <Stack.Screen name="Scan" component={ScanScreen} options={{ title: 'QR Scan' }} />
          <Stack.Screen name="Receive" component={ReceiveScreen} options={{ title: 'Receive' }} />
          <Stack.Screen name="Buy" component={BuyScreen} options={{ title: 'Add Funds' }} />
          <Stack.Screen name="Stake" component={StakeScreen} options={{ title: 'TRX Staking' }} />
          <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
          <Stack.Screen name="ShowSeed" component={ShowSeedScreen} options={{ title: 'Seed Phrase' }} />
        </>
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <WalletProvider>
      <NavigationContainer theme={navTheme}>
        <StatusBar style="light" />
        <Routes />
      </NavigationContainer>
    </WalletProvider>
  );
}
