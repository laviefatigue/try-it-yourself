import express from 'express';
import bcrypt from 'bcryptjs';
import { body, validationResult } from 'express-validator';
import rateLimit from 'express-rate-limit';
import User from '../models/User';
import { generateToken, authMiddleware, AuthRequest } from '../middleware/auth';

const router = express.Router();

// Rate limiters to prevent brute force attacks
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: {
    error: 'Too many authentication attempts. Please try again after 15 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Limit each IP to 3 registration attempts per hour
  message: {
    error: 'Too many registration attempts. Please try again after 1 hour.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Register
router.post(
  '/register',
  registerLimiter,
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }),
    body('name').trim().isLength({ min: 1 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { email, password, name, phoneNumber } = req.body;

      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ error: 'Email already registered' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const user = new User({
        email,
        password: hashedPassword,
        name,
        phoneNumber,
      });

      await user.save();

      const token = generateToken(user._id.toString());

      res.status(201).json({
        token,
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
        },
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ error: 'Registration failed' });
    }
  }
);

// Login
router.post(
  '/login',
  authLimiter,
  [body('email').isEmail().normalizeEmail(), body('password').exists()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { email, password } = req.body;

      const user = await User.findOne({ email });
      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const token = generateToken(user._id.toString());

      res.json({
        token,
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
        },
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Login failed' });
    }
  }
);

// Get user profile
router.get('/profile', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const user = await User.findById(req.userId).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Update user profile
router.put('/profile', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { name, phoneNumber, notificationPreferences, weatherMonitoringConfig } = req.body;

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (name) user.name = name;
    if (phoneNumber !== undefined) user.phoneNumber = phoneNumber;
    if (notificationPreferences) user.notificationPreferences = notificationPreferences;
    if (weatherMonitoringConfig) user.weatherMonitoringConfig = weatherMonitoringConfig;

    await user.save();

    res.json({
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        phoneNumber: user.phoneNumber,
        notificationPreferences: user.notificationPreferences,
        weatherMonitoringConfig: user.weatherMonitoringConfig,
      },
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Register push token
router.post('/push-token', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Push token is required' });
    }

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!user.pushTokens.includes(token)) {
      user.pushTokens.push(token);
      await user.save();
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Push token registration error:', error);
    res.status(500).json({ error: 'Failed to register push token' });
  }
});

export default router;
