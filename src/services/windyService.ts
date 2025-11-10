// Windy.com API integration service

import axios from 'axios';
import { WindForecast, GPSCoordinates } from '../types/sailing';

/**
 * Note: Windy.com API requires an API key
 * Users need to register at https://api.windy.com/api-key
 * and add their key to the app configuration
 */

const WINDY_API_BASE_URL = 'https://api.windy.com/api';

export interface WindyConfig {
  apiKey: string;
}

export class WindyService {
  private apiKey: string;

  constructor(config: WindyConfig) {
    this.apiKey = config.apiKey;
  }

  /**
   * Fetch wind forecast for a specific location
   */
  async getWindForecast(
    coordinates: GPSCoordinates,
    hours: number = 24
  ): Promise<{ forecasts: WindForecast[]; error?: string }> {
    try {
      if (!this.apiKey || this.apiKey === 'YOUR_WINDY_API_KEY') {
        return {
          forecasts: [],
          error: 'Windy.com API key not configured. Please add your API key in settings.',
        };
      }

      // Windy Point Forecast API
      const response = await axios.post(
        `${WINDY_API_BASE_URL}/point-forecast/v2`,
        {
          lat: coordinates.latitude,
          lon: coordinates.longitude,
          model: 'gfs',
          parameters: ['wind', 'gust', 'waves'],
          levels: ['surface'],
          key: this.apiKey,
        },
        {
          timeout: 10000,
        }
      );

      if (response.data && response.data.ts && response.data['wind_u-surface']) {
        return this.parseWindyResponse(response.data);
      } else {
        return {
          forecasts: [],
          error: 'Invalid response from Windy.com API',
        };
      }
    } catch (error) {
      console.error('Error fetching wind forecast:', error);
      let errorMessage = 'Failed to fetch wind forecast from Windy.com';

      if (error.response) {
        // Server responded with error
        errorMessage = `Windy.com API error: ${error.response.status} - ${
          error.response.data?.error || error.response.statusText
        }`;
      } else if (error.request) {
        // No response received
        errorMessage = 'No response from Windy.com API. Check your internet connection.';
      } else {
        errorMessage = error.message || errorMessage;
      }

      return {
        forecasts: [],
        error: errorMessage,
      };
    }
  }

  /**
   * Parse Windy API response into WindForecast objects
   */
  private parseWindyResponse(data: any): { forecasts: WindForecast[]; error?: string } {
    const forecasts: WindForecast[] = [];

    try {
      const timestamps = data.ts || [];
      const windU = data['wind_u-surface'] || [];
      const windV = data['wind_v-surface'] || [];
      const gust = data['gust-surface'] || [];
      const waveHeight = data['waves-surface'] || [];

      for (let i = 0; i < timestamps.length; i++) {
        const u = windU[i] || 0;
        const v = windV[i] || 0;

        // Calculate wind speed from u and v components (m/s to knots)
        const windSpeedMS = Math.sqrt(u * u + v * v);
        const windSpeedKnots = windSpeedMS * 1.94384;

        // Calculate wind direction from u and v components
        let windDirection = (Math.atan2(u, v) * 180) / Math.PI;
        if (windDirection < 0) windDirection += 360;

        // Gust speed (m/s to knots)
        const gustSpeedKnots = (gust[i] || windSpeedMS) * 1.94384;

        // Wave height (meters)
        const waveHeightMeters = waveHeight[i] || 0;

        forecasts.push({
          timestamp: new Date(timestamps[i]),
          windSpeed: Math.round(windSpeedKnots * 10) / 10,
          windDirection: Math.round(windDirection),
          gustSpeed: Math.round(gustSpeedKnots * 10) / 10,
          waveHeight: Math.round(waveHeightMeters * 10) / 10,
        });
      }

      return { forecasts };
    } catch (error) {
      console.error('Error parsing Windy response:', error);
      return {
        forecasts: [],
        error: 'Failed to parse wind forecast data',
      };
    }
  }

  /**
   * Get current conditions (first forecast point)
   */
  async getCurrentConditions(
    coordinates: GPSCoordinates
  ): Promise<{ forecast?: WindForecast; error?: string }> {
    const result = await this.getWindForecast(coordinates, 3);

    if (result.error) {
      return { error: result.error };
    }

    if (result.forecasts.length > 0) {
      return { forecast: result.forecasts[0] };
    }

    return { error: 'No forecast data available' };
  }
}

// Singleton instance
let windyServiceInstance: WindyService | null = null;

export function getWindyService(apiKey?: string): WindyService {
  if (!windyServiceInstance || apiKey) {
    windyServiceInstance = new WindyService({
      apiKey: apiKey || 'YOUR_WINDY_API_KEY',
    });
  }
  return windyServiceInstance;
}
