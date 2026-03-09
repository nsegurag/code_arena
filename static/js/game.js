const socket = io();

const startScreen = document.getElementById("start-screen");
const battleScreen = document.getElementById("battle-screen");
const enterGameBtn = document.getElementById("enter-game-btn");
const showInstructionsBtn = document.getElementById("show-instructions-btn");
const instructionsBox = document.getElementById("instructions-box");
const playerNameInput = document.getElementById("player-name-input");

const cpuModeBtn = document.getElementById("cpu-mode-btn");
const multiplayerModeBtn = document.getElementById("multiplayer-mode-btn");
const multiplayerPanel = document.getElementById("multiplayer-panel");
const createRoomBtn = document.getElementById("create-room-btn");
const joinRoomBtn = document.getElementById("join-room-btn");
const roomCodeInput = document.getElementById("room-code-input");
const roomStatusBox = document.getElementById("room-status-box");
const roomCodeDisplay = document.getElementById("room-code-display");
const roomStateText = document.getElementById("room-state-text");
const roomPlayerList = document.getElementById("room-player-list");
const startMultiplayerBtn = document.getElementById("start-multiplayer-btn");

const startBtn = document.getElementById("start-btn");
const attackBtn = document.getElementById("attack-btn");
const skillBtn = document.getElementById("skill-btn");
const defendBtn = document.getElementById("defend-btn");
const healBtn = document.getElementById("heal-btn");

const questionPanel = document.getElementById("question-panel");
const questionText = document.getElementById("question-text");
const optionsContainer = document.getElementById("options-container");
const logMessage = document.getElementById("log-message");
const gameStatus = document.getElementById("game-status");

const playerNameEl = document.getElementById("player-name");
const playerHealthEl = document.getElementById("player-health");
const playerMaxHealthEl = document.getElementById("player-max-health");
const playerAttackEl = document.getElementById("player-attack");
const playerLevelEl = document.getElementById("player-level");
const playerExpEl = document.getElementById("player-exp");

const enemyNameEl = document.getElementById("enemy-name");
const enemyHealthEl = document.getElementById("enemy-health");
const enemyMaxHealthEl = document.getElementById("enemy-max-health");
const enemyLevelEl = document.getElementById("enemy-level");
const roundNumberEl = document.getElementById("round-number");

const playerHealthFill = document.getElementById("player-health-fill");
const enemyHealthFill = document.getElementById("enemy-health-fill");

const playerSprite = document.querySelector(".player-sprite");
const enemySprite = document.querySelector(".enemy-sprite");

const characterCards = document.querySelectorAll(".character-card");

let currentMode = "cpu";
let currentRoomCode = "";
let isHost = false;
let selectedCharacter = "mage";

let questions = [];
let usedQuestions = [];

let player = {};
let enemies = [];
let currentEnemyIndex = 0;
let currentEnemy = null;
let roundNumber = 1;
let gameStarted = false;
let currentTurn = "player";
let pendingAction = null;
let isMyTurn = false;
let localPlayerName = "";

const characterConfigs = {
  mage: {
    className: "Programador",
    emoji: "🧙‍♂️",
    health: 100,
    attack: 20,
    skillName: "Código Crítico",
    skillBonus: 15,
    healUses: 3,
    skillUses: 2
  },
  tank: {
    className: "Ingeniero",
    emoji: "🛡️",
    health: 120,
    attack: 15,
    skillName: "Escudo de Kernel",
    skillBonus: 12,
    healUses: 4,
    skillUses: 2
  },
  assassin: {
    className: "Hacker",
    emoji: "⚡",
    health: 85,
    attack: 25,
    skillName: "Inyección Rápida",
    skillBonus: 18,
    healUses: 2,
    skillUses: 3
  }
};

function buildPlayerFromCharacter(name, characterKey) {
  const config = characterConfigs[characterKey] || characterConfigs.mage;

  return {
    name: name || "Code Knight",
    character: characterKey,
    className: config.className,
    emoji: config.emoji,
    health: config.health,
    maxHealth: config.health,
    attack: config.attack,
    level: 1,
    exp: 0,
    isDefending: false,
    healUses: config.healUses,
    skillUses: config.skillUses,
    skillName: config.skillName,
    skillBonus: config.skillBonus
  };
}

