import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

interface ErrorPanelProps {
  error: string | null;
  onDismiss: () => void;
}

const ErrorPanel: React.FC<ErrorPanelProps> = React.memo(({ error, onDismiss }) => {
  if (!error) return null;

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity onPress={onDismiss} style={styles.dismissButton}>
          <Text style={styles.dismissText}>✕</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FF5252',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#D32F2F',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  errorText: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14,
    marginRight: 12,
  },
  dismissButton: {
    padding: 4,
  },
  dismissText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
});

export default ErrorPanel;
