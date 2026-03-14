import { Request, Response } from 'express';
import { Category } from '../models/Category';

// @desc    Get all categories
// @route   GET /api/categories
// @access  Public
export const getCategories = async (req: Request, res: Response) => {
  try {
    const categories = await Category.find({}).sort({ order: 1, createdAt: -1 });
    res.json(categories);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching categories' });
  }
};

// @desc    Reorder categories
// @route   PUT /api/categories/reorder
// @access  Private/Admin
export const reorderCategories = async (req: Request, res: Response) => {
  try {
    const { orders } = req.body; // Array of { id: string, order: number }
    
    if (!orders || !Array.isArray(orders)) {
      return res.status(400).json({ message: 'Invalid orders data' });
    }

    const updatePromises = orders.map((item: { id: string; order: number }) =>
      Category.findByIdAndUpdate(item.id, { order: item.order })
    );

    await Promise.all(updatePromises);
    res.json({ message: 'Categories reordered successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error reordering categories' });
  }
};

// @desc    Create a category
// @route   POST /api/categories
// @access  Private/Admin
export const createCategory = async (req: Request, res: Response) => {
  try {
    const { name, icon } = req.body;

    const categoryExists = await Category.findOne({ name });

    if (categoryExists) {
      return res.status(400).json({ message: 'Category already exists' });
    }

    const category = await Category.create({
      name,
      icon,
    });

    res.status(201).json(category);
  } catch (error) {
    res.status(400).json({ message: 'Invalid category data' });
  }
};

// @desc    Update a category
// @route   PUT /api/categories/:id
// @access  Private/Admin
export const updateCategory = async (req: Request, res: Response) => {
  try {
    const category = await Category.findById(req.params.id);

    if (category) {
      category.name = req.body.name || category.name;
      category.icon = req.body.icon || category.icon;

      const updatedCategory = await category.save();
      res.json(updatedCategory);
    } else {
      res.status(404).json({ message: 'Category not found' });
    }
  } catch (error) {
    res.status(400).json({ message: 'Invalid category data' });
  }
};

// @desc    Delete a category
// @route   DELETE /api/categories/:id
// @access  Private/Admin
export const deleteCategory = async (req: Request, res: Response) => {
  try {
    const category = await Category.findById(req.params.id);

    if (category) {
      await category.deleteOne();
      res.json({ message: 'Category removed' });
    } else {
      res.status(404).json({ message: 'Category not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error deleting category' });
  }
};
