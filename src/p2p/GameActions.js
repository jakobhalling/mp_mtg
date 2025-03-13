// GameActions.js
// Provides action creators for game state modifications

// Action types
export const ActionTypes = {
  DRAW_CARD: 'draw-card',
  PLAY_CARD: 'play-card',
  MOVE_CARD: 'move-card',
  UPDATE_LIFE: 'update-life',
  CHANGE_PHASE: 'change-phase',
  NEXT_TURN: 'next-turn',
  ADD_COUNTER: 'add-counter',
  REMOVE_COUNTER: 'remove-counter',
  CREATE_TOKEN: 'create-token'
};

// Draw card action
export const drawCard = (playerId, count = 1) => ({
  type: ActionTypes.DRAW_CARD,
  payload: {
    playerId,
    count
  }
});

// Play card action
export const playCard = (playerId, cardId, targetZone = 'battlefield') => ({
  type: ActionTypes.PLAY_CARD,
  payload: {
    playerId,
    cardId,
    targetZone
  }
});

// Move card between zones
export const moveCard = (playerId, cardId, sourceZone, targetZone) => ({
  type: ActionTypes.MOVE_CARD,
  payload: {
    playerId,
    cardId,
    sourceZone,
    targetZone
  }
});

// Update player life total
export const updateLife = (playerId, delta) => ({
  type: ActionTypes.UPDATE_LIFE,
  payload: {
    playerId,
    delta
  }
});

// Change game phase
export const changePhase = (phase) => ({
  type: ActionTypes.CHANGE_PHASE,
  payload: {
    phase
  }
});

// Move to next player's turn
export const nextTurn = () => ({
  type: ActionTypes.NEXT_TURN,
  payload: {}
});

// Add counter to a card
export const addCounter = (playerId, cardId, counterType, count = 1) => ({
  type: ActionTypes.ADD_COUNTER,
  payload: {
    playerId,
    cardId,
    counterType,
    count
  }
});

// Remove counter from a card
export const removeCounter = (playerId, cardId, counterType, count = 1) => ({
  type: ActionTypes.REMOVE_COUNTER,
  payload: {
    playerId,
    cardId,
    counterType,
    count
  }
});

// Create a token
export const createToken = (playerId, tokenData) => ({
  type: ActionTypes.CREATE_TOKEN,
  payload: {
    playerId,
    tokenData
  }
});

export default {
  drawCard,
  playCard,
  moveCard,
  updateLife,
  changePhase,
  nextTurn,
  addCounter,
  removeCounter,
  createToken
};