function createPlayer() {
  let chosenName = playerNameInput?.value?.trim();

  if (!chosenName) {
    chosenName = "Code Knight";
  }

  return buildPlayerFromCharacter(chosenName, selectedCharacter);
}

function createEnemies() {
  return [
    { name: "Bug Junior", health: 50, maxHealth: 50, attack: 10, level: 1, emoji: "👾" },
    { name: "Error Sintáctico", health: 75, maxHealth: 75, attack: 15, level: 2, emoji: "🤖" },
    { name: "Hacker Supremo", health: 110, maxHealth: 110, attack: 20, level: 3, emoji: "💀" }
  ];
}

async function loadQuestions() {
  try {
    const response = await fetch("/api/questions");
    questions = await response.json();
  } catch (error) {
    console.error("Error al cargar preguntas:", error);
    logMessage.textContent = "No se pudieron cargar las preguntas.";
  }
}

function updateSprites() {
  if (currentEnemy?.emoji) {
    enemySprite.innerHTML = `<span>${currentEnemy.emoji}</span>`;
  }

  if (player?.emoji) {
    playerSprite.innerHTML = `<span>${player.emoji}</span>`;
  }
}

function updateHealthBars() {
  const playerPercentage = player.maxHealth
    ? (Math.max(player.health, 0) / player.maxHealth) * 100
    : 100;

  const enemyPercentage = currentEnemy?.maxHealth
    ? (Math.max(currentEnemy.health, 0) / currentEnemy.maxHealth) * 100
    : 0;

  playerHealthFill.style.width = `${playerPercentage}%`;
  enemyHealthFill.style.width = `${enemyPercentage}%`;
}

function updateUI() {
  playerNameEl.textContent = player.name || "Jugador";
  playerHealthEl.textContent = Math.max(player.health || 0, 0);
  playerMaxHealthEl.textContent = player.maxHealth || 100;
  playerAttackEl.textContent = player.attack || 0;
  playerLevelEl.textContent = player.level || 1;
  playerExpEl.textContent = player.exp || 0;

  if (currentEnemy) {
    enemyNameEl.textContent = currentEnemy.name || "Rival";
    enemyHealthEl.textContent = Math.max(currentEnemy.health || 0, 0);
    enemyMaxHealthEl.textContent = currentEnemy.maxHealth || 100;
    enemyLevelEl.textContent = currentEnemy.level || 1;
  } else {
    enemyNameEl.textContent = "Rival";
    enemyHealthEl.textContent = "0";
    enemyMaxHealthEl.textContent = "0";
    enemyLevelEl.textContent = "1";
  }

  roundNumberEl.textContent = roundNumber;
  updateHealthBars();
  updateSprites();
}

function resetPanels() {
  questionPanel.classList.add("hidden");
  optionsContainer.innerHTML = "";
  pendingAction = null;
}

function showQuestionPanel() {
  questionPanel.classList.remove("hidden");
}

function getRandomQuestion() {
  if (questions.length === 0) return null;

  if (usedQuestions.length === questions.length) {
    usedQuestions = [];
  }

  const availableQuestions = questions.filter((_, index) => !usedQuestions.includes(index));
  const randomIndex = Math.floor(Math.random() * availableQuestions.length);
  const selectedQuestion = availableQuestions[randomIndex];
  const originalIndex = questions.indexOf(selectedQuestion);

  usedQuestions.push(originalIndex);
  return selectedQuestion;
}

