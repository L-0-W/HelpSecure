// src/viewmodels/useNovoVisitanteViewModel.ts
import { useState, useCallback } from 'react';
import { Visitante } from '../models/visitantes';

export function useNovoVisitanteViewModel() {
    const [visitante, setVisitante] = useState<Visitante>({
        id: '1',
        nome: '',
        fotoUri: null,
        localAcesso: null,
        validade: null,
        dataCriacao: new Date(),
        status: 'ativo',
    });

    const setNome = useCallback((nome: string) => {
        setVisitante(prev => ({ ...prev, nome }));
    }, []);

    const setFotoUri = useCallback((fotoUri: string | null) => {
        setVisitante(prev => ({ ...prev, fotoUri }));
    }, []);

    const setLocalAcesso = useCallback((localAcesso: Visitante['localAcesso']) => {
        setVisitante(prev => ({ ...prev, localAcesso }));
    }, []);

    const setValidade = useCallback((validade: Visitante['validade']) => {
        setVisitante(prev => ({ ...prev, validade }));
    }, []);

    const handleSalvar = useCallback(async () => {
        console.log('Salvar:', visitante);

        const response = await fetch('https://api-robotica-movel.onrender.com/visitantes', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(visitante),
        });


        console.log(response)

    }, [visitante]);

    const handleRevogar = useCallback(() => {
        console.log('Revogar');
    }, []);

    const handleTirarFoto = useCallback(() => {
        // Lógica futura de câmera
        console.log('Abrir câmera');
    }, []);

    return {
        visitante,
        setNome,
        setFotoUri,
        setLocalAcesso,
        setValidade,
        handleSalvar,
        handleRevogar,
        handleTirarFoto,
    };
}