import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useGame } from '../contexts/GameContext';

const GameLobby = () => {
  const { gameId } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [gameData, setGameData] = useState(null);
  const [inviteLink, setInviteLink] = useState('');
  const [deckText, setDeckText] = useState(localStorage.getItem('userDeck') || '');
  const [showDeckModal, setShowDeckModal] = useState(!localStorage.getItem('userDeck'));
  const [copySuccess, setCopySuccess] = useState('');
  
  const { currentUser, getAuthHeader } = useAuth();
  const { joinGame, startGame } = useGame();
  const navigate = useNavigate();

  // Fetch game data
  useEffect(() => {
    const fetchGameData = async () => {
      try {
        setLoading(true);
        const response = await fetch(`http://localhost:5000/api/games/${gameId}`, getAuthHeader());
        
        if (!response.ok) {
          throw new Error('Game not found');
        }
        
        const data = await response.json();
        setGameData(data);
        
        // Generate invite link
        const inviteResponse = await fetch(`http://localhost:5000/api/games/${gameId}/invite`, getAuthHeader());
        const inviteData = await inviteResponse.json();
        setInviteLink(inviteData.inviteLink);
      } catch (error) {
        console.error('Error fetching game data:', error);
        setError(error.message || 'Failed to load game data');
      } finally {
        setLoading(false);
      }
    };

    if (gameId) {
      fetchGameData();
    }
  }, [gameId, getAuthHeader]);

  const handleStartGame = async () => {
    try {
      setLoading(true);
      await startGame(gameId);
      navigate(`/game/${gameId}`);
    } catch (error) {
      console.error('Error starting game:', error);
      setError(error.message || 'Failed to start game');
      setLoading(false);
    }
  };

  const handleJoinGame = async () => {
    try {
      setLoading(true);
      
      // Join the game if not already joined
      if (!gameData.players.some(player => player.id === currentUser.id)) {
        const response = await fetch(`http://localhost:5000/api/games/${gameId}/join`, {
          method: 'POST',
          headers: getAuthHeader().headers
        });
        
        if (!response.ok) {
          throw new Error('Failed to join game');
        }
        
        const updatedGame = await response.json();
        setGameData(updatedGame);
      }
      
      // Check if deck is imported
      if (!deckText) {
        setShowDeckModal(true);
        setLoading(false);
        return;
      }
      
      // Initialize P2P connection
      await joinGame(gameId);
      
      // Navigate to game room if game has started
      if (gameData.status === 'in-progress') {
        navigate(`/game/${gameId}`);
      }
    } catch (error) {
      console.error('Error joining game:', error);
      setError(error.message || 'Failed to join game');
      setLoading(false);
    }
  };

  const handleDeckSubmit = (e) => {
    e.preventDefault();
    localStorage.setItem('userDeck', deckText);
    setShowDeckModal(false);
    
    // If already in a game, join it
    if (gameData && gameData.players.some(player => player.id === currentUser.id)) {
      handleJoinGame();
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(inviteLink)
      .then(() => {
        setCopySuccess('Copied!');
        setTimeout(() => setCopySuccess(''), 2000);
      })
      .catch(err => {
        console.error('Failed to copy:', err);
      });
  };

  if (loading && !gameData) {
    return (
      <div className="min-h-screen bg-bg-primary flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent"></div>
      </div>
    );
  }

  if (error && !gameData) {
    return (
      <div className="min-h-screen bg-bg-primary flex justify-center items-center">
        <div className="bg-red-500 text-white p-6 rounded-lg max-w-md">
          <h2 className="text-xl font-bold mb-4">Error</h2>
          <p>{error}</p>
          <button
            onClick={() => navigate('/')}
            className="btn-primary mt-4"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary">
      {/* Header */}
      <header className="bg-bg-secondary shadow-md">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-accent">MTG Multiplayer</h1>
          <button
            onClick={() => navigate('/')}
            className="btn-secondary text-sm"
          >
            Back to Home
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {error && (
          <div className="bg-red-500 text-white p-3 rounded mb-6">
            {error}
          </div>
        )}

        <div className="bg-bg-secondary rounded-lg shadow-lg overflow-hidden">
          <div className="p-6">
            <h2 className="text-2xl font-bold mb-4">{gameData.name}</h2>
            
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-2">Players ({gameData.players.length}/{gameData.maxPlayers})</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {gameData.players.map(player => (
                  <div 
                    key={player.id} 
                    className={`p-3 rounded-lg ${player.id === gameData.host ? 'bg-bg-tertiary' : 'bg-gray-800'}`}
                  >
                    <div className="flex items-center">
                      <div className="w-3 h-3 rounded-full bg-green-500 mr-2"></div>
                      <span>{player.username || 'Player'}</span>
                      {player.id === gameData.host && (
                        <span className="ml-2 text-xs bg-accent text-white px-2 py-1 rounded">Host</span>
                      )}
                      {player.id === currentUser.id && (
                        <span className="ml-2 text-xs bg-blue-500 text-white px-2 py-1 rounded">You</span>
                      )}
                    </div>
                  </div>
                ))}
                
                {/* Empty slots */}
                {Array.from({ length: gameData.maxPlayers - gameData.players.length }).map((_, index) => (
                  <div key={`empty-${index}`} className="p-3 rounded-lg bg-gray-800 opacity-50">
                    <div className="flex items-center">
                      <div className="w-3 h-3 rounded-full bg-gray-500 mr-2"></div>
                      <span>Waiting for player...</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Invite Link */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-2">Invite Friends</h3>
              <div className="flex">
                <input
                  type="text"
                  value={inviteLink}
                  readOnly
                  className="input-field flex-grow"
                />
                <button
                  onClick={copyToClipboard}
                  className="btn-primary ml-2"
                >
                  {copySuccess || 'Copy'}
                </button>
              </div>
            </div>
            
            <div className="flex justify-end space-x-4">
              {/* Show Join button if not in the game */}
              {!gameData.players.some(player => player.id === currentUser.id) && (
                <button
                  onClick={handleJoinGame}
                  className="btn-primary"
                  disabled={loading || gameData.players.length >= gameData.maxPlayers}
                >
                  {loading ? 'Joining...' : 'Join Game'}
                </button>
              )}
              
              {/* Show Start button if user is host */}
              {gameData.host === currentUser.id && (
                <button
                  onClick={handleStartGame}
                  className="btn-primary"
                  disabled={loading || gameData.players.length < 2}
                >
                  {loading ? 'Starting...' : 'Start Game'}
                </button>
              )}
              
              {/* Show Enter button if already in the game and not host */}
              {gameData.players.some(player => player.id === currentUser.id) && 
               gameData.host !== currentUser.id && (
                <button
                  onClick={handleJoinGame}
                  className="btn-primary"
                  disabled={loading}
                >
                  {loading ? 'Entering...' : 'Enter Game Room'}
                </button>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Deck Input Modal */}
      {showDeckModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-bg-secondary rounded-lg p-8 max-w-md w-full">
            <h2 className="text-xl font-semibold mb-4">Import Your Deck</h2>
            <form onSubmit={handleDeckSubmit}>
              <div className="form-group">
                <label htmlFor="deckText" className="form-label">
                  Paste your deck list (one card per line, format: "1 Card Name")
                </label>
                <textarea
                  id="deckText"
                  className="input-field h-64"
                  value={deckText}
                  onChange={(e) => setDeckText(e.target.value)}
                  placeholder="10 Forest
1 Black Lotus
..."
                  required
                ></textarea>
              </div>
              
              <div className="flex justify-end space-x-4 mt-6">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setShowDeckModal(false);
                    navigate('/');
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                >
                  Import Deck
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default GameLobby;
