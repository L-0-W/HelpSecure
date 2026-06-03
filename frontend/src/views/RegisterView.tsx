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
          <AuthHeaderIcon iconName="account-plus" />

          {/* Titles */}
          <Text style={styles.title}>Criar Conta</Text>
          <Text style={styles.subtitle}>
            Preencha seus dados para começar.
          </Text>

          {/* Form Card */}
          <Animated.View style={[styles.card, { transform: [{ translateX: shakeAnimation }] }]}>
            <ErrorBanner error={error} />

            {/* Name Input */}
            <AuthInput
              label="Nome"
              iconName="user"
              placeholder="Seu nome completo"
              value={name}
              onChangeText={onNameChange}
              autoCapitalize="words"
            />

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

            {/* Register Button */}
            <PrimaryButton 
              title="Cadastrar"
              isLoading={isLoading}
              onPress={onRegister}
              style={{ marginTop: 8 }}
            />
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