function renderQuestionForAction(actionType) {
  if (!gameStarted) return;
  if (currentMode === "multiplayer" && !isMyTurn) return;

  const currentQuestion = getRandomQuestion();

  if (!currentQuestion) {
    logMessage.textContent = "No hay preguntas disponibles.";
    return;
  }

  pendingAction = actionType;
  showQuestionPanel();
  questionText.textContent = currentQuestion.question;
  optionsContainer.innerHTML = "";

  currentQuestion.options.forEach((option) => {
    const button = document.createElement("button");
    button.classList.add("option-btn");
    button.textContent = option;
    button.addEventListener("click", () => handleAnswer(option, currentQuestion));
    optionsContainer.appendChild(button);
  });
}

function disableOptions() {
  const buttons = document.querySelectorAll(".option-btn");
  buttons.forEach((button) => {
    button.disabled = true;
    button.style.opacity = "0.7";
    button.style.cursor = "not-allowed";
  });
}

function animateHit(targetElement) {
  targetElement.classList.add("shake", "flash-hit");
  setTimeout(() => {
    targetElement.classList.remove("shake", "flash-hit");
  }, 350);
}

function enemyAttack() {
  if (!gameStarted || !currentEnemy) return;

  currentTurn = "enemy";
  gameStatus.textContent = "Turno enemigo";

  setTimeout(() => {
    let damage = currentEnemy.attack;

    if (player.isDefending) {
      damage = Math.floor(damage / 2);
      player.isDefending = false;
    }

    player.health -= damage;
    if (player.health < 0) player.health = 0;

    animateHit(playerSprite);
    logMessage.textContent = `${currentEnemy.name} atacó y causó ${damage} de daño.`;
    updateUI();

    setTimeout(() => {
      if (player.health <= 0) {
        endGame(false);
        return;
      }

      currentTurn = "player";
      gameStatus.textContent = "Tu turno";
      logMessage.textContent = `${player.name} está listo para actuar.`;
      resetPanels();
    }, 900);
  }, 800);
}

function performNormalAttack() {
  currentEnemy.health -= player.attack;
  if (currentEnemy.health < 0) currentEnemy.health = 0;
  player.exp += 10;

  animateHit(enemySprite);
  logMessage.textContent = `Respuesta correcta. ${player.name} hizo ${player.attack} de daño.`;
}

function performSkillAttack() {
  const skillDamage = player.attack + player.skillBonus;
  currentEnemy.health -= skillDamage;
  if (currentEnemy.health < 0) currentEnemy.health = 0;

  player.exp += 15;
  player.skillUses -= 1;

  animateHit(enemySprite);
  logMessage.textContent = `${player.skillName} fue un éxito. Hiciste ${skillDamage} de daño.`;
}

function performHeal() {
  const healAmount = 25;
  player.health += healAmount;
  if (player.health > player.maxHealth) {
    player.health = player.maxHealth;
  }

  player.healUses -= 1;
  logMessage.textContent = `${player.name} recuperó ${healAmount} de vida.`;
}

function handleAnswer(selectedOption, currentQuestion) {
  disableOptions();
  const success = selectedOption === currentQuestion.correct;

  if (currentMode === "cpu") {
    if (!gameStarted || currentTurn !== "player") return;

    if (success) {
      if (pendingAction === "attack") {
        performNormalAttack();
      } else if (pendingAction === "skill") {
        performSkillAttack();
      } else if (pendingAction === "heal") {
        performHeal();
      }

      checkLevelUp();
      updateUI();

      setTimeout(() => {
        if (currentEnemy.health <= 0) {
          handleEnemyDefeat();
        } else {
          enemyAttack();
        }
      }, 900);
    } else {
      logMessage.textContent = `Respuesta incorrecta. ${currentEnemy.name} contraataca.`;

      setTimeout(() => {
        enemyAttack();
      }, 900);
    }

    return;
  }

  if (currentMode === "multiplayer") {
    socket.emit("multiplayer_action", {
      roomCode: currentRoomCode,
      action: pendingAction,
      success
    });

    questionPanel.classList.add("hidden");
    logMessage.textContent = success
      ? "Respuesta enviada. Esperando resolución del turno..."
      : "Fallaste la pregunta. Esperando resolución del turno...";
  }
}

