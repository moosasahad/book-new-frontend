import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes';
import menuRoutes from './routes/menuRoutes';
import orderRoutes from './routes/orderRoutes';
import tableRoutes from './routes/tableRoutes';
import analyticsRoutes from './routes/analyticsRoutes';
import categoryRoutes from './routes/categoryRoutes';
import { notFound, errorHandler } from './middlewares/errorHandler';

dotenv.config();

const app = express();

// Middleware
app.use(express.json());
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000', credentials: true }));
app.use(helmet());
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/tables', tableRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/categories', categoryRoutes);

// General route for health check
app.get('/api', (req, res) => {
  res.json({ message: 'Restaurant POS API is running...' });
});

app.get('/', (req, res) => {
  res.send('Backend Server is Live! Go to /api for endpoints.');
});

// Error Handling
app.use(notFound);
app.use(errorHandler);

export default app;
