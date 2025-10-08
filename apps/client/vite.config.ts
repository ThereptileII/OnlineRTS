import { defineConfig } from "vite";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  root: "./",
  resolve: {
    alias: {
      "@seelines/shared": fileURLToPath(new URL("../../packages/shared/src", import.meta.url))
    }
  },
  server: {
    port: 5173,
    strictPort: true
  },
  build: {
    sourcemap: true
  },
  test: {
    environment: "jsdom"
  }
});
