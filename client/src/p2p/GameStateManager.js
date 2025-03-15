// Game State Manager for MTG Multiplayer Game
// Handles game state synchronization and consensus mechanism

import { v4 as uuidv4 } from 'uuid';
import { sha256 } from 'js-sha256';

class GameStateManager {
  constructor(p2pConnectionManager, userId) {
    this.p2pManager = p2pConnectionManager;
    this.userId = userId;
    this.gameState = null;
    this.pendingActions = new Map(); // Map of actionId -> { action, votes }
    this.stateHistory = []; // History of game states for rollback if needed
    this.actionLog = []; // Log of all actions for debugging
    this.stateListeners = new Set(); // Callbacks for state changes
    this.consensusThreshold = 0.5; // Percentage of peers needed for consensus
    
    // Listen for data from peers
    this.p2pManager.addDataListener(this.handlePeerData.bind(this));
    this.p2pManager.addConnectionListener(this.handleConnectionEvent.bind(this));
  }
  
  // Initialize a new game state
  initializeGameState(players, config = {}) {
    const initialState = {
      id: uuidv4(),
      version: 1,
      timestamp: Date.now(),
      activePlayer: players[0].id,
      phase: 'main1',
      turn: 1,
      players: players.map(player => ({
        id: player.id,
        name: player.name,
        life: 20,
        library: player.deck || [],
        hand: [],
        battlefield: [],
        graveyard: [],
        exile: [],
        commander: player.commander || null,
        isCurrentPlayer: player.id === this.userId
      })),
      stack: [],
      config
    };
    
    this.setGameState(initialState);
    this.broadcastGameState();
    return initialState;
  }
  
  // Set the current game state and notify listeners
  setGameState(newState) {
    // Store previous state in history
    if (this.gameState) {
      this.stateHistory.push({
        state: JSON.parse(JSON.stringify(this.gameState)),
        timestamp: Date.now()
      });
      
      // Limit history size
      if (this.stateHistory.length > 20) {
        this.stateHistory.shift();
      }
    }
    
    // Deep clone the new state to prevent external mutations
    this.gameState = JSON.parse(JSON.stringify(newState));
    
    // Notify listeners with a clone of the state
    this.notifyStateListeners();
    
    // Broadcast state update if we're connected
    if (this.p2pManager && this.p2pManager.isConnected()) {
      this.broadcastGameState();
    }
  }
  
  // Get the current game state
  getGameState() {
    return this.gameState;
  }
  
  // Get the current player's state
  getCurrentPlayerState() {
    if (!this.gameState) return null;
    return this.gameState.players.find(p => p.id === this.userId);
  }
  
  // Apply an action to the game state
  applyAction(action) {
    if (!this.gameState) {
      console.error('Cannot apply action: Game state not initialized');
      return false;
    }
    
    // Generate a unique ID for this action if not provided
    const actionWithId = {
      ...action,
      id: action.id || uuidv4(),
      timestamp: action.timestamp || Date.now(),
      sourcePlayer: action.sourcePlayer || this.userId
    };
    
    // Log the action
    this.actionLog.push({
      ...actionWithId,
      appliedAt: Date.now()
    });
    
    // Apply the action locally
    const success = this.processAction(actionWithId);
    
    if (success) {
      // Broadcast the action to all peers
      this.p2pManager.broadcast({
        type: 'game-action',
        action: actionWithId
      });
      
      // Add to pending actions for consensus
      this.addPendingAction(actionWithId);
    }
    
    return success;
  }
  
  // Process an action and update the game state
  processAction(action) {
    // Clone the current state to avoid direct mutations
    const newState = JSON.parse(JSON.stringify(this.gameState));
    newState.version += 1;
    newState.timestamp = Date.now();
    
    try {
      switch (action.type) {
        case 'draw-card':
          return this.processDrawCard(newState, action);
        
        case 'play-card':
          return this.processPlayCard(newState, action);
        
        case 'move-card':
          return this.processMoveCard(newState, action);
        
        case 'update-life':
          return this.processUpdateLife(newState, action);
        
        case 'change-phase':
          return this.processChangePhase(newState, action);
        
        case 'next-turn':
          return this.processNextTurn(newState, action);
        
        case 'add-counter':
          return this.processAddCounter(newState, action);
        
        case 'remove-counter':
          return this.processRemoveCounter(newState, action);
        
        case 'create-token':
          return this.processCreateToken(newState, action);
        
        case 'shuffle-library':
          return this.processShuffleLibrary(newState, action);
        
        case 'move-to-library':
          return this.processMoveToLibrary(newState, action);
        
        default:
          console.error(`Unknown action type: ${action.type}`);
          return false;
      }
    } catch (err) {
      console.error('Error processing action:', err);
      return false;
    }
  }
  
