import express from 'express';
import {
  createOrder,
  updateOrder,
  getOrders,
  getOrderById,
  updateOrderStatus,
  getOrdersByTable,
} from '../controllers/orderController';
import { protect, kitchenOnly } from '../middlewares/auth';

const router = express.Router();

router.route('/')
  .post(createOrder)     // Public (Customer app creates order)
  .get(protect, getOrders); // Protected (Kitchen, Admin fetches orders)

router.get('/table/:tableNumber', getOrdersByTable); // Public: fetch orders for a specific table

router.route('/:id')
  .get(getOrderById)
  .put(updateOrder);    // Allow customers to update their order

router.route('/:id/status')
  .patch(protect, updateOrderStatus); // Both admin and kitchen can update status

export default router;
