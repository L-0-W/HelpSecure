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
            if (data.usuario && data.usuario.id) {
                await AsyncStorage.setItem('usuario_id', String(data.usuario.id));
            } else {
                try {
                    // Try to decode JWT
                    const payloadBase64 = data.token.split('.')[1];
                    const payloadDecoded = atob(payloadBase64);
                    const payload = JSON.parse(payloadDecoded);
                    if (payload && payload.id) {
                        await AsyncStorage.setItem('usuario_id', String(payload.id));
                    } else if (payload && payload.sub) {
                        await AsyncStorage.setItem('usuario_id', String(payload.sub));
                    }
                } catch (e) {
                    console.error("Could not parse token to get id", e);
                }
            }
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

    async habilitarBiometria(biometria: boolean) {
        const id = await AsyncStorage.getItem('usuario_id');
        const token = await AsyncStorage.getItem('token');
        const data = await apiRequest('/habilitar-biometria', {
            method: 'POST',
            body: JSON.stringify({ id, token, biometria }),
        });
        return data;
    },

    async validarToken() {
        // Enviar requisição para validar o token que já está configurado no AsyncStorage
        // ou que será passado como Bearer token no apiRequest.
        const data = await apiRequest('/validar-token', {
            method: 'GET',
        });
        return data;
    },

    async logout() {
        await AsyncStorage.removeItem('token');
        await AsyncStorage.removeItem('usuario_id');
    }
};
