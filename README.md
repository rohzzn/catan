# Catan 🎲

A beautiful, full-featured online multiplayer Settlers of Catan implementation.

## Features

- **Full Catan Rules** – Settlements, cities, roads, development cards, robber, trading, ports
- **2–4 Players** – Real-time multiplayer via Socket.io
- **Beautiful UI** – SVG hex board with resource icons, procedural sound effects
- **Development Cards** – Knight, Road Building, Year of Plenty, Monopoly, Victory Point
- **Trading** – Bank (4:1), Ports (3:1 and 2:1), Player-to-player trades
- **Special Cards** – Longest Road, Largest Army tracking

## Quick Start

Open two terminals:

**Terminal 1 – Server:**
```
cd server
npm install
npm start
```

**Terminal 2 – Client:**
```
cd client
npm install
npm run dev
```

Then open [http://localhost:5173](http://localhost:5173) in your browser.

Share your room code with friends. They open the same URL and join with the code.

## Free Hosting

The simplest free setup is one Render Web Service. It serves both the API and the built React client from the same URL.

**Render settings:**

```
Build Command: npm run install:all && npm run build
Start Command: npm start
Health Check Path: /health
```

Add this environment variable:

```
NODE_ENV=production
```

Choose the Free instance type. Free services may sleep after inactivity, so the first load can take a minute.

## How to Play

1. Create or join a game room
2. Host clicks **Start Game** (requires 2+ players)
3. **Setup Phase**: Each player places 2 settlements and 2 roads
4. **Main Game**: Roll dice → Collect resources → Build/Trade → End Turn
5. First to **10 Victory Points** wins!

### Victory Points
- Settlement: 1 VP
- City: 2 VP
- Longest Road (≥5): 2 VP
- Largest Army (≥3 knights): 2 VP
- Victory Point dev card: 1 VP each

### Building Costs
| Structure  | Cost |
|-----------|------|
| Road      | 🪵1 🧱1 |
| Settlement| 🪵1 🧱1 🌾1 🐑1 |
| City      | ⛏3 🌾2 |
| Dev Card  | ⛏1 🌾1 🐑1 |

## Tech Stack
- **Server**: Node.js + Express + Socket.io
- **Client**: React 18 + Vite + SVG board rendering
- **Audio**: Web Audio API (procedural sounds)
