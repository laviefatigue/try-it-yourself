// Navigation tracking and recommendation service

import {
  SailingData,
  Waypoint,
  Route,
  NavigationRecommendation,
  SailingMode,
  TideData,
  WindForecast,
  GPSCoordinates,
} from '../types/sailing';
import {
  calculateDistance,
  calculateBearing,
  calculateETA,
  recommendSailConfiguration,
  calculateCourseWithTide,
} from '../utils/sailingCalculations';

const WAYPOINT_ARRIVAL_THRESHOLD = 0.1; // nautical miles (approximately 185 meters)

export class NavigationService {
  private currentRoute: Route | null = null;
  private currentWaypointIndex: number = 0;
  private navigationHistory: SailingData[] = [];
  private maxHistoryLength = 100;

  /**
   * Set the current active route
   */
  setRoute(route: Route) {
    this.currentRoute = route;
    this.currentWaypointIndex = 0;
    this.navigationHistory = [];

    // Reset arrival status for all waypoints
    if (this.currentRoute) {
      this.currentRoute.waypoints.forEach((wp) => {
        wp.arrived = false;
        wp.arrivalTime = undefined;
      });
    }
  }

  /**
   * Get the current active route
   */
  getRoute(): Route | null {
    return this.currentRoute;
  }

  /**
   * Update navigation with current sailing data
   */
  updateNavigation(sailingData: SailingData): {
    arrivedAtWaypoint: boolean;
    waypoint?: Waypoint;
  } {
    // Add to history
    this.navigationHistory.push(sailingData);
    if (this.navigationHistory.length > this.maxHistoryLength) {
      this.navigationHistory.shift();
    }

    // Check if we've arrived at current waypoint
    if (this.currentRoute && this.currentWaypointIndex < this.currentRoute.waypoints.length) {
      const currentWaypoint = this.currentRoute.waypoints[this.currentWaypointIndex];

      if (!currentWaypoint.arrived) {
        const distance = calculateDistance(sailingData.gpsCoordinates, {
          latitude: currentWaypoint.latitude,
          longitude: currentWaypoint.longitude,
        });

        if (distance <= WAYPOINT_ARRIVAL_THRESHOLD) {
          // Arrived at waypoint!
          currentWaypoint.arrived = true;
          currentWaypoint.arrivalTime = new Date();
          this.currentWaypointIndex++;

          return {
            arrivedAtWaypoint: true,
            waypoint: currentWaypoint,
          };
        }
      }
    }

    return { arrivedAtWaypoint: false };
  }

  /**
   * Get navigation recommendation for next waypoint
   */
  async getNavigationRecommendation(
    currentData: SailingData,
    windForecast: WindForecast,
    sailingMode: SailingMode,
    tideData?: TideData
  ): Promise<NavigationRecommendation | null> {
    if (!this.currentRoute || this.currentWaypointIndex >= this.currentRoute.waypoints.length) {
      return null;
    }

    const currentWaypoint =
      this.currentWaypointIndex > 0
        ? this.currentRoute.waypoints[this.currentWaypointIndex - 1]
        : {
            id: 'start',
            name: 'Current Position',
            latitude: currentData.gpsCoordinates.latitude,
            longitude: currentData.gpsCoordinates.longitude,
            order: -1,
          };

    const nextWaypoint = this.currentRoute.waypoints[this.currentWaypointIndex];

    // Calculate distance and bearing to next waypoint
    const distance = calculateDistance(currentData.gpsCoordinates, {
      latitude: nextWaypoint.latitude,
      longitude: nextWaypoint.longitude,
    });

    const bearing = calculateBearing(currentData.gpsCoordinates, {
      latitude: nextWaypoint.latitude,
      longitude: nextWaypoint.longitude,
    });

    // Get sail configuration recommendation based on forecast
    const sailRecommendation = recommendSailConfiguration(
      windForecast.windSpeed,
      this.calculateTrueWindAngle(bearing, windForecast.windDirection),
      sailingMode
    );

    // Calculate recommended heading considering tide
    let recommendedHeading = bearing;
    let estimatedSpeed = sailRecommendation.expectedSpeed;

    if (tideData) {
      const adjustment = calculateCourseWithTide(
        bearing,
        sailRecommendation.expectedSpeed,
        tideData.speed,
        tideData.direction
      );
      recommendedHeading = adjustment.adjustedCourse;
      estimatedSpeed = adjustment.speedOverGround;
    }

    // Calculate ETA
    const eta = calculateETA(distance, estimatedSpeed);

    return {
      currentWaypoint,
      nextWaypoint,
      distance,
      bearing,
      sailConfiguration: sailRecommendation.configuration,
      recommendedHeading,
      estimatedTimeToArrival: eta,
      windForecast,
    };
  }

  /**
   * Calculate true wind angle relative to course
   */
  private calculateTrueWindAngle(courseBearing: number, windDirection: number): number {
    let twa = Math.abs(windDirection - courseBearing);
    if (twa > 180) {
      twa = 360 - twa;
    }
    return twa;
  }

  /**
   * Get current waypoint index
   */
  getCurrentWaypointIndex(): number {
    return this.currentWaypointIndex;
  }

  /**
   * Calculate average speed from history
   */
  getAverageSpeed(minutes: number = 10): number {
    if (this.navigationHistory.length === 0) return 0;

    const now = new Date();
    const cutoffTime = new Date(now.getTime() - minutes * 60 * 1000);

    const recentData = this.navigationHistory.filter(
      (data) => data.timestamp >= cutoffTime && data.boatSpeed
    );

    if (recentData.length === 0) return 0;

    const sum = recentData.reduce((acc, data) => acc + (data.boatSpeed || 0), 0);
    return sum / recentData.length;
  }

  /**
   * Get distance traveled
   */
  getDistanceTraveled(): number {
    if (this.navigationHistory.length < 2) return 0;

    let totalDistance = 0;
    for (let i = 1; i < this.navigationHistory.length; i++) {
      const dist = calculateDistance(
        this.navigationHistory[i - 1].gpsCoordinates,
        this.navigationHistory[i].gpsCoordinates
      );
      totalDistance += dist;
    }

    return totalDistance;
  }

  /**
   * Check if route is complete
   */
  isRouteComplete(): boolean {
    if (!this.currentRoute) return false;
    return this.currentRoute.waypoints.every((wp) => wp.arrived);
  }

  /**
   * Reset navigation
   */
  reset() {
    this.currentRoute = null;
    this.currentWaypointIndex = 0;
    this.navigationHistory = [];
  }
}

// Singleton instance
let navigationServiceInstance: NavigationService | null = null;

export function getNavigationService(): NavigationService {
  if (!navigationServiceInstance) {
    navigationServiceInstance = new NavigationService();
  }
  return navigationServiceInstance;
}
