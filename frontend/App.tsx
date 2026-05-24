import { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { LoginView } from './src/views/LoginView';
import { RegisterView } from './src/views/RegisterView';
import { useLoginViewModel } from './src/viewmodels/useLoginViewModel';
import { useRegisterViewModel } from './src/viewmodels/useRegisterViewModel';
import HomeTabView from './src/views/HomeTabView';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<'login' | 'register' | 'home'>('login');

  const loginViewModel = useLoginViewModel({
    navigateToRegister: () => setCurrentScreen('register'),
    navigateToHome: () => setCurrentScreen('home')
  });

  const registerViewModel = useRegisterViewModel({
    navigateToLogin: () => setCurrentScreen('login'),
    navigateToHome: () => setCurrentScreen('home')
  });

  return (
    <SafeAreaProvider>
      {/* SafeAreaView precisa de flex: 1 */}
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <StatusBar style="light" />
          {currentScreen === 'login' ? (
            <LoginView {...loginViewModel} />
          ) : currentScreen === 'register' ? (
            <RegisterView {...registerViewModel} />
          ) : (
            <HomeTabView />
          )}
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,  // ← ESSENCIAL! Sem isso o SafeAreaView tem altura 0
    backgroundColor: '#121214',
  },
  container: {
    flex: 1,
    backgroundColor: '#121214',
  },
});