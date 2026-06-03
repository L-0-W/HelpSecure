import { useState } from 'react';
import { Alert } from 'react-native';
import { authService } from '../services/authService';

interface RegisterViewModelProps {
  navigateToLogin?: () => void;
  navigateToHome?: () => void;
}

export const useRegisterViewModel = (props?: RegisterViewModelProps) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onNameChange = (text: string) => {
    setName(text);
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

  const onRegister = async () => {
    if (isLoading) return;
    setError(null);
    if (!name || !email || !password) {
      setError('Por favor, preencha todos os campos.');
      return;
    }

    try {
      setIsLoading(true);
      await authService.register(name, email, password);
      if (props?.navigateToHome) {
        props.navigateToHome();
      }
    } catch (err: any) {
      setError(err.message || 'Não foi possível conectar ao servidor.');
    } finally {
      setIsLoading(false);
    }
  };

  const onGoToLogin = () => {
    if (props?.navigateToLogin) {
      props.navigateToLogin();
    } else {
      Alert.alert('Navegação', 'Voltando para a tela de login...');
    }
  };

  return {
    name,
    email,
    password,
    isPasswordVisible,
    onNameChange,
    onEmailChange,
    onPasswordChange,
    onTogglePasswordVisibility,
    onRegister,
    onGoToLogin,
    isLoading,
    error,
  };
};
