import { defineConfig, type UserConfig } from "vite-plus";

let config: UserConfig = defineConfig({
  fmt: {
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
  },
  lint: {
    plugins: ["eslint", "typescript", "unicorn", "oxc", "react", "import"],
    categories: {
      correctness: "error",
      suspicious: "error",
      perf: "warn"
    },
    env: {
      browser: true
    },
    ignorePatterns: ["example", "dist"],
    settings: {
      react: {
        version: "19.2.8"
      }
    },
    options: {
      typeAware: true,
      typeCheck: true,
      reportUnusedDisableDirectives: "deny",
      respectEslintDisableDirectives: false
    },
    rules: {
      "react/react-in-jsx-scope": "off",
      "no-console": ["error", { allow: ["warn", "error", "info"] }],
      "no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          destructuredArrayIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          ignoreRestSiblings: true
        }
      ],
      "unicorn/no-array-for-each": "error",
      "typescript/no-misused-promises": [
        "error",
        { checksVoidReturn: { arguments: false, attributes: false } }
      ],
      "typescript/prefer-nullish-coalescing": [
        "error",
        { ignorePrimitives: { boolean: true, string: true } }
      ],
      "typescript/no-floating-promises": [
        "error",
        {
          allowForKnownSafeCalls: [
            {
              from: "file",
              name: ["trace", "debug", "info", "warn", "error", "critical"]
            }
          ],
          allowForKnownSafePromises: [],
          checkThenables: false,
          ignoreIIFE: false,
          ignoreVoid: true
        }
      ],
      "typescript/restrict-template-expressions": [
        "error",
        {
          allowAny: false,
          allowArray: false,
          allowBoolean: true,
          allowNever: false,
          allowNullish: true,
          allowNumber: true,
          allowRegExp: false
        }
      ]
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
