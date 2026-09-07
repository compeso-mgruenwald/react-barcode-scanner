import { defineConfig, type OxfmtConfig } from "oxfmt";

let config: OxfmtConfig = defineConfig<OxfmtConfig>({
  trailingComma: "none",
  ignorePatterns: ["example/**", "dist/**"],
  sortImports: {
    newlinesBetween: false,
    customGroups: [
      {
        groupName: "react",
        elementNamePattern: ["react", "react/**", "react-*", "react-*/**"]
      }
    ],
    groups: [
      "react",
      ["builtin", "external"],
      ["internal", "parent", "sibling", "index"],
      "unknown"
    ]
  }
});

export default config;
