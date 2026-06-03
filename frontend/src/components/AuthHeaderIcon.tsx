import React from 'react';
import { View, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface AuthHeaderIconProps {
  iconName: keyof typeof MaterialCommunityIcons.glyphMap;
}

export const AuthHeaderIcon: React.FC<AuthHeaderIconProps> = ({ iconName }) => {
  return (
    <View style={styles.headerIconContainer}>
      <View style={styles.iconBackground}>
        <MaterialCommunityIcons name={iconName} size={50} color="#fff" />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
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
});
