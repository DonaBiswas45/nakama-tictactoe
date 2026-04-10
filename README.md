# nakama-tictactoe

A real-time multiplayer Tic-Tac-Toe game built with server-authoritative architecture using Nakama as the backend.

Live Demo: https://nakama-tictactoe-eight.vercel.app
Nakama Server: https://nakama-tictactoe-1cya.onrender.com
GitHub: https://github.com/DonaBiswas45/nakama-tictactoe

Features

Real-time multiplayer via WebSocket
Server-authoritative game logic — all moves validated on the server, no client-side cheating possible
Automatic matchmaking — players are paired automatically
Graceful disconnect handling — opponent wins by forfeit if a player leaves
Global leaderboard tracking wins
Responsive UI optimized for mobile and desktop
Concurrent game support — multiple simultaneous sessions handled natively by Nakama


Tech Stack
LayerTechnologyFrontendReact, Nakama JS SDKBackendNakama 3.21.1 (JavaScript runtime)DatabasePostgreSQL 14Frontend HostingVercelBackend HostingRender

Local Development Setup
Prerequisites

Docker and Docker Compose
Node.js 18+
GitHub Codespaces (recommended for Windows)

1. Clone the repository
bashgit clone https://github.com/DonaBiswas45/nakama-tictactoe
cd nakama-tictactoe
2. Start Nakama backend
bashdocker-compose up
Wait for:
nakama | {"msg":"Tictactoe module loaded!"}
nakama | {"msg":"Found runtime modules","count":1}
Nakama console available at: http://localhost:7351
Login: admin / password
3. Start the frontend
bashcd frontend
npm install
npm start
Open http://localhost:3000 in two browser tabs to test multiplayer locally.
