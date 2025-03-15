// SinglePlayerGameContext.js
// React context for single player game state management

import React, { createContext, useContext, useEffect, useState } from 'react';
import SinglePlayerConnectionManager from './SinglePlayerConnectionManager';
import SinglePlayerGameStateManager from './SinglePlayerGameStateManager';
import SinglePlayerSignalingService from './SinglePlayerSignalingService';
import ScryfallService from '../p2p/ScryfallService';
import { v4 as uuidv4 } from 'uuid';

// Create contexts
const SinglePlayerGameContext = createContext(null);
const SinglePlayerGameActionsContext = createContext(null);

// Custom hook to use game state
export const useSinglePlayerGameState = () => {
  const context = useContext(SinglePlayerGameContext);
  if (!context) {
    throw new Error('useSinglePlayerGameState must be used within a SinglePlayerGameProvider');
  }
  return context;
};

// Custom hook to use game actions
export const useSinglePlayerGameActions = () => {
  const context = useContext(SinglePlayerGameActionsContext);
  if (!context) {
    throw new Error('useSinglePlayerGameActions must be used within a SinglePlayerGameProvider');
  }
  return context;
};

// Single player game provider component
export const SinglePlayerGameProvider = ({ children, userId, gameId }) => {
  // Generate a user ID if not provided
  const actualUserId = userId || uuidv4();
  // Generate a game ID if not provided
  const actualGameId = gameId || `single-player-${uuidv4()}`;
  
  // State for game data
  const [gameState, setGameState] = useState(null);
  const [players, setPlayers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Create services
  const [services] = useState(() => {
    // Create signaling service (simulated for single player)
    const signaling = new SinglePlayerSignalingService(
      actualUserId,
      actualGameId
    );
    
    // Create connection manager (simulated for single player)
    const p2pManager = new SinglePlayerConnectionManager(actualUserId);
    
    // Create game state manager
    const gameManager = new SinglePlayerGameStateManager(p2pManager, actualUserId);
    
    // Create Scryfall service (reuse from original implementation)
    const scryfallService = new ScryfallService();
    
    return {
      signaling,
      p2pManager,
      gameManager,
      scryfallService
    };
  });
  
  // Initialize game state
  useEffect(() => {
    const initializeGame = async () => {
      try {
        setIsLoading(true);
        
        // Connect to simulated signaling server
        await services.signaling.connect();
        
        // Listen for game state changes
        const removeStateListener = services.gameManager.addStateListener((newState) => {
          setGameState(newState);
          if (newState) {
            setPlayers(newState.players);
          }
        });
        
        setIsLoading(false);
        
        // Cleanup function
        return () => {
          removeStateListener();
          services.gameManager.cleanup();
          services.p2pManager.disconnectAll();
        };
      } catch (err) {
        console.error('Failed to initialize single player game:', err);
        setError(err.message);
        setIsLoading(false);
      }
    };
    
    initializeGame();
  }, [services, actualUserId, actualGameId]);
  
  // Game action methods
  const gameActions = {
    // Initialize a new game with a player and AI opponents
    initializeGame: (playerConfig, opponentCount = 1) => {
      // Create player list with user as first player
      const playerList = [
        {
          id: actualUserId,
          name: playerConfig.name || 'Player',
          deck: playerConfig.deck || [],
          commander: playerConfig.commander || null
        }
      ];
      
      // Add AI opponents
      for (let i = 0; i < opponentCount; i++) {
        playerList.push({
          id: `ai-opponent-${i + 1}`,
          name: `Opponent ${i + 1}`,
          deck: [], // Empty deck for now, can be populated with random cards later
          commander: null
        });
      }
      
      return services.gameManager.initializeGameState(playerList, {
        singlePlayer: true,
        aiOpponents: opponentCount
      });
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
    isLoading,
    error,
    userId: actualUserId,
    gameId: actualGameId,
    singlePlayer: true
  };
  
  return (
    <SinglePlayerGameContext.Provider value={gameContextValue}>
      <SinglePlayerGameActionsContext.Provider value={gameActions}>
        {children}
      </SinglePlayerGameActionsContext.Provider>
    </SinglePlayerGameContext.Provider>
  );
};

export default SinglePlayerGameContext;
