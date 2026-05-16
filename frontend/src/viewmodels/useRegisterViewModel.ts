import { useState } from 'react';
import { Alert } from 'react-native';

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
    setError(null);
    if (!name || !email || !password) {
      setError('Por favor, preencha todos os campos.');
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch('https://api-robotica-movel.onrender.com/usuarios', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ nome: name, email, senha: password }),
      });

      const data = await response.json();

      if (response.ok) {
        // Você poderia salvar o data.token aqui (ex: AsyncStorage)
        if (props?.navigateToHome) {
          props.navigateToHome();
        }
      } else {
        setError(data.error || 'Não foi possível criar a conta');
      }
    } catch (err) {
      setError('Não foi possível conectar ao servidor.');
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
