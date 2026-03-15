import { Server } from 'socket.io';
import { Server as HttpServer } from 'http';

let io: Server;

export const initSocket = (server: HttpServer) => {
  io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      methods: ['GET', 'POST', 'PATCH'],
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    socket.on('join_table', (tableNumber) => {
      socket.join(`table_${tableNumber}`);
      console.log(`User ${socket.id} joined table_${tableNumber}`);
    });

    socket.on('join_session', (sessionId) => {
      socket.join(`session_${sessionId}`);
      console.log(`User ${socket.id} joined session_${sessionId}`);
    });

    socket.on('join_user', (userId) => {
      socket.join(`user_${userId}`);
      console.log(`User ${socket.id} joined user_${userId}`);
    });

    socket.on('join_kitchen', () => {
      socket.join('kitchen');
      console.log(`User ${socket.id} joined kitchen room`);
    });

    socket.on('disconnect', () => {
      console.log('A user disconnected:', socket.id);
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized!');
  }
  return io;
};

export const emitOrderUpdate = (tableNumber: number, data: any, sessionId?: string) => {
  if (io) {
    // Notify specific table
    io.to(`table_${tableNumber}`).emit('order_update', data);
    
    // Notify specific session if provided
    if (sessionId) {
      io.to(`session_${sessionId}`).emit('session_order_update', data);
    }

    // Notify kitchen
    io.to('kitchen').emit('order_event', data);
  }
};

export const emitUserUpdate = (userId: string, data: any) => {
  if (io) {
    io.to(`user_${userId}`).emit('user_status_update', data);
  }
};
