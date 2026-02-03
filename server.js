// server.js
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
import groupRoutes from './src/routes/group.routes.js'

dotenv.config();

const app = express();
const server = http.createServer(app);

// Initialize Socket.io
const io = new Server(server, {
  cors: {
    origin: '*', // Change to your frontend URL in production
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    credentials: true,
  },
});

// ────────────────────────────────────────────────
// Create uploads folder automatically if not exists
// ────────────────────────────────────────────────
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('Uploads folder created automatically at:', uploadsDir);
} else {
  console.log('Uploads folder found at:', uploadsDir);
}

// ────────────────────────────────────────────────
// Middleware
// ────────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve uploaded files statically
app.use('/uploads', express.static('uploads'));

// Health check route
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'Finance Tracker Backend is running 🚀',
    timestamp: new Date().toISOString(),
  });
});

// ────────────────────────────────────────────────
// Routes
// ────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/groups', groupRoutes);

// app.use('/api/expenses', expenseRoutes);

// ────────────────────────────────────────────────
// Global error handler (must be last)
// ────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Global error caught:', err);

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV !== 'production' && { error: err.stack }),
  });
});

// ────────────────────────────────────────────────
// Socket.io events
// ────────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log(`New client connected: ${socket.id}`);

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});

// ────────────────────────────────────────────────
// Start server
// ────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

connectDB()
  .then(() => {
    server.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`Test health check: http://localhost:${PORT}/`);
    });
  })
  .catch((err) => {
    console.error('MongoDB connection failed - cannot start server');
    console.error(err);
    process.exit(1);
  });