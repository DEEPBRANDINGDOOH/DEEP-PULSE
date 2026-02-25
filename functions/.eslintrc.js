module.exports = {
  root: true,
  env: {
    es2021: true,
    node: true,
  },
  extends: [
    "eslint:recommended",
    "google",
  ],
  parserOptions: {
    ecmaVersion: 2021,
  },
  rules: {
    "quotes": ["error", "double", {allowTemplateLiterals: true}],
    "max-len": ["warn", {code: 120}],
    "indent": ["error", 2],
    "object-curly-spacing": ["error", "always"],
    "require-jsdoc": "off",
    "valid-jsdoc": "off",
    "no-unused-vars": ["warn", {argsIgnorePattern: "^_"}],
    "comma-dangle": ["error", "always-multiline"],
  },
};
