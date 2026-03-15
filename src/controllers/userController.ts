import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { User } from '../models/User';
import { emitUserUpdate } from '../utils/socket';

// @desc    Get all users
// @route   GET /api/users
// @access  Private/Admin
export const getUsers = async (req: Request, res: Response) => {
  try {
    const users = await User.find({}).select('-passwordHash');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching users' });
  }
};

// @desc    Create a new user
// @route   POST /api/users
// @access  Private/Admin
export const createUser = async (req: Request, res: Response) => {
  try {
    const { name, email, password, role, pin } = req.body;

    if (role === 'admin') {
      return res.status(400).json({ message: 'Additional administrator accounts cannot be created.' });
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password || 'password123', salt);

    const user = await User.create({
      name,
      email,
      passwordHash,
      role: role || 'staff',
      pin,
      status: 'active',
      isActive: true
    });

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      isActive: user.isActive,
      pin: user.pin
    });
  } catch (error: any) {
    res.status(400).json({ message: error.message || 'Error creating user' });
  }
};

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private/Admin
export const updateUser = async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.params.id);

    if (user) {
      user.name = req.body.name || user.name;
      user.email = req.body.email || user.email;
      user.role = req.body.role || user.role;
      user.status = req.body.status || user.status;
      user.isActive = req.body.isActive !== undefined ? req.body.isActive : user.isActive;
      user.pin = req.body.pin || user.pin;

      if (req.body.password) {
        const salt = await bcrypt.genSalt(10);
        user.passwordHash = await bcrypt.hash(req.body.password, salt);
      }

      const updatedUser = await user.save();
      
      // If user became blocked, notify them to logout immediately
      if (updatedUser.status === 'blocked' || updatedUser.isActive === false) {
        emitUserUpdate(String(updatedUser._id), { status: 'blocked', isActive: false });
      }

      res.json({
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        status: updatedUser.status,
        isActive: updatedUser.isActive,
        pin: updatedUser.pin
      });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(400).json({ message: 'Error updating user' });
  }
};

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private/Admin
export const deleteUser = async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.params.id);

    if (user) {
      if (user.role === 'admin') {
        return res.status(400).json({ message: 'Administrator accounts cannot be deleted.' });
      }
      await user.deleteOne();
      res.json({ message: 'User removed' });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error deleting user' });
  }
};

// @desc    Toggle user status (block/unblock)
// @route   PATCH /api/users/:id/toggle-status
// @access  Private/Admin
export const toggleUserStatus = async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.params.id);

    if (user) {
      if (user.role === 'admin') {
        return res.status(400).json({ message: 'Administrator accounts cannot be blocked.' });
      }
      user.status = user.status === 'active' ? 'blocked' : 'active';
      user.isActive = user.status === 'active';
      const updatedUser = await user.save();

      // Notify user of status change (Force Logout if blocked)
      emitUserUpdate(String(updatedUser._id), { status: updatedUser.status, isActive: updatedUser.isActive });

      res.json({
        _id: updatedUser._id,
        name: updatedUser.name,
        status: updatedUser.status,
        isActive: updatedUser.isActive
      });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(400).json({ message: 'Error toggling user status' });
  }
};