function checkLevelUp() {
  if (player.exp >= 30) {
    player.level += 1;
    player.maxHealth += 20;
    player.health += 20;

    if (player.health > player.maxHealth) {
      player.health = player.maxHealth;
    }

    player.attack += 5;
    player.exp = 0;
    logMessage.textContent += ` Subiste a nivel ${player.level}.`;
  }
}

function handleEnemyDefeat() {
  currentEnemyIndex += 1;

  if (currentEnemyIndex >= enemies.length) {
    endGame(true);
    return;
  }

  roundNumber += 1;
  currentEnemy = enemies[currentEnemyIndex];
  currentTurn = "player";
  updateUI();
  resetPanels();
  gameStatus.textContent = "Nuevo enemigo";
  logMessage.textContent = `Has derrotado al enemigo. Ahora aparece ${currentEnemy.name}.`;
}

function endGame(playerWon) {
  gameStarted = false;
  currentTurn = "none";
  questionPanel.classList.add("hidden");
  isMyTurn = false;

  if (playerWon) {
    logMessage.textContent = `Victoria total. ${player.name} conquistó Code Arena.`;
    gameStatus.textContent = "Victoria";
  } else {
    logMessage.textContent = `${player.name} fue derrotado.`;
    gameStatus.textContent = "Derrota";
  }

  startBtn.textContent = "Reiniciar";
  updateUI();
}

function startGame() {
  player = createPlayer();
  enemies = createEnemies();
  currentEnemyIndex = 0;
  currentEnemy = enemies[currentEnemyIndex];
  roundNumber = 1;
  usedQuestions = [];
  gameStarted = true;
  currentTurn = "player";
  pendingAction = null;
  isMyTurn = true;

  skillBtn.textContent = player.skillName;
  gameStatus.textContent = "Tu turno";
  logMessage.textContent = `${player.name} el ${player.className} entra a la arena frente a ${currentEnemy.name}.`;
  startBtn.textContent = "Reiniciar";

  updateUI();
  resetPanels();
}

function validatePlayerName() {
  const name = playerNameInput.value.trim();

  if (name.length === 0) {
    alert("Por favor escribe un nombre para tu programador.");
    return false;
  }

  return true;
}

function renderRoomPlayers(players) {
  roomPlayerList.innerHTML = "";

  players.forEach((playerItem) => {
    const li = document.createElement("li");
    const hostText = playerItem.is_host ? " (Host)" : "";
    li.textContent = `${playerItem.name} - ${playerItem.className || playerItem.character}${hostText}`;
    roomPlayerList.appendChild(li);
  });
}

function showRoomStatus(roomCode, players, ready) {
  currentRoomCode = roomCode;
  roomStatusBox.classList.remove("hidden");
  roomCodeDisplay.textContent = roomCode;
  renderRoomPlayers(players);

  if (ready) {
    roomStateText.textContent = "Sala lista. Hay 2 jugadores.";
    if (isHost) {
      startMultiplayerBtn.classList.remove("hidden");
    }
  } else {
    roomStateText.textContent = "Esperando al segundo jugador...";
    startMultiplayerBtn.classList.add("hidden");
  }
}

function applyMultiplayerState(state) {
  if (!state) return;

  roundNumber = state.round || 1;
  isMyTurn = state.turnSid === socket.id;
  gameStarted = !state.finished;

  const myState = state.players?.[socket.id];
  if (myState) {
    player = {
      ...player,
      ...myState
    };
  }

  const opponentSid = Object.keys(state.players || {}).find((sid) => sid !== socket.id);
  if (opponentSid) {
    currentEnemy = {
      ...state.players[opponentSid]
    };
  }

  skillBtn.textContent = player.skillName || "Habilidad";
  updateUI();

  if (state.finished) {
    if (state.winnerSid === socket.id) {
      gameStatus.textContent = "Victoria";
      logMessage.textContent = "Ganaste la partida multijugador.";
    } else {
      gameStatus.textContent = "Derrota";
      logMessage.textContent = "Perdiste la partida multijugador.";
    }
    return;
  }

  if (isMyTurn) {
    gameStatus.textContent = "Tu turno";
  } else {
    gameStatus.textContent = "Turno rival";
  }

  if (state.lastActionMessage) {
    logMessage.textContent = state.lastActionMessage;
  }
}

