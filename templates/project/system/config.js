/* eslint-disable no-console */
'use strict';
const path = require('path');
const { ok } = require('./utils/cli');

const DEFAULTS = {
  EXCLUDED_ITEMS_FROM_RESPONSE: ['password', '__v'],
  PORT: 5001,
  MONGODB_URI: process.env.MONGODB_URI
};

const loadConfig = () => {
  try {
    const { config: userConfig } = require(path.resolve(__dirname, '../src/config.js'));
    if (typeof userConfig === 'object' && Object.keys(userConfig).length) {
      console.log(ok('Custom config loaded'));
      return { ...DEFAULTS, ...userConfig };
    }
  } catch {
    /* no custom config */
  }
  return { ...DEFAULTS };
};

module.exports = { config: loadConfig() };
