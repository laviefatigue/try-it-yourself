import express from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import Route from '../models/Route';

const router = express.Router();

// Get all routes for user (with pagination)
router.get('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    // Pagination parameters
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    // Ensure reasonable limits
    const validLimit = Math.min(Math.max(limit, 1), 100);

    const routes = await Route.find({ userId: req.userId })
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(validLimit);

    const total = await Route.countDocuments({ userId: req.userId });

    res.json({
      routes,
      pagination: {
        page,
        limit: validLimit,
        total,
        pages: Math.ceil(total / validLimit),
      },
    });
  } catch (error) {
    console.error('Fetch routes error:', error);
    res.status(500).json({ error: 'Failed to fetch routes' });
  }
});

// Get single route
router.get('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const route = await Route.findOne({ _id: req.params.id, userId: req.userId });
    if (!route) {
      return res.status(404).json({ error: 'Route not found' });
    }

    res.json({ route });
  } catch (error) {
    console.error('Fetch route error:', error);
    res.status(500).json({ error: 'Failed to fetch route' });
  }
});

// Create route
router.post('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { name, waypoints } = req.body;

    const route = new Route({
      userId: req.userId,
      name,
      waypoints,
    });

    await route.save();
    res.status(201).json({ route });
  } catch (error) {
    console.error('Create route error:', error);
    res.status(500).json({ error: 'Failed to create route' });
  }
});

// Update route
router.put('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { name, waypoints, active, completed } = req.body;

    const route = await Route.findOne({ _id: req.params.id, userId: req.userId });
    if (!route) {
      return res.status(404).json({ error: 'Route not found' });
    }

    if (name !== undefined) route.name = name;
    if (waypoints !== undefined) route.waypoints = waypoints;
    if (active !== undefined) route.active = active;
    if (completed !== undefined) route.completed = completed;

    await route.save();
    res.json({ route });
  } catch (error) {
    console.error('Update route error:', error);
    res.status(500).json({ error: 'Failed to update route' });
  }
});

// Delete route
router.delete('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const route = await Route.findOneAndDelete({ _id: req.params.id, userId: req.userId });
    if (!route) {
      return res.status(404).json({ error: 'Route not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Delete route error:', error);
    res.status(500).json({ error: 'Failed to delete route' });
  }
});

// Activate route (set as active, deactivate others)
router.post('/:id/activate', authMiddleware, async (req: AuthRequest, res) => {
  try {
    // Deactivate all routes
    await Route.updateMany({ userId: req.userId }, { active: false });

    // Activate selected route
    const route = await Route.findOne({ _id: req.params.id, userId: req.userId });
    if (!route) {
      return res.status(404).json({ error: 'Route not found' });
    }

    route.active = true;
    await route.save();

    res.json({ route });
  } catch (error) {
    console.error('Activate route error:', error);
    res.status(500).json({ error: 'Failed to activate route' });
  }
});

export default router;
