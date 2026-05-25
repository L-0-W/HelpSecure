// src/viewmodels/useNovoVisitanteViewModel.ts
import { useState, useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export function useNovoVisitanteViewModel(selectedVisitante?: any, onSaveSuccess?: () => void) {
    const [nome, setNome] = useState(selectedVisitante?.nome || '');
    const [localId, setLocalId] = useState<number | null>(selectedVisitante?.local_id || null);
    const [validade, setValidade] = useState<string | null>(selectedVisitante?.validade || null);
    const [fotoUri, setFotoUri] = useState<string | null>(selectedVisitante?.fotoUri || null);
    const [faceImageBytes, setFaceImageBytes] = useState<number[] | null>(selectedVisitante?.face_image_bytes || null);
    
    const [locais, setLocais] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Carrega a lista de locais cadastrados pelo usuário logado
    const carregarLocais = useCallback(async () => {
        try {
            const token = await AsyncStorage.getItem('token');
            const response = await fetch('https://api-robotica-movel.onrender.com/locais', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });
            if (response.ok) {
                const data = await response.json();
                if (data && Array.isArray(data)) {
                    setLocais(data);
                } else if (data && data.locais && Array.isArray(data.locais)) {
                    setLocais(data.locais);
                }
            }
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
            const token = await AsyncStorage.getItem('token');
            const url = selectedVisitante
                ? `https://api-robotica-movel.onrender.com/visitantes/${selectedVisitante.id}`
                : 'https://api-robotica-movel.onrender.com/visitantes';
            const method = selectedVisitante ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    nome: nome.trim(),
                    validade,
                    local_id: localId,
                    face_image_bytes: faceImageBytes || [1, 2, 3, 4], // Array de bytes padrão caso nenhuma foto seja tirada
                }),
            });

            if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                throw new Error(data.error || 'Erro ao salvar visitante.');
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