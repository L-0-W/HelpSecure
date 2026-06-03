// src/screens/Home/HomeTabView.tsx
import React from 'react';
import { TabView, SceneMap } from 'react-native-tab-view';
import { useHomeViewModel } from '../viewmodels/useHomeViewModel';
import ListaVisitantesView from './ListaVisitantesView';

import LocalView from './LocalView';
import CameraView from './CameraView';
import LogsView from './LogsView';

import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { Text, View, TouchableOpacity, useWindowDimensions, Dimensions, StyleSheet } from 'react-native';


const COLORS = {
    text: '#FFFFFF',
};

const styles = StyleSheet.create({
    header: {
        backgroundColor: '#121214',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#202024',
    },
    headerTitle: {
        color: COLORS.text,
        fontSize: 20,
        fontWeight: 'bold',
    },
    headerButton: {
        padding: 8,
    },
});

const renderScene = SceneMap({
    visitantes: ListaVisitantesView,
    locais: LocalView,
    cameras: CameraView,
    logs: LogsView,
});

export default function HomeTabView() {
    const { abaAtiva, alterarAba } = useHomeViewModel();
    const layout = useWindowDimensions();

    const [rotas] = React.useState([
        { key: 'visitantes', title: 'Visitantes', icon: 'person' as const },
        { key: 'locais', title: 'Locais', icon: 'place' as const },
        { key: 'cameras', title: 'Câmeras', icon: 'videocam' as const },
        { key: 'logs', title: 'Logs', icon: 'list' as const },
    ]);

    return (
        <View style={{ flex: 1 }}>
            <View style={styles.header}>
                <TouchableOpacity style={styles.headerButton}>
                    <Ionicons name="person-outline" size={20} color={COLORS.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>HelpSecure</Text>
                <TouchableOpacity style={styles.headerButton}>
                    <Ionicons name="settings-outline" size={20} color={COLORS.text} />
                </TouchableOpacity>
            </View>
            <TabView
                navigationState={{ index: abaAtiva, routes: rotas }}
                renderScene={renderScene}
                onIndexChange={alterarAba}
                initialLayout={{ width: layout.width }}
                renderTabBar={() => null}
                swipeEnabled={true}
            />

            <CustomTabBar
                navigationState={{ index: abaAtiva, routes: rotas }}
                jumpTo={alterarAba}
            />
        </View>
    );
}

function CustomTabBar({ navigationState, jumpTo }: { navigationState: any, jumpTo: any }) {
    return (
        <View style={{
            flexDirection: 'row',
            backgroundColor: '#121214',
            borderTopWidth: 1,
            borderTopColor: '#202024',
            paddingBottom: 8,
            paddingTop: 4,
        }}>
            {navigationState.routes.map((rota: any, indice: number) => {
                const estaFocado = navigationState.index === indice;
                return (
                    <TabBarButton
                        key={rota.key}
                        onPress={() => jumpTo(indice)}
                        focado={estaFocado}
                        rota={rota}
                    />
                );
            })}
        </View>
    );
}

function TabBarButton({ onPress, focado, rota }: { onPress: any, focado: boolean, rota: any }) {
    return (
        <TouchableOpacity
            style={{
                flex: 1,
                alignItems: 'center',
                justifyContent: 'center',
                paddingVertical: 10,
                paddingHorizontal: 4,
            }}
            onPress={onPress}
            activeOpacity={0.7}
        >
            <MaterialIcons
                name={rota.icon}
                size={24}
                color={focado ? '#00B37E' : '#7C7C8A'}
            />
            <Text style={{
                marginTop: 4,
                color: focado ? '#00B37E' : '#7C7C8A',
                fontSize: 12,
            }}>
                {rota.title}
            </Text>
        </TouchableOpacity>
    );
}