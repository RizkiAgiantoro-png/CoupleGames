# Architecture

## Product Scope

Ikkidine's Game is a private two-player realtime game for Rizki and Nadine. The server automatically assigns each connected client to one of the two fixed players. Once both players are online, the app starts the shared experience.

## Frontend

The frontend is a static Vanilla JavaScript application.

```text
frontend/
├── index.html
├── css/
│   ├── base.css          # CSS variables, typography, reset, theme tokens
│   ├── layout.css        # App shell, page layout, responsive containers
│   ├── components.css    # Buttons, cards, badges, forms, modals, progress UI
│   ├── animations.css    # Particles, transitions, loading, celebration effects
│   └── responsive.css    # Viewport-specific refinements
├── js/
│   ├── app.js            # App bootstrap and global orchestration
│   ├── core/
│   │   ├── constants.js  # Player names, game ids, score labels
│   │   ├── state.js      # Client-side state store
│   │   └── router.js     # Lightweight view navigation
│   ├── socket/
│   │   ├── client.js     # Socket.IO connection setup
│   │   └── events.js     # Client event handlers and emit helpers
│   ├── ui/
│   │   ├── dom.js        # DOM helpers
│   │   ├── screens.js    # Screen rendering helpers
│   │   ├── particles.js  # Floating romantic particle layer
│   │   └── transitions.js# Smooth view transitions
│   └── games/
│       ├── know-each-other/
│       ├── this-or-that/
│       └── guess-my-answer/
└── assets/
    ├── images/
    ├── icons/
    └── audio/
```

## Backend

The backend is a small Node.js service using Express and Socket.IO.

```text
backend/
├── package.json
├── src/
│   ├── server.js
│   ├── config/
│   │   └── env.js             # Port, CORS origin, runtime config
│   ├── events/
│   │   ├── socket.js          # Socket.IO lifecycle registration
│   │   ├── connection.js      # Player assignment and disconnect handling
│   │   └── game-events.js     # Game event routing
│   ├── game/
│   │   ├── data/
│   │   │   ├── know-each-other.js
│   │   │   ├── this-or-that.js
│   │   │   └── guess-my-answer.js
│   │   ├── engines/
│   │   │   ├── knowEachOtherEngine.js
│   │   │   ├── thisOrThatEngine.js
│   │   │   └── guessMyAnswerEngine.js
│   │   └── state/
│   │       ├── sessionStore.js
│   │       └── scoreStore.js
│   └── utils/
│       ├── player.js
│       └── similarity.js
└── tests/
```

## Realtime Model

There is one global session:

- Slot 1: Rizki
- Slot 2: Nadine
- The first connected client chooses or receives a fixed player identity.
- When both players are connected, the server emits a `session:ready` event.
- If one disconnects, the server emits `player:disconnected` with the player name.

## Game Flow

The full experience moves through:

1. Home
2. Player presence and waiting state
3. Know Each Other
4. This or That
5. Guess My Answer
6. Result screen

The server remains the source of truth for:

- Connected players
- Current game
- Current round
- Submitted answers
- Reveal state
- Scores and compatibility stats

