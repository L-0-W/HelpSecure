// src/screens/Home/ListaVisitantesView.tsx
import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    FlatList,
    StyleSheet,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { Ionicons, MaterialIcons, Feather } from '@expo/vector-icons';
import { useListaVisitantesViewModel } from '../viewmodels/useVisitantesListViewModel';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NovoVisitanteView from './NovoVisitanteView';

const COLORS = {
    background: '#121214',
    surface: '#1C1C1E',
    surfaceLight: '#2C2C2E',
    primary: '#8AB4F8',
    text: '#FFFFFF',
    textSecondary: '#A0A0A0',
    textMuted: '#6C6C6E',
    border: '#2C2C2E',
    danger: '#FF8A80',
    success: '#81C995',
    warning: '#F4B400',
};

export default function ListaVisitantesView() {
    const vm = useListaVisitantesViewModel();
    const [locaisList, setLocaisList] = useState<any[]>([]);

    useEffect(() => {
        vm.listarVisitantes();
    }, [vm.listarVisitantes]);

    // Carrega locais para mapear nomes na listagem
    useEffect(() => {
        const carregarLocais = async () => {
            try {
                const token = await AsyncStorage.getItem('token');
                const response = await fetch('https://api-robotica-movel.onrender.com/locais', {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                    },
                });
                if (response.ok) {
                    const data = await response.json();
                    if (data && Array.isArray(data)) {
                        setLocaisList(data);
                    } else if (data && data.locais && Array.isArray(data.locais)) {
                        setLocaisList(data.locais);
                    }
                }
            } catch (e) {
                console.error('Erro ao buscar locais:', e);
            }
        };
        carregarLocais();
    }, [vm.telaAtiva]);

    const handleDeletePress = (visitante: any) => {
        Alert.alert(
            'Confirmar Exclusão',
            `Deseja realmente excluir a autorização de acesso para "${visitante.nome}"?`,
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Excluir',
                    style: 'destructive',
                    onPress: () => vm.deletarVisitante(visitante.id),
                },
            ]
        );
    };

    // Renderiza a tela ativa (lista, cadastro ou edicao)
    if (vm.telaAtiva === 'cadastro' || vm.telaAtiva === 'edicao') {
        return (
            <NovoVisitanteView
                visitante={vm.selectedVisitante}
                onVoltar={vm.voltarParaLista}
            />
        );
    }

    return (
        <View style={styles.container}>
            {/* Título e Subtítulo */}
            <View style={styles.titleSection}>
                <Text style={styles.title}>Visitantes</Text>
                <Text style={styles.subtitle}>
                    Gerencie os acessos autorizados do condomínio.
                </Text>
            </View>

            {/* Filtros */}
            <View style={styles.filtrosContainer}>
                <FiltroButton
                    label="Todos"
                    active={vm.filtro === 'todos'}
                    onPress={() => vm.handleFiltroChange('todos')}
                />
                <FiltroButton
                    label="Ativos"
                    active={vm.filtro === 'ativos'}
                    onPress={() => vm.handleFiltroChange('ativos')}
                />
                <FiltroButton
                    label="Expirados"
                    active={vm.filtro === 'expirados'}
                    onPress={() => vm.handleFiltroChange('expirados')}
                />
            </View>

            {/* Loading / List Content */}
            {vm.isLoading && vm.visitantes.length === 0 ? (
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                </View>
            ) : vm.visitantes.length === 0 ? (
                <View style={styles.centerContainer}>
                    <View style={styles.emptyIconContainer}>
                        <Ionicons name="people-outline" size={48} color={COLORS.textMuted} />
                    </View>
                    <Text style={styles.emptyTitle}>Nenhum visitante encontrado</Text>
                    <Text style={styles.emptySubtitle}>
                        Toque no botão "+" abaixo para registrar o primeiro acesso.
                    </Text>
                    <TouchableOpacity
                        style={styles.emptyButton}
                        onPress={vm.listarVisitantes}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="refresh" size={16} color={COLORS.primary} />
                        <Text style={styles.emptyButtonText}>Recarregar</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <FlatList
                    data={vm.visitantes}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={({ item }) => (
                        <VisitanteCard
                            visitante={item}
                            onEdit={() => vm.navegarParaEdicao(item)}
                            onDelete={() => handleDeletePress(item)}
                            locais={locaisList}
                        />
                    )}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    refreshing={vm.isLoading}
                    onRefresh={vm.listarVisitantes}
                />
            )}

            {/* FAB */}
            <TouchableOpacity
                style={styles.fab}
                onPress={vm.navegarParaCadastro}
                activeOpacity={0.9}
            >
                <Ionicons name="add" size={28} color={COLORS.background} />
            </TouchableOpacity>
        </View>
    );
}

