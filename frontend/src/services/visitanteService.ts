// src/services/visitanteService.ts
import { apiRequest } from './api';

export interface VisitantePayload {
    nome: string;
    validade: string;
    local_id: number | null;
    face_image_bytes: number[];
}

export const visitanteService = {
    async listar(): Promise<any[]> {
        const data = await apiRequest('/visitantes');
        if (data && Array.isArray(data)) {
            return data;
        } else if (data && data.visitantes && Array.isArray(data.visitantes)) {
            return data.visitantes;
        }
        return [];
    },

    async criar(payload: VisitantePayload): Promise<any> {
        return apiRequest('/visitantes', {
            method: 'POST',
            body: JSON.stringify(payload),
        });
    },

    async atualizar(id: number, payload: VisitantePayload): Promise<any> {
        return apiRequest(`/visitantes/${id}`, {
            method: 'PUT',
            body: JSON.stringify(payload),
        });
    },

    async deletar(id: number): Promise<void> {
        await apiRequest(`/visitantes/${id}`, {
            method: 'DELETE',
        });
    }
};
