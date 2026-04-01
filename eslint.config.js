module.exports = [
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'build/**',
      'coverage/**',
      'templates/**',
      '*.log',
      'test/**'
    ]
  },
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'commonjs',
      globals: {
        require: 'readonly',
        module: 'readonly',
        exports: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        process: 'readonly',
        console: 'readonly',
        Buffer: 'readonly',
        setTimeout: 'readonly',
        setInterval: 'readonly',
        clearTimeout: 'readonly',
        clearInterval: 'readonly',
        setImmediate: 'readonly',
        clearImmediate: 'readonly'
      }
    },
    rules: {
      // Core quality
      'no-console': 'warn',
      'no-unused-vars': [
        'error',
        {
          vars: 'all',
          args: 'after-used',
          argsIgnorePattern: '^_',
          ignoreRestSiblings: true
        }
      ],
      'no-trailing-spaces': 'error',
      'no-multiple-empty-lines': ['error', { max: 1, maxEOF: 0 }],
      'no-multi-spaces': 'error',

      // Syntax & style
      semi: 'error',
      quotes: ['error', 'single', { avoidEscape: true }],
      indent: ['error', 2, { SwitchCase: 1 }],
      curly: 'error',
      'eol-last': 'error',
      'no-var': 'error',
      'prefer-const': 'error',

      // Error prevention
      'no-invalid-regexp': 'error',
      'no-irregular-whitespace': 'error',
      'no-unreachable': 'error',
      'use-isnan': 'error',
      'valid-typeof': 'error',
      'no-fallthrough': 'error',
      'block-scoped-var': 'error',

      // Best practices
      'default-case': 'error',
      'no-else-return': 'error',
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-extend-native': 'error',
      'no-extra-bind': 'error',
      'no-floating-decimal': 'error',
      'no-iterator': 'error',
      'no-labels': 'error',
      'no-lone-blocks': 'error',
      'no-loop-func': 'error',
      'no-multi-str': 'error',
      'no-new-func': 'error',
      'no-new-wrappers': 'error',
      'no-new': 'error',
      'no-octal-escape': 'error',
      'no-octal': 'error',
      'no-param-reassign': ['error', { props: false }],
      'no-proto': 'error',
      'no-redeclare': 'error',
      'no-return-assign': 'error',
      'no-self-compare': 'error',
      'no-throw-literal': 'error',
      'no-unused-expressions': ['error', { allowShortCircuit: true }],
      'no-useless-call': 'error',
      'no-useless-concat': 'error',
      'no-void': 'error',
      'no-warning-comments': 'warn',
      'no-with': 'error',
      radix: ['error', 'as-needed'],
      'wrap-iife': ['error', 'inside'],
      yoda: 'error',

      // Variables
      'no-delete-var': 'error',
      'no-shadow-restricted-names': 'error',
      'no-shadow': 'error',
      'no-undef-init': 'error',
      'no-use-before-define': ['error', { functions: false, classes: false }],

      // Node.js
      'handle-callback-err': 'warn',
      'no-new-require': 'error',

      // Formatting
      'block-spacing': ['error', 'always'],
      'brace-style': ['error', '1tbs', { allowSingleLine: false }],
      camelcase: ['error', { properties: 'always' }],
      'comma-spacing': ['error', { before: false, after: true }],
      'comma-style': ['error', 'last'],
      'key-spacing': ['error', { beforeColon: false, afterColon: true }],
      'new-parens': 'error',
      'no-array-constructor': 'error',
      'no-bitwise': 'error',
      'no-lonely-if': 'error',
      'no-mixed-spaces-and-tabs': 'error',
      'no-nested-ternary': 'error',
      'no-new-object': 'error',
      'no-unneeded-ternary': 'error',
      'object-curly-spacing': ['error', 'always'],
      'space-before-blocks': ['error', 'always'],
      'space-infix-ops': 'error',
      'space-unary-ops': ['error', { words: true, nonwords: false }],
      'spaced-comment': ['error', 'always'],

      // ES6+
      'arrow-spacing': 'error',
      'constructor-super': 'error',
      'generator-star-spacing': ['error', { before: true, after: false }],
      'no-class-assign': 'error',
      'no-const-assign': 'error',
      'no-dupe-class-members': 'error',
      'no-this-before-super': 'error',
      'prefer-arrow-callback': 'warn',
      'prefer-spread': 'warn',
      'prefer-template': 'warn',
      'require-yield': 'error'
    }
  }
];
