const elements = {
  title: document.querySelector("#home-title"),
  subtitle: document.querySelector(".hero-copy"),
  statusLabel: document.querySelector(".status-label"),
  statusText: document.querySelector(".status-text"),
  menu: document.querySelector(".game-menu"),
};

const appState = {
  player: null,
  partner: null,
  session: null,
  activeGame: null,
  games: {
    knowEachOther: null,
    thisOrThat: null,
    guessMyAnswer: null,
  },
};

const GAME_LABELS = {
  knowEachOther: "Know Each Other",
  thisOrThat: "This or That",
  guessMyAnswer: "Guess My Answer",
};

const backendUrl = window.IKKIDINE_BACKEND_URL || window.location.origin;
const socket = window.io?.(backendUrl);

if (!socket) {
  setStatus("Server needed", "Run the Node backend or set your Render backend URL in config.js.");
}

socket?.on("player:assigned", ({ player, session, games }) => {
  appState.player = player;
  appState.partner = player === "Rizki" ? "Nadine" : "Rizki";
  appState.session = session;
  mergeGames(games);
  render();
});

socket?.on("session:update", (session) => {
  appState.session = session;
  render();
});

socket?.on("player:disconnected", ({ message }) => {
  setStatus("Partner disconnected", message);
});

socket?.on("session:full", () => {
  setStatus("Game is full", "Rizki and Nadine are already connected.");
});

socket?.on("game:update", (payload) => {
  mergeGames(payload);
  render();
});

bindStaticMenu();

function render() {
  if (!appState.player) return;

  if (appState.activeGame) {
    renderActiveGame();
    return;
  }

  renderMenu();
  setStatus(
    `${appState.player} connected`,
    appState.session?.bothOnline
      ? "Both players are online. Choose a game to start."
      : `Waiting for ${appState.partner} to join...`
  );
}

function renderMenu() {
  elements.title.textContent = "Choose Your Game";
  elements.subtitle.textContent =
    "Pick one of the three little love tests and play together in sync.";

  elements.menu.innerHTML = `
    ${menuButton("01", "knowEachOther", "Guess what your partner selected.")}
    ${menuButton("02", "thisOrThat", "Choose together and compare tastes.")}
    ${menuButton("03", "guessMyAnswer", "Type your answer, then guess theirs.")}
  `;

  bindMenuButtons();
}

function renderActiveGame() {
  if (appState.activeGame === "knowEachOther") renderKnowEachOther();
  if (appState.activeGame === "thisOrThat") renderThisOrThat();
  if (appState.activeGame === "guessMyAnswer") renderGuessMyAnswer();
}

function renderKnowEachOther() {
  const game = appState.games.knowEachOther;
  if (!game?.active) return;

  elements.title.textContent = "Know Each Other";
  elements.subtitle.textContent =
    "Choose your own answer first. Then guess what your partner chose.";

  if (game.phase === "answer") {
    renderChoiceScreen({
      meta: `Round ${game.round} of ${game.totalRounds}`,
      title: game.question.text,
      helper: `Your answer for ${appState.player}`,
      options: game.question.options,
      score: `Score: Rizki ${game.scores.Rizki} - Nadine ${game.scores.Nadine}`,
      onSelect: (answer) => socket.emit("know:answer", { answer }),
    });
    setStatus("Pick your answer", waitingCopy(game.submitted.answers));
    return;
  }

  if (game.phase === "guess") {
    renderChoiceScreen({
      meta: `Round ${game.round} of ${game.totalRounds}`,
      title: `What did ${appState.partner} choose?`,
      helper: "Partner guess",
      options: game.question.options,
      score: `Score: Rizki ${game.scores.Rizki} - Nadine ${game.scores.Nadine}`,
      onSelect: (guess) => socket.emit("know:guess", { guess }),
    });
    setStatus("Guess time", waitingCopy(game.submitted.guesses));
    return;
  }

  if (game.phase === "reveal") {
    const mine = game.reveal[appState.player];
    const partner = game.reveal[appState.partner];
    renderRevealCard({
      meta: `Round ${game.round} reveal`,
      title: mine.correct ? "Correct" : "Incorrect",
      pills: [
        ["Your answer", mine.ownAnswer],
        [`${appState.partner} guessed`, mine.partnerGuess],
        ["Your guess", partner.partnerGuess],
      ],
      footer: `Score: Rizki ${game.scores.Rizki} - Nadine ${game.scores.Nadine}`,
      actionLabel: "Continue",
      onAction: () => socket.emit("know:continue"),
    });
    setStatus("Reveal", "See what matched, then continue to the next question.");
    return;
  }

  if (game.phase === "complete") {
    const totalScore = game.scores.Rizki + game.scores.Nadine;
    const percentage = Math.round((totalScore / (game.totalRounds * 2)) * 100);
    renderFinalCard({
      title: `${percentage}%`,
      meta: "Relationship Score",
      stats: [
        ["Rizki score", `${game.scores.Rizki}/${game.totalRounds}`],
        ["Nadine score", `${game.scores.Nadine}/${game.totalRounds}`],
        ["Energy", relationshipEnergy(percentage)],
      ],
      primary: ["Play Again", () => socket.emit("know:start")],
    });
    setStatus("Game complete", "Relationship score unlocked.");
  }
}

