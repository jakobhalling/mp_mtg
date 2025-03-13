// SignalingService.js
// Handles WebSocket connection to signaling server for WebRTC peer discovery

class SignalingService {
  constructor(serverUrl, userId, gameId) {
    this.serverUrl = serverUrl;
    this.userId = userId;
    this.gameId = gameId;
    this.socket = null;
    this.eventListeners = new Map();
    this.connected = false;
  }

  // Connect to the signaling server
  connect() {
    return new Promise((resolve, reject) => {
      try {
        // In a real implementation, this would use a WebSocket connection
        // For this prototype, we'll simulate the connection
        console.log(`Connecting to signaling server at ${this.serverUrl}`);
        
        // Simulate connection delay
        setTimeout(() => {
          this.connected = true;
          console.log('Connected to signaling server');
          
          // Emit the connect event
          this.emit('connect');
          
          // Join the game room
          this.joinGame();
          
          resolve();
        }, 500);
      } catch (err) {
        console.error('Failed to connect to signaling server:', err);
        reject(err);
      }
    });
  }

  // Join a specific game room
  joinGame() {
    if (!this.connected) {
      console.error('Cannot join game: Not connected to signaling server');
      return;
    }

    console.log(`Joining game room ${this.gameId}`);
    
    // In a real implementation, this would send a join message to the server
    // For this prototype, we'll simulate the join
    setTimeout(() => {
      // Simulate server response with existing players
      const existingPlayers = [
        'player1',
        'player2',
        'player3'
      ].filter(id => id !== this.userId);
      
      // Emit the joined event
      this.emit('joined', {
        gameId: this.gameId,
        userId: this.userId,
        existingPlayers
      });
      
      // Notify other players that we've joined
      existingPlayers.forEach(playerId => {
        this.emit('user-joined', playerId);
      });
    }, 300);
  }

  // Send a signal to another peer
  sendSignal(targetUserId, signal) {
    if (!this.connected) {
      console.error('Cannot send signal: Not connected to signaling server');
      return;
    }

    console.log(`Sending signal to user ${targetUserId}`);
    
    // In a real implementation, this would send the signal to the server
    // For this prototype, we'll simulate the signal delivery
    setTimeout(() => {
      // Simulate the server forwarding the signal to the target user
      this.emit('signal', {
        from: this.userId,
        to: targetUserId,
        signal
      });
    }, 100);
  }

  // Broadcast a message to all users in the game
  broadcast(message) {
    if (!this.connected) {
      console.error('Cannot broadcast: Not connected to signaling server');
      return;
    }

    console.log('Broadcasting message to all users in the game');
    
    // In a real implementation, this would send the message to the server
    // For this prototype, we'll simulate the broadcast
    setTimeout(() => {
      // Simulate the server broadcasting the message to all users
      this.emit('broadcast', {
        from: this.userId,
        message
      });
    }, 100);
  }

  // Register an event listener
  on(event, callback) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    
    this.eventListeners.get(event).add(callback);
    
    return () => {
      const listeners = this.eventListeners.get(event);
      if (listeners) {
        listeners.delete(callback);
      }
    };
  }

  // Emit an event to all registered listeners
  emit(event, data) {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (err) {
          console.error(`Error in ${event} listener:`, err);
        }
      });
    }
  }

  // Disconnect from the signaling server
  disconnect() {
    if (!this.connected) {
      return;
    }

    console.log('Disconnecting from signaling server');
    
    // In a real implementation, this would close the WebSocket connection
    // For this prototype, we'll simulate the disconnection
    this.connected = false;
    this.emit('disconnect');
    this.eventListeners.clear();
  }
}

export default SignalingService;
