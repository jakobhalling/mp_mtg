import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import SinglePlayerConnectionManager from './SinglePlayerConnectionManager';
import GameStateManager from '../p2p/GameStateManager';
import ScryfallService from '../p2p/ScryfallService';

const SinglePlayerGame = () => {
  const [gameManager, setGameManager] = useState(null);
  const [gameState, setGameState] = useState(null);
  const [hoveredCard, setHoveredCard] = useState(null);
  const [error, setError] = useState(null);
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  // Memoize the state update callback to prevent recreating on every render
  const handleStateUpdate = useCallback((newState) => {
    setGameState(newState);
  }, []);

  useEffect(() => {
    let removeListener = () => {};

    const initGame = async () => {
      try {
        // Set up connection and game managers
        const p2pManager = new SinglePlayerConnectionManager(currentUser.id);
        const newGameManager = new GameStateManager(p2pManager, currentUser.id);
        
        // Get deck data from localStorage
        const deckText = localStorage.getItem('userDeck');
        const activeFullDeck = localStorage.getItem('activeFullDeck');
        let deck = [];

        if (activeFullDeck) {
          const deckData = JSON.parse(activeFullDeck);
          deck = deckData.cards || [];
        } else if (deckText) {
          const scryfallService = new ScryfallService();
          const parsedDeck = await scryfallService.parseDeckList(deckText);
          deck = parsedDeck.cards;
        }

        // Initialize game state with the deck
        const initialState = newGameManager.initializeGameState([{
          id: currentUser.id,
          name: currentUser.username,
          deck: deck,
          isCurrentPlayer: true
        }]);

        setGameManager(newGameManager);
        setGameState(initialState);

        // Set up state listener
        removeListener = newGameManager.addStateListener(handleStateUpdate);

      } catch (error) {
        console.error('Failed to initialize single player game:', error);
        setError(error.message || 'Failed to initialize game');
      }
    };

    initGame();

    // Cleanup function
    return () => {
      removeListener();
      if (gameManager) {
        gameManager.cleanup();
      }
    };
  }, [currentUser, handleStateUpdate]);

  // Game action handlers
  const handleDrawCard = () => {
    if (gameState && currentUser) {
      gameManager.applyAction({
        type: 'draw-card',
        payload: { playerId: currentUser.id, count: 1 }
      });
    }
  };

  const handlePhaseChange = (phase) => {
    if (gameManager) {
      gameManager.applyAction({
        type: 'change-phase',
        payload: { phase }
      });
    }
  };

  const handleLifeChange = (playerId, delta) => {
    if (gameManager) {
      gameManager.applyAction({
        type: 'update-life',
        payload: { playerId, delta }
      });
    }
  };

  // Card interaction handlers
  const handleDragStart = (e, card, zone) => {
    e.dataTransfer.setData('card', JSON.stringify(card));
    e.dataTransfer.setData('zone', zone);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e, targetZone) => {
    e.preventDefault();
    const card = JSON.parse(e.dataTransfer.getData('card'));
    const sourceZone = e.dataTransfer.getData('zone');
    
    if (gameManager && currentUser) {
      gameManager.applyAction({
        type: 'move-card',
        payload: {
          playerId: currentUser.id,
          cardId: card.id,
          sourceZone,
          targetZone
        }
      });
    }
  };

  const currentPlayer = gameState?.players.find(p => p.id === currentUser?.id);

  if (error) {
    return (
      <div className="min-h-screen bg-bg-primary text-text-primary flex items-center justify-center">
        <div className="bg-bg-secondary p-6 rounded-lg shadow-lg">
          <h2 className="text-xl font-semibold text-red-500 mb-4">Error</h2>
          <p>{error}</p>
          <button onClick={() => navigate('/')} className="btn-primary mt-4">
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  if (!gameState) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent"></div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-bg-primary text-text-primary overflow-hidden">
      <div className="flex flex-col h-full">
        {/* Upper half - empty in singleplayer */}
        <div className="h-1/2 bg-bg-tertiary border-b-2 border-accent p-4">
          <div className="h-full flex items-center justify-center text-text-secondary">
            Single Player Mode
          </div>
        </div>

        {/* Lower half - player's board */}
        <div className="h-1/2 bg-bg-secondary flex flex-col relative">
          {/* Player Info and Controls */}
          <div className="flex justify-between items-center p-4 border-b border-gray-700">
            <div className="flex items-center">
              <span className="text-lg font-bold mr-2">{currentUser.username}</span>
              <div className="flex items-center bg-bg-tertiary px-3 py-1 rounded-full">
                <button 
                  className="text-red-500 font-bold w-6 h-6 flex items-center justify-center"
                  onClick={() => handleLifeChange(currentUser.id, -1)}
                >-</button>
                <span className="mx-2 text-accent font-bold">{currentPlayer?.life || 20}</span>
                <button 
                  className="text-green-500 font-bold w-6 h-6 flex items-center justify-center"
                  onClick={() => handleLifeChange(currentUser.id, 1)}
                >+</button>
              </div>
            </div>
            
            {/* Game Phases */}
            <div className="flex space-x-1">
              {['untap', 'upkeep', 'draw', 'main1', 'combat', 'main2', 'end'].map(phase => (
                <button
                  key={phase}
                  className={`px-2 py-1 text-xs rounded ${gameState.phase === phase ? 'bg-green-600' : 'bg-gray-700'}`}
                  onClick={() => handlePhaseChange(phase)}
                >
                  {phase}
                </button>
              ))}
            </div>
            
            <div className="flex space-x-2">
              <button
                className="btn-primary text-sm"
                onClick={handleDrawCard}
              >
                Draw
              </button>
              <button
                className="btn-secondary text-sm"
                onClick={() => navigate('/')}
              >
                Leave Game
              </button>
              <button
                className="btn-primary text-sm"
                onClick={() => handlePhaseChange('next')}
              >
                Next Phase
              </button>
            </div>
          </div>
          
          {/* Player Battlefield */}
          <div 
            className="flex-1 p-4 overflow-y-auto"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, 'battlefield')}
          >
            <div className="flex flex-wrap">
              {currentPlayer?.battlefield?.map((card, index) => (
                <div 
                  key={`${card.id}-${index}`}
                  className={`w-20 h-28 m-1 rounded overflow-hidden shadow-lg card-hover ${card.tapped ? 'transform rotate-90' : ''}`}
                  onMouseEnter={() => setHoveredCard(card)}
                  onMouseLeave={() => setHoveredCard(null)}
                  draggable
                  onDragStart={(e) => handleDragStart(e, card, 'battlefield')}
                >
                  <img 
                    src={card.imageUrl || 'https://c1.scryfall.com/file/scryfall-card-backs/normal/59/597b79b3-7d77-4261-871a-60dd17403388.jpg'} 
                    alt={card.name} 
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
          </div>
          
          {/* Player Hand */}
          <div 
            className="absolute bottom-0 left-0 right-0 h-12 bg-transparent p-2 flex justify-center items-center overflow-x-visible transform hover:translate-y-0 translate-y-10 transition-transform duration-300 z-10"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, 'hand')}
          >
            {currentPlayer?.hand?.map((card, index) => (
              <div 
                key={`${card.id}-${index}`}
                className="w-20 h-28 mx-1 rounded overflow-hidden shadow-lg card-hover transform hover:-translate-y-2 transition-transform"
                onMouseEnter={() => setHoveredCard(card)}
                onMouseLeave={() => setHoveredCard(null)}
                draggable
                onDragStart={(e) => handleDragStart(e, card, 'hand')}
              >
                <img 
                  src={card.imageUrl || 'https://c1.scryfall.com/file/scryfall-card-backs/normal/59/597b79b3-7d77-4261-871a-60dd17403388.jpg'} 
                  alt={card.name} 
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Enlarged Card Preview */}
      {hoveredCard && (
        <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 flex flex-col items-center">
          <div className="w-64 rounded overflow-hidden shadow-2xl">
            <img 
              src={hoveredCard.imageUrl || 'https://c1.scryfall.com/file/scryfall-card-backs/large/59/597b79b3-7d77-4261-871a-60dd17403388.jpg'} 
              alt={hoveredCard.name} 
              className="w-full"
            />
          </div>
          <div className="mt-2 bg-bg-primary p-3 rounded max-w-md text-sm">
            {hoveredCard.text || 'No text available'}
          </div>
        </div>
      )}
    </div>
  );
};

export default SinglePlayerGame;
