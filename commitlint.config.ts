import type { UserConfig } from "@commitlint/types";

let config: UserConfig = {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "body-max-line-length": [2, "always", 150]
  }
};

export default config;
