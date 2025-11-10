import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import morgan from 'morgan';
import authRoutes from './routes/auth';
import routeRoutes from './routes/routes';
import weatherRoutes from './routes/weather';
import notificationRoutes from './routes/notifications';
import polarRoutes from './routes/polars';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Request logging
if (process.env.NODE_ENV === 'production') {
  // Use combined format for production (Apache style)
  app.use(morgan('combined'));
} else {
  // Use dev format for development (colored, concise)
  app.use(morgan('dev'));
}

// Database connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/lagoon440';

// Track database connection state
let isDbConnected = false;

// Configure mongoose connection options
mongoose.connection.on('connected', () => {
  console.log('✓ Connected to MongoDB');
  isDbConnected = true;
});

mongoose.connection.on('error', (err) => {
  console.error('✗ MongoDB connection error:', err);
  isDbConnected = false;
});

mongoose.connection.on('disconnected', () => {
  console.log('✗ MongoDB disconnected. Attempting to reconnect...');
  isDbConnected = false;
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nShutting down gracefully...');
  await mongoose.connection.close();
  console.log('MongoDB connection closed');
  process.exit(0);
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/routes', routeRoutes);
app.use('/api/weather', weatherRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/polars', polarRoutes);

// Health check with database status
app.get('/health', (req, res) => {
  const dbStatus = mongoose.connection.readyState;
  const dbStates = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };

  res.json({
    status: isDbConnected ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    database: {
      status: dbStates[dbStatus as keyof typeof dbStates] || 'unknown',
      connected: isDbConnected,
    },
  });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start server with database connection
async function startServer() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000, // Timeout after 5 seconds
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
    });

    console.log(`✓ Database connected successfully`);

    app.listen(PORT, () => {
      console.log(`✓ Server is running on port ${PORT}`);
      console.log(`✓ Health check available at http://localhost:${PORT}/health`);
    });
  } catch (error) {
    console.error('✗ Failed to start server:', error);
    console.error('✗ Database connection failed. Server will not start.');
    process.exit(1); // Exit with error code
  }
}

// Start the server
startServer();

export default app;
