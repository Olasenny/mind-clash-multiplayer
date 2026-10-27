const socket = io();
let myPlayerId = null;
let hostId = null;

const el = (id) => document.getElementById(id);
const screens = ["welcomeScreen", "lobbyScreen", "gameScreen", "resultsScreen"];

function showScreen(id) {
  screens.forEach((screen) => el(screen).classList.toggle("hidden", screen !== id));
}

function setStatus(message) {
  el("status").textContent = message;
}

function renderRows(container, players) {
  container.replaceChildren();
  players.forEach((player, index) => {
    const row = document.createElement("div");
    row.className = container.id === "playersList" ? "player-row" : "score-row";
    const name = document.createElement("span");
    name.className = "player-name";
    name.textContent = container.id === "finalScores" ? `${index + 1}. ${player.name}` : player.name;
    const detail = document.createElement("span");
    detail.className = container.id === "playersList" ? "host-label" : "score";
    detail.textContent = container.id === "playersList" ? (player.id === hostId ? "Host" : "Player") : `${player.score} pts`;
    row.append(name, detail);
    container.append(row);
  });
}

el("joinButton").addEventListener("click", joinLobby);
el("nameInput").addEventListener("keydown", (event) => { if (event.key === "Enter") joinLobby(); });
el("startButton").addEventListener("click", () => {
  socket.emit("startGame", (result) => setStatus(result.ok ? "The match is starting!" : result.message));
});
el("playAgainButton").addEventListener("click", () => {
  socket.emit("playAgain", (result) => setStatus(result.ok ? "Back in the lobby." : result.message));
});

function joinLobby() {
  socket.emit("joinLobby", el("nameInput").value, (result) => {
    if (!result.ok) return setStatus(result.message);
    myPlayerId = result.playerId;
    el("playerId").textContent = myPlayerId;
    setStatus("You joined the lobby.");
    showScreen("lobbyScreen");
  });
}

socket.on("connect", () => setStatus("Connected. Enter your name to play."));
socket.on("disconnect", () => setStatus("Connection lost. Please refresh after the server is available."));

socket.on("lobbyUpdate", ({ players, hostId: newHostId, phase }) => {
  hostId = newHostId;
  renderRows(el("playersList"), players);
  const isHost = myPlayerId === hostId;
  el("hostBadge").classList.toggle("hidden", !isHost);
  el("startButton").classList.toggle("hidden", !isHost || phase !== "lobby");
  el("startHint").textContent = isHost ? "You can start whenever everyone is ready." : "Waiting for the host to start the game.";
  if (phase === "lobby" && myPlayerId) showScreen("lobbyScreen");
});

socket.on("scoreboardUpdate", (players) => renderRows(el("scoreboard"), players));

socket.on("question", ({ round, totalRounds, prompt, options }) => {
  showScreen("gameScreen");
  el("roundLabel").textContent = `ROUND ${round} OF ${totalRounds}`;
  el("questionText").textContent = prompt;
  el("answerNote").textContent = "Choose one answer.";
  const answers = el("answers");
  answers.replaceChildren();
  options.forEach((option) => {
    const button = document.createElement("button");
    button.className = "answer";
    button.textContent = option;
    button.addEventListener("click", () => submitAnswer(option, button));
    answers.append(button);
  });
});

function submitAnswer(answer, selectedButton) {
  socket.emit("submitAnswer", answer, (result) => {
    if (!result.ok) return setStatus(result.message);
    el("answers").querySelectorAll("button").forEach((button) => button.disabled = true);
    selectedButton.classList.add("selected");
    el("answerNote").textContent = "Answer submitted. Waiting for the other players...";
  });
}

socket.on("answerProgress", ({ answered, total }) => {
  el("answerNote").textContent = `${answered} of ${total} players have answered.`;
});

socket.on("roundResult", ({ correctAnswer }) => {
  el("answers").querySelectorAll("button").forEach((button) => {
    button.disabled = true;
    if (button.textContent === correctAnswer) button.classList.add("correct");
    else if (button.classList.contains("selected")) button.classList.add("incorrect");
  });
  el("answerNote").textContent = `Correct answer: ${correctAnswer}. Next round is coming up...`;
});

socket.on("gameOver", ({ standings, winner }) => {
  showScreen("resultsScreen");
  el("winnerMessage").textContent = winner ? `🏆 ${winner.name} wins with ${winner.score} points!` : "No winner this time.";
  renderRows(el("finalScores"), standings);
  const isHost = myPlayerId === hostId;
  el("playAgainButton").classList.toggle("hidden", !isHost);
  el("resultsHint").textContent = isHost ? "Return everyone to the lobby to play another match." : "Waiting for the host to return to the lobby.";
  setStatus("Game over!");
});
