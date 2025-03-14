import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
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
  const [socketInitialized, setSocketInitialized] = useState(false);
  const [offlineMode, setOfflineMode] = useState(false);
  const [p2pManager, setP2pManager] = useState(null);
  const [gameManager, setGameManager] = useState(null);
  const [scryfallService, setScryfallService] = useState(null);
  
  // Use refs to track socket connection attempts
  const socketRef = useRef(null);
  const connectionAttemptsRef = useRef(0);
  const maxConnectionAttempts = 10;
  const connectionTimeoutRef = useRef(null);

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

  // Initialize socket connection with transport fallback
  const initializeSocket = useCallback(() => {
    if (!currentUser) {
      console.log('No current user, skipping socket initialization');
      return null;
    }

    // Clear any existing connection timeout
    if (connectionTimeoutRef.current) {
      clearTimeout(connectionTimeoutRef.current);
      connectionTimeoutRef.current = null;
    }

    if (socketRef.current) {
      console.log('Socket already exists, cleaning up before reinitializing');
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    connectionAttemptsRef.current += 1;
    console.log(`Initializing socket connection to ${SOCKET_URL} (Attempt ${connectionAttemptsRef.current}/${maxConnectionAttempts})`);
    
    const token = localStorage.getItem('token');
    
    // Determine which transports to use based on connection attempts
    // Start with WebSocket only, then fall back to polling if needed
    let transports = ['websocket'];
    if (connectionAttemptsRef.current > 2) {
      console.log('Adding polling transport as fallback');
      transports = ['websocket', 'polling'];
    }
    if (connectionAttemptsRef.current > 5) {
      console.log('Trying polling transport only');
      transports = ['polling'];
    }
    
    // Create socket instance with more robust options
    try {
      const newSocket = io(SOCKET_URL, {
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
        timeout: 10000,
        autoConnect: true,
        forceNew: true,
        transports: transports,
        upgrade: connectionAttemptsRef.current <= 5, // Only try to upgrade to WebSocket in early attempts
        query: { token } // Send token as query parameter
      });

      socketRef.current = newSocket;

      // Socket connection event handlers
      newSocket.on('connect', () => {
        console.log('Connected to socket server with ID:', newSocket.id);
        setSocketConnected(true);
        setSocketInitialized(true);
        setOfflineMode(false);
        connectionAttemptsRef.current = 0; // Reset connection attempts on successful connection
        
        // Authenticate socket
        newSocket.emit('authenticate', { token });
      });

      newSocket.on('connect_error', (err) => {
        console.error('Socket connection error:', err.message);
        setError(`Socket connection error: ${err.message}`);
        setSocketConnected(false);
        
        // Retry connection if under max attempts
        if (connectionAttemptsRef.current < maxConnectionAttempts) {
          const retryDelay = Math.min(1000 * Math.pow(1.5, connectionAttemptsRef.current - 1), 10000);
          console.log(`Retrying socket connection in ${retryDelay/1000} seconds... (Attempt ${connectionAttemptsRef.current}/${maxConnectionAttempts})`);
          
          connectionTimeoutRef.current = setTimeout(() => {
            if (socketRef.current === newSocket) {
              initializeSocket();
            }
          }, retryDelay);
        } else {
          console.error(`Failed to connect after ${maxConnectionAttempts} attempts, switching to offline mode`);
          setError(`Unable to establish socket connection. Operating in offline mode with limited functionality.`);
          setOfflineMode(true);
        }
      });

      newSocket.on('disconnect', (reason) => {
        console.log('Socket disconnected:', reason);
        setSocketConnected(false);
        
        // Attempt to reconnect on certain disconnect reasons
        if (reason === 'io server disconnect' || reason === 'transport close') {
          console.log('Attempting to reconnect...');
          newSocket.connect();
        }
      });

      newSocket.on('reconnect', (attemptNumber) => {
        console.log(`Socket reconnected after ${attemptNumber} attempts`);
        setSocketConnected(true);
        setOfflineMode(false);
      });

      newSocket.on('reconnect_error', (err) => {
        console.error('Socket reconnection error:', err.message);
      });

      newSocket.on('reconnect_failed', () => {
        console.error('Socket reconnection failed, switching to offline mode');
        setOfflineMode(true);
      });

      newSocket.on('authenticated', ({ userId }) => {
        console.log('Socket authenticated for user', userId);
      });

      newSocket.on('authentication_error', ({ message }) => {
        console.error('Socket authentication error:', message);
        setError('Authentication error: ' + message);
      });

      setSocket(newSocket);
      
      return newSocket;
    } catch (err) {
      console.error('Error creating socket:', err);
      
      // Retry on socket creation error
      if (connectionAttemptsRef.current < maxConnectionAttempts) {
        const retryDelay = Math.min(1000 * Math.pow(1.5, connectionAttemptsRef.current - 1), 10000);
        console.log(`Error creating socket, retrying in ${retryDelay/1000} seconds... (Attempt ${connectionAttemptsRef.current}/${maxConnectionAttempts})`);
        
        connectionTimeoutRef.current = setTimeout(() => {
          initializeSocket();
        }, retryDelay);
      } else {
        console.error(`Failed to create socket after ${maxConnectionAttempts} attempts, switching to offline mode`);
        setError(`Unable to establish socket connection. Operating in offline mode with limited functionality.`);
        setOfflineMode(true);
      }
      
      return null;
    }
  }, [currentUser, SOCKET_URL]);

  // Initialize Scryfall service
  const initializeScryfallService = useCallback(() => {
    if (!scryfallService) {
      console.log('Initializing Scryfall service');
      const newScryfallService = new ScryfallService();
      setScryfallService(newScryfallService);
      return newScryfallService;
    }
    return scryfallService;
  }, [scryfallService]);

  // Initialize socket when component mounts or currentUser changes
  useEffect(() => {
    if (!currentUser) {
      setSocketInitialized(false);
      setSocketConnected(false);
      return;
    }
    
    console.log('Current user changed, initializing socket');
    const newSocket = initializeSocket();
    
    // Initialize Scryfall service
    initializeScryfallService();
    
    // Cleanup function
    return () => {
      console.log('Cleaning up socket connection');
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
        connectionTimeoutRef.current = null;
      }
      
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [currentUser, initializeSocket, initializeScryfallService]);

  // Ensure socket is initialized before joining a game
  const ensureSocketConnection = useCallback(async (skipOfflineCheck = false) => {
    // If we're in offline mode and not skipping the check, don't try to connect
    if (offlineMode && !skipOfflineCheck) {
      console.log('Operating in offline mode, skipping socket connection');
      return null;
    }
    
    // If socket is already connected, return immediately
    if (socket && socketConnected) {
      console.log('Socket already connected');
      return socket;
    }
    
    console.log('Ensuring socket connection before proceeding');
    
    // If socket isn't initialized yet, initialize it
    if (!socketInitialized) {
      console.log('Socket not initialized, initializing now');
      const newSocket = initializeSocket();
      
      if (!newSocket) {
        console.error('Failed to initialize socket');
        if (connectionAttemptsRef.current >= maxConnectionAttempts) {
          setOfflineMode(true);
          throw new Error('Unable to establish socket connection after multiple attempts. Please check your network connection and try again.');
        }
        throw new Error('Failed to initialize socket connection. Please try again.');
      }
      
      // Wait for socket to connect with shorter timeout
      try {
        await new Promise((resolve, reject) => {
          // Set a timeout to avoid waiting indefinitely
          const timeout = setTimeout(() => {
            reject(new Error('Socket connection timeout'));
          }, 5000);
          
          const checkConnection = setInterval(() => {
            if (newSocket.connected) {
              clearTimeout(timeout);
              clearInterval(checkConnection);
              resolve();
            }
          }, 100);
          
          // Also listen for connect event
          newSocket.once('connect', () => {
            clearTimeout(timeout);
            clearInterval(checkConnection);
            resolve();
          });
          
          // Listen for connect_error event
          newSocket.once('connect_error', (err) => {
            clearTimeout(timeout);
            clearInterval(checkConnection);
            reject(new Error(`Socket connection error: ${err.message}`));
          });
        });
      } catch (error) {
        console.error('Socket connection failed:', error.message);
        
        // If we've tried too many times, switch to offline mode
        if (connectionAttemptsRef.current >= maxConnectionAttempts) {
          console.log('Maximum connection attempts reached, switching to offline mode');
          setOfflineMode(true);
          throw new Error('Unable to establish socket connection after multiple attempts. Switching to offline mode with limited functionality.');
        }
        
        throw error;
      }
    } else if (socket && !socketConnected) {
      console.log('Socket initialized but not connected, waiting for connection');
      
      // Wait for existing socket to connect with shorter timeout
      try {
        await new Promise((resolve, reject) => {
          // Set a timeout to avoid waiting indefinitely
          const timeout = setTimeout(() => {
            reject(new Error('Socket connection timeout'));
          }, 5000);
          
          const checkConnection = setInterval(() => {
            if (socket.connected) {
              clearTimeout(timeout);
              clearInterval(checkConnection);
              resolve();
            }
          }, 100);
          
          // Also listen for connect event
          socket.once('connect', () => {
            clearTimeout(timeout);
            clearInterval(checkConnection);
            resolve();
          });
          
          // Listen for connect_error event
          socket.once('connect_error', (err) => {
            clearTimeout(timeout);
            clearInterval(checkConnection);
            reject(new Error(`Socket connection error: ${err.message}`));
          });
        });
      } catch (error) {
        console.error('Socket connection failed:', error.message);
        
        // If we've tried too many times, switch to offline mode
        if (connectionAttemptsRef.current >= maxConnectionAttempts) {
          console.log('Maximum connection attempts reached, switching to offline mode');
          setOfflineMode(true);
          throw new Error('Unable to establish socket connection after multiple attempts. Switching to offline mode with limited functionality.');
        }
        
        // Try to reinitialize socket
        console.log('Attempting to reinitialize socket');
        initializeSocket();
        throw error;
      }
    }
    
    console.log('Socket connection ensured');
    return socket;
  }, [socket, socketConnected, socketInitialized, offlineMode, initializeSocket]);

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

      // Try to ensure socket connection, but don't fail if in offline mode
      let connectedSocket = null;
      try {
        console.log('Ensuring socket connection before joining game');
        connectedSocket = await ensureSocketConnection(true); // Try to connect even in offline mode
      } catch (socketError) {
        console.error('Socket connection failed:', socketError.message);
        // Continue in offline mode if socket connection fails
        setOfflineMode(true);
      }

      // If we have a socket connection, use it
      if (connectedSocket) {
        console.log('Joining game room via socket');
        // Join game room via socket
        connectedSocket.emit('join-game', {
          gameId,
          userId: currentUser.id
        });

        // Initialize P2P connection manager
        console.log('Initializing P2P connection manager');
        const newP2pManager = new P2PConnectionManager(currentUser.id, connectedSocket);
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
      } else {
        // Offline mode - create a basic game state
        console.log('Operating in offline mode, creating local game state');
        
        // Create a simple game state with just the current user
        const offlineGameState = {
          id: gameId,
          players: [{
            id: currentUser.id,
            name: currentUser.username,
            life: 20,
            isCurrentPlayer: true,
            hand: [],
            battlefield: [],
            graveyard: [],
            library: []
          }],
          currentPhase: 'main1',
          currentTurn: 1,
          currentPlayerId: currentUser.id
        };
        
        setGameState(offlineGameState);
        setPlayers(offlineGameState.players);
        setIsConnected(false);
        
        // Import deck if available
        try {
          const deckText = localStorage.getItem('userDeck');
          if (deckText) {
            // Make sure Scryfall service is initialized
            const scryfallSvc = initializeScryfallService();
            const importedDeck = await scryfallSvc.parseDeckList(deckText);
            
            // Update player's library with imported cards
            const updatedPlayers = [...offlineGameState.players];
            updatedPlayers[0].library = importedDeck.cards;
            
            setPlayers(updatedPlayers);
          }
        } catch (deckError) {
          console.error('Error importing deck in offline mode:', deckError);
        }
        
        setLoading(false);
        
        // Return a no-op cleanup function
        return () => {};
      }
    } catch (error) {
      console.error('Failed to join game:', error);
      setError(error.message || 'Failed to join game');
      setLoading(false);
      throw error;
    }
  }, [API_ENDPOINTS, currentUser, getAuthHeader, ensureSocketConnection, initializeScryfallService]);

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
      
      // Make sure Scryfall service is initialized
      const scryfallSvc = initializeScryfallService();
      return await scryfallSvc.parseDeckList(deckText);
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
      if (gameManager) {
        return gameManager.applyAction({
          type: 'draw-card',
          payload: { playerId, count }
        });
      } else if (offlineMode) {
        // Offline mode implementation
        setPlayers(prevPlayers => {
          const updatedPlayers = [...prevPlayers];
          const playerIndex = updatedPlayers.findIndex(p => p.id === playerId);
          
          if (playerIndex !== -1) {
            const player = {...updatedPlayers[playerIndex]};
            const drawnCards = player.library.slice(0, count);
            player.hand = [...player.hand, ...drawnCards];
            player.library = player.library.slice(count);
            updatedPlayers[playerIndex] = player;
          }
          
          return updatedPlayers;
        });
        return true;
      }
      return false;
    },
    
    // Play a card from hand to battlefield
    playCard: (playerId, cardId, targetZone = 'battlefield') => {
      if (gameManager) {
        return gameManager.applyAction({
          type: 'play-card',
          payload: { playerId, cardId, targetZone }
        });
      } else if (offlineMode) {
        // Offline mode implementation
        setPlayers(prevPlayers => {
          const updatedPlayers = [...prevPlayers];
          const playerIndex = updatedPlayers.findIndex(p => p.id === playerId);
          
          if (playerIndex !== -1) {
            const player = {...updatedPlayers[playerIndex]};
            const cardIndex = player.hand.findIndex(c => c.id === cardId);
            
            if (cardIndex !== -1) {
              const card = player.hand[cardIndex];
              player.hand = player.hand.filter((_, i) => i !== cardIndex);
              
              if (targetZone === 'battlefield') {
                player.battlefield = [...player.battlefield, card];
              } else if (targetZone === 'graveyard') {
                player.graveyard = [...player.graveyard, card];
              }
              
              updatedPlayers[playerIndex] = player;
            }
          }
          
          return updatedPlayers;
        });
        return true;
      }
      return false;
    },
    
    // Move a card between zones
    moveCard: (playerId, cardId, sourceZone, targetZone) => {
      if (gameManager) {
        return gameManager.applyAction({
          type: 'move-card',
          payload: { playerId, cardId, sourceZone, targetZone }
        });
      } else if (offlineMode) {
        // Offline mode implementation
        setPlayers(prevPlayers => {
          const updatedPlayers = [...prevPlayers];
          const playerIndex = updatedPlayers.findIndex(p => p.id === playerId);
          
          if (playerIndex !== -1) {
            const player = {...updatedPlayers[playerIndex]};
            
            // Find the card in the source zone
            const sourceCards = player[sourceZone] || [];
            const cardIndex = sourceCards.findIndex(c => c.id === cardId);
            
            if (cardIndex !== -1) {
              const card = sourceCards[cardIndex];
              
              // Remove from source zone
              player[sourceZone] = sourceCards.filter((_, i) => i !== cardIndex);
              
              // Add to target zone
              const targetCards = player[targetZone] || [];
              player[targetZone] = [...targetCards, card];
              
              updatedPlayers[playerIndex] = player;
            }
          }
          
          return updatedPlayers;
        });
        return true;
      }
      return false;
    },
    
    // Update player life total
    updateLife: (playerId, delta) => {
      if (gameManager) {
        return gameManager.applyAction({
          type: 'update-life',
          payload: { playerId, delta }
        });
      } else if (offlineMode) {
        // Offline mode implementation
        setPlayers(prevPlayers => {
          const updatedPlayers = [...prevPlayers];
          const playerIndex = updatedPlayers.findIndex(p => p.id === playerId);
          
          if (playerIndex !== -1) {
            const player = {...updatedPlayers[playerIndex]};
            player.life = (player.life || 20) + delta;
            updatedPlayers[playerIndex] = player;
          }
          
          return updatedPlayers;
        });
        return true;
      }
      return false;
    },
    
    // Change game phase
    changePhase: (phase) => {
      if (gameManager) {
        return gameManager.applyAction({
          type: 'change-phase',
          payload: { phase }
        });
      } else if (offlineMode) {
        // Offline mode implementation
        setGameState(prevState => ({
          ...prevState,
          currentPhase: phase
        }));
        return true;
      }
      return false;
    },
    
    // Move to next turn
    nextTurn: () => {
      if (gameManager) {
        return gameManager.applyAction({
          type: 'next-turn',
          payload: {}
        });
      } else if (offlineMode) {
        // Offline mode implementation
        setGameState(prevState => ({
          ...prevState,
          currentTurn: prevState.currentTurn + 1,
          currentPhase: 'untap'
        }));
        return true;
      }
      return false;
    },
    
    // Add counter to a card
    addCounter: (playerId, cardId, counterType, count = 1) => {
      if (gameManager) {
        return gameManager.applyAction({
          type: 'add-counter',
          payload: { playerId, cardId, counterType, count }
        });
      } else if (offlineMode) {
        // Simplified offline implementation
        return true;
      }
      return false;
    },
    
    // Remove counter from a card
    removeCounter: (playerId, cardId, counterType, count = 1) => {
      if (gameManager) {
        return gameManager.applyAction({
          type: 'remove-counter',
          payload: { playerId, cardId, counterType, count }
        });
      } else if (offlineMode) {
        // Simplified offline implementation
        return true;
      }
      return false;
    },
    
    // Create a token
    createToken: (playerId, tokenData) => {
      if (gameManager) {
        return gameManager.applyAction({
          type: 'create-token',
          payload: { playerId, tokenData }
        });
      } else if (offlineMode) {
        // Simplified offline implementation
        return true;
      }
      return false;
    }
  };

  const value = {
    gameData,
    gameState,
    players,
    currentPlayer: players.find(p => p.id === currentUser?.id),
    isConnected,
    socketConnected,
    socketInitialized,
    offlineMode,
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
