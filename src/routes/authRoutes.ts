import express from 'express';
import { authUser, registerUser, getUserProfile, kitchenLogin } from '../controllers/authController';
import { protect } from '../middlewares/auth';

const router = express.Router();

router.post('/login', authUser);
router.post('/kitchen-login', kitchenLogin);
router.post('/register', registerUser);
router.get('/profile', protect, getUserProfile);

export default router;
