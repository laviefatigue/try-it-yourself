import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// JWT_SECRET is required - application will not start without it
if (!process.env.JWT_SECRET) {
  throw new Error(
    'FATAL: JWT_SECRET environment variable is not set. ' +
    'Please set JWT_SECRET in your .env file before starting the server.'
  );
}

const JWT_SECRET = process.env.JWT_SECRET;

export interface AuthRequest extends Request {
  userId?: string;
}

export const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'No authentication token provided' });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    req.userId = decoded.userId;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid authentication token' });
  }
};

export const generateToken = (userId: string): string => {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '30d' });
};
