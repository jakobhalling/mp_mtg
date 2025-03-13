import React, { createContext, useContext, useState, useEffect } from 'react';
import io from 'socket.io-client';
import { v4 as uuidv4 } from 'uuid';
import { useAuth } from './AuthContext';
import P2PConnectionManager from '../p2p/P2PConnectionManager';
import GameStateManager from '../p2p/GameStateManager';
import ScryfallService from '../p2p/ScryfallService';

const GameContext = createContext();

export function useGame() {
  return useContext(GameContext);
}

export function GameProvider({ children }) {
  const { currentUser, getAuthHeader } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [gameData, setGameData] = useState(null);
  const [gameState, setGameState] = useState(null);
  const [players, setPlayers] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [socket, setSocket] = useState(null);
  const [p2pManager, setP2pManager] = useState(null);
  const [gameManager, setGameManager] = useState(null);
  const [scryfallService, setScryfallService] = useState(null);

  // API URL from environment variable
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
  const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';


  // Initialize socket connection
  useEffect(() => {
    if (!currentUser) return;

    const token = localStorage.getItem('token');
    const newSocket = io(SOCKET_URL);

    newSocket.on('connect', () => {
      console.log('Connected to socket server');
      
      // Authenticate socket
      newSocket.emit('authenticate', { token });
    });

    newSocket.on('authenticated', ({ userId }) => {
      console.log('Socket authenticated for user', userId);
    });

    newSocket.on('authentication_error', ({ message }) => {
      console.error('Socket authentication error:', message);
      setError('Authentication error: ' + message);
    });

    setSocket(newSocket);

    // Initialize Scryfall service
    const newScryfallService = new ScryfallService();
    setScryfallService(newScryfallService);

    return () => {
      newSocket.disconnect();
    };
  }, [currentUser, SOCKET_URL]);

  // Initialize game connection when joining a game
  const joinGame = async (gameId) => {
    try {
      setLoading(true);
      setError('');

      // Get game data from server
      const response = await fetch(`${API_URL}/games/${gameId}`, getAuthHeader());
      const data = await response.json();
      
      if (!data) {
        throw new Error('Game not found');
      }

      setGameData(data);

      // Join game room via socket
      socket.emit('join-game', {
        gameId,
        userId: currentUser.id
      });

      // Initialize P2P connection manager
      const newP2pManager = new P2PConnectionManager(currentUser.id, socket);
      setP2pManager(newP2pManager);

      // Initialize game state manager
      const newGameManager = new GameStateManager(newP2pManager, currentUser.id);
      setGameManager(newGameManager);

      // Listen for game state changes
      const removeStateListener = newGameManager.addStateListener((newState) => {
        setGameState(newState);
        if (newState) {
          setPlayers(newState.players);
        }
      });

      // Listen for connection events
      const removeConnectionListener = newP2pManager.addConnectionListener((event, data) => {
        if (event === 'peer-connected') {
          setIsConnected(true);
        } else if (event === 'peer-disconnected') {
          // Check if we still have any connections
          const connectedPeers = newP2pManager.getConnectedPeers();
          setIsConnected(connectedPeers.length > 0);
        }
      });

      // Start state consistency checks
      newGameManager.startStateConsistencyChecks();

      setLoading(false);

      return () => {
        removeStateListener();
        removeConnectionListener();
        newGameManager.cleanup();
        newP2pManager.disconnectAll();
      };
    } catch (error) {
      console.error('Failed to join game:', error);
      setError(error.message || 'Failed to join game');
      setLoading(false);
      throw error;
    }
  };

  // Create a new game
  const createGame = async (name, maxPlayers = 4) => {
    try {
      setLoading(true);
      setError('');

      const response = await fetch(`${API_URL}/games`, {
        method: 'POST',
        headers: {
          ...getAuthHeader().headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name,
          maxPlayers
        })
      });

      const data = await response.json();
      setLoading(false);
      return data;
    } catch (error) {
      console.error('Failed to create game:', error);
      setError(error.message || 'Failed to create game');
      setLoading(false);
      throw error;
    }
  };

  // Get available games
  const getAvailableGames = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await fetch(`${API_URL}/games`, getAuthHeader());
      const data = await response.json();
      
      setLoading(false);
      return data;
    } catch (error) {
      console.error('Failed to get available games:', error);
      setError(error.message || 'Failed to get available games');
      setLoading(false);
      throw error;
    }
  };

  // Start a game
  const startGame = async (gameId) => {
    try {
      setLoading(true);
      setError('');

      const response = await fetch(`${API_URL}/games/${gameId}/start`, {
        method: 'POST',
        headers: getAuthHeader().headers
      });

      const data = await response.json();
      
      // Initialize game state
      if (gameManager) {
        const players = data.players.map(player => ({
          id: player.id,
          name: player.username,
          isCurrentPlayer: player.id === currentUser.id
        }));

        gameManager.initializeGameState(players);
      }

      setLoading(false);
      return data;
    } catch (error) {
      console.error('Failed to start game:', error);
      setError(error.message || 'Failed to start game');
      setLoading(false);
      throw error;
    }
  };

  // Generate invite link
  const generateInviteLink = async (gameId) => {
    try {
      setError('');

      const response = await fetch(`${API_URL}/games/${gameId}/invite`, getAuthHeader());
      const data = await response.json();
      
      return data.inviteLink;
    } catch (error) {
      console.error('Failed to generate invite link:', error);
      setError(error.message || 'Failed to generate invite link');
      throw error;
    }
  };

  // Import deck
  const importDeck = async (deckText) => {
    try {
      setError('');
      
      if (!scryfallService) {
        throw new Error('Scryfall service not initialized');
      }

      return await scryfallService.parseDeckList(deckText);
    } catch (error) {
      console.error('Error importing deck:', error);
      setError(error.message || 'Error importing deck');
      throw error;
    }
  };

  // Game actions
  const gameActions = {
    // Draw cards
    drawCard: (playerId, count = 1) => {
      if (!gameManager) return false;
      return gameManager.applyAction({
        type: 'draw-card',
        payload: { playerId, count }
      });
    },
    
    // Play a card from hand to battlefield
    playCard: (playerId, cardId, targetZone = 'battlefield') => {
      if (!gameManager) return false;
      return gameManager.applyAction({
        type: 'play-card',
        payload: { playerId, cardId, targetZone }
      });
    },
    
    // Move a card between zones
    moveCard: (playerId, cardId, sourceZone, targetZone) => {
      if (!gameManager) return false;
      return gameManager.applyAction({
        type: 'move-card',
        payload: { playerId, cardId, sourceZone, targetZone }
      });
    },
    
    // Update player life total
    updateLife: (playerId, delta) => {
      if (!gameManager) return false;
      return gameManager.applyAction({
        type: 'update-life',
        payload: { playerId, delta }
      });
    },
    
    // Change game phase
    changePhase: (phase) => {
      if (!gameManager) return false;
      return gameManager.applyAction({
        type: 'change-phase',
        payload: { phase }
      });
    },
    
    // Move to next turn
    nextTurn: () => {
      if (!gameManager) return false;
      return gameManager.applyAction({
        type: 'next-turn',
        payload: {}
      });
    },
    
    // Add counter to a card
    addCounter: (playerId, cardId, counterType, count = 1) => {
      if (!gameManager) return false;
      return gameManager.applyAction({
        type: 'add-counter',
        payload: { playerId, cardId, counterType, count }
      });
    },
    
    // Remove counter from a card
    removeCounter: (playerId, cardId, counterType, count = 1) => {
      if (!gameManager) return false;
      return gameManager.applyAction({
        type: 'remove-counter',
        payload: { playerId, cardId, counterType, count }
      });
    },
    
    // Create a token
    createToken: (playerId, tokenData) => {
      if (!gameManager) return false;
      return gameManager.applyAction({
        type: 'create-token',
        payload: { playerId, tokenData }
      });
    }
  };

  const value = {
    gameData,
    gameState,
    players,
    currentPlayer: players.find(p => p.id === currentUser?.id),
    isConnected,
    loading,
    error,
    joinGame,
    createGame,
    getAvailableGames,
    startGame,
    generateInviteLink,
    importDeck,
    ...gameActions
  };

  return (
    <GameContext.Provider value={value}>
      {children}
    </GameContext.Provider>
  );
}

export default GameContext;
