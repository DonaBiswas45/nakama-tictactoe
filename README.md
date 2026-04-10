# Multiplayer Tic-Tac-Toe with Nakama

A real-time multiplayer Tic-Tac-Toe game built with server-authoritative architecture using Nakama as the backend.

**Live Demo:** https://nakama-tictactoe-eight.vercel.app  
**Nakama Server:** https://nakama-tictactoe-1cya.onrender.com  
**GitHub:** https://github.com/DonaBiswas45/nakama-tictactoe

---

## Features

- Real-time multiplayer via WebSocket
- Server-authoritative game logic — all moves validated on the server, no client-side cheating possible
- Automatic matchmaking — players are paired automatically
- Graceful disconnect handling — opponent wins by forfeit if a player leaves
- Global leaderboard tracking wins
- Responsive UI optimized for mobile and desktop
- Concurrent game support — multiple simultaneous sessions handled natively by Nakama

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React, Nakama JS SDK |
| Backend | Nakama 3.21.1 (JavaScript runtime) |
| Database | PostgreSQL 14 |
| Frontend Hosting | Vercel |
| Backend Hosting | Render |

---

## Architecture


The game uses a **server-authoritative** model:
1. Player sends a move to the Nakama server
2. Server validates the move (correct turn, empty cell)
3. Server updates the game state
4. Server broadcasts the new state to both players
5. Clients render the updated state

---

## Deployment

### Backend (Render)

1. Create a new **PostgreSQL** database on Render
2. Create a new **Web Service** on Render, connect your GitHub repo
3. Set the following environment variable:
   - `DATABASE_URL` = your PostgreSQL internal connection string from Render
4. Render uses the `Dockerfile` in the root to build and run Nakama

The `Dockerfile`:
```dockerfile
FROM heroiclabs/nakama:3.21.1
COPY ./modules /nakama/data/modules
COPY ./nakama-config.yml /nakama/data/config.yml
ENTRYPOINT ["/bin/sh", "-c"]
CMD ["/nakama/nakama migrate up --database.address \"$DATABASE_URL\" && exec /nakama/nakama --config /nakama/data/config.yml --database.address \"$DATABASE_URL\""]
```

### Frontend (Vercel)

1. Connect your GitHub repo to Vercel
2. Set root directory to `frontend`
3. Add environment variables:
   - `REACT_APP_NAKAMA_HOST` = your Render service hostname (no `https://`)
   - `REACT_APP_NAKAMA_PORT` = `443`
   - `REACT_APP_USE_SSL` = `true`
   - `REACT_APP_SERVER_KEY` = `defaultkey`
4. Deploy

---

## API Configuration

| Parameter | Value |
|-----------|-------|
| Server Key | `defaultkey` |
| HTTP Port | `7350` |
| WebSocket Port | `7350` |
| Console Port | `7351` |
| Matchmaker min/max | `2 / 2` |
| Leaderboard ID | `tictactoe_wins` |

---
## Local Development

### Prerequisites
- Docker and Docker Compose
- Node.js 18+

### 1. Clone the repo
```bash
git clone https://github.com/DonaBiswas45/nakama-tictactoe
cd nakama-tictactoe
```

### 2. Start Nakama
```bash
docker-compose up
```
Wait for: `{"msg":"Tictactoe module loaded!"}`

### 3. Start frontend
```bash
cd frontend
npm install
npm start
```
Open `http://localhost:3000` in two tabs to test multiplayer.
## How to Test Multiplayer

1. Open https://nakama-tictactoe-eight.vercel.app in two different browser tabs (or two different devices)
2. Click **Find Match** in both tabs
3. Nakama's matchmaker will pair the two players within ~15 seconds
4. Take turns clicking cells — only the player whose turn it is can make a move
5. The game ends when one player gets 3 in a row or the board is full (draw)
6. Results are recorded to the leaderboard automatically

---
