// src/screens/NovoVisitante/NovoVisitanteView.tsx
import React, { useState, useRef } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ScrollView,
    StyleSheet,
    StatusBar,
    ActivityIndicator,
    Alert,
    Image,
} from 'react-native';
import { Ionicons, MaterialIcons, Feather } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useNovoVisitanteViewModel } from '../viewmodels/useNovoVisitanteViewModel';

// Cores do tema escuro
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

// Conversor robusto de base64 para array de bytes pura em JavaScript
const base64ToByteArray = (base64String: string): number[] => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    const lookup = new Uint8Array(256);
    for (let i = 0; i < chars.length; i++) {
        lookup[chars.charCodeAt(i)] = i;
    }
    
    const len = base64String.length;
    let p = 0;
    if (base64String[len - 1] === '=') {
        p++;
        if (base64String[len - 2] === '=') {
            p++;
        }
    }
    
    const bytes = new Uint8Array(Math.floor(len * 0.75) - p);
    let bytesIdx = 0;
    
    for (let i = 0; i < len; i += 4) {
        const encoded1 = lookup[base64String.charCodeAt(i)];
        const encoded2 = lookup[base64String.charCodeAt(i + 1)];
        const encoded3 = lookup[base64String.charCodeAt(i + 2)];
        const encoded4 = lookup[base64String.charCodeAt(i + 3)];
        
        const bytesVal = (encoded1 << 18) | (encoded2 << 12) | (encoded3 << 6) | encoded4;
        
        bytes[bytesIdx++] = (bytesVal >> 16) & 255;
        if (bytesIdx < bytes.length) {
            bytes[bytesIdx++] = (bytesVal >> 8) & 255;
        }
        if (bytesIdx < bytes.length) {
            bytes[bytesIdx++] = bytesVal & 255;
        }
    }
    return Array.from(bytes);
};

