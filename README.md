# Lagoon 440 Sailing Application

A comprehensive mobile application designed for Lagoon 440 catamaran sailing, providing sail configuration recommendations, navigation tracking, and route management with real-time wind forecasts.

## Features

### Sailing Tab
- **GPS Integration**: Automatic GPS coordinate tracking
- **Wind Data**:
  - Manual wind speed and true wind angle input
  - Integration with Windy.com API for real-time wind forecasts
  - Wave height information
  - Wind gust data
- **Sail Configuration Recommendations**:
  - Main Sail
  - Jib
  - Asymmetrical Spinnaker
  - Spinnaker
  - Code Zero
  - Storm Jib
- **Speed Calculations**: Based on Lagoon 440 polar diagrams
- **Sailing Modes**: Choose between Speed or Comfort sailing
- **Tide/Current Input**: Enter tide speed and direction for accurate course planning
- **Navigation Recommendations**: Real-time guidance to next waypoint including:
  - Distance to waypoint
  - Bearing and recommended heading
  - Estimated time of arrival
  - Sail configuration changes

### Route Tab
- **Waypoint Management**:
  - Add waypoints manually with latitude/longitude
  - Edit existing waypoints
  - Delete waypoints
  - Reorder waypoints (move up/down)
- **GPX File Support**:
  - Import routes from GPX files
  - Export routes to GPX format
- **Route Activation**: Activate routes for navigation tracking
- **Waypoint Tracking**: Automatic detection of waypoint arrival

## Installation

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- Expo CLI: `npm install -g expo-cli`
- iOS Simulator (Mac) or Android Emulator

### Setup Steps

1. **Clone or download this repository**

2. **Install dependencies**:
```bash
npm install
```

3. **Configure Windy.com API (Optional but Recommended)**:
   - Register for a free API key at https://api.windy.com/api-key
   - Open `src/services/windyService.ts`
   - Replace `'YOUR_WINDY_API_KEY'` with your actual API key

4. **Start the development server**:
```bash
npm start
```

5. **Run on your device**:
   - **iOS**: Press `i` in the terminal or scan QR code with Expo Go app
   - **Android**: Press `a` in the terminal or scan QR code with Expo Go app
   - **Web**: Press `w` in the terminal (limited functionality)

## Usage

### Getting Started with Sailing

1. **Open the Sailing Tab**
2. **Enable Location**: Grant location permissions when prompted
3. **Update Location**: Tap "Update Location" to get current GPS coordinates
4. **Enter Sailing Data**:
   - Wind speed (in knots)
   - True wind angle (0-360 degrees)
   - Boat heading and speed (auto-filled from GPS if available)
5. **Optional - Get Wind Forecast**:
   - Tap "Get Wind Forecast from Windy.com"
   - View wind speed, direction, gusts, and wave height
6. **Optional - Enter Tide Data**:
   - Input tide/current speed and direction
7. **Select Sailing Mode**:
   - Toggle between Comfort and Speed mode
8. **View Recommendations**:
   - See recommended sail configuration
   - View expected speed based on conditions

### Creating and Using Routes

1. **Open the Route Tab**
2. **Create a Route**:
   - Enter a route name
   - Add waypoints manually by tapping "+ Add Waypoint"
   - Or import from a GPX file using "Import GPX"
3. **Manage Waypoints**:
   - Edit: Tap the ✎ icon
   - Delete: Tap the ✕ icon
   - Reorder: Use ↑ and ↓ buttons
4. **Activate Route**:
   - Tap "Activate Route for Navigation"
5. **Navigate**:
   - Switch to Sailing tab
   - View navigation recommendations to next waypoint
   - App automatically tracks waypoint arrivals

### Importing/Exporting GPX Files

**Import GPX**:
1. Tap "Import GPX" in Route tab
2. Select a GPX file from your device
3. Waypoints will be loaded automatically

**Export GPX**:
1. Create or load a route with waypoints
2. Tap "Export GPX"
3. File will be saved to your device's documents directory
4. Share the file using your device's file manager

## Technical Details

### Sail Configuration Logic

The app uses Lagoon 440 polar diagram data to recommend sail configurations based on:
- Wind speed and angle
- Sailing mode (speed vs comfort)
- Sea conditions

