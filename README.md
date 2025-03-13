# MTG Multiplayer Online Platform

A browser-based multiplayer Magic: The Gathering (MTG) game platform that allows players to play against friends in 2, 3, or 4 player games. The application features a peer-to-peer architecture for game state management with a majority-decides consensus mechanism, while server-side components handle authentication, lobby creation, and matchmaking.

## Project Overview

This project consists of two main components:
- **Client**: A React application built with Vite and TypeScript
- **Server**: A Node.js Express application with Socket.IO for real-time communication

## Installation in WSL

Follow these steps to install and run the MTG Multiplayer project locally in WSL:

### Prerequisites

- WSL (Windows Subsystem for Linux) installed and configured
- Node.js (v16+) installed in WSL
- Git installed in WSL

### Clone the Repository

1. Open your WSL terminal
2. Clone the repository to your local machine:
   ```bash
   git clone <repository-url> mtg_multiplayer
   cd mtg_multiplayer
   ```

### Server Setup

1. Navigate to the server directory:
   ```bash
   cd server
   ```

2. Install server dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables:
   - Create or modify the `.env` file in the server directory:
   ```
   PORT=5000
   JWT_SECRET=your_secure_jwt_secret
   FRONTEND_URL=http://localhost:3000
   ```
   Note: Replace `your_secure_jwt_secret` with a secure random string for JWT token generation.

4. Start the server:
   ```bash
   npm run dev
   ```
   This will start the server in development mode with nodemon for automatic reloading.

### Client Setup

1. Open a new WSL terminal window
2. Navigate to the client directory:
   ```bash
   cd path/to/mtg_multiplayer/client
   ```

3. Install client dependencies:
   ```bash
   npm install
   ```

4. Start the client development server:
   ```bash
   npm run dev
   ```
   This will start the Vite development server.

5. Access the application:
   - The client will be available at `http://localhost:3000` (or another port if 3000 is in use)
   - You can access it through your Windows browser by navigating to the URL shown in the terminal

## Testing the Application

### Manual Testing

1. Open the application in your browser
2. Register a new account or log in with an existing account
3. Create a new game lobby
4. Copy the invite link and open it in another browser window/tab to simulate another player
5. Test the game mechanics:
   - Card drawing and playing
   - Life total adjustments
   - Phase transitions
   - P2P communication between players

### Automated Testing

Currently, the project does not include automated tests. You can run linting checks on the client code:

```bash
cd client
npm run lint
```

## Troubleshooting

### Common Issues

1. **CORS Errors**: Ensure the `FRONTEND_URL` in the server's `.env` file matches the URL where your client is running.

2. **WebSocket Connection Failures**: Check that your firewall is not blocking WebSocket connections.

3. **P2P Connection Issues**: WebRTC connections may fail behind certain NATs or firewalls. Consider using a TURN server for production deployments.

4. **Port Conflicts**: If the default ports (5000 for server, 3000 for client) are already in use, you can change them:
   - For the server: Update the PORT in the `.env` file
   - For the client: Use the `--port` flag with the dev command: `npm run dev -- --port 3001`

## Additional Resources

For more information about the project architecture and design, refer to the following documentation:
- `project_summary.md`: Overview of the project and its features
- `requirements.md`: Detailed requirements specification
- `p2p_architecture_design.md`: Technical design of the P2P architecture
- `deployment_guide.md`: Guide for deploying the application to production

## Development Notes

- The client is built with React, TypeScript, and Vite
- The server uses Express.js and Socket.IO
- P2P communication is implemented using WebRTC via simple-peer
- Card data is fetched from the Scryfall API
