import { useState, useEffect } from 'react';
import { DeviceEventEmitter } from 'react-native';

export function useHomeViewModel() {
    const [abaAtiva, setAbaAtiva] = useState(0);

    const alterarAba = (novaAba: number) => {
        setAbaAtiva(novaAba);

        if (novaAba === 0) {
            console.log('Carregando dados da Tab 1...');
        } else if (novaAba === 1) {
            console.log('Carregando dados da Tab 2...');
        }
    };
    useEffect(() => {
        const sub = DeviceEventEmitter.addListener('navigate_to_tab', (novaAba: number) => {
            alterarAba(novaAba);
        });
        return () => sub.remove();
    }, []);

    return {
        abaAtiva,
        alterarAba,
    };
}