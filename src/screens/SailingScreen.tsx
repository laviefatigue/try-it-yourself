import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  Alert,
} from 'react-native';
import * as Location from 'expo-location';
import {
  SailingData,
  SailingMode,
  TideData,
  WindForecast,
  GPSCoordinates,
} from '../types/sailing';
import { recommendSailConfiguration } from '../utils/sailingCalculations';
import { getWindyService } from '../services/windyService';
import { getNavigationService } from '../services/navigationService';
import SailConfigDisplay from '../components/SailConfigDisplay';
import ErrorPanel from '../components/ErrorPanel';
import {
  validateWindSpeed,
  validateTWA,
  validateBoatSpeed,
  validateHeading,
  validateTideSpeed,
  sanitizeNumericInput,
} from '../utils/validation';

const SailingScreen: React.FC = () => {
  // GPS and sensor data
  const [gpsCoordinates, setGpsCoordinates] = useState<GPSCoordinates>({
    latitude: 0,
    longitude: 0,
  });
  const [heading, setHeading] = useState<string>('0');
  const [windSpeed, setWindSpeed] = useState<string>('10');
  const [trueWindAngle, setTrueWindAngle] = useState<string>('90');
  const [boatHeading, setBoatHeading] = useState<string>('0');
  const [boatSpeed, setBoatSpeed] = useState<string>('0');

  // Tide data
  const [tideSpeed, setTideSpeed] = useState<string>('0');
  const [tideDirection, setTideDirection] = useState<string>('0');

  // Sailing mode
  const [sailingMode, setSailingMode] = useState<SailingMode>(SailingMode.COMFORT);

  // Wind forecast
  const [windForecast, setWindForecast] = useState<WindForecast | null>(null);
  const [loadingForecast, setLoadingForecast] = useState(false);

  // Navigation
  const [navigationRecommendation, setNavigationRecommendation] = useState<any>(null);

  // Error handling
  const [error, setError] = useState<string | null>(null);

  // Location tracking
  const [locationEnabled, setLocationEnabled] = useState(false);

  useEffect(() => {
    requestLocationPermission();
  }, []);

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        setLocationEnabled(true);
        getCurrentLocation();
      } else {
        setError('Location permission denied. Please enable location access in settings.');
      }
    } catch (err) {
      setError('Failed to request location permission');
    }
  };

  const getCurrentLocation = async () => {
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      setGpsCoordinates({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      if (location.coords.heading !== null) {
        setHeading(location.coords.heading.toFixed(0));
        setBoatHeading(location.coords.heading.toFixed(0));
      }

      if (location.coords.speed !== null) {
        // Convert m/s to knots
        const speedKnots = location.coords.speed * 1.94384;
        setBoatSpeed(speedKnots.toFixed(1));
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(`Failed to get location: ${errorMessage}`);
    }
  };

  const fetchWindForecast = async () => {
    if (!gpsCoordinates.latitude || !gpsCoordinates.longitude) {
      setError('Please set GPS coordinates first');
      return;
    }

    setLoadingForecast(true);
    setError(null);

    try {
      const windyService = getWindyService();
      const result = await windyService.getCurrentConditions(gpsCoordinates);

      if (result.error) {
        setError(result.error);
      } else if (result.forecast) {
        setWindForecast(result.forecast);
        // Update wind speed and direction inputs
        setWindSpeed(result.forecast.windSpeed.toFixed(1));
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(`Failed to fetch wind forecast: ${errorMessage}`);
    } finally {
      setLoadingForecast(false);
    }
  };

  // Validated input handlers
  const handleWindSpeedChange = (value: string) => {
    const sanitized = sanitizeNumericInput(value);
    setWindSpeed(sanitized);

    if (sanitized) {
      const validation = validateWindSpeed(sanitized);
      if (!validation.valid) {
        setError(validation.error || null);
      }
    }
  };

  const handleTWAChange = (value: string) => {
    const sanitized = sanitizeNumericInput(value);
    setTrueWindAngle(sanitized);

    if (sanitized) {
      const validation = validateTWA(sanitized);
      if (!validation.valid) {
        setError(validation.error || null);
      }
    }
  };

  const handleBoatHeadingChange = (value: string) => {
    const sanitized = sanitizeNumericInput(value);
    setBoatHeading(sanitized);

    if (sanitized) {
      const validation = validateHeading(sanitized);
      if (!validation.valid) {
        setError(validation.error || null);
      }
    }
  };

  const handleBoatSpeedChange = (value: string) => {
    const sanitized = sanitizeNumericInput(value);
    setBoatSpeed(sanitized);

    if (sanitized) {
      const validation = validateBoatSpeed(sanitized);
      if (!validation.valid) {
        setError(validation.error || null);
      }
    }
  };

  const handleTideSpeedChange = (value: string) => {
    const sanitized = sanitizeNumericInput(value);
    setTideSpeed(sanitized);

    if (sanitized) {
      const validation = validateTideSpeed(sanitized);
      if (!validation.valid) {
        setError(validation.error || null);
      }
    }
  };

  const handleTideDirectionChange = (value: string) => {
    const sanitized = sanitizeNumericInput(value);
    setTideDirection(sanitized);

    if (sanitized) {
      const validation = validateHeading(sanitized);
      if (!validation.valid) {
        setError(validation.error || null);
      }
    }
  };

  const calculateRecommendation = () => {
    const ws = parseFloat(windSpeed);
    const twa = parseFloat(trueWindAngle);

    // Validate inputs before calculation
    if (!windSpeed || !trueWindAngle) {
      setError('Please enter wind speed and angle');
      return;
    }

    const wsValidation = validateWindSpeed(ws);
    if (!wsValidation.valid) {
      setError(wsValidation.error || 'Invalid wind speed');
      return;
    }

    const twaValidation = validateTWA(twa);
    if (!twaValidation.valid) {
      setError(twaValidation.error || 'Invalid TWA');
      return;
    }

    try {
      const recommendation = recommendSailConfiguration(ws, twa, sailingMode);

      // Check if we have an active route
      const navService = getNavigationService();
      const route = navService.getRoute();

      if (route && windForecast) {
        const sailingData: SailingData = {
          gpsCoordinates,
          heading: parseFloat(heading),
          windSpeed: ws,
          trueWindAngle: twa,
          boatHeading: parseFloat(boatHeading),
          boatSpeed: parseFloat(boatSpeed),
          timestamp: new Date(),
        };

        const tideData: TideData = {
          speed: parseFloat(tideSpeed),
          direction: parseFloat(tideDirection),
        };

        navService.updateNavigation(sailingData);
        navService
          .getNavigationRecommendation(sailingData, windForecast, sailingMode, tideData)
          .then((navRec) => {
            setNavigationRecommendation(navRec);
          });
      }

      return recommendation;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(`Calculation error: ${errorMessage}`);
      return null;
    }
  };

  const recommendation = calculateRecommendation();

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* GPS Coordinates */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>GPS Coordinates</Text>
          <View style={styles.row}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Latitude</Text>
              <TextInput
                style={styles.input}
                value={gpsCoordinates.latitude.toFixed(6)}
                editable={false}
                placeholder="0.000000"
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Longitude</Text>
              <TextInput
                style={styles.input}
                value={gpsCoordinates.longitude.toFixed(6)}
                editable={false}
                placeholder="0.000000"
              />
            </View>
          </View>
          <TouchableOpacity
            style={styles.button}
            onPress={getCurrentLocation}
            disabled={!locationEnabled}
          >
            <Text style={styles.buttonText}>
              {locationEnabled ? 'Update Location' : 'Location Disabled'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Wind Data */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Wind Data</Text>
          <View style={styles.row}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Wind Speed (kts)</Text>
              <TextInput
                style={styles.input}
                value={windSpeed}
                onChangeText={handleWindSpeedChange}
                keyboardType="numeric"
                placeholder="10"
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>True Wind Angle (°)</Text>
              <TextInput
                style={styles.input}
                value={trueWindAngle}
                onChangeText={handleTWAChange}
                keyboardType="numeric"
                placeholder="90"
              />
            </View>
          </View>
          <TouchableOpacity
            style={[styles.button, styles.buttonSecondary]}
            onPress={fetchWindForecast}
            disabled={loadingForecast}
          >
            {loadingForecast ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>Get Wind Forecast from Windy.com</Text>
            )}
          </TouchableOpacity>
          {windForecast && (
            <View style={styles.forecastBox}>
              <Text style={styles.forecastText}>
                Wind: {windForecast.windSpeed} kts @ {windForecast.windDirection}°
              </Text>
              <Text style={styles.forecastText}>
                Gusts: {windForecast.gustSpeed} kts
              </Text>
              <Text style={styles.forecastText}>
                Wave Height: {windForecast.waveHeight} m
              </Text>
            </View>
          )}
        </View>

        {/* Boat Data */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Boat Data</Text>
          <View style={styles.row}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Boat Heading (°)</Text>
              <TextInput
                style={styles.input}
                value={boatHeading}
                onChangeText={handleBoatHeadingChange}
                keyboardType="numeric"
                placeholder="0"
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Boat Speed (kts)</Text>
              <TextInput
                style={styles.input}
                value={boatSpeed}
                onChangeText={handleBoatSpeedChange}
                keyboardType="numeric"
                placeholder="0"
              />
            </View>
          </View>
        </View>

        {/* Tide Data */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tide/Current Data</Text>
          <View style={styles.row}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Tide Speed (kts)</Text>
              <TextInput
                style={styles.input}
                value={tideSpeed}
                onChangeText={handleTideSpeedChange}
                keyboardType="numeric"
                placeholder="0"
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Tide Direction (°)</Text>
              <TextInput
                style={styles.input}
                value={tideDirection}
                onChangeText={handleTideDirectionChange}
                keyboardType="numeric"
                placeholder="0"
              />
            </View>
          </View>
        </View>

        {/* Sailing Mode */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sailing Mode</Text>
          <View style={styles.modeSelector}>
            <Text style={styles.modeLabel}>Comfort</Text>
            <Switch
              value={sailingMode === SailingMode.SPEED}
              onValueChange={(value) =>
                setSailingMode(value ? SailingMode.SPEED : SailingMode.COMFORT)
              }
              trackColor={{ false: '#81C784', true: '#FF9800' }}
              thumbColor="#FFFFFF"
            />
            <Text style={styles.modeLabel}>Speed</Text>
          </View>
        </View>

        {/* Sail Recommendation */}
        {recommendation && (
          <SailConfigDisplay
            configuration={recommendation.configuration}
            expectedSpeed={recommendation.expectedSpeed}
            description={recommendation.description}
          />
        )}

        {/* Navigation Recommendation */}
        {navigationRecommendation && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Navigation to Next Waypoint</Text>
            <View style={styles.navBox}>
              <Text style={styles.navText}>
                Next: {navigationRecommendation.nextWaypoint.name}
              </Text>
              <Text style={styles.navText}>
                Distance: {navigationRecommendation.distance.toFixed(2)} nm
              </Text>
              <Text style={styles.navText}>
                Bearing: {navigationRecommendation.bearing.toFixed(0)}°
              </Text>
              <Text style={styles.navText}>
                Recommended Heading: {navigationRecommendation.recommendedHeading.toFixed(0)}°
              </Text>
              <Text style={styles.navText}>
                ETA: {Math.floor(navigationRecommendation.estimatedTimeToArrival / 60)}h{' '}
                {Math.round(navigationRecommendation.estimatedTimeToArrival % 60)}m
              </Text>
            </View>
          </View>
        )}

        {/* Bottom padding for error panel */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Error Panel */}
      <ErrorPanel error={error} onDismiss={() => setError(null)} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  inputGroup: {
    flex: 1,
    marginHorizontal: 4,
  },
  label: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 4,
    padding: 10,
    fontSize: 14,
    backgroundColor: '#FFFFFF',
  },
  button: {
    backgroundColor: '#0066CC',
    padding: 12,
    borderRadius: 4,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonSecondary: {
    backgroundColor: '#FF9800',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  forecastBox: {
    backgroundColor: '#E3F2FD',
    padding: 12,
    borderRadius: 4,
    marginTop: 12,
  },
  forecastText: {
    fontSize: 14,
    color: '#0066CC',
    marginBottom: 4,
  },
  modeSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
  },
  modeLabel: {
    fontSize: 16,
    color: '#333',
    marginHorizontal: 12,
  },
  navBox: {
    backgroundColor: '#FFF3E0',
    padding: 12,
    borderRadius: 4,
  },
  navText: {
    fontSize: 14,
    color: '#E65100',
    marginBottom: 4,
  },
});

export default SailingScreen;
