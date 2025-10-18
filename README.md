# AetherArena

AetherArena is a fast-paced 2D top-down multiplayer arena built with
Node.js, Express, Socket.io, and HTML5 Canvas. Jump into the shared 1000×1000
grid, glide around as a colored orb, and chat with other players in real time.

## Features
- ⚔️ **Real-time multiplayer:** The server keeps authoritative state and streams
  updates at 60 FPS so everyone sees a consistent arena.
- 🌀 **Smooth motion:** Client-side interpolation blends remote positions for
  silky movement even with small latency spikes.
- 💬 **Integrated chat:** A side-panel chat feed keeps players connected with
  auto-scrolling, timestamps, and system join/leave announcements.
- 🧭 **Responsive UI:** The layout adapts to desktop, tablet, and mobile screens,
  including optional touch controls on the canvas for mobile movement.
- 🌈 **Instant identity:** Each spawn receives a random color and username such
  as `Player_527` so you can dive in without accounts.

## Project structure
```
AetherArena/
├─ server/                 # Express + Socket.io backend
│  ├─ index.js             # Entry point and socket handling
│  ├─ game.js              # Authoritative game state and update loop
│  └─ package.json         # Pinned backend dependencies
├─ public/                 # Static frontend served by Express
│  ├─ index.html           # Root HTML document
│  ├─ style.css            # Responsive layout and theme
│  └─ client.js            # Canvas renderer, input, chat, interpolation
├─ docs/
│  └─ sync.md              # Technical overview of the realtime model
├─ .github/workflows/      # CI/CD for GitHub Pages
│  └─ deploy.yml
├─ LICENSE                 # MIT license
└─ README.md               # You are here
```

## Getting started

### Prerequisites
- [Node.js 20+](https://nodejs.org/)

### Installation
```bash
cd server
npm install
```

### Local development
```bash
npm start
```
The server launches on [http://localhost:3000](http://localhost:3000) and serves
the static frontend. Open that URL in multiple browser windows or devices to
play together.

### Optional: hot reloading
```bash
npm run dev
```
This uses `nodemon` to restart the server whenever you edit backend files.

## Gameplay & controls
- **Move:** WASD or arrow keys.
- **Mobile movement:** Touch and drag on the canvas; the direction of your
  swipe determines motion.
- **Chat:** Press <kbd>Enter</kbd> to focus the chat box, type your message, then
  press <kbd>Enter</kbd> again to send. System messages announce joins and
  departures.

Player avatars are circles with a label rendered above them. The server keeps
positions within the boundaries so you can never leave the arena.

## How it works
- The backend (`server/game.js`) integrates player input at a fixed 60 FPS and
  broadcasts the full state via Socket.io.
- The frontend buffers snapshots and interpolates ~100 ms in the past to draw
  smooth motion. Details of the approach are documented in
  [`docs/sync.md`](docs/sync.md).

## Deployment
A GitHub Actions workflow (`.github/workflows/deploy.yml`) uploads the contents
of `public/` to GitHub Pages on every push to `main`. Because GitHub Pages is
static hosting, running the actual multiplayer game in production requires a
Node.js host for the server-side Socket.io instance.

## License
Released under the [MIT License](LICENSE).
