// Notification API service for calling backend notification endpoints

import axios from 'axios';
import { WeatherAlert } from './weatherMonitoringService';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';

// Store auth token (should be set after login)
let authToken: string | null = null;

export function setAuthToken(token: string) {
  authToken = token;
}

export function clearAuthToken() {
  authToken = null;
}

/**
 * Send push notification via backend
 */
export async function sendPushNotification(
  title: string,
  body: string,
  data?: Record<string, unknown>
): Promise<{ success: boolean; error?: string }> {
  if (!authToken) {
    console.warn('No auth token set for push notifications');
    return { success: false, error: 'Not authenticated' };
  }

  try {
    const response = await axios.post(
      `${API_BASE_URL}/notifications/push`,
      { title, body, data },
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      }
    );

    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Failed to send push notification:', errorMessage);
    return { success: false, error: errorMessage };
  }
}

/**
 * Send SMS notification via backend
 */
export async function sendSMSNotification(
  message: string
): Promise<{ success: boolean; error?: string }> {
  if (!authToken) {
    console.warn('No auth token set for SMS notifications');
    return { success: false, error: 'Not authenticated' };
  }

  try {
    const response = await axios.post(
      `${API_BASE_URL}/notifications/sms`,
      { message },
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      }
    );

    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Failed to send SMS notification:', errorMessage);
    return { success: false, error: errorMessage };
  }
}

/**
 * Send weather alert notification (push + SMS for critical)
 */
export async function sendWeatherAlert(
  alert: WeatherAlert
): Promise<{ success: boolean; error?: string }> {
  if (!authToken) {
    console.warn('No auth token set for weather alerts');
    return { success: false, error: 'Not authenticated' };
  }

  try {
    const response = await axios.post(
      `${API_BASE_URL}/notifications/weather-alert`,
      { alert },
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      }
    );

    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Failed to send weather alert:', errorMessage);
    return { success: false, error: errorMessage };
  }
}
