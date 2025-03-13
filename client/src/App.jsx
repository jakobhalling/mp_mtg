import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { GameProvider } from './contexts/GameContext';
import { DeckProvider } from './contexts/DeckContext';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import Home from './pages/Home';
import GameLobby from './pages/GameLobby';
import GameRoom from './pages/GameRoom';
import DeckManager from './pages/DeckManager';
import NotFound from './pages/NotFound';

// Components
import PrivateRoute from './components/PrivateRoute';

function App() {
  return (
    <Router>
      <AuthProvider>
        <DeckProvider>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            
            {/* Protected Routes */}
            <Route path="/" element={<PrivateRoute><Home /></PrivateRoute>} />
            <Route path="/decks" element={<PrivateRoute><DeckManager /></PrivateRoute>} />
            <Route path="/lobby" element={<PrivateRoute><GameLobby /></PrivateRoute>} />
            <Route path="/game/:gameId" element={
              <PrivateRoute>
                <GameProvider>
                  <GameRoom />
                </GameProvider>
              </PrivateRoute>
            } />
            <Route path="/join/:gameId" element={<PrivateRoute><GameLobby /></PrivateRoute>} />
            
            {/* 404 Route */}
            <Route path="/404" element={<NotFound />} />
            <Route path="*" element={<Navigate to="/404" replace />} />
          </Routes>
        </DeckProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
