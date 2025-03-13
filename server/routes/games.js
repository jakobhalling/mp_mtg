const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const auth = require('../middleware/auth');

// In-memory game storage (would use a database in production)
const games = new Map();

// @route   POST api/games
// @desc    Create a new game
// @access  Private
router.post('/', auth, (req, res) => {
  try {
    const { name, maxPlayers = 4 } = req.body;
    const userId = req.user.id;
    
    // Find user (in a real app, this would query the database)
    // For this prototype, we'll assume the user exists
    
    // Create new game
    const gameId = uuidv4();
    const newGame = {
      id: gameId,
      name: name || `Game ${gameId.substring(0, 8)}`,
      host: userId,
      players: [{
        id: userId,
        isHost: true
      }],
      maxPlayers,
      status: 'waiting',
      createdAt: new Date()
    };
    
    games.set(gameId, newGame);
    
    res.status(201).json(newGame);
  } catch (error) {
    console.error('Create game error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET api/games
// @desc    Get all available games
// @access  Private
router.get('/', auth, (req, res) => {
  try {
    // Convert Map to array and filter out games that are full or in progress
    const availableGames = Array.from(games.values())
      .filter(game => 
        game.status === 'waiting' && 
        game.players.length < game.maxPlayers
      );
    
    res.json(availableGames);
  } catch (error) {
    console.error('Get games error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET api/games/:id
// @desc    Get a specific game
// @access  Private
router.get('/:id', auth, (req, res) => {
  try {
    const gameId = req.params.id;
    const game = games.get(gameId);
    
    if (!game) {
      return res.status(404).json({ message: 'Game not found' });
    }
    
    res.json(game);
  } catch (error) {
    console.error('Get game error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST api/games/:id/join
// @desc    Join a game
// @access  Private
router.post('/:id/join', auth, (req, res) => {
  try {
    const gameId = req.params.id;
    const userId = req.user.id;
    
    // Find game
    const game = games.get(gameId);
    if (!game) {
      return res.status(404).json({ message: 'Game not found' });
    }
    
    // Check if game is full
    if (game.players.length >= game.maxPlayers) {
      return res.status(400).json({ message: 'Game is full' });
    }
    
    // Check if game has started
    if (game.status !== 'waiting') {
      return res.status(400).json({ message: 'Game has already started' });
    }
    
    // Check if user is already in the game
    if (game.players.some(player => player.id === userId)) {
      return res.status(400).json({ message: 'You are already in this game' });
    }
    
    // Add user to game
    game.players.push({
      id: userId,
      isHost: false
    });
    
    res.json(game);
  } catch (error) {
    console.error('Join game error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST api/games/:id/start
// @desc    Start a game
// @access  Private
router.post('/:id/start', auth, (req, res) => {
  try {
    const gameId = req.params.id;
    const userId = req.user.id;
    
    // Find game
    const game = games.get(gameId);
    if (!game) {
      return res.status(404).json({ message: 'Game not found' });
    }
    
    // Check if user is the host
    if (game.host !== userId) {
      return res.status(403).json({ message: 'Only the host can start the game' });
    }
    
    // Check if game has enough players
    if (game.players.length < 2) {
      return res.status(400).json({ message: 'Need at least 2 players to start' });
    }
    
    // Update game status
    game.status = 'in-progress';
    game.startedAt = new Date();
    
    res.json(game);
  } catch (error) {
    console.error('Start game error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET api/games/:id/invite
// @desc    Generate invite link for a game
// @access  Private
router.get('/:id/invite', auth, (req, res) => {
  try {
    const gameId = req.params.id;
    
    // Find game
    const game = games.get(gameId);
    if (!game) {
      return res.status(404).json({ message: 'Game not found' });
    }
    
    // Generate invite link
    const inviteLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/join/${gameId}`;
    
    res.json({ inviteLink });
  } catch (error) {
    console.error('Generate invite link error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST api/games/:id/leave
// @desc    Leave a game
// @access  Private
router.post('/:id/leave', auth, (req, res) => {
  try {
    const gameId = req.params.id;
    const userId = req.user.id;
    
    // Find game
    const game = games.get(gameId);
    if (!game) {
      return res.status(404).json({ message: 'Game not found' });
    }
    
    // Check if user is in the game
    const playerIndex = game.players.findIndex(player => player.id === userId);
    if (playerIndex === -1) {
      return res.status(400).json({ message: 'You are not in this game' });
    }
    
    // Remove player from game
    game.players.splice(playerIndex, 1);
    
    // If host left, assign new host or delete game
    if (game.host === userId) {
      if (game.players.length > 0) {
        game.host = game.players[0].id;
        game.players[0].isHost = true;
      } else {
        games.delete(gameId);
        return res.json({ message: 'Game deleted' });
      }
    }
    
    res.json(game);
  } catch (error) {
    console.error('Leave game error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
