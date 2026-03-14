import { Request, Response } from 'express';
import { MenuItem } from '../models/MenuItem';

// @desc    Fetch all menu items with optional filtering
// @route   GET /api/menu
// @access  Public
export const getMenuItems = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const { category, search } = req.query;
    
    // Build filter object
    const filter: any = req.query.admin === 'true' ? {} : { isAvailable: true };
    
    if (category && category !== 'all') {
      filter.category = category;
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const total = await MenuItem.countDocuments(filter);
    const items = await MenuItem.find(filter)
      .populate('category')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json({
      items,
      total,
      page,
      limit,
      hasMore: total > skip + items.length
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching menu items' });
  }
};

// @desc    Create a menu item
// @route   POST /api/menu
// @access  Private/Admin
export const createMenuItem = async (req: Request, res: Response) => {
  try {
    if (req.file) {
      req.body.image = (req.file as any).path;
    }

    if (typeof req.body.options === 'string') {
      try { req.body.options = JSON.parse(req.body.options); } catch (e) {}
    }
    if (typeof req.body.isAvailable === 'string') {
      req.body.isAvailable = req.body.isAvailable === 'true';
    }
    if (typeof req.body.isPopular === 'string') {
      req.body.isPopular = req.body.isPopular === 'true';
    }

    const item = new MenuItem(req.body);
    const createdItem = await item.save();
    res.status(201).json(createdItem);
  } catch (error) {
    res.status(400).json({ message: 'Invalid menu item data' });
  }
};

// @desc    Delete a menu item
// @route   DELETE /api/menu/:id
// @access  Private/Admin
export const deleteMenuItem = async (req: Request, res: Response) => {
  try {
    const item = await MenuItem.findById(req.params.id);
    if (item) {
      await item.deleteOne();
      res.json({ message: 'Menu item removed' });
    } else {
      res.status(404).json({ message: 'Menu item not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error deleting item' });
  }
};

// @desc    Update a menu item
// @route   PUT /api/menu/:id
// @access  Private/Admin
export const updateMenuItem = async (req: Request, res: Response) => {
  try {
    if (req.file) {
      req.body.image = (req.file as any).path;
    }

    if (typeof req.body.options === 'string') {
      try { req.body.options = JSON.parse(req.body.options); } catch (e) {}
    }
    if (typeof req.body.isAvailable === 'string') {
      req.body.isAvailable = req.body.isAvailable === 'true';
    }
    if (typeof req.body.isPopular === 'string') {
      req.body.isPopular = req.body.isPopular === 'true';
    }

    const item = await MenuItem.findById(req.params.id);
    if (item) {
      Object.assign(item, req.body);
      const updatedItem = await item.save();
      res.json(updatedItem);
    } else {
      res.status(404).json({ message: 'Menu item not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error updating item' });
  }
};
// @desc    Toggle menu item availability
// @route   PATCH /api/menu/:id/toggle-availability
// @access  Private/Kitchen
export const toggleAvailability = async (req: Request, res: Response) => {
  try {
    const item = await MenuItem.findById(req.params.id);
    if (item) {
      item.isAvailable = !item.isAvailable;
      await item.save();
      res.json({ _id: item._id, name: item.name, isAvailable: item.isAvailable });
    } else {
      res.status(404).json({ message: 'Menu item not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error toggling availability' });
  }
};
