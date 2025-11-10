import express from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import WeatherHistory from '../models/WeatherHistory';

const router = express.Router();

// Get weather history (with pagination)
router.get('/history', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const query: Record<string, unknown> = { userId: req.userId };

    if (req.query.routeId) {
      query.routeId = req.query.routeId;
    }

    // Pagination parameters
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const skip = (page - 1) * limit;

    // Ensure reasonable limits
    const validLimit = Math.min(Math.max(limit, 1), 100);

    const history = await WeatherHistory.find(query)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(validLimit);

    const total = await WeatherHistory.countDocuments(query);

    res.json({
      history,
      pagination: {
        page,
        limit: validLimit,
        total,
        pages: Math.ceil(total / validLimit),
      },
    });
  } catch (error) {
    console.error('Fetch weather history error:', error);
    res.status(500).json({ error: 'Failed to fetch weather history' });
  }
});

// Save weather data
router.post('/history', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { routeId, timestamp, location, forecast, actualConditions } = req.body;

    const weatherHistory = new WeatherHistory({
      userId: req.userId,
      routeId,
      timestamp,
      location,
      forecast,
      actualConditions,
    });

    await weatherHistory.save();
    res.status(201).json({ weatherHistory });
  } catch (error) {
    console.error('Save weather history error:', error);
    res.status(500).json({ error: 'Failed to save weather history' });
  }
});

// Get weather forecast accuracy (compare forecast vs actual)
router.get('/accuracy', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const history = await WeatherHistory.find({
      userId: req.userId,
      actualConditions: { $exists: true },
    }).limit(50);

    const accuracy = history.map((h) => {
      const windSpeedDiff = Math.abs(h.forecast.windSpeed - (h.actualConditions?.windSpeed || 0));
      const windDirDiff = Math.abs(
        h.forecast.windDirection - (h.actualConditions?.windDirection || 0)
      );

      return {
        timestamp: h.timestamp,
        location: h.location,
        forecast: h.forecast,
        actual: h.actualConditions,
        windSpeedError: windSpeedDiff,
        windDirectionError: windDirDiff,
      };
    });

    const avgWindSpeedError =
      accuracy.reduce((sum, a) => sum + a.windSpeedError, 0) / (accuracy.length || 1);

    res.json({
      accuracy,
      summary: {
        averageWindSpeedError: avgWindSpeedError,
        sampleSize: accuracy.length,
      },
    });
  } catch (error) {
    console.error('Fetch weather accuracy error:', error);
    res.status(500).json({ error: 'Failed to fetch weather accuracy' });
  }
});

// Delete weather history
router.delete('/history', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { routeId } = req.query;

    const query: any = { userId: req.userId };
    if (routeId) {
      query.routeId = routeId;
    }

    await WeatherHistory.deleteMany(query);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete weather history error:', error);
    res.status(500).json({ error: 'Failed to delete weather history' });
  }
});

export default router;
