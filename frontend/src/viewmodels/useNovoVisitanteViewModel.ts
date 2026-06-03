import { useState, useCallback, useEffect } from 'react';
import { DeviceEventEmitter } from 'react-native';
import { localService } from '../services/localService';
import { visitanteService } from '../services/visitanteService';

export function useNovoVisitanteViewModel(visitanteSelecionado?: any, aoSalvarComSucesso?: () => void) {
    const [nome, setNome] = useState(visitanteSelecionado?.nome || '');
    const [localId, setLocalId] = useState<number | null>(visitanteSelecionado?.local_id || null);
    const [validade, setValidade] = useState<string | null>(visitanteSelecionado?.validade || null);
    const [fotoUri, setFotoUri] = useState<string | null>(visitanteSelecionado?.fotoUri || null);
    const [bytesImagemRosto, setBytesImagemRosto] = useState<number[] | null>(visitanteSelecionado?.face_image_bytes || null);
    
    const [locais, setLocais] = useState<any[]>([]);
    const [carregando, setCarregando] = useState(false);
    const [erro, setErro] = useState<string | null>(null);

    const carregarLocais = useCallback(async () => {
        try {
            const data = await localService.listar();
            setLocais(data);
        } catch (e) {
            console.error('Erro ao carregar locais no visitante:', e);
        }
    }, []);

    useEffect(() => {
        carregarLocais();
        
        const sub = DeviceEventEmitter.addListener('locais_updated', () => {
            carregarLocais();
        });
        return () => sub.remove();
    }, [carregarLocais]);

    const handleSalvar = useCallback(async () => {
        if (carregando) return;
        if (!nome.trim()) {
            setErro('O nome é obrigatório.');
            return;
        }
        if (!validade) {
            setErro('A validade é obrigatória.');
            return;
        }

        if (locais.length === 0) {
            import('react-native').then(({ Alert }) => {
                Alert.alert(
                    'Nenhum Local Cadastrado',
                    'Para cadastrar um visitante, é necessário existir pelo menos um local. Deseja cadastrar um local agora?',
                    [
                        { text: 'Cancelar', style: 'cancel' },
                        { 
                            text: 'Cadastrar Local', 
                            onPress: () => {
                                DeviceEventEmitter.emit('navigate_to_local_form_and_return');
                            }
                        }
                    ]
                );
            });
            return;
        }

        if (!localId) {
            setErro('Selecione um local de acesso.');
            return;
        }

        setCarregando(true);
        setErro(null);

        try {
            const payload = {
                nome: nome.trim(),
                validade,
                local_id: localId,
                face_image_bytes: bytesImagemRosto || [1, 2, 3, 4],
            };

            if (visitanteSelecionado) {
                await visitanteService.atualizar(visitanteSelecionado.id, payload);
            } else {
                await visitanteService.criar(payload);
            }

            if (aoSalvarComSucesso) {
                aoSalvarComSucesso();
            }
        } catch (err: any) {
            setErro(err.message || 'Erro ao se conectar ao servidor.');
        } finally {
            setCarregando(false);
        }
    }, [nome, validade, localId, bytesImagemRosto, visitanteSelecionado, aoSalvarComSucesso]);

    return {
        nome,
        setNome,
        localId,
        setLocalId,
        validade,
        setValidade,
        fotoUri,
        setFotoUri,
        bytesImagemRosto,
        setBytesImagemRosto,
        locais,
        carregando,
        erro,
        handleSalvar,
    };
}