// Card de Visitante
function VisitanteCard({
    visitante,
    onEdit,
    onDelete,
    locais,
}: {
    visitante: any;
    onEdit: () => void;
    onDelete: () => void;
    locais: any[];
}) {
    const statusVal = visitante.status || 'ativo';
    const statusConfig = {
        ativo: { color: COLORS.success, label: 'Ativo', icon: 'check-circle' as const },
        expirado: { color: COLORS.warning, label: 'Expirado', icon: 'access-time' as const },
        revogado: { color: COLORS.danger, label: 'Revogado', icon: 'cancel' as const },
    };

    const status = statusConfig[statusVal as keyof typeof statusConfig] || statusConfig.ativo;
    const localRelacionado = locais.find((l) => l.id === visitante.local_id);
    const localNome = localRelacionado ? localRelacionado.nome : 'Sem Local Relacionado';

    return (
        <View style={styles.card}>
            <View style={styles.cardLeft}>
                <View style={styles.cardAvatar}>
                    <Ionicons name="person" size={20} color={COLORS.primary} />
                </View>
                <View style={styles.cardInfo}>
                    <Text style={styles.cardNome}>{visitante.nome}</Text>
                    <View style={styles.cardMeta}>
                        <MaterialIcons name="place" size={12} color={COLORS.textSecondary} />
                        <Text style={styles.cardMetaText} numberOfLines={1}>
                            {localNome}
                        </Text>
                    </View>
                </View>
            </View>
            <View style={styles.cardRight}>
                <View style={[styles.statusBadge, { backgroundColor: `${status.color}20` }]}>
                    <MaterialIcons name={status.icon} size={12} color={status.color} />
                    <Text style={[styles.statusText, { color: status.color }]}>
                        {status.label}
                    </Text>
                </View>
                <View style={styles.cardActions}>
                    <TouchableOpacity
                        style={styles.actionIconButton}
                        onPress={onEdit}
                        activeOpacity={0.7}
                    >
                        <Feather name="edit-2" size={16} color={COLORS.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.actionIconButton}
                        onPress={onDelete}
                        activeOpacity={0.7}
                    >
                        <Feather name="trash-2" size={16} color={COLORS.danger} />
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}

// Botão de Filtro
function FiltroButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
    return (
        <TouchableOpacity
            style={[styles.filtroButton, active && styles.filtroButtonActive]}
            onPress={onPress}
            activeOpacity={0.8}
        >
            <Text style={[styles.filtroText, active && styles.filtroTextActive]}>
                {label}
            </Text>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    titleSection: {
        paddingHorizontal: 16,
        paddingTop: 16,
        marginBottom: 20,
    },
    title: {
        fontSize: 28,
        fontWeight: '700',
        color: COLORS.text,
        marginBottom: 6,
    },
    subtitle: {
        fontSize: 14,
        color: COLORS.textSecondary,
        lineHeight: 20,
    },
    filtrosContainer: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        gap: 8,
        marginBottom: 16,
    },
    filtroButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: COLORS.surface,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    filtroButtonActive: {
        backgroundColor: 'rgba(138, 180, 248, 0.15)',
        borderColor: COLORS.primary,
    },
    filtroText: {
        color: COLORS.textSecondary,
        fontSize: 13,
        fontWeight: '500',
    },
    filtroTextActive: {
        color: COLORS.primary,
    },
    listContent: {
        paddingHorizontal: 16,
        paddingBottom: 100,
        gap: 10,
    },
    centerContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 32,
        paddingBottom: 80,
    },
    emptyIconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: COLORS.surface,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: COLORS.text,
        marginBottom: 8,
    },
    emptySubtitle: {
        fontSize: 14,
        color: COLORS.textSecondary,
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 24,
    },
    emptyButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: COLORS.primary,
    },
    emptyButtonText: {
        color: COLORS.primary,
        fontSize: 14,
        fontWeight: '600',
    },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: COLORS.surface,
        borderRadius: 12,
        padding: 14,
        borderWidth: 1,
        borderColor: COLORS.border,
        marginBottom: 10,
    },
    cardLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
    },
    cardAvatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: COLORS.surfaceLight,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cardInfo: {
        gap: 4,
        flex: 1,
    },
    cardNome: {
        color: COLORS.text,
        fontSize: 15,
        fontWeight: '600',
    },
    cardMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    cardMetaText: {
        color: COLORS.textSecondary,
        fontSize: 12,
        flex: 1,
    },
    cardRight: {
        alignItems: 'flex-end',
        gap: 10,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusText: {
        fontSize: 11,
        fontWeight: '500',
    },
    cardActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    actionIconButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: COLORS.surfaceLight,
        alignItems: 'center',
        justifyContent: 'center',
    },
    fab: {
        position: 'absolute',
        right: 20,
        bottom: 24,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: COLORS.primary,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 6,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
});