function renderThisOrThat() {
  const game = appState.games.thisOrThat;
  if (!game?.active) return;

  elements.title.textContent = "This or That";
  elements.subtitle.textContent = "Choose at the same time. No wrong answers, just matching energy.";

  if (game.phase === "choice") {
    renderChoiceScreen({
      meta: `Round ${game.round} of ${game.totalRounds}`,
      title: game.question.text,
      helper: `Choose as ${appState.player}`,
      options: game.question.options,
      score: `Compatibility: ${game.compatibility}%`,
      onSelect: (choice) => socket.emit("this:choice", { choice }),
    });
    setStatus("Choose one", waitingCopy(game.submitted));
    return;
  }

  if (game.phase === "reveal") {
    renderRevealCard({
      meta: `Round ${game.round} reveal`,
      title: game.reveal.matched ? "Perfect Match" : "Different tastes",
      pills: [
        ["Rizki chose", game.reveal.choices.Rizki],
        ["Nadine chose", game.reveal.choices.Nadine],
        ["Compatibility", `${game.compatibility}%`],
      ],
      footer: `${game.matches}/${game.round} matching rounds`,
      actionLabel: "Continue",
      onAction: () => socket.emit("this:continue"),
    });
    setStatus("Reveal", game.reveal.matched ? "Perfect match." : "Different tastes, still cute.");
    return;
  }

  if (game.phase === "complete") {
    renderFinalCard({
      title: `${game.compatibility}%`,
      meta: "Same Taste",
      stats: [
        ["Perfect matches", `${game.matches}/${game.totalRounds}`],
        ["Compatibility", `${game.compatibility}%`],
        ["Energy", relationshipEnergy(game.compatibility)],
      ],
      primary: ["Play Again", () => socket.emit("this:start")],
    });
    setStatus("Game complete", "Taste compatibility calculated.");
  }
}

