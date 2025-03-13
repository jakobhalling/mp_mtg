import axios from 'axios';

class ScryfallService {
  constructor() {
    // Use environment variables for configuration
    this.baseUrl = import.meta.env.VITE_SCRYFALL_API_URL || 'https://api.scryfall.com';
    this.requestDelay = parseInt(import.meta.env.VITE_SCRYFALL_REQUEST_DELAY || '100');
    this.maxConcurrentRequests = parseInt(import.meta.env.VITE_SCRYFALL_MAX_CONCURRENT_REQUESTS || '1');
    this.batchSize = parseInt(import.meta.env.VITE_SCRYFALL_BATCH_SIZE || '75');
    
    // Rate limiting tracking
    this.rateLimitRemaining = 1000; // Default high value
    this.rateLimitReset = 0;
    this.activeRequests = 0;
    this.requestQueue = [];
  }

  // Helper method to process the request queue
  async processQueue() {
    if (this.requestQueue.length === 0 || this.activeRequests >= this.maxConcurrentRequests) {
      return;
    }

    // Check rate limits
    if (this.rateLimitRemaining <= 5) {
      const now = Date.now();
      if (now < this.rateLimitReset) {
        // Wait until rate limit resets
        const waitTime = this.rateLimitReset - now + 1000; // Add 1 second buffer
        console.log(`Rate limit almost reached. Waiting ${waitTime}ms before next request.`);
        setTimeout(() => this.processQueue(), waitTime);
        return;
      }
    }

    // Process next request
    const nextRequest = this.requestQueue.shift();
    this.activeRequests++;

    try {
      // Add delay between requests
      await new Promise(resolve => setTimeout(resolve, this.requestDelay));
      
      // Execute the request
      const response = await nextRequest.execute();
      
      // Update rate limit info from headers
      if (response.headers) {
        this.rateLimitRemaining = parseInt(response.headers['x-ratelimit-remaining'] || this.rateLimitRemaining);
        const resetSeconds = parseInt(response.headers['x-ratelimit-reset'] || '0');
        if (resetSeconds > 0) {
          this.rateLimitReset = Date.now() + (resetSeconds * 1000);
        }
      }
      
      // Resolve the promise with the response data
      nextRequest.resolve(response.data);
    } catch (error) {
      // Check if it's a rate limit error
      if (error.response && error.response.status === 429) {
        console.log('Rate limit exceeded. Retrying after delay.');
        // Put the request back in the queue
        this.requestQueue.unshift(nextRequest);
        // Wait for the retry-after header or default to 1 second
        const retryAfter = parseInt(error.response.headers['retry-after'] || '1') * 1000;
        setTimeout(() => this.processQueue(), retryAfter);
      } else {
        // For other errors, reject the promise
        nextRequest.reject(error);
      }
    } finally {
      this.activeRequests--;
      // Process next request
      this.processQueue();
    }
  }

  // Helper method to queue a request
  queueRequest(requestFn) {
    return new Promise((resolve, reject) => {
      // Add request to queue
      this.requestQueue.push({
        execute: requestFn,
        resolve,
        reject
      });
      
      // Start processing queue if not already processing
      this.processQueue();
    });
  }

  // Get card by ID
  async getCardById(cardId) {
    return this.queueRequest(() => 
      axios.get(`${this.baseUrl}/cards/${cardId}`)
    );
  }

  // Search for cards by name
  async searchCardsByName(cardName) {
    return this.queueRequest(() => 
      axios.get(`${this.baseUrl}/cards/search`, {
        params: {
          q: `!"${cardName}"`,
          unique: 'prints'
        }
      })
    );
  }

  // Get card image URL
  getCardImageUrl(card) {
    if (!card) return '';
    
    // For double-faced cards
    if (card.card_faces && card.card_faces[0].image_uris) {
      return card.card_faces[0].image_uris.normal;
    }
    
    // For regular cards
    if (card.image_uris) {
      return card.image_uris.normal;
    }
    
    return '';
  }

  // Parse a deck list and fetch all card data
  async parseDeckList(deckList, progressCallback = null) {
    try {
      // Split the deck list into lines
      const lines = deckList.split('\n').filter(line => line.trim() !== '');
      
      // Extract card names and quantities
      const cardEntries = [];
      let commander = null;
      
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
        }
        
        // Parse quantity and card name
        const match = line.match(/^(\d+)x?\s+(.+)$/) || line.match(/^x?(\d+)\s+(.+)$/);
        
        if (match) {
          const quantity = parseInt(match[1]);
          const cardName = match[2].trim();
          
          cardEntries.push({
            quantity,
            name: cardName,
            isCommander
          });
        } else {
          // If no quantity specified, assume 1
          cardEntries.push({
            quantity: 1,
            name: line,
            isCommander
          });
        }
      }
      
      // Process cards in batches to avoid overwhelming the API
      const cardPromises = [];
      const cards = [];
      let processedCount = 0;
      
      // Process in batches
      for (let i = 0; i < cardEntries.length; i += this.batchSize) {
        const batch = cardEntries.slice(i, i + this.batchSize);
        
        // Process each card in the batch
        const batchPromises = batch.map(entry => {
          return this.fetchCardByName(entry.name)
            .then(card => {
              if (!card) return null;
              
              // Check if this card is designated as commander
              if (entry.isCommander && !commander) {
                commander = card;
              }
              
              // Add the card to the deck multiple times based on quantity
              for (let j = 0; j < entry.quantity; j++) {
                cards.push(card);
              }
              
              // Update progress
              processedCount++;
              if (progressCallback) {
                progressCallback(processedCount / cardEntries.length);
              }
              
              return card;
            })
            .catch(err => {
              console.error(`Error fetching card "${entry.name}":`, err);
              processedCount++;
              if (progressCallback) {
                progressCallback(processedCount / cardEntries.length);
              }
              return null;
            });
        });
        
        // Wait for all cards in this batch to be processed
        await Promise.all(batchPromises);
        
        // Add a small delay between batches
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      // Filter out null entries (failed card fetches)
      const validCards = cards.filter(card => card !== null);
      
      return {
        cards: validCards,
        commander
      };
    } catch (error) {
      console.error('Error parsing deck list:', error);
      throw error;
    }
  }

  // Helper method to fetch a card by name
  async fetchCardByName(cardName) {
    try {
      // Check if we have this card in localStorage cache
      const cachedCards = JSON.parse(localStorage.getItem('cardCache') || '{}');
      
      // Search by exact name in cache
      const cachedCardId = Object.keys(cachedCards).find(
        id => cachedCards[id].name.toLowerCase() === cardName.toLowerCase()
      );
      
      if (cachedCardId) {
        return cachedCards[cachedCardId];
      }
      
      // If not in cache, search Scryfall
      const response = await this.searchCardsByName(cardName);
      
      if (response && response.data && response.data.length > 0) {
        return response.data[0];
      }
      
      return null;
    } catch (error) {
      // If the exact search fails, try a fuzzy search
      try {
        const fuzzyResponse = await this.queueRequest(() => 
          axios.get(`${this.baseUrl}/cards/named`, {
            params: {
              fuzzy: cardName
            }
          })
        );
        
        return fuzzyResponse;
      } catch (fuzzyError) {
        console.error(`Could not find card "${cardName}":`, fuzzyError);
        return null;
      }
    }
  }
}

export default ScryfallService;
