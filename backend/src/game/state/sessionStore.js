import { guessMyAnswerQuestions } from "../data/guess-my-answer.js";
import { knowEachOtherQuestions } from "../data/know-each-other.js";
import { thisOrThatQuestions } from "../data/this-or-that.js";

const PLAYERS = ["Rizki", "Nadine"];

const createKnowEachOtherState = () => ({
  active: false,
  roundIndex: 0,
  phase: "menu",
  ownAnswers: {},
  guesses: {},
  scores: {
    Rizki: 0,
    Nadine: 0,
  },
  lastReveal: null,
});

const createThisOrThatState = () => ({
  active: false,
  roundIndex: 0,
  phase: "menu",
  choices: {},
  matches: 0,
  lastReveal: null,
});

const createGuessMyAnswerState = () => ({
  active: false,
  roundIndex: 0,
  phase: "menu",
  answers: {},
  guesses: {},
  scores: {
    Rizki: 0,
    Nadine: 0,
  },
  similarityTotal: 0,
  lastReveal: null,
});

const state = {
  sockets: new Map(),
  players: {
    Rizki: null,
    Nadine: null,
  },
  activeGame: null,
  knowEachOther: createKnowEachOtherState(),
  thisOrThat: createThisOrThatState(),
  guessMyAnswer: createGuessMyAnswerState(),
};

export const getSessionSnapshot = () => ({
  players: {
    Rizki: Boolean(state.players.Rizki),
    Nadine: Boolean(state.players.Nadine),
  },
  bothOnline: Boolean(state.players.Rizki && state.players.Nadine),
});

export const assignPlayer = (socketId) => {
  const existingPlayer = state.sockets.get(socketId);

  if (existingPlayer) return existingPlayer;

  const openSlot = PLAYERS.find((player) => !state.players[player]);

  if (!openSlot) return null;

  state.players[openSlot] = socketId;
  state.sockets.set(socketId, openSlot);

  return openSlot;
};

export const removePlayerBySocket = (socketId) => {
  const player = state.sockets.get(socketId);

  if (!player) return null;

  state.players[player] = null;
  state.sockets.delete(socketId);

  return player;
};

export const resetToMenu = () => {
  state.activeGame = null;
  state.knowEachOther = createKnowEachOtherState();
  state.thisOrThat = createThisOrThatState();
  state.guessMyAnswer = createGuessMyAnswerState();
  return getAllGamesSnapshot();
};

export const restartCurrentGame = () => {
  if (!state.activeGame) return getAllGamesSnapshot();

  const gameId = state.activeGame;

  if (gameId === "knowEachOther") {
    state.knowEachOther = createKnowEachOtherState();
    state.knowEachOther.active = true;
    state.knowEachOther.phase = "answer";
  } else if (gameId === "thisOrThat") {
    state.thisOrThat = createThisOrThatState();
    state.thisOrThat.active = true;
    state.thisOrThat.phase = "choice";
  } else if (gameId === "guessMyAnswer") {
    state.guessMyAnswer = createGuessMyAnswerState();
    state.guessMyAnswer.active = true;
    state.guessMyAnswer.phase = "answer";
  }

  return getAllGamesSnapshot();
};

export const getAllGamesSnapshot = () => ({
  activeGame: state.activeGame,
  knowEachOther: getKnowEachOtherSnapshot(),
  thisOrThat: getThisOrThatSnapshot(),
  guessMyAnswer: getGuessMyAnswerSnapshot(),
});

export const startKnowEachOther = () => {
  resetToMenu();
  state.activeGame = "knowEachOther";
  state.knowEachOther = createKnowEachOtherState();
  state.knowEachOther.active = true;
  state.knowEachOther.phase = "answer";

  return getKnowEachOtherSnapshot();
};

export const getKnowEachOtherSnapshot = () => {
  const game = state.knowEachOther;
  const question = knowEachOtherQuestions[game.roundIndex];

  return {
    active: game.active,
    phase: game.phase,
    round: game.roundIndex + 1,
    totalRounds: knowEachOtherQuestions.length,
    question,
    scores: game.scores,
    submitted: {
      answers: Object.keys(game.ownAnswers),
      guesses: Object.keys(game.guesses),
    },
    reveal: game.lastReveal,
  };
};

