import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { useLogsViewModel } from '../viewmodels/useLogsViewModel';
import { Ionicons } from '@expo/vector-icons';

export default function LogsView() {
    const { logs } = useLogsViewModel();

    const renderItem = ({ item }: { item: any }) => (
        <View style={styles.logCard}>
            <View style={styles.iconContainer}>
                <Ionicons
                    name={item.success ? "checkmark-circle" : "close-circle"}
                    size={32}
                    color={item.success ? "#00B37E" : "#F75A68"}
                />
            </View>
            <View style={styles.logContent}>
                <Text style={styles.logMessage}>{item.message}</Text>
                <Text style={styles.logTime}>{new Date(item.timestamp).toLocaleString()}</Text>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Histórico de Acessos</Text>
            {logs.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>Nenhum reconhecimento registrado.</Text>
                </View>
            ) : (
                <FlatList
                    data={logs}
                    keyExtractor={(item, index) => index.toString()}
                    renderItem={renderItem}
                    contentContainerStyle={{ paddingBottom: 20 }}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#121214',
        padding: 16,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#E1E1E6',
        marginBottom: 20,
    },
    logCard: {
        flexDirection: 'row',
        backgroundColor: '#202024',
        padding: 16,
        borderRadius: 8,
        marginBottom: 12,
        alignItems: 'center',
    },
    iconContainer: {
        marginRight: 16,
    },
    logContent: {
        flex: 1,
    },
    logMessage: {
        color: '#E1E1E6',
        fontSize: 16,
        marginBottom: 4,
    },
    logTime: {
        color: '#7C7C8A',
        fontSize: 12,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyText: {
        color: '#7C7C8A',
        fontSize: 16,
    }
});
