// GameContext.js
// React context for game state management

import React, { createContext, useContext, useEffect, useState } from 'react';
import P2PConnectionManager from './P2PConnectionManager';
import GameStateManager from './GameStateManager';
import SignalingService from './SignalingService';
import ScryfallService from './ScryfallService';
import { v4 as uuidv4 } from 'uuid';

// Create contexts
const GameContext = createContext(null);
const GameActionsContext = createContext(null);

// Custom hook to use game state
export const useGameState = () => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGameState must be used within a GameProvider');
  }
  return context;
};

// Custom hook to use game actions
export const useGameActions = () => {
  const context = useContext(GameActionsContext);
  if (!context) {
    throw new Error('useGameActions must be used within a GameProvider');
  }
  return context;
};

// Game provider component
export const GameProvider = ({ children, userId, gameId, signalingServerUrl }) => {
  // Generate a user ID if not provided
  const actualUserId = userId || uuidv4();
  // Generate a game ID if not provided
  const actualGameId = gameId || uuidv4();
  
  // State for game data
  const [gameState, setGameState] = useState(null);
  const [players, setPlayers] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Create services
  const [services] = useState(() => {
    // Create signaling service
    const signaling = new SignalingService(
      signalingServerUrl || 'wss://signaling.example.com',
      actualUserId,
      actualGameId
    );
    
    // Create P2P connection manager
    const p2pManager = new P2PConnectionManager(actualUserId, signaling);
    
    // Create game state manager
    const gameManager = new GameStateManager(p2pManager, actualUserId);
    
    // Create Scryfall service
    const scryfallService = new ScryfallService();
    
    return {
      signaling,
      p2pManager,
      gameManager,
      scryfallService
    };
  });
  
  // Initialize connection and game state
  useEffect(() => {
    const initializeGame = async () => {
      try {
        setIsLoading(true);
        
        // Connect to signaling server
        await services.signaling.connect();
        
        // Listen for game state changes
        const removeStateListener = services.gameManager.addStateListener((newState) => {
          setGameState(newState);
          if (newState) {
            setPlayers(newState.players);
          }
        });
        
        // Listen for connection events
        const removeConnectionListener = services.p2pManager.addConnectionListener((event, data) => {
          if (event === 'peer-connected') {
            setIsConnected(true);
          } else if (event === 'peer-disconnected') {
            // Check if we still have any connections
            const connectedPeers = services.p2pManager.getConnectedPeers();
            setIsConnected(connectedPeers.length > 0);
          }
        });
        
        // Start state consistency checks
        services.gameManager.startStateConsistencyChecks();
        
        setIsLoading(false);
        
        // Cleanup function
        return () => {
          removeStateListener();
          removeConnectionListener();
          services.gameManager.cleanup();
          services.p2pManager.disconnectAll();
        };
      } catch (err) {
        console.error('Failed to initialize game:', err);
        setError(err.message);
        setIsLoading(false);
      }
    };
    
    initializeGame();
  }, [services, actualUserId, actualGameId]);
  
  // Game action methods
  const gameActions = {
    // Initialize a new game
    initializeGame: (playerList, config) => {
      return services.gameManager.initializeGameState(playerList, config);
    },
    
    // Apply an action to the game state
    applyAction: (action) => {
      return services.gameManager.applyAction(action);
    },
    
    // Draw cards
    drawCard: (playerId, count = 1) => {
      return services.gameManager.applyAction({
        type: 'draw-card',
        payload: { playerId, count }
      });
    },
    
    // Play a card from hand to battlefield
    playCard: (playerId, cardId, targetZone = 'battlefield') => {
      return services.gameManager.applyAction({
        type: 'play-card',
        payload: { playerId, cardId, targetZone }
      });
    },
    
    // Move a card between zones
    moveCard: (playerId, cardId, sourceZone, targetZone) => {
      return services.gameManager.applyAction({
        type: 'move-card',
        payload: { playerId, cardId, sourceZone, targetZone }
      });
    },
    
    // Update player life total
    updateLife: (playerId, delta) => {
      return services.gameManager.applyAction({
        type: 'update-life',
        payload: { playerId, delta }
      });
    },
    
    // Change game phase
    changePhase: (phase) => {
      return services.gameManager.applyAction({
        type: 'change-phase',
        payload: { phase }
      });
    },
    
    // Move to next turn
    nextTurn: () => {
      return services.gameManager.applyAction({
        type: 'next-turn',
        payload: {}
      });
    },
    
    // Add counter to a card
    addCounter: (playerId, cardId, counterType, count = 1) => {
      return services.gameManager.applyAction({
        type: 'add-counter',
        payload: { playerId, cardId, counterType, count }
      });
    },
    
    // Remove counter from a card
    removeCounter: (playerId, cardId, counterType, count = 1) => {
      return services.gameManager.applyAction({
        type: 'remove-counter',
        payload: { playerId, cardId, counterType, count }
      });
    },
    
    // Create a token
    createToken: (playerId, tokenData) => {
      return services.gameManager.applyAction({
        type: 'create-token',
        payload: { playerId, tokenData }
      });
    },
    
    // Import a deck from text format
    importDeck: async (deckText) => {
      try {
        return await services.scryfallService.parseDeckList(deckText);
      } catch (err) {
        console.error('Error importing deck:', err);
        throw err;
      }
    },
    
    // Get card data from Scryfall
    getCardData: async (cardName) => {
      try {
        return await services.scryfallService.getCardByName(cardName);
      } catch (err) {
        console.error(`Error fetching card "${cardName}":`, err);
        throw err;
      }
    }
  };
  
  // Context value for game state
  const gameContextValue = {
    gameState,
    players,
    currentPlayer: players.find(p => p.id === actualUserId),
    isConnected,
    isLoading,
    error,
    userId: actualUserId,
    gameId: actualGameId
  };
  
  return (
    <GameContext.Provider value={gameContextValue}>
      <GameActionsContext.Provider value={gameActions}>
        {children}
      </GameActionsContext.Provider>
    </GameContext.Provider>
  );
};

export default GameContext;
