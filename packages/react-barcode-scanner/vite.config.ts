import { defineConfig } from "vite-plus";
import type { UserConfig } from "vite-plus";

let config: UserConfig = defineConfig({
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/**/*.test.{ts,tsx}", "src/types/**"],
      thresholds: {
        statements: 100,
        branches: 100,
        functions: 100,
        lines: 100
      }
    }
  },
  pack: {
    entry: "src/index.ts",
    format: "esm",
    platform: "browser",
    dts: true,
    clean: true,
    exports: true,
    unused: {
      ignore: {
        peerDependencies: ["react-dom"]
      }
    },
    publint: true,
    attw: { profile: "esm-only", level: "error" }
  }
});

export default config;
