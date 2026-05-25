// src/screens/Home/ListaVisitantesView.tsx
import React, { useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    FlatList,
    StyleSheet,
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useListaVisitantesViewModel } from '../viewmodels/useVisitantesListViewModel';
import { Visitante } from '../models/visitantes';
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

    useEffect(() => {
        vm.listarVisitantes();
    }, [vm]);

    // Renderiza a tela ativa (lista ou cadastro)
    if (vm.telaAtiva === 'cadastro') {
        return (
            <NovoVisitanteView
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

            {/* Lista */}
            <FlatList
                data={vm.visitantes}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => <VisitanteCard visitante={item} />}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
            />

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
function VisitanteCard({ visitante }: { visitante: Visitante }) {
    const statusConfig = {
        ativo: { color: COLORS.success, label: 'Ativo', icon: 'check-circle' as const },
        expirado: { color: COLORS.warning, label: 'Expirado', icon: 'access-time' as const },
        revogado: { color: COLORS.danger, label: 'Revogado', icon: 'cancel' as const },
    };

    const status = statusConfig[visitante.status];

    return (
        <View style={styles.card}>
            <View style={styles.cardLeft}>
                <View style={styles.cardAvatar}>
                    <Ionicons name="person" size={24} color={COLORS.textMuted} />
                </View>
                <View style={styles.cardInfo}>
                    <Text style={styles.cardNome}>{visitante.nome}</Text>
                    <View style={styles.cardMeta}>
                        <MaterialIcons name="place" size={12} color={COLORS.textSecondary} />
                        <Text style={styles.cardMetaText}>
                            {visitante.localAcesso === 'portaria' && 'Portaria Principal'}
                            {visitante.localAcesso === 'garagem' && 'Garagem Subsolo'}
                            {visitante.localAcesso === 'administrativo' && 'Bloco Administrativo'}
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
                <TouchableOpacity style={styles.cardMore}>
                    <Ionicons name="ellipsis-vertical" size={16} color={COLORS.textSecondary} />
                </TouchableOpacity>
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
    },
    cardRight: {
        alignItems: 'flex-end',
        gap: 8,
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
    cardMore: {
        padding: 4,
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