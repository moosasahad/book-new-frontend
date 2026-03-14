import { Request, Response } from 'express';
import { Table } from '../models/Table';
import { Order } from '../models/Order';
import { emitOrderUpdate } from '../utils/socket';

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
// @access  Private (Kitchen/Admin)
export const updateTable = async (req: Request, res: Response) => {
  try {
    const { status, force } = req.body;
    const table = await Table.findById(req.params.id);
    
    if (!table) {
      res.status(404).json({ message: 'Table not found' });
      return;
    }

    // Check if user is trying to update a reserved table
    const isAdmin = (req as any).user && (req as any).user.role === 'admin';
    
    if (table.status === 'reserved' && !isAdmin) {
      res.status(403).json({ message: 'Locked: Only Admin can update reserved tables' });
      return;
    }

    // Safeguard: Check for active orders if status is being changed (e.g., cleared/reserved)
    // We only care if they are clearing or locking a table that might have active eaters
    if (status && status !== table.status) {
      const activeOrders = await Order.find({
        tableNumber: table.tableNumber,
        status: { $in: ['new', 'cooking', 'ready'] }
      });

      if (activeOrders.length > 0) {
        if (!force) {
          return res.status(409).json({ 
            message: 'Active orders found', 
            activeOrdersCount: activeOrders.length 
          });
        } else {
          // Force: Complete all active orders
          for (const order of activeOrders) {
            order.status = 'completed';
            order.paymentStatus = 'paid'; // Assume paid if forced
            await order.save();
            
            // Notify via socket
            emitOrderUpdate(order.tableNumber, {
              type: 'STATUS_CHANGED',
              orderId: order._id,
              status: 'completed',
              order: order
            });
          }
        }
      }
    }

    // Update table
    Object.assign(table, req.body);
    const updatedTable = await table.save();
    res.json(updatedTable);
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
      // Table ID not found in DB — invalid QR code
      res.json({ valid: false, status: 'invalid', message: 'Table not found. This QR code is not valid.' });
      return;
    }

    if (table.status !== 'available') {
      // Table exists but is occupied or reserved
      res.json({ 
        valid: false,
        status: 'occupied',
        tableNumber: table.tableNumber,
        message: 'This table is currently occupied or reserved.'
      });
      return;
    }

    res.json({
      valid: true,
      status: 'available',
      tableNumber: table.tableNumber,
      capacity: table.capacity
    });
  } catch (error) {
    // Malformed ObjectId or DB error — still invalid
    res.json({ valid: false, status: 'invalid', message: 'Invalid Table ID format.' });
  }
};
