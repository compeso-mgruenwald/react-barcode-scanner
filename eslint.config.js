import js from '@eslint/js';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import unusedImports from 'eslint-plugin-unused-imports';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const varsIgnorePattern = '^_';

export default tseslint.config(
  { ignores: ['dist'] },
  {
    files: ['**/*.{js,jsx,cjs,mjs,ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.strictTypeChecked,
      tseslint.configs.stylisticTypeChecked,
    ],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
      ecmaVersion: 2020,
      globals: globals.browser,
    },
  },
  {
    files: ['**/*.{js,cjs,mjs}'],
    extends: [tseslint.configs.disableTypeChecked],
  },
  {
    files: ['**/*.{ts,tsx}'],
    settings: { react: { version: '19.1.0' } },
    extends: [react.configs.flat.recommended, react.configs.flat['jsx-runtime']],
    linterOptions: { reportUnusedDisableDirectives: 'error' },
    plugins: {
      'react-hooks': reactHooks,
      'unused-imports': unusedImports,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'func-style': [
        'error',
        'declaration',
        { allowArrowFunctions: true, allowTypeAnnotation: true },
      ],
      'prefer-arrow-callback': 'error',
      'array-callback-return': ['error', { checkForEach: true }],
      'no-restricted-syntax': [
        'error',
        {
          selector: "CallExpression[callee.property.name='forEach']",
          message:
            'Prefer `for-of` loop over `forEach` if you only use the callback\'s first parameter.\nIf you need the index, use `for-of` loop in conjunction with `Array.prototype.entries()`.\nIf you need more than just the first parameter or the index, or you called `forEach` on something that cannot be used with `for-of`, use an "eslint-disable" comment to disable this rule.',
        },
      ],
      'no-console': ['error', { allow: ['warn', 'error', 'info'] }],
      'no-var': 'error',
      'unused-imports/no-unused-imports': 'error',
      'unused-imports/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: varsIgnorePattern,
          destructuredArrayIgnorePattern: varsIgnorePattern,
          varsIgnorePattern,
          ignoreRestSiblings: true,
        },
      ],
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/prefer-for-of': 'error',
      '@typescript-eslint/method-signature-style': ['error', 'property'],
      '@typescript-eslint/no-misused-promises': [
        'error',
        { checksVoidReturn: { arguments: false, attributes: false } },
      ],
      '@typescript-eslint/no-unsafe-enum-comparison': 'off',
      '@typescript-eslint/no-unnecessary-condition': 'warn',
      '@typescript-eslint/no-confusing-void-expression': [
        'error',
        { ignoreArrowShorthand: true, ignoreVoidReturningFunctions: true },
      ],
      '@typescript-eslint/prefer-literal-enum-member': ['error', { allowBitwiseExpressions: true }],
      '@typescript-eslint/prefer-nullish-coalescing': [
        'error',
        { ignorePrimitives: { boolean: true, string: true } },
      ],
      '@typescript-eslint/no-floating-promises': [
        'error',
        {
          allowForKnownSafeCalls: [
            {
              from: 'file',
              name: ['trace', 'debug', 'info', 'warn', 'error', 'critical'],
            },
          ],
          allowForKnownSafePromises: [],
          checkThenables: false,
          ignoreIIFE: false,
          ignoreVoid: true,
        },
      ],
      '@typescript-eslint/restrict-template-expressions': [
        'error',
        {
          allowAny: false,
          allowArray: false,
          allowBoolean: true,
          allowNever: false,
          allowNullish: true,
          allowNumber: true,
          allowRegExp: false,
        },
      ],
    },
  },
);