function renderGuessMyAnswer() {
  const game = appState.games.guessMyAnswer;
  if (!game?.active) return;

  elements.title.textContent = "Guess My Answer";
  elements.subtitle.textContent =
    "Type your honest answer, then try to guess what your partner wrote.";

  if (game.phase === "answer") {
    renderTextScreen({
      meta: `Round ${game.round} of ${game.totalRounds}`,
      title: game.question,
      placeholder: "Type your answer...",
      buttonLabel: "Submit Answer",
      score: `Score: Rizki ${game.scores.Rizki} - Nadine ${game.scores.Nadine}`,
      onSubmit: (answer) => socket.emit("guess:answer", { answer }),
    });
    setStatus("Write your answer", waitingCopy(game.submitted.answers));
    return;
  }

  if (game.phase === "guess") {
    renderTextScreen({
      meta: `Round ${game.round} of ${game.totalRounds}`,
      title: `What did ${appState.partner} write?`,
      placeholder: `Guess ${appState.partner}'s answer...`,
      buttonLabel: "Submit Guess",
      score: `Telepathy: ${game.telepathy}%`,
      onSubmit: (guess) => socket.emit("guess:guess", { guess }),
    });
    setStatus("Guess time", waitingCopy(game.submitted.guesses));
    return;
  }

  if (game.phase === "reveal") {
    const mine = game.reveal[appState.player];
    renderRevealCard({
      meta: `Round ${game.round} reveal`,
      title: mine.correct ? "Close enough" : "Not quite",
      pills: [
        ["Your answer", mine.ownAnswer],
        [`${appState.partner} guessed`, mine.partnerGuess],
        ["Similarity", `${mine.similarity}%`],
      ],
      footer: `Score: Rizki ${game.scores.Rizki} - Nadine ${game.scores.Nadine}`,
      actionLabel: "Continue",
      onAction: () => socket.emit("guess:continue"),
    });
    setStatus("Reveal", "Similarity is based on matching words and close phrasing.");
    return;
  }

  if (game.phase === "complete") {
    const totalScore = game.scores.Rizki + game.scores.Nadine;
    const scorePercent = Math.round((totalScore / (game.totalRounds * 2)) * 100);
    renderFinalCard({
      title: `${game.telepathy}%`,
      meta: "Telepathy",
      stats: [
        ["Close guesses", `${totalScore}/${game.totalRounds * 2}`],
        ["Score", `${scorePercent}%`],
        ["Energy", relationshipEnergy(game.telepathy)],
      ],
      primary: ["Play Again", () => socket.emit("guess:start")],
    });
    setStatus("Game complete", "Telepathy score unlocked.");
  }
}

function renderChoiceScreen({ meta, title, helper, options, score, onSelect }) {
  elements.menu.innerHTML = `
    <div class="screen-card">
      <p class="question-meta">${escapeHtml(meta)}</p>
      <h2 class="question-text">${escapeHtml(title)}</h2>
      <p class="score-line">${escapeHtml(helper)}</p>
      <div class="choice-grid">
        ${options
          .map(
            (option) => `
              <button class="choice-button" type="button" data-choice="${escapeHtml(option)}">
                ${escapeHtml(option)}
              </button>
            `
          )
          .join("")}
      </div>
      <div class="round-footer">
        <p class="score-line">${escapeHtml(score)}</p>
      </div>
    </div>
  `;

  elements.menu.querySelectorAll(".choice-button").forEach((button) => {
    button.addEventListener("click", () => {
      elements.menu.querySelectorAll(".choice-button").forEach((item) => {
        item.disabled = true;
      });
      button.classList.add("is-selected");
      onSelect(button.dataset.choice);
    });
  });
}

function renderTextScreen({ meta, title, placeholder, buttonLabel, score, onSubmit }) {
  elements.menu.innerHTML = `
    <div class="screen-card">
      <p class="question-meta">${escapeHtml(meta)}</p>
      <h2 class="question-text">${escapeHtml(title)}</h2>
      <form class="answer-form">
        <textarea class="answer-input" minlength="1" maxlength="120" placeholder="${escapeHtml(
          placeholder
        )}" required></textarea>
        <div class="round-footer">
          <p class="score-line">${escapeHtml(score)}</p>
          <button class="menu-button" type="submit">${escapeHtml(buttonLabel)}</button>
        </div>
      </form>
    </div>
  `;

  elements.menu.querySelector(".answer-form")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const input = elements.menu.querySelector(".answer-input");
    const value = input.value.trim();

    if (!value) return;

    input.disabled = true;
    elements.menu.querySelector(".menu-button").disabled = true;
    onSubmit(value);
  });
}

