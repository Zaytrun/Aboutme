const socket = io();

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

const chatLog = document.getElementById('chat-log');
const chatInput = document.getElementById('chat-input');

const INTERPOLATION_DELAY = 100; // ms
const INPUT_RATE = 1000 / 60;
const GRID_SIZE = 50;

let mapSize = 1000;
let playerId = null;
let devicePixelRatioCache = window.devicePixelRatio || 1;

const inputState = {
  up: false,
  down: false,
  left: false,
  right: false,
};

const keyBindings = {
  KeyW: 'up',
  ArrowUp: 'up',
  KeyS: 'down',
  ArrowDown: 'down',
  KeyA: 'left',
  ArrowLeft: 'left',
  KeyD: 'right',
  ArrowRight: 'right',
};

const players = new Map();

function createPlayerEntry(serverPlayer, serverTimestamp) {
  return {
    id: serverPlayer.id,
    username: serverPlayer.username,
    color: serverPlayer.color,
    radius: serverPlayer.radius,
    buffer: [{
      serverTime: serverTimestamp,
      x: serverPlayer.x,
      y: serverPlayer.y,
    }],
    renderX: serverPlayer.x,
    renderY: serverPlayer.y,
    lastSeen: serverTimestamp,
  };
}

function upsertPlayer(serverPlayer, serverTimestamp) {
  let entry = players.get(serverPlayer.id);
  if (!entry) {
    entry = createPlayerEntry(serverPlayer, serverTimestamp);
    players.set(serverPlayer.id, entry);
  }

  entry.username = serverPlayer.username;
  entry.color = serverPlayer.color;
  entry.radius = serverPlayer.radius;
  entry.buffer.push({
    serverTime: serverTimestamp,
    x: serverPlayer.x,
    y: serverPlayer.y,
  });

  // Keep only recent samples to prevent unbounded growth.
  if (entry.buffer.length > 10) {
    entry.buffer.splice(0, entry.buffer.length - 10);
  }

  entry.lastSeen = serverTimestamp;
}

function removeMissingPlayers(activeIds) {
  Array.from(players.keys()).forEach((id) => {
    if (!activeIds.has(id)) {
      players.delete(id);
    }
  });
}

function addChatEntry({ system = false, username, color, message, timestamp }) {
  const entry = document.createElement('div');
  entry.classList.add('chat-entry');
  if (system) {
    entry.classList.add('system');
  }

  const time = new Date(timestamp || Date.now()).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  if (system) {
    entry.textContent = `[${time}] ${message}`;
  } else {
    const nameSpan = document.createElement('span');
    nameSpan.classList.add('username');
    nameSpan.style.color = color || '#ffffff';
    nameSpan.textContent = username ? `${username}` : 'Unknown';

    const textSpan = document.createElement('span');
    textSpan.textContent = `: ${message}`;

    entry.textContent = `[${time}] `;
    entry.appendChild(nameSpan);
    entry.appendChild(textSpan);
  }

  chatLog.appendChild(entry);
  chatLog.scrollTop = chatLog.scrollHeight;
}

function resizeCanvas() {
  devicePixelRatioCache = window.devicePixelRatio || 1;
  canvas.width = mapSize * devicePixelRatioCache;
  canvas.height = mapSize * devicePixelRatioCache;
  ctx.setTransform(devicePixelRatioCache, 0, 0, devicePixelRatioCache, 0, 0);
}

function drawBackground() {
  ctx.fillStyle = '#111423';
  ctx.fillRect(0, 0, mapSize, mapSize);

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 0; x <= mapSize; x += GRID_SIZE) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, mapSize);
  }
  for (let y = 0; y <= mapSize; y += GRID_SIZE) {
    ctx.moveTo(0, y);
    ctx.lineTo(mapSize, y);
  }
  ctx.stroke();

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.lineWidth = 4;
  ctx.strokeRect(0, 0, mapSize, mapSize);
}

function interpolatePlayer(entry, renderTimestamp) {
  const buffer = entry.buffer;
  if (buffer.length === 0) {
    return;
  }

  // Remove states that are too old.
  while (buffer.length >= 2 && buffer[1].serverTime <= renderTimestamp) {
    buffer.shift();
  }

  let position = buffer[0];

  if (
    buffer.length >= 2 &&
    buffer[0].serverTime <= renderTimestamp &&
    buffer[1].serverTime > renderTimestamp
  ) {
    const previous = buffer[0];
    const next = buffer[1];
    const delta = Math.max(1, next.serverTime - previous.serverTime);
    const t = Math.min(1, Math.max(0, (renderTimestamp - previous.serverTime) / delta));
    position = {
      x: previous.x + (next.x - previous.x) * t,
      y: previous.y + (next.y - previous.y) * t,
    };
  } else if (buffer.length >= 1) {
    position = buffer[0];
  }

  entry.renderX = position.x;
  entry.renderY = position.y;
}

