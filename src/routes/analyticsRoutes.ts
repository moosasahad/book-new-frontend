import express from 'express';
import { getAnalytics, getRevenue, getTopItems } from '../controllers/analyticsController';
import { protect, adminOnly } from '../middlewares/auth';

const router = express.Router();

router.route('/')
  .get(protect, adminOnly, getAnalytics);

router.route('/revenue')
  .get(protect, adminOnly, getRevenue);

router.route('/top-items')
  .get(protect, adminOnly, getTopItems);

export default router;
