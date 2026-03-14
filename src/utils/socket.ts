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

export const emitOrderUpdate = (tableNumber: number, data: any) => {
  if (io) {
    // Notify specific table
    io.to(`table_${tableNumber}`).emit('order_update', data);
    // Notify kitchen
    io.to('kitchen').emit('order_event', data);
  }
};
