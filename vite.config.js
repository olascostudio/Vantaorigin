import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    // Absolute path: a relative one can resolve against a parent folder that
    // happens to contain its own src/setupTests.js.
    setupFiles: fileURLToPath(new URL("./src/setupTests.js", import.meta.url)),
    // The backend has its own runner (`npm test` inside api/).
    exclude: ["node_modules/**", "dist/**", "api/**"],
  },
});
