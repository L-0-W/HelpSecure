// src/services/api.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = 'https://api-robotica-movel.onrender.com';

export async function apiRequest(endpoint: string, options: RequestInit = {}) {
    const token = await AsyncStorage.getItem('token');

    const headers = {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...options.headers,
    };

    const response = await fetch(`${BASE_URL}${endpoint}`, {
        ...options,
        headers,
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Erro de rede: código ${response.status}`);
    }

    if (response.status === 204) {
        return null;
    }

    return response.json();
}
