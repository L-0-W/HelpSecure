import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSettingsViewModel } from '../viewmodels/useSettingsViewModel';

interface SettingsViewProps {
  navigateToHome: () => void;
  navigateToLogin: () => void;
}

export default function SettingsView({ navigateToHome, navigateToLogin }: SettingsViewProps) {
  const { isBiometricEnabled, isBiometricSupported, isLoading, toggleBiometric, logout } = useSettingsViewModel();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={navigateToHome}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Configurações</Text>
        <View style={styles.headerButton} />
      </View>

      <View style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Segurança</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Ionicons name="finger-print" size={24} color="#00B37E" style={styles.settingIcon} />
              <View>
                <Text style={styles.settingText}>Habilitar Biometria</Text>
                <Text style={styles.settingDescription}>
                  Use sua biometria para acessar o aplicativo
                </Text>
              </View>
            </View>
            
            {isLoading ? (
              <ActivityIndicator size="small" color="#00B37E" />
            ) : (
              <Switch
                value={isBiometricEnabled}
                onValueChange={toggleBiometric}
                disabled={!isBiometricSupported}
                trackColor={{ false: '#323238', true: '#00B37E' }}
                thumbColor={'#FFFFFF'}
              />
            )}
          </View>
          {!isBiometricSupported && (
            <Text style={styles.warningText}>
              Seu dispositivo não suporta biometria ou não está configurada.
            </Text>
          )}
        </View>

        <View style={styles.section}>
          <TouchableOpacity 
            style={styles.logoutButton} 
            onPress={() => logout(navigateToLogin)}
          >
            <Ionicons name="log-out-outline" size={20} color="#F75A68" style={styles.logoutIcon} />
            <Text style={styles.logoutText}>Sair da conta</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121214',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#202024',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerButton: {
    padding: 8,
    width: 40,
    alignItems: 'center',
  },
  content: {
    flex: 1,
    padding: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: '#A0A0A5',
    fontSize: 14,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    marginBottom: 16,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#202024',
    padding: 16,
    borderRadius: 8,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    marginRight: 16,
  },
  settingText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  settingDescription: {
    color: '#8D8D99',
    fontSize: 12,
  },
  warningText: {
    color: '#F75A68',
    fontSize: 12,
    marginTop: 8,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#F75A68',
    padding: 16,
    borderRadius: 8,
  },
  logoutIcon: {
    marginRight: 8,
  },
  logoutText: {
    color: '#F75A68',
    fontSize: 16,
    fontWeight: 'bold',
  }
});
