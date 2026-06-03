import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { visitanteService } from '../services/visitanteService';

type Tela = 'lista' | 'cadastro' | 'edicao';

export function useListaVisitantesViewModel() {
    const [telaAtiva, setTelaAtiva] = useState<Tela>('lista');
    const [visitantes, setVisitantes] = useState<any[]>([]);
    const [visitanteSelecionado, setVisitanteSelecionado] = useState<any | null>(null);
    const [filtro, setFiltro] = useState<'todos' | 'ativos' | 'expirados'>('todos');
    const [carregando, setCarregando] = useState(false);

    const navegarParaCadastro = useCallback(() => {
        setVisitanteSelecionado(null);
        setTelaAtiva('cadastro');
    }, []);

    const navegarParaEdicao = useCallback((visitante: any) => {
        setVisitanteSelecionado(visitante);
        setTelaAtiva('edicao');
    }, []);

    const voltarParaLista = useCallback(() => {
        setVisitanteSelecionado(null);
        setTelaAtiva('lista');
    }, []);


    const alterarFiltro = useCallback((novoFiltro: typeof filtro) => {
        setFiltro(novoFiltro);
    }, []);

    const listarVisitantes = useCallback(async () => {
        setCarregando(true);
        try {
            const data = await visitanteService.listar();
            setVisitantes(data);
        } catch (e) {
            console.error('Erro ao listar visitantes:', e);
            setVisitantes([]);
        } finally {
            setCarregando(false);
        }
    }, []);

    const aoSalvarComSucesso = useCallback(async () => {
        await listarVisitantes();
        voltarParaLista();
    }, [listarVisitantes, voltarParaLista]);

    const deletarVisitante = useCallback(async (id: number) => {
        if (carregando) return;
        setCarregando(true);
        try {
            await visitanteService.deletar(id);
            await listarVisitantes();
        } catch (err: any) {
            Alert.alert('Erro', err.message || 'Não foi possível excluir o visitante.');
        } finally {
            setCarregando(false);
        }
    }, [listarVisitantes]);

    const visitantesFiltrados = visitantes.filter((v) => {
        const status = v.status || 'ativo';
        if (filtro === 'ativos') return status === 'ativo';
        if (filtro === 'expirados') return status === 'expirado' || status === 'revogado';
        return true;
    });

    return {
        telaAtiva,
        visitantes: visitantesFiltrados,
        visitanteSelecionado,
        filtro,
        carregando,
        navegarParaCadastro,
        navegarParaEdicao,
        voltarParaLista,
        alterarFiltro,
        listarVisitantes,
        deletarVisitante,
        aoSalvarComSucesso,
    };
}