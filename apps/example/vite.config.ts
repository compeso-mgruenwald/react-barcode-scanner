import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite-plus";
import type { UserConfig } from "vite-plus";

let config: UserConfig = defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    open: true
  },
  resolve: {
    alias: {
      "@thewirv/react-barcode-scanner": fileURLToPath(
        new URL("../../packages/react-barcode-scanner/src/index.tsx", import.meta.url)
      )
    }
  }
});

export default config;
