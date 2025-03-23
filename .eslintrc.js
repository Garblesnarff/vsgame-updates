module.exports = {
    root: true,
    env: {
      browser: true,
      es2021: true,
      node: true,
      jest: true
    },
    extends: [
      'eslint:recommended',
      'plugin:@typescript-eslint/recommended',
      'plugin:prettier/recommended'
    ],
    parser: '@typescript-eslint/parser',
    parserOptions: {
      ecmaVersion: 2021,
      sourceType: 'module',
      project: './tsconfig.json'
    },
    plugins: ['@typescript-eslint', 'prettier'],
    rules: {
      'prettier/prettier': 'error',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['error', { 
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_'
      }],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'prefer-const': 'error',
      'no-var': 'error',
      'eqeqeq': ['error', 'always'],
      'curly': 'error'
    },
    ignorePatterns: [
      'node_modules/',
      'dist/',
      'coverage/',
      '*.config.js',
      '*.setup.js'
    ],
    overrides: [
      {
        files: ['*.js'],
        rules: {
          '@typescript-eslint/no-var-requires': 'off',
          '@typescript-eslint/explicit-module-boundary-types': 'off'
        }
      },
      {
        files: ['**/__tests__/**/*.[jt]s?(x)', '**/?(*.)+(spec|test).[jt]s?(x)'],
        rules: {
          '@typescript-eslint/no-explicit-any': 'off'
        }
      }
    ]
  };