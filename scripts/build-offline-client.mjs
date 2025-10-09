import { access, cp, mkdir, rm } from "fs/promises";
import { constants as fsConstants } from "fs";
import { spawn } from "child_process";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = resolve(__dirname, "..");
const clientDir = resolve(repoRoot, "apps/client");
const offlineDir = resolve(repoRoot, "offline/client");

const run = (command, args, options = {}) =>
  new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(command, args, {
      stdio: "inherit",
      shell: process.platform === "win32",
      ...options
    });
    child.on("close", code => {
      if (code === 0) {
        resolvePromise(undefined);
      } else {
        rejectPromise(new Error(`${command} ${args.join(" ")} failed with exit code ${code}`));
      }
    });
  });

const ensureClientDependencies = async () => {
  try {
    await access(resolve(clientDir, "node_modules", "vite", "package.json"), fsConstants.F_OK);
  } catch {
    console.log("Installing client dependencies...");
    await run("npm", ["install"], { cwd: clientDir });
  }
};

const buildOffline = async () => {
  await ensureClientDependencies();
  await run("npm", ["run", "build"], { cwd: clientDir });
  await rm(offlineDir, { recursive: true, force: true });
  await mkdir(offlineDir, { recursive: true });
  await cp(resolve(clientDir, "dist"), offlineDir, { recursive: true });
};

await buildOffline();

console.log("Offline client build exported to", offlineDir);
