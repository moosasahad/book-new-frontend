import { Request, Response } from 'express';
import { Order } from '../models/Order';
import { Table } from '../models/Table';
import { MenuItem } from '../models/MenuItem';

import { emitOrderUpdate } from '../utils/socket';

// @desc    Create new order
// @route   POST /api/orders
// @access  Public (from customer app)
export const createOrder = async (req: Request, res: Response) => {
  try {
    const { tableNumber, items, totalAmount } = req.body;

    if (!items || items.length === 0) {
      res.status(400).json({ message: 'No order items' });
      return;
    }

    // Verify items and calculate total (simple validation for now)
    const validatedItems = items.map((item: any) => ({
      menuItemId: item.menuItemId,
      name: item.name,
      quantity: item.quantity,
      price: item.price,
      notes: item.notes,
      selectedOptions: item.selectedOptions || [],
    }));

    const order = new Order({
      tableNumber,
      items: validatedItems,
      totalAmount: totalAmount || 0, // Fallback to provided total or 0
      status: 'new',
      paymentStatus: 'pending',
    });

    const createdOrder = await order.save();
    
    // Auto-update table status
    await Table.findOneAndUpdate({ tableNumber }, { status: 'occupied' });

    // Notify listeners for this table
    emitOrderUpdate(tableNumber, {
      type: 'ORDER_CREATED',
      order: createdOrder
    });

    res.status(201).json(createdOrder);
  } catch (error: any) {
    res.status(400).json({ message: error.message || 'Error creating order' });
  }
};

// @desc    Update existing order (customer side)
// @route   PUT /api/orders/:id
// @access  Public
export const updateOrder = async (req: Request, res: Response) => {
  try {
    const { items, totalAmount } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.status !== 'new') {
      return res.status(400).json({ message: 'Only NEW orders can be edited' });
    }

    order.items = items;
    order.totalAmount = totalAmount;
    const updatedOrder = await order.save();

    // Notify listeners
    emitOrderUpdate(order.tableNumber, {
      type: 'ORDER_UPDATED',
      order: updatedOrder
    });

    res.json(updatedOrder);
  } catch (error: any) {
    res.status(400).json({ message: 'Error updating order' });
  }
};

// @desc    Get all orders
// @route   GET /api/orders
// @access  Private (Kitchen/Admin)
export const getOrders = async (req: Request, res: Response) => {
  try {
    const { status } = req.query;
    const filter = status && status !== 'all' ? { status } : {};
    
    // Sort by oldest first for kitchen efficiency
    const orders = await Order.find(filter).sort({ createdAt: 1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching orders' });
  }
};

// @desc    Get order by ID
// @route   GET /api/orders/:id
// @access  Public
export const getOrderById = async (req: Request, res: Response) => {
  try {
    const order = await Order.findById(req.params.id);
    if (order) {
      res.json(order);
    } else {
      res.status(404).json({ message: 'Order not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error fetching order' });
  }
};

// @desc    Update order status
// @route   PATCH /api/orders/:id/status
// @access  Private (Kitchen/Admin)
export const updateOrderStatus = async (req: Request, res: Response) => {
  try {
    const { status } = req.body;
    const order = await Order.findById(req.params.id);

    if (order) {
      order.status = status;
      const updatedOrder = await order.save();
      
      // Notify table for live update
      emitOrderUpdate(order.tableNumber, {
        type: 'STATUS_CHANGED',
        orderId: order._id,
        status: status,
        order: updatedOrder
      });

      // If completed, maybe free the table (depending on business logic)
      if (status === 'completed' && order.paymentStatus === 'paid') {
        const activeOrdersForTable = await Order.countDocuments({
          tableNumber: order.tableNumber,
          status: { $in: ['new', 'cooking', 'ready'] }
        });
        
        if (activeOrdersForTable === 0) {
          await Table.findOneAndUpdate({ tableNumber: order.tableNumber }, { status: 'available' });
        }
      }
      
      res.json(updatedOrder);
    } else {
      res.status(404).json({ message: 'Order not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error updating order' });
  }
};
