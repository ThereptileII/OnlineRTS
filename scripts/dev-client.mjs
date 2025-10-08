import { createServer } from "http";
import { readFile, stat } from "fs/promises";
import { extname, join, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const clientRoot = resolve(__dirname, "../apps/client");

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8"
};

const resolvePath = async requestPath => {
  const safePath = requestPath.split("?")[0].split("#")[0];
  const target = resolve(clientRoot, `.${safePath}`);
  if (!target.startsWith(clientRoot)) {
    throw new Error("Invalid path");
  }
  let filePath = target;
  let fileStat;
  try {
    fileStat = await stat(filePath);
  } catch (error) {
    filePath = join(clientRoot, "index.html");
    fileStat = await stat(filePath);
  }
  if (fileStat.isDirectory()) {
    filePath = join(filePath, "index.html");
  }
  return filePath;
};

const server = createServer(async (req, res) => {
  try {
    const filePath = await resolvePath(req.url ?? "/");
    const body = await readFile(filePath);
    const ext = extname(filePath);
    const mime = MIME_TYPES[ext] ?? "application/octet-stream";
    res.writeHead(200, { "Content-Type": mime });
    res.end(body);
  } catch (error) {
    console.error(error);
    res.writeHead(500, { "Content-Type": "text/plain" });
    res.end("Internal Server Error");
  }
});

const port = Number(process.env.PORT ?? 5173);
server.listen(port, () => {
  console.log(`SeaLines client available at http://localhost:${port}`);
});
