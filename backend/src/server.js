import path from "node:path";
import { fileURLToPath } from "node:url";
import cors from "cors";
import express from "express";
import { createServer } from "node:http";
import { Server } from "socket.io";
import { env } from "./config/env.js";
import { registerSocketEvents } from "./events/socket.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendPath = path.resolve(__dirname, "../../frontend");

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: env.clientOrigin,
    methods: ["GET", "POST"],
  },
});

app.use(cors({ origin: env.clientOrigin }));
app.use(express.json());
app.use(express.static(frontendPath));

app.get("/health", (_request, response) => {
  response.json({ ok: true, app: "Ikkidine's Game" });
});

registerSocketEvents(io);

httpServer.listen(env.port, "0.0.0.0", () => {
  console.log(`Ikkidine's Game is running at http://localhost:${env.port}`);
});
