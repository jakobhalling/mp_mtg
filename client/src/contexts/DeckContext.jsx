import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import ScryfallService from '../p2p/ScryfallService';

const DeckContext = createContext();

export function useDeck() {
  return useContext(DeckContext);
}

export function DeckProvider({ children }) {
  const [decks, setDecks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cardCache, setCardCache] = useState({});
  const [processingDeck, setProcessingDeck] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const { getAuthHeader } = useAuth();
  const scryfallService = new ScryfallService();

  // Load decks and card cache from localStorage on mount
  useEffect(() => {
    const loadData = () => {
      try {
        // Load decks
        const savedDecks = localStorage.getItem('userDecks');
        if (savedDecks) {
          setDecks(JSON.parse(savedDecks));
        }
        
        // Load card cache
        const savedCardCache = localStorage.getItem('cardCache');
        if (savedCardCache) {
          setCardCache(JSON.parse(savedCardCache));
        }
      } catch (err) {
        console.error('Error loading data from localStorage:', err);
        setError('Failed to load your decks');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Save decks to localStorage whenever they change
  useEffect(() => {
    if (decks.length > 0) {
      localStorage.setItem('userDecks', JSON.stringify(decks));
    }
  }, [decks]);

  // Save card cache to localStorage whenever it changes
  useEffect(() => {
    if (Object.keys(cardCache).length > 0) {
      localStorage.setItem('cardCache', JSON.stringify(cardCache));
    }
  }, [cardCache]);

  // Add a card to the cache
  const cacheCard = (card) => {
    if (!card || !card.id) return;
    
    // Extract only the necessary information to keep cache size manageable
    const cachedCard = {
      id: card.id,
      name: card.name,
      type_line: card.type_line,
      oracle_text: card.oracle_text,
      mana_cost: card.mana_cost,
      cmc: card.cmc,
      colors: card.colors,
      color_identity: card.color_identity,
      rarity: card.rarity,
      set: card.set,
      set_name: card.set_name,
      image_uris: card.image_uris,
      card_faces: card.card_faces,
      power: card.power,
      toughness: card.toughness,
      loyalty: card.loyalty,
      legalities: card.legalities
    };
    
    setCardCache(prevCache => ({
      ...prevCache,
      [card.id]: cachedCard
    }));
  };

  // Get a card from cache or fetch it
  const getCard = async (cardId) => {
    // Check cache first
    if (cardCache[cardId]) {
      return cardCache[cardId];
    }
    
    // If not in cache, fetch from Scryfall
    try {
      const card = await scryfallService.getCardById(cardId);
      if (card) {
        cacheCard(card);
      }
      return card;
    } catch (err) {
      console.error(`Error fetching card ${cardId}:`, err);
      return null;
    }
  };

  // Create a new deck with full card data fetched upfront
  const createDeck = async (name, deckText, commanderCardName = null) => {
    try {
      setLoading(true);
      setProcessingDeck(true);
      setProcessingProgress(0);
      setError('');
      
      // Parse deck using ScryfallService
      console.log("Parsing deck list and fetching all card data...");
      const parsedDeck = await scryfallService.parseDeckList(deckText, 
        (progress) => setProcessingProgress(progress * 100));
      
      // Find commander card if specified
      let commanderCard = null;
      if (commanderCardName) {
        commanderCard = parsedDeck.cards.find(card => 
          card.name.toLowerCase() === commanderCardName.toLowerCase());
      } else if (parsedDeck.commander) {
        commanderCard = parsedDeck.commander;
      }
      
      // Cache all cards
      parsedDeck.cards.forEach(card => {
        cacheCard(card);
      });
      
      // Create deck object with full card data
      const newDeck = {
        id: Date.now().toString(),
        name,
        text: deckText,
        cardCount: parsedDeck.cards.length,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        commander: commanderCard ? {
          id: commanderCard.id,
          name: commanderCard.name,
          imageUrl: scryfallService.getCardImageUrl(commanderCard)
        } : null,
        cards: parsedDeck.cards.map(card => ({
          id: card.id,
          name: card.name,
          imageUrl: scryfallService.getCardImageUrl(card),
          count: 1 // This will be aggregated later
        }))
      };
      
      // Aggregate card counts
      const cardCounts = {};
      parsedDeck.cards.forEach(card => {
        if (cardCounts[card.id]) {
          cardCounts[card.id]++;
        } else {
          cardCounts[card.id] = 1;
        }
      });
      
      // Update counts in the deck
      newDeck.cards = Object.keys(cardCounts).map(cardId => {
        const card = newDeck.cards.find(c => c.id === cardId);
        return {
          ...card,
          count: cardCounts[cardId]
        };
      });
      
      setDecks(prevDecks => [...prevDecks, newDeck]);
      return newDeck;
    } catch (err) {
      console.error('Error creating deck:', err);
      setError('Failed to create deck. Please check your deck list format.');
      throw err;
    } finally {
      setLoading(false);
      setProcessingDeck(false);
      setProcessingProgress(0);
    }
  };

  // Update an existing deck
  const updateDeck = async (deckId, name, deckText, commanderCardName = null) => {
    try {
      setLoading(true);
      setProcessingDeck(true);
      setProcessingProgress(0);
      setError('');
      
      // Find the deck to update
      const deckIndex = decks.findIndex(deck => deck.id === deckId);
      if (deckIndex === -1) {
        throw new Error('Deck not found');
      }
      
      // Parse updated deck
      console.log("Parsing updated deck list and fetching all card data...");
      const parsedDeck = await scryfallService.parseDeckList(deckText,
        (progress) => setProcessingProgress(progress * 100));
      
      // Find commander card if specified
      let commanderCard = null;
      if (commanderCardName) {
        commanderCard = parsedDeck.cards.find(card => 
          card.name.toLowerCase() === commanderCardName.toLowerCase());
      } else if (parsedDeck.commander) {
        commanderCard = parsedDeck.commander;
      }
      
      // Cache all cards
      parsedDeck.cards.forEach(card => {
        cacheCard(card);
      });
      
      // Create updated deck object
      const updatedDeck = {
        ...decks[deckIndex],
        name,
        text: deckText,
        cardCount: parsedDeck.cards.length,
        updatedAt: new Date().toISOString(),
        commander: commanderCard ? {
          id: commanderCard.id,
          name: commanderCard.name,
          imageUrl: scryfallService.getCardImageUrl(commanderCard)
        } : null,
        cards: parsedDeck.cards.map(card => ({
          id: card.id,
          name: card.name,
          imageUrl: scryfallService.getCardImageUrl(card),
          count: 1 // This will be aggregated later
        }))
      };
      
      // Aggregate card counts
      const cardCounts = {};
      parsedDeck.cards.forEach(card => {
        if (cardCounts[card.id]) {
          cardCounts[card.id]++;
        } else {
          cardCounts[card.id] = 1;
        }
      });
      
      // Update counts in the deck
      updatedDeck.cards = Object.keys(cardCounts).map(cardId => {
        const card = updatedDeck.cards.find(c => c.id === cardId);
        return {
          ...card,
          count: cardCounts[cardId]
        };
      });
      
      // Update the decks array
      const newDecks = [...decks];
      newDecks[deckIndex] = updatedDeck;
      setDecks(newDecks);
      
      return updatedDeck;
    } catch (err) {
      console.error('Error updating deck:', err);
      setError('Failed to update deck');
      throw err;
    } finally {
      setLoading(false);
      setProcessingDeck(false);
      setProcessingProgress(0);
    }
  };

  // Set commander for a deck
  const setCommander = async (deckId, cardName) => {
    try {
      setLoading(true);
      setError('');
      
      // Find the deck
      const deckIndex = decks.findIndex(deck => deck.id === deckId);
      if (deckIndex === -1) {
        throw new Error('Deck not found');
      }
      
      const deck = decks[deckIndex];
      
      // Find the card in the deck
      const card = deck.cards.find(c => c.name.toLowerCase() === cardName.toLowerCase());
      if (!card) {
        throw new Error('Card not found in deck');
      }
      
      // Get full card data if needed
      let commanderCard = cardCache[card.id];
      if (!commanderCard) {
        commanderCard = await scryfallService.getCardById(card.id);
        if (commanderCard) {
          cacheCard(commanderCard);
        }
      }
      
      // Update the deck with the new commander
      const updatedDeck = {
        ...deck,
        commander: {
          id: card.id,
          name: card.name,
          imageUrl: card.imageUrl
        },
        updatedAt: new Date().toISOString()
      };
      
      // Update the decks array
      const newDecks = [...decks];
      newDecks[deckIndex] = updatedDeck;
      setDecks(newDecks);
      
      return updatedDeck;
    } catch (err) {
      console.error('Error setting commander:', err);
      setError('Failed to set commander');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Delete a deck
  const deleteDeck = (deckId) => {
    try {
      setDecks(prevDecks => prevDecks.filter(deck => deck.id !== deckId));
    } catch (err) {
      console.error('Error deleting deck:', err);
      setError('Failed to delete deck');
    }
  };

  // Get a deck by ID
  const getDeck = (deckId) => {
    return decks.find(deck => deck.id === deckId);
  };

  // Set active deck for game
  const setActiveDeck = (deckId) => {
    const deck = getDeck(deckId);
    if (deck) {
      localStorage.setItem('activeDeckId', deckId);
      localStorage.setItem('userDeck', deck.text);
      
      // Also store the full deck data for game use
      localStorage.setItem('activeFullDeck', JSON.stringify({
        cards: deck.cards,
        commander: deck.commander
      }));
      
      return deck;
    }
    return null;
  };

  // Get active deck
  const getActiveDeck = () => {
    const activeDeckId = localStorage.getItem('activeDeckId');
    if (activeDeckId) {
      return getDeck(activeDeckId);
    }
    return null;
  };

  // Clear card cache
  const clearCardCache = () => {
    setCardCache({});
    localStorage.removeItem('cardCache');
  };

  const value = {
    decks,
    loading,
    error,
    processingDeck,
    processingProgress,
    cardCache,
    createDeck,
    updateDeck,
    deleteDeck,
    getDeck,
    setActiveDeck,
    getActiveDeck,
    setCommander,
    getCard,
    clearCardCache
  };

  return (
    <DeckContext.Provider value={value}>
      {children}
    </DeckContext.Provider>
  );
}

export default DeckContext;
