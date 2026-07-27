import {
  assignPlayer,
  continueGuessMyAnswer,
  continueKnowEachOther,
  continueThisOrThat,
  getAllGamesSnapshot,
  getGuessMyAnswerSnapshot,
  getKnowEachOtherSnapshot,
  getSessionSnapshot,
  getThisOrThatSnapshot,
  removePlayerBySocket,
  resetToMenu,
  startGuessMyAnswer,
  startKnowEachOther,
  startThisOrThat,
  submitGuessMyAnswer,
  submitGuessMyAnswerGuess,
  submitGuess,
  submitOwnAnswer,
  submitThisOrThatChoice,
} from "../game/state/sessionStore.js";

export const registerSocketEvents = (io) => {
  io.on("connection", (socket) => {
    const player = assignPlayer(socket.id);

    if (!player) {
      socket.emit("session:full");
      socket.disconnect(true);
      return;
    }

    socket.emit("player:assigned", {
      player,
      session: getSessionSnapshot(),
      games: getAllGamesSnapshot(),
    });

    io.emit("session:update", getSessionSnapshot());

    socket.on("know:start", () => {
      io.emit("game:update", {
        activeGame: "knowEachOther",
        knowEachOther: startKnowEachOther(),
      });
    });

    socket.on("know:answer", ({ answer }) => {
      io.emit("game:update", {
        activeGame: "knowEachOther",
        knowEachOther: submitOwnAnswer(player, answer),
      });
    });

    socket.on("know:guess", ({ guess }) => {
      io.emit("game:update", {
        activeGame: "knowEachOther",
        knowEachOther: submitGuess(player, guess),
      });
    });

    socket.on("know:continue", () => {
      io.emit("game:update", {
        activeGame: "knowEachOther",
        knowEachOther: continueKnowEachOther(),
      });
    });

    socket.on("this:start", () => {
      io.emit("game:update", {
        activeGame: "thisOrThat",
        thisOrThat: startThisOrThat(),
      });
    });

    socket.on("this:choice", ({ choice }) => {
      io.emit("game:update", {
        activeGame: "thisOrThat",
        thisOrThat: submitThisOrThatChoice(player, choice),
      });
    });

    socket.on("this:continue", () => {
      io.emit("game:update", {
        activeGame: "thisOrThat",
        thisOrThat: continueThisOrThat(),
      });
    });

    socket.on("guess:start", () => {
      io.emit("game:update", {
        activeGame: "guessMyAnswer",
        guessMyAnswer: startGuessMyAnswer(),
      });
    });

    socket.on("guess:answer", ({ answer }) => {
      io.emit("game:update", {
        activeGame: "guessMyAnswer",
        guessMyAnswer: submitGuessMyAnswer(player, answer),
      });
    });

    socket.on("guess:guess", ({ guess }) => {
      io.emit("game:update", {
        activeGame: "guessMyAnswer",
        guessMyAnswer: submitGuessMyAnswerGuess(player, guess),
      });
    });

    socket.on("guess:continue", () => {
      io.emit("game:update", {
        activeGame: "guessMyAnswer",
        guessMyAnswer: continueGuessMyAnswer(),
      });
    });

    socket.on("menu:back", () => {
      io.emit("game:update", resetToMenu());
    });

    socket.on("state:request", () => {
      socket.emit("game:update", {
        ...getAllGamesSnapshot(),
        knowEachOther: getKnowEachOtherSnapshot(),
        thisOrThat: getThisOrThatSnapshot(),
        guessMyAnswer: getGuessMyAnswerSnapshot(),
      });
    });

    socket.on("disconnect", () => {
      const disconnectedPlayer = removePlayerBySocket(socket.id);

      if (!disconnectedPlayer) return;

      io.emit("player:disconnected", {
        player: disconnectedPlayer,
        message: `${disconnectedPlayer} disconnected...`,
      });
      io.emit("session:update", getSessionSnapshot());
    });
  });
};
