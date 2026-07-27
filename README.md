# Ikkidine's Game

A private romantic multiplayer web app for Rizki and Nadine.

This project is intentionally designed for only two players. There is no registration, no accounts, no matchmaking, and no room system. The frontend runs as a static app, while the backend owns the realtime two-player session with Socket.IO.

## Project Structure

```text
.
├── frontend/
│   ├── index.html
│   ├── css/
│   │   ├── base.css
│   │   ├── layout.css
│   │   ├── components.css
│   │   ├── animations.css
│   │   └── responsive.css
│   ├── js/
│   │   ├── app.js
│   │   ├── core/
│   │   ├── socket/
│   │   ├── ui/
│   │   └── games/
│   └── assets/
│       ├── images/
│       ├── icons/
│       └── audio/
├── backend/
│   ├── package.json
│   ├── src/
│   │   ├── server.js
│   │   ├── config/
│   │   ├── events/
│   │   ├── game/
│   │   └── utils/
│   └── tests/
├── docs/
│   └── architecture.md
└── netlify.toml
```

## Deployment Targets

- Frontend: Netlify
- Backend: Render or another free Node.js host
- Realtime transport: Socket.IO

## Build Order

1. Architecture and folder structure
2. Backend realtime session foundation
3. Frontend shell, routing, and visual system
4. Game 1: Know Each Other
5. Game 2: This or That
6. Game 3: Guess My Answer
7. Result screen and polish
8. Deployment configuration

