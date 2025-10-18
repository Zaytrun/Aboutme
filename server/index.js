const path = require('path');
const http = require('http');
const express = require('express');
const { Server } = require('socket.io');
const { Game, MAP_SIZE } = require('./game');

const PORT = process.env.PORT || 3000;
const TICK_RATE = 60;

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
  },
});

const staticDir = path.join(__dirname, '..', 'public');
app.use(express.static(staticDir));

const game = new Game();

io.on('connection', (socket) => {
  const player = game.addPlayer(socket.id);

  socket.emit('init', {
    id: socket.id,
    mapSize: MAP_SIZE,
    players: game.getState(),
    timestamp: Date.now(),
  });

  io.emit('playerEvent', {
    type: 'joined',
    username: player.username,
  });

  io.emit('chatMessage', {
    system: true,
    message: `${player.username} materialized in the arena.`,
    timestamp: Date.now(),
  });

  socket.on('playerInput', (input) => {
    game.updateInput(socket.id, input);
  });

  socket.on('chatMessage', (message) => {
    const cleanMessage = String(message || '').trim().slice(0, 200);
    const current = game.getPlayer(socket.id);
    if (!cleanMessage || !current) {
      return;
    }

    io.emit('chatMessage', {
      system: false,
      message: cleanMessage,
      username: current.username,
      color: current.color,
      timestamp: Date.now(),
    });
  });

  socket.on('disconnect', () => {
    const departing = game.getPlayer(socket.id);
    if (departing) {
      io.emit('playerEvent', {
        type: 'left',
        username: departing.username,
      });

      io.emit('chatMessage', {
        system: true,
        message: `${departing.username} faded into the aether.`,
        timestamp: Date.now(),
      });
    }

    game.removePlayer(socket.id);
  });
});

setInterval(() => {
  game.step(1 / TICK_RATE);
  io.emit('state', {
    timestamp: Date.now(),
    players: game.getState(),
  });
}, 1000 / TICK_RATE);

server.listen(PORT, () => {
  console.log(`AetherArena server listening on http://localhost:${PORT}`);
});
