import { useState, useCallback } from 'react';
import { Local } from '../models/local';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = 'https://api-robotica-movel.onrender.com/locais';

export function useLocalViewModel() {
    const [telaAtiva, setTelaAtiva] = useState<'lista' | 'cadastro' | 'edicao'>('lista');
    const [locais, setLocais] = useState<Local[]>([]);
    const [selectedLocal, setSelectedLocal] = useState<Local | null>(null);
    const [nome, setNome] = useState('');
    const [descricao, setDescricao] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const navegarParaCadastro = useCallback(() => {
        setNome('');
        setDescricao('');
        setError(null);
        setSelectedLocal(null);
        setTelaAtiva('cadastro');
    }, []);

    const navegarParaEdicao = useCallback((local: Local) => {
        setSelectedLocal(local);
        setNome(local.nome);
        setDescricao(local.descricao);
        setError(null);
        setTelaAtiva('edicao');
    }, []);

    const voltarParaLista = useCallback(() => {
        setTelaAtiva('lista');
        setError(null);
        setNome('');
        setDescricao('');
        setSelectedLocal(null);
    }, []);

    const listarLocais = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const token = await AsyncStorage.getItem('token');
            const response = await fetch(BASE_URL, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                throw new Error('Falha ao buscar locais');
            }

            const data = await response.json();
            console.log(data);

            if (data && Array.isArray(data)) {
                setLocais(data);
            } else if (data && data.locais && Array.isArray(data.locais)) {
                setLocais(data.locais);
            } else {
                setLocais([]);
            }
        } catch (err: any) {
            setError(err.message || 'Erro ao carregar locais.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    const salvarLocal = useCallback(async () => {
        if (!nome.trim() || !descricao.trim()) {
            setError('Por favor, preencha todos os campos.');
            return;
        }

        setIsLoading(true);
        setError(null);
        try {
            const token = await AsyncStorage.getItem('token');
            const url = selectedLocal ? `${BASE_URL}/${selectedLocal.id}` : BASE_URL;
            const method = selectedLocal ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ nome, descricao }),
            });

            if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                throw new Error(data.error || 'Erro ao salvar local');
            }

            await listarLocais();
            voltarParaLista();
        } catch (err: any) {
            setError(err.message || 'Erro de conexão com o servidor.');
        } finally {
            setIsLoading(false);
        }
    }, [nome, descricao, selectedLocal, listarLocais, voltarParaLista]);

    const deletarLocal = useCallback(async (id: number) => {
        setIsLoading(true);
        setError(null);
        try {
            const token = await AsyncStorage.getItem('token');
            const response = await fetch(`${BASE_URL}/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                throw new Error(data.error || 'Erro ao excluir local');
            }

            await listarLocais();
        } catch (err: any) {
            Alert.alert('Erro', err.message || 'Não foi possível excluir o local.');
        } finally {
            setIsLoading(false);
        }
    }, [listarLocais]);

    return {
        telaAtiva,
        locais,
        selectedLocal,
        nome,
        descricao,
        isLoading,
        error,
        setNome,
        setDescricao,
        navegarParaCadastro,
        navegarParaEdicao,
        voltarParaLista,
        listarLocais,
        salvarLocal,
        deletarLocal,
    };
}
