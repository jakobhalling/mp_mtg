# MTG Multiplayer Online Platform - Project Summary

## Project Overview
This project is a browser-based multiplayer Magic: The Gathering (MTG) game platform that allows players to play against friends in 2, 3, or 4 player games. The application features a peer-to-peer architecture for game state management with a majority-decides consensus mechanism, while server-side components handle authentication, lobby creation, and matchmaking.

## Key Features

### P2P Game State Management
- WebRTC-based direct peer-to-peer connections
- Majority-decides consensus mechanism for state synchronization
- Full mesh network topology for redundancy
- Automatic conflict resolution and state recovery

### Game Mechanics
- Support for all MTG game zones (hand, battlefield, library, graveyard, exile)
- Card manipulation (draw, play, move between zones)
- Life total tracking
- Game phase management
- Counter and token support
- Commander format support

### User Interface
- Player-centric layout with your board on lower half
- Opponents' boards on upper half with adaptive layout
- Ability to zoom in on specific opponent boards
- Card hover functionality showing Scryfall images and text
- Drag-and-drop card manipulation with CTRL+click for multi-select

### Server-Side Features
- User authentication with JWT
- Game lobby creation and management
- Invite link generation
- WebRTC signaling

## Technology Stack

### Frontend
- React for UI components
- Tailwind CSS for styling
- simple-peer for WebRTC connections
- Socket.IO client for real-time communication
- React Router for navigation

### Backend
- Node.js with Express
- Socket.IO for WebSocket communication
- JWT for authentication
- In-memory data storage (can be replaced with a database)

### External APIs
- Scryfall API for card data and images

## Architecture
The application follows a hybrid architecture:
- Game state is managed entirely peer-to-peer
- Authentication, matchmaking, and other non-game features are handled server-side
- WebRTC for direct player-to-player communication
- WebSockets for signaling and lobby management

## Deployment Options
The application can be deployed using various platforms:
- Server: Heroku, Render
- Client: Netlify, Vercel

## Future Enhancements
Potential improvements for future versions:
- Persistent database for user accounts and game history
- Spectator mode
- Tournament support
- Mobile-optimized interface
- Advanced card search and filtering
- Chat functionality
- AI opponents
