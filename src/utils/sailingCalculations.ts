// Sailing calculations and recommendations for Lagoon 440

import { SailConfiguration, SailRecommendation, SailingMode, GPSCoordinates } from '../types/sailing';

/**
 * Lagoon 440 Polar Diagram Data
 * Speed in knots based on wind speed and angle
 * This is simplified data - real polar diagrams would have more data points
 */
const LAGOON_440_POLARS: { [windSpeed: number]: { [angle: number]: number } } = {
  6: { 40: 4.2, 52: 5.1, 60: 5.4, 75: 5.6, 90: 5.5, 110: 5.2, 120: 4.9, 135: 4.5, 150: 4.0 },
  8: { 40: 5.1, 52: 6.0, 60: 6.4, 75: 6.7, 90: 6.6, 110: 6.3, 120: 6.0, 135: 5.5, 150: 5.0 },
  10: { 40: 5.8, 52: 6.7, 60: 7.2, 75: 7.6, 90: 7.5, 110: 7.2, 120: 6.9, 135: 6.4, 150: 5.8 },
  12: { 40: 6.3, 52: 7.3, 60: 7.9, 75: 8.4, 90: 8.3, 110: 8.0, 120: 7.6, 135: 7.1, 150: 6.5 },
  14: { 40: 6.7, 52: 7.8, 60: 8.5, 75: 9.0, 90: 8.9, 110: 8.6, 120: 8.2, 135: 7.7, 150: 7.0 },
  16: { 40: 7.0, 52: 8.2, 60: 8.9, 75: 9.5, 90: 9.4, 110: 9.1, 120: 8.7, 135: 8.1, 150: 7.4 },
  20: { 40: 7.4, 52: 8.7, 60: 9.5, 75: 10.2, 90: 10.1, 110: 9.8, 120: 9.3, 135: 8.7, 150: 8.0 },
  25: { 40: 7.7, 52: 9.1, 60: 10.0, 75: 10.7, 90: 10.6, 110: 10.3, 120: 9.8, 135: 9.2, 150: 8.4 },
};

/**
 * Calculate apparent wind angle from true wind
 */
export function calculateApparentWindAngle(
  trueWindAngle: number,
  trueWindSpeed: number,
  boatSpeed: number,
  boatHeading: number
): number {
  // Simplified calculation - in reality this is more complex
  const twa = trueWindAngle;
  return twa;
}

/**
 * Get boat speed from polar diagram
 */
function getSpeedFromPolar(windSpeed: number, windAngle: number): number {
  // Find closest wind speed in polar data
  const windSpeeds = Object.keys(LAGOON_440_POLARS).map(Number);
  let closestWindSpeed = windSpeeds[0];
  let minDiff = Math.abs(windSpeed - closestWindSpeed);

  for (const ws of windSpeeds) {
    const diff = Math.abs(windSpeed - ws);
    if (diff < minDiff) {
      minDiff = diff;
      closestWindSpeed = ws;
    }
  }

  // Find closest angle
  const polar = LAGOON_440_POLARS[closestWindSpeed];
  const angles = Object.keys(polar).map(Number);
  let closestAngle = angles[0];
  minDiff = Math.abs(windAngle - closestAngle);

  for (const angle of angles) {
    const diff = Math.abs(windAngle - angle);
    if (diff < minDiff) {
      minDiff = diff;
      closestAngle = angle;
    }
  }

  return polar[closestAngle];
}

/**
 * Recommend sail configuration based on wind conditions
 */
export function recommendSailConfiguration(
  windSpeed: number,
  trueWindAngle: number,
  sailingMode: SailingMode
): SailRecommendation {
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

  // Calculate expected speed
  const baseSpeed = getSpeedFromPolar(windSpeed, trueWindAngle);
  const expectedSpeed = baseSpeed * speedMultiplier;

  return {
    configuration: config,
    expectedSpeed: Math.round(expectedSpeed * 10) / 10,
    description,
    confidence: windSpeed > 4 ? 85 : 65,
  };
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
