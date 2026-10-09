import path from "node:path";
import { defineConfig } from "vitest/config";

const root = import.meta.dirname;

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(root, "src"),
      "server-only": path.resolve(root, "src/lib/music/__tests__/server-only-stub.ts"),
    },
  },
  test: {
    environment: "node",
    testTimeout: 30_000,
    hookTimeout: 30_000,
    env: { MUSIC_LOG: "off" },
    projects: [
      {
        extends: true,
        test: {
          name: "node",
          environment: "node",
          include: ["src/**/*.test.{ts,tsx}"],
          exclude: [
            "**/palettes.test.ts",
            "**/sessionPersistence.test.ts",
            "**/MusicView.test.tsx",
            "**/FirstRun.test.tsx",
            "**/SessionPrompts.test.tsx",
          ],
        },
      },
      {
        extends: true,
        test: {
          name: "dom",
          environment: "jsdom",
          include: [
            "src/**/palettes.test.ts",
            "src/**/sessionPersistence.test.ts",
            "src/**/MusicView.test.tsx",
            "src/**/FirstRun.test.tsx",
            "src/**/SessionPrompts.test.tsx",
          ],
        },
      },
    ],
  },
});
