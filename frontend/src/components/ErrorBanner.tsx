import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';

interface ErrorBannerProps {
  error: string | null;
}

export const ErrorBanner: React.FC<ErrorBannerProps> = ({ error }) => {
  if (!error) return null;

  return (
    <View style={styles.errorContainer}>
      <Feather name="alert-circle" size={18} color="#FF5252" />
      <Text style={styles.errorText}>{error}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
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
});
