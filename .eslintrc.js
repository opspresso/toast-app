module.exports = {
  env: {
    browser: true,
    node: true,
    es2021: true,
    jest: true,
  },
  extends: [
    'eslint:recommended',
    'prettier',
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  rules: {
    // Error prevention
    'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
    'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'off',
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    'no-constant-condition': ['error', { checkLoops: false }],

    // Code style
    'indent': ['error', 2, { SwitchCase: 1 }],
    'linebreak-style': ['error', 'unix'],
    'quotes': ['error', 'single', { avoidEscape: true }],
    'semi': ['error', 'always'],
    'comma-dangle': ['error', 'always-multiline'],

    // Best practices
    'eqeqeq': ['error', 'always'],
    'curly': ['error', 'all'],
    'brace-style': ['error', '1tbs'],
    'prefer-const': 'error',
    'no-var': 'error',
    'object-shorthand': 'error',
    'arrow-body-style': ['error', 'as-needed'],

    // Electron-specific
    'node/no-unpublished-require': 'off',
    'node/no-unpublished-import': 'off',
  },
  overrides: [
    {
      files: ['src/renderer/**/*.js'],
      env: {
        browser: true,
        node: false,
      },
      globals: {
        window: true,
        document: true,
      },
    },
    {
      files: ['src/main/**/*.js', 'src/index.js'],
      env: {
        browser: false,
        node: true,
      },
      globals: {
        process: true,
      },
    },
    {
      files: ['src/preload/**/*.js'],
      env: {
        browser: true,
        node: true,
      },
      globals: {
        window: true,
        document: true,
        process: true,
      },
    },
    {
      files: ['tests/**/*.js'],
      env: {
        jest: true,
      },
      rules: {
        'no-console': 'off',
      },
    },
  ],
};
