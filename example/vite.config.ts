import react from "@vitejs/plugin-react";
import { defineConfig } from "vite-plus";
import type { UserConfig } from "vite-plus";

let config: UserConfig = defineConfig({
  plugins: [react()],
  server: {
    open: true
  },
  fmt: {
    trailingComma: "none",
    ignorePatterns: ["dist/**"],
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
      correctness: "deny",
      suspicious: "deny",
      perf: "warn"
    },
    env: {
      browser: true
    },
    ignorePatterns: ["dist"],
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
          "import/no-default-export": "allow"
        }
      }
    ],
    rules: {
      "react/react-in-jsx-scope": "allow",
      "prefer-const": "allow",
      "func-style": ["deny", "declaration"],
      "prefer-arrow-callback": "deny",
      "typescript/explicit-function-return-type": "allow",
      "import/no-default-export": "deny",
      "import/prefer-default-export": "allow",
      "import/no-unassigned-import": ["deny", { allow: ["**/*.css"] }],
      "react/no-unstable-nested-components": ["deny", { allowAsProps: true }],
      "no-console": "allow",
      "no-unused-vars": [
        "deny",
        {
          argsIgnorePattern: "^_",
          destructuredArrayIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          ignoreRestSiblings: true
        }
      ],
      "unicorn/no-array-for-each": "deny",
      "typescript/no-misused-promises": [
        "deny",
        { checksVoidReturn: { arguments: false, attributes: false } }
      ],
      "typescript/prefer-nullish-coalescing": [
        "deny",
        { ignorePrimitives: { boolean: true, string: true } }
      ],
      "typescript/no-floating-promises": [
        "deny",
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
        "deny",
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
  }
});

export default config;
