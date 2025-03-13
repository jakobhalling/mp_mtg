import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useDeck } from '../contexts/DeckContext';

const DeckManager = () => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [currentDeck, setCurrentDeck] = useState(null);
  const [deckName, setDeckName] = useState('');
  const [deckText, setDeckText] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredDecks, setFilteredDecks] = useState([]);
  const [selectedCommander, setSelectedCommander] = useState('');
  const [commanderOptions, setCommanderOptions] = useState([]);
  const [selectedCard, setSelectedCard] = useState(null);

  const { currentUser, logout } = useAuth();
  const { 
    decks, 
    loading, 
    error, 
    createDeck, 
    updateDeck, 
    deleteDeck,
    setActiveDeck,
    processingDeck,
    processingProgress,
    setCommander,
    cardCache
  } = useDeck();
  
  const navigate = useNavigate();

  // Filter decks based on search term
  useEffect(() => {
    if (decks) {
      setFilteredDecks(
        decks.filter(deck => 
          deck.name.toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }
  }, [decks, searchTerm]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Parse deck text to extract potential commanders
  const extractPotentialCommanders = (text) => {
    const lines = text.split('\n').filter(line => line.trim() !== '');
    const legendaryCreatures = [];
    
    for (let line of lines) {
      line = line.trim();
      
      // Skip comments and empty lines
      if (line.startsWith('//') || line === '') continue;
      
      // Check for commander designation
      const isCommander = line.toLowerCase().includes('*commander*') || 
                         line.toLowerCase().includes('[commander]');
      
      // Remove commander designation for parsing
      if (isCommander) {
        line = line.replace(/\*commander\*/i, '').replace(/\[commander\]/i, '').trim();
        
        // Parse quantity and card name
        const match = line.match(/^(\d+)x?\s+(.+)$/) || line.match(/^x?(\d+)\s+(.+)$/);
        
        if (match) {
          legendaryCreatures.push(match[2].trim());
        } else {
          legendaryCreatures.push(line);
        }
        
        continue;
      }
      
      // Parse quantity and card name
      const match = line.match(/^(\d+)x?\s+(.+)$/) || line.match(/^x?(\d+)\s+(.+)$/);
      
      if (match) {
        const cardName = match[2].trim();
        // Add all cards as potential commanders - we'll filter by legendary creature later
        // when we have full card data
        legendaryCreatures.push(cardName);
      } else {
        // If no quantity specified, assume it's just the card name
        legendaryCreatures.push(line);
      }
    }
    
    return legendaryCreatures;
  };

  const handleDeckTextChange = (e) => {
    const text = e.target.value;
    setDeckText(text);
    
    // Extract potential commanders
    const potentialCommanders = extractPotentialCommanders(text);
    setCommanderOptions(potentialCommanders);
    
    // If there's a commander marked in the text, select it
    const commanderLine = text.split('\n').find(line => 
      line.toLowerCase().includes('*commander*') || 
      line.toLowerCase().includes('[commander]')
    );
    
    if (commanderLine) {
      let commanderName = commanderLine
        .replace(/\*commander\*/i, '')
        .replace(/\[commander\]/i, '')
        .trim();
      
      // Extract name from quantity format
      const match = commanderName.match(/^(\d+)x?\s+(.+)$/) || commanderName.match(/^x?(\d+)\s+(.+)$/);
      if (match) {
        commanderName = match[2].trim();
      }
      
      setSelectedCommander(commanderName);
    } else {
      setSelectedCommander('');
    }
  };

  const handleCreateDeck = async (e) => {
    e.preventDefault();
    
    try {
      const newDeck = await createDeck(deckName, deckText, selectedCommander);
      setShowCreateModal(false);
      setDeckName('');
      setDeckText('');
      setSelectedCommander('');
      setCommanderOptions([]);
    } catch (error) {
      console.error('Error creating deck:', error);
    }
  };

  const handleEditDeck = async (e) => {
    e.preventDefault();
    
    try {
      await updateDeck(currentDeck.id, deckName, deckText, selectedCommander);
      setShowEditModal(false);
      setCurrentDeck(null);
      setDeckName('');
      setDeckText('');
      setSelectedCommander('');
      setCommanderOptions([]);
    } catch (error) {
      console.error('Error updating deck:', error);
    }
  };

  const handleDeleteDeck = () => {
    try {
      deleteDeck(currentDeck.id);
      setShowDeleteModal(false);
      setCurrentDeck(null);
    } catch (error) {
      console.error('Error deleting deck:', error);
    }
  };

  const openEditModal = (deck) => {
    setCurrentDeck(deck);
    setDeckName(deck.name);
    setDeckText(deck.text);
    setCommanderOptions(extractPotentialCommanders(deck.text));
    setSelectedCommander(deck.commander ? deck.commander.name : '');
    setShowEditModal(true);
  };

  const openDeleteModal = (deck) => {
    setCurrentDeck(deck);
    setShowDeleteModal(true);
  };

  const openViewModal = (deck) => {
    setCurrentDeck(deck);
    setDeckText(deck.text);
    setSelectedCard(null);
    setShowViewModal(true);
  };

  const handleSelectDeck = (deck) => {
    setActiveDeck(deck.id);
    navigate('/');
  };

  const handleSelectCard = (card) => {
    setSelectedCard(card);
  };

  const handleSetCommander = async () => {
    if (currentDeck && selectedCard) {
      try {
        await setCommander(currentDeck.id, selectedCard.name);
        // Refresh the current deck
        const updatedDeck = decks.find(d => d.id === currentDeck.id);
        setCurrentDeck(updatedDeck);
      } catch (error) {
        console.error('Error setting commander:', error);
      }
    }
  };

  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary">
      {/* Header */}
      <header className="bg-bg-secondary shadow-md">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-accent">MTG Multiplayer</h1>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/')}
              className="btn-secondary text-sm"
            >
              Home
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

        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">My Decks</h2>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary"
          >
            Create New Deck
          </button>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="Search decks..."
            className="input-field w-full"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent"></div>
          </div>
        ) : filteredDecks.length === 0 ? (
          <div className="bg-bg-secondary rounded-lg p-8 text-center">
            <p className="text-lg text-text-secondary mb-4">
              {searchTerm ? 'No decks match your search' : 'You have no decks yet'}
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn-primary"
            >
              Create Your First Deck
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDecks.map((deck) => (
              <div
                key={deck.id}
                className="bg-bg-secondary rounded-lg shadow-lg overflow-hidden"
              >
                <div className="p-6">
                  <h3 className="text-lg font-semibold mb-2">{deck.name}</h3>
                  <div className="text-text-secondary mb-4">
                    <p>{deck.cardCount} cards</p>
                    {deck.commander && (
                      <p className="text-accent">Commander: {deck.commander.name}</p>
                    )}
                    <p>Last updated: {formatDate(deck.updatedAt)}</p>
                  </div>
                  <div className="flex justify-between">
                    <div className="space-x-2">
                      <button
                        onClick={() => openViewModal(deck)}
                        className="btn-secondary text-sm"
                      >
                        View
                      </button>
                      <button
                        onClick={() => openEditModal(deck)}
                        className="btn-secondary text-sm"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => openDeleteModal(deck)}
                        className="btn-danger text-sm"
                      >
                        Delete
                      </button>
                    </div>
                    <button
                      onClick={() => handleSelectDeck(deck)}
                      className="btn-primary"
                    >
                      Select
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Create Deck Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-bg-secondary rounded-lg p-8 max-w-md w-full">
            <h2 className="text-xl font-semibold mb-4">Create New Deck</h2>
            <form onSubmit={handleCreateDeck}>
              <div className="form-group">
                <label htmlFor="deckName" className="form-label">
                  Deck Name
                </label>
                <input
                  type="text"
                  id="deckName"
                  className="input-field"
                  value={deckName}
                  onChange={(e) => setDeckName(e.target.value)}
                  placeholder="My Awesome Deck"
                  required
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="deckText" className="form-label">
                  Deck List (one card per line, format: "1 Card Name")
                </label>
                <textarea
                  id="deckText"
                  className="input-field h-64"
                  value={deckText}
                  onChange={handleDeckTextChange}
                  placeholder="10 Forest
1 Black Lotus
1 Golos, Tireless Pilgrim *commander*
..."
                  required
                ></textarea>
              </div>
              
              <div className="form-group">
                <label htmlFor="commander" className="form-label">
                  Commander (optional)
                </label>
                <select
                  id="commander"
                  className="input-field"
                  value={selectedCommander}
                  onChange={(e) => setSelectedCommander(e.target.value)}
                >
                  <option value="">Select a Commander</option>
                  {commanderOptions.map((name, index) => (
                    <option key={index} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
                <p className="text-text-secondary text-sm mt-1">
                  You can also mark a card as commander in the deck list with *commander*
                </p>
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
                  disabled={loading || processingDeck}
                >
                  {processingDeck ? `Processing (${Math.round(processingProgress)}%)` : 'Create Deck'}
                </button>
              </div>
            </form>
            
            {processingDeck && (
              <div className="mt-4">
                <div className="w-full bg-bg-primary rounded-full h-2.5">
                  <div 
                    className="bg-accent h-2.5 rounded-full" 
                    style={{ width: `${processingProgress}%` }}
                  ></div>
                </div>
                <p className="text-text-secondary text-sm mt-1">
                  Fetching card data from Scryfall... This may take a moment.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Edit Deck Modal */}
      {showEditModal && currentDeck && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-bg-secondary rounded-lg p-8 max-w-md w-full">
            <h2 className="text-xl font-semibold mb-4">Edit Deck</h2>
            <form onSubmit={handleEditDeck}>
              <div className="form-group">
                <label htmlFor="editDeckName" className="form-label">
                  Deck Name
                </label>
                <input
                  type="text"
                  id="editDeckName"
                  className="input-field"
                  value={deckName}
                  onChange={(e) => setDeckName(e.target.value)}
                  required
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="editDeckText" className="form-label">
                  Deck List (one card per line, format: "1 Card Name")
                </label>
                <textarea
                  id="editDeckText"
                  className="input-field h-64"
                  value={deckText}
                  onChange={handleDeckTextChange}
                  required
                ></textarea>
              </div>
              
              <div className="form-group">
                <label htmlFor="editCommander" className="form-label">
                  Commander (optional)
                </label>
                <select
                  id="editCommander"
                  className="input-field"
                  value={selectedCommander}
                  onChange={(e) => setSelectedCommander(e.target.value)}
                >
                  <option value="">Select a Commander</option>
                  {commanderOptions.map((name, index) => (
                    <option key={index} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
                <p className="text-text-secondary text-sm mt-1">
                  You can also mark a card as commander in the deck list with *commander*
                </p>
              </div>
              
              <div className="flex justify-end space-x-4 mt-6">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowEditModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={loading || processingDeck}
                >
                  {processingDeck ? `Processing (${Math.round(processingProgress)}%)` : 'Save Changes'}
                </button>
              </div>
            </form>
            
            {processingDeck && (
              <div className="mt-4">
                <div className="w-full bg-bg-primary rounded-full h-2.5">
                  <div 
                    className="bg-accent h-2.5 rounded-full" 
                    style={{ width: `${processingProgress}%` }}
                  ></div>
                </div>
                <p className="text-text-secondary text-sm mt-1">
                  Fetching card data from Scryfall... This may take a moment.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete Deck Modal */}
      {showDeleteModal && currentDeck && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-bg-secondary rounded-lg p-8 max-w-md w-full">
            <h2 className="text-xl font-semibold mb-4">Delete Deck</h2>
            <p className="mb-6">
              Are you sure you want to delete "{currentDeck.name}"? This action cannot be undone.
            </p>
            
            <div className="flex justify-end space-x-4">
              <button
                className="btn-secondary"
                onClick={() => setShowDeleteModal(false)}
              >
                Cancel
              </button>
              <button
                className="btn-danger"
                onClick={handleDeleteDeck}
              >
                Delete Deck
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Deck Modal */}
      {showViewModal && currentDeck && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-bg-secondary rounded-lg p-8 max-w-5xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-semibold mb-4">{currentDeck.name}</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Deck Info */}
              <div className="md:col-span-1">
                <div className="mb-4">
                  <h3 className="text-md font-medium mb-2">Deck Info</h3>
                  <p className="text-text-secondary">
                    {currentDeck.cardCount} cards • Created: {formatDate(currentDeck.createdAt)} • Updated: {formatDate(currentDeck.updatedAt)}
                  </p>
                </div>
                
                {/* Commander Display */}
                {currentDeck.commander && (
                  <div className="mb-4">
                    <h3 className="text-md font-medium mb-2">Commander</h3>
                    <div className="bg-bg-primary p-3 rounded">
                      <p className="font-medium text-accent">{currentDeck.commander.name}</p>
                      {currentDeck.commander.imageUrl && (
                        <img 
                          src={currentDeck.commander.imageUrl} 
                          alt={currentDeck.commander.name}
                          className="mt-2 rounded-lg w-full"
                        />
                      )}
                    </div>
                  </div>
                )}
                
                {/* Deck List */}
                <div className="mb-4">
                  <h3 className="text-md font-medium mb-2">Deck List</h3>
                  <pre className="bg-bg-primary p-4 rounded max-h-64 overflow-y-auto whitespace-pre-wrap">
                    {deckText}
                  </pre>
                </div>
                
                <div className="flex justify-end space-x-4 mt-4">
                  <button
                    className="btn-secondary"
                    onClick={() => setShowViewModal(false)}
                  >
                    Close
                  </button>
                  <button
                    className="btn-primary"
                    onClick={() => {
                      handleSelectDeck(currentDeck);
                      setShowViewModal(false);
                    }}
                  >
                    Select Deck
                  </button>
                </div>
              </div>
              
              {/* Card Gallery */}
              <div className="md:col-span-2">
                <h3 className="text-md font-medium mb-2">Card Gallery</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {currentDeck.cards.map((card, index) => (
                    <div 
                      key={`${card.id}-${index}`}
                      className={`cursor-pointer rounded-lg overflow-hidden border-2 ${
                        selectedCard && selectedCard.id === card.id 
                          ? 'border-accent' 
                          : 'border-transparent'
                      }`}
                      onClick={() => handleSelectCard(card)}
                    >
                      {card.imageUrl ? (
                        <img 
                          src={card.imageUrl} 
                          alt={card.name}
                          className="w-full h-auto"
                        />
                      ) : (
                        <div className="bg-bg-primary p-2 h-full flex items-center justify-center">
                          <p className="text-center">{card.name}</p>
                        </div>
                      )}
                      <div className="p-1 bg-bg-primary text-xs">
                        <p className="truncate">{card.name}</p>
                        <p className="text-text-secondary">x{card.count}</p>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Card Selection Actions */}
                {selectedCard && (
                  <div className="mt-4 flex justify-end">
                    <button
                      className="btn-primary"
                      onClick={handleSetCommander}
                      disabled={
                        currentDeck.commander && 
                        currentDeck.commander.id === selectedCard.id
                      }
                    >
                      {currentDeck.commander && currentDeck.commander.id === selectedCard.id
                        ? 'Current Commander'
                        : 'Set as Commander'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeckManager;
