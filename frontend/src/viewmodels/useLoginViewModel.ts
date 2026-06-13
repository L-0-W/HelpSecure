import { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authService } from '../services/authService';
import { LoginViewModelProps } from '../models/models';

export const useLoginViewModel = (props?: LoginViewModelProps) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkAndPromptBiometrics();
  }, []);

  const checkAndPromptBiometrics = async () => {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();

    if (hasHardware && isEnrolled) {
      const storedToken = await SecureStore.getItemAsync('biometric_token');
      if (storedToken) {
        await handleBiometricAuth(storedToken);
      }
    }
  };

  const handleBiometricAuth = async (token: string) => {
    try {
      let result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Autentique-se para entrar',
        cancelLabel: 'Cancelar',
        disableDeviceFallback: true,
      });

      if (result.success) {
        setIsLoading(true);
        setError(null);
        // Colocar temporariamente no AsyncStorage para apiRequest pegar
        await AsyncStorage.setItem('token', token);
        
        try {
          await authService.validarToken();
          if (props?.navigateToHome) {
            props.navigateToHome();
          }
        } catch (apiError) {
          setError('Sessão expirada ou inválida. Faça login com senha novamente.');
          await SecureStore.deleteItemAsync('biometric_token');
          await AsyncStorage.removeItem('token');
        }
      } else {
        // Usuário cancelou ou falhou
        // setError('Falha na autenticação biométrica.');
      }
    } catch (err) {
      setError('Erro ao processar biometria.');
    } finally {
      setIsLoading(false);
    }
  };

  const onEmailChange = (text: string) => {
    setEmail(text);
  };

  const onPasswordChange = (text: string) => {
    setPassword(text);
  };

  const onTogglePasswordVisibility = () => {
    setIsPasswordVisible(!isPasswordVisible);
  };

  const onLogin = async () => {
    if (isLoading) return;
    setError(null);
    if (!email || !password) {
      setError('Por favor, preencha o email e a senha.');
      return;
    }

    try {
      setIsLoading(true);
      await authService.login(email, password);
      if (props?.navigateToHome) {
        props.navigateToHome();
      }
    } catch (err: any) {

      if (err.message === "invalid_credentials") {
        setError("Email ou senha invalidos");
      } else {
        setError('Não foi possível conectar ao servidor.');
      }

    } finally {
      setIsLoading(false);
    }
  };

  const onBiometricLogin = async () => {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    
    if (hasHardware && isEnrolled) {
      const storedToken = await SecureStore.getItemAsync('biometric_token');
      if (storedToken) {
        await handleBiometricAuth(storedToken);
      } else {
        Alert.alert('Biometria', 'Você precisa habilitar a biometria nas configurações após fazer login com senha.');
      }
    } else {
      Alert.alert('Biometria', 'Biometria não disponível ou não configurada neste dispositivo.');
    }
  };

  const onForgotPassword = () => {
    Alert.alert('Esqueci a Senha', 'Redirecionando...');
  };

  const onCreateAccount = () => {
    if (!props?.navigateToRegister)
      return;

    props.navigateToRegister();
  };

  return {
    email,
    password,
    isPasswordVisible,
    onEmailChange,
    onPasswordChange,
    onTogglePasswordVisibility,
    onLogin,
    onBiometricLogin,
    onForgotPassword,
    onCreateAccount,
    isLoading,
    error,
  };
};
