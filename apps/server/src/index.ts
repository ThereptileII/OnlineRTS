import { createServer } from "http";
import { WebSocketServer } from "ws";
import type { WebSocket } from "ws";
import { nanoid } from "nanoid";
import type { Order } from "@seelines/shared";
import { GameSimulation } from "./simulation";

interface CommandMessage {
  type: "command";
  payload: {
    unitIds: number[];
    order: Order;
  }[];
}

type ClientMessage = CommandMessage;

interface WelcomeMessage {
  type: "welcome";
  clientId: string;
  snapshot: ReturnType<GameSimulation["snapshot"]>;
}

interface SnapshotMessage {
  type: "snapshot";
  snapshot: ReturnType<GameSimulation["snapshot"]>;
}

type ServerMessage = WelcomeMessage | SnapshotMessage;

const TICK_RATE = 30;
const PORT = Number(process.env.PORT ?? 7070);

const httpServer = createServer();
const wss = new WebSocketServer({ server: httpServer });

const simulation = new GameSimulation();

const spawnpoints: Array<{ type: Parameters<GameSimulation["createUnit"]>[0]; position: Parameters<GameSimulation["createUnit"]>[1] }> = [
  { type: "sloop", position: { x: 3.5, y: 12.5 } },
  { type: "corvette", position: { x: 5, y: 13.5 } },
  { type: "transport", position: { x: 4.2, y: 15 } },
  { type: "sloop", position: { x: 14, y: 4.5 } },
  { type: "corvette", position: { x: 16, y: 4 } }
];

for (const spawn of spawnpoints) {
  simulation.createUnit(spawn.type, spawn.position);
}

const clients = new Map<string, WebSocket>();

wss.on("connection", ws => {
  const clientId = nanoid(8);
  clients.set(clientId, ws);
  const welcome: WelcomeMessage = {
    type: "welcome",
    clientId,
    snapshot: simulation.snapshot()
  };
  ws.send(JSON.stringify(welcome));

  ws.on("message", data => {
    try {
      const message = JSON.parse(data.toString()) as ClientMessage;
      if (message.type === "command") {
        for (const entry of message.payload) {
          simulation.enqueueOrder(entry.unitIds, entry.order);
        }
      }
    } catch (error) {
      console.error("Failed to parse client message", error);
    }
  });

  ws.on("close", () => {
    clients.delete(clientId);
  });
});

const broadcast = (message: ServerMessage): void => {
  const encoded = JSON.stringify(message);
  for (const ws of clients.values()) {
    if (ws.readyState === ws.OPEN) {
      ws.send(encoded);
    }
  }
};

const tickInterval = 1000 / TICK_RATE;
setInterval(() => {
  simulation.step(1);
  broadcast({
    type: "snapshot",
    snapshot: simulation.snapshot()
  });
}, tickInterval).unref();

httpServer.listen(PORT, () => {
  console.log(`SeaLines server running on ws://localhost:${PORT}`);
});