  // Process draw card action
  processDrawCard(state, action) {
    const { playerId, count = 1 } = action.payload;
    const player = state.players.find(p => p.id === playerId);
    
    if (!player) return false;
    if (player.library.length < count) return false;
    
    const drawnCards = player.library.splice(0, count);
    player.hand.push(...drawnCards);
    
    this.setGameState(state);
    return true;
  }
  
  // Process play card action
  processPlayCard(state, action) {
    const { playerId, cardId, targetZone = 'battlefield' } = action.payload;
    const player = state.players.find(p => p.id === playerId);
    
    if (!player) return false;
    
    // Find the card in hand
    const cardIndex = player.hand.findIndex(card => card.id === cardId);
    if (cardIndex === -1) return false;
    
    // Remove from hand
    const [card] = player.hand.splice(cardIndex, 1);
    
    // Add to target zone
    switch (targetZone) {
      case 'battlefield':
        player.battlefield.push(card);
        break;
      case 'graveyard':
        player.graveyard.push(card);
        break;
      case 'exile':
        player.exile.push(card);
        break;
      default:
        return false;
    }
    
    this.setGameState(state);
    return true;
  }
  
  // Process move card action
  processMoveCard(state, action) {
    const { playerId, cardId, sourceZone, targetZone } = action.payload;
    const player = state.players.find(p => p.id === playerId);
    
    if (!player || !player[sourceZone] || !player[targetZone]) return false;
    
    // Find the card in source zone
    const cardIndex = player[sourceZone].findIndex(card => card.id === cardId);
    if (cardIndex === -1) return false;
    
    // Remove from source zone
    const [card] = player[sourceZone].splice(cardIndex, 1);
    
    // Add to target zone
    player[targetZone].push(card);
    
    this.setGameState(state);
    return true;
  }
  
  // Process update life action
  processUpdateLife(state, action) {
    const { playerId, delta } = action.payload;
    const player = state.players.find(p => p.id === playerId);
    
    if (!player) return false;
    
    player.life += delta;
    
    this.setGameState(state);
    return true;
  }
  
  // Process change phase action
  processChangePhase(state, action) {
    const { phase } = action.payload;
    const validPhases = ['untap', 'upkeep', 'draw', 'main1', 'combat', 'main2', 'end'];
    
    if (!validPhases.includes(phase)) return false;
    
    state.phase = phase;
    
    this.setGameState(state);
    return true;
  }
  
  // Process next turn action
  processNextTurn(state, action) {
    const currentPlayerIndex = state.players.findIndex(p => p.id === state.activePlayer);
    const nextPlayerIndex = (currentPlayerIndex + 1) % state.players.length;
    
    state.activePlayer = state.players[nextPlayerIndex].id;
    state.phase = 'untap';
    state.turn += 1;
    
    this.setGameState(state);
    return true;
  }
  
  // Process add counter action
  processAddCounter(state, action) {
    const { playerId, cardId, counterType, count = 1 } = action.payload;
    const player = state.players.find(p => p.id === playerId);
    
    if (!player) return false;
    
    // Find the card on battlefield
    const card = player.battlefield.find(c => c.id === cardId);
    if (!card) return false;
    
    // Initialize counters if needed
    if (!card.counters) card.counters = {};
    if (!card.counters[counterType]) card.counters[counterType] = 0;
    
    // Add counters
    card.counters[counterType] += count;
    
    this.setGameState(state);
    return true;
  }
  
  // Process remove counter action
  processRemoveCounter(state, action) {
    const { playerId, cardId, counterType, count = 1 } = action.payload;
    const player = state.players.find(p => p.id === playerId);
    
    if (!player) return false;
    
    // Find the card on battlefield
    const card = player.battlefield.find(c => c.id === cardId);
    if (!card || !card.counters || !card.counters[counterType]) return false;
    
    // Remove counters
    card.counters[counterType] = Math.max(0, card.counters[counterType] - count);
    
    this.setGameState(state);
    return true;
  }
  
  // Process create token action
  processCreateToken(state, action) {
    const { playerId, tokenData } = action.payload;
    const player = state.players.find(p => p.id === playerId);
    
    if (!player) return false;
    
    // Create token with unique ID
    const token = {
      ...tokenData,
      id: uuidv4(),
      isToken: true
    };
    
    // Add to battlefield
    player.battlefield.push(token);
    
    this.setGameState(state);
    return true;
  }
  
