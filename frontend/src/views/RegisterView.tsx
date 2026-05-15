import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';

interface RegisterViewProps {
  name?: string;
  email?: string;
  password?: string;
  onNameChange?: (name: string) => void;
  onEmailChange?: (email: string) => void;
  onPasswordChange?: (password: string) => void;
  onRegister?: () => void;
  onGoToLogin?: () => void;
  isPasswordVisible?: boolean;
  onTogglePasswordVisibility?: () => void;
  isLoading?: boolean;
  error?: string | null;
}

export const RegisterView: React.FC<RegisterViewProps> = ({
  name,
  email,
  password,
  onNameChange,
  onEmailChange,
  onPasswordChange,
  onRegister,
  onGoToLogin,
  isPasswordVisible = false,
  onTogglePasswordVisibility,
  isLoading = false,
  error = null,
}) => {
  const shakeAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (error) {
      Animated.sequence([
        Animated.timing(shakeAnimation, { toValue: 10, duration: 100, useNativeDriver: true }),
        Animated.timing(shakeAnimation, { toValue: -10, duration: 100, useNativeDriver: true }),
        Animated.timing(shakeAnimation, { toValue: 10, duration: 100, useNativeDriver: true }),
        Animated.timing(shakeAnimation, { toValue: 0, duration: 100, useNativeDriver: true })
      ]).start();
    }
  }, [error]);

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAwareScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        enableOnAndroid={true}
        extraScrollHeight={20}
      >
          {/* Header Icon */}
          <View style={styles.headerIconContainer}>
            <View style={styles.iconBackground}>
              <MaterialCommunityIcons name="account-plus" size={50} color="#fff" />
            </View>
          </View>

          {/* Titles */}
          <Text style={styles.title}>Criar Conta</Text>
          <Text style={styles.subtitle}>
            Preencha seus dados para começar.
          </Text>

          {/* Form Card */}
          <Animated.View style={[styles.card, { transform: [{ translateX: shakeAnimation }] }]}>
            {error ? (
              <View style={styles.errorContainer}>
                <Feather name="alert-circle" size={18} color="#FF5252" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* Name Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nome</Text>
              <View style={styles.inputContainer}>
                <Feather name="user" size={20} color="#8A8A8E" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Seu nome completo"
                  placeholderTextColor="#8A8A8E"
                  value={name}
                  onChangeText={onNameChange}
                  autoCapitalize="words"
                />
              </View>
            </View>

            {/* Email Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <View style={styles.inputContainer}>
                <Feather name="mail" size={20} color="#8A8A8E" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="seu@email.com"
                  placeholderTextColor="#8A8A8E"
                  value={email}
                  onChangeText={onEmailChange}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            </View>

            {/* Password Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Senha</Text>
              <View style={styles.inputContainer}>
                <Feather name="lock" size={20} color="#8A8A8E" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="••••••••"
                  placeholderTextColor="#8A8A8E"
                  value={password}
                  onChangeText={onPasswordChange}
                  secureTextEntry={!isPasswordVisible}
                />
                <TouchableOpacity onPress={onTogglePasswordVisibility} style={styles.eyeIcon}>
                  <Feather name={isPasswordVisible ? "eye-off" : "eye"} size={20} color="#8A8A8E" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Register Button */}
            <TouchableOpacity 
              style={[styles.registerButton, isLoading && { opacity: 0.8 }]} 
              onPress={onRegister}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#121214" />
              ) : (
                <Text style={styles.registerButtonText}>Cadastrar</Text>
              )}
            </TouchableOpacity>
          </Animated.View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Já tem uma conta? </Text>
            <TouchableOpacity onPress={onGoToLogin}>
              <Text style={styles.footerLink}>Entrar</Text>
            </TouchableOpacity>
          </View>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121214',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  headerIconContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconBackground: {
    width: 90,
    height: 90,
    backgroundColor: '#00D4FF',
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#00D4FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    color: '#A0A0A5',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  card: {
    backgroundColor: '#2A2A2D',
    borderRadius: 16,
    padding: 24,
    marginBottom: 32,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF52521A',
    borderWidth: 1,
    borderColor: '#FF5252',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  errorText: {
    color: '#FF5252',
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    color: '#E0E0E5',
    fontSize: 14,
    marginBottom: 8,
    fontWeight: '500',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E20',
    borderWidth: 1,
    borderColor: '#3A3A3D',
    borderRadius: 8,
    height: 52,
    paddingHorizontal: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
  },
  eyeIcon: {
    padding: 4,
  },
  registerButton: {
    backgroundColor: '#B0C8FF',
    height: 52,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  registerButtonText: {
    color: '#121214',
    fontSize: 16,
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    color: '#A0A0A5',
    fontSize: 15,
  },
  footerLink: {
    color: '#B0C8FF',
    fontSize: 15,
    fontWeight: '600',
  },
});