function drawPlayers(renderTimestamp) {
  players.forEach((player) => {
    interpolatePlayer(player, renderTimestamp);

    ctx.beginPath();
    ctx.fillStyle = player.color;
    ctx.globalAlpha = player.id === playerId ? 1 : 0.9;
    ctx.arc(player.renderX, player.renderY, player.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    if (player.id === playerId) {
      ctx.lineWidth = 4;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.stroke();
    }

    ctx.fillStyle = '#ffffff';
    ctx.font = '16px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(player.username, player.renderX, player.renderY - player.radius - 8);
  });
}

function render() {
  requestAnimationFrame(render);

  ctx.save();
  ctx.clearRect(0, 0, mapSize, mapSize);
  drawBackground();

  const renderTimestamp = Date.now() - INTERPOLATION_DELAY;
  drawPlayers(renderTimestamp);

  ctx.restore();
}

function sendInputState() {
  socket.emit('playerInput', inputState);
}

setInterval(sendInputState, INPUT_RATE);

function handleKeyChange(event, isKeyDown) {
  const binding = keyBindings[event.code];
  if (!binding) {
    return;
  }
  inputState[binding] = isKeyDown;
}

document.addEventListener('keydown', (event) => {
  if (event.code === 'Enter') {
    if (document.activeElement !== chatInput) {
      chatInput.focus();
      event.preventDefault();
      return;
    }
  }

  if (document.activeElement === chatInput) {
    return;
  }

  if (keyBindings[event.code]) {
    event.preventDefault();
    handleKeyChange(event, true);
  }
});

document.addEventListener('keyup', (event) => {
  if (keyBindings[event.code]) {
    event.preventDefault();
    handleKeyChange(event, false);
  }
});

chatInput.addEventListener('keydown', (event) => {
  if (event.code === 'Enter') {
    const message = chatInput.value.trim();
    if (message.length > 0) {
      socket.emit('chatMessage', message);
    }
    chatInput.value = '';
    chatInput.blur();
    event.preventDefault();
  }
});

// Touch controls for mobile browsers.
let touchOrigin = null;

function resetTouchInput() {
  touchOrigin = null;
  inputState.up = false;
  inputState.down = false;
  inputState.left = false;
  inputState.right = false;
}

function updateTouchInput(touch) {
  if (!touchOrigin) {
    return;
  }

  const dx = touch.clientX - touchOrigin.x;
  const dy = touch.clientY - touchOrigin.y;
  const threshold = 12;

  inputState.left = dx < -threshold;
  inputState.right = dx > threshold;
  inputState.up = dy < -threshold;
  inputState.down = dy > threshold;
}

canvas.addEventListener(
  'touchstart',
  (event) => {
    const touch = event.touches[0];
    if (!touch) {
      return;
    }
    touchOrigin = { x: touch.clientX, y: touch.clientY };
    updateTouchInput(touch);
    event.preventDefault();
  },
  { passive: false }
);

canvas.addEventListener(
  'touchmove',
  (event) => {
    const touch = event.touches[0];
    if (!touch) {
      return;
    }
    updateTouchInput(touch);
    event.preventDefault();
  },
  { passive: false }
);

canvas.addEventListener(
  'touchend',
  () => {
    resetTouchInput();
  },
  { passive: false }
);

canvas.addEventListener(
  'touchcancel',
  () => {
    resetTouchInput();
  },
  { passive: false }
);

socket.on('init', (data) => {
  playerId = data.id;
  mapSize = data.mapSize;
  resizeCanvas();

  const activeIds = new Set();
  const initialTimestamp = data.timestamp || Date.now();
  data.players.forEach((player) => {
    upsertPlayer(player, initialTimestamp);
    activeIds.add(player.id);
  });
  removeMissingPlayers(activeIds);

  addChatEntry({
    system: true,
    message: 'Connected to AetherArena. Prepare for battle!',
    timestamp: Date.now(),
  });
});

socket.on('state', (serverState) => {
  const { players: serverPlayers, timestamp } = serverState;
  const activeIds = new Set();
  serverPlayers.forEach((player) => {
    upsertPlayer(player, timestamp);
    activeIds.add(player.id);
  });
  removeMissingPlayers(activeIds);
});

socket.on('chatMessage', (message) => {
  addChatEntry(message);
});

socket.on('playerEvent', (payload) => {
  if (!payload || !payload.username) {
    return;
  }
  const message =
    payload.type === 'joined'
      ? `${payload.username} entered the arena.`
      : `${payload.username} left the arena.`;
  addChatEntry({
    system: true,
    message,
    timestamp: Date.now(),
  });
});

window.addEventListener('resize', resizeCanvas);

resizeCanvas();
render();
