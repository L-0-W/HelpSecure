import { authService } from '../src/services/authService';
import { apiRequest } from '../src/services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mocks
jest.mock('../src/services/api', () => ({
  apiRequest: jest.fn(),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

describe('authService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('login (API Test)', () => {
    it('deve chamar apiRequest com os dados corretos e salvar o token', async () => {
      const mockResponse = { token: 'fake-jwt-token' };
      (apiRequest as jest.Mock).mockResolvedValueOnce(mockResponse);

      const email = 'teste@teste.com';
      const senha = 'password123';

      const result = await authService.login(email, senha);

      // Verifica se a API foi chamada com os parâmetros corretos
      expect(apiRequest).toHaveBeenCalledWith('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, senha }),
      });

      // Verifica se o token foi salvo
      expect(AsyncStorage.setItem).toHaveBeenCalledWith('token', mockResponse.token);

      // Verifica se a resposta foi retornada
      expect(result).toEqual(mockResponse);
    });

    it('deve lançar erro se a API falhar', async () => {
      const mockError = new Error('invalid_credentials');
      (apiRequest as jest.Mock).mockRejectedValueOnce(mockError);

      await expect(authService.login('wrong@test.com', 'wrong')).rejects.toThrow('invalid_credentials');

      // Não deve salvar token se falhar
      expect(AsyncStorage.setItem).not.toHaveBeenCalled();
    });
  });

  describe('logout', () => {
    it('deve remover o token do AsyncStorage', async () => {
      await authService.logout();
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('token');
    });
  });
});
