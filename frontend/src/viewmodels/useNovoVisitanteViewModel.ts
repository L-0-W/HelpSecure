import { useState, useCallback, useEffect } from 'react';
import { localService } from '../services/localService';
import { visitanteService } from '../services/visitanteService';

export function useNovoVisitanteViewModel(selectedVisitante?: any, onSaveSuccess?: () => void) {
    const [nome, setNome] = useState(selectedVisitante?.nome || '');
    const [localId, setLocalId] = useState<number | null>(selectedVisitante?.local_id || null);
    const [validade, setValidade] = useState<string | null>(selectedVisitante?.validade || null);
    const [fotoUri, setFotoUri] = useState<string | null>(selectedVisitante?.fotoUri || null);
    const [faceImageBytes, setFaceImageBytes] = useState<number[] | null>(selectedVisitante?.face_image_bytes || null);
    
    const [locais, setLocais] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const carregarLocais = useCallback(async () => {
        try {
            const data = await localService.listar();
            setLocais(data);
        } catch (e) {
            console.error('Erro ao carregar locais no visitante:', e);
        }
    }, []);

    useEffect(() => {
        carregarLocais();
    }, [carregarLocais]);

    const handleSalvar = useCallback(async () => {
        if (!nome.trim()) {
            setError('O nome é obrigatório.');
            return;
        }
        if (!validade) {
            setError('A validade é obrigatória.');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const payload = {
                nome: nome.trim(),
                validade,
                local_id: localId,
                face_image_bytes: faceImageBytes || [1, 2, 3, 4], // Array de bytes padrão caso nenhuma foto seja tirada
            };

            if (selectedVisitante) {
                await visitanteService.atualizar(selectedVisitante.id, payload);
            } else {
                await visitanteService.criar(payload);
            }

            if (onSaveSuccess) {
                onSaveSuccess();
            }
        } catch (err: any) {
            setError(err.message || 'Erro ao se conectar ao servidor.');
        } finally {
            setIsLoading(false);
        }
    }, [nome, validade, localId, faceImageBytes, selectedVisitante, onSaveSuccess]);

    return {
        nome,
        setNome,
        localId,
        setLocalId,
        validade,
        setValidade,
        fotoUri,
        setFotoUri,
        faceImageBytes,
        setFaceImageBytes,
        locais,
        isLoading,
        error,
        handleSalvar,
    };
}