export const submitOwnAnswer = (player, answer) => {
  const game = state.knowEachOther;
  if (!game.active || game.phase !== "answer") return getKnowEachOtherSnapshot();

  game.ownAnswers[player] = answer;

  if (PLAYERS.every((name) => game.ownAnswers[name])) {
    game.phase = "guess";
  }

  return getKnowEachOtherSnapshot();
};

export const submitGuess = (player, guess) => {
  const game = state.knowEachOther;
  if (!game.active || game.phase !== "guess") return getKnowEachOtherSnapshot();

  game.guesses[player] = guess;

  if (PLAYERS.every((name) => game.guesses[name])) {
    const reveal = buildReveal();
    game.lastReveal = reveal;
    game.phase = "reveal";
  }

  return getKnowEachOtherSnapshot();
};

export const continueKnowEachOther = () => {
  const game = state.knowEachOther;

  if (!game.active || game.phase !== "reveal") return getKnowEachOtherSnapshot();

  if (game.roundIndex >= knowEachOtherQuestions.length - 1) {
    game.phase = "complete";
    return getKnowEachOtherSnapshot();
  }

  game.roundIndex += 1;
  game.phase = "answer";
  game.ownAnswers = {};
  game.guesses = {};
  game.lastReveal = null;

  return getKnowEachOtherSnapshot();
};

const buildReveal = () => {
  const game = state.knowEachOther;
  const rizkiCorrect = game.guesses.Rizki === game.ownAnswers.Nadine;
  const nadineCorrect = game.guesses.Nadine === game.ownAnswers.Rizki;

  if (rizkiCorrect) game.scores.Rizki += 1;
  if (nadineCorrect) game.scores.Nadine += 1;

  return {
    Rizki: {
      ownAnswer: game.ownAnswers.Rizki,
      partnerGuess: game.guesses.Nadine,
      correct: nadineCorrect,
    },
    Nadine: {
      ownAnswer: game.ownAnswers.Nadine,
      partnerGuess: game.guesses.Rizki,
      correct: rizkiCorrect,
    },
  };
};

export const startThisOrThat = () => {
  resetToMenu();
  state.activeGame = "thisOrThat";
  state.thisOrThat = createThisOrThatState();
  state.thisOrThat.active = true;
  state.thisOrThat.phase = "choice";
  return getThisOrThatSnapshot();
};

export const getThisOrThatSnapshot = () => {
  const game = state.thisOrThat;
  const question = thisOrThatQuestions[game.roundIndex];
  const completedRounds = game.phase === "choice" ? game.roundIndex : game.roundIndex + 1;

  return {
    active: game.active,
    phase: game.phase,
    round: game.roundIndex + 1,
    totalRounds: thisOrThatQuestions.length,
    question,
    matches: game.matches,
    compatibility: Math.round((game.matches / Math.max(completedRounds, 1)) * 100),
    submitted: Object.keys(game.choices),
    reveal: game.lastReveal,
  };
};

export const submitThisOrThatChoice = (player, choice) => {
  const game = state.thisOrThat;
  if (!game.active || game.phase !== "choice") return getThisOrThatSnapshot();

  game.choices[player] = choice;

  if (PLAYERS.every((name) => game.choices[name])) {
    const matched = game.choices.Rizki === game.choices.Nadine;
    if (matched) game.matches += 1;
    game.lastReveal = {
      choices: {
        Rizki: game.choices.Rizki,
        Nadine: game.choices.Nadine,
      },
      matched,
      message: matched ? "Perfect Match" : "Different tastes",
    };
    game.phase = "reveal";
  }

  return getThisOrThatSnapshot();
};

export const continueThisOrThat = () => {
  const game = state.thisOrThat;
  if (!game.active || game.phase !== "reveal") return getThisOrThatSnapshot();

  if (game.roundIndex >= thisOrThatQuestions.length - 1) {
    game.phase = "complete";
    return getThisOrThatSnapshot();
  }

  game.roundIndex += 1;
  game.phase = "choice";
  game.choices = {};
  game.lastReveal = null;

  return getThisOrThatSnapshot();
};