export default function NovoVisitanteView({
    visitante,
    onVoltar,
}: {
    visitante?: any;
    onVoltar: () => void;
}) {
    const isEditing = !!visitante;
    const vm = useNovoVisitanteViewModel(visitante, onVoltar);
    
    const [cameraActive, setCameraActive] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const cameraRef = useRef<any>(null);
    const [permission, requestPermission] = useCameraPermissions();

    const handleTirarFoto = async () => {
        if (!permission || !permission.granted) {
            const res = await requestPermission();
            if (!res.granted) {
                Alert.alert('Câmera Necessária', 'Por favor, conceda acesso à câmera nas configurações para continuar.');
                return;
            }
        }
        setCameraActive(true);
    };

    const capturePhoto = async () => {
        if (cameraRef.current) {
            try {
                const photo = await cameraRef.current.takePictureAsync({
                    quality: 0.5,
                    base64: true,
                });
                if (photo && photo.uri && photo.base64) {
                    vm.setFotoUri(photo.uri);
                    const bytes = base64ToByteArray(photo.base64);
                    vm.setFaceImageBytes(bytes);
                }
                setCameraActive(false);
            } catch (err) {
                console.error(err);
                Alert.alert('Erro', 'Não foi possível capturar a imagem.');
            }
        }
    };

    if (cameraActive) {
        return (
            <View style={styles.cameraContainer}>
                <CameraView
                    style={StyleSheet.absoluteFillObject}
                    facing="front"
                    ref={cameraRef}
                />
                <View style={styles.cameraOverlay}>
                    <Text style={styles.cameraInstruction}>
                        Enquadre o rosto do visitante
                    </Text>
                    <View style={styles.cameraActions}>
                        <TouchableOpacity
                            style={styles.cameraCancelButton}
                            onPress={() => setCameraActive(false)}
                            activeOpacity={0.8}
                        >
                            <Ionicons name="close" size={24} color="#FFFFFF" />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.cameraCaptureButton}
                            onPress={capturePhoto}
                            activeOpacity={0.8}
                        >
                            <View style={styles.cameraCaptureInner} />
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        );
    }

    // Tradução de datas personalizadas para exibição amigável
    const getValidadeLabel = () => {
        if (!vm.validade) return 'Selecione';
        if (vm.validade === '1h') return '1 Hora';
        if (vm.validade === '4h') return '4 Horas';
        if (vm.validade === '1dia') return '1 Dia';
        
        try {
            const date = new Date(vm.validade);
            if (!isNaN(date.getTime())) {
                return date.toLocaleDateString('pt-BR');
            }
        } catch (_) {}
        return vm.validade;
    };

    const isValidadePredefinida = vm.validade === '1h' || vm.validade === '4h' || vm.validade === '1dia';
    const isValidadeCustom = vm.validade !== null && !isValidadePredefinida;

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Título */}
                <View style={styles.titleSection}>
                    <Text style={styles.title}>
                        {isEditing ? 'Editar Acesso' : 'Novo Visitante'}
                    </Text>
                    <Text style={styles.subtitle}>
                        {isEditing 
                            ? 'Atualize os dados de autorização de acesso.'
                            : 'Preencha os dados para autorizar o acesso.'
                        }
                    </Text>
                </View>

                {/* Feedback de Erro */}
                {vm.error && (
                    <View style={styles.errorBanner}>
                        <Ionicons name="alert-circle-outline" size={18} color={COLORS.danger} />
                        <Text style={styles.errorText}>{vm.error}</Text>
                    </View>
                )}

                {/* Card de Foto */}
                <View style={styles.fotoCard}>
                    <View style={styles.fotoPlaceholder}>
                        {vm.fotoUri ? (
                            <Image source={{ uri: vm.fotoUri }} style={styles.capturedPhoto} />
                        ) : (
                            <View style={styles.fotoCircle}>
                                <Ionicons name="person" size={40} color={COLORS.textMuted} />
                            </View>
                        )}
                        <View style={styles.fotoDashedBorder} />
                    </View>

                    <TouchableOpacity
                        style={styles.fotoButton}
                        onPress={handleTirarFoto}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="camera-outline" size={16} color={COLORS.primary} />
                        <Text style={styles.fotoButtonText}>
                            {vm.fotoUri ? 'Tirar Outra Foto' : 'Tirar Foto'}
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Campo Nome */}
                <View style={styles.inputSection}>
                    <Text style={styles.label}>Nome Completo</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Ex: João da Silva"
                        placeholderTextColor={COLORS.textMuted}
                        value={vm.nome}
                        onChangeText={vm.setNome}
                        autoCapitalize="words"
                    />
                </View>

                {/* Local de Acesso */}
                <View style={styles.inputSection}>
                    <Text style={styles.label}>Local de Acesso</Text>
                    {vm.locais.length === 0 ? (
                        <View style={styles.noLocaisNotice}>
                            <Ionicons name="location-outline" size={18} color={COLORS.textSecondary} />
                            <Text style={styles.noLocaisText}>
                                Nenhum local cadastrado. Por favor, registre um local no painel antes de vincular visitantes.
                            </Text>
                        </View>
                    ) : (
                        <View style={styles.locaisContainer}>
                            {vm.locais.map((local) => (
                                <LocalButton
                                    key={local.id}
                                    icon="place"
                                    label={local.nome}
                                    selected={vm.localId === local.id}
                                    onPress={() => vm.setLocalId(local.id)}
                                />
                            ))}
                        </View>
                    )}
                </View>

                {/* Validade do Acesso */}
                <View style={styles.inputSection}>
                    <View style={styles.validadeHeader}>
                        <MaterialIcons name="timer" size={16} color={COLORS.primary} />
                        <Text style={styles.label}>Validade do Acesso</Text>
                    </View>
                    <View style={styles.validadeContainer}>
                        <ValidadeButton
                            label="1h"
                            selected={vm.validade === '1h'}
                            onPress={() => vm.setValidade('1h')}
                        />
                        <ValidadeButton
                            label="4h"
                            selected={vm.validade === '4h'}
                            onPress={() => vm.setValidade('4h')}
                        />
                        <ValidadeButton
                            label="1 Dia"
                            selected={vm.validade === '1dia'}
                            onPress={() => vm.setValidade('1dia')}
                        />
                        <ValidadeButton
                            icon="calendar-today"
                            selected={isValidadeCustom}
                            onPress={() => setShowDatePicker(true)}
                        />
                    </View>
                    {isValidadeCustom && (
                        <Text style={styles.validadeCustomLabel}>
                            Validade Personalizada: {getValidadeLabel()}
                        </Text>
                    )}
                </View>
            </ScrollView>

            {/* DatePicker nativo */}
            {showDatePicker && (
                <DateTimePicker
                    value={isValidadeCustom ? new Date(vm.validade!) : new Date()}
                    mode="date"
                    display="default"
                    onChange={(event, selectedDate) => {
                        setShowDatePicker(false);
                        if (selectedDate) {
                            vm.setValidade(selectedDate.toISOString());
                        }
                    }}
                />
            )}

            {/* Botões de Ação */}
            <View style={styles.actionsContainer}>
                <TouchableOpacity
                    style={[styles.salvarButton, vm.isLoading && { opacity: 0.7 }]}
                    onPress={vm.handleSalvar}
                    disabled={vm.isLoading}
                    activeOpacity={0.9}
                >
                    {vm.isLoading ? (
                        <ActivityIndicator size="small" color={COLORS.background} />
                    ) : (
                        <>
                            <Ionicons name="checkmark-circle-outline" size={20} color={COLORS.background} />
                            <Text style={styles.salvarButtonText}>
                                {isEditing ? 'Salvar Alterações' : 'Criar Visitante'}
                            </Text>
                        </>
                    )}
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.revogarButton}
                    onPress={onVoltar}
                    disabled={vm.isLoading}
                    activeOpacity={0.8}
                >
                    <Ionicons name="close-circle-outline" size={18} color={COLORS.danger} />
                    <Text style={styles.revogarButtonText}>Voltar</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