characterCards.forEach((card) => {
  card.addEventListener("click", () => {
    characterCards.forEach((item) => item.classList.remove("selected"));
    card.classList.add("selected");
    selectedCharacter = card.dataset.character;
  });
});

cpuModeBtn.addEventListener("click", () => {
  currentMode = "cpu";
  multiplayerPanel.classList.add("hidden");
  enterGameBtn.classList.remove("hidden");
  cpuModeBtn.classList.add("primary-btn");
  multiplayerModeBtn.classList.remove("primary-btn");
});

multiplayerModeBtn.addEventListener("click", () => {
  currentMode = "multiplayer";
  multiplayerPanel.classList.remove("hidden");
  enterGameBtn.classList.add("hidden");
  multiplayerModeBtn.classList.add("primary-btn");
  cpuModeBtn.classList.remove("primary-btn");
});

enterGameBtn.addEventListener("click", () => {
  if (!validatePlayerName()) return;

  player = createPlayer();
  updateUI();

  startScreen.classList.add("hidden");
  battleScreen.classList.remove("hidden");
});

createRoomBtn.addEventListener("click", () => {
  if (!validatePlayerName()) return;

  localPlayerName = playerNameInput.value.trim();

  socket.emit("create_room", {
    playerName: localPlayerName,
    character: selectedCharacter
  });
});

joinRoomBtn.addEventListener("click", () => {
  if (!validatePlayerName()) return;

  localPlayerName = playerNameInput.value.trim();

  socket.emit("join_room_request", {
    playerName: localPlayerName,
    roomCode: roomCodeInput.value.trim().toUpperCase(),
    character: selectedCharacter
  });
});

startMultiplayerBtn.addEventListener("click", () => {
  if (!currentRoomCode) return;

  socket.emit("start_multiplayer_game", {
    roomCode: currentRoomCode
  });
});

showInstructionsBtn.addEventListener("click", () => {
  instructionsBox.classList.toggle("hidden");
});

startBtn.addEventListener("click", async () => {
  if (currentMode !== "cpu") {
    logMessage.textContent = "En multijugador el inicio se hace desde la sala.";
    return;
  }

  if (questions.length === 0) {
    await loadQuestions();
  }

  startGame();
});

attackBtn.addEventListener("click", () => {
  if (!gameStarted) return;

  if (currentMode === "multiplayer") {
    if (!isMyTurn) {
      logMessage.textContent = "Espera tu turno.";
      return;
    }

    logMessage.textContent = `${player.name} prepara un ataque.`;
    renderQuestionForAction("attack");
    return;
  }

  if (currentTurn !== "player") return;
  logMessage.textContent = `${player.name} prepara un ataque.`;
  renderQuestionForAction("attack");
});

skillBtn.addEventListener("click", () => {
  if (!gameStarted) return;

  if (player.skillUses <= 0) {
    logMessage.textContent = "Ya no te quedan habilidades especiales.";
    return;
  }

  if (currentMode === "multiplayer") {
    if (!isMyTurn) {
      logMessage.textContent = "Espera tu turno.";
      return;
    }

    logMessage.textContent = `${player.name} prepara ${player.skillName}.`;
    renderQuestionForAction("skill");
    return;
  }

  if (currentTurn !== "player") return;
  logMessage.textContent = `${player.name} prepara ${player.skillName}.`;
  renderQuestionForAction("skill");
});

defendBtn.addEventListener("click", () => {
  if (!gameStarted) return;

  if (currentMode === "multiplayer") {
    if (!isMyTurn) {
      logMessage.textContent = "Espera tu turno.";
      return;
    }

    socket.emit("multiplayer_action", {
      roomCode: currentRoomCode,
      action: "defend",
      success: true
    });

    logMessage.textContent = "Defensa enviada. Esperando resolución del turno...";
    return;
  }

  if (currentTurn !== "player") return;

  player.isDefending = true;
  gameStatus.textContent = "Defensa activa";
  logMessage.textContent = `${player.name} se prepara para reducir el próximo daño.`;
  updateUI();

  setTimeout(() => {
    enemyAttack();
  }, 700);
});

