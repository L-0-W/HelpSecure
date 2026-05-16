import { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { LoginView } from './src/views/LoginView';
import { RegisterView } from './src/views/RegisterView';
import { HomeView } from './src/views/HomeView';
import { useLoginViewModel } from './src/viewmodels/useLoginViewModel';
import { useRegisterViewModel } from './src/viewmodels/useRegisterViewModel';

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
      <View style={{ flex: 1, backgroundColor: '#121214' }}>
        <StatusBar style="light" />
        {currentScreen === 'login' ? (
          <LoginView {...loginViewModel} />
        ) : currentScreen === 'register' ? (
          <RegisterView {...registerViewModel} />
        ) : (
          <HomeView />
        )}
      </View>
    </SafeAreaProvider>
  );
}
