// Polar diagram import/export utilities

import { PolarDiagram } from '../types/polar';
import * as FileSystem from 'expo-file-system';

/**
 * Export polar diagram to JSON format
 */
export async function exportPolarToJSON(polar: PolarDiagram): Promise<string> {
  try {
    const jsonString = JSON.stringify(polar, null, 2);
    const fileName = `${polar.name.replace(/\s+/g, '_')}_polar_${Date.now()}.json`;
    const filePath = `${FileSystem.documentDirectory}${fileName}`;

    await FileSystem.writeAsStringAsync(filePath, jsonString);
    return filePath;
  } catch (error) {
    throw new Error(`Failed to export polar diagram: ${error.message}`);
  }
}

/**
 * Import polar diagram from JSON string
 */
export function importPolarFromJSON(jsonString: string): PolarDiagram {
  try {
    const polar = JSON.parse(jsonString) as PolarDiagram;

    // Validate required fields
    if (!polar.name || !polar.boatType || !polar.polarData) {
      throw new Error('Invalid polar diagram format: missing required fields');
    }

    // Convert date strings to Date objects
    if (polar.createdAt && typeof polar.createdAt === 'string') {
      polar.createdAt = new Date(polar.createdAt);
    }
    if (polar.updatedAt && typeof polar.updatedAt === 'string') {
      polar.updatedAt = new Date(polar.updatedAt);
    }

    return polar;
  } catch (error) {
    throw new Error(`Failed to import polar diagram: ${error.message}`);
  }
}

/**
 * Export polar diagram to CSV format (simplified)
 * Exports one sail configuration at a time
 */
export async function exportPolarToCSV(
  polar: PolarDiagram,
  sailConfigIndex: number = 0
): Promise<string> {
  try {
    const sailConfig = polar.polarData[sailConfigIndex];
    if (!sailConfig) {
      throw new Error('Invalid sail configuration index');
    }

    let csv = `Polar Diagram: ${polar.name}\n`;
    csv += `Boat: ${polar.boatType} - ${polar.boatModel}\n`;
    csv += `Sail Configuration: ${sailConfig.sailConfig}\n`;
    csv += `\n`;

    // Header row with wind speeds
    const windSpeeds = sailConfig.curves.map((c) => c.tws);
    csv += `TWA,${windSpeeds.join(',')}\n`;

    // Get all unique TWA values
    const allTWAs = new Set<number>();
    sailConfig.curves.forEach((curve) => {
      curve.points.forEach((point) => allTWAs.add(point.twa));
    });
    const sortedTWAs = Array.from(allTWAs).sort((a, b) => a - b);

    // Data rows
    for (const twa of sortedTWAs) {
      const row = [twa.toString()];
      for (const curve of sailConfig.curves) {
        const point = curve.points.find((p) => p.twa === twa);
        row.push(point ? point.speed.toFixed(2) : '');
      }
      csv += row.join(',') + '\n';
    }

    const fileName = `${polar.name.replace(/\s+/g, '_')}_${sailConfig.sailConfig.replace(
      /\s+/g,
      '_'
    )}_polar_${Date.now()}.csv`;
    const filePath = `${FileSystem.documentDirectory}${fileName}`;

    await FileSystem.writeAsStringAsync(filePath, csv);
    return filePath;
  } catch (error) {
    throw new Error(`Failed to export polar to CSV: ${error.message}`);
  }
}

/**
 * Validate polar diagram data
 */
export function validatePolar(polar: PolarDiagram): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check required fields
  if (!polar.name || polar.name.trim() === '') {
    errors.push('Polar diagram must have a name');
  }
  if (!polar.boatType || polar.boatType.trim() === '') {
    errors.push('Boat type is required');
  }
  if (!polar.boatModel || polar.boatModel.trim() === '') {
    errors.push('Boat model is required');
  }

  // Check dimensions
  if (polar.length <= 0) {
    errors.push('Length must be greater than 0');
  }
  if (polar.beam <= 0) {
    errors.push('Beam must be greater than 0');
  }
  if (polar.displacement <= 0) {
    errors.push('Displacement must be greater than 0');
  }

  // Check sail area
  if (!polar.sailArea || polar.sailArea.main <= 0 || polar.sailArea.jib <= 0) {
    errors.push('Main sail and jib areas must be greater than 0');
  }

  // Check polar data
  if (!polar.polarData || polar.polarData.length === 0) {
    errors.push('At least one sail configuration is required');
  } else {
    polar.polarData.forEach((config, i) => {
      if (!config.sailConfig || config.sailConfig.trim() === '') {
        errors.push(`Sail configuration ${i + 1} must have a name`);
      }
      if (!config.curves || config.curves.length === 0) {
        errors.push(`Sail configuration "${config.sailConfig}" must have at least one curve`);
      }
      config.curves.forEach((curve, j) => {
        if (!curve.points || curve.points.length === 0) {
          errors.push(
            `Curve ${j + 1} in "${config.sailConfig}" must have at least one data point`
          );
        }
      });
    });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Merge multiple polar diagrams (for different sail configurations)
 */
export function mergePolarDiagrams(
  basePolar: PolarDiagram,
  additionalPolars: PolarDiagram[]
): PolarDiagram {
  const merged = { ...basePolar };

  // Add polar data from additional diagrams
  additionalPolars.forEach((polar) => {
    polar.polarData.forEach((config) => {
      // Check if this sail config already exists
      const existing = merged.polarData.find((c) => c.sailConfig === config.sailConfig);
      if (!existing) {
        merged.polarData.push(config);
      }
    });
  });

  merged.updatedAt = new Date();
  return merged;
}

/**
 * Create sample polar diagram for testing
 */
export function createSamplePolar(): PolarDiagram {
  return {
    id: `sample-${Date.now()}`,
    name: 'Sample Catamaran',
    boatType: 'Catamaran',
    boatModel: 'Generic 40ft',
    description: 'Sample polar diagram for testing',
    length: 12.2,
    beam: 6.8,
    displacement: 10.0,
    sailArea: {
      main: 45,
      jib: 40,
      spinnaker: 90,
    },
    polarData: [
      {
        sailConfig: 'Main + Jib',
        description: 'Standard configuration',
        windRange: { min: 6, max: 25 },
        curves: [
          {
            tws: 10,
            points: [
              { twa: 45, speed: 5.5, vmg: 3.9 },
              { twa: 60, speed: 6.5, vmg: 3.3 },
              { twa: 90, speed: 7.0, vmg: 0 },
              { twa: 120, speed: 6.5, vmg: -3.3 },
              { twa: 150, speed: 5.5, vmg: -4.8 },
            ],
          },
        ],
      },
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
    isDefault: false,
  };
}
