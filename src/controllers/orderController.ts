import { Request, Response } from 'express';
import { Order } from '../models/Order';
import { Table } from '../models/Table';
import { MenuItem } from '../models/MenuItem';
import { AuthRequest } from '../middlewares/auth';

import { emitOrderUpdate } from '../utils/socket';

// @desc    Create new order
// @route   POST /api/orders
// @access  Public (Customer) or Private (Waiter/Staff)
export const createOrder = async (req: AuthRequest, res: Response) => {
  try {
    const { tableNumber, items, totalAmount } = req.body;

    if (!items || items.length === 0) {
      res.status(400).json({ message: 'No order items' });
      return;
    }

    const validatedItems = [];
    let calculatedTotal = 0;

    for (const item of items) {
      const menuItem = await MenuItem.findById(item.menuItemId);
      if (!menuItem) {
        return res.status(404).json({ message: `Menu item not found` });
      }

      let optionsTotal = 0;
      if (item.selectedOptions && item.selectedOptions.length > 0) {
         item.selectedOptions.forEach((opt: any) => {
            optionsTotal += (Number(opt.priceModifier) || 0);
         });
      }

      const finalPrice = menuItem.price + optionsTotal;

      validatedItems.push({
        menuItemId: menuItem._id,
        name: menuItem.name,
        image: menuItem.image || '',
        quantity: item.quantity,
        price: finalPrice,
        notes: item.notes,
        selectedOptions: item.selectedOptions?.map((opt: any) => ({
          optionId: opt.optionId,
          choiceId: opt.choiceId,
          optionLabel: opt.optionLabel,
          choiceLabel: opt.choiceLabel,
          priceModifier: opt.priceModifier
        })) || [],
      });
      
      calculatedTotal += (finalPrice * item.quantity);
    }

    // Detect if request is from an authenticated waiter/staff
    const isWaiter = req.user && (req.user.role === 'staff' || req.user.role === 'admin');

    const order = new Order({
      tableNumber,
      items: validatedItems,
      totalAmount: calculatedTotal,
      status: 'new',
      paymentStatus: 'pending',
      ...(req.body.customerName && { customerName: req.body.customerName }),
      ...(req.body.customerPhone && { customerPhone: req.body.customerPhone }),
      ...(req.body.customerSessionId && { customerSessionId: req.body.customerSessionId }),
      ...(isWaiter && { waiterId: req.user!._id, waiterName: req.user!.name }),
    });

    const createdOrder = await order.save();
    
    // Auto-update table status
    await Table.findOneAndUpdate({ tableNumber }, { status: 'occupied' });

    // Notify listeners for this table
    emitOrderUpdate(tableNumber, {
      type: 'ORDER_CREATED',
      order: createdOrder
    }, createdOrder.customerSessionId);

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

    const validatedItems = [];
    let calculatedTotal = 0;

    for (const item of items) {
      const menuItem = await MenuItem.findById(item.menuItemId);
      if (!menuItem) {
        return res.status(404).json({ message: `Menu item not found` });
      }

      let optionsTotal = 0;
      if (item.selectedOptions && item.selectedOptions.length > 0) {
         item.selectedOptions.forEach((opt: any) => {
            optionsTotal += (Number(opt.priceModifier) || 0);
         });
      }

      const finalPrice = menuItem.price + optionsTotal;

      validatedItems.push({
        menuItemId: menuItem._id,
        name: menuItem.name,
        image: menuItem.image || '',
        quantity: item.quantity,
        price: finalPrice,
        notes: item.notes,
        selectedOptions: item.selectedOptions?.map((opt: any) => ({
          optionId: opt.optionId,
          choiceId: opt.choiceId,
          optionLabel: opt.optionLabel,
          choiceLabel: opt.choiceLabel,
          priceModifier: opt.priceModifier
        })) || [],
      });
      
      calculatedTotal += (finalPrice * item.quantity);
    }

    order.items = validatedItems;
    order.totalAmount = calculatedTotal;
    const updatedOrder = await order.save();

    // Notify listeners
    emitOrderUpdate(order.tableNumber, {
      type: 'ORDER_UPDATED',
      order: updatedOrder
    }, updatedOrder.customerSessionId);

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
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const { status, startDate, endDate, search } = req.query;
    let filter: any = {};
    
    // Status filter - "all" for kitchen should mean all ACTIVE orders
    if (status && status !== 'all') {
      filter.status = status;
    } else if (!status || status === 'all') {
      filter.status = { $in: ['new', 'cooking', 'ready'] };
    }

    // Default to today's orders if no date range or search is provided
    if (startDate && endDate) {
      filter.createdAt = {
        $gte: new Date(startDate as string),
        $lte: new Date(new Date(endDate as string).setHours(23, 59, 59, 999)),
      };
    } else if (!search) {
      // Default to today (from midnight)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      filter.createdAt = { $gte: today };
    }

    if (search) {
      const searchRegex = new RegExp(search as string, 'i');
      filter.$or = [
        { customerName: searchRegex },
        { waiterName: searchRegex },
      ];
      if (!isNaN(Number(search))) {
        filter.$or.push({ tableNumber: Number(search) });
      }
      if ((search as string).length >= 4) {
        // Try matching against order ID (end of ID)
        filter.$or.push({ _id: { $regex: search + '$', $options: 'i' } });
      }
    }
    
    const total = await Order.countDocuments(filter);
    
    // Calculate status counts (respecting the today/date filter)
    const countFilter = { ...filter };
    delete countFilter.status;

    const [newCount, cookingCount, readyCount, completedCount] = await Promise.all([
      Order.countDocuments({ ...countFilter, status: 'new' }),
      Order.countDocuments({ ...countFilter, status: 'cooking' }),
      Order.countDocuments({ ...countFilter, status: 'ready' }),
      Order.countDocuments({ ...countFilter, status: 'completed' })
    ]);

    // Sort by oldest first for kitchen efficiency
    const orders = await Order.find(filter)
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(limit);

    res.json({
      orders,
      total,
      page,
      limit,
      hasMore: total > skip + orders.length,
      statusCounts: {
        all: newCount + cookingCount + readyCount + completedCount,
        new: newCount,
        cooking: cookingCount,
        ready: readyCount,
        completed: completedCount
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching orders' });
  }
};

// @desc    Get orders by table number (for customer app)
// @route   GET /api/orders/table/:tableNumber
// @access  Public
export const getOrdersByTable = async (req: Request, res: Response) => {
  try {
    const { tableNumber } = req.params;
    const { sessionId } = req.query;
    
    // Fetch orders from the last 24 hours to show current dining session history
    const yesterday = new Date();
    yesterday.setHours(yesterday.getHours() - 24);

    const query: any = {
      tableNumber: Number(tableNumber),
      createdAt: { $gte: yesterday }
    };

    // If session ID is provided, strictly filter by it
    if (sessionId) {
      query.customerSessionId = sessionId;
    }

    const orders = await Order.find(query).sort({ createdAt: -1 });

    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching table orders' });
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
      }, order.customerSessionId);

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

// @desc    Get orders placed by the currently logged-in waiter/staff
// @route   GET /api/orders/my-orders
// @access  Private (Staff/Admin)
export const getWaiterOrders = async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const filter: any = { waiterId: req.user!._id };

    const total = await Order.countDocuments(filter);
    const orders = await Order.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json({ orders, total, page, limit, hasMore: total > skip + orders.length });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching waiter orders' });
  }
};
