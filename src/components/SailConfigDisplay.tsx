import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SailConfiguration } from '../types/sailing';

interface SailConfigDisplayProps {
  configuration: SailConfiguration;
  expectedSpeed: number;
  description: string;
}

const SailConfigDisplay: React.FC<SailConfigDisplayProps> = React.memo(({
  configuration,
  expectedSpeed,
  description,
}) => {
  const activeSails = [];
  if (configuration.mainSail) activeSails.push('Main Sail');
  if (configuration.jib) activeSails.push('Jib');
  if (configuration.asymmetrical) activeSails.push('Asymmetrical');
  if (configuration.spinnaker) activeSails.push('Spinnaker');
  if (configuration.codeZero) activeSails.push('Code Zero');
  if (configuration.stormJib) activeSails.push('Storm Jib');

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Recommended Sail Configuration</Text>
      <View style={styles.sailList}>
        {activeSails.map((sail, index) => (
          <View key={index} style={styles.sailBadge}>
            <Text style={styles.sailText}>{sail}</Text>
          </View>
        ))}
      </View>
      <Text style={styles.description}>{description}</Text>
      <View style={styles.speedContainer}>
        <Text style={styles.speedLabel}>Expected Speed:</Text>
        <Text style={styles.speedValue}>{expectedSpeed.toFixed(1)} kts</Text>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F5F5F5',
    padding: 16,
    borderRadius: 8,
    marginVertical: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  sailList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  sailBadge: {
    backgroundColor: '#0066CC',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  sailText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    fontStyle: 'italic',
  },
  speedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  speedLabel: {
    fontSize: 14,
    color: '#666',
    marginRight: 8,
  },
  speedValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0066CC',
  },
});

export default SailConfigDisplay;
