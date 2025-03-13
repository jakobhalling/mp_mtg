# MTG Multiplayer Online Game - Technology Research

## WebRTC vs WebSockets

After researching both technologies, WebRTC appears to be the better choice for our real-time multiplayer MTG game for the following reasons:

### WebRTC Advantages:
- Uses UDP instead of TCP, which is better for real-time games
- Avoids "Head of Line Blocking" issues present in TCP-based WebSockets
- Allows for direct peer-to-peer connections between players
- Better suited for low-latency applications like multiplayer games
- Supports data channels for sending game state information

### WebSockets Limitations:
- Uses TCP which can cause delays when packets need to be resent
- All communication must go through a server
- Higher latency compared to WebRTC's peer-to-peer approach

### Implementation Considerations:
- WebRTC is more complex to set up initially
- Requires signaling server for initial connection establishment
- May need STUN/TURN servers for NAT traversal
- Will need a WebSocket server for the non-game features (friends, matchmaking, etc.)

## P2P State Consensus Mechanisms

For implementing a majority-decides state consensus as requested, we can use a voting-based approach:

### Proposed Consensus Mechanism:
1. Each player maintains their own copy of the game state
2. When a player performs an action, it's broadcast to all other players
3. Each player independently validates and applies the action to their local state
4. If a player's state diverges from the majority, their state is rejected and replaced with the consensus state
5. A collusion of majority would be required to cheat

### Implementation Approach:
- Use a deterministic game engine where same inputs always produce same outputs
- Regularly hash and compare game states between peers
- When discrepancies are detected, initiate a voting process
- The majority state becomes the canonical state
- Players with divergent states receive the correct state and resynchronize

## MTG Game Mechanics Implementation

Based on research into digital MTG implementations, we should consider:

### Core Game Elements:
- Card representation (attributes, abilities, etc.)
- Game zones (hand, battlefield, graveyard, exile, etc.)
- Turn structure and phases
- Stack for resolving spells and abilities
- State-based actions

### Card Implementation:
- Base card class with properties for name, cost, type, etc.
- Inheritance or composition for different card types
- Event-based system for triggering abilities
- Modification system for changing card attributes (as seen in the Ethan Crooks implementation)

### Game State Management:
- Immutable game state objects for easy comparison and rollback
- Transaction-based system for applying changes
- Serializable state for network transmission
- Deterministic random number generation (using shared seeds)

### User Interactions:
- Drag and drop interface for card movement
- CTRL+click for multi-select
- Context menus for special actions
- Visual indicators for game phases and priority

## Next Steps

With this research complete, we can now move to designing the P2P game architecture that will incorporate:
- WebRTC for peer-to-peer game state communication
- A consensus mechanism for ensuring game state integrity
- A robust card and game mechanics implementation system
- Server-side components for non-game features
