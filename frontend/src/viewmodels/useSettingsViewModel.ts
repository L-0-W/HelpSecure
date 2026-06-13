import { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authService } from '../services/authService';

export const useSettingsViewModel = () => {
  const [isBiometricEnabled, setIsBiometricEnabled] = useState(false);
  const [isBiometricSupported, setIsBiometricSupported] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    checkBiometricSupport();
  }, []);

  const checkBiometricSupport = async () => {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    
    setIsBiometricSupported(hasHardware && isEnrolled);

    if (hasHardware && isEnrolled) {
      const storedToken = await SecureStore.getItemAsync('biometric_token');
      setIsBiometricEnabled(!!storedToken);
    }
  };

  const toggleBiometric = async (value: boolean) => {
    if (!isBiometricSupported) {
      Alert.alert('Erro', 'Seu dispositivo não suporta biometria ou ela não está configurada.');
      return;
    }

    setIsLoading(true);

    try {
      // call api
      await authService.habilitarBiometria(value);

      if (value) {
        // Authenticate first to ensure it's the right person? The prompt doesn't say that, but it's good practice.
        // The prompt says: "caso a API retornar Ok, salva o token de acesso dentro do armazenamento seguro do celular"
        const token = await AsyncStorage.getItem('token');
        if (token) {
          await SecureStore.setItemAsync('biometric_token', token);
          setIsBiometricEnabled(true);
          Alert.alert('Sucesso', 'Biometria habilitada com sucesso.');
        } else {
          Alert.alert('Erro', 'Nenhum token encontrado. Faça login novamente.');
        }
      } else {
        await SecureStore.deleteItemAsync('biometric_token');
        setIsBiometricEnabled(false);
        Alert.alert('Sucesso', 'Biometria desabilitada.');
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Erro', 'Não foi possível alterar a configuração de biometria.');
      // Revert switch visually by keeping old state
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (navigateToLogin: () => void) => {
    try {
      await authService.logout();
      navigateToLogin();
    } catch (error) {
      console.error(error);
      Alert.alert('Erro', 'Não foi possível deslogar do aplicativo.');
    }
  };

  return {
    isBiometricEnabled,
    isBiometricSupported,
    isLoading,
    toggleBiometric,
    logout
  };
};
