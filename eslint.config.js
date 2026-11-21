import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import reactHooks from 'eslint-plugin-react-hooks';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const PURE =
  'The renderer and the model stay pure: no clocks and no randomness. The scene at time `t` depends only on the scene data and `t`. See the rules in CLAUDE.md.';
const CLOCKS = [
  'performance',
  'setTimeout',
  'setInterval',
  'requestAnimationFrame',
];

export default tseslint.config(
  // assets/work/ is git-ignored scratch for the image scripts.
  { ignores: ['**/dist/', '**/coverage/', 'assets/work/'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
    plugins: { 'simple-import-sort': simpleImportSort },
    rules: {
      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',
    },
  },
  {
    files: ['**/*.tsx', 'apps/**/*.ts', 'packages/stage/**/*.ts'],
    ...reactHooks.configs.flat.recommended,
  },
  {
    // The tests may use clocks, since they don't draw the scenes for users.
    files: ['packages/renderer/**/*.ts', 'packages/model/**/*.ts'],
    ignores: ['**/*.test.ts'],
    rules: {
      'no-restricted-globals': [
        'error',
        ...CLOCKS.map((name) => ({ name, message: PURE })),
      ],
      'no-restricted-properties': [
        'error',
        { object: 'Math', property: 'random', message: PURE },
        ...['globalThis', 'window', 'self'].flatMap((object) =>
          [...CLOCKS, 'Date'].map((property) => ({
            object,
            property,
            message: PURE,
          })),
        ),
      ],
      'no-restricted-syntax': [
        'error',
        { selector: "NewExpression[callee.name='Date']", message: PURE },
        { selector: "CallExpression[callee.name='Date']", message: PURE },
        {
          selector: "MemberExpression[object.name='Date'][property.name='now']",
          message: PURE,
        },
      ],
    },
  },
  prettier,
);
