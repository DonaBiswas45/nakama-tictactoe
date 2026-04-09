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
  logger.info("Tictactoe module loaded!");
}

function matchInit(ctx, logger, nk, params) {
  var state = {
    board: ["","","","","","","","",""],
    playerX: "",
    playerO: "",
    currentTurn: "",
    winner: null
  };
  return { state: state, tickRate: 5, label: "tictactoe" };
}

function matchJoinAttempt(ctx, logger, nk, dispatcher, tick, state, presence, metadata) {
  if (state.playerX && state.playerO) {
    return { state: state, accept: false, rejectMessage: "Match is full" };
  }
  return { state: state, accept: true };
}

function matchJoin(ctx, logger, nk, dispatcher, tick, state, presences) {
  for (var i = 0; i < presences.length; i++) {
    var p = presences[i];
    if (!state.playerX) {
      state.playerX = p.userId;
      state.currentTurn = p.userId;
      logger.info("Player X joined: " + p.userId);
    } else if (!state.playerO) {
      state.playerO = p.userId;
      logger.info("Player O joined: " + p.userId);
    }
  }
  dispatcher.broadcastMessage(1, JSON.stringify(state), null, null, true);
  return { state: state };
}

function matchLeave(ctx, logger, nk, dispatcher, tick, state, presences) {
  for (var i = 0; i < presences.length; i++) {
    var p = presences[i];
    if (!state.winner) {
      state.winner = p.userId === state.playerX ? "O" : "X";
      dispatcher.broadcastMessage(1, JSON.stringify(state), null, null, true);
    }
  }
  return { state: state };
}

function matchLoop(ctx, logger, nk, dispatcher, tick, state, messages) {
  for (var i = 0; i < messages.length; i++) {
    var msg = messages[i];
    if (state.winner) continue;

    var data = JSON.parse(nk.binaryToString(msg.data));
    var cell = data.cell;

    if (msg.sender.userId !== state.currentTurn) {
      logger.warn("Move rejected: not your turn");
      continue;
    }

    if (state.board[cell] !== "") {
      logger.warn("Move rejected: cell taken");
      continue;
    }

    state.board[cell] = msg.sender.userId === state.playerX ? "X" : "O";
    state.currentTurn = state.currentTurn === state.playerX ? state.playerO : state.playerX;
    state.winner = checkWinner(state.board);

    dispatcher.broadcastMessage(1, JSON.stringify(state), null, null, true);
  }
  return { state: state };
}

function matchTerminate(ctx, logger, nk, dispatcher, tick, state, graceSeconds) {
  return { state: state };
}

function matchSignal(ctx, logger, nk, dispatcher, tick, state) {
  return { state: state };
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