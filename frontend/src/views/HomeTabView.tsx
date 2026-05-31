// src/screens/Home/HomeTabView.tsx
import React from 'react';
import { TabView, SceneMap } from 'react-native-tab-view';
import { useHomeViewModel } from '../viewmodels/useHomeViewModel';
import ListaVisitantesView from './ListaVisitantesView';

import LocalView from './LocalView';
import CameraView from './CameraView';

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
});

export default function HomeTabView() {
    const { index, handleIndexChange } = useHomeViewModel();
    const layout = useWindowDimensions();

    const [routes] = React.useState([
        { key: 'visitantes', title: 'Visitantes', icon: 'person' as const },
        { key: 'locais', title: 'Locais', icon: 'place' as const },
        { key: 'cameras', title: 'Câmeras', icon: 'videocam' as const },
    ]);

    return (
        <View style={{ flex: 1 }}>
            {/* Header */}
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
                navigationState={{ index, routes }}
                renderScene={renderScene}
                onIndexChange={handleIndexChange}
                initialLayout={{ width: layout.width }}
                renderTabBar={() => null}
                swipeEnabled={true}
            />

            <CustomTabBar
                navigationState={{ index, routes }}
                jumpTo={handleIndexChange}
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
            {navigationState.routes.map((route: any, idx: number) => {
                const isFocused = navigationState.index === idx;
                return (
                    <TabBarButton
                        key={route.key}
                        onPress={() => jumpTo(idx)}
                        focused={isFocused}
                        route={route}
                    />
                );
            })}
        </View>
    );
}

function TabBarButton({ onPress, focused, route }: { onPress: any, focused: boolean, route: any }) {
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
                name={route.icon}
                size={24}
                color={focused ? '#00B37E' : '#7C7C8A'}
            />
            <Text style={{
                marginTop: 4,
                color: focused ? '#00B37E' : '#7C7C8A',
                fontSize: 12,
            }}>
                {route.title}
            </Text>
        </TouchableOpacity>
    );
}