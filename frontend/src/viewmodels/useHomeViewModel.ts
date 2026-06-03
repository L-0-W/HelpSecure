import { useState, useEffect } from 'react';
import { DeviceEventEmitter } from 'react-native';

export function useHomeViewModel() {
    const [index, setIndex] = useState(0);

    const handleIndexChange = (newIndex: number) => {
        setIndex(newIndex);

        if (newIndex === 0) {
            console.log('Carregando dados da Tab 1...');
        } else if (newIndex === 1) {
            console.log('Carregando dados da Tab 2...');
        }
    };
    useEffect(() => {
        const sub = DeviceEventEmitter.addListener('navigate_to_tab', (newIndex: number) => {
            handleIndexChange(newIndex);
        });
        return () => sub.remove();
    }, []);

    return {
        index,
        handleIndexChange,
    };
}