// src/viewmodels/useListaVisitantesViewModel.ts
import { useState, useCallback } from 'react';
import { Visitante } from '../models/visitantes';

const MOCK_VISITANTES: Visitante[] = [
    {
        id: '1',
        nome: 'Carlos Eduardo',
        fotoUri: null,
        localAcesso: 'portaria',
        validade: '4h',
        dataCriacao: new Date(),
        status: 'ativo',
    },
    {
        id: '2',
        nome: 'Maria Fernanda',
        fotoUri: null,
        localAcesso: 'garagem',
        validade: '1dia',
        dataCriacao: new Date(),
        status: 'ativo',
    },
    {
        id: '3',
        nome: 'João Pedro',
        fotoUri: null,
        localAcesso: 'administrativo',
        validade: '1h',
        dataCriacao: new Date(),
        status: 'expirado',
    },
];

type Tela = 'lista' | 'cadastro';

export function useListaVisitantesViewModel() {
    const [telaAtiva, setTelaAtiva] = useState<Tela>('lista');
    const [visitantes, setVisitantes] = useState<Visitante[]>(MOCK_VISITANTES);
    const [filtro, setFiltro] = useState<'todos' | 'ativos' | 'expirados'>('todos');

    const visitantesFiltrados = visitantes.filter((v) => {
        if (filtro === 'ativos') return v.status === 'ativo';
        if (filtro === 'expirados') return v.status === 'expirado' || v.status === 'revogado';
        return true;
    });

    const navegarParaCadastro = useCallback(() => {
        setTelaAtiva('cadastro');
    }, []);

    const voltarParaLista = useCallback(() => {
        console.log("Voltar para lista")
        setTelaAtiva('lista');
    }, []);

    const handleFiltroChange = useCallback((novoFiltro: typeof filtro) => {
        setFiltro(novoFiltro);
    }, []);

    const listarVisitantes = useCallback(async () => {
        const response = await fetch('https://api-robotica-movel.onrender.com/visitantes', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
            },
        });

        const data = await response.json();
        setVisitantes(data);
    }, []);

    return {
        telaAtiva,
        visitantes: visitantesFiltrados,
        filtro,
        navegarParaCadastro,
        voltarParaLista,
        handleFiltroChange,
        listarVisitantes,
    };
}