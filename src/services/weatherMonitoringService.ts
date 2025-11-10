// Weather monitoring service for route tracking

import {
  Route,
  Waypoint,
  WindForecast,
  GPSCoordinates,
  SailingData,
} from '../types/sailing';
import { getWindyService } from './windyService';
import { calculateDistance, calculateBearing } from '../utils/sailingCalculations';
import { sendWeatherAlert } from './notificationApi';

export interface MonitoringConfig {
  intervalHours: number; // Check weather every X hours
  forecastDays: number; // Look ahead X days
  maxWindSpeed: number; // Alert if wind exceeds this (knots)
  maxWaveHeight: number; // Alert if waves exceed this (meters)
  avoidStorms: boolean; // Avoid storm systems
  ensureDaytimeArrival: boolean; // Try to arrive in daylight
  notifyViaPush: boolean;
  notifyViaSMS: boolean;
  phoneNumber?: string;
}

export interface WeatherAlert {
  id: string;
  timestamp: Date;
  type: 'storm' | 'high_wind' | 'high_waves' | 'squall' | 'daytime_arrival';
  severity: 'low' | 'medium' | 'high' | 'critical';
  location: GPSCoordinates;
  distance: number; // nautical miles from current position
  message: string;
  recommendation?: string;
  alternativeRoute?: Waypoint[];
}

export interface WeatherHistory {
  id: string;
  timestamp: Date;
  location: GPSCoordinates;
  forecast: WindForecast;
  actualConditions?: SailingData;
}

export class WeatherMonitoringService {
  private config: MonitoringConfig;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private weatherHistory: WeatherHistory[] = [];
  private alerts: WeatherAlert[] = [];
  private currentRoute: Route | null = null;
  private currentPosition: GPSCoordinates | null = null;

  constructor(config: MonitoringConfig) {
    this.config = config;
  }

  /**
   * Update monitoring configuration
   */
  updateConfig(config: Partial<MonitoringConfig>) {
    this.config = { ...this.config, ...config };
  }

  /**
   * Start monitoring weather along the route
   */
  startMonitoring(route: Route, currentPosition: GPSCoordinates) {
    this.currentRoute = route;
    this.currentPosition = currentPosition;

    // Clear existing interval
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    // Initial check
    this.performWeatherCheck();

    // Set up periodic checks
    const intervalMs = this.config.intervalHours * 60 * 60 * 1000;
    this.monitoringInterval = setInterval(() => {
      this.performWeatherCheck();
    }, intervalMs);
  }

