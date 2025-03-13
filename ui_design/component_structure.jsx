```jsx
// Component structure for the MTG multiplayer game UI

// Main Game Container
const GameBoard = () => {
  const [players, setPlayers] = useState([]);
  const [zoomedOpponent, setZoomedOpponent] = useState(null);
  const [gamePhase, setGamePhase] = useState('main1');
  
  return (
    <div className="game-container">
      <OpponentsSection 
        opponents={players.filter(p => !p.isCurrentPlayer)}
        zoomedOpponent={zoomedOpponent}
        setZoomedOpponent={setZoomedOpponent}
      />
      <PlayerSection 
        player={players.find(p => p.isCurrentPlayer)}
        gamePhase={gamePhase}
      />
      <GameControls 
        gamePhase={gamePhase}
        setGamePhase={setGamePhase}
      />
    </div>
  );
};

// Opponents Section (Upper Half)
const OpponentsSection = ({ opponents, zoomedOpponent, setZoomedOpponent }) => {
  return (
    <div className="opponents-section">
      {zoomedOpponent ? (
        <>
          <div className="opponent-thumbnails">
            {opponents
              .filter(opp => opp.id !== zoomedOpponent.id)
              .map(opp => (
                <OpponentThumbnail 
                  key={opp.id}
                  opponent={opp}
                  onClick={() => setZoomedOpponent(opp)}
                />
              ))}
          </div>
          <OpponentBoard 
            opponent={zoomedOpponent}
            isZoomed={true}
          />
        </>
      ) : (
        <div className={`opponents-grid opponents-${opponents.length}`}>
          {opponents.map(opp => (
            <OpponentBoard 
              key={opp.id}
              opponent={opp}
              isZoomed={false}
              onClick={() => setZoomedOpponent(opp)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// Opponent Thumbnail (for zoomed view)
const OpponentThumbnail = ({ opponent, onClick }) => {
  return (
    <div className="opponent-thumbnail" onClick={onClick}>
      <div className="opponent-name">{opponent.name}</div>
      <div className="opponent-life">{opponent.life}</div>
    </div>
  );
};

// Opponent Board
const OpponentBoard = ({ opponent, isZoomed, onClick }) => {
  return (
    <div 
      className={`opponent-board ${isZoomed ? 'zoomed' : ''}`}
      onClick={!isZoomed ? onClick : undefined}
    >
      <div className="opponent-info">
        <div className="opponent-name">{opponent.name}</div>
        <div className="opponent-life">{opponent.life}</div>
      </div>
      
      <div className="opponent-zones">
        <div className="zone library">
          <div className="card-count">{opponent.library.length}</div>
        </div>
        <div className="zone hand">
          <div className="card-count">{opponent.hand.length}</div>
        </div>
        <div className="zone graveyard">
          <div className="card-count">{opponent.graveyard.length}</div>
        </div>
        <div className="zone exile">
          <div className="card-count">{opponent.exile.length}</div>
        </div>
        {opponent.commander && (
          <div className="zone command">
            <Card card={opponent.commander} />
          </div>
        )}
      </div>
      
      <div className="battlefield">
        {opponent.battlefield.map(card => (
          <Card key={card.id} card={card} />
        ))}
      </div>
    </div>
  );
};

// Player Section (Lower Half)
const PlayerSection = ({ player, gamePhase }) => {
  return (
    <div className="player-section">
      <div className="player-info">
        <div className="player-name">{player.name}</div>
        <div className="player-life">
          <button className="life-button decrease">-</button>
          <span>{player.life}</span>
          <button className="life-button increase">+</button>
        </div>
      </div>
      
      <div className="player-zones">
        <div className="zone library">
          <div className="card-count">{player.library.length}</div>
        </div>
        <div className="zone graveyard" onClick={() => openZoneViewer('graveyard')}>
          <div className="card-count">{player.graveyard.length}</div>
        </div>
        <div className="zone exile" onClick={() => openZoneViewer('exile')}>
          <div className="card-count">{player.exile.length}</div>
        </div>
        {player.commander && (
          <div className="zone command">
            <Card card={player.commander} />
          </div>
        )}
      </div>
      
      <div className="battlefield">
        {player.battlefield.map(card => (
          <Card 
            key={card.id} 
            card={card} 
            draggable={true}
          />
        ))}
      </div>
      
      <div className="hand">
        {player.hand.map(card => (
          <Card 
            key={card.id} 
            card={card} 
            draggable={true}
          />
        ))}
      </div>
    </div>
  );
};

// Card Component
const Card = ({ card, draggable = false }) => {
  const [showEnlarged, setShowEnlarged] = useState(false);
  
  const handleDragStart = (e) => {
    if (!draggable) return;
    e.dataTransfer.setData('card', JSON.stringify(card));
  };
  
  return (
    <>
      <div 
        className={`card ${card.tapped ? 'tapped' : ''}`}
        draggable={draggable}
        onDragStart={handleDragStart}
        onMouseEnter={() => setShowEnlarged(true)}
        onMouseLeave={() => setShowEnlarged(false)}
      >
        <img 
          src={card.image_uris.normal} 
          alt={card.name} 
        />
      </div>
      
      {showEnlarged && (
        <div className="card-enlarged">
          <img 
            src={card.image_uris.large} 
            alt={card.name} 
          />
          <div className="card-text">
            {card.oracle_text}
          </div>
        </div>
      )}
    </>
  );
};

// Game Controls
const GameControls = ({ gamePhase, setGamePhase }) => {
  const phases = ['untap', 'upkeep', 'draw', 'main1', 'combat', 'main2', 'end'];
  
  return (
    <div className="game-controls">
      <div className="phase-indicator">
        {phases.map(phase => (
          <div 
            key={phase}
            className={`phase ${gamePhase === phase ? 'active' : ''}`}
            onClick={() => setGamePhase(phase)}
          >
            {phase}
          </div>
        ))}
      </div>
      
      <div className="action-buttons">
        <button className="action-button">Draw</button>
        <button className="action-button">Scry</button>
        <button className="action-button">Token</button>
        <button className="action-button">Pass Turn</button>
      </div>
    </div>
  );
};

export default GameBoard;
```
