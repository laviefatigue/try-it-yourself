// Input validation utilities

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validate wind speed (in knots)
 */
export function validateWindSpeed(value: string | number): ValidationResult {
  const num = typeof value === 'string' ? parseFloat(value) : value;

  if (isNaN(num)) {
    return { valid: false, error: 'Wind speed must be a valid number' };
  }

  if (num < 0) {
    return { valid: false, error: 'Wind speed cannot be negative' };
  }

  if (num > 100) {
    return { valid: false, error: 'Wind speed cannot exceed 100 knots' };
  }

  return { valid: true };
}

/**
 * Validate True Wind Angle (in degrees)
 */
export function validateTWA(value: string | number): ValidationResult {
  const num = typeof value === 'string' ? parseFloat(value) : value;

  if (isNaN(num)) {
    return { valid: false, error: 'TWA must be a valid number' };
  }

  if (num < 0) {
    return { valid: false, error: 'TWA cannot be negative' };
  }

  if (num > 360) {
    return { valid: false, error: 'TWA cannot exceed 360 degrees' };
  }

  return { valid: true };
}

/**
 * Validate boat speed (in knots)
 */
export function validateBoatSpeed(value: string | number): ValidationResult {
  const num = typeof value === 'string' ? parseFloat(value) : value;

  if (isNaN(num)) {
    return { valid: false, error: 'Boat speed must be a valid number' };
  }

  if (num < 0) {
    return { valid: false, error: 'Boat speed cannot be negative' };
  }

  if (num > 50) {
    return { valid: false, error: 'Boat speed cannot exceed 50 knots' };
  }

  return { valid: true };
}

/**
 * Validate latitude (in degrees)
 */
export function validateLatitude(value: string | number): ValidationResult {
  const num = typeof value === 'string' ? parseFloat(value) : value;

  if (isNaN(num)) {
    return { valid: false, error: 'Latitude must be a valid number' };
  }

  if (num < -90 || num > 90) {
    return { valid: false, error: 'Latitude must be between -90 and 90 degrees' };
  }

  return { valid: true };
}

/**
 * Validate longitude (in degrees)
 */
export function validateLongitude(value: string | number): ValidationResult {
  const num = typeof value === 'string' ? parseFloat(value) : value;

  if (isNaN(num)) {
    return { valid: false, error: 'Longitude must be a valid number' };
  }

  if (num < -180 || num > 180) {
    return { valid: false, error: 'Longitude must be between -180 and 180 degrees' };
  }

  return { valid: true };
}

/**
 * Validate heading (in degrees)
 */
export function validateHeading(value: string | number): ValidationResult {
  const num = typeof value === 'string' ? parseFloat(value) : value;

  if (isNaN(num)) {
    return { valid: false, error: 'Heading must be a valid number' };
  }

  if (num < 0) {
    return { valid: false, error: 'Heading cannot be negative' };
  }

  if (num > 360) {
    return { valid: false, error: 'Heading cannot exceed 360 degrees' };
  }

  return { valid: true };
}

/**
 * Validate wave height (in meters)
 */
export function validateWaveHeight(value: string | number): ValidationResult {
  const num = typeof value === 'string' ? parseFloat(value) : value;

  if (isNaN(num)) {
    return { valid: false, error: 'Wave height must be a valid number' };
  }

  if (num < 0) {
    return { valid: false, error: 'Wave height cannot be negative' };
  }

  if (num > 30) {
    return { valid: false, error: 'Wave height cannot exceed 30 meters' };
  }

  return { valid: true };
}

/**
 * Validate tide speed (in knots)
 */
export function validateTideSpeed(value: string | number): ValidationResult {
  const num = typeof value === 'string' ? parseFloat(value) : value;

  if (isNaN(num)) {
    return { valid: false, error: 'Tide speed must be a valid number' };
  }

  if (num < 0) {
    return { valid: false, error: 'Tide speed cannot be negative' };
  }

  if (num > 10) {
    return { valid: false, error: 'Tide speed cannot exceed 10 knots' };
  }

  return { valid: true };
}

/**
 * Sanitize numeric input string
 * Removes invalid characters and ensures proper format
 */
export function sanitizeNumericInput(value: string): string {
  // Allow digits, decimal point, and minus sign at the start
  return value.replace(/[^\d.-]/g, '').replace(/(?!^)-/g, '').replace(/(\..*)\./g, '$1');
}
