module.exports = {
    env: {
        node: true,
        es2022: true,
        jest: true
    },
    extends: [
        'eslint:recommended'
    ],
    parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module'
    },
    rules: {
        // Error prevention
        'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
        'no-undef': 'error',
        'no-console': 'off', // Allow console.log in Node.js

        // Best practices
        'eqeqeq': ['error', 'always'],
        'no-eval': 'error',
        'no-implied-eval': 'error',
        'no-return-await': 'warn',
        'require-await': 'warn',

        // Style (relaxed for existing code)
        'semi': ['warn', 'always'],
        'quotes': ['warn', 'single', { avoidEscape: true }],
        'indent': ['warn', 2, { SwitchCase: 1 }],
        'comma-dangle': ['warn', 'only-multiline'],
        'no-trailing-spaces': 'warn',
        'no-multiple-empty-lines': ['warn', { max: 2 }],

        // Security
        'no-new-func': 'error'
    },
    ignorePatterns: [
        'node_modules/',
        'coverage/',
        'tests/',
        'prisma/'
    ]
};
