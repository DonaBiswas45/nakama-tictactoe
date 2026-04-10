import React, { useEffect, useState, useCallback, useRef } from 'react';
import { connectToNakama, findMatch, cancelMatchmaking, sendMove, client,fetchLeaderboard, fetchMyRank } from './api';
import './App.css';


// ─── Constants ────────────────────────────────────────────────
const VIEWS = { LOBBY: 'lobby', SEARCHING: 'searching', GAME: 'game', RESULT: 'result', LEADERBOARD: 'leaderboard' };

export default function App() {
  const [view, setView]             = useState(VIEWS.LOBBY);
  const [socket, setSocket]         = useState(null);
  const [myId, setMyId]             = useState('');
  const [myUsername, setMyUsername] = useState('');
  const [matchId, setMatchId]       = useState(null);
  const [gameState, setGameState]   = useState(null);
  const [ticket, setTicket]         = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [myRank, setMyRank]         = useState(null);
  const [error, setError]           = useState('');
  const [connecting, setConnecting] = useState(true);
  const socketRef = useRef(null);
  const sessionRef = useRef(null);

  // ─── Connect on mount ───────────────────────────────────────
  useEffect(() => {
    connectToNakama()
      .then(({ session, socket }) => {
        socketRef.current = socket;
        setSocket(socket);
        setMyId(session.user_id);
        setMyUsername(session.username);
        sessionRef.current = session;
        setConnecting(false);

        // When matchmaker finds us an opponent
        socket.onmatchmakermatched = async (matched) => {
          try {
            const match = await socket.joinMatch(matched.match_id, null);
            setMatchId(match.match_id);
            setTicket(null);
            setView(VIEWS.GAME);
          } catch (e) {
            setError('Failed to join match: ' + e.message);
            setView(VIEWS.LOBBY);
          }
        };

        // Real-time game state from server
        socket.onmatchdata = (result) => {
        if (result.op_code === 1) {
          const data = JSON.parse(new TextDecoder().decode(result.data));
          setGameState(data);
         if (data.winner !== null) {
            setView(VIEWS.RESULT);
          } else {
             setView(prev => prev === VIEWS.LEADERBOARD ? VIEWS.LEADERBOARD : VIEWS.GAME);
          }
      }
};

        socket.ondisconnect = () => {
          setError('Disconnected from server. Please refresh.');
        };
      })
      .catch(err => {
        setError('Could not connect to game server. Is Nakama running?');
        setConnecting(false);
        console.error(err);
      });
  }, []);

  // ─── Actions ────────────────────────────────────────────────
  const handleFindMatch = useCallback(async () => {
    setError('');
    setView(VIEWS.SEARCHING);
    try {
      const result = await findMatch(socketRef.current);
      setTicket(result.ticket);
    } catch (e) {
      setError('Matchmaking failed: ' + e.message);
      setView(VIEWS.LOBBY);
    }
  }, []);

  const handleCancelSearch = useCallback(async () => {
    if (ticket) {
      try { await cancelMatchmaking(socketRef.current, ticket); } catch (_) {}
    }
    setTicket(null);
    setView(VIEWS.LOBBY);
  }, [ticket]);

  const handleMove = useCallback((index) => {
  console.log("handleMove called", index);
  console.log("matchId:", matchId);
  console.log("gameState:", gameState);
  console.log("myId:", myId);
 
  
  if (!matchId) { console.log("BLOCKED: no matchId"); return; }
  if (!gameState) { console.log("BLOCKED: no gameState"); return; }
  if (gameState.winner) { console.log("BLOCKED: game over"); return; }
  if (gameState.currentTurn !== myId) { console.log("BLOCKED: not your turn"); return; }
  if (gameState.board[index] !== '') { console.log("BLOCKED: cell taken"); return; }
  
  sendMove(socketRef.current, matchId, index);
}, [matchId, gameState, myId]);

  const handlePlayAgain = useCallback(() => {
    setGameState(null);
    setMatchId(null);
    setView(VIEWS.LOBBY);
  }, []);

const handleShowLeaderboard = useCallback(async () => {
  setView(VIEWS.LEADERBOARD);
  try {
    const records = await fetchLeaderboard(10);
    console.log("Records:", records);
    setLeaderboard(records);
    const rank = await fetchMyRank(myId);
    setMyRank(rank);
  } catch(e) {
    console.error("Leaderboard error:", e);
  }
}, [myId]);

  // ─── Derived state ──────────────────────────────────────────
  const myMark   = gameState ? (gameState.playerX === myId ? 'X' : 'O') : null;
  const oppMark  = myMark === 'X' ? 'O' : 'X';
  const oppName  = gameState ? (myMark === 'X' ? gameState.playerOName : gameState.playerXName) : '';
  console.log("currentTurn:", gameState?.currentTurn, "myId:", myId);
  const isMyTurn = gameState && gameState.currentTurn === myId && !gameState.winner;

  const getResultMessage = () => {
    if (!gameState) return '';
    if (gameState.winner === 'draw') return "It's a Draw! 🤝";
    const iWon = gameState.winnerUserId === myId;
    if (gameState.forfeit) return iWon ? 'Opponent left — You Win! 🏆' : 'You left — Opponent Wins';
    return iWon ? 'You Win! 🏆' : 'You Lose 😢';
  };

  // ─── Render ─────────────────────────────────────────────────
  if (connecting) {
    return (
      <div className="screen center">
        <div className="spinner" />
        <p className="muted">Connecting to game server…</p>
      </div>
    );
  }

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="header-logo">✕ ○</div>
        <h1 className="header-title">Tic-Tac-Toe</h1>
        <button className="btn-icon" onClick={handleShowLeaderboard} title="Leaderboard">🏆</button>
      </header>

      {/* Error banner */}
      {error && <div className="error-banner">{error} <button onClick={() => setError('')}>✕</button></div>}

      {/* ── LOBBY ── */}
      {view === VIEWS.LOBBY && (
        <div className="screen center">
          <div className="lobby-card">
            <div className="avatar">{myUsername?.[0]?.toUpperCase() || '?'}</div>
            <p className="username">{myUsername}</p>
            <p className="muted small">Playing as a guest</p>
            <button className="btn primary" onClick={handleFindMatch}>Find Match</button>
            <button className="btn secondary" onClick={handleShowLeaderboard}>🏆 Leaderboard</button>
          </div>
        </div>
      )}

      {/* ── SEARCHING ── */}
      {view === VIEWS.SEARCHING && (
        <div className="screen center">
          <div className="searching-card">
            <div className="pulse-ring" />
            <div className="pulse-dot">?</div>
            <h2>Finding Opponent…</h2>
            <p className="muted">Waiting for another player to join</p>
            <button className="btn secondary" onClick={handleCancelSearch}>Cancel</button>
          </div>
        </div>
      )}

      {/* ── GAME ── */}
      {view === VIEWS.GAME && gameState && (
        <div className="screen center">
          {/* Players row */}
          <div className="players-row">
            <div className={`player-card ${myMark === 'X' ? 'active-x' : 'active-o'}`}>
              <span className="mark">{myMark}</span>
              <span className="name">You</span>
            </div>
            <div className="vs">VS</div>
            <div className={`player-card ${oppMark === 'X' ? 'active-x' : 'active-o'}`}>
              <span className="mark">{oppMark}</span>
              <span className="name">{oppName || 'Opponent'}</span>
            </div>
          </div>

          {/* Turn indicator */}
          <div className={`turn-badge ${isMyTurn ? 'your-turn' : 'their-turn'}`}>
            {isMyTurn ? 'Your turn' : "Opponent's turn"}
          </div>

          {/* Board */}
          <div className="board">
            {gameState.board.map((cell, i) => (
              <button
                key={i}
                className={`cell ${cell === 'X' ? 'cell-x' : cell === 'O' ? 'cell-o' : ''} ${isMyTurn && cell === '' ? 'cell-hover' : ''}`}
                onClick={() => handleMove(i)}
                disabled={!isMyTurn || cell !== '' || !!gameState.winner}
              >
                {cell === 'X' && <span className="cell-mark x">✕</span>}
                {cell === 'O' && <span className="cell-mark o">○</span>}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── GAME (waiting for opponent) ── */}
      {view === VIEWS.GAME && !gameState && (
        <div className="screen center">
          <div className="spinner" />
          <p className="muted">Waiting for game to start…</p>
        </div>
      )}

      {/* ── RESULT ── */}
      {view === VIEWS.RESULT && gameState && (
        <div className="screen center">
          <div className="result-card">
            <div className="result-icon">
              {gameState.winner === 'draw' ? '🤝' : gameState.winnerUserId === myId ? '🏆' : '😢'}
            </div>
            <h2 className="result-title">{getResultMessage()}</h2>
            {gameState.forfeit && <p className="muted">Opponent disconnected</p>}

            {/* Final board (read-only) */}
            <div className="board board-small">
              {gameState.board.map((cell, i) => (
                <div key={i} className={`cell cell-static ${cell === 'X' ? 'cell-x' : cell === 'O' ? 'cell-o' : ''}`}>
                  {cell === 'X' && <span className="cell-mark x">✕</span>}
                  {cell === 'O' && <span className="cell-mark o">○</span>}
                </div>
              ))}
            </div>

            <div className="result-actions">
              <button className="btn primary" onClick={handleFindMatch}>Play Again</button>
              <button className="btn secondary" onClick={handleShowLeaderboard}>🏆 Leaderboard</button>
              <button className="btn ghost" onClick={handlePlayAgain}>Back to Lobby</button>
            </div>
          </div>
        </div>
      )}

      {/* ── LEADERBOARD ── */}
      {view === VIEWS.LEADERBOARD && (
        <div className="screen">
          <div className="leaderboard-container">
            <div className="lb-header">
              <button className="btn-back" onClick={() => setView(VIEWS.LOBBY)}>← Back</button>
              <h2>🏆 Leaderboard</h2>
            </div>

            {myRank && (
              <div className="my-rank-card">
                <span className="my-rank-label">Your rank</span>
                <span className="my-rank-num">#{myRank.rank}</span>
                <span className="my-rank-score">{myRank.score} wins</span>
              </div>
            )}

            {leaderboard.length === 0 ? (
              <p className="muted center-text">No games played yet. Be the first!</p>
            ) : (
              <ol className="lb-list">
                {leaderboard.map((record, i) => (
                  <li key={record.owner_id} className={`lb-item ${record.owner_id === myId ? 'lb-mine' : ''}`}>
                    <span className="lb-rank">
                      {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                    </span>
                    <span className="lb-name">{record.username || 'Anonymous'}</span>
                    <span className="lb-score">{record.score} <small>wins</small></span>
                  </li>
                ))}
              </ol>
            )}

            <button className="btn primary" onClick={handleFindMatch}>Find Match</button>
          </div>
        </div>
      )}
    </div>
  );
}