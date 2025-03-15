// SinglePlayerSignalingService.js
// This is a modified version of SignalingService.js for single player mode
// It simulates the signaling server locally without actual network connections

class SinglePlayerSignalingService {
  constructor(userId, gameId) {
    this.userId = userId;
    this.gameId = gameId;
    this.eventListeners = new Map();
    this.connected = false;
  }
  
  // Connect to signaling server - in single player, we just simulate this
  async connect() {
    console.log('Single player mode: Simulating connection to signaling server');
    this.connected = true;
    
    // Emit a fake 'connected' event
    setTimeout(() => {
      this.emit('connected', { userId: this.userId, gameId: this.gameId });
    }, 100);
    
    return true;
  }
  
  // Disconnect from signaling server - in single player, this is a no-op
  disconnect() {
    console.log('Single player mode: Disconnecting from simulated signaling server');
    this.connected = false;
    return true;
  }
  
  // Register event listener
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
  
  // Emit event to listeners
  emit(event, data) {
    console.log(`Single player mode: Emitting ${event} event`);
    
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
    
    return true;
  }
  
  // Join a game room - in single player, we just simulate this
  joinGame(gameId) {
    console.log(`Single player mode: Joining game ${gameId}`);
    this.gameId = gameId;
    
    // Emit a fake 'game-joined' event
    setTimeout(() => {
      this.emit('game-joined', { gameId, userId: this.userId });
    }, 100);
    
    return true;
  }
  
  // Create a new game - in single player, we just simulate this
  createGame() {
    console.log('Single player mode: Creating new game');
    
    // Generate a fake game ID
    const gameId = `single-player-${Date.now()}`;
    this.gameId = gameId;
    
    // Emit a fake 'game-created' event
    setTimeout(() => {
      this.emit('game-created', { gameId, userId: this.userId });
    }, 100);
    
    return gameId;
  }
  
  // Check if connected to signaling server
  isConnected() {
    return this.connected;
  }
}

export default SinglePlayerSignalingService;
