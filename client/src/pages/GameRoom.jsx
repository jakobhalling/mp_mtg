import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useGame } from '../contexts/GameContext';

const GameRoom = () => {
  const { gameId } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [zoomedOpponent, setZoomedOpponent] = useState(null);
  const [deckData, setDeckData] = useState(null);
  const [hoveredCard, setHoveredCard] = useState(null);
  
  const { currentUser } = useAuth();
  const { 
    gameState, 
    players, 
    currentPlayer,
    isConnected,
    joinGame,
    drawCard,
    playCard,
    moveCard,
    updateLife,
    changePhase,
    nextTurn,
    importDeck
  } = useGame();
  
  const navigate = useNavigate();
  const gameContainerRef = useRef(null);

  // Initialize game connection
  useEffect(() => {
    const initializeGame = async () => {
      try {
        setLoading(true);
        
        // Join the game
        await joinGame(gameId);
        
        // Import deck
        const deckText = localStorage.getItem('userDeck');
        if (deckText) {
          const importedDeck = await importDeck(deckText);
          setDeckData(importedDeck);
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error initializing game:', error);
        setError(error.message || 'Failed to initialize game');
        setLoading(false);
      }
    };

    initializeGame();
  }, [gameId, joinGame, importDeck]);

  // Handle card hover
  const handleCardHover = (card) => {
    setHoveredCard(card);
  };

  // Handle card click
  const handleCardClick = (card, zone, playerId) => {
    // If CTRL is pressed, handle multi-select
    if (window.event.ctrlKey) {
      // Multi-select logic would go here
      return;
    }
    
    // Regular card click
    if (playerId === currentUser.id) {
      // It's the current player's card
      if (zone === 'hand') {
        playCard(playerId, card.id);
      } else if (zone === 'battlefield') {
        // Toggle tapped state or other actions
      }
    } else {
      // It's an opponent's card
      // View card details
    }
  };

  // Handle drag start
  const handleDragStart = (e, card, zone, playerId) => {
    e.dataTransfer.setData('card', JSON.stringify(card));
    e.dataTransfer.setData('zone', zone);
    e.dataTransfer.setData('playerId', playerId);
  };

  // Handle drop
  const handleDrop = (e, targetZone, playerId) => {
    e.preventDefault();
    const card = JSON.parse(e.dataTransfer.getData('card'));
    const sourceZone = e.dataTransfer.getData('zone');
    const sourcePlayerId = e.dataTransfer.getData('playerId');
    
    if (sourcePlayerId === playerId) {
      moveCard(playerId, card.id, sourceZone, targetZone);
    }
  };

  // Handle drag over
  const handleDragOver = (e) => {
    e.preventDefault();
  };

  // Handle life change
  const handleLifeChange = (playerId, delta) => {
    updateLife(playerId, delta);
  };

  // Handle phase change
  const handlePhaseChange = (phase) => {
    changePhase(phase);
  };

  // Handle next turn
  const handleNextTurn = () => {
    nextTurn();
  };

  // Handle draw card
  const handleDrawCard = () => {
    if (currentPlayer) {
      drawCard(currentPlayer.id);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-primary flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent"></div>
      </div>
    );
  }

  if (error) {
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

  if (!gameState || !players.length) {
    return (
      <div className="min-h-screen bg-bg-primary flex justify-center items-center">
        <div className="bg-bg-secondary p-6 rounded-lg max-w-md">
          <h2 className="text-xl font-bold mb-4">Waiting for game to start...</h2>
          <p>Please wait while the game initializes.</p>
          {!isConnected && (
            <p className="text-red-500 mt-4">Not connected to peers. Trying to establish connection...</p>
          )}
        </div>
      </div>
    );
  }

  // Get opponents (all players except current user)
  const opponents = players.filter(player => player.id !== currentUser.id);

  return (
    <div className="h-screen bg-bg-primary text-text-primary overflow-hidden" ref={gameContainerRef}>
      {/* Game Container */}
      <div className="flex flex-col h-full">
        {/* Opponents Section (Upper Half) */}
        <div className="h-1/2 bg-bg-tertiary border-b-2 border-accent">
          {zoomedOpponent ? (
            <>
              {/* Opponent Thumbnails */}
              <div className="h-12 bg-black bg-opacity-30 flex">
                {opponents
                  .filter(opp => opp.id !== zoomedOpponent.id)
                  .map(opp => (
                    <div 
                      key={opp.id}
                      className="px-4 h-full flex items-center border-r border-gray-700 cursor-pointer hover:bg-black hover:bg-opacity-20"
                      onClick={() => setZoomedOpponent(opp)}
                    >
                      <div className="flex items-center">
                        <div className="w-2 h-2 rounded-full bg-green-500 mr-2"></div>
                        <span className="mr-2">{opp.name || 'Opponent'}</span>
                        <span className="text-accent font-bold">{opp.life || 20}</span>
                      </div>
                    </div>
                  ))}
                <div 
                  className="px-4 h-full flex items-center border-r border-gray-700 cursor-pointer hover:bg-black hover:bg-opacity-20"
                  onClick={() => setZoomedOpponent(null)}
                >
                  <span>View All</span>
                </div>
              </div>
              
              {/* Zoomed Opponent Board */}
              <div className="flex-1 p-4">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center">
                    <span className="text-lg font-bold mr-2">{zoomedOpponent.name || 'Opponent'}</span>
                    <div className="flex items-center bg-bg-secondary px-3 py-1 rounded-full">
                      <button 
                        className="text-red-500 font-bold w-6 h-6 flex items-center justify-center"
                        onClick={() => handleLifeChange(zoomedOpponent.id, -1)}
                      >-</button>
                      <span className="mx-2 text-accent font-bold">{zoomedOpponent.life || 20}</span>
                      <button 
                        className="text-green-500 font-bold w-6 h-6 flex items-center justify-center"
                        onClick={() => handleLifeChange(zoomedOpponent.id, 1)}
                      >+</button>
                    </div>
                  </div>
                  
                  <div className="flex space-x-2">
                    <div className="bg-bg-secondary p-2 rounded text-center">
                      <div className="text-xs text-gray-400">Hand</div>
                      <div className="font-bold">{zoomedOpponent.hand?.length || 0}</div>
                    </div>
                    <div className="bg-bg-secondary p-2 rounded text-center">
                      <div className="text-xs text-gray-400">Library</div>
                      <div className="font-bold">{zoomedOpponent.library?.length || 0}</div>
                    </div>
                    <div className="bg-bg-secondary p-2 rounded text-center">
                      <div className="text-xs text-gray-400">Graveyard</div>
                      <div className="font-bold">{zoomedOpponent.graveyard?.length || 0}</div>
                    </div>
                  </div>
                </div>
                
                {/* Opponent Battlefield */}
                <div 
                  className="bg-bg-secondary bg-opacity-50 rounded-lg p-4 h-64 overflow-y-auto flex flex-wrap"
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, 'battlefield', zoomedOpponent.id)}
                >
                  {zoomedOpponent.battlefield?.map((card, index) => (
                    <div 
                      key={`${card.id}-${index}`}
                      className={`w-20 h-28 m-1 rounded overflow-hidden shadow-lg card-hover ${card.tapped ? 'transform rotate-90' : ''}`}
                      onClick={() => handleCardClick(card, 'battlefield', zoomedOpponent.id)}
                      onMouseEnter={() => handleCardHover(card)}
                      onMouseLeave={() => setHoveredCard(null)}
                      draggable
                      onDragStart={(e) => handleDragStart(e, card, 'battlefield', zoomedOpponent.id)}
                    >
                      <img 
                        src={card.image_uris?.normal || 'https://c1.scryfall.com/file/scryfall-card-backs/normal/59/597b79b3-7d77-4261-871a-60dd17403388.jpg'} 
                        alt={card.name || 'Card'} 
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className={`grid grid-cols-${Math.min(opponents.length, 3)} h-full`}>
              {opponents.map(opponent => (
                <div 
                  key={opponent.id}
                  className="p-4 border-r border-gray-700 cursor-pointer hover:bg-black hover:bg-opacity-10"
                  onClick={() => setZoomedOpponent(opponent)}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center">
                      <span className="font-bold mr-2">{opponent.name || 'Opponent'}</span>
                      <div className="flex items-center bg-bg-secondary px-2 py-1 rounded-full">
                        <button 
                          className="text-red-500 font-bold w-5 h-5 flex items-center justify-center"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleLifeChange(opponent.id, -1);
                          }}
                        >-</button>
                        <span className="mx-1 text-accent font-bold">{opponent.life || 20}</span>
                        <button 
                          className="text-green-500 font-bold w-5 h-5 flex items-center justify-center"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleLifeChange(opponent.id, 1);
                          }}
                        >+</button>
                      </div>
                    </div>
                    
                    <div className="flex space-x-1">
                      <div className="bg-bg-secondary p-1 rounded text-center text-xs">
                        <div className="text-xs text-gray-400">Hand</div>
                        <div className="font-bold">{opponent.hand?.length || 0}</div>
                      </div>
                      <div className="bg-bg-secondary p-1 rounded text-center text-xs">
                        <div className="text-xs text-gray-400">Library</div>
                        <div className="font-bold">{opponent.library?.length || 0}</div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Opponent Battlefield (Compact) */}
                  <div 
                    className="bg-bg-secondary bg-opacity-50 rounded-lg p-2 h-48 overflow-y-auto flex flex-wrap"
                    onClick={(e) => e.stopPropagation()}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, 'battlefield', opponent.id)}
                  >
                    {opponent.battlefield?.map((card, index) => (
                      <div 
                        key={`${card.id}-${index}`}
                        className={`w-16 h-22 m-1 rounded overflow-hidden shadow-lg card-hover ${card.tapped ? 'transform rotate-90' : ''}`}
                        onClick={() => handleCardClick(card, 'battlefield', opponent.id)}
                        onMouseEnter={() => handleCardHover(card)}
                        onMouseLeave={() => setHoveredCard(null)}
                        draggable
                        onDragStart={(e) => handleDragStart(e, card, 'battlefield', opponent.id)}
                      >
                        <img 
                          src={card.image_uris?.normal || 'https://c1.scryfall.com/file/scryfall-card-backs/normal/59/597b79b3-7d77-4261-871a-60dd17403388.jpg'} 
                          alt={card.name || 'Card'} 
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Player Section (Lower Half) */}
        <div className="h-1/2 bg-bg-secondary flex flex-col">
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
                  className={`px-2 py-1 text-xs rounded ${gameState?.phase === phase ? 'bg-green-600' : 'bg-gray-700'}`}
                  onClick={() => handlePhaseChange(phase)}
                >
                  {phase}
                </button>
              ))}
              <button
                className="px-2 py-1 text-xs rounded bg-blue-600 ml-2"
                onClick={handleNextTurn}
              >
                Next Turn
              </button>
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
            </div>
          </div>
          
          {/* Player Battlefield */}
          <div 
            className="flex-1 p-4 overflow-y-auto"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, 'battlefield', currentUser.id)}
          >
            <div className="flex flex-wrap">
              {currentPlayer?.battlefield?.map((card, index) => (
                <div 
                  key={`${card.id}-${index}`}
                  className={`w-20 h-28 m-1 rounded overflow-hidden shadow-lg card-hover ${card.tapped ? 'transform rotate-90' : ''}`}
                  onClick={() => handleCardClick(card, 'battlefield', currentUser.id)}
                  onMouseEnter={() => handleCardHover(card)}
                  onMouseLeave={() => setHoveredCard(null)}
                  draggable
                  onDragStart={(e) => handleDragStart(e, card, 'battlefield', currentUser.id)}
                >
                  <img 
                    src={card.image_uris?.normal || 'https://c1.scryfall.com/file/scryfall-card-backs/normal/59/597b79b3-7d77-4261-871a-60dd17403388.jpg'} 
                    alt={card.name || 'Card'} 
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
          </div>
          
          {/* Player Hand */}
          <div 
            className="h-36 bg-bg-tertiary p-2 flex justify-center items-center overflow-x-auto"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, 'hand', currentUser.id)}
          >
            {currentPlayer?.hand?.map((card, index) => (
              <div 
                key={`${card.id}-${index}`}
                className="w-20 h-28 mx-1 rounded overflow-hidden shadow-lg card-hover transform hover:translate-y-(-10px)"
                onClick={() => handleCardClick(card, 'hand', currentUser.id)}
                onMouseEnter={() => handleCardHover(card)}
                onMouseLeave={() => setHoveredCard(null)}
                draggable
                onDragStart={(e) => handleDragStart(e, card, 'hand', currentUser.id)}
              >
                <img 
                  src={card.image_uris?.normal || 'https://c1.scryfall.com/file/scryfall-card-backs/normal/59/597b79b3-7d77-4261-871a-60dd17403388.jpg'} 
                  alt={card.name || 'Card'} 
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
              src={hoveredCard.image_uris?.large || 'https://c1.scryfall.com/file/scryfall-card-backs/large/59/597b79b3-7d77-4261-871a-60dd17403388.jpg'} 
              alt={hoveredCard.name || 'Card'} 
              className="w-full"
            />
          </div>
          <div className="mt-2 bg-bg-primary p-3 rounded max-w-md text-sm">
            {hoveredCard.oracle_text || 'No text available'}
          </div>
        </div>
      )}
    </div>
  );
};

export default GameRoom;
