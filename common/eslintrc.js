module.exports = {
  "extends": "airbnb-base",
  "plugins": [
    "import"
  ],
  "rules": {
    "function-paren-newline": "off",
    "import/no-extraneous-dependencies": ["error", {
      "devDependencies": ["**/*.test.js", "**/test/**"],
    }],
    "no-continue": "off",
    "no-mixed-operators": [
      "error",
      {
        "groups": [
          ["==", "!=", "===", "!==", ">", ">=", "<", "<="],
          ["in", "instanceof"]
        ],
      },
    ],
    "no-restricted-syntax": "off",
    "no-underscore-dangle": "off",
    "no-unused-vars": ["error", {
      argsIgnorePattern: "^_",
    }],
    "object-curly-newline": ["error", { "multiline": true }],
    "yoda": ["error", "never", { "onlyEquality": true }],
  }
};

