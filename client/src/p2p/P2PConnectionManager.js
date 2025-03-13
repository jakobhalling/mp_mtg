// P2P Connection Manager for MTG Multiplayer Game
// This module handles WebRTC connections between players using simple-peer

import SimplePeer from 'simple-peer';

class P2PConnectionManager {
  constructor(userId, signalServer) {
    this.userId = userId;
    this.signalServer = signalServer;
    this.peers = new Map(); // Map of userId -> peer connection
    this.dataListeners = new Set(); // Callbacks for data events
    this.connectionListeners = new Set(); // Callbacks for connection events
    
    // Connect to signaling server
    this.signalServer.on('signal', this.handleSignal.bind(this));
    this.signalServer.on('user-joined', this.handleUserJoined.bind(this));
    this.signalServer.on('user-left', this.handleUserLeft.bind(this));
  }
  
  // Initialize connections with existing players in a game
  initializeConnections(existingPlayers) {
    existingPlayers.forEach(playerId => {
      if (playerId !== this.userId) {
        this.createPeerConnection(playerId, true); // Create as initiator
      }
    });
  }
  
  // Create a new peer connection
  createPeerConnection(peerId, initiator = false) {
    console.log(`Creating ${initiator ? 'initiator' : 'receiver'} connection to peer ${peerId}`);
    
    const peer = new SimplePeer({
      initiator,
      trickle: true // Enable ICE trickle for faster connections
    });
    
    // Handle peer events
    peer.on('signal', data => {
      // Send signal data to the peer via signaling server
      this.signalServer.emit('signal', {
        from: this.userId,
        to: peerId,
        signal: data
      });
    });
    
    peer.on('connect', () => {
      console.log(`Connected to peer ${peerId}`);
      this.notifyConnectionListeners('peer-connected', peerId);
    });
    
    peer.on('data', data => {
      try {
        const parsedData = JSON.parse(data);
        this.notifyDataListeners(parsedData, peerId);
      } catch (err) {
        console.error('Error parsing data from peer:', err);
      }
    });
    
    peer.on('close', () => {
      console.log(`Connection to peer ${peerId} closed`);
      this.peers.delete(peerId);
      this.notifyConnectionListeners('peer-disconnected', peerId);
    });
    
    peer.on('error', err => {
      console.error(`Error in connection to peer ${peerId}:`, err);
      this.notifyConnectionListeners('peer-error', { peerId, error: err.message });
    });
    
    this.peers.set(peerId, peer);
    return peer;
  }
  
  // Handle incoming signal from another peer
  handleSignal({ from, signal }) {
    console.log(`Received signal from peer ${from}`);
    
    let peer = this.peers.get(from);
    
    // If we don't have a connection to this peer yet, create one
    if (!peer) {
      peer = this.createPeerConnection(from, false);
    }
    
    // Process the signal
    peer.signal(signal);
  }
  
  // Handle new user joining the game
  handleUserJoined(userId) {
    console.log(`User ${userId} joined`);
    if (userId !== this.userId && !this.peers.has(userId)) {
      this.createPeerConnection(userId, true);
    }
  }
  
  // Handle user leaving the game
  handleUserLeft(userId) {
    console.log(`User ${userId} left`);
    const peer = this.peers.get(userId);
    if (peer) {
      peer.destroy();
      this.peers.delete(userId);
      this.notifyConnectionListeners('peer-disconnected', userId);
    }
  }
  
  // Send data to a specific peer
  sendToPeer(peerId, data) {
    const peer = this.peers.get(peerId);
    if (peer && peer.connected) {
      peer.send(JSON.stringify(data));
      return true;
    }
    return false;
  }
  
  // Broadcast data to all connected peers
  broadcast(data) {
    let successCount = 0;
    this.peers.forEach((peer, peerId) => {
      if (peer.connected) {
        peer.send(JSON.stringify(data));
        successCount++;
      }
    });
    return successCount;
  }
  
  // Add a listener for data events
  addDataListener(callback) {
    this.dataListeners.add(callback);
    return () => this.dataListeners.delete(callback);
  }
  
  // Add a listener for connection events
  addConnectionListener(callback) {
    this.connectionListeners.add(callback);
    return () => this.connectionListeners.delete(callback);
  }
  
  // Notify all data listeners
  notifyDataListeners(data, fromPeerId) {
    this.dataListeners.forEach(callback => {
      try {
        callback(data, fromPeerId);
      } catch (err) {
        console.error('Error in data listener:', err);
      }
    });
  }
  
  // Notify all connection listeners
  notifyConnectionListeners(event, data) {
    this.connectionListeners.forEach(callback => {
      try {
        callback(event, data);
      } catch (err) {
        console.error('Error in connection listener:', err);
      }
    });
  }
  
  // Get all connected peer IDs
  getConnectedPeers() {
    const connectedPeers = [];
    this.peers.forEach((peer, peerId) => {
      if (peer.connected) {
        connectedPeers.push(peerId);
      }
    });
    return connectedPeers;
  }
  
  // Check if connected to a specific peer
  isConnectedToPeer(peerId) {
    const peer = this.peers.get(peerId);
    return peer && peer.connected;
  }
  
  // Disconnect from all peers
  disconnectAll() {
    this.peers.forEach((peer) => {
      peer.destroy();
    });
    this.peers.clear();
    this.signalServer.disconnect();
  }
}

export default P2PConnectionManager;
