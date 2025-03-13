import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
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
  const [socketConnected, setSocketConnected] = useState(false);
  const [p2pManager, setP2pManager] = useState(null);
  const [gameManager, setGameManager] = useState(null);
  const [scryfallService, setScryfallService] = useState(null);

  // API URL from environment variable
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
  const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

  // Alternative API endpoints to try if primary ones fail
  const API_ENDPOINTS = {
    games: [
      `${API_URL}/games`,
      `${API_URL}/game`,
      `${SOCKET_URL}/api/games`,
      `${SOCKET_URL}/api/game`
    ],
    gameById: (gameId) => [
      `${API_URL}/games/${gameId}`,
      `${API_URL}/game/${gameId}`,
      `${SOCKET_URL}/api/games/${gameId}`,
      `${SOCKET_URL}/api/game/${gameId}`
    ],
    gameStart: (gameId) => [
      `${API_URL}/games/${gameId}/start`,
      `${API_URL}/game/${gameId}/start`,
      `${SOCKET_URL}/api/games/${gameId}/start`,
      `${SOCKET_URL}/api/game/${gameId}/start`
    ],
    gameInvite: (gameId) => [
      `${API_URL}/games/${gameId}/invite`,
      `${API_URL}/game/${gameId}/invite`,
      `${SOCKET_URL}/api/games/${gameId}/invite`,
      `${SOCKET_URL}/api/game/${gameId}/invite`
    ]
  };

  // Helper function to try multiple API endpoints
  const tryMultipleEndpoints = async (endpoints, fetchOptions) => {
    let lastError = null;
    
    for (const endpoint of endpoints) {
      try {
        console.log(`Trying API endpoint: ${endpoint}`);
        const response = await fetch(endpoint, fetchOptions);
        
        if (!response.ok) {
          console.warn(`Endpoint ${endpoint} returned status ${response.status}`);
          continue;
        }
        
        const data = await response.json();
        console.log(`Successfully fetched data from ${endpoint}`);
        return data;
      } catch (error) {
        console.error(`Error fetching from ${endpoint}:`, error.message);
        lastError = error;
      }
    }
    
    // If we get here, all endpoints failed
    throw lastError || new Error('All API endpoints failed');
  };

  // Initialize socket connection
  useEffect(() => {
    if (!currentUser) return;

    console.log('Initializing socket connection to:', SOCKET_URL);
    const token = localStorage.getItem('token');
    
    // Create socket instance
    const newSocket = io(SOCKET_URL, {
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 10000,
      autoConnect: true,
      forceNew: true
    });

    // Socket connection event handlers
    newSocket.on('connect', () => {
      console.log('Connected to socket server with ID:', newSocket.id);
      setSocketConnected(true);
      
      // Authenticate socket
      newSocket.emit('authenticate', { token });
    });

    newSocket.on('connect_error', (err) => {
      console.error('Socket connection error:', err.message);
      setError(`Socket connection error: ${err.message}`);
      setSocketConnected(false);
    });

    newSocket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      setSocketConnected(false);
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
      console.log('Cleaning up socket connection');
      if (newSocket) {
        newSocket.disconnect();
      }
    };
  }, [currentUser, SOCKET_URL]);

  // Initialize game connection when joining a game
  const joinGame = useCallback(async (gameId) => {
    try {
      setLoading(true);
      setError('');

      // Get game data from server using multiple endpoint fallbacks
      console.log(`Fetching game data for game ${gameId}`);
      const data = await tryMultipleEndpoints(
        API_ENDPOINTS.gameById(gameId),
        getAuthHeader()
      );
      
      if (!data) {
        throw new Error('Game not found');
      }

      setGameData(data);

      // Check if socket is available
      if (!socket) {
        console.error('Socket not initialized');
        throw new Error('Socket connection not established. Please try again.');
      }

      // Wait for socket to connect if it's not connected yet
      if (!socketConnected) {
        console.log('Socket not connected yet, waiting for connection...');
        
        // Create a promise that resolves when socket connects
        await new Promise((resolve, reject) => {
          // Set a timeout to avoid waiting indefinitely
          const timeout = setTimeout(() => {
            reject(new Error('Socket connection timeout'));
          }, 5000);
          
          // Listen for connect event
          const connectHandler = () => {
            clearTimeout(timeout);
            setSocketConnected(true);
            resolve();
          };
          
          socket.once('connect', connectHandler);
          
          // If socket is already connected, resolve immediately
          if (socket.connected) {
            clearTimeout(timeout);
            socket.off('connect', connectHandler);
            resolve();
          }
        });
      }

      console.log('Joining game room via socket');
      // Join game room via socket
      socket.emit('join-game', {
        gameId,
        userId: currentUser.id
      });

      // Initialize P2P connection manager
      console.log('Initializing P2P connection manager');
      const newP2pManager = new P2PConnectionManager(currentUser.id, socket);
      setP2pManager(newP2pManager);

      // Initialize game state manager
      console.log('Initializing game state manager');
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
  }, [API_ENDPOINTS, currentUser, getAuthHeader, socket, socketConnected]);

  // Create a new game
  const createGame = async (name, maxPlayers = 4) => {
    try {
      setLoading(true);
      setError('');

      const data = await tryMultipleEndpoints(
        API_ENDPOINTS.games,
        {
          method: 'POST',
          headers: {
            ...getAuthHeader().headers,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name,
            maxPlayers
          })
        }
      );

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

      const data = await tryMultipleEndpoints(
        API_ENDPOINTS.games,
        getAuthHeader()
      );
      
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

      const data = await tryMultipleEndpoints(
        API_ENDPOINTS.gameStart(gameId),
        {
          method: 'POST',
          headers: getAuthHeader().headers
        }
      );
      
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

      const data = await tryMultipleEndpoints(
        API_ENDPOINTS.gameInvite(gameId),
        getAuthHeader()
      );
      
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
    socketConnected,
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
