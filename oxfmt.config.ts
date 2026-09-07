import { defineConfig } from 'oxfmt';

export default defineConfig({
  singleQuote: true,
  jsxSingleQuote: true,
  semi: true,
  trailingComma: 'all',
  endOfLine: 'lf',
  ignorePatterns: ['example/**', 'dist/**'],
  sortImports: {
    newlinesBetween: false,
    customGroups: [
      {
        groupName: 'react',
        elementNamePattern: ['react', 'react/**', 'react-*', 'react-*/**'],
      },
    ],
    groups: [
      'react',
      ['builtin', 'external'],
      ['internal', 'parent', 'sibling', 'index'],
      'unknown',
    ],
  },
});
