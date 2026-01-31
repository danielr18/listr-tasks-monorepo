import { configs } from '@cenk1cenk2/eslint-config'

/** @type {import("eslint").Linter.Config[]} */
export default [
  ...configs['typescript-dynamic'],
  ...configs['import-strict'],
  {
    rules: {
      'array-bracket-spacing': 'off'
    }
  },
  {
    files: ['**/tests/**/*.ts', '**/tests/**/*.js'],
    languageOptions: {
      parserOptions: {
        project: null
      }
    },
    rules: {
      '@typescript-eslint/no-floating-promises': 'off',
      '@typescript-eslint/return-await': 'off',
      '@typescript-eslint/await-thenable': 'off',
      '@typescript-eslint/dot-notation': 'off',
      '@typescript-eslint/prefer-reduce-type-parameter': 'off',
      '@typescript-eslint/consistent-type-imports': 'off',
      '@typescript-eslint/consistent-type-exports': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      'import/no-extraneous-dependencies': 'off'
    }
  }
]
