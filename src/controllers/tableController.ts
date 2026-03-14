import { Request, Response } from 'express';
import { Table } from '../models/Table';

// @desc    Get all tables
// @route   GET /api/tables
// @access  Public
export const getTables = async (req: Request, res: Response) => {
  try {
    const tables = await Table.find({}).sort({ tableNumber: 1 });
    res.json(tables);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching tables' });
  }
};

// @desc    Create a table
// @route   POST /api/tables
// @access  Private/Admin
export const createTable = async (req: Request, res: Response) => {
  try {
    const tableExists = await Table.findOne({ tableNumber: req.body.tableNumber });
    if (tableExists) {
      res.status(400).json({ message: 'Table number already exists' });
      return;
    }

    const table = new Table(req.body);
    const createdTable = await table.save();
    res.status(201).json(createdTable);
  } catch (error) {
    res.status(400).json({ message: 'Invalid table data' });
  }
};

// @desc    Update a table
// @route   PUT /api/tables/:id
// @access  Private/Admin
export const updateTable = async (req: Request, res: Response) => {
  try {
    const table = await Table.findById(req.params.id);
    if (table) {
      Object.assign(table, req.body);
      const updatedTable = await table.save();
      res.json(updatedTable);
    } else {
      res.status(404).json({ message: 'Table not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error updating table' });
  }
};

// @desc    Validate a table by ID (for customer access)
// @route   GET /api/tables/validate/:id
// @access  Public
export const validateTable = async (req: Request, res: Response) => {
  try {
    const table = await Table.findById(req.params.id);
    
    if (!table) {
      res.status(404).json({ message: 'Invalid QR Code. Table not found.' });
      return;
    }

    if (table.status !== 'available') {
      res.status(400).json({ 
        message: 'This table is currently occupied or reserved.',
        tableNumber: table.tableNumber,
        status: table.status
      });
      return;
    }

    res.json({
      valid: true,
      tableNumber: table.tableNumber,
      capacity: table.capacity
    });
  } catch (error) {
    res.status(400).json({ message: 'Invalid Table ID format' });
  }
};
