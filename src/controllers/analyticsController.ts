import { Request, Response } from 'express';
import { Order } from '../models/Order';
import { Table } from '../models/Table';
import { MenuItem } from '../models/MenuItem';

// @desc    Get dashboard analytics
// @route   GET /api/analytics
// @access  Private/Admin
export const getAnalytics = async (req: Request, res: Response) => {
  try {
    const { period } = req.query;

    const dateLimit = new Date();
    if (period === 'week') dateLimit.setDate(dateLimit.getDate() - 7);
    else if (period === 'month') dateLimit.setMonth(dateLimit.getMonth() - 1);
    else dateLimit.setDate(dateLimit.getDate() - 1); // today

    const orders = await Order.find({
      createdAt: { $gte: dateLimit },
      status: { $in: ['completed', 'ready', 'cooking', 'new'] },
    });

    const totalRevenue = orders.reduce((sum, order) => sum + order.totalAmount, 0);
    const totalOrders = orders.length;

    // Simple trend: compare with the same length period before
    const prevDateLimit = new Date(dateLimit);
    const now = new Date();
    const msInPeriod = now.getTime() - dateLimit.getTime();
    prevDateLimit.setTime(dateLimit.getTime() - msInPeriod);

    const prevOrders = await Order.find({
      createdAt: { $gte: prevDateLimit, $lt: dateLimit },
      status: { $in: ['completed', 'ready', 'cooking', 'new'] },
    });
    const prevRevenue = prevOrders.reduce((sum, o) => sum + o.totalAmount, 0);

    const revenueTrend = prevRevenue > 0
      ? +((totalRevenue - prevRevenue) / prevRevenue * 100).toFixed(1)
      : 0;
    const ordersTrend = prevOrders.length > 0
      ? +((totalOrders - prevOrders.length) / prevOrders.length * 100).toFixed(1)
      : 0;

    const activeTables = await Table.countDocuments({ status: { $ne: 'available' } });
    const totalMenuItems = await MenuItem.countDocuments({ isAvailable: true });

    res.json({
      totalRevenueToday: totalRevenue,
      totalOrdersToday: totalOrders,
      activeTables,
      totalMenuItems,
      revenueTrend,
      ordersTrend,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching analytics' });
  }
};

// @desc    Get revenue chart data (last 7 days aggregated from DB)
// @route   GET /api/analytics/revenue
// @access  Private/Admin
export const getRevenue = async (req: Request, res: Response) => {
  try {
    const days = 7;
    const result: { time: string; revenue: number; orders: number }[] = [];

    for (let i = days - 1; i >= 0; i--) {
      const start = new Date();
      start.setDate(start.getDate() - i);
      start.setHours(0, 0, 0, 0);

      const end = new Date(start);
      end.setHours(23, 59, 59, 999);

      const dayOrders = await Order.find({
        createdAt: { $gte: start, $lte: end },
        status: { $in: ['completed', 'ready', 'cooking', 'new'] },
      });

      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      result.push({
        time: dayNames[start.getDay()],
        revenue: +dayOrders.reduce((s, o) => s + o.totalAmount, 0).toFixed(2),
        orders: dayOrders.length,
      });
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching revenue data' });
  }
};

// @desc    Get top selling items (aggregated from Order items)
// @route   GET /api/analytics/top-items
// @access  Private/Admin
export const getTopItems = async (req: Request, res: Response) => {
  try {
    // Aggregate items across all orders
    const orders = await Order.find({
      status: { $in: ['completed', 'ready', 'cooking', 'new'] },
    }).lean();

    const itemMap: Record<string, { name: string; salesCount: number; revenue: number; category: string }> = {};

    for (const order of orders) {
      for (const item of order.items as any[]) {
        const key = item.menuItemId?.toString() || item.name;
        if (!itemMap[key]) {
          itemMap[key] = { name: item.name, salesCount: 0, revenue: 0, category: item.category || 'mains' };
        }
        itemMap[key].salesCount += item.quantity;
        itemMap[key].revenue += (item.price || 0) * item.quantity;
      }
    }

    const topItems = Object.entries(itemMap)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.salesCount - a.salesCount)
      .slice(0, 5);

    res.json(topItems);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching top items' });
  }
};
