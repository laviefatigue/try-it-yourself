import express from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import User from '../models/User';
import { Expo, ExpoPushMessage } from 'expo-server-sdk';
import twilio from 'twilio';

const router = express.Router();
const expo = new Expo();

// Twilio configuration
const twilioClient = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
  ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  : null;

const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;

// Send push notification
router.post('/push', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { title, body, data } = req.body;

    const user = await User.findById(req.userId);
    if (!user || user.pushTokens.length === 0) {
      return res.status(400).json({ error: 'No push tokens registered for user' });
    }

    if (!user.notificationPreferences.push) {
      return res.status(400).json({ error: 'Push notifications disabled for user' });
    }

    const messages: ExpoPushMessage[] = user.pushTokens
      .filter((token) => Expo.isExpoPushToken(token))
      .map((token) => ({
        to: token,
        sound: 'default',
        title,
        body,
        data,
      }));

    const chunks = expo.chunkPushNotifications(messages);
    const tickets = [];

    for (const chunk of chunks) {
      try {
        const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
        tickets.push(...ticketChunk);
      } catch (error) {
        console.error('Error sending push notification chunk:', error);
      }
    }

    res.json({ success: true, tickets });
  } catch (error) {
    console.error('Send push notification error:', error);
    res.status(500).json({ error: 'Failed to send push notification' });
  }
});

// Send SMS notification
router.post('/sms', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { message } = req.body;

    if (!twilioClient) {
      return res.status(503).json({ error: 'SMS service not configured' });
    }

    const user = await User.findById(req.userId);
    if (!user || !user.phoneNumber) {
      return res.status(400).json({ error: 'No phone number registered for user' });
    }

    if (!user.notificationPreferences.sms) {
      return res.status(400).json({ error: 'SMS notifications disabled for user' });
    }

    const result = await twilioClient.messages.create({
      body: message,
      from: TWILIO_PHONE_NUMBER,
      to: user.phoneNumber,
    });

    res.json({ success: true, messageId: result.sid });
  } catch (error) {
    console.error('Send SMS error:', error);
    res.status(500).json({ error: 'Failed to send SMS' });
  }
});

// Send weather alert (push + SMS if enabled)
router.post('/weather-alert', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { alert } = req.body;

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const results: any = { push: null, sms: null };

    // Send push notification
    if (user.notificationPreferences.push && user.pushTokens.length > 0) {
      const messages: ExpoPushMessage[] = user.pushTokens
        .filter((token) => Expo.isExpoPushToken(token))
        .map((token) => ({
          to: token,
          sound: 'default',
          title: `Weather Alert: ${alert.type}`,
          body: alert.message,
          data: { alert },
          priority: 'high',
        }));

      const chunks = expo.chunkPushNotifications(messages);
      for (const chunk of chunks) {
        try {
          const tickets = await expo.sendPushNotificationsAsync(chunk);
          results.push = { success: true, tickets };
        } catch (error) {
          console.error('Push notification error:', error);
          results.push = { success: false, error: String(error) };
        }
      }
    }

    // Send SMS for critical alerts
    if (
      alert.severity === 'critical' &&
      user.notificationPreferences.sms &&
      user.phoneNumber &&
      twilioClient
    ) {
      try {
        const result = await twilioClient.messages.create({
          body: `CRITICAL WEATHER ALERT: ${alert.message}. ${alert.recommendation || ''}`,
          from: TWILIO_PHONE_NUMBER,
          to: user.phoneNumber,
        });
        results.sms = { success: true, messageId: result.sid };
      } catch (error) {
        console.error('SMS error:', error);
        results.sms = { success: false, error: String(error) };
      }
    }

    res.json({ success: true, results });
  } catch (error) {
    console.error('Send weather alert error:', error);
    res.status(500).json({ error: 'Failed to send weather alert' });
  }
});

export default router;
