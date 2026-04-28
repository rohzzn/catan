import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateBoard } from './game/board.js';
import { processAction, createDevDeck } from './game/logic.js';

const app = express();
const httpServer = createServer(app);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const configuredOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);
const devOrigins = ['http://localhost:5173', 'http://localhost:3000'];
const corsOrigin =
  process.env.NODE_ENV === 'production' && configuredOrigins.length === 0
    ? true
    : [...devOrigins, ...configuredOrigins];

const io = new Server(httpServer, {
  cors: {
    origin: corsOrigin,
    methods: ['GET', 'POST'],
  },
});

app.use(cors({ origin: corsOrigin }));
app.use(express.json());

app.get('/health', (_, res) => res.json({ ok: true }));

const rooms = new Map();
const playerRoom = new Map();

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code;
  do {
    code = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  } while (rooms.has(code));
  return code;
}

function makePlayer(socketId, name, color) {
  return {
    id: socketId,
    name,
    color,
    resources: { wood: 0, brick: 0, ore: 0, wheat: 0, sheep: 0 },
    devCards: [],
    playedDevCards: [],
    settlements: [],
    cities: [],
    roads: [],
    vp: 0,
    vpPublic: 0,
    knightsPlayed: 0,
    hasLongestRoad: false,
    hasLargestArmy: false,
  };
}

const COLORS = ['red', 'blue', 'white', 'orange'];

io.on('connection', (socket) => {
  console.log(`+ Connected: ${socket.id}`);

  socket.on('create_game', ({ playerName }) => {
    const roomCode = generateRoomCode();
    const player = makePlayer(socket.id, playerName || 'Player 1', 'red');

    const gameState = {
      roomCode,
      phase: 'lobby',
      players: [player],
      board: null,
      currentPlayer: 0,
      setupAction: 'settlement',
      diceRolled: false,
      diceValues: null,
      mustMoveRobber: false,
      longestRoadOwner: null,
      largestArmyOwner: null,
      devCardDeck: [],
      devCardPlayed: false,
      tradeOffer: null,
      winner: null,
      log: [`${playerName} created the room. Waiting for players...`],
    };

    rooms.set(roomCode, gameState);
    playerRoom.set(socket.id, roomCode);
    socket.join(roomCode);
    socket.emit('game_joined', { roomCode, gameState, playerId: socket.id });
    console.log(`Room ${roomCode} created by ${playerName}`);
  });

  socket.on('join_game', ({ roomCode, playerName }) => {
    const code = (roomCode || '').toUpperCase().trim();
    const gameState = rooms.get(code);

    if (!gameState) { socket.emit('error', { message: 'Room not found' }); return; }
    if (gameState.phase !== 'lobby') { socket.emit('error', { message: 'Game already started' }); return; }
    if (gameState.players.length >= 4) { socket.emit('error', { message: 'Room is full (max 4)' }); return; }
    if (gameState.players.find(p => p.id === socket.id)) {
      socket.emit('game_joined', { roomCode: code, gameState, playerId: socket.id });
      return;
    }

    const usedColors = gameState.players.map(p => p.color);
    const color = COLORS.find(c => !usedColors.includes(c)) || 'red';
    const player = makePlayer(socket.id, playerName || `Player ${gameState.players.length + 1}`, color);

    gameState.players.push(player);
    gameState.log.push(`${playerName} joined!`);

    playerRoom.set(socket.id, code);
    socket.join(code);
    socket.emit('game_joined', { roomCode: code, gameState, playerId: socket.id });
    socket.to(code).emit('game_updated', { gameState });
    console.log(`${playerName} joined room ${code}`);
  });

  socket.on('start_game', () => {
    const roomCode = playerRoom.get(socket.id);
    const gameState = rooms.get(roomCode);
    if (!gameState) return;

    if (gameState.players[0].id !== socket.id) {
      socket.emit('error', { message: 'Only the host can start' });
      return;
    }
    if (gameState.players.length < 2) {
      socket.emit('error', { message: 'Need at least 2 players to start' });
      return;
    }

    // Shuffle player order and reassign colors
    gameState.players = shuffle(gameState.players);
    gameState.players.forEach((p, i) => { p.color = COLORS[i]; });

    gameState.board = generateBoard();
    gameState.devCardDeck = createDevDeck();
    gameState.phase = 'setup1';
    gameState.currentPlayer = 0;
    gameState.setupAction = 'settlement';
    gameState.log.push('Game started! Setup Phase 1');
    gameState.log.push(`${gameState.players[0].name}: place your first settlement`);

    io.to(roomCode).emit('game_updated', { gameState });
    console.log(`Game started in room ${roomCode}`);
  });

  socket.on('game_action', ({ action, payload }) => {
    const roomCode = playerRoom.get(socket.id);
    const gameState = rooms.get(roomCode);
    if (!gameState) return;

    const playerIndex = gameState.players.findIndex(p => p.id === socket.id);
    if (playerIndex === -1) return;

    try {
      const result = processAction(gameState, action, payload || {}, playerIndex);
      if (result.error) {
        socket.emit('action_error', { message: result.error });
        return;
      }

      Object.assign(gameState, result.state);
      rooms.set(roomCode, gameState);

      io.to(roomCode).emit('game_updated', { gameState });

      if (gameState.winner !== null) {
        io.to(roomCode).emit('game_over', {
          winner: gameState.players[gameState.winner],
          gameState,
        });
      }
    } catch (err) {
      console.error('Action error:', err);
      socket.emit('action_error', { message: 'Server error processing action' });
    }
  });

  socket.on('send_chat', ({ message }) => {
    const roomCode = playerRoom.get(socket.id);
    const gameState = rooms.get(roomCode);
    if (!gameState) return;
    const player = gameState.players.find(p => p.id === socket.id);
    if (!player) return;
    io.to(roomCode).emit('chat_message', { player: player.name, color: player.color, message });
  });

  socket.on('disconnect', () => {
    console.log(`- Disconnected: ${socket.id}`);
    const roomCode = playerRoom.get(socket.id);
    if (roomCode) {
      const gameState = rooms.get(roomCode);
      if (gameState) {
        const player = gameState.players.find(p => p.id === socket.id);
        if (player) {
          gameState.log.push(`${player.name} disconnected`);
          io.to(roomCode).emit('game_updated', { gameState });
        }
      }
      playerRoom.delete(socket.id);
    }
  });
});

const clientDistPath = path.resolve(__dirname, '../../client/dist');
const shouldServeClient = process.env.NODE_ENV === 'production' && fs.existsSync(path.join(clientDistPath, 'index.html'));

if (shouldServeClient) {
  app.use(express.static(clientDistPath));
  app.get('*', (_, res) => {
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Catan server on http://localhost:${PORT}`);
});