export const startGuessMyAnswer = () => {
  resetToMenu();
  state.activeGame = "guessMyAnswer";
  state.guessMyAnswer = createGuessMyAnswerState();
  state.guessMyAnswer.active = true;
  state.guessMyAnswer.phase = "answer";
  return getGuessMyAnswerSnapshot();
};

export const getGuessMyAnswerSnapshot = () => {
  const game = state.guessMyAnswer;
  const question = guessMyAnswerQuestions[game.roundIndex];
  const completedRounds = game.phase === "answer" || game.phase === "guess" ? game.roundIndex : game.roundIndex + 1;

  return {
    active: game.active,
    phase: game.phase,
    round: game.roundIndex + 1,
    totalRounds: guessMyAnswerQuestions.length,
    question,
    scores: game.scores,
    telepathy: Math.round(game.similarityTotal / Math.max(completedRounds, 1)),
    submitted: {
      answers: Object.keys(game.answers),
      guesses: Object.keys(game.guesses),
    },
    reveal: game.lastReveal,
  };
};

export const submitGuessMyAnswer = (player, answer) => {
  const game = state.guessMyAnswer;
  if (!game.active || game.phase !== "answer") return getGuessMyAnswerSnapshot();

  game.answers[player] = answer.trim();

  if (PLAYERS.every((name) => game.answers[name])) {
    game.phase = "guess";
  }

  return getGuessMyAnswerSnapshot();
};

export const submitGuessMyAnswerGuess = (player, guess) => {
  const game = state.guessMyAnswer;
  if (!game.active || game.phase !== "guess") return getGuessMyAnswerSnapshot();

  game.guesses[player] = guess.trim();

  if (PLAYERS.every((name) => game.guesses[name])) {
    const rizkiSimilarity = getSimilarityPercent(game.guesses.Rizki, game.answers.Nadine);
    const nadineSimilarity = getSimilarityPercent(game.guesses.Nadine, game.answers.Rizki);

    if (rizkiSimilarity >= 45) game.scores.Rizki += 1;
    if (nadineSimilarity >= 45) game.scores.Nadine += 1;

    game.similarityTotal += Math.round((rizkiSimilarity + nadineSimilarity) / 2);
    game.lastReveal = {
      Rizki: {
        ownAnswer: game.answers.Rizki,
        partnerGuess: game.guesses.Nadine,
        similarity: nadineSimilarity,
        correct: nadineSimilarity >= 45,
      },
      Nadine: {
        ownAnswer: game.answers.Nadine,
        partnerGuess: game.guesses.Rizki,
        similarity: rizkiSimilarity,
        correct: rizkiSimilarity >= 45,
      },
    };
    game.phase = "reveal";
  }

  return getGuessMyAnswerSnapshot();
};

export const continueGuessMyAnswer = () => {
  const game = state.guessMyAnswer;
  if (!game.active || game.phase !== "reveal") return getGuessMyAnswerSnapshot();

  if (game.roundIndex >= guessMyAnswerQuestions.length - 1) {
    game.phase = "complete";
    return getGuessMyAnswerSnapshot();
  }

  game.roundIndex += 1;
  game.phase = "answer";
  game.answers = {};
  game.guesses = {};
  game.lastReveal = null;

  return getGuessMyAnswerSnapshot();
};

const getSimilarityPercent = (guess, answer) => {
  const guessWords = normalizeWords(guess);
  const answerWords = normalizeWords(answer);

  if (!guessWords.length || !answerWords.length) return 0;

  const answerSet = new Set(answerWords);
  const matchedWords = guessWords.filter((word) => answerSet.has(word)).length;
  const overlap = matchedWords / Math.max(answerWords.length, guessWords.length);
  const phraseBonus =
    guess.toLowerCase().includes(answer.toLowerCase()) ||
    answer.toLowerCase().includes(guess.toLowerCase())
      ? 0.35
      : 0;

  return Math.min(100, Math.round((overlap + phraseBonus) * 100));
};

const normalizeWords = (value) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
