import { useState } from 'react';
import { Alert } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';

interface LoginViewModelProps {
  navigateToRegister?: () => void;
  navigateToHome?: () => void;
}

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
      const response = await fetch('https://api-robotica-movel.onrender.com/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, senha: password }),
      });

      const data = await response.json();

      if (response.ok) {
        // Você poderia salvar o data.token aqui (ex: AsyncStorage)
        if (props?.navigateToHome) {
          props.navigateToHome();
        }
      } else {
        setError(data.error || 'Credenciais inválidas');
      }
    } catch (err) {
      setError('Não foi possível conectar ao servidor.');
    } finally {
      setIsLoading(false);
    }
  };

  const onBiometricLogin = async () => {
    // Aqui entraria a integração com expo-local-authentication
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
    // Redirecionamento para a tela de esqueci a senha
    Alert.alert('Esqueci a Senha', 'Redirecionando...');
  };

  const onCreateAccount = () => {
    if (props?.navigateToRegister) {
      props.navigateToRegister();
    } else {
      Alert.alert('Criar Conta', 'Redirecionando...');
    }
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
