import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, TextInputProps } from 'react-native';
import { Feather } from '@expo/vector-icons';

interface AuthInputProps extends TextInputProps {
  label: string;
  iconName: keyof typeof Feather.glyphMap;
  isPassword?: boolean;
  isPasswordVisible?: boolean;
  onTogglePasswordVisibility?: () => void;
}

export const AuthInput: React.FC<AuthInputProps> = ({
  label,
  iconName,
  isPassword = false,
  isPasswordVisible = false,
  onTogglePasswordVisibility,
  ...textInputProps
}) => {
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputContainer}>
        <Feather name={iconName} size={20} color="#8A8A8E" style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          placeholderTextColor="#8A8A8E"
          secureTextEntry={isPassword && !isPasswordVisible}
          {...textInputProps}
        />
        {isPassword && onTogglePasswordVisibility && (
          <TouchableOpacity onPress={onTogglePasswordVisibility} style={styles.eyeIcon}>
            <Feather name={isPasswordVisible ? "eye-off" : "eye"} size={20} color="#8A8A8E" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
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
});
