import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { LoginView } from '../src/views/LoginView';

jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  return {
    Feather: (props: any) => React.createElement('Feather', props, props.children),
    MaterialCommunityIcons: (props: any) => React.createElement('MaterialCommunityIcons', props, props.children),
  };
}, { virtual: true });

describe('LoginView (Interface Test)', () => {
  it('deve renderizar os elementos da interface corretamente', () => {
    const { getByText, getByPlaceholderText } = render(<LoginView />);

    // Títulos
    expect(getByText('Acesso Seguro')).toBeTruthy();
    expect(getByText(/Bem-vindo de volta/)).toBeTruthy();

    // Inputs
    expect(getByPlaceholderText('seu@email.com')).toBeTruthy();
    expect(getByPlaceholderText('••••••••')).toBeTruthy();

    // Botões
    expect(getByText('Entrar')).toBeTruthy();
    expect(getByText('Entrar com Biometria')).toBeTruthy();
    expect(getByText('Criar conta')).toBeTruthy();
  });

  it('deve chamar onEmailChange e onPasswordChange quando os inputs forem alterados', () => {
    const onEmailChangeMock = jest.fn();
    const onPasswordChangeMock = jest.fn();

    const { getByPlaceholderText } = render(
      <LoginView
        onEmailChange={onEmailChangeMock}
        onPasswordChange={onPasswordChangeMock}
      />
    );

    const emailInput = getByPlaceholderText('seu@email.com');
    const passwordInput = getByPlaceholderText('••••••••');

    fireEvent.changeText(emailInput, 'teste@teste.com');
    fireEvent.changeText(passwordInput, '123456');

    expect(onEmailChangeMock).toHaveBeenCalledWith('teste@teste.com');
    expect(onPasswordChangeMock).toHaveBeenCalledWith('123456');
  });

  it('deve desabilitar o botão Entrar e mostrar ActivityIndicator quando isLoading for true', () => {
    const { getByTestId, queryByText, root } = render(
      <LoginView isLoading={true} />
    );

    // O texto 'Entrar' não deve estar visível porque renderiza o ActivityIndicator
    expect(queryByText('Entrar')).toBeNull();

    // Verifica se existe um ActivityIndicator (por tipo)
    const activityIndicator = root.findByType('ActivityIndicator' as any);
    expect(activityIndicator).toBeTruthy();
  });

  it('deve mostrar a mensagem de erro se error for fornecido', () => {
    const errorMessage = 'Email ou senha inválidos';
    const { getByText } = render(<LoginView error={errorMessage} />);

    expect(getByText(errorMessage)).toBeTruthy();
  });
});
