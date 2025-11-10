// Sailing calculations and recommendations for Lagoon 440

import { SailConfiguration, SailRecommendation, SailingMode, GPSCoordinates } from '../types/sailing';
import { PolarDiagram } from '../types/polar';
import { LAGOON_440_POLAR, getSpeedFromPolar, findOptimalVMG } from '../data/lagoon440Polar';

/**
 * Calculate apparent wind angle from true wind
 *
 * Apparent wind is the wind experienced on the boat, which is the vector sum
 * of the true wind and the boat's motion through the water.
 *
 * @param trueWindAngle - True wind angle in degrees (0-360)
 * @param trueWindSpeed - True wind speed in knots
 * @param boatSpeed - Boat speed in knots
 * @param boatHeading - Boat heading in degrees (0-360) - currently not used but kept for API compatibility
 * @returns Apparent wind angle in degrees (0-360)
 */
export function calculateApparentWindAngle(
  trueWindAngle: number,
  trueWindSpeed: number,
  boatSpeed: number,
  boatHeading: number
): number {
  // Convert TWA to radians
  const twaRad = (trueWindAngle * Math.PI) / 180;

  // Calculate apparent wind components using vector addition
  // True wind components (in boat reference frame)
  const trueWindX = trueWindSpeed * Math.sin(twaRad);
  const trueWindY = trueWindSpeed * Math.cos(twaRad);

  // Boat motion creates opposite wind (headwind)
  const boatWindX = 0;
  const boatWindY = -boatSpeed;

  // Apparent wind is the vector sum
  const apparentWindX = trueWindX + boatWindX;
  const apparentWindY = trueWindY + boatWindY;

  // Calculate apparent wind angle
  let apparentWindAngle = Math.atan2(apparentWindX, apparentWindY) * (180 / Math.PI);

  // Normalize to 0-360 range
  if (apparentWindAngle < 0) {
    apparentWindAngle += 360;
  }

  return apparentWindAngle;
}

/**
 * Calculate apparent wind speed
 *
 * @param trueWindAngle - True wind angle in degrees (0-360)
 * @param trueWindSpeed - True wind speed in knots
 * @param boatSpeed - Boat speed in knots
 * @returns Apparent wind speed in knots
 */
export function calculateApparentWindSpeed(
  trueWindAngle: number,
  trueWindSpeed: number,
  boatSpeed: number
): number {
  // Convert TWA to radians
  const twaRad = (trueWindAngle * Math.PI) / 180;

  // Calculate using law of cosines
  const apparentWindSpeed = Math.sqrt(
    trueWindSpeed * trueWindSpeed +
    boatSpeed * boatSpeed -
    2 * trueWindSpeed * boatSpeed * Math.cos(twaRad)
  );

  return apparentWindSpeed;
}

/**
 * Get the appropriate sail configuration name based on conditions
 */
function getSailConfigName(
  windSpeed: number,
  trueWindAngle: number,
  sailingMode: SailingMode,
  config: SailConfiguration
): string {
  if (config.stormJib) return 'Storm Jib + Reefed Main';
  if (config.codeZero) return 'Code Zero';
  if (config.spinnaker) return 'Main + Spinnaker';
  if (config.asymmetrical) return 'Main + Asymmetrical';

  // Default to Main + Jib
  return 'Main + Jib';
}

/**
 * Recommend sail configuration based on wind conditions
 * Uses comprehensive Lagoon 440 polar diagram
 */
