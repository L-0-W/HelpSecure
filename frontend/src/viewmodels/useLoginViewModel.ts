import { useState } from 'react';
import { Alert } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { authService } from '../services/authService';
import { LoginViewModelProps } from '../models/models';

export const useLoginViewModel = (props?: LoginViewModelProps) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    if (hasHardware) {
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      if (isEnrolled) {
        let result = await LocalAuthentication.authenticateAsync();

        if (result.success) {
          Alert.alert('Biometria', 'Login biometrico realizado com sucesso!');
        }
        else {
          Alert.alert('Biometria', 'Falha na autenticação biometrica...');
        }
      }
      else {
        Alert.alert('Biometria', 'Nemhuma cadastro biometrico foi encontrado...');
      }

    }
    else {
      Alert.alert('Biometria', 'Biometria não disponivel...');
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