// Sub-componente: Botão de Local
function LocalButton({
    icon,
    label,
    selected,
    onPress,
}: {
    icon: string;
    label: string;
    selected: boolean;
    onPress: () => void;
}) {
    return (
        <TouchableOpacity
            style={[
                styles.localButton,
                selected && styles.localButtonSelected,
            ]}
            onPress={onPress}
            activeOpacity={0.8}
        >
            <MaterialIcons
                name={icon as any}
                size={16}
                color={selected ? COLORS.background : COLORS.primary}
            />
            <Text
                style={[
                    styles.localButtonText,
                    selected && styles.localButtonTextSelected,
                ]}
            >
                {label}
            </Text>
        </TouchableOpacity>
    );
}

// Sub-componente: Botão de Validade
function ValidadeButton({
    label,
    icon,
    selected,
    onPress,
}: {
    label?: string;
    icon?: string;
    selected: boolean;
    onPress: () => void;
}) {
    return (
        <TouchableOpacity
            style={[
                styles.validadeButton,
                selected && styles.validadeButtonSelected,
            ]}
            onPress={onPress}
            activeOpacity={0.8}
        >
            {icon ? (
                <MaterialIcons
                    name={icon as any}
                    size={18}
                    color={selected ? COLORS.background : COLORS.primary}
                />
            ) : (
                <Text
                    style={[
                        styles.validadeButtonText,
                        selected && styles.validadeButtonTextSelected,
                    ]}
                >
                    {label}
                </Text>
            )}
        </TouchableOpacity>
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
        paddingBottom: 120,
    },
    titleSection: {
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
    errorBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: `${COLORS.danger}15`,
        borderColor: COLORS.danger,
        borderWidth: 1,
        borderRadius: 8,
        padding: 12,
        marginBottom: 20,
    },
    errorText: {
        color: COLORS.danger,
        fontSize: 13,
        fontWeight: '500',
        flex: 1,
    },
    fotoCard: {
        alignItems: 'center',
        backgroundColor: COLORS.surface,
        borderRadius: 16,
        padding: 20,
        borderWidth: 1,
        borderColor: COLORS.border,
        marginBottom: 20,
    },
    fotoPlaceholder: {
        width: 100,
        height: 100,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    fotoCircle: {
        width: 88,
        height: 88,
        borderRadius: 44,
        backgroundColor: COLORS.surfaceLight,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 2,
    },
    capturedPhoto: {
        width: 88,
        height: 88,
        borderRadius: 44,
        zIndex: 2,
    },
    fotoDashedBorder: {
        position: 'absolute',
        width: 100,
        height: 100,
        borderRadius: 50,
        borderWidth: 2,
        borderColor: COLORS.primary,
        borderStyle: 'dashed',
        opacity: 0.5,
    },
    fotoButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: COLORS.surfaceLight,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    fotoButtonText: {
        color: COLORS.primary,
        fontSize: 13,
        fontWeight: '600',
    },
    inputSection: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.primary,
        marginBottom: 10,
    },
    input: {
        backgroundColor: COLORS.surface,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 15,
        color: COLORS.text,
    },
    noLocaisNotice: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: COLORS.surface,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 12,
        padding: 16,
    },
    noLocaisText: {
        color: COLORS.textSecondary,
        fontSize: 13,
        lineHeight: 18,
        flex: 1,
    },
    locaisContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    localButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 20,
        backgroundColor: COLORS.surface,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    localButtonSelected: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
    localButtonText: {
        color: COLORS.primary,
        fontSize: 13,
        fontWeight: '500',
    },
    localButtonTextSelected: {
        color: COLORS.background,
        fontWeight: '600',
    },
    validadeHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 10,
    },
    validadeContainer: {
        flexDirection: 'row',
        gap: 8,
    },
    validadeButton: {
        flex: 1,
        height: 48,
        borderRadius: 12,
        backgroundColor: COLORS.surface,
        borderWidth: 1,
        borderColor: COLORS.border,
        alignItems: 'center',
        justifyContent: 'center',
    },
    validadeButtonSelected: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
    validadeButtonText: {
        color: COLORS.primary,
        fontSize: 14,
        fontWeight: '500',
    },
    validadeButtonTextSelected: {
        color: COLORS.background,
        fontWeight: '600',
    },
    validadeCustomLabel: {
        color: COLORS.success,
        fontSize: 12,
        fontWeight: '500',
        marginTop: 8,
        paddingHorizontal: 4,
    },
    actionsContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        gap: 12,
        backgroundColor: COLORS.background,
        paddingHorizontal: 16,
        paddingVertical: 16,
        borderTopWidth: 1,
        borderColor: COLORS.border,
    },
    salvarButton: {
        flex: 2,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: COLORS.primary,
        borderRadius: 12,
        height: 52,
    },
    salvarButtonText: {
        color: COLORS.background,
        fontSize: 15,
        fontWeight: '700',
    },
    revogarButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        backgroundColor: COLORS.surface,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 12,
        height: 52,
    },
    revogarButtonText: {
        color: COLORS.text,
        fontSize: 14,
        fontWeight: '600',
    },
    cameraContainer: {
        flex: 1,
        backgroundColor: '#000000',
    },
    cameraOverlay: {
        position: 'absolute',
        bottom: 40,
        left: 0,
        right: 0,
        alignItems: 'center',
    },
    cameraInstruction: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '500',
        marginBottom: 20,
        textShadowColor: 'rgba(0, 0, 0, 0.8)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 4,
    },
    cameraActions: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '80%',
        paddingHorizontal: 20,
    },
    cameraCancelButton: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(0,0,0,0.5)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    cameraCaptureButton: {
        width: 72,
        height: 72,
        borderRadius: 36,
        borderWidth: 4,
        borderColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'transparent',
    },
    cameraCaptureInner: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#FFFFFF',
    },
});