import { useState } from 'react';

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

    return {
        index,
        handleIndexChange,
    };
}