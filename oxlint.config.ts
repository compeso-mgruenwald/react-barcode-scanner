import { defineConfig, type OxlintConfig } from "oxlint";

let config: OxlintConfig = defineConfig<OxlintConfig>({
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
      version: "19.1.0"
    }
  },
  options: {
    typeAware: true,
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
});

export default config;
