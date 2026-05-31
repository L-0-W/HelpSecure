import { useState, useEffect } from 'react';
import { logService, LogMessage } from '../services/logService';

export function useLogsViewModel() {
    const [logs, setLogs] = useState<LogMessage[]>([]);

    useEffect(() => {
        logService.connect();

        const unsubscribe = logService.subscribe((newLog) => {
            setLogs(prevLogs => [newLog, ...prevLogs]);
        });

        return () => {
            unsubscribe();
        };
    }, []);

    return {
        logs
    };
}
