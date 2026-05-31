export interface LoginViewModelProps {
    navigateToRegister?: () => void;
    navigateToHome?: () => void;
}

export interface VisitantePayload {
    nome: string;
    validade: string;
    local_id: number | null;
    face_image_bytes: number[];
}

export interface Local {
    id: number;
    nome: string;
    descricao: string;
    usuario_id?: number;
    criado_em?: string;
}


export interface User {
    nome: string,
    email: string
}

export interface Camera {
    id: number;
    nome: string | null;
    cam_ip: string | null;
    criado_em: string;
}