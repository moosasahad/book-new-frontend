import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User, IUser } from '../models/User';

export interface AuthRequest extends Request {
  user?: IUser;
}

export const protect = async (req: AuthRequest, res: Response, next: NextFunction) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as any;


      const user = await User.findById(decoded.id).select('-passwordHash');
      if (!user) {
        res.status(401).json({ message: 'Not authorized, user not found' });
        return;
      }

      if (user.status !== 'active') {
        res.status(403).json({ message: 'Your account has been blocked. Access denied.' });
        return;
      }

      req.user = user;
      next();
    } catch (error) {
      console.error(error);
      res.status(401).json({ message: 'Not authorized, token failed' });
      return;
    }
  }

  if (!token) {
    res.status(401).json({ message: 'Not authorized, no token' });
    return;
  }
};

export const adminOnly = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ message: 'Not authorized as an admin' });
  }
};

export const kitchenOnly = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.user && (req.user.role === 'kitchen' || req.user.role === 'admin')) {
    next();
  } else {
    res.status(403).json({ message: 'Not authorized for kitchen access' });
  }
};

export const staffOnly = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.user && (req.user.role === 'staff' || req.user.role === 'admin')) {
    next();
  } else {
    res.status(403).json({ message: 'Not authorized for staff access' });
  }
};
