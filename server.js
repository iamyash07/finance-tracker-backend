import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

import connectDB from './src/config/db.js';
import authRoutes from './src/routes/auth.routes.js';
import userRoutes from './src/routes/user.routes.js';
import groupRoutes from './src/routes/group.routes.js';
import expenseRoutes from './src/routes/expense.routes.js';
import settlementRoutes from './src/routes/settlement.routes.js';


dotenv.config();


const app = express();
const server = http.createServer(app);

// Initialize Socket.io
export const io = new Server(server, {
  cors: {
    origin: '*',  
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    credentials: true,
  },
});


// Auto-create uploads folder if missing

const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('Created uploads folder at:', uploadsDir);
} else {
  console.log('Uploads folder exists at:', uploadsDir);
}


console.log('Current working directory:', process.cwd());


// Middleware

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve uploaded files
app.use('/uploads', express.static('uploads'));

// Health check
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'Finance Tracker Backend is running',
    timestamp: new Date().toISOString(),
  });
});


// Routes

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/settlements', settlementRoutes);


// Global error handler

app.use((err, req, res, next) => {
  console.error('Global error:', err);

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV !== 'production' && { error: err.stack }),
  });
});


// Socket.io connection handling

io.on('connection', (socket) => {
  console.log(`New client connected: ${socket.id}`);

  // Join group room
  socket.on('joinGroup', (groupId) => {
    socket.join(`group_${groupId}`);
    console.log(`Socket ${socket.id} joined group_${groupId}`);
  });

  // Leave group room
  socket.on('leaveGroup', (groupId) => {
    socket.leave(`group_${groupId}`);
    console.log(`Socket ${socket.id} left group_${groupId}`);
  });

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});


// Start server
const PORT = process.env.PORT || 5000;

connectDB()
  .then(() => {
    server.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`Test: http://localhost:${PORT}/`);
    });
  })
  .catch((err) => {
    console.error('MongoDB connection failed - cannot start server');
    console.error(err);
    process.exit(1);
  });