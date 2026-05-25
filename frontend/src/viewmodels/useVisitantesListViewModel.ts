import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { visitanteService } from '../services/visitanteService';

type Tela = 'lista' | 'cadastro' | 'edicao';

export function useListaVisitantesViewModel() {
    const [telaAtiva, setTelaAtiva] = useState<Tela>('lista');
    const [visitantes, setVisitantes] = useState<any[]>([]);
    const [selectedVisitante, setSelectedVisitante] = useState<any | null>(null);
    const [filtro, setFiltro] = useState<'todos' | 'ativos' | 'expirados'>('todos');
    const [isLoading, setIsLoading] = useState(false);

    const navegarParaCadastro = useCallback(() => {
        setSelectedVisitante(null);
        setTelaAtiva('cadastro');
    }, []);

    const navegarParaEdicao = useCallback((visitante: any) => {
        setSelectedVisitante(visitante);
        setTelaAtiva('edicao');
    }, []);

    const voltarParaLista = useCallback(() => {
        setSelectedVisitante(null);
        setTelaAtiva('lista');
    }, []);

    const handleFiltroChange = useCallback((novoFiltro: typeof filtro) => {
        setFiltro(novoFiltro);
    }, []);

    const listarVisitantes = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await visitanteService.listar();
            setVisitantes(data);
        } catch (e) {
            console.error('Erro ao listar visitantes:', e);
            setVisitantes([]);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const deletarVisitante = useCallback(async (id: number) => {
        setIsLoading(true);
        try {
            await visitanteService.deletar(id);
            await listarVisitantes();
        } catch (err: any) {
            Alert.alert('Erro', err.message || 'Não foi possível excluir o visitante.');
        } finally {
            setIsLoading(false);
        }
    }, [listarVisitantes]);

    // Filtragem local
    const visitantesFiltrados = visitantes.filter((v) => {
        const status = v.status || 'ativo';
        if (filtro === 'ativos') return status === 'ativo';
        if (filtro === 'expirados') return status === 'expirado' || status === 'revogado';
        return true;
    });

    return {
        telaAtiva,
        visitantes: visitantesFiltrados,
        selectedVisitante,
        filtro,
        isLoading,
        navegarParaCadastro,
        navegarParaEdicao,
        voltarParaLista,
        handleFiltroChange,
        listarVisitantes,
        deletarVisitante,
    };
}