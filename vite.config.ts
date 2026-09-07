import { defineConfig, type UserConfig } from "vite-plus";

let config: UserConfig = defineConfig({
  test: {
    environment: "jsdom",
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
  fmt: {
    trailingComma: "none",
    ignorePatterns: ["example/**", "dist/**", "coverage/**"],
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
    ignorePatterns: ["example", "dist", "coverage"],
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
    overrides: [
      {
        files: ["*.config.ts"],
        rules: {
          "import/no-default-export": "off"
        }
      }
    ],
    rules: {
      "react/react-in-jsx-scope": "off",
      "prefer-const": "off",
      "func-style": ["error", "declaration"],
      "prefer-arrow-callback": "error",
      "typescript/explicit-function-return-type": "off",
      "import/no-default-export": "error",
      "import/prefer-default-export": "off",
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
