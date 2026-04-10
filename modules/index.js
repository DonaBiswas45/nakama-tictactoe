

var LEADERBOARD_ID = "tictactoe_wins";

function InitModule(ctx, logger, nk, initializer) {
  initializer.registerMatch("tictactoe", {
    matchInit: matchInit,
    matchJoinAttempt: matchJoinAttempt,
    matchJoin: matchJoin,
    matchLeave: matchLeave,
    matchLoop: matchLoop,
    matchTerminate: matchTerminate,
    matchSignal: matchSignal
  });

  initializer.registerMatchmakerMatched(onMatchmakerMatched);

  // Create leaderboard on boot (idempotent)
  try {
    nk.leaderboardCreate(LEADERBOARD_ID, false, "desc", "incr", null, {});
    logger.info("Leaderboard ready: " + LEADERBOARD_ID);
  } catch (e) {
    logger.info("Leaderboard already exists.");
  }

  logger.info("Tictactoe module loaded!");
}

// ─── Matchmaker ───────────────────────────────────────────────

function onMatchmakerMatched(ctx, logger, nk, matches) {
  logger.info("Matchmaker paired " + matches.length + " players — creating match...");
  var matchId = nk.matchCreate("tictactoe", {});
  logger.info("Match created: " + matchId);
  return matchId;
}

// ─── Match Lifecycle ──────────────────────────────────────────

function matchInit(ctx, logger, nk, params) {
  var state = {
    board: ["", "", "", "", "", "", "", "", ""],
    playerX: "",
    playerO: "",
    playerXName: "Player X",
    playerOName: "Player O",
    currentTurn: "",
    winner: null,        // "X" | "O" | "draw" | null
    winnerUserId: null,
    forfeit: false,
    presences: {}
  };
  return { state: state, tickRate: 5, label: "tictactoe" };
}

function matchJoinAttempt(ctx, logger, nk, dispatcher, tick, state, presence, metadata) {
  var playerCount = Object.keys(state.presences).length;
  if (playerCount >= 2) {
    return { state: state, accept: false, rejectMessage: "Match is full" };
  }
  return { state: state, accept: true };
}

function matchJoin(ctx, logger, nk, dispatcher, tick, state, presences) {
  for (var i = 0; i < presences.length; i++) {
    var p = presences[i];
    state.presences[p.userId] = p;

    var displayName = p.username || ("Player_" + p.userId.substring(0, 6));

    if (!state.playerX) {
      state.playerX = p.userId;
      state.playerXName = displayName;
      state.currentTurn = p.userId;
      logger.info("Player X: " + p.userId + " (" + displayName + ")");
    } else if (!state.playerO) {
      state.playerO = p.userId;
      state.playerOName = displayName;
      logger.info("Player O: " + p.userId + " (" + displayName + ")");
    }
  }
  // Only broadcast when BOTH players are in
  if (state.playerX && state.playerO) {
    _broadcastState(dispatcher, state);
  }
  return { state: state };
}

function matchLeave(ctx, logger, nk, dispatcher, tick, state, presences) {
  for (var i = 0; i < presences.length; i++) {
    var p = presences[i];
    delete state.presences[p.userId];
    logger.info("Player left: " + p.userId);

    if (!state.winner && state.playerX && state.playerO) {
      if (p.userId === state.playerX) {
        state.winner = "O";
        state.winnerUserId = state.playerO;
      } else {
        state.winner = "X";
        state.winnerUserId = state.playerX;
      }
      state.forfeit = true;
      _broadcastState(dispatcher, state);
      _recordWin(nk, logger, state.winnerUserId);
    }
  }
  return { state: state };
}

function matchLoop(ctx, logger, nk, dispatcher, tick, state, messages) {
  for (var i = 0; i < messages.length; i++) {
    var msg = messages[i];
    if (state.winner) continue;

    var data;
    try {
      data = JSON.parse(nk.binaryToString(msg.data));
    } catch (e) {
      logger.warn("Bad message from " + msg.sender.userId + ": " + e);
      continue;
    }

    // OpCode 1 = player move
    if (msg.opCode === 1) {
      var cell = data.cell;

      if (msg.sender.userId !== state.currentTurn) {
        logger.warn("Rejected: not " + msg.sender.userId + "'s turn");
        continue;
      }
      if (typeof cell !== "number" || cell < 0 || cell > 8) {
        logger.warn("Rejected: invalid cell " + cell);
        continue;
      }
      if (state.board[cell] !== "") {
        logger.warn("Rejected: cell " + cell + " taken");
        continue;
      }

      // Apply move
      state.board[cell] = msg.sender.userId === state.playerX ? "X" : "O";
      state.currentTurn = state.currentTurn === state.playerX ? state.playerO : state.playerX;

      var result = checkWinner(state.board);
      if (result) {
        state.winner = result;
        if (result === "X") {
          state.winnerUserId = state.playerX;
          _recordWin(nk, logger, state.playerX);
        } else if (result === "O") {
          state.winnerUserId = state.playerO;
          _recordWin(nk, logger, state.playerO);
        }
        // draw: no score change
      }

      _broadcastState(dispatcher, state);
    }
  }
  return { state: state };
}

function matchTerminate(ctx, logger, nk, dispatcher, tick, state, graceSeconds) {
  logger.info("Match terminated.");
  return { state: state };
}

function matchSignal(ctx, logger, nk, dispatcher, tick, state, data) {
  return { state: state, data: data };
}

// ─── Helpers ──────────────────────────────────────────────────

function _broadcastState(dispatcher, state) {
  var payload = JSON.stringify({
    board: state.board,
    playerX: state.playerX,
    playerO: state.playerO,
    playerXName: state.playerXName,
    playerOName: state.playerOName,
    currentTurn: state.currentTurn,
    winner: state.winner,
    winnerUserId: state.winnerUserId,
    forfeit: state.forfeit
  });
  dispatcher.broadcastMessage(1, payload, null, null, true);
}

function _recordWin(nk, logger, userId) {
  logger.info("🔥 RECORD WIN CALLED for: " + userId);

  try {
    var accounts = nk.usersGetId([userId]);
    logger.info("Accounts fetched: " + JSON.stringify(accounts));

    var username = accounts && accounts[0] ? accounts[0].username : userId.substring(0, 8);
    
    nk.leaderboardRecordWrite(LEADERBOARD_ID, userId, username, 1, 0, {});
    logger.info("✅ Win recorded for: " + userId + " (" + username + ")");
  } catch (e) {
    logger.error("❌ Leaderboard write failed: " + e);
  }
}

function checkWinner(board) {
  var lines = [
    [0,1,2],[3,4,5],[6,7,8],
    [0,3,6],[1,4,7],[2,5,8],
    [0,4,8],[2,4,6]
  ];
  for (var i = 0; i < lines.length; i++) {
    var a = lines[i][0], b = lines[i][1], c = lines[i][2];
    if (board[a] !== "" && board[a] === board[b] && board[a] === board[c]) {
      return board[a];
    }
  }
  for (var j = 0; j < board.length; j++) {
    if (board[j] === "") return null;
  }
  return "draw";
}