healBtn.addEventListener("click", () => {
  if (!gameStarted) return;

  if (player.healUses <= 0) {
    logMessage.textContent = "Ya no te quedan curaciones.";
    return;
  }

  if (currentMode === "multiplayer") {
    if (!isMyTurn) {
      logMessage.textContent = "Espera tu turno.";
      return;
    }

    logMessage.textContent = `${player.name} intenta curarse.`;
    renderQuestionForAction("heal");
    return;
  }

  if (currentTurn !== "player") return;
  logMessage.textContent = `${player.name} intenta curarse.`;
  renderQuestionForAction("heal");
});

/* Eventos socket */
socket.on("room_created", (data) => {
  isHost = true;
  showRoomStatus(data.roomCode, data.players, false);
  roomStateText.textContent = "Sala creada. Esperando al segundo jugador...";
  logMessage.textContent = `Sala ${data.roomCode} creada.`;
});

socket.on("room_joined", (data) => {
  isHost = false;
  showRoomStatus(data.roomCode, data.players, data.players.length === 2);
  startMultiplayerBtn.classList.add("hidden");
  logMessage.textContent = `Te uniste a la sala ${data.roomCode}.`;
});

socket.on("room_updated", (data) => {
  if (!currentRoomCode || currentRoomCode !== data.roomCode) {
    currentRoomCode = data.roomCode;
  }

  showRoomStatus(data.roomCode, data.players, data.ready);
});

socket.on("room_error", (data) => {
  alert(data.message);
});

socket.on("player_left", (data) => {
  roomStateText.textContent = data.message;
  startMultiplayerBtn.classList.add("hidden");
});

socket.on("multiplayer_game_started", (data) => {
  currentMode = "multiplayer";
  startScreen.classList.add("hidden");
  battleScreen.classList.remove("hidden");

  const myPlayer = data.players.find((p) => p.sid === socket.id);
  const rivalPlayer = data.players.find((p) => p.sid !== socket.id);

  if (myPlayer) {
    player = buildPlayerFromCharacter(myPlayer.name, myPlayer.character);
  } else {
    player = createPlayer();
  }

  if (rivalPlayer) {
    currentEnemy = buildPlayerFromCharacter(rivalPlayer.name, rivalPlayer.character);
  } else {
    currentEnemy = {
      name: "Rival",
      emoji: "❓",
      health: 100,
      maxHealth: 100,
      attack: 20,
      level: 1
    };
  }

  roundNumber = 1;
  gameStarted = true;
  isMyTurn = data.firstTurnSid === socket.id;
  pendingAction = null;
  skillBtn.textContent = player.skillName;
  updateUI();
  resetPanels();

  gameStatus.textContent = isMyTurn ? "Tu turno" : "Turno rival";
  logMessage.textContent = isMyTurn
    ? `La partida comenzó. Tú empiezas contra ${currentEnemy.name}.`
    : `La partida comenzó. Espera el turno de ${currentEnemy.name}.`;

  startBtn.textContent = "Partida iniciada";
});

socket.on("multiplayer_state_update", (data) => {
  applyMultiplayerState(data.state);

  if (data.hitTarget === "player") {
    animateHit(playerSprite);
  } else if (data.hitTarget === "enemy") {
    animateHit(enemySprite);
  }

  resetPanels();
});

window.addEventListener("DOMContentLoaded", async () => {
  await loadQuestions();

  player = {
    name: "",
    emoji: "🧙‍♂️",
    health: 100,
    maxHealth: 100,
    attack: 20,
    level: 1,
    exp: 0,
    isDefending: false,
    healUses: 3,
    skillUses: 2,
    skillName: "Habilidad"
  };

  enemies = createEnemies();
  currentEnemy = enemies[0];
  updateUI();
  resetPanels();
});