  /**
   * Stop monitoring
   */
  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }

  /**
   * Perform weather check along route
   */
  private async performWeatherCheck() {
    if (!this.currentRoute || !this.currentPosition) {
      return;
    }

    const windyService = getWindyService();
    const newAlerts: WeatherAlert[] = [];

    // Check current position
    await this.checkLocationWeather(this.currentPosition, 0, newAlerts);

    // Check each waypoint
    for (const waypoint of this.currentRoute.waypoints) {
      if (!waypoint.arrived) {
        const distance = calculateDistance(this.currentPosition, {
          latitude: waypoint.latitude,
          longitude: waypoint.longitude,
        });

        await this.checkLocationWeather(
          { latitude: waypoint.latitude, longitude: waypoint.longitude },
          distance,
          newAlerts
        );
      }
    }

    // Check intermediate points along route (every 50nm)
    await this.checkIntermediatePoints(newAlerts);

    // Check daytime arrival constraint
    if (this.config.ensureDaytimeArrival) {
      this.checkDaytimeArrival(newAlerts);
    }

    // Update alerts
    this.alerts = newAlerts;

    // Send notifications if configured
    if (newAlerts.length > 0) {
      this.sendNotifications(newAlerts);
    }
  }

  /**
   * Check weather at a specific location
   */
  private async checkLocationWeather(
    location: GPSCoordinates,
    distance: number,
    alerts: WeatherAlert[]
  ) {
    const windyService = getWindyService();

    try {
      const result = await windyService.getWindForecast(location, this.config.forecastDays * 24);

      if (result.error) {
        console.error('Weather check error:', result.error);
        return;
      }

      // Add to history
      this.weatherHistory.push({
        id: `hist-${Date.now()}-${Math.random()}`,
        timestamp: new Date(),
        location,
        forecast: result.forecasts[0],
      });

      // Analyze forecasts for alerts
      for (const forecast of result.forecasts) {
        // High wind alert
        if (forecast.windSpeed > this.config.maxWindSpeed) {
          alerts.push({
            id: `alert-${Date.now()}-${Math.random()}`,
            timestamp: new Date(),
            type: 'high_wind',
            severity: this.getSeverity(forecast.windSpeed, this.config.maxWindSpeed),
            location,
            distance,
            message: `High wind forecast: ${forecast.windSpeed} kts at ${location.latitude.toFixed(
              2
            )}, ${location.longitude.toFixed(2)}`,
            recommendation: 'Consider delaying departure or altering course',
          });
        }

        // High waves alert
        if (forecast.waveHeight > this.config.maxWaveHeight) {
          alerts.push({
            id: `alert-${Date.now()}-${Math.random()}`,
            timestamp: new Date(),
            type: 'high_waves',
            severity: this.getSeverity(forecast.waveHeight, this.config.maxWaveHeight),
            location,
            distance,
            message: `High waves forecast: ${forecast.waveHeight}m at ${location.latitude.toFixed(
              2
            )}, ${location.longitude.toFixed(2)}`,
            recommendation: 'Seek shelter or wait for conditions to improve',
          });
        }

        // Storm detection (wind > 40 kts)
        if (this.config.avoidStorms && forecast.windSpeed > 40) {
          alerts.push({
            id: `alert-${Date.now()}-${Math.random()}`,
            timestamp: new Date(),
            type: 'storm',
            severity: 'critical',
            location,
            distance,
            message: `Storm system detected: ${forecast.windSpeed} kts winds, ${
              forecast.waveHeight
            }m waves at ${location.latitude.toFixed(2)}, ${location.longitude.toFixed(2)}`,
            recommendation: 'AVOID THIS AREA. Seek alternative route or safe harbor.',
          });
        }

        // Squall detection (high gust differential)
        const gustDiff = forecast.gustSpeed - forecast.windSpeed;
        if (gustDiff > 15) {
          alerts.push({
            id: `alert-${Date.now()}-${Math.random()}`,
            timestamp: new Date(),
            type: 'squall',
            severity: 'high',
            location,
            distance,
            message: `Squall activity detected: Gusts up to ${
              forecast.gustSpeed
            } kts at ${location.latitude.toFixed(2)}, ${location.longitude.toFixed(2)}`,
            recommendation: 'Prepare for sudden wind shifts and increased wind speed',
          });
        }
      }
    } catch (error) {
      console.error('Error checking location weather:', error);
    }
  }

  /**
   * Check intermediate points along route
   */
  private async checkIntermediatePoints(alerts: WeatherAlert[]) {
    if (!this.currentRoute || !this.currentPosition) return;

    const unvisitedWaypoints = this.currentRoute.waypoints.filter((wp) => !wp.arrived);
    if (unvisitedWaypoints.length === 0) return;

    const nextWaypoint = unvisitedWaypoints[0];
    const totalDistance = calculateDistance(this.currentPosition, {
      latitude: nextWaypoint.latitude,
      longitude: nextWaypoint.longitude,
    });

    // Check every 50nm
    const checkInterval = 50; // nautical miles
    const numChecks = Math.floor(totalDistance / checkInterval);

    for (let i = 1; i <= numChecks; i++) {
      const fraction = (i * checkInterval) / totalDistance;
      const lat =
        this.currentPosition.latitude +
        (nextWaypoint.latitude - this.currentPosition.latitude) * fraction;
      const lon =
        this.currentPosition.longitude +
        (nextWaypoint.longitude - this.currentPosition.longitude) * fraction;

      await this.checkLocationWeather({ latitude: lat, longitude: lon }, i * checkInterval, alerts);
    }
  }

  /**
   * Check if arrival will be in daytime
   */
  private checkDaytimeArrival(alerts: WeatherAlert[]) {
    if (!this.currentRoute || !this.currentPosition) return;

    const unvisitedWaypoints = this.currentRoute.waypoints.filter((wp) => !wp.arrived);
    if (unvisitedWaypoints.length === 0) return;

    const finalWaypoint = unvisitedWaypoints[unvisitedWaypoints.length - 1];

    // Estimate arrival time (simplified - would need actual speed estimates)
    const distance = calculateDistance(this.currentPosition, {
      latitude: finalWaypoint.latitude,
      longitude: finalWaypoint.longitude,
    });

    const averageSpeed = 6; // knots (conservative estimate)
    const hoursToArrival = distance / averageSpeed;
    const arrivalTime = new Date(Date.now() + hoursToArrival * 60 * 60 * 1000);

    const arrivalHour = arrivalTime.getHours();

    // Check if arrival is between 6 AM and 6 PM
    if (arrivalHour < 6 || arrivalHour >= 18) {
      alerts.push({
        id: `alert-${Date.now()}-${Math.random()}`,
        timestamp: new Date(),
        type: 'daytime_arrival',
        severity: 'medium',
        location: { latitude: finalWaypoint.latitude, longitude: finalWaypoint.longitude },
        distance,
        message: `Estimated arrival at ${arrivalTime.toLocaleString()} is outside daylight hours`,
        recommendation:
          'Consider adjusting speed or departure time to arrive between 6 AM and 6 PM',
      });
    }
  }

  /**
   * Determine alert severity
   */
  private getSeverity(value: number, threshold: number): 'low' | 'medium' | 'high' | 'critical' {
    const ratio = value / threshold;
    if (ratio >= 2.0) return 'critical';
    if (ratio >= 1.5) return 'high';
    if (ratio >= 1.2) return 'medium';
    return 'low';
  }

  /**
   * Send notifications for alerts
   */
  private sendNotifications(alerts: WeatherAlert[]) {
    for (const alert of alerts) {
      if (this.config.notifyViaPush) {
        this.sendPushNotification(alert);
      }
      if (this.config.notifyViaSMS && this.config.phoneNumber) {
        this.sendSMSNotification(alert);
      }
    }
  }

  /**
   * Send push notification via backend API
   */
  private async sendPushNotification(alert: WeatherAlert) {
    try {
      const result = await sendWeatherAlert(alert);
      if (!result.success) {
        console.error('Failed to send push notification:', result.error);
      }
    } catch (error) {
      console.error('Error sending push notification:', error);
    }
  }

  /**
   * Send SMS notification via backend API
   */
  private async sendSMSNotification(alert: WeatherAlert) {
    try {
      // SMS is sent automatically by backend for critical alerts via sendWeatherAlert
      const result = await sendWeatherAlert(alert);
      if (!result.success) {
        console.error('Failed to send SMS notification:', result.error);
      }
    } catch (error) {
      console.error('Error sending SMS notification:', error);
    }
  }

  /**
   * Get current alerts
   */
  getAlerts(): WeatherAlert[] {
    return this.alerts;
  }

  /**
   * Get weather history
   */
  getWeatherHistory(limit?: number): WeatherHistory[] {
    const history = [...this.weatherHistory].sort(
      (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
    );
    return limit ? history.slice(0, limit) : history;
  }

  /**
   * Clear weather history
   */
  clearHistory() {
    this.weatherHistory = [];
  }

  /**
   * Update current position
   */
  updatePosition(position: GPSCoordinates) {
    this.currentPosition = position;
  }

  /**
   * Record actual conditions for comparison with forecast
   */
  recordActualConditions(sailingData: SailingData) {
    if (this.weatherHistory.length > 0) {
      const recent = this.weatherHistory[this.weatherHistory.length - 1];
      if (!recent.actualConditions) {
        recent.actualConditions = sailingData;
      }
    }
  }
}

// Singleton instance
let weatherMonitoringServiceInstance: WeatherMonitoringService | null = null;

export function getWeatherMonitoringService(config?: MonitoringConfig): WeatherMonitoringService {
  if (!weatherMonitoringServiceInstance || config) {
    weatherMonitoringServiceInstance = new WeatherMonitoringService(
      config || {
        intervalHours: 6,
        forecastDays: 3,
        maxWindSpeed: 25,
        maxWaveHeight: 3,
        avoidStorms: true,
        ensureDaytimeArrival: true,
        notifyViaPush: true,
        notifyViaSMS: false,
      }
    );
  }
  return weatherMonitoringServiceInstance;
}
