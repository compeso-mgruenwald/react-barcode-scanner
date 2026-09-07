import { defineConfig, type UserConfig } from "tsdown";

let config: UserConfig = defineConfig({
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
});

export default config;
