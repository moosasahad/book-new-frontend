import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { Category } from '../models/Category';
import { MenuItem } from '../models/MenuItem';
import connectDB from '../config/db';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const migrate = async () => {
    try {
        await connectDB();
        console.log('Connected to MongoDB');

        // 1. Get or create default categories
        const defaultCategories = ['starters', 'mains', 'sides', 'drinks', 'desserts'];
        const categoryMap: Record<string, string> = {};

        for (const catName of defaultCategories) {
            let category = await Category.findOne({ name: new RegExp(`^${catName}$`, 'i') });
            if (!category) {
                category = await Category.create({ name: catName.charAt(0).toUpperCase() + catName.slice(1) });
                console.log(`Created category: ${category.name}`);
            }
            categoryMap[catName.toLowerCase()] = (category._id as any).toString();
        }

        // 2. Fetch all menu items
        const menuItems = await MenuItem.find({});
        console.log(`Found ${menuItems.length} menu items to migrate`);

        let updatedCount = 0;
        for (const item of menuItems) {
            const oldCategory = item.category as any;
            
            // If it's already an ObjectId, skip (rough check)
            if (mongoose.Types.ObjectId.isValid(oldCategory) && oldCategory.toString().length === 24) {
               // Verify it exists in categories
               const exists = await Category.findById(oldCategory);
               if (exists) continue;
            }

            const catKey = typeof oldCategory === 'string' ? oldCategory.toLowerCase() : '';
            const newCatId = categoryMap[catKey];

            if (newCatId) {
                await MenuItem.updateOne({ _id: item._id }, { $set: { category: new mongoose.Types.ObjectId(newCatId) } });
                updatedCount++;
            } else {
                console.warn(`Could not find category for item: ${item.name} (category: ${oldCategory})`);
                // Fallback to 'mains' or first available if not found
                const fallbackId = Object.values(categoryMap)[0];
                if (fallbackId) {
                    await MenuItem.updateOne({ _id: item._id }, { $set: { category: new mongoose.Types.ObjectId(fallbackId) } });
                    updatedCount++;
                }
            }
        }

        console.log(`Migration completed: ${updatedCount} items updated`);
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
};

migrate();
