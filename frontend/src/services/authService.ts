// src/services/authService.ts
import { apiRequest } from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const authService = {
    async login(email: string, senha: string) {
        const data = await apiRequest('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, senha }),
        });
        if (data && data.token) {
            await AsyncStorage.setItem('token', data.token);
        }
        return data;
    },

    async register(nome: string, email: string, senha: string) {
        const data = await apiRequest('/usuarios', {
            method: 'POST',
            body: JSON.stringify({ nome, email, senha }),
        });
        if (data && data.token) {
            await AsyncStorage.setItem('token', data.token);
        }
        return data;
    },

    async logout() {
        await AsyncStorage.removeItem('token');
    }
};
