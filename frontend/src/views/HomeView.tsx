import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export function HomeView() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Tela Inicial (Em breve)</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121214',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: '#e1e1e6',
    fontSize: 24,
    fontWeight: 'bold',
  },
});
