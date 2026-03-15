import express from 'express';
import {
  getUsers,
  createUser,
  updateUser,
  deleteUser,
  toggleUserStatus
} from '../controllers/userController';
import { protect, adminOnly } from '../middlewares/auth';

const router = express.Router();

// All user management routes are protected and admin only
router.use(protect);
router.use(adminOnly);

router.route('/')
  .get(getUsers)
  .post(createUser);

router.route('/:id')
  .put(updateUser)
  .delete(deleteUser);

router.patch('/:id/toggle-status', toggleUserStatus);

export default router;
