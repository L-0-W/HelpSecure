import { apiRequest } from './api';
import { Camera } from '../models/models';

export const cameraService = {
    async listar(): Promise<Camera[]> {
        const data = await apiRequest('/cameras');
        if (data && Array.isArray(data)) {
            return data;
        } else if (data && data.cameras && Array.isArray(data.cameras)) {
            return data.cameras;
        }
        return [];
    },

    async criar(nome: string, token: string): Promise<Camera> {
        return apiRequest('/cameras', {
            method: 'POST',
            body: JSON.stringify({ nome, token }),
        });
    },

    async atualizar(id: number, nome: string): Promise<Camera> {
        return apiRequest(`/cameras/${id}`, {
            method: 'PUT',
            body: JSON.stringify({ nome }),
        });
    },

    async deletar(id: number): Promise<void> {
        await apiRequest(`/cameras/${id}`, {
            method: 'DELETE',
        });
    }
};