**Configuration Rules**:
- **Storm Conditions (>35 kts)**: Deep reefed main + storm jib
- **Heavy Wind (25-35 kts)**: Reefed main + reefed jib
- **Moderate Wind (15-25 kts)**: Full main + jib, asymmetrical/spinnaker downwind
- **Light Wind (8-15 kts)**: Full main + jib, or asymmetrical downwind
- **Very Light Wind (<8 kts)**: Code Zero

### Speed Calculations

Speed estimates are based on:
1. Lagoon 440 polar diagram interpolation
2. Sail configuration adjustments
3. Sailing mode multipliers
4. Tide/current calculations (when provided)

### Navigation Tracking

The app tracks:
- Distance traveled
- Average speed
- Waypoint arrivals (within 0.1 nautical miles)
- Course to next waypoint
- ETA based on current conditions

## Project Structure

```
lagoon440-sailing-app/
├── App.tsx                      # Main app entry point
├── src/
│   ├── screens/
│   │   ├── SailingScreen.tsx   # Main sailing screen
│   │   └── RouteScreen.tsx     # Route management screen
│   ├── components/
│   │   ├── ErrorPanel.tsx      # Error message display
│   │   └── SailConfigDisplay.tsx # Sail configuration display
│   ├── services/
│   │   ├── windyService.ts     # Windy.com API integration
│   │   └── navigationService.ts # Navigation tracking logic
│   ├── utils/
│   │   ├── sailingCalculations.ts # Sailing math and recommendations
│   │   └── gpxHandler.ts       # GPX file parsing and generation
│   └── types/
│       └── sailing.ts          # TypeScript type definitions
├── package.json
├── app.json
└── README.md
```

## Dependencies

- **React Native & Expo**: Mobile app framework
- **expo-location**: GPS and location services
- **expo-sensors**: Device sensors (compass, accelerometer)
- **expo-document-picker**: File selection
- **expo-file-system**: File I/O operations
- **@react-navigation**: Tab navigation
- **axios**: HTTP requests for Windy.com API
- **xml2js**: GPX file parsing

## API Configuration

### Windy.com API

The app integrates with Windy.com for weather forecasts. To configure:

1. Get API key from https://api.windy.com/api-key
2. Edit `src/services/windyService.ts`:
```typescript
export function getWindyService(apiKey?: string): WindyService {
  if (!windyServiceInstance || apiKey) {
    windyServiceInstance = new WindyService({
      apiKey: apiKey || 'YOUR_API_KEY_HERE', // Replace with your key
    });
  }
  return windyServiceInstance;
}
```

**Note**: Without a valid API key, the app will show an error message when attempting to fetch wind forecasts, but all other features will work normally.

## Troubleshooting

### Location Not Working
- Ensure location permissions are granted in device settings
- Check that location services are enabled on your device
- Try restarting the app

### GPX Import Fails
- Ensure the file is valid GPX format (XML)
- Check that the file contains waypoint, route, or track data
- Try a different GPX file

### Wind Forecast Errors
- Verify your Windy.com API key is configured correctly
- Check internet connection
- Ensure GPS coordinates are valid (not 0, 0)

### App Won't Start
- Clear Expo cache: `expo start -c`
- Reinstall dependencies: `rm -rf node_modules && npm install`
- Update Expo: `npm install expo@latest`

## Future Enhancements

Potential features for future versions:
- Map view with route visualization
- Weather routing optimization
- Anchor alarm
- Logbook functionality
- Bluetooth integration with marine instruments
- AIS vessel tracking
- Offline maps and weather data
- Multi-day route planning
- Crew management features

## License

This application is provided as-is for personal use. Ensure compliance with marine safety regulations and always use proper navigation equipment when sailing.

## Disclaimer

This application is intended as a supplementary navigation aid. Always use proper marine navigation equipment, charts, and safety procedures when sailing. The sail recommendations are based on general Lagoon 440 performance data and should be adjusted based on actual boat condition, crew experience, and sea state.

## Support

For issues or questions:
1. Check the Troubleshooting section above
2. Review Expo documentation: https://docs.expo.dev
3. Consult React Native documentation: https://reactnative.dev

## Credits

- Lagoon 440 polar diagram data: Based on published performance specifications
- Wind data: Powered by Windy.com API
- Built with React Native and Expo
