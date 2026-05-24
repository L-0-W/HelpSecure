// src/screens/NovoVisitante/NovoVisitanteView.tsx
import React from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ScrollView,
    StyleSheet,
    StatusBar,
} from 'react-native';

import { Ionicons, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { useNovoVisitanteViewModel } from '../viewmodels/useNovoVisitanteViewModel';
import { useListaVisitantesViewModel } from '../viewmodels/useVisitantesListViewModel';

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

export default function NovoVisitanteView({ onVoltar }: { onVoltar: () => void }) {
    const vm = useNovoVisitanteViewModel();

    return (
        <>
            <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Título */}
                <View style={styles.titleSection}>
                    <Text style={styles.title}>Novo Visitante</Text>
                    <Text style={styles.subtitle}>
                        Preencha os dados para autorizar o acesso.
                    </Text>
                </View>

                {/* Card de Foto */}
                <View style={styles.fotoCard}>
                    <View style={styles.fotoPlaceholder}>
                        <View style={styles.fotoCircle}>
                            <Ionicons name="person" size={40} color={COLORS.textMuted} />
                        </View>
                        <View style={styles.fotoDashedBorder} />
                    </View>

                    <TouchableOpacity
                        style={styles.fotoButton}
                        onPress={vm.handleTirarFoto}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="camera-outline" size={16} color={COLORS.primary} />
                        <Text style={styles.fotoButtonText}>Tirar Foto</Text>
                    </TouchableOpacity>
                </View>

                {/* Campo Nome */}
                <View style={styles.inputSection}>
                    <Text style={styles.label}>Nome Completo</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Ex: João da Silva"
                        placeholderTextColor={COLORS.textMuted}
                        value={vm.visitante.nome}
                        onChangeText={vm.setNome}
                        autoCapitalize="words"
                    />
                </View>

                {/* Local de Acesso */}
                <View style={styles.inputSection}>
                    <Text style={styles.label}>Local de Acesso</Text>
                    <View style={styles.locaisContainer}>
                        <LocalButton
                            icon="business"
                            label="Portaria Principal"
                            selected={vm.visitante.localAcesso === 'portaria'}
                            onPress={() => vm.setLocalAcesso('portaria')}
                        />
                        <LocalButton
                            icon="directions-car"
                            label="Garagem Subsolo"
                            selected={vm.visitante.localAcesso === 'garagem'}
                            onPress={() => vm.setLocalAcesso('garagem')}
                        />
                        <LocalButton
                            icon="domain"
                            label="Bloco Administrativo"
                            selected={vm.visitante.localAcesso === 'administrativo'}
                            onPress={() => vm.setLocalAcesso('administrativo')}
                            fullWidth
                        />
                    </View>
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
                            selected={vm.visitante.validade === '1h'}
                            onPress={() => vm.setValidade('1h')}
                        />
                        <ValidadeButton
                            label="4h"
                            selected={vm.visitante.validade === '4h'}
                            onPress={() => vm.setValidade('4h')}
                        />
                        <ValidadeButton
                            label="1 Dia"
                            selected={vm.visitante.validade === '1dia'}
                            onPress={() => vm.setValidade('1dia')}
                        />
                        <ValidadeButton
                            icon="calendar-today"
                            selected={vm.visitante.validade === 'custom'}
                            onPress={() => vm.setValidade('custom')}
                        />
                    </View>
                </View>
            </ScrollView>

            {/* Botões de Ação (fixos embaixo) */}
            <View style={styles.actionsContainer}>
                <TouchableOpacity
                    style={styles.salvarButton}
                    onPress={vm.handleSalvar}
                    activeOpacity={0.9}
                >
                    <Ionicons name="checkmark-circle-outline" size={20} color={COLORS.background} />
                    <Text style={styles.salvarButtonText}>Salvar Visitante</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.revogarButton}
                    onPress={() => onVoltar()}
                    activeOpacity={0.8}
                >
                    <Ionicons name="close-circle-outline" size={18} color={COLORS.danger} />
                    <Text style={styles.revogarButtonText}>Voltar</Text>
                </TouchableOpacity>
            </View>
        </>
    );
}

// Sub-componente: Botão de Local
function LocalButton({ icon, label, selected, onPress, fullWidth = false }) {
    return (
        <TouchableOpacity
            style={[
                styles.localButton,
                selected && styles.localButtonSelected,
                fullWidth && styles.localButtonFullWidth,
            ]}
            onPress={onPress}
            activeOpacity={0.8}
        >
            <MaterialIcons
                name={icon}
                size={16}
                color={selected ? COLORS.primary : COLORS.textSecondary}
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
function ValidadeButton({ label, icon, selected, onPress }) {
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
                    name={icon}
                    size={18}
                    color={selected ? COLORS.primary : COLORS.textSecondary}
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
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    headerButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: COLORS.surface,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: COLORS.primary,
    },
    scroll: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 16,
        paddingBottom: 20,
    },
    titleSection: {
        marginTop: 8,
        marginBottom: 24,
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
    fotoCard: {
        backgroundColor: COLORS.surface,
        borderRadius: 16,
        padding: 24,
        alignItems: 'center',
        marginBottom: 24,
    },
    fotoPlaceholder: {
        width: 120,
        height: 120,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    fotoCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: COLORS.surfaceLight,
        alignItems: 'center',
        justifyContent: 'center',
    },
    fotoDashedBorder: {
        position: 'absolute',
        width: 110,
        height: 110,
        borderRadius: 55,
        borderWidth: 2,
        borderColor: COLORS.textMuted,
        borderStyle: 'dashed',
        opacity: 0.5,
    },
    fotoButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surfaceLight,
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 24,
        gap: 8,
    },
    fotoButtonText: {
        color: COLORS.primary,
        fontSize: 14,
        fontWeight: '500',
    },
    inputSection: {
        marginBottom: 24,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.text,
        marginBottom: 12,
    },
    input: {
        backgroundColor: COLORS.surface,
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        color: COLORS.text,
        fontSize: 15,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    locaisContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    localButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surface,
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderWidth: 1,
        borderColor: COLORS.border,
        gap: 8,
        flex: 1,
        minWidth: '45%',
    },
    localButtonSelected: {
        borderColor: COLORS.primary,
        backgroundColor: 'rgba(138, 180, 248, 0.1)',
    },
    localButtonFullWidth: {
        minWidth: '100%',
        flex: 0,
    },
    localButtonText: {
        color: COLORS.textSecondary,
        fontSize: 13,
        fontWeight: '500',
    },
    localButtonTextSelected: {
        color: COLORS.primary,
    },
    validadeHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
    },
    validadeContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    validadeButton: {
        flex: 1,
        minWidth: '45%',
        backgroundColor: COLORS.surface,
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    validadeButtonSelected: {
        borderColor: COLORS.primary,
        backgroundColor: 'rgba(138, 180, 248, 0.15)',
    },
    validadeButtonText: {
        color: COLORS.textSecondary,
        fontSize: 15,
        fontWeight: '600',
    },
    validadeButtonTextSelected: {
        color: COLORS.primary,
    },
    actionsContainer: {
        paddingHorizontal: 16,
        paddingVertical: 16,
        paddingBottom: 24,
        gap: 12,
    },
    salvarButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: COLORS.primary,
        borderRadius: 28,
        paddingVertical: 16,
        gap: 8,
    },
    salvarButtonText: {
        color: COLORS.background,
        fontSize: 16,
        fontWeight: '600',
    },
    revogarButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
        gap: 6,
    },
    revogarButtonText: {
        color: COLORS.danger,
        fontSize: 14,
        fontWeight: '500',
    },
});