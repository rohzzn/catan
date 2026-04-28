import React, { useState, useCallback, useRef } from 'react';
import Lobby from './components/Lobby.jsx';
import Game from './components/Game.jsx';
import { useSocket } from './hooks/useSocket.js';
import { sounds, initAudio } from './utils/sounds.js';

export default function App() {
  const [screen, setScreen] = useState('lobby'); // lobby | game
  const [gameState, setGameState] = useState(null);
  const [playerId, setPlayerId] = useState(null);
  const [roomCode, setRoomCode] = useState(null);
  const [error, setError] = useState('');
  const [chatLog, setChatLog] = useState([]);
  const prevPlayerRef = useRef(null);

  const handlers = {
    onConnect: () => console.log('Connected to server'),
    onDisconnect: () => setError('Disconnected from server'),

    onGameJoined: ({ roomCode: rc, gameState: gs, playerId: pid }) => {
      setRoomCode(rc);
      setGameState(gs);
      setPlayerId(pid);
      setScreen('game');
      setError('');
    },

    onGameUpdated: ({ gameState: gs }) => {
      setGameState(prev => {
        // Play sounds based on state changes
        if (prev && gs) {
          const myIdx = gs.players.findIndex(p => p.id === playerId);
          const prevCurrent = prev?.currentPlayer;
          const newCurrent = gs?.currentPlayer;

          if (myIdx !== -1 && newCurrent === myIdx && prevCurrent !== myIdx) {
            sounds.yourTurn();
          }
          if (gs.diceValues && (!prev.diceValues || prev.diceValues[0] !== gs.diceValues[0])) {
            sounds.diceRoll();
          }
          if (gs.board && prev.board) {
            const verts = gs.board.vertices;
            const prevVerts = prev.board.vertices;
            for (const [id, v] of Object.entries(verts)) {
              const pv = prevVerts[id];
              if (pv && !pv.building && v.building === 'settlement') sounds.placeSettlement();
              if (pv && pv.building === 'settlement' && v.building === 'city') sounds.placeCity();
            }
            const edges = gs.board.edges;
            const prevEdges = prev.board.edges;
            for (const [id, e] of Object.entries(edges)) {
              if (prevEdges[id] && prevEdges[id].road === null && e.road !== null) sounds.placeRoad();
            }
          }
        }
        return gs;
      });
    },

    onGameOver: ({ gameState: gs }) => {
      setGameState(gs);
      sounds.win();
    },

    onError: ({ message }) => {
      setError(message);
      sounds.error();
      setTimeout(() => setError(''), 4000);
    },

    onChat: (data) => setChatLog(prev => [...prev.slice(-99), data]),
  };

  const { emit } = useSocket(handlers);

  const handleLobbyAction = useCallback((action, data) => {
    initAudio();
    sounds.click();
    emit(action, data);
  }, [emit]);

  const handleGameAction = useCallback((action, payload) => {
    emit('game_action', { action, payload });
  }, [emit]);

  const handleStart = useCallback(() => {
    sounds.click();
    emit('start_game');
  }, [emit]);

  return (
    <div className="app">
      {error && (
        <div className="global-error">
          <span>⚠ {error}</span>
        </div>
      )}
      {screen === 'lobby' ? (
        <Lobby onAction={handleLobbyAction} />
      ) : (
        <Game
          gameState={gameState}
          playerId={playerId}
          roomCode={roomCode}
          onAction={handleGameAction}
          onStart={handleStart}
          emit={emit}
          chatLog={chatLog}
        />
      )}
    </div>
  );
}
