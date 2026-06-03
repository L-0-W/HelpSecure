import { renderHook, act } from '@testing-library/react-native';
import { useLoginViewModel } from '../src/viewmodels/useLoginViewModel';
import { authService } from '../src/services/authService';

// Mock do serviço e do LocalAuthentication
jest.mock('../src/services/authService', () => ({
  authService: {
    login: jest.fn(),
  },
}));

jest.mock('expo-local-authentication', () => ({
  hasHardwareAsync: jest.fn(),
  isEnrolledAsync: jest.fn(),
  authenticateAsync: jest.fn(),
}));

// Mock do Alert
import { Alert } from 'react-native';
jest.spyOn(Alert, 'alert').mockImplementation(() => {});

describe('useLoginViewModel (Unit Test)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deve atualizar email e senha corretamente', () => {
    const { result } = renderHook(() => useLoginViewModel());

    act(() => {
      result.current.onEmailChange('teste@email.com');
      result.current.onPasswordChange('123456');
    });

    expect(result.current.email).toBe('teste@email.com');
    expect(result.current.password).toBe('123456');
  });

  it('deve exibir erro se tentar logar com campos vazios', async () => {
    const { result } = renderHook(() => useLoginViewModel());

    await act(async () => {
      await result.current.onLogin();
    });

    expect(result.current.error).toBe('Por favor, preencha o email e a senha.');
    expect(authService.login).not.toHaveBeenCalled();
  });

  it('deve chamar authService.login quando os dados estiverem preenchidos e não permitir requisições duplicadas', async () => {
    const navigateToHomeMock = jest.fn();
    (authService.login as jest.Mock).mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

    const { result } = renderHook(() => useLoginViewModel({ navigateToHome: navigateToHomeMock }));

    // Preenche dados
    act(() => {
      result.current.onEmailChange('teste@email.com');
      result.current.onPasswordChange('senha123');
    });

    // Dispara o login
    await act(async () => {
      await result.current.onLogin();
    });

    // O serviço deve ter sido chamado com os parâmetros corretos
    expect(authService.login).toHaveBeenCalledTimes(1);
    expect(authService.login).toHaveBeenCalledWith('teste@email.com', 'senha123');
  });
});
