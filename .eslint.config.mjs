import vue from 'eslint-plugin-vue';
import tsEslint from '@typescript-eslint/eslint-plugin';
import prettier from 'eslint-plugin-prettier';
import globals from 'globals';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import js from '@eslint/js';
import { FlatCompat } from '@eslint/eslintrc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
});

export default [
  {
    ignores: [
      '*',
      '!src',
      '**/assets',
      'src/libs/**/*.js',
      'src/libs/**/*.d.ts',
      'src-deno/**/*.js',
      'src-deno/**/*.d.ts',
      'doc/**/*.*',
      'app/**/*.*',
    ],
  },
  ...compat.extends(
    'plugin:vue/base',
    'plugin:vue/essential',
    'plugin:vue/vue3-recommended',
    '@vue/typescript/recommended',
    'prettier',
    'eslint-config-prettier',
  ),
  {
    plugins: {
      vue,
      '@typescript-eslint': tsEslint,
      prettier,
    },

    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },

      ecmaVersion: 2020,
      sourceType: 'module',

      parserOptions: {
        parser: '@typescript-eslint/parser',
        project: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },

    rules: {
      'max-len': [
        'error',
        {
          code: 120,
          ignoreComments: true,
          ignoreUrls: true,
          ignoreStrings: true,
          ignoreTemplateLiterals: true,
          ignoreRegExpLiterals: true,
        },
      ],

      'no-console': 'off',
      'no-debugger': 'off',
      'no-undef': 'off',
      'import/prefer-default-export': 'off',
      'default-case': 'off',
      'lines-between-class-members': 'off',
      'no-param-reassign': 'off',
      'no-return-assign': 'off',
      'arrow-parens': ['error', 'as-needed'],
      'object-curly-newline': [
        'error',
        {
          consistent: true,
        },
      ],

      '@typescript-eslint/triple-slash-reference': 'off',
      '@typescript-eslint/no-inferrable-types': [
        'error',
        {
          ignoreProperties: false,
          ignoreParameters: false,
        },
      ],
      '@typescript-eslint/naming-convention': [
        'error',
        {
          selector: 'interface',
          format: ['PascalCase'],
        },
      ],
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/no-unused-expressions': ['error', {  'allowShortCircuit': true, 'allowTernary': true }],

      'vue/no-v-model-argument': 'off',
      'vue/multi-word-component-names': 'off',
      'vue/no-duplicate-attributes': [
        'error',
        {
          allowCoexistClass: true,
          allowCoexistStyle: true,
        },
      ],
    },
  },
  {
    files: ['**/__tests__/*.{j,t}s?(x)', '**/tests/unit/**/*.spec.{j,t}s?(x)'],

    languageOptions: {
      globals: {
        ...globals.jest,
      },
    },
  },
];
