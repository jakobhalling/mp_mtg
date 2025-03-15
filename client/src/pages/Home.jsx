import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useDeck } from '../contexts/DeckContext';

const Home = () => {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [gameName, setGameName] = useState('');
  const [maxPlayers, setMaxPlayers] = useState(4);
  
  const { currentUser, logout, getAuthHeader } = useAuth();
  const { decks, getActiveDeck, setActiveDeck } = useDeck();
  const navigate = useNavigate();

  // Fetch available games
  useEffect(() => {
    const fetchGames = async () => {
      try {
        setLoading(true);
        const response = await fetch('http://localhost:5000/api/games', getAuthHeader());
        const data = await response.json();
        setGames(data);
      } catch (error) {
        console.error('Error fetching games:', error);
        setError('Failed to load available games');
      } finally {
        setLoading(false);
      }
    };

    fetchGames();
  }, [getAuthHeader]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleCreateGame = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      const response = await fetch('http://localhost:5000/api/games', {
        method: 'POST',
        headers: {
          ...getAuthHeader().headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: gameName || `${currentUser.username}'s Game`,
          maxPlayers: parseInt(maxPlayers)
        })
      });
      
      const data = await response.json();
      setShowCreateModal(false);
      navigate(`/game/${data.id}`);
    } catch (error) {
      console.error('Error creating game:', error);
      setError('Failed to create game');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinGame = (gameId) => {
    const activeDeck = getActiveDeck();
    if (!activeDeck) {
      navigate('/decks');
      return;
    }
    
    navigate(`/game/${gameId}`);
  };

  const activeDeck = getActiveDeck();

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary">
      {/* Header */}
      <header className="bg-bg-secondary shadow-md">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-accent">MTG Multiplayer</h1>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/decks')}
              className="btn-secondary text-sm"
            >
              Manage Decks
            </button>
            <span className="text-text-secondary">
              Welcome, {currentUser.username}
            </span>
            <button
              onClick={handleLogout}
              className="btn-secondary text-sm"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {error && (
          <div className="bg-red-500 text-white p-3 rounded mb-6">
            {error}
          </div>
        )}

        {/* Game Mode Selection */}
        <div className="flex justify-center space-x-6 mb-8">
          <button
            onClick={() => navigate('/singleplayer')}
            className="btn-primary px-8 py-4 text-lg"
          >
            Play Singleplayer
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary px-8 py-4 text-lg"
          >
            Create Multiplayer Game
          </button>
        </div>

        {/* Active Deck Display */}
        <div className="bg-bg-secondary rounded-lg p-4 mb-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Active Deck</h3>
            <button
              onClick={() => navigate('/decks')}
              className="btn-secondary text-sm"
            >
              Change Deck
            </button>
          </div>
          {activeDeck ? (
            <div className="mt-2 flex items-start">
              {activeDeck.commander && activeDeck.commander.imageUrl && (
                <div className="mr-4 w-24">
                  <img 
                    src={activeDeck.commander.imageUrl} 
                    alt={activeDeck.commander.name}
                    className="rounded-lg w-full"
                  />
                  <p className="text-xs text-center mt-1 text-accent">Commander</p>
                </div>
              )}
              <div>
                <p className="text-accent font-medium">{activeDeck.name}</p>
                <p className="text-text-secondary text-sm">{activeDeck.cardCount} cards</p>
                {activeDeck.commander && (
                  <p className="text-text-secondary text-sm">
                    Commander: {activeDeck.commander.name}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="mt-2 text-yellow-500">
              <p>No deck selected. Please select a deck before joining a game.</p>
            </div>
          )}
        </div>

        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">Available Games</h2>
          <button
            onClick={() => {
              if (!activeDeck) {
                navigate('/decks');
                return;
              }
              setShowCreateModal(true);
            }}
            className="btn-primary"
          >
            Create Game
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent"></div>
          </div>
        ) : games.length === 0 ? (
          <div className="bg-bg-secondary rounded-lg p-8 text-center">
            <p className="text-lg text-text-secondary mb-4">
              No games available at the moment
            </p>
            <button
              onClick={() => {
                if (!activeDeck) {
                  navigate('/decks');
                  return;
                }
                setShowCreateModal(true);
              }}
              className="btn-primary"
            >
              Create a New Game
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {games.map((game) => (
              <div
                key={game.id}
                className="bg-bg-secondary rounded-lg shadow-lg overflow-hidden"
              >
                <div className="p-6">
                  <h3 className="text-lg font-semibold mb-2">{game.name}</h3>
                  <p className="text-text-secondary mb-4">
                    Players: {game.players.length}/{game.maxPlayers}
                  </p>
                  <div className="flex justify-end">
                    <button
                      onClick={() => handleJoinGame(game.id)}
                      className={`btn-primary ${!activeDeck ? 'opacity-50 cursor-not-allowed' : ''}`}
                      disabled={!activeDeck}
                    >
                      Join Game
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Create Game Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-bg-secondary rounded-lg p-8 max-w-md w-full">
            <h2 className="text-xl font-semibold mb-4">Create New Game</h2>
            <form onSubmit={handleCreateGame}>
              <div className="form-group">
                <label htmlFor="gameName" className="form-label">
                  Game Name
                </label>
                <input
                  type="text"
                  id="gameName"
                  className="input-field"
                  value={gameName}
                  onChange={(e) => setGameName(e.target.value)}
                  placeholder={`${currentUser.username}'s Game`}
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="maxPlayers" className="form-label">
                  Max Players
                </label>
                <select
                  id="maxPlayers"
                  className="input-field"
                  value={maxPlayers}
                  onChange={(e) => setMaxPlayers(e.target.value)}
                >
                  <option value="2">2 Players</option>
                  <option value="3">3 Players</option>
                  <option value="4">4 Players</option>
                </select>
              </div>
              
              <div className="form-group">
                <label className="form-label">
                  Selected Deck
                </label>
                <div className="bg-bg-primary p-3 rounded flex items-start">
                  {activeDeck.commander && activeDeck.commander.imageUrl && (
                    <div className="mr-3 w-16">
                      <img 
                        src={activeDeck.commander.imageUrl} 
                        alt={activeDeck.commander.name}
                        className="rounded-lg w-full"
                      />
                    </div>
                  )}
                  <div>
                    <p className="font-medium">{activeDeck.name}</p>
                    <p className="text-text-secondary text-sm">{activeDeck.cardCount} cards</p>
                    {activeDeck.commander && (
                      <p className="text-accent text-sm">
                        Commander: {activeDeck.commander.name}
                      </p>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end space-x-4 mt-6">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={loading}
                >
                  {loading ? 'Creating...' : 'Create Game'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;
