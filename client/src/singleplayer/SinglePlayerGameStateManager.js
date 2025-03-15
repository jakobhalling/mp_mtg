// SinglePlayerGameStateManager.js
// This is a modified version of GameStateManager.js for single player mode
// It manages game state locally without consensus mechanism

import { v4 as uuidv4 } from 'uuid';

class SinglePlayerGameStateManager {
  constructor(p2pConnectionManager, userId) {
    this.p2pManager = p2pConnectionManager;
    this.userId = userId;
    this.gameState = null;
    this.stateHistory = []; // History of game states for rollback if needed
    this.actionLog = []; // Log of all actions for debugging
    this.stateListeners = new Set(); // Callbacks for state changes
    
    // Listen for data from "peers" (which in single player mode is just simulated)
    this.p2pManager.addDataListener(this.handlePeerData.bind(this));
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
    
    // In single player mode, we don't need to broadcast the state
    // but we'll keep the method for API compatibility
    this.broadcastGameState();
    
    return initialState;
  }
  
  // Set the current game state and notify listeners
  setGameState(newState) {
    // Store previous state in history
    if (this.gameState) {
      this.stateHistory.push({
        state: this.gameState,
        timestamp: Date.now()
      });
      
      // Limit history size
      if (this.stateHistory.length > 20) {
        this.stateHistory.shift();
      }
    }
    
    this.gameState = newState;
    this.notifyStateListeners();
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
      // In single player mode, we don't need consensus
      // but we'll keep the broadcast for API compatibility
      this.p2pManager.broadcast({
        type: 'game-action',
        action: actionWithId
      });
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
    if (!card) return false;
    
    // Check if card has counters
    if (!card.counters || !card.counters[counterType]) return false;
    
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
      id: uuidv4(),
      ...tokenData,
      isToken: true
    };
    
    // Add to battlefield
    player.battlefield.push(token);
    
    this.setGameState(state);
    return true;
  }
  
  // Handle data from peers - in single player, this is mostly for API compatibility
  handlePeerData(data, fromPeerId) {
    if (!data || !data.type) return;
    
    // In single player mode, we don't need to handle most peer data
    // but we'll keep the method for API compatibility
    console.log(`Single player mode: Received ${data.type} from virtual peer`);
  }
  
  // Broadcast game state - in single player, this is a no-op
  broadcastGameState() {
    console.log('Single player mode: No need to broadcast game state');
    return true;
  }
  
  // Add a listener for state changes
  addStateListener(callback) {
    this.stateListeners.add(callback);
    return () => this.stateListeners.delete(callback);
  }
  
  // Notify all state listeners
  notifyStateListeners() {
    this.stateListeners.forEach(callback => {
      try {
        callback(this.gameState);
      } catch (err) {
        console.error('Error in state listener:', err);
      }
    });
  }
  
  // Start state consistency checks - in single player, this is a no-op
  startStateConsistencyChecks() {
    console.log('Single player mode: No need for state consistency checks');
    return true;
  }
  
  // Cleanup resources
  cleanup() {
    console.log('Single player mode: Cleaning up game state manager');
    this.stateListeners.clear();
  }
}

export default SinglePlayerGameStateManager;
