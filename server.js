import express from 'express'
import http from 'http';
import cors from 'cors'
import dotenv from 'dotenv'
import { Server } from 'socket.io';


import authRoutes from './src/routes/auth.routes.js'
import connectDB from './src/config/db.js';

dotenv.config();

const app = express()

const server = http.createServer(app); //  for socket.io

const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST'],
    },
});

// --------Middlewares---------------

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

//------- Health check ----------

app.get('/', (req, res) => {
    res.json({
        status: 'ok',
        message: 'Finance Tracker API is running ',
        time: new Date().toISOString(),
    });
});

//------Routes--------------

app.use('/api/auth', authRoutes);

// --- Global error handler------

app.use((err, req, res, next) => {
  console.error('ERROR HANDLER CAUGHT:', err);

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  res.status(statusCode).json({
    success: false,
    message,
    // optional: only show details in dev
    ...(process.env.NODE_ENV !== 'production' && { error: err.stack }),
  });
});

//-----socket.io setup-------

io.on('connection', (socket) => {
    console.log('New client connected ->', socket.id);
    socket.on('disconnected', () => {
        console.log('Client disconnected ->', socket.id);
    });
});

//------Start Server -----------

const PORT = process.env.PORT || 5000;
connectDB()
    .then(() => {
        server.listen(PORT, () => {
            console.log(`server is running at ${PORT}`);
            console.log(`-> Test: http://localhost:${PORT}/`);
        });
    })
    .catch((err) => {
        console.error('MongoDB connection failed. Cannot start server');
        console.error(err);
        process.exit(1)
    });

