# MTG Multiplayer Online Game - P2P Architecture Design

## Overview

This document outlines the architecture for a peer-to-peer (P2P) Magic: The Gathering multiplayer online game. The architecture supports 2-4 player games with real-time state synchronization and a majority-decides consensus mechanism.

## System Components

### 1. Client Application

A browser-based application built with modern web technologies that handles:
- Game UI rendering
- Local game state management
- P2P communication
- Card data and image fetching
- User interactions

### 2. P2P Network Layer

Handles direct communication between players using WebRTC:
- Game state synchronization
- Action broadcasting
- Consensus mechanism
- Connection management

### 3. Signaling Server

A lightweight server that facilitates:
- Initial WebRTC connection establishment
- Game lobby creation and management
- Invite link generation
- User authentication

### 4. Game State Manager

Manages the game state with:
- Deterministic game engine
- State validation
- Conflict resolution
- Action processing

### 5. Card Database

Interfaces with Scryfall API to:
- Fetch card data and images
- Support deck importing
- Cache frequently used cards

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client Application                        │
│                                                                 │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐    │
│  │    UI     │  │  Game     │  │   P2P     │  │   Card    │    │
│  │  Renderer │  │  Engine   │  │  Network  │  │  Database │    │
│  └───────────┘  └───────────┘  └───────────┘  └───────────┘    │
└─────────────────────────┬─────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                         P2P Network                             │
│                                                                 │
│  ┌───────────────────┐      ┌───────────────────┐              │
│  │   WebRTC Data     │      │    Consensus      │              │
│  │     Channels      │◄────►│     Protocol      │              │
│  └───────────────────┘      └───────────────────┘              │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                       Signaling Server                          │
│                                                                 │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐    │
│  │  WebRTC   │  │   Lobby   │  │   User    │  │   Deck    │    │
│  │ Signaling │  │  Manager  │  │   Auth    │  │  Storage  │    │
│  └───────────┘  └───────────┘  └───────────┘  └───────────┘    │
└─────────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                        External APIs                            │
│                                                                 │
│                      ┌───────────────┐                          │
│                      │  Scryfall API │                          │
│                      └───────────────┘                          │
└─────────────────────────────────────────────────────────────────┘
```

## P2P Connection Model

The game will use a full mesh network topology where each player connects directly to every other player:

```
    Player A
   /       \
  /         \
Player B --- Player C
  \         /
   \       /
    Player D
```

This approach:
- Eliminates single points of failure
- Provides redundancy for state verification
- Supports the majority-decides consensus mechanism

## Game State Synchronization

### State Structure

The game state will be structured as an immutable object with:
- Game metadata (turn number, active player, phase)
- Player states (life, hand, battlefield, etc.)
- Stack (spells and abilities being resolved)
- Shared zones (exile, command zone)

### Synchronization Process

1. **Action Broadcasting**:
   - When a player performs an action, it's broadcast to all other players
   - Each action includes a unique ID, player ID, timestamp, and action data

2. **State Validation**:
   - Each client independently validates and applies the action
   - The resulting state is hashed and compared with other players

3. **Consensus Check**:
   - State hashes are compared at key points (end of phases, after complex actions)
   - If discrepancies are detected, a full state comparison is triggered

4. **Conflict Resolution**:
   - When states diverge, the majority state is considered canonical
   - Players with divergent states receive the correct state and resynchronize

## Card Implementation

Cards will be implemented using a component-based system:

```
Card
├── BaseProperties (name, cost, type, etc.)
├── Abilities[] (triggered, activated, static)
├── Effects[] (continuous, replacement, one-shot)
└── Visuals (images, animations)
```

Each ability and effect will be implemented as a separate component that can be attached to cards, making the system extensible for new card mechanics.

## User Interface Architecture

The UI will be structured in layers:

1. **Game Board Layer**: Displays the battlefield and game zones
2. **Card Layer**: Renders cards with drag-and-drop functionality
3. **UI Controls Layer**: Game controls, phase indicators, etc.
4. **Modal Layer**: Card zoom, stack display, etc.

The layout will adapt based on player count:
- 2 players: Opponent at top, player at bottom
- 3-4 players: Player at bottom, opponents arranged in upper half

## Server-Side Components

While game state is handled P2P, these features require server support:

1. **Authentication Service**:
   - Email/password authentication
   - Session management

2. **Lobby Service**:
   - Create/join game lobbies
   - Generate invite links
   - Match players

3. **Deck Management Service**:
   - Parse and validate deck lists
   - Store user decks

## Data Flow

1. **Game Initialization**:
   ```
   Player A creates lobby → Server generates invite link → 
   Players B, C, D join via link → WebRTC connections established → 
   All players load decks → Game starts
   ```

2. **Game Action Flow**:
   ```
   Player takes action → Action broadcast to all players → 
   All clients validate and apply action → 
   State hashes compared → Consensus reached or conflict resolved
   ```

3. **Card Interaction Flow**:
   ```
   Player hovers card → Client fetches high-res image from cache/Scryfall → 
   Enlarged card displayed with text → 
   Player drags card → Position updates broadcast to all players
   ```

## Security Considerations

1. **Cheating Prevention**:
   - Majority-decides consensus prevents individual cheating
   - Critical game actions require validation from multiple peers
   - State hashing and comparison at regular intervals

2. **Connection Security**:
   - WebRTC's built-in encryption for data channels
   - Secure authentication for server-side features

## Scalability and Performance

1. **Optimizations**:
   - Local caching of card data and images
   - Efficient state diffing to minimize data transfer
   - Batched updates for non-critical state changes

2. **Resource Management**:
   - Lazy loading of card images
   - Memory management for large collections
   - Connection quality monitoring and adaptation

## Next Steps

1. Select appropriate web framework based on this architecture
2. Create detailed UI layout designs
3. Implement core P2P game state management
4. Develop server-side features
5. Integrate with Scryfall API
6. Implement responsive UI
7. Test functionality with multiple players
8. Deploy and present to user
