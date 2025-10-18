const MAP_SIZE = 1000;
const PLAYER_RADIUS = 20;
const PLAYER_SPEED = 220; // units per second

const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const randomColor = () => {
  const hue = Math.floor(Math.random() * 360);
  return `hsl(${hue}, 70%, 60%)`;
};

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

class Game {
  constructor() {
    this.players = new Map();
  }

  addPlayer(id) {
    const username = `Player_${randomInt(100, 999)}`;
    const color = randomColor();
    const x = randomInt(PLAYER_RADIUS, MAP_SIZE - PLAYER_RADIUS);
    const y = randomInt(PLAYER_RADIUS, MAP_SIZE - PLAYER_RADIUS);

    this.players.set(id, {
      id,
      username,
      color,
      x,
      y,
      radius: PLAYER_RADIUS,
      speed: PLAYER_SPEED,
      input: { up: false, down: false, left: false, right: false },
    });

    return this.players.get(id);
  }

  removePlayer(id) {
    this.players.delete(id);
  }

  getPlayer(id) {
    return this.players.get(id);
  }

  updateInput(id, input) {
    const player = this.getPlayer(id);
    if (!player) {
      return;
    }

    player.input = {
      up: Boolean(input.up),
      down: Boolean(input.down),
      left: Boolean(input.left),
      right: Boolean(input.right),
    };
  }

  step(deltaTime) {
    this.players.forEach((player) => {
      const { input } = player;
      let vx = 0;
      let vy = 0;
      if (input.up) vy -= 1;
      if (input.down) vy += 1;
      if (input.left) vx -= 1;
      if (input.right) vx += 1;

      if (vx !== 0 || vy !== 0) {
        const length = Math.hypot(vx, vy) || 1;
        vx /= length;
        vy /= length;
      }

      player.x += vx * player.speed * deltaTime;
      player.y += vy * player.speed * deltaTime;

      const minBound = player.radius;
      const maxBound = MAP_SIZE - player.radius;
      player.x = clamp(player.x, minBound, maxBound);
      player.y = clamp(player.y, minBound, maxBound);
    });
  }

  getState() {
    return Array.from(this.players.values()).map((player) => ({
      id: player.id,
      username: player.username,
      color: player.color,
      x: player.x,
      y: player.y,
      radius: player.radius,
    }));
  }
}

module.exports = {
  Game,
  MAP_SIZE,
  PLAYER_RADIUS,
};
