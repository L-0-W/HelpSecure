// src/models/local.ts
export interface Local {
    id: number;
    nome: string;
    descricao: string;
    usuario_id?: number;
    criado_em?: string;
}
