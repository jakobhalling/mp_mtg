// Single Player Connection Manager
// This is a mock P2P connection manager that doesn't actually connect to any peers
// Used for single player games to prevent state broadcasting and sync

class SinglePlayerConnectionManager {
  constructor(userId) {
    this.userId = userId;
    this.dataListeners = new Set();
    this.connectionListeners = new Set();
  }

  // These methods are no-ops since we don't need real connections in single player
  initializeConnections() {}
  createPeerConnection() {}
  handleSignal() {}
  handleUserJoined() {}
  handleUserLeft() {}
  
  // These methods do nothing since we don't want to broadcast in single player
  sendToPeer() { return false; }
  broadcast() { return 0; }
  disconnectAll() {
    // No-op for single player mode
  }

  // We still need these methods for the GameStateManager interface
  addDataListener(callback) {
    // No-op for single player mode
    return () => {};
  }

  addConnectionListener(callback) {
    // No-op for single player mode
    return () => {};
  }

  // Always return empty array since we have no peers
  getConnectedPeers() {
    return [];
  }

  // Always return false since we're not connected to any peers
  isConnectedToPeer() {
    return false;
  }

  // For GameStateManager interface compatibility
  isConnected() {
    return false;
  }

  broadcastGameState() {
    // No-op for single player mode
  }

  notifyDataListeners(data, fromPeerId) {
    // No-op for single player mode
  }

  notifyConnectionListeners(event, data) {
    // No-op for single player mode
  }
}

export default SinglePlayerConnectionManager;
