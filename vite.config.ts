import { defineConfig } from "vite-plus";

export default defineConfig({
  defaultPackage: {
    dev: "./apps/example",
    build: "./apps/example",
    preview: "./apps/example",
    pack: "./packages/react-barcode-scanner"
  },
  fmt: {
    trailingComma: "none",
    ignorePatterns: ["dist/**", "coverage/**", ".cursor/**"],
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
    },
    sortTailwindcss: true
  },
  lint: {
    plugins: ["eslint", "typescript", "unicorn", "oxc", "react", "react-perf", "import"],
    categories: {
      correctness: "deny",
      suspicious: "deny",
      perf: "warn"
    },
    env: {
      browser: true
    },
    ignorePatterns: ["dist", "coverage"],
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
      },
      {
        files: ["apps/example/**"],
        rules: {
          "no-console": "allow",
          "import/no-unassigned-import": ["deny", { allow: ["**/*.css"] }],
          "react/no-unstable-nested-components": ["deny", { allowAsProps: true }]
        }
      },
      {
        files: ["packages/react-barcode-scanner/**"],
        rules: {
          "import/no-unassigned-import": ["deny", { allow: ["**/*.css"] }]
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
      "no-console": ["deny", { allow: ["warn", "error", "info"] }],
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
        { checksVoidReturn: { arguments: false, attributes: false, properties: false } }
      ],
      "typescript/no-floating-promises": "deny",
      "typescript/prefer-nullish-coalescing": [
        "deny",
        { ignorePrimitives: { boolean: true, string: true } }
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
