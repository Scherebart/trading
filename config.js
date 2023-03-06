const path = require("path");
const { readFileSync } = require("node:fs");
const R = require("ramda");

const NODE_ENV = process.env.NODE_ENV ?? "dev";

const defaultConfig = JSON.parse(
  readFileSync(path.join(__dirname, 'config', "default.json"))
);
const envSpecificConfig = JSON.parse(
  readFileSync(path.join(__dirname, 'config',NODE_ENV + ".json"))
);

module.exports = R.mergeDeepRight(defaultConfig, envSpecificConfig);
