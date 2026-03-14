import express from 'express';
import {
  getMenuItems,
  createMenuItem,
  deleteMenuItem,
  updateMenuItem,
  toggleAvailability,
} from '../controllers/menuController';
import { protect, adminOnly, kitchenOnly } from '../middlewares/auth';
import { upload } from '../middlewares/upload';

const router = express.Router();

router.route('/')
  .get(getMenuItems)
  .post(protect, adminOnly, upload.single('image'), createMenuItem);

router.route('/:id')
  .put(protect, adminOnly, upload.single('image'), updateMenuItem)
  .delete(protect, adminOnly, deleteMenuItem);

router.patch('/:id/toggle-availability', protect, kitchenOnly, toggleAvailability);

export default router;
