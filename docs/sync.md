# Real-time Synchronization in AetherArena

AetherArena keeps all player movement authoritative on the server while still
rendering smooth motion on the client. The following pieces work together to
create a responsive multiplayer experience:

## 1. Authoritative game loop
- The Node.js server runs a fixed 60 FPS loop (16.67 ms per tick) inside
  [`server/game.js`](../server/game.js).
- Every tick, it integrates each player's velocity, clamps the position within
  the 1000×1000 arena, and broadcasts the full player list through Socket.io.
- The server is the single source of truth. Clients never update positions
  directly, preventing divergence or cheating.

## 2. High-frequency input
- Clients capture keyboard (WASD/arrow keys) and touch input and send it to the
  server every 16.67 ms via the `playerInput` event.
- Only the raw directional intent is transmitted, minimizing bandwidth and
  allowing the server to resolve collisions consistently.

## 3. State buffering & interpolation
- Each client keeps a rolling buffer of recent server snapshots for every
  visible player (`public/client.js`).
- Rendering happens ~100 ms in the past. This short delay ensures the client
  has two consecutive snapshots to interpolate between, even if one packet is
  delayed.
- By lerping the positions between the two snapshots that surround the render
  timestamp, remote avatars appear to glide smoothly instead of snapping.

## 4. Recovery from packet loss
- Because every broadcast contains the entire player list, dropped packets do
  not accumulate error. The next successful snapshot instantly corrects any
  drift.
- The interpolation buffer keeps only the newest 10 snapshots per player,
  striking a balance between responsiveness and stability.

This hybrid of server authority, high-frequency input, and client-side
interpolation is a battle-tested approach used by many real-time multiplayer
web games. It provides smooth movement while maintaining consistent, cheat
resistant gameplay.
