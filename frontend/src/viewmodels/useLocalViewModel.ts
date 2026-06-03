import { useState, useCallback, useEffect } from 'react';
import { Local } from '../models/models';
import { Alert, DeviceEventEmitter } from 'react-native';
import { localService } from '../services/localService';

export function useLocalViewModel() {
    const [telaAtiva, setTelaAtiva] = useState<'lista' | 'cadastro' | 'edicao'>('lista');
    const [locais, setLocais] = useState<Local[]>([]);
    const [selectedLocal, setSelectedLocal] = useState<Local | null>(null);
    const [nome, setNome] = useState('');
    const [descricao, setDescricao] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [returnToVisitantes, setReturnToVisitantes] = useState(false);


    const navegarParaCadastro = useCallback(() => {
        setNome('');
        setDescricao('');
        setError(null);
        setSelectedLocal(null);
        setTelaAtiva('cadastro');
    }, []);

    useEffect(() => {
        const sub = DeviceEventEmitter.addListener('navigate_to_local_form_and_return', () => {
            DeviceEventEmitter.emit('navigate_to_tab', 1); // Muda para aba Locais
            navegarParaCadastro();
            setReturnToVisitantes(true);
        });
        return () => sub.remove();
    }, [navegarParaCadastro]);

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
            const data = await localService.listar();
            setLocais(data);
        } catch (err: any) {
            setError(err.message || 'Erro ao carregar locais.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    const salvarLocal = useCallback(async () => {
        if (isLoading) return;
        if (!nome.trim() || !descricao.trim()) {
            setError('Por favor, preencha todos os campos.');
            return;
        }

        setIsLoading(true);
        setError(null);
        try {
            if (selectedLocal) {
                await localService.atualizar(selectedLocal.id, nome, descricao);
            } else {
                await localService.criar(nome, descricao);
            }
            await listarLocais();
            DeviceEventEmitter.emit('locais_updated');
            voltarParaLista();

            if (returnToVisitantes) {
                DeviceEventEmitter.emit('navigate_to_tab', 0); // Volta para aba Visitantes
                setReturnToVisitantes(false);
            }
        } catch (err: any) {
            setError(err.message || 'Erro de conexão com o servidor.');
        } finally {
            setIsLoading(false);
        }
    }, [nome, descricao, selectedLocal, listarLocais, voltarParaLista, returnToVisitantes]);

    const deletarLocal = useCallback(async (id: number) => {
        if (isLoading) return;
        setIsLoading(true);
        setError(null);
        try {
            await localService.deletar(id);
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
