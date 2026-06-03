import AsyncStorage from '@react-native-async-storage/async-storage';

const WS_BASE_URL = 'wss://api-robotica-movel.onrender.com';

export type LogMessage = {
    usuario_id: number;
    camera_id: number;
    message: string;
    timestamp: string;
    success: boolean;
};

class LogService {
    private ws: WebSocket | null = null;
    private listeners: ((log: LogMessage) => void)[] = [];

    async connect() {
        if (this.ws) return;

        const token = await AsyncStorage.getItem('token');
        if (!token) return;

        this.ws = new WebSocket(`${WS_BASE_URL}/ws/logs?token=${token}`);

        this.ws.onmessage = (event) => {
            try {
                const log: LogMessage = JSON.parse(event.data);
                this.listeners.forEach(listener => listener(log));
            } catch (e) {
                console.error('Erro ao fazer parse do log:', e);
            }
        };

        this.ws.onclose = () => {
            console.log('WebSocket de logs fechado');
            this.ws = null;
        };
    }

    disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }

    subscribe(listener: (log: LogMessage) => void) {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }
}

export const logService = new LogService();
