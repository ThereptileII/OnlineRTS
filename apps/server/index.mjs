import { createServer } from "http";
import { createHash } from "crypto";
import { GameSimulation } from "./simulation.mjs";
import { createId } from "../../packages/shared/index.js";

const GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";
const TICK_RATE = 30;
const PORT = Number(process.env.PORT ?? 7070);

const httpServer = createServer();
const simulation = new GameSimulation();

const spawnpoints = [
  { type: "sloop", position: { x: 3.5, y: 12.5 } },
  { type: "corvette", position: { x: 5, y: 13.5 } },
  { type: "transport", position: { x: 4.2, y: 15 } },
  { type: "sloop", position: { x: 14, y: 4.5 } },
  { type: "corvette", position: { x: 16, y: 4 } }
];

for (const spawn of spawnpoints) {
  simulation.createUnit(spawn.type, spawn.position);
}

const clients = new Map();

const createAcceptValue = key =>
  createHash("sha1")
    .update(key + GUID)
    .digest("base64");

const encodeFrame = (data, opcode = 0x1) => {
  const payload = typeof data === "string" ? Buffer.from(data) : data;
  const length = payload.length;
  let header;
  if (length < 126) {
    header = Buffer.alloc(2);
    header[1] = length;
  } else if (length < 65536) {
    header = Buffer.alloc(4);
    header[1] = 126;
    header.writeUInt16BE(length, 2);
  } else {
    header = Buffer.alloc(10);
    header[1] = 127;
    header.writeBigUInt64BE(BigInt(length), 2);
  }
  header[0] = 0x80 | opcode;
  return Buffer.concat([header, payload]);
};

const decodeFrames = client => {
  const messages = [];
  const buffer = client.buffer;
  let offset = 0;
  while (offset + 2 <= buffer.length) {
    const byte1 = buffer[offset];
    const byte2 = buffer[offset + 1];
    const isFinal = (byte1 & 0x80) !== 0;
    const opcode = byte1 & 0x0f;
    const masked = (byte2 & 0x80) !== 0;
    let payloadLength = byte2 & 0x7f;
    offset += 2;
    if (payloadLength === 126) {
      if (offset + 2 > buffer.length) break;
      payloadLength = buffer.readUInt16BE(offset);
      offset += 2;
    } else if (payloadLength === 127) {
      if (offset + 8 > buffer.length) break;
      payloadLength = Number(buffer.readBigUInt64BE(offset));
      offset += 8;
    }
    let maskingKey;
    if (masked) {
      if (offset + 4 > buffer.length) break;
      maskingKey = buffer.slice(offset, offset + 4);
      offset += 4;
    }
    if (offset + payloadLength > buffer.length) break;
    const payload = buffer.slice(offset, offset + payloadLength);
    offset += payloadLength;
    if (!isFinal) {
      continue;
    }
    if (masked && maskingKey) {
      for (let i = 0; i < payload.length; i += 1) {
        payload[i] ^= maskingKey[i % 4];
      }
    }
    if (opcode === 0x8) {
      client.socket.end();
      break;
    }
    if (opcode === 0x9) {
      client.socket.write(encodeFrame(payload, 0xA));
      continue;
    }
    if (opcode === 0x1) {
      messages.push(payload.toString("utf8"));
    }
  }
  client.buffer = buffer.slice(offset);
  return messages;
};

httpServer.on("upgrade", (req, socket) => {
  const key = req.headers["sec-websocket-key"];
  if (!key) {
    socket.destroy();
    return;
  }
  const accept = createAcceptValue(key);
  const responseHeaders = [
    "HTTP/1.1 101 Switching Protocols",
    "Upgrade: websocket",
    "Connection: Upgrade",
    `Sec-WebSocket-Accept: ${accept}`
  ];
  socket.write(responseHeaders.join("\r\n") + "\r\n\r\n");
  socket.setNoDelay(true);
  const clientId = createId(8);
  const client = { id: clientId, socket, buffer: Buffer.alloc(0) };
  clients.set(clientId, client);
  const welcome = {
    type: "welcome",
    clientId,
    snapshot: simulation.snapshot()
  };
  socket.write(encodeFrame(JSON.stringify(welcome)));

  socket.on("data", chunk => {
    client.buffer = Buffer.concat([client.buffer, chunk]);
    const messages = decodeFrames(client);
    for (const raw of messages) {
      try {
        const message = JSON.parse(raw);
        if (message.type === "command") {
          for (const entry of message.payload ?? []) {
            simulation.enqueueOrder(entry.unitIds ?? [], entry.order);
          }
        }
      } catch (error) {
        console.error("Failed to parse client message", error);
      }
    }
  });

  socket.on("close", () => {
    clients.delete(clientId);
  });

  socket.on("error", () => {
    clients.delete(clientId);
  });
});

const broadcast = message => {
  const encoded = encodeFrame(JSON.stringify(message));
  for (const client of clients.values()) {
    client.socket.write(encoded);
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
