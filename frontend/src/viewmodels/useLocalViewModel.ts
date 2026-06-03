import { useState, useCallback, useEffect } from 'react';
import { Local } from '../models/models';
import { Alert, DeviceEventEmitter } from 'react-native';
import { localService } from '../services/localService';

export function useLocalViewModel() {
    const [telaAtiva, setTelaAtiva] = useState<'lista' | 'cadastro' | 'edicao'>('lista');
    const [locais, setLocais] = useState<Local[]>([]);
    const [localSelecionado, setLocalSelecionado] = useState<Local | null>(null);
    const [nome, setNome] = useState('');
    const [descricao, setDescricao] = useState('');
    const [carregando, setCarregando] = useState(false);
    const [erro, setErro] = useState<string | null>(null);
    const [retornarParaVisitantes, setRetornarParaVisitantes] = useState(false);


    const navegarParaCadastro = useCallback(() => {
        setNome('');
        setDescricao('');
        setErro(null);
        setLocalSelecionado(null);
        setTelaAtiva('cadastro');
    }, []);

    useEffect(() => {
        const sub = DeviceEventEmitter.addListener('navigate_to_local_form_and_return', () => {
            DeviceEventEmitter.emit('navigate_to_tab', 1); // Muda para aba Locais
            navegarParaCadastro();
            setRetornarParaVisitantes(true);
        });
        return () => sub.remove();
    }, [navegarParaCadastro]);

    const navegarParaEdicao = useCallback((local: Local) => {
        setLocalSelecionado(local);
        setNome(local.nome);
        setDescricao(local.descricao);
        setErro(null);
        setTelaAtiva('edicao');
    }, []);

    const voltarParaLista = useCallback(() => {
        setTelaAtiva('lista');
        setErro(null);
        setNome('');
        setDescricao('');
        setLocalSelecionado(null);
    }, []);

    const listarLocais = useCallback(async () => {
        setCarregando(true);
        setErro(null);
        try {
            const data = await localService.listar();
            setLocais(data);
        } catch (err: any) {
            setErro(err.message || 'Erro ao carregar locais.');
        } finally {
            setCarregando(false);
        }
    }, []);

    const salvarLocal = useCallback(async () => {
        if (carregando) return;
        if (!nome.trim() || !descricao.trim()) {
            setErro('Por favor, preencha todos os campos.');
            return;
        }

        setCarregando(true);
        setErro(null);
        try {
            if (localSelecionado) {
                await localService.atualizar(localSelecionado.id, nome, descricao);
            } else {
                await localService.criar(nome, descricao);
            }
            await listarLocais();
            DeviceEventEmitter.emit('locais_updated');
            voltarParaLista();

            if (retornarParaVisitantes) {
                DeviceEventEmitter.emit('navigate_to_tab', 0); // Volta para aba Visitantes
                setRetornarParaVisitantes(false);
            }
        } catch (err: any) {
            setErro(err.message || 'Erro de conexão com o servidor.');
        } finally {
            setCarregando(false);
        }
    }, [nome, descricao, localSelecionado, listarLocais, voltarParaLista, retornarParaVisitantes]);

    const deletarLocal = useCallback(async (id: number) => {
        if (carregando) return;
        setCarregando(true);
        setErro(null);
        try {
            await localService.deletar(id);
            await listarLocais();
        } catch (err: any) {
            Alert.alert('Erro', err.message || 'Não foi possível excluir o local.');
        } finally {
            setCarregando(false);
        }
    }, [listarLocais]);

    return {
        telaAtiva,
        locais,
        localSelecionado,
        nome,
        descricao,
        carregando,
        erro,
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
