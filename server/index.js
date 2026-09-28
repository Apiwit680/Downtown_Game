import { randomBytes } from 'node:crypto';
import { createServer } from 'node:http';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { Server } from 'socket.io';
import { loadData } from './data.js';
import { GameRoom } from './game.js';

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const clientDirectory = join(projectRoot, 'client');
const codeCharacters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function roomCode(rooms) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const bytes = randomBytes(6);
    const code = Array.from(bytes, (byte) => codeCharacters[byte % codeCharacters.length]).join('');
    if (!rooms.has(code)) return code;
  }
  throw new Error('Cannot create a room right now');
}

function objectPayload(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Invalid request');
  }
  return value;
}

function normalizedCode(value) {
  const code = String(value ?? '').trim().toUpperCase();
  if (!/^[A-Z0-9]{6}$/.test(code)) throw new Error('Enter a six-character room code');
  return code;
}

function sessionKey(code, playerId) {
  return `${code}:${playerId}`;
}

/** Create one local, in-memory game server. All player actions pass through GameRoom. */
export function createGameServer({ data = loadData() } = {}) {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, { maxHttpBufferSize: 64 * 1024 });
  const rooms = new Map();
  const sessions = new Map(); // socket ID -> { code, playerId }
  const playerSockets = new Map(); // code:playerId -> socket ID

  app.disable('x-powered-by');
  app.get('/health', (_request, response) => {
    response.json({ ok: true, rooms: rooms.size, uptimeSeconds: Math.floor(process.uptime()) });
  });
  app.use(express.static(clientDirectory));

  function sendStates(room) {
    for (const player of room.players) {
      const socketId = playerSockets.get(sessionKey(room.code, player.id));
      const socket = socketId && io.sockets.sockets.get(socketId);
      if (socket?.connected) socket.emit('game:state', room.viewFor(player.id));
    }
  }

  io.on('connection', (socket) => {
    function currentSession() {
      const session = sessions.get(socket.id);
      if (!session) throw new Error('Join or resume a room first');
      const room = rooms.get(session.code);
      if (!room) throw new Error('Room no longer exists');
      return { room, playerId: session.playerId };
    }

    function requireFreeSocket() {
      if (sessions.has(socket.id)) throw new Error('You are already in a room');
    }

    function bindPlayer(room, player) {
      const key = sessionKey(room.code, player.id);
      const previousSocketId = playerSockets.get(key);
      if (previousSocketId && previousSocketId !== socket.id) {
        const previousSocket = io.sockets.sockets.get(previousSocketId);
        sessions.delete(previousSocketId);
        previousSocket?.leave(room.code);
        previousSocket?.emit('room:replaced');
      }
      sessions.set(socket.id, { code: room.code, playerId: player.id });
      playerSockets.set(key, socket.id);
      player.connected = true;
      socket.join(room.code);
    }

    function handle(eventName, action) {
      socket.on(eventName, (incoming, acknowledgement) => {
        const ack = typeof acknowledgement === 'function' ? acknowledgement : () => {};
        try {
          const { room, reply = {} } = action(objectPayload(incoming));
          if (room) sendStates(room);
          ack({ ok: true, ...reply });
        } catch (error) {
          ack({ ok: false, error: error instanceof Error ? error.message : 'Request failed' });
        }
      });
    }

    handle('room:create', ({ name, mode, singlePlayer = false }) => {
      requireFreeSocket();
      const code = roomCode(rooms);
      if (typeof singlePlayer !== 'boolean') throw new Error('Invalid play mode');
      const room = new GameRoom({ code, mode, hostName: name, data, singlePlayer });
      rooms.set(code, room);
      const player = room.players[0];
      bindPlayer(room, player);
      return { room, reply: { roomCode: code, playerId: player.id } };
    });

    handle('room:join', ({ code: requestedCode, name }) => {
      requireFreeSocket();
      const code = normalizedCode(requestedCode);
      const room = rooms.get(code);
      if (!room) throw new Error('Room not found');
      const player = room.addPlayer(name);
      bindPlayer(room, player);
      return { room, reply: { roomCode: code, playerId: player.id } };
    });

    handle('room:resume', ({ code: requestedCode, playerId }) => {
      const code = normalizedCode(requestedCode);
      const room = rooms.get(code);
      if (!room) throw new Error('Room not found');
      const player = room.players.find((item) => item.id === playerId);
      if (!player || player.departed) throw new Error('Player session not found in this room');
      const active = sessions.get(socket.id);
      if (active && (active.code !== code || active.playerId !== playerId)) {
        throw new Error('You are already in another room');
      }
      bindPlayer(room, player);
      return { room, reply: { roomCode: code, playerId: player.id } };
    });

    handle('room:leave', () => {
      const { room, playerId } = currentSession();
      if (room.status === 'finished') {
        const player = room.players.find(p=>p.id===playerId); player.departed=true; player.connected=false;
        sessions.delete(socket.id); playerSockets.delete(sessionKey(room.code,playerId)); socket.leave(room.code);
        if (room.players.every(p=>p.departed)) rooms.delete(room.code);
        return { room: rooms.has(room.code) ? room : null, reply: {closed:false} };
      }
      if (room.status !== 'lobby') throw new Error('ออกจากห้องรอได้ก่อนเริ่มเกมเท่านั้น');
      const player = room.players.find((item) => item.id === playerId);
      if (player.host) {
        // Explicit cancellation invalidates every saved session for this lobby.
        rooms.delete(room.code);
        for (const member of room.players) {
          const key = sessionKey(room.code, member.id);
          const socketId = playerSockets.get(key);
          const memberSocket = socketId && io.sockets.sockets.get(socketId);
          if (socketId) sessions.delete(socketId);
          playerSockets.delete(key);
          memberSocket?.leave(room.code);
          memberSocket?.emit('room:closed', { roomCode: room.code });
        }
        return { reply: { roomCode: room.code, closed: true } };
      }
      sessions.delete(socket.id);
      playerSockets.delete(sessionKey(room.code, playerId));
      socket.leave(room.code);
      room.players = room.players.filter((item) => item.id !== playerId);
      return { room, reply: { roomCode: room.code, closed: false } };
    });

    handle('game:start', ({ code: requestedCode }) => {
      const { room, playerId } = currentSession();
      if (requestedCode !== undefined && normalizedCode(requestedCode) !== room.code) {
        throw new Error('Room code does not match your session');
      }
      room.start(playerId);
      return { room };
    });

    handle('game:action', ({ type, payload = {}, expectedVersion }) => {
      const { room, playerId } = currentSession();
      if (expectedVersion !== room.version) throw new Error('State changed; use the latest action');
      if (typeof type !== 'string') throw new Error('Invalid action');
      room.act(playerId, type, objectPayload(payload));
      return { room };
    });

    handle('game:travel', ({ locationId, transport, expectedVersion }) => {
      const { room, playerId } = currentSession();
      if (expectedVersion !== room.version) throw new Error('State changed; use the latest action');
      if (typeof locationId !== 'string' || typeof transport !== 'string') {
        throw new Error('Choose a destination and transport');
      }
      const trip = room.travel(playerId, locationId, transport);
      return { room, reply: { trip } };
    });

    socket.on('disconnect', () => {
      const session = sessions.get(socket.id);
      if (!session) return;
      sessions.delete(socket.id);
      const room = rooms.get(session.code);
      if (!room) return;
      const key = sessionKey(session.code, session.playerId);
      if (playerSockets.get(key) !== socket.id) return;
      playerSockets.delete(key);
      const player = room.players.find((item) => item.id === session.playerId);
      if (player) player.connected = false;
      sendStates(room);
    });
  });

  return { app, httpServer, io, rooms };
}

function portFromEnvironment() {
  const port = Number(process.env.PORT ?? 3000);
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    throw new Error('PORT must be an integer between 0 and 65535');
  }
  return port;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { httpServer } = createGameServer();
  const host = process.env.HOST || '0.0.0.0';
  httpServer.listen(portFromEnvironment(), host, () => {
    const address = httpServer.address();
    const port = typeof address === 'object' ? address.port : portFromEnvironment();
    console.log(`Downtown demo running at http://localhost:${port}`);
  });
}
