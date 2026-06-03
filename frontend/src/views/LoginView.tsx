import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { AuthInput } from '../components/AuthInput';
import { PrimaryButton } from '../components/PrimaryButton';
import { AuthHeaderIcon } from '../components/AuthHeaderIcon';
import { ErrorBanner } from '../components/ErrorBanner';

interface LoginViewProps {
  email?: string;
  password?: string;
  onEmailChange?: (email: string) => void;
  onPasswordChange?: (password: string) => void;
  onLogin?: () => void;
  onBiometricLogin?: () => void;
  onForgotPassword?: () => void;
  onCreateAccount?: () => void;
  isPasswordVisible?: boolean;
  onTogglePasswordVisibility?: () => void;
  isLoading?: boolean;
  error?: string | null;
}

export const LoginView: React.FC<LoginViewProps> = ({
  email,
  password,
  onEmailChange,
  onPasswordChange,
  onLogin,
  onBiometricLogin,
  onForgotPassword,
  onCreateAccount,
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
          <AuthHeaderIcon iconName="shield-check" />

          {/* Titles */}
          <Text style={styles.title}>Acesso Seguro</Text>
          <Text style={styles.subtitle}>
            Bem-vindo de volta ao seu painel de{'\n'}controle de segurança.
          </Text>

          {/* Form Card */}
          <Animated.View style={[styles.card, { transform: [{ translateX: shakeAnimation }] }]}>
            <ErrorBanner error={error} />

            {/* Email Input */}
            <AuthInput
              label="Email"
              iconName="mail"
              placeholder="seu@email.com"
              value={email}
              onChangeText={onEmailChange}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            {/* Password Input */}
            <AuthInput
              label="Senha"
              iconName="lock"
              placeholder="••••••••"
              value={password}
              onChangeText={onPasswordChange}
              isPassword={true}
              isPasswordVisible={isPasswordVisible}
              onTogglePasswordVisibility={onTogglePasswordVisibility}
            />

            {/* Forgot Password */}
            <TouchableOpacity onPress={onForgotPassword} style={styles.forgotPasswordContainer}>
              <Text style={styles.forgotPasswordText}>Esqueci minha senha</Text>
            </TouchableOpacity>

            {/* Login Button */}
            <PrimaryButton 
              title="Entrar"
              isLoading={isLoading}
              onPress={onLogin}
              style={{ marginBottom: 16 }}
            />

            {/* Biometric Button */}
            <TouchableOpacity style={styles.biometricButton} onPress={onBiometricLogin}>
              <MaterialCommunityIcons name="fingerprint" size={20} color="#E0E0E0" style={styles.biometricIcon} />
              <Text style={styles.biometricButtonText}>Entrar com Biometria</Text>
            </TouchableOpacity>
          </Animated.View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Não tem uma conta? </Text>
            <TouchableOpacity onPress={onCreateAccount}>
              <Text style={styles.footerLink}>Criar conta</Text>
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
  card: {
    backgroundColor: '#2A2A2D',
    borderRadius: 16,
    padding: 24,
    marginBottom: 32,
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
  forgotPasswordContainer: {
    alignItems: 'flex-end',
    marginBottom: 24,
  },
  forgotPasswordText: {
    color: '#B0C8FF',
    fontSize: 14,
    fontWeight: '600',
  },
  biometricButton: {
    flexDirection: 'row',
    height: 52,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: 'transparent',
  },
  biometricIcon: {
    marginRight: 8,
  },
  biometricButtonText: {
    color: '#E0E0E0',
    fontSize: 16,
    fontWeight: '600',
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
