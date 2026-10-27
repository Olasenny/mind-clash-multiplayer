const path = require("path");
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, "public")));

const questions = [
  {
    prompt: "Which planet is known as the Red Planet?",
    options: ["Venus", "Mars", "Jupiter", "Mercury"],
    correctAnswer: "Mars"
  },
  {
    prompt: "What is 8 × 7?",
    options: ["54", "56", "63", "49"],
    correctAnswer: "56"
  },
  {
    prompt: "Which animal is the largest mammal?",
    options: ["Elephant", "Blue whale", "Giraffe", "Polar bear"],
    correctAnswer: "Blue whale"
  },
  {
    prompt: "What color do blue and yellow make when mixed?",
    options: ["Purple", "Orange", "Green", "Red"],
    correctAnswer: "Green"
  },
  {
    prompt: "How many sides does a hexagon have?",
    options: ["Five", "Six", "Seven", "Eight"],
    correctAnswer: "Six"
  }
];

const game = {
  phase: "lobby",
  players: new Map(),
  hostId: null,
  roundIndex: -1,
  answers: new Map()
};

function publicPlayers() {
  return [...game.players.values()].map(({ id, name, score }) => ({ id, name, score }));
}

function emitLobby() {
  io.emit("lobbyUpdate", {
    players: publicPlayers(),
    hostId: game.hostId,
    phase: game.phase
  });
}

function emitScoreboard() {
  io.emit("scoreboardUpdate", publicPlayers().sort((a, b) => b.score - a.score || a.name.localeCompare(b.name)));
}

function currentQuestion() {
  return questions[game.roundIndex];
}

function sendQuestion() {
  const question = currentQuestion();
  if (!question) return finishGame();

  game.answers.clear();
  io.emit("question", {
    round: game.roundIndex + 1,
    totalRounds: questions.length,
    prompt: question.prompt,
    options: question.options
  });
}

function endRound() {
  const question = currentQuestion();
  for (const [playerId, answer] of game.answers) {
    if (answer === question.correctAnswer) {
      game.players.get(playerId).score += 100;
    }
  }

  emitScoreboard();
  io.emit("roundResult", { correctAnswer: question.correctAnswer });

  setTimeout(() => {
    if (game.phase !== "playing") return;
    game.roundIndex += 1;
    sendQuestion();
  }, 2500);
}

function finishGame() {
  game.phase = "results";
  const standings = publicPlayers().sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
  io.emit("gameOver", { standings, winner: standings[0] || null });
  emitLobby();
}

function returnToLobby() {
  game.phase = "lobby";
  game.roundIndex = -1;
  game.answers.clear();
  for (const player of game.players.values()) player.score = 0;
  emitScoreboard();
  emitLobby();
}

io.on("connection", (socket) => {
  socket.on("joinLobby", (rawName, reply) => {
    const name = String(rawName || "").trim().slice(0, 20);
    if (!name) return reply({ ok: false, message: "Please enter a name." });
    if (game.phase === "playing") return reply({ ok: false, message: "A game is already in progress. Please wait for the next match." });

    const player = { id: socket.id, name, score: 0 };
    game.players.set(socket.id, player);
    if (!game.hostId) game.hostId = socket.id;

    reply({ ok: true, playerId: socket.id });
    emitLobby();
    emitScoreboard();
  });

  socket.on("startGame", (reply) => {
    if (socket.id !== game.hostId) return reply({ ok: false, message: "Only the host can start the game." });
    if (game.phase !== "lobby") return reply({ ok: false, message: "The game cannot be started right now." });
    if (game.players.size < 1) return reply({ ok: false, message: "At least one player must join first." });

    game.phase = "playing";
    game.roundIndex = 0;
    game.answers.clear();
    for (const player of game.players.values()) player.score = 0;
    reply({ ok: true });
    emitLobby();
    emitScoreboard();
    sendQuestion();
  });

  socket.on("submitAnswer", (answer, reply) => {
    if (game.phase !== "playing") return reply({ ok: false, message: "There is no active question." });
    if (!game.players.has(socket.id)) return reply({ ok: false, message: "Join the lobby first." });
    if (game.answers.has(socket.id)) return reply({ ok: false, message: "You already answered this round." });

    const question = currentQuestion();
    if (!question.options.includes(answer)) return reply({ ok: false, message: "That answer is not valid." });

    game.answers.set(socket.id, answer);
    reply({ ok: true });
    io.emit("answerProgress", { answered: game.answers.size, total: game.players.size });
    if (game.answers.size === game.players.size) endRound();
  });

  socket.on("playAgain", (reply) => {
    if (socket.id !== game.hostId) return reply({ ok: false, message: "Only the host can return everyone to the lobby." });
    if (game.phase !== "results") return reply({ ok: false, message: "Finish the current game first." });
    returnToLobby();
    reply({ ok: true });
  });

  socket.on("disconnect", () => {
    const wasPlayer = game.players.delete(socket.id);
    if (!wasPlayer) return;
    if (game.hostId === socket.id) game.hostId = game.players.keys().next().value || null;

    if (game.phase === "playing" && game.players.size === 0) {
      returnToLobby();
      return;
    }
    if (game.phase === "playing" && game.answers.size === game.players.size) endRound();
    emitLobby();
    emitScoreboard();
  });
});

server.listen(PORT, () => {
  console.log(`Mind Clash Multiplayer is running at http://localhost:${PORT}`);
});
