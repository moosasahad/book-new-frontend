import express from 'express';
import {
  createOrder,
  updateOrder,
  getOrders,
  getOrderById,
  updateOrderStatus,
  getOrdersByTable,
  getWaiterOrders,
} from '../controllers/orderController';
import { protect, kitchenOnly, staffOnly } from '../middlewares/auth';

const router = express.Router();

router.route('/')
  .post(protect, createOrder)     // Protected: waiter token attaches name; customers without token still can't call this
  .get(protect, getOrders); // Protected (Kitchen, Admin fetches orders)

router.get('/my-orders', protect, staffOnly, getWaiterOrders); // Waiter's own order history

router.get('/table/:tableNumber', getOrdersByTable); // Public: fetch orders for a specific table

router.route('/:id')
  .get(getOrderById)
  .put(updateOrder);    // Allow customers to update their order

router.route('/:id/status')
  .patch(protect, updateOrderStatus); // Both admin and kitchen can update status

export default router;
