import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'react-native';
import SailingScreen from './src/screens/SailingScreen';
import RouteScreen from './src/screens/RouteScreen';

const Tab = createBottomTabNavigator();

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" />
      <NavigationContainer>
        <Tab.Navigator
          screenOptions={{
            tabBarActiveTintColor: '#0066CC',
            tabBarInactiveTintColor: '#666',
            headerStyle: {
              backgroundColor: '#0066CC',
            },
            headerTintColor: '#fff',
            headerTitleStyle: {
              fontWeight: 'bold',
            },
          }}
        >
          <Tab.Screen
            name="Sailing"
            component={SailingScreen}
            options={{
              title: 'Lagoon 440 Sailing',
              tabBarLabel: 'Sailing',
            }}
          />
          <Tab.Screen
            name="Route"
            component={RouteScreen}
            options={{
              title: 'Route Management',
              tabBarLabel: 'Route',
            }}
          />
        </Tab.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
