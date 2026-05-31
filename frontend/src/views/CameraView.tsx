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
import { useCameraViewModel } from '../viewmodels/useCameraViewModel';
import { Camera } from '../models/models';

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

export default function CameraView() {
    const vm = useCameraViewModel();

    useEffect(() => {
        vm.listarCameras();
    }, []);

    const handleDeletePress = (camera: Camera) => {
        Alert.alert(
            'Confirmar Exclusão',
            `Deseja realmente excluir a câmera "${camera.nome}"?`,
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Excluir',
                    style: 'destructive',
                    onPress: () => vm.deletarCamera(camera.id),
                },
            ],
            { cancelable: true }
        );
    };

    if (vm.telaAtiva === 'cadastro') {
        return (
            <View style={styles.container}>
                <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

                <ScrollView
                    style={styles.scroll}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    <View style={styles.titleSection}>
                        <Text style={styles.title}>Nova Câmera</Text>
                        <Text style={styles.subtitle}>
                            Cadastre e vincule uma nova câmera ao seu usuário.
                        </Text>
                    </View>

                    <View style={styles.formCard}>
                        {vm.error ? (
                            <View style={styles.errorContainer}>
                                <Feather name="alert-circle" size={18} color={COLORS.danger} />
                                <Text style={styles.errorText}>{vm.error}</Text>
                            </View>
                        ) : null}

                        <View style={styles.inputSection}>
                            <Text style={styles.label}>Nome da Câmera</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Ex: Câmera Portão, Câmera Robô"
                                placeholderTextColor={COLORS.textMuted}
                                value={vm.nome}
                                onChangeText={vm.setNome}
                                autoCapitalize="words"
                            />
                        </View>

                        <View style={styles.inputSection}>
                            <Text style={styles.label}>Token</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Insira o token do ESP32"
                                placeholderTextColor={COLORS.textMuted}
                                value={vm.token}
                                onChangeText={vm.setToken}
                            />
                        </View>
                    </View>
                </ScrollView>

                <View style={styles.actionsContainer}>
                    <TouchableOpacity
                        style={styles.salvarButton}
                        onPress={vm.salvarCamera}
                        disabled={vm.isLoading}
                        activeOpacity={0.9}
                    >
                        {vm.isLoading ? (
                            <ActivityIndicator color={COLORS.background} />
                        ) : (
                            <>
                                <Ionicons name="checkmark-circle-outline" size={20} color={COLORS.background} />
                                <Text style={styles.salvarButtonText}>Criar Câmera</Text>
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

    return (
        <View style={styles.container}>
            <View style={styles.titleSection}>
                <Text style={styles.title}>Câmeras</Text>
                <Text style={styles.subtitle}>
                    Gerencie as câmeras cadastradas.
                </Text>
            </View>

            {vm.isLoading && vm.cameras.length === 0 ? (
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                </View>
            ) : vm.cameras.length === 0 ? (
                <View style={styles.centerContainer}>
                    <View style={styles.emptyIconContainer}>
                        <MaterialIcons name="videocam" size={48} color={COLORS.textMuted} />
                    </View>
                    <Text style={styles.emptyTitle}>Nenhuma câmera encontrada</Text>
                    <Text style={styles.emptySubtitle}>
                        Toque no botão "+" abaixo para cadastrar a sua primeira câmera.
                    </Text>
                    <TouchableOpacity
                        style={styles.emptyButton}
                        onPress={vm.listarCameras}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="refresh" size={16} color={COLORS.primary} />
                        <Text style={styles.emptyButtonText}>Recarregar</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <FlatList
                    data={vm.cameras}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={({ item }) => (
                        <CameraCard
                            camera={item}
                            onDelete={() => handleDeletePress(item)}
                        />
                    )}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    refreshing={vm.isLoading}
                    onRefresh={vm.listarCameras}
                />
            )}

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

function CameraCard({
    camera,
    onDelete
}: {
    camera: Camera;
    onDelete: () => void;
}) {
    return (
        <View style={styles.card}>
            <View style={styles.cardLeft}>
                <View style={styles.cardIconContainer}>
                    <MaterialIcons name="videocam" size={22} color={COLORS.primary} />
                </View>
                <View style={styles.cardInfo}>
                    <Text style={styles.cardNome}>{camera.nome}</Text>
                    <Text style={styles.cardDescricao} numberOfLines={1}>
                        IP: {camera.cam_ip || 'Offline / Não Reconhecido'}
                    </Text>
                </View>
            </View>
            <View style={styles.cardActions}>
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