  // Process shuffle library action
  processShuffleLibrary(state, action) {
    const { playerId } = action.payload;
    const player = state.players.find(p => p.id === playerId);
    
    if (!player) return false;
    
    // Fisher-Yates shuffle algorithm
    for (let i = player.library.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [player.library[i], player.library[j]] = [player.library[j], player.library[i]];
    }
    
    this.setGameState(state);
    return true;
  }
  
  // Process move to library action
  processMoveToLibrary(state, action) {
    const { playerId, cardId, sourceZone, position } = action.payload;
    const player = state.players.find(p => p.id === playerId);
    
    if (!player || !player[sourceZone]) return false;
    
    // Find the card in source zone
    const cardIndex = player[sourceZone].findIndex(card => card.id === cardId);
    if (cardIndex === -1) return false;
    
    // Remove from source zone
    const [card] = player[sourceZone].splice(cardIndex, 1);
    
    // Add to library based on position
    if (position === 'bottom') {
      player.library.push(card);
    } else {
      // Default to top
      player.library.unshift(card);
    }
    
    this.setGameState(state);
    return true;
  }
  
  // Handle data received from peers
  handlePeerData(data, fromPeerId) {
    if (!data || !data.type) return;
    
    switch (data.type) {
      case 'game-state':
        this.handleGameStateUpdate(data.state, fromPeerId);
        break;
      
      case 'game-action':
        this.handlePeerAction(data.action, fromPeerId);
        break;
      
      case 'action-vote':
        this.handleActionVote(data.actionId, fromPeerId, data.approved);
        break;
      
      case 'state-hash-check':
        this.handleStateHashCheck(data.stateHash, fromPeerId);
        break;
      
      case 'request-full-state':
        this.sendFullState(fromPeerId);
        break;
    }
  }
  
  // Handle game state update from a peer
  handleGameStateUpdate(state, fromPeerId) {
    // Only accept state updates if we don't have a state yet
    // or if the received state is newer than ours
    if (!this.gameState || state.version > this.gameState.version) {
      console.log(`Accepting game state update from peer ${fromPeerId}`);
      this.setGameState(state);
    }
  }
  
  // Handle action received from a peer
  handlePeerAction(action, fromPeerId) {
    console.log(`Received action from peer ${fromPeerId}:`, action);
    
    // Check if we already have this action pending
    if (this.pendingActions.has(action.id)) {
      // Add vote for this action
      this.addVoteForAction(action.id, fromPeerId, true);
    } else {
      // Apply the action locally
      const success = this.processAction(action);
      
      if (success) {
        // Add to pending actions and vote for it
        this.addPendingAction(action);
        this.addVoteForAction(action.id, fromPeerId, true);
        
        // Broadcast our vote
        this.p2pManager.broadcast({
          type: 'action-vote',
          actionId: action.id,
          approved: true
        });
      } else {
        // Reject the action
        this.p2pManager.broadcast({
          type: 'action-vote',
          actionId: action.id,
          approved: false
        });
      }
    }
  }
  
  // Handle vote for an action
  handleActionVote(actionId, fromPeerId, approved) {
    this.addVoteForAction(actionId, fromPeerId, approved);
  }
  
  // Add a pending action for consensus
  addPendingAction(action) {
    this.pendingActions.set(action.id, {
      action,
      votes: new Map(),
      timestamp: Date.now()
    });
    
    // Add our own vote
    this.addVoteForAction(action.id, this.userId, true);
    
    // Check for consensus after a short delay
    setTimeout(() => this.checkActionConsensus(action.id), 500);
  }
  
  // Add a vote for an action
  addVoteForAction(actionId, peerId, approved) {
    const pendingAction = this.pendingActions.get(actionId);
    if (!pendingAction) return;
    
    pendingAction.votes.set(peerId, approved);
    
    // Check for consensus
    this.checkActionConsensus(actionId);
  }
  
  // Check if there's consensus for an action
  checkActionConsensus(actionId) {
    const pendingAction = this.pendingActions.get(actionId);
    if (!pendingAction) return;
    
    const { votes } = pendingAction;
    const totalVotes = votes.size;
    const approvedVotes = Array.from(votes.values()).filter(v => v).length;
    const rejectedVotes = totalVotes - approvedVotes;
    
    const connectedPeers = this.p2pManager.getConnectedPeers().length;
    const totalPlayers = connectedPeers + 1; // +1 for ourselves
    
    // Check if we have enough votes for consensus
    if (totalVotes >= totalPlayers * this.consensusThreshold) {
      if (approvedVotes > rejectedVotes) {
        console.log(`Action ${actionId} approved by consensus`);
        // Action is already applied, just remove from pending
        this.pendingActions.delete(actionId);
      } else {
        console.log(`Action ${actionId} rejected by consensus`);
        // Rollback the action if it was applied
        this.rollbackAction(actionId);
        this.pendingActions.delete(actionId);
      }
    }
    
    // Clean up old pending actions
    this.cleanupPendingActions();
  }
  
