import { useState, useCallback } from 'react';
import { Camera } from '../models/models';
import { Alert } from 'react-native';
import { cameraService } from '../services/cameraService';

export function useCameraViewModel() {
    const [telaAtiva, setTelaAtiva] = useState<'lista' | 'cadastro'>('lista');
    const [cameras, setCameras] = useState<Camera[]>([]);
    const [nome, setNome] = useState('');
    const [token, setToken] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const navegarParaCadastro = useCallback(() => {
        setNome('');
        setToken('');
        setError(null);
        setTelaAtiva('cadastro');
    }, []);

    const voltarParaLista = useCallback(() => {
        setTelaAtiva('lista');
        setError(null);
        setNome('');
        setToken('');
    }, []);

    const listarCameras = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await cameraService.listar();
            setCameras(data);
        } catch (err: any) {
            setError(err.message || 'Erro ao carregar câmeras.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    const salvarCamera = useCallback(async () => {
        if (!nome.trim() || !token.trim()) {
            setError('Por favor, preencha todos os campos.');
            return;
        }

        setIsLoading(true);
        setError(null);
        try {
            await cameraService.criar(nome, token);
            await listarCameras();
            voltarParaLista();
        } catch (err: any) {
            setError(err.message || 'Erro ao criar câmera. O token pode já estar em uso.');
        } finally {
            setIsLoading(false);
        }
    }, [nome, token, listarCameras, voltarParaLista]);

    const deletarCamera = useCallback(async (id: number) => {
        setIsLoading(true);
        setError(null);
        try {
            await cameraService.deletar(id);
            await listarCameras();
        } catch (err: any) {
            Alert.alert('Erro', err.message || 'Não foi possível excluir a câmera.');
        } finally {
            setIsLoading(false);
        }
    }, [listarCameras]);

    return {
        telaAtiva,
        cameras,
        nome,
        token,
        isLoading,
        error,
        setNome,
        setToken,
        navegarParaCadastro,
        voltarParaLista,
        listarCameras,
        salvarCamera,
        deletarCamera,
    };
}
