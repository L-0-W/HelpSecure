// src/views/LocalView.tsx
import React, { useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    FlatList,
    StyleSheet,
    ActivityIndicator,
    Alert,
    ScrollView,
    StatusBar,
} from 'react-native';
import { Ionicons, MaterialIcons, Feather } from '@expo/vector-icons';
import { useLocalViewModel } from '../viewmodels/useLocalViewModel';
import { Local } from '../models/local';

const COLORS = {
    background: '#121214',
    surface: '#1C1C1E',
    surfaceLight: '#2C2C2E',
    primary: '#8AB4F8',
    primaryDark: '#5C8BC7',
    text: '#FFFFFF',
    textSecondary: '#A0A0A0',
    textMuted: '#6C6C6E',
    border: '#2C2C2E',
    danger: '#FF8A80',
    success: '#81C995',
};

export default function LocalView() {
    const vm = useLocalViewModel();

    useEffect(() => {
        vm.listarLocais();
    }, []);

    const handleDeletePress = (local: Local) => {
        Alert.alert(
            'Confirmar Exclusão',
            `Deseja realmente excluir o local "${local.nome}"?`,
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Excluir',
                    style: 'destructive',
                    onPress: () => vm.deletarLocal(local.id),
                },
            ],
            { cancelable: true }
        );
    };

    // Render Form Screen (Create/Edit)
    if (vm.telaAtiva === 'cadastro' || vm.telaAtiva === 'edicao') {
        const isEditing = vm.telaAtiva === 'edicao';
        return (
            <View style={styles.container}>
                <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

                <ScrollView
                    style={styles.scroll}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Header/Title */}
                    <View style={styles.titleSection}>
                        <Text style={styles.title}>
                            {isEditing ? 'Editar Local' : 'Novo Local'}
                        </Text>
                        <Text style={styles.subtitle}>
                            {isEditing
                                ? 'Atualize as informações do local de acesso.'
                                : 'Adicione um novo ponto de controle e monitoramento.'
                            }
                        </Text>
                    </View>

                    {/* Card de Informações */}
                    <View style={styles.formCard}>
                        {vm.error ? (
                            <View style={styles.errorContainer}>
                                <Feather name="alert-circle" size={18} color={COLORS.danger} />
                                <Text style={styles.errorText}>{vm.error}</Text>
                            </View>
                        ) : null}

                        {/* Campo Nome */}
                        <View style={styles.inputSection}>
                            <Text style={styles.label}>Nome do Local</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Ex: Portaria Principal, Garagem G1"
                                placeholderTextColor={COLORS.textMuted}
                                value={vm.nome}
                                onChangeText={vm.setNome}
                                autoCapitalize="words"
                            />
                        </View>

                        {/* Campo Descrição */}
                        <View style={styles.inputSection}>
                            <Text style={styles.label}>Descrição</Text>
                            <TextInput
                                style={[styles.input, styles.textArea]}
                                placeholder="Ex: Acesso de pedestres na rua principal."
                                placeholderTextColor={COLORS.textMuted}
                                value={vm.descricao}
                                onChangeText={vm.setDescricao}
                                multiline
                                numberOfLines={4}
                            />
                        </View>
                    </View>
                </ScrollView>

                {/* Botões de Ação (fixos embaixo) */}
                <View style={styles.actionsContainer}>
                    <TouchableOpacity
                        style={styles.salvarButton}
                        onPress={vm.salvarLocal}
                        disabled={vm.isLoading}
                        activeOpacity={0.9}
                    >
                        {vm.isLoading ? (
                            <ActivityIndicator color={COLORS.background} />
                        ) : (
                            <>
                                <Ionicons name="checkmark-circle-outline" size={20} color={COLORS.background} />
                                <Text style={styles.salvarButtonText}>
                                    {isEditing ? 'Salvar Alterações' : 'Criar Local'}
                                </Text>
                            </>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.voltarFormButton}
                        onPress={vm.voltarParaLista}
                        disabled={vm.isLoading}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="close-circle-outline" size={18} color={COLORS.danger} />
                        <Text style={styles.voltarFormButtonText}>Voltar</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    // Render List Screen
    return (
        <View style={styles.container}>
            {/* Título e Subtítulo */}
            <View style={styles.titleSection}>
                <Text style={styles.title}>Locais</Text>
                <Text style={styles.subtitle}>
                    Gerencie os pontos de acesso cadastrados no sistema.
                </Text>
            </View>

            {/* Loading / List Content */}
            {vm.isLoading && vm.locais.length === 0 ? (
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                </View>
            ) : vm.locais.length === 0 ? (
                <View style={styles.centerContainer}>
                    <View style={styles.emptyIconContainer}>
                        <MaterialIcons name="place" size={48} color={COLORS.textMuted} />
                    </View>
                    <Text style={styles.emptyTitle}>Nenhum local encontrado</Text>
                    <Text style={styles.emptySubtitle}>
                        Toque no botão "+" abaixo para cadastrar o seu primeiro local.
                    </Text>
                    <TouchableOpacity
                        style={styles.emptyButton}
                        onPress={vm.listarLocais}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="refresh" size={16} color={COLORS.primary} />
                        <Text style={styles.emptyButtonText}>Recarregar</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <FlatList
                    data={vm.locais}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={({ item }) => (
                        <LocalCard
                            local={item}
                            onEdit={() => vm.navegarParaEdicao(item)}
                            onDelete={() => handleDeletePress(item)}
                        />
                    )}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    refreshing={vm.isLoading}
                    onRefresh={vm.listarLocais}
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

// Local Card Component
function LocalCard({
    local,
    onEdit,
    onDelete
}: {
    local: Local;
    onEdit: () => void;
    onDelete: () => void;
}) {
    return (
        <View style={styles.card}>
            <View style={styles.cardLeft}>
                <View style={styles.cardIconContainer}>
                    <MaterialIcons name="business" size={22} color={COLORS.primary} />
                </View>
                <View style={styles.cardInfo}>
                    <Text style={styles.cardNome}>{local.nome}</Text>
                    <Text style={styles.cardDescricao} numberOfLines={2}>
                        {local.descricao}
                    </Text>
                </View>
            </View>
            <View style={styles.cardActions}>
                <TouchableOpacity
                    style={styles.actionIconButton}
                    onPress={onEdit}
                    activeOpacity={0.7}
                >
                    <Feather name="edit-2" size={18} color={COLORS.primary} />
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.actionIconButton}
                    onPress={onDelete}
                    activeOpacity={0.7}
                >
                    <Feather name="trash-2" size={18} color={COLORS.danger} />
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    scroll: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 16,
        paddingBottom: 20,
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
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: COLORS.text,
        marginBottom: 8,
        textAlign: 'center',
    },
    emptySubtitle: {
        fontSize: 14,
        color: COLORS.textSecondary,
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 20,
    },
    emptyButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surface,
        borderWidth: 1,
        borderColor: COLORS.border,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        gap: 8,
    },
    emptyButtonText: {
        color: COLORS.primary,
        fontSize: 13,
        fontWeight: '500',
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
    cardIconContainer: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: COLORS.surfaceLight,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cardInfo: {
        flex: 1,
        gap: 4,
        paddingRight: 8,
    },
    cardNome: {
        color: COLORS.text,
        fontSize: 15,
        fontWeight: '600',
    },
    cardDescricao: {
        color: COLORS.textSecondary,
        fontSize: 12,
        lineHeight: 16,
    },
    cardActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    actionIconButton: {
        padding: 8,
        borderRadius: 8,
        backgroundColor: COLORS.surfaceLight,
    },
    formCard: {
        backgroundColor: COLORS.surface,
        borderRadius: 16,
        padding: 20,
        borderWidth: 1,
        borderColor: COLORS.border,
        marginBottom: 24,
    },
    errorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FF8A801A',
        borderWidth: 1,
        borderColor: COLORS.danger,
        padding: 12,
        borderRadius: 8,
        marginBottom: 20,
    },
    errorText: {
        color: COLORS.danger,
        fontSize: 14,
        marginLeft: 8,
        flex: 1,
    },
    inputSection: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.text,
        marginBottom: 8,
    },
    input: {
        backgroundColor: COLORS.surfaceLight,
        borderRadius: 8,
        paddingHorizontal: 16,
        paddingVertical: 12,
        color: COLORS.text,
        fontSize: 15,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    textArea: {
        height: 100,
        textAlignVertical: 'top',
    },
    actionsContainer: {
        paddingHorizontal: 16,
        paddingVertical: 16,
        paddingBottom: 24,
        gap: 12,
        backgroundColor: COLORS.background,
    },
    salvarButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: COLORS.primary,
        borderRadius: 28,
        paddingVertical: 16,
        gap: 8,
        height: 54,
    },
    salvarButtonText: {
        color: COLORS.background,
        fontSize: 16,
        fontWeight: '600',
    },
    voltarFormButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
        gap: 6,
    },
    voltarFormButtonText: {
        color: COLORS.danger,
        fontSize: 14,
        fontWeight: '500',
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