export function recommendSailConfiguration(
  windSpeed: number,
  trueWindAngle: number,
  sailingMode: SailingMode,
  customPolar?: PolarDiagram
): SailRecommendation {
  const polar = customPolar || LAGOON_440_POLAR;
  const config: SailConfiguration = {
    mainSail: false,
    jib: false,
    asymmetrical: false,
    spinnaker: false,
    codeZero: false,
    stormJib: false,
  };

  let description = '';
  let speedMultiplier = 1.0;

  // Storm conditions (>35 knots)
  if (windSpeed > 35) {
    config.mainSail = true;
    config.stormJib = true;
    description = 'Storm conditions: Deep reefed main + storm jib';
    speedMultiplier = 0.6;
  }
  // Heavy wind (25-35 knots)
  else if (windSpeed > 25) {
    config.mainSail = true;
    if (trueWindAngle < 90) {
      config.jib = true;
      description = 'Heavy wind upwind: Reefed main + reefed jib';
      speedMultiplier = 0.8;
    } else {
      config.jib = true;
      description = 'Heavy wind downwind: Reefed main + jib';
      speedMultiplier = 0.85;
    }
  }
  // Moderate to strong wind (15-25 knots)
  else if (windSpeed > 15) {
    config.mainSail = true;
    if (trueWindAngle < 60) {
      // Close hauled
      config.jib = true;
      description = 'Close hauled: Full main + jib';
      speedMultiplier = 1.0;
    } else if (trueWindAngle < 90) {
      // Close reach
      config.jib = true;
      description = 'Close reach: Full main + jib';
      speedMultiplier = 1.0;
    } else if (trueWindAngle < 120) {
      // Beam reach
      config.jib = true;
      description = 'Beam reach: Full main + jib';
      speedMultiplier = 1.0;
    } else if (trueWindAngle < 150) {
      // Broad reach
      if (sailingMode === SailingMode.SPEED) {
        config.asymmetrical = true;
        description = 'Broad reach: Asymmetrical spinnaker';
        speedMultiplier = 1.15;
      } else {
        config.mainSail = true;
        config.jib = true;
        description = 'Broad reach: Main + jib (comfort mode)';
        speedMultiplier = 0.95;
      }
    } else {
      // Running
      if (sailingMode === SailingMode.SPEED) {
        config.spinnaker = true;
        description = 'Running: Spinnaker';
        speedMultiplier = 1.1;
      } else {
        config.mainSail = true;
        config.jib = true;
        description = 'Running: Wing-on-wing main + jib';
        speedMultiplier = 0.9;
      }
    }
  }
  // Light to moderate wind (8-15 knots)
  else if (windSpeed > 8) {
    config.mainSail = true;
    if (trueWindAngle < 90) {
      config.jib = true;
      description = 'Moderate upwind: Full main + jib';
      speedMultiplier = 1.0;
    } else if (trueWindAngle < 120) {
      config.jib = true;
      description = 'Moderate reaching: Full main + jib';
      speedMultiplier = 1.0;
    } else {
      if (sailingMode === SailingMode.SPEED) {
        config.asymmetrical = true;
        description = 'Moderate downwind: Asymmetrical spinnaker';
        speedMultiplier = 1.2;
      } else {
        config.jib = true;
        description = 'Moderate downwind: Main + jib';
        speedMultiplier = 0.95;
      }
    }
  }
  // Light wind (4-8 knots)
  else if (windSpeed > 4) {
    if (trueWindAngle < 90) {
      config.mainSail = true;
      config.jib = true;
      description = 'Light wind upwind: Full main + jib';
      speedMultiplier = 1.0;
    } else {
      if (sailingMode === SailingMode.SPEED) {
        config.codeZero = true;
        description = 'Light wind downwind: Code Zero';
        speedMultiplier = 1.25;
      } else {
        config.mainSail = true;
        config.jib = true;
        description = 'Light wind downwind: Full main + jib';
        speedMultiplier = 1.0;
      }
    }
  }
  // Very light wind (<4 knots)
  else {
    config.codeZero = true;
    description = 'Very light wind: Code Zero only';
    speedMultiplier = 1.2;
  }

  // Calculate expected speed using polar diagram
  const sailConfigName = getSailConfigName(windSpeed, trueWindAngle, sailingMode, config);
  const baseSpeed = getSpeedFromPolar(polar, windSpeed, trueWindAngle, sailConfigName);
  const expectedSpeed = baseSpeed * speedMultiplier;

  return {
    configuration: config,
    expectedSpeed: Math.round(expectedSpeed * 10) / 10,
    description,
    confidence: windSpeed > 4 ? 85 : 65,
  };
}

/**
 * Get optimal sailing angles for current conditions
 */
export function getOptimalAngles(
  windSpeed: number,
  sailConfig?: string,
  customPolar?: PolarDiagram
): {
  upwind: { twa: number; speed: number; vmg: number };
  downwind: { twa: number; speed: number; vmg: number };
} {
  const polar = customPolar || LAGOON_440_POLAR;
  return findOptimalVMG(polar, windSpeed, sailConfig);
}

/**
 * Calculate distance between two GPS coordinates (Haversine formula)
 * Returns distance in nautical miles
 */
export function calculateDistance(
  point1: GPSCoordinates,
  point2: GPSCoordinates
): number {
  const R = 3440.065; // Earth's radius in nautical miles
  const lat1 = (point1.latitude * Math.PI) / 180;
  const lat2 = (point2.latitude * Math.PI) / 180;
  const deltaLat = ((point2.latitude - point1.latitude) * Math.PI) / 180;
  const deltaLon = ((point2.longitude - point1.longitude) * Math.PI) / 180;

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Calculate bearing between two GPS coordinates
 * Returns bearing in degrees (0-360)
 */
export function calculateBearing(
  point1: GPSCoordinates,
  point2: GPSCoordinates
): number {
  const lat1 = (point1.latitude * Math.PI) / 180;
  const lat2 = (point2.latitude * Math.PI) / 180;
  const deltaLon = ((point2.longitude - point1.longitude) * Math.PI) / 180;

  const y = Math.sin(deltaLon) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLon);
  const bearing = (Math.atan2(y, x) * 180) / Math.PI;

  return (bearing + 360) % 360;
}

/**
 * Calculate estimated time to arrival
 * Returns time in minutes
 */
export function calculateETA(
  distance: number,
  speed: number
): number {
  if (speed <= 0) return 0;
  return (distance / speed) * 60;
}

/**
 * Adjust course for tide/current
 */
export function calculateCourseWithTide(
  desiredCourse: number,
  boatSpeed: number,
  tideSpeed: number,
  tideDirection: number
): { adjustedCourse: number; speedOverGround: number } {
  // Simplified calculation - convert to vectors and add
  const boatVectorX = boatSpeed * Math.sin((desiredCourse * Math.PI) / 180);
  const boatVectorY = boatSpeed * Math.cos((desiredCourse * Math.PI) / 180);

  const tideVectorX = tideSpeed * Math.sin((tideDirection * Math.PI) / 180);
  const tideVectorY = tideSpeed * Math.cos((tideDirection * Math.PI) / 180);

  const resultX = boatVectorX + tideVectorX;
  const resultY = boatVectorY + tideVectorY;

  const speedOverGround = Math.sqrt(resultX * resultX + resultY * resultY);
  let adjustedCourse = (Math.atan2(resultX, resultY) * 180) / Math.PI;
  if (adjustedCourse < 0) adjustedCourse += 360;

  return { adjustedCourse, speedOverGround };
}
