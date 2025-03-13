// ScryfallService.js
// Handles interactions with the Scryfall API for card data and images

class ScryfallService {
  constructor() {
    this.baseUrl = 'https://api.scryfall.com';
    this.cardCache = new Map(); // Cache card data to minimize API calls
    this.requestQueue = []; // Queue for rate limiting
    this.processing = false;
    this.requestDelay = 100; // Delay between requests (ms) to respect rate limits
  }

  // Search for cards by name
  async searchCards(query, page = 1) {
    const endpoint = '/cards/search';
    const params = new URLSearchParams({
      q: query,
      page
    });

    return this.makeRequest(`${endpoint}?${params.toString()}`);
  }

  // Get a specific card by exact name
  async getCardByName(name, fuzzy = false) {
    // Check cache first
    const cacheKey = `name:${name}`;
    if (this.cardCache.has(cacheKey)) {
      return this.cardCache.get(cacheKey);
    }

    const endpoint = '/cards/named';
    const params = new URLSearchParams({
      [fuzzy ? 'fuzzy' : 'exact']: name
    });

    const card = await this.makeRequest(`${endpoint}?${params.toString()}`);
    
    // Cache the result
    if (card) {
      this.cardCache.set(cacheKey, card);
      this.cardCache.set(`id:${card.id}`, card);
    }
    
    return card;
  }

  // Get a card by its Scryfall ID
  async getCardById(id) {
    // Check cache first
    const cacheKey = `id:${id}`;
    if (this.cardCache.has(cacheKey)) {
      return this.cardCache.get(cacheKey);
    }

    const endpoint = `/cards/${id}`;
    const card = await this.makeRequest(endpoint);
    
    // Cache the result
    if (card) {
      this.cardCache.set(cacheKey, card);
      this.cardCache.set(`name:${card.name}`, card);
    }
    
    return card;
  }

  // Get multiple cards by their names
  async getCardsByNames(names) {
    // Check which cards we already have in cache
    const cardsToFetch = [];
    const result = [];

    for (const name of names) {
      const cacheKey = `name:${name}`;
      if (this.cardCache.has(cacheKey)) {
        result.push(this.cardCache.get(cacheKey));
      } else {
        cardsToFetch.push(name);
      }
    }

    if (cardsToFetch.length > 0) {
      // Use the collection endpoint for batch fetching
      const endpoint = '/cards/collection';
      const body = {
        identifiers: cardsToFetch.map(name => ({ name }))
      };

      const response = await this.makeRequest(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      if (response && response.data) {
        // Cache and add to result
        for (const card of response.data) {
          this.cardCache.set(`name:${card.name}`, card);
          this.cardCache.set(`id:${card.id}`, card);
          result.push(card);
        }
      }
    }

    return result;
  }

  // Parse a deck list in text format and fetch all cards
  async parseDeckList(deckText) {
    const lines = deckText.split('\n').filter(line => line.trim() !== '');
    const cardEntries = [];
    let commander = null;

    for (const line of lines) {
      // Skip comment lines
      if (line.startsWith('//') || line.startsWith('#')) continue;

      // Parse line in format: "1 Card Name"
      const match = line.match(/^(\d+)\s+(.+)$/);
      if (!match) continue;

      const count = parseInt(match[1], 10);
      const cardName = match[2].trim();

      // Check if this is marked as commander
      const isCommander = cardName.toLowerCase().includes('*commander*');
      const cleanName = cardName.replace(/\*commander\*/i, '').trim();

      try {
        const card = await this.getCardByName(cleanName);
        if (card) {
          // Add the card to the deck list
          for (let i = 0; i < count; i++) {
            cardEntries.push({
              ...card,
              instanceId: `${card.id}-${i}` // Create unique instance ID
            });
          }

          // Set as commander if marked
          if (isCommander) {
            commander = card;
          }
        }
      } catch (err) {
        console.error(`Error fetching card "${cleanName}":`, err);
      }
    }

    return {
      cards: cardEntries,
      commander
    };
  }

  // Get image URL for a card
  getCardImageUrl(card, size = 'normal') {
    if (!card) return null;

    // Handle double-faced cards
    if (card.card_faces && card.card_faces.length > 0 && card.card_faces[0].image_uris) {
      return card.card_faces[0].image_uris[size];
    }

    // Regular cards
    if (card.image_uris) {
      return card.image_uris[size];
    }

    return null;
  }

  // Make a rate-limited request to the Scryfall API
  async makeRequest(endpoint, options = {}) {
    return new Promise((resolve, reject) => {
      // Add to queue
      this.requestQueue.push({
        endpoint,
        options,
        resolve,
        reject
      });

      // Start processing if not already
      if (!this.processing) {
        this.processQueue();
      }
    });
  }

  // Process the request queue with rate limiting
  async processQueue() {
    if (this.requestQueue.length === 0) {
      this.processing = false;
      return;
    }

    this.processing = true;
    const { endpoint, options, resolve, reject } = this.requestQueue.shift();

    try {
      const url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint}`;
      const response = await fetch(url, options);
      
      if (!response.ok) {
        throw new Error(`Scryfall API error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      resolve(data);
    } catch (err) {
      console.error('Scryfall API request failed:', err);
      reject(err);
    }

    // Wait before processing next request
    setTimeout(() => {
      this.processQueue();
    }, this.requestDelay);
  }

  // Clear the cache
  clearCache() {
    this.cardCache.clear();
  }
}

export default ScryfallService;
