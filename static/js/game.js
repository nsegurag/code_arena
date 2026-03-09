const startScreen = document.getElementById("start-screen");
const battleScreen = document.getElementById("battle-screen");
const enterGameBtn = document.getElementById("enter-game-btn");
const showInstructionsBtn = document.getElementById("show-instructions-btn");
const instructionsBox = document.getElementById("instructions-box");

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

function createPlayer() {
  return {
    name: "Code Knight",
    health: 100,
    maxHealth: 100,
    attack: 20,
    level: 1,
    exp: 0,
    isDefending: false,
    healUses: 3,
    skillUses: 2
  };
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
  if (currentEnemy) {
    enemySprite.innerHTML = `<span>${currentEnemy.emoji}</span>`;
  }
}

function updateHealthBars() {
  const playerPercentage = (Math.max(player.health, 0) / player.maxHealth) * 100;
  const enemyPercentage = currentEnemy
    ? (Math.max(currentEnemy.health, 0) / currentEnemy.maxHealth) * 100
    : 0;

  playerHealthFill.style.width = `${playerPercentage}%`;
  enemyHealthFill.style.width = `${enemyPercentage}%`;
}

function updateUI() {
  playerNameEl.textContent = player.name;
  playerHealthEl.textContent = Math.max(player.health, 0);
  playerMaxHealthEl.textContent = player.maxHealth;
  playerAttackEl.textContent = player.attack;
  playerLevelEl.textContent = player.level;
  playerExpEl.textContent = player.exp;

  if (currentEnemy) {
    enemyNameEl.textContent = currentEnemy.name;
    enemyHealthEl.textContent = Math.max(currentEnemy.health, 0);
    enemyMaxHealthEl.textContent = currentEnemy.maxHealth;
    enemyLevelEl.textContent = currentEnemy.level;
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
  if (!gameStarted || currentTurn !== "player") return;

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
  const skillDamage = player.attack + 15;
  currentEnemy.health -= skillDamage;
  if (currentEnemy.health < 0) currentEnemy.health = 0;

  player.exp += 15;
  player.skillUses -= 1;

  animateHit(enemySprite);
  logMessage.textContent = `Habilidad especial exitosa. Hiciste ${skillDamage} de daño.`;
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
  if (!gameStarted || currentTurn !== "player") return;

  disableOptions();

  if (selectedOption === currentQuestion.correct) {
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

  gameStatus.textContent = "Tu turno";
  logMessage.textContent = `${player.name} entra a la arena frente a ${currentEnemy.name}.`;
  startBtn.textContent = "Reiniciar";

  updateUI();
  resetPanels();
}

enterGameBtn.addEventListener("click", () => {
  startScreen.classList.add("hidden");
  battleScreen.classList.remove("hidden");
});

showInstructionsBtn.addEventListener("click", () => {
  instructionsBox.classList.toggle("hidden");
});

startBtn.addEventListener("click", async () => {
  if (questions.length === 0) {
    await loadQuestions();
  }
  startGame();
});

attackBtn.addEventListener("click", () => {
  if (!gameStarted || currentTurn !== "player") return;
  logMessage.textContent = `${player.name} prepara un ataque.`;
  renderQuestionForAction("attack");
});

skillBtn.addEventListener("click", () => {
  if (!gameStarted || currentTurn !== "player") return;

  if (player.skillUses <= 0) {
    logMessage.textContent = "Ya no te quedan habilidades especiales.";
    return;
  }

  logMessage.textContent = `${player.name} prepara una habilidad especial.`;
  renderQuestionForAction("skill");
});

defendBtn.addEventListener("click", () => {
  if (!gameStarted || currentTurn !== "player") return;

  player.isDefending = true;
  gameStatus.textContent = "Defensa activa";
  logMessage.textContent = `${player.name} se prepara para reducir el próximo daño.`;
  updateUI();

  setTimeout(() => {
    enemyAttack();
  }, 700);
});

healBtn.addEventListener("click", () => {
  if (!gameStarted || currentTurn !== "player") return;

  if (player.healUses <= 0) {
    logMessage.textContent = "Ya no te quedan curaciones.";
    return;
  }

  logMessage.textContent = `${player.name} intenta curarse.`;
  renderQuestionForAction("heal");
});

window.addEventListener("DOMContentLoaded", async () => {
  await loadQuestions();
  player = createPlayer();
  enemies = createEnemies();
  currentEnemy = enemies[0];
  updateUI();
  resetPanels();
});