import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Home = () => {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [gameName, setGameName] = useState('');
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [deckText, setDeckText] = useState('');
  const [showDeckModal, setShowDeckModal] = useState(false);
  
  const { currentUser, logout, getAuthHeader } = useAuth();
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
    if (!deckText) {
      setShowDeckModal(true);
      return;
    }
    
    navigate(`/game/${gameId}`);
  };

  const handleDeckSubmit = (e) => {
    e.preventDefault();
    setShowDeckModal(false);
    // Store deck in localStorage for now
    localStorage.setItem('userDeck', deckText);
  };

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary">
      {/* Header */}
      <header className="bg-bg-secondary shadow-md">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-accent">MTG Multiplayer</h1>
          <div className="flex items-center space-x-4">
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

        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">Available Games</h2>
          <button
            onClick={() => setShowCreateModal(true)}
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
              onClick={() => setShowCreateModal(true)}
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
                      className="btn-primary"
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
                  onClick={() => setShowDeckModal(false)}
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

export default Home;