  // Rollback an action that was rejected by consensus
  rollbackAction(actionId) {
    // Find the action in the log
    const actionIndex = this.actionLog.findIndex(log => log.id === actionId);
    if (actionIndex === -1) return;
    
    // Find the state before this action
    const prevStateIndex = this.stateHistory.findIndex(
      history => history.timestamp > this.actionLog[actionIndex].appliedAt
    ) - 1;
    
    if (prevStateIndex >= 0) {
      console.log(`Rolling back to state before action ${actionId}`);
      this.setGameState(this.stateHistory[prevStateIndex].state);
      
      // Remove the action from the log
      this.actionLog.splice(actionIndex, 1);
      
      // Reapply all subsequent actions
      for (let i = actionIndex; i < this.actionLog.length; i++) {
        this.processAction(this.actionLog[i]);
      }
    }
  }
  
  // Clean up old pending actions
  cleanupPendingActions() {
    const now = Date.now();
    this.pendingActions.forEach((pendingAction, actionId) => {
      // Remove actions older than 10 seconds
      if (now - pendingAction.timestamp > 10000) {
        this.pendingActions.delete(actionId);
      }
    });
  }
  
  // Handle state hash check from a peer
  handleStateHashCheck(stateHash, fromPeerId) {
    if (!this.gameState) return;
    
    const ourStateHash = this.calculateStateHash();
    
    if (ourStateHash !== stateHash) {
      console.log(`State hash mismatch with peer ${fromPeerId}`);
      // Request full state from the peer
      this.p2pManager.sendToPeer(fromPeerId, {
        type: 'request-full-state'
      });
    }
  }
  
  // Send full state to a peer
  sendFullState(peerId) {
    if (!this.gameState) return;
    
    this.p2pManager.sendToPeer(peerId, {
      type: 'game-state',
      state: this.gameState
    });
  }
  
  // Calculate hash of current game state for comparison
  calculateStateHash() {
    if (!this.gameState) return null;
    
    // Create a simplified version of the state for hashing
    const hashableState = {
      version: this.gameState.version,
      activePlayer: this.gameState.activePlayer,
      phase: this.gameState.phase,
      turn: this.gameState.turn,
      players: this.gameState.players.map(p => ({
        id: p.id,
        life: p.life,
        handCount: p.hand.length,
        libraryCount: p.library.length,
        graveyardCount: p.graveyard.length,
        exileCount: p.exile.length,
        battlefield: p.battlefield.map(card => card.id)
      }))
    };
    
    return sha256(JSON.stringify(hashableState));
  }
  
  // Broadcast current game state to all peers
  broadcastGameState() {
    if (!this.gameState) return;
    
    this.p2pManager.broadcast({
      type: 'game-state',
      state: this.gameState
    });
  }
  
  // Periodically check state consistency with peers
  startStateConsistencyChecks(interval = 5000) {
    this.consistencyCheckInterval = setInterval(() => {
      if (!this.gameState) return;
      
      const stateHash = this.calculateStateHash();
      this.p2pManager.broadcast({
        type: 'state-hash-check',
        stateHash
      });
    }, interval);
  }
  
  // Stop consistency checks
  stopStateConsistencyChecks() {
    if (this.consistencyCheckInterval) {
      clearInterval(this.consistencyCheckInterval);
    }
  }
  
  // Handle connection events
  handleConnectionEvent(event, data) {
    if (event === 'peer-connected') {
      console.log(`Peer ${data} connected, sending current game state`);
      if (this.gameState) {
        this.sendFullState(data);
      }
    }
  }
  
  // Add a listener for state changes
  addStateListener(callback) {
    this.stateListeners.add(callback);
    return () => this.stateListeners.delete(callback);
  }
  
  // Notify all state listeners
  notifyStateListeners() {
    if (!this.gameState) return;
    
    const stateClone = JSON.parse(JSON.stringify(this.gameState));
    this.stateListeners.forEach(callback => {
      try {
        callback(stateClone);
      } catch (err) {
        console.error('Error in state listener:', err);
      }
    });
  }
  
  // Clean up resources
  cleanup() {
    this.stopStateConsistencyChecks();
  }
}

export default GameStateManager;
