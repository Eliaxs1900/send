const js = require('@eslint/js');
const globals = require('globals');
const mocha = require('eslint-plugin-mocha');

module.exports = [
  {
    ignores: ['dist/**', 'node_modules/**', 'public/locales/**', 'coverage/**']
  },
  js.configs.recommended,
  {
    // server, build scripts and config: CommonJS on node
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'commonjs',
      globals: {
        ...globals.node
      }
    },
    rules: {
      'no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_|err|event|next|reject',
          // this codebase swallows errors in plenty of catch blocks
          caughtErrors: 'none'
        }
      ],
      'require-atomic-updates': 'warn'
    }
  },
  {
    // client: ES modules in the browser
    files: ['app/**/*.js', 'common/**/*.js'],
    languageOptions: {
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.serviceworker,
        process: 'readonly'
      }
    }
  },
  {
    files: ['test/**/*.js'],
    plugins: { mocha },
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.mocha
      }
    }
  }
];