function renderRevealCard({ meta, title, pills, footer, actionLabel, onAction }) {
  elements.menu.innerHTML = `
    <div class="screen-card">
      <p class="question-meta">${escapeHtml(meta)}</p>
      <h2 class="question-text">${escapeHtml(title)}</h2>
      <div class="result-grid">
        ${pills
          .map(
            ([label, value]) => `
              <div class="result-pill">
                <span>${escapeHtml(label)}</span>
                <strong>${escapeHtml(value)}</strong>
              </div>
            `
          )
          .join("")}
      </div>
      <div class="round-footer">
        <p class="score-line">${escapeHtml(footer)}</p>
        <button class="menu-button" type="button">${escapeHtml(actionLabel)}</button>
      </div>
    </div>
  `;

  elements.menu.querySelector(".menu-button")?.addEventListener("click", onAction);
}

function renderFinalCard({ meta, title, stats, primary }) {
  elements.menu.innerHTML = `
    <div class="screen-card">
      <p class="question-meta">${escapeHtml(meta)}</p>
      <div class="celebration-heart" aria-hidden="true">&hearts;</div>
      <h2 class="question-text">${escapeHtml(title)}</h2>
      <div class="result-grid">
        ${stats
          .map(
            ([label, value]) => `
              <div class="result-pill">
                <span>${escapeHtml(label)}</span>
                <strong>${escapeHtml(value)}</strong>
              </div>
            `
          )
          .join("")}
      </div>
      <div class="round-footer">
        <button class="menu-button" type="button" data-action="primary">${escapeHtml(primary[0])}</button>
        <button class="secondary-button" type="button" data-action="menu">Back to Menu</button>
      </div>
    </div>
  `;

  elements.menu.querySelector('[data-action="primary"]')?.addEventListener("click", primary[1]);
  elements.menu.querySelector('[data-action="menu"]')?.addEventListener("click", () => {
    socket.emit("menu:back");
  });
}

function menuButton(number, gameId, description) {
  return `
    <button class="game-option" type="button" data-game="${gameId}">
      <span class="preview-icon" aria-hidden="true">${number}</span>
      <span>
        <strong>${GAME_LABELS[gameId]}</strong>
        <small>${description}</small>
      </span>
    </button>
  `;
}

function bindStaticMenu() {
  document.querySelectorAll(".game-option").forEach((button) => {
    button.addEventListener("click", () => startGame(button.dataset.game));
  });
}

function bindMenuButtons() {
  elements.menu.querySelectorAll(".game-option").forEach((button) => {
    button.addEventListener("click", () => startGame(button.dataset.game));
  });
}

function startGame(gameId) {
  const eventName = {
    knowEachOther: "know:start",
    thisOrThat: "this:start",
    guessMyAnswer: "guess:start",
  }[gameId];

  if (eventName) socket?.emit(eventName);
}

function mergeGames(payload = {}) {
  if (Object.hasOwn(payload, "activeGame")) appState.activeGame = payload.activeGame;
  if (payload.knowEachOther) appState.games.knowEachOther = payload.knowEachOther;
  if (payload.thisOrThat) appState.games.thisOrThat = payload.thisOrThat;
  if (payload.guessMyAnswer) appState.games.guessMyAnswer = payload.guessMyAnswer;
}

function waitingCopy(submittedPlayers) {
  const hasSubmitted = submittedPlayers.includes(appState.player);
  const partnerSubmitted = submittedPlayers.includes(appState.partner);

  if (hasSubmitted && partnerSubmitted) return "Both answers are in.";
  if (hasSubmitted) return `Waiting for ${appState.partner}...`;
  if (partnerSubmitted) return `${appState.partner} already submitted. Your turn.`;
  return "Waiting for both players.";
}

function relationshipEnergy(score) {
  if (score >= 85) return "Excellent";
  if (score >= 70) return "Very Sweet";
  if (score >= 50) return "Growing Strong";
  return "Still Learning";
}

function setStatus(label, text) {
  elements.statusLabel.textContent = label;
  elements.statusText.textContent = text;
}

function escapeHtml(value) {
  const div = document.createElement("div");
  div.textContent = String(value);
  return div.innerHTML;
}
