// src/services/localService.ts
import { apiRequest } from './api';
import { Local } from '../models/local';

export const localService = {
    async listar(): Promise<Local[]> {
        const data = await apiRequest('/locais');
        if (data && Array.isArray(data)) {
            return data;
        } else if (data && data.locais && Array.isArray(data.locais)) {
            return data.locais;
        }
        return [];
    },

    async criar(nome: string, descricao: string): Promise<Local> {
        return apiRequest('/locais', {
            method: 'POST',
            body: JSON.stringify({ nome, descricao }),
        });
    },

    async atualizar(id: number, nome: string, descricao: string): Promise<Local> {
        return apiRequest(`/locais/${id}`, {
            method: 'PUT',
            body: JSON.stringify({ nome, descricao }),
        });
    },

    async deletar(id: number): Promise<void> {
        await apiRequest(`/locais/${id}`, {
            method: 'DELETE',
        });
    }
};
