const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Import routes
const userRoutes = require('./routes/users');
const gameRoutes = require('./routes/games');

// Initialize Express app
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/users', userRoutes);
app.use('/api/games', gameRoutes);

// In-memory storage for active connections
const activeConnections = new Map();

// Socket.IO for signaling and real-time communication
io.on('connection', (socket) => {
  console.log('New client connected');
  
  // Authenticate socket connection
  socket.on('authenticate', ({ token }) => {
    try {
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const userId = decoded.id;
      
      // Store socket ID for this user
      activeConnections.set(userId, socket.id);
      
      // Join user's room for direct messages
      socket.join(`user:${userId}`);
      
      console.log(`User ${userId} authenticated`);
      
      // Send confirmation
      socket.emit('authenticated', { userId });
    } catch (error) {
      console.error('Socket authentication error:', error);
      socket.emit('authentication_error', { message: 'Invalid token' });
    }
  });
  
  // Join a game room
  socket.on('join-game', ({ gameId, userId }) => {
    // Join game room
    socket.join(`game:${gameId}`);
    console.log(`User ${userId} joined game ${gameId}`);
    
    // Notify other players
    socket.to(`game:${gameId}`).emit('user-joined-room', {
      userId,
      gameId
    });
  });
  
  // WebRTC signaling
  socket.on('signal', ({ to, from, signal }) => {
    const targetSocketId = activeConnections.get(to);
    if (targetSocketId) {
      io.to(targetSocketId).emit('signal', {
        from,
        signal
      });
    }
  });
  
  // Disconnect
  socket.on('disconnect', () => {
    console.log('Client disconnected');
    
    // Remove from active connections
    for (const [userId, socketId] of activeConnections.entries()) {
      if (socketId === socket.id) {
        activeConnections.delete(userId);
        break;
      }
    }
  });
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = { app, server };
