import { access, cp, mkdir, readFile, rm, writeFile } from "fs/promises";
import { constants as fsConstants } from "fs";
import { spawn } from "child_process";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import { build as bundleWithEsbuild } from "esbuild";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = resolve(__dirname, "..");
const clientDir = resolve(repoRoot, "apps/client");
const offlineDir = resolve(repoRoot, "offline/client");

const convertEntryToIife = async () => {
  const indexPath = resolve(clientDir, "dist/index.html");
  let indexHtml = await readFile(indexPath, "utf8");
  const scriptTagMatch = indexHtml.match(/<script[^>]*type="module"[^>]*src="([^"]+)"[^>]*><\/script>/);
  if (!scriptTagMatch) {
    throw new Error("Unable to locate module script tag in built index.html");
  }
  const originalSrc = scriptTagMatch[1];
  const originalScriptPath = resolve(clientDir, "dist", originalSrc);
  const iifeSrc = originalSrc.replace(/\.js$/, ".iife.js");
  const iifeScriptPath = resolve(clientDir, "dist", iifeSrc);

  await bundleWithEsbuild({
    entryPoints: [originalScriptPath],
    bundle: true,
    format: "iife",
    outfile: iifeScriptPath,
    minify: true,
    sourcemap: false,
    target: "es2018"
  });

  await rm(originalScriptPath);
  await rm(`${originalScriptPath}.map`, { force: true });

  const replacementTag = `<script defer src="${iifeSrc}"></script>`;
  indexHtml = indexHtml.replace(scriptTagMatch[0], replacementTag);
  await writeFile(indexPath, indexHtml, "utf8");
};

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
  await convertEntryToIife();
  await rm(offlineDir, { recursive: true, force: true });
  await mkdir(offlineDir, { recursive: true });
  await cp(resolve(clientDir, "dist"), offlineDir, { recursive: true });
};

await buildOffline();

console.log("Offline client build exported to", offlineDir);
