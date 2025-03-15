import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { DeckProvider } from './contexts/DeckContext';
import { GameProvider } from './contexts/GameContext';
import PrivateRoute from './components/PrivateRoute';
import SinglePlayerGame from './singleplayer/SinglePlayerGame';
import Login from './pages/Login';
import Register from './pages/Register';
import Home from './pages/Home';
import NotFound from './pages/NotFound';
import GameRoom from './pages/GameRoom';
import GameLobby from './pages/GameLobby';
import DeckManager from './pages/DeckManager';

function App() {
  return (
    <AuthProvider>
      <DeckProvider>
        <div className="App">
          <Routes>
            <Route path="/" element={
              <PrivateRoute>
                <Home />
              </PrivateRoute>
            } />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/decks" element={
              <PrivateRoute>
                <DeckManager />
              </PrivateRoute>
            } />
            <Route path="/game/:gameId" element={
              <PrivateRoute>
                <GameRoom />
              </PrivateRoute>
            } />
            <Route path="/game/:gameId/lobby" element={
              <PrivateRoute>
                <GameLobby />
              </PrivateRoute>
            } />
            <Route path="/singleplayer" element={
              <PrivateRoute>
                <GameProvider>
                  <SinglePlayerGame />
                </GameProvider>
              </PrivateRoute>
            } />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </div>
      </DeckProvider>
    </AuthProvider>
  );
}

export default App;
