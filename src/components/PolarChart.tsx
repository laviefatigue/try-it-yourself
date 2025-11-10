import React from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { PolarDiagram, PolarCurve } from '../types/polar';
import { getSpeedFromPolar } from '../data/lagoon440Polar';

interface PolarChartProps {
  polar: PolarDiagram;
  windSpeed: number;
  currentTWA?: number;
  currentSpeed?: number;
}

const PolarChart: React.FC<PolarChartProps> = React.memo(({
  polar,
  windSpeed,
  currentTWA,
  currentSpeed,
}) => {
  const screenWidth = Dimensions.get('window').width;
  const chartSize = Math.min(screenWidth - 32, 400);

  // Find the sail configuration for current conditions
  const activeSailConfig = polar.polarData[0]; // Default to first config

  // Find curves around current wind speed
  const curves = activeSailConfig.curves.filter(
    (c) => Math.abs(c.tws - windSpeed) <= 6
  );

  // Render polar diagram as a table (simplified)
  const renderPolarTable = () => {
    const targetCurve = activeSailConfig.curves.find((c) => c.tws === windSpeed) ||
      activeSailConfig.curves[Math.floor(activeSailConfig.curves.length / 2)];

    if (!targetCurve) return null;

    return (
      <View style={styles.tableContainer}>
        <Text style={styles.tableTitle}>
          Polar Data for {windSpeed} kts - {activeSailConfig.sailConfig}
        </Text>
        <View style={styles.tableHeader}>
          <Text style={[styles.tableCell, styles.headerCell]}>TWA (°)</Text>
          <Text style={[styles.tableCell, styles.headerCell]}>Speed (kts)</Text>
          <Text style={[styles.tableCell, styles.headerCell]}>VMG (kts)</Text>
        </View>
        {targetCurve.points.map((point, index) => (
          <View
            key={index}
            style={[
              styles.tableRow,
              currentTWA && Math.abs(point.twa - currentTWA) < 10 && styles.highlightedRow,
            ]}
          >
            <Text style={styles.tableCell}>{point.twa}°</Text>
            <Text style={styles.tableCell}>{point.speed.toFixed(1)}</Text>
            <Text style={styles.tableCell}>
              {point.vmg !== undefined ? point.vmg.toFixed(1) : 'N/A'}
            </Text>
          </View>
        ))}
      </View>
    );
  };

  // Render all sail configurations available
  const renderSailConfigurations = () => {
    return (
      <View style={styles.configContainer}>
        <Text style={styles.sectionTitle}>Available Sail Configurations</Text>
        {polar.polarData.map((config, index) => (
          <View key={index} style={styles.configCard}>
            <Text style={styles.configName}>{config.sailConfig}</Text>
            {config.description && (
              <Text style={styles.configDescription}>{config.description}</Text>
            )}
            <Text style={styles.configRange}>
              Wind Range: {config.windRange.min}-{config.windRange.max} kts
            </Text>
            <Text style={styles.configCurves}>
              {config.curves.length} speed curves available
            </Text>
          </View>
        ))}
      </View>
    );
  };

  // Render boat specifications
  const renderBoatSpecs = () => {
    return (
      <View style={styles.specsContainer}>
        <Text style={styles.sectionTitle}>Boat Specifications</Text>
        <View style={styles.specRow}>
          <Text style={styles.specLabel}>Type:</Text>
          <Text style={styles.specValue}>{polar.boatType}</Text>
        </View>
        <View style={styles.specRow}>
          <Text style={styles.specLabel}>Model:</Text>
          <Text style={styles.specValue}>{polar.boatModel}</Text>
        </View>
        <View style={styles.specRow}>
          <Text style={styles.specLabel}>Length:</Text>
          <Text style={styles.specValue}>{polar.length.toFixed(2)}m</Text>
        </View>
        <View style={styles.specRow}>
          <Text style={styles.specLabel}>Beam:</Text>
          <Text style={styles.specValue}>{polar.beam.toFixed(2)}m</Text>
        </View>
        <View style={styles.specRow}>
          <Text style={styles.specLabel}>Displacement:</Text>
          <Text style={styles.specValue}>{polar.displacement.toFixed(1)} tons</Text>
        </View>
        <View style={styles.specRow}>
          <Text style={styles.specLabel}>Main Sail:</Text>
          <Text style={styles.specValue}>{polar.sailArea.main}m²</Text>
        </View>
        <View style={styles.specRow}>
          <Text style={styles.specLabel}>Jib:</Text>
          <Text style={styles.specValue}>{polar.sailArea.jib}m²</Text>
        </View>
        {polar.sailArea.genoa && (
          <View style={styles.specRow}>
            <Text style={styles.specLabel}>Genoa:</Text>
            <Text style={styles.specValue}>{polar.sailArea.genoa}m²</Text>
          </View>
        )}
        {polar.sailArea.spinnaker && (
          <View style={styles.specRow}>
            <Text style={styles.specLabel}>Spinnaker:</Text>
            <Text style={styles.specValue}>{polar.sailArea.spinnaker}m²</Text>
          </View>
        )}
      </View>
    );
  };

  // Render current performance
  const renderCurrentPerformance = () => {
    if (!currentTWA || !currentSpeed) return null;

    const targetSpeed = getSpeedFromPolar(polar, windSpeed, currentTWA);
    const performance = (currentSpeed / targetSpeed) * 100;

    return (
      <View style={styles.performanceContainer}>
        <Text style={styles.sectionTitle}>Current Performance</Text>
        <View style={styles.performanceGrid}>
          <View style={styles.performanceItem}>
            <Text style={styles.performanceLabel}>Target Speed</Text>
            <Text style={styles.performanceValue}>{targetSpeed.toFixed(1)} kts</Text>
          </View>
          <View style={styles.performanceItem}>
            <Text style={styles.performanceLabel}>Actual Speed</Text>
            <Text style={styles.performanceValue}>{currentSpeed.toFixed(1)} kts</Text>
          </View>
          <View style={styles.performanceItem}>
            <Text style={styles.performanceLabel}>Performance</Text>
            <Text
              style={[
                styles.performanceValue,
                performance >= 90
                  ? styles.goodPerformance
                  : performance >= 75
                  ? styles.fairPerformance
                  : styles.poorPerformance,
              ]}
            >
              {performance.toFixed(0)}%
            </Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{polar.name}</Text>
        {polar.description && <Text style={styles.description}>{polar.description}</Text>}
      </View>

      {renderCurrentPerformance()}
      {renderBoatSpecs()}
      {renderPolarTable()}
      {renderSailConfigurations()}
    </ScrollView>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    padding: 16,
    backgroundColor: '#0066CC',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    color: '#E3F2FD',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  specsContainer: {
    padding: 16,
    backgroundColor: '#F5F5F5',
    marginBottom: 8,
  },
  specRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  specLabel: {
    fontSize: 14,
    color: '#666',
  },
  specValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  tableContainer: {
    padding: 16,
  },
  tableTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#0066CC',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  headerCell: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  highlightedRow: {
    backgroundColor: '#FFFDE7',
  },
  tableCell: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    textAlign: 'center',
  },
  configContainer: {
    padding: 16,
  },
  configCard: {
    backgroundColor: '#F5F5F5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  configName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0066CC',
    marginBottom: 4,
  },
  configDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
    fontStyle: 'italic',
  },
  configRange: {
    fontSize: 12,
    color: '#999',
    marginBottom: 2,
  },
  configCurves: {
    fontSize: 12,
    color: '#999',
  },
  performanceContainer: {
    padding: 16,
    backgroundColor: '#E3F2FD',
  },
  performanceGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  performanceItem: {
    alignItems: 'center',
  },
  performanceLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  performanceValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0066CC',
  },
  goodPerformance: {
    color: '#4CAF50',
  },
  fairPerformance: {
    color: '#FF9800',
  },
  poorPerformance: {
    color: '#F44336',
  },
});

export default PolarChart;
