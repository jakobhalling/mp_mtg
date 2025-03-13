# MTG Multiplayer Online Game Requirements

## P2P Implementation
- WebRTC or WebSockets for peer-to-peer communication
- State consensus mechanism where majority decides the game state
- Game state handled entirely P2P
- Server-side handling for:
  - Friends lists
  - Inviting to games
  - Finding online matches
  - Deck management

## UI Layout
- Flat 2D representation (top-down view)
- Player's own board on lower half of screen
- Opponents' boards on upper half of screen
- Ability to zoom in on specific opponent boards
- Thumbnails of other players' boards when zoomed in
- Card interactions:
  - Drag and drop for single cards
  - CTRL + click for multi-select
- All game zones visible for all players:
  - Battlefield (primary focus)
  - Hand (can be simplified as icon + card count)
  - Library
  - Graveyard
  - Exile
  - Command zone
- Tab animations for transitions
- No additional animations/effects needed
- When players reach 0 life, their board is removed to give more space to remaining players
- Card graphics sourced from Scryfall
- Hovering over a card shows larger version with updated Scryfall text below image

## Game Mechanics
- Support for all deck, hand, graveyard manipulations:
  - Scry X cards from library
  - Draw cards to hand
  - Draw cards directly to play
  - Reveal cards from hand or top of deck
  - Add tokens to board
  - Add copies of enemy cards
- Manual manipulation of:
  - Life totals
  - Toxic counters
  - Counters on cards
  - Moving cards between zones (graveyard, exile, etc.)
- Support for Commander format (ability to promote one card as commander)

## Server-Side Features
- Simple invite link system for game lobbies (no friendlist initially)
- Deck import via plain text in format: "amount Card Name"
  Example:
  ```
  10 Forest
  1 Black Lotus
  ...
  ```
- Email/password authentication

## Technical Constraints
- Chrome browser support
- Desktop PC focus (no mobile support)
- Responsive feel but no extreme performance requirements

## Player Counts
- Support for 2, 3, or 4 player games
- Layout adjusts based on player count
