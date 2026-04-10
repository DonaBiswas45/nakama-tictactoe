import { Client } from "@heroiclabs/nakama-js";
import { v4 as uuidv4 } from "uuid";

// ─── Config ───────────────────────────────────────────────────
// In production, set REACT_APP_NAKAMA_HOST to your server's public IP/domain
const NAKAMA_HOST = process.env.REACT_APP_NAKAMA_HOST || "127.0.0.1";
const NAKAMA_PORT = process.env.REACT_APP_NAKAMA_PORT || "7350";
const SERVER_KEY  = process.env.REACT_APP_SERVER_KEY  || "defaultkey";
const USE_SSL     = process.env.REACT_APP_USE_SSL === "true";

const LEADERBOARD_ID = "tictactoe_wins";

const client = new Client(SERVER_KEY, NAKAMA_HOST, NAKAMA_PORT, USE_SSL);

// ─── Auth & Socket ────────────────────────────────────────────

export const connectToNakama = async () => {
  const deviceId = localStorage.getItem("deviceId") || uuidv4();
  localStorage.setItem("deviceId", deviceId);

  const session = await client.authenticateDevice(deviceId, true);
  const socket = client.createSocket(USE_SSL,  false);
  await socket.connect(session, true);

  return { client, session, socket };
};

// ─── Matchmaking ──────────────────────────────────────────────

export const findMatch = (socket) => {
  // Nakama matchmaker: find exactly 2 players
  return socket.addMatchmaker("*", 2, 2, {}, {});
};

export const cancelMatchmaking = (socket, ticket) => {
  return socket.removeMatchmaker(ticket);
};

// ─── Game ─────────────────────────────────────────────────────

export const sendMove = (socket, matchId, cellIndex) => {
  console.log("Sending move:", cellIndex, "to match:", matchId);
  const payload = JSON.stringify({ cell: cellIndex });
  return socket.sendMatchState(matchId, 1, payload);
};

// ─── Leaderboard ──────────────────────────────────────────────
export const fetchLeaderboard = async (limit = 10) => {
  try {
    const session = await _getSession();
    const result = await client.listLeaderboardRecords(
      session,
      LEADERBOARD_ID,
      [],      // ownerIds - empty array not null
      limit,   // limit comes BEFORE cursor
      null,    // cursor
    );
    console.log("Leaderboard raw result:", result);
    return result.records || [];
  } catch (e) {
    console.error("Leaderboard fetch failed:", e);
    return [];
  }
};

export const fetchMyRank = async (userId) => {
  try {
    const session = await _getSession();
    const result = await client.listLeaderboardRecords(
      session,
      LEADERBOARD_ID,
      [],  // ownerIds to highlight
      limit,
      null,
    );
    console.log("My rank result:", result);
    return result.owner_records?.[0] || result.ownerRecords?.[0] || null;
  } catch (e) {
    console.error("My rank fetch failed:", e);
    return null;
  }
};

// ─── Internal helpers ─────────────────────────────────────────



let _cachedSession = null;

async function _getSession() {
  const deviceId = localStorage.getItem("deviceId");
  if (!deviceId) return null;
  if (_cachedSession && !_cachedSession.isexpired(Date.now() / 1000)) {
    return _cachedSession;
  }
  _cachedSession = await client.authenticateDevice(deviceId, false);
  return _cachedSession;
}

export { client };