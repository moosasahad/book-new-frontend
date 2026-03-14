import { Request, Response } from 'express';
import { Order } from '../models/Order';
import { Table } from '../models/Table';
import { MenuItem } from '../models/MenuItem';

// @desc    Get dashboard analytics
// @route   GET /api/analytics
// @access  Private/Admin
export const getAnalytics = async (req: Request, res: Response) => {
  try {
    const { period, startDate, endDate } = req.query;

    let dateLimit: Date;
    let periodEnd = new Date();

    if (startDate && endDate) {
      dateLimit = new Date(startDate as string);
      periodEnd = new Date(endDate as string);
      periodEnd.setHours(23, 59, 59, 999);
    } else {
      dateLimit = new Date();
      if (period === 'week') dateLimit.setDate(dateLimit.getDate() - 7);
      else if (period === 'month') dateLimit.setMonth(dateLimit.getMonth() - 1);
      else dateLimit.setDate(dateLimit.getDate() - 1); // today
    }

    const orders = await Order.find({
      createdAt: { $gte: dateLimit, $lte: periodEnd },
      status: { $in: ['completed', 'ready', 'cooking', 'new'] },
    });

    const totalRevenue = orders.reduce((sum, order) => sum + order.totalAmount, 0);
    const totalOrders = orders.length;

    // Simple trend: compare with the same length period before
    const msInPeriod = periodEnd.getTime() - dateLimit.getTime();
    const prevDateLimit = new Date(dateLimit.getTime() - msInPeriod);
    const prevDateEnd = new Date(dateLimit.getTime() - 1);

    const prevOrders = await Order.find({
      createdAt: { $gte: prevDateLimit, $lte: prevDateEnd },
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

// @desc    Get revenue chart data
// @route   GET /api/analytics/revenue
// @access  Private/Admin
export const getRevenue = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;
    const result: { time: string; revenue: number; orders: number }[] = [];

    let start = new Date();
    let end = new Date();
    let daysToFetch: number;

    if (startDate && endDate) {
      start = new Date(startDate as string);
      start.setHours(0, 0, 0, 0);
      end = new Date(endDate as string);
      end.setHours(23, 59, 59, 999);
      
      const diffTime = Math.abs(end.getTime() - start.getTime());
      daysToFetch = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (daysToFetch > 31) daysToFetch = 31; // Limit for chart readability
    } else {
      daysToFetch = 7;
      start.setDate(start.getDate() - (daysToFetch - 1));
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
    }

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    for (let i = daysToFetch - 1; i >= 0; i--) {
      const currentStart = startDate && endDate ? new Date(start) : new Date();
      if (!(startDate && endDate)) {
        currentStart.setDate(currentStart.getDate() - i);
      } else {
        currentStart.setDate(start.getDate() + (daysToFetch - 1 - i));
      }
      currentStart.setHours(0, 0, 0, 0);

      const currentEnd = new Date(currentStart);
      currentEnd.setHours(23, 59, 59, 999);

      const dayOrders = await Order.find({
        createdAt: { $gte: currentStart, $lte: currentEnd },
        status: { $in: ['completed', 'ready', 'cooking', 'new'] },
      });

      result.push({
        time: daysToFetch > 7 ? `${currentStart.getDate()}/${currentStart.getMonth() + 1}` : dayNames[currentStart.getDay()],
        revenue: +dayOrders.reduce((s, o) => s + o.totalAmount, 0).toFixed(2),
        orders: dayOrders.length,
      });
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching revenue data' });
  }
};

// @desc    Get top selling items
// @route   GET /api/analytics/top-items
// @access  Private/Admin
export const getTopItems = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;
    
    const filter: any = {
      status: { $in: ['completed', 'ready', 'cooking', 'new'] },
    };

    if (startDate && endDate) {
      filter.createdAt = {
        $gte: new Date(startDate as string),
        $lte: new Date(new Date(endDate as string).setHours(23, 59, 59, 999)),
      };
    }

    const orders = await Order.find(filter).lean();

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
