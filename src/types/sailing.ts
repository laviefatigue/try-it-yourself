// Types for Lagoon 440 Sailing Application

export interface GPSCoordinates {
  latitude: number;
  longitude: number;
}

export interface SailingData {
  gpsCoordinates: GPSCoordinates;
  heading: number; // degrees (0-360)
  windSpeed: number; // knots
  trueWindAngle: number; // degrees (0-360)
  boatHeading: number; // degrees (0-360)
  boatSpeed?: number; // knots
  timestamp: Date;
}

export interface TideData {
  speed: number; // knots
  direction: number; // degrees (0-360)
}

export interface WindForecast {
  timestamp: Date;
  windSpeed: number; // knots
  windDirection: number; // degrees
  gustSpeed: number; // knots
  waveHeight: number; // meters
}

export interface SailConfiguration {
  mainSail: boolean;
  jib: boolean;
  asymmetrical: boolean;
  spinnaker: boolean;
  codeZero: boolean;
  stormJib: boolean;
}

export interface SailRecommendation {
  configuration: SailConfiguration;
  expectedSpeed: number; // knots
  description: string;
  confidence: number; // 0-100
}

export enum SailingMode {
  SPEED = 'speed',
  COMFORT = 'comfort'
}

export interface Waypoint {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  order: number;
  arrived?: boolean;
  arrivalTime?: Date;
}

export interface Route {
  id: string;
  name: string;
  waypoints: Waypoint[];
  createdAt: Date;
  updatedAt: Date;
}

export interface NavigationRecommendation {
  currentWaypoint: Waypoint;
  nextWaypoint: Waypoint;
  distance: number; // nautical miles
  bearing: number; // degrees
  sailConfiguration: SailConfiguration;
  recommendedHeading: number; // degrees
  estimatedTimeToArrival: number; // minutes
  windForecast: WindForecast;
}
