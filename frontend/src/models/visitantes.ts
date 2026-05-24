// src/models/Visitante.ts
export interface Visitante {
    id: string;
    nome: string;
    fotoUri: string | null;
    localAcesso: 'portaria' | 'garagem' | 'administrativo' | null;
    validade: '1h' | '4h' | '1dia' | 'custom' | null;
    dataCriacao: Date;
    status: 'ativo' | 'expirado' | 'revogado';
}