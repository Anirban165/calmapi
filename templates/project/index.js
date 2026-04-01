/* eslint-disable no-console */
'use strict';
require('dotenv').config();

const http = require('http');
const { Connection } = require('./system/database');
const { fail, readyBox, printBanner } = require('./system/utils/cli');
const packageInfo = require('./package.json');

printBanner(packageInfo);

const { config } = require('./system/config');
const { server: app } = require('./system/server');
const { tableWidth } = require('./system/routes/api');

const server = http.createServer(app);

const SHUTDOWN_TIMEOUT = 10000;

const shutdown = (exitCode = 0) => {
  const forceExit = setTimeout(() => process.exit(exitCode), SHUTDOWN_TIMEOUT);
  forceExit.unref();

  server.close(async () => {
    await Connection.disconnect();
    clearTimeout(forceExit);
    process.exit(exitCode);
  });
};

process.on('SIGTERM', () => shutdown(0));
process.on('SIGINT', () => shutdown(0));

process.on('uncaughtException', err => {
  console.error(fail(`Uncaught exception: ${err.message}`));
  shutdown(1);
});

process.on('unhandledRejection', reason => {
  const msg = reason instanceof Error ? reason.message : String(reason);
  console.error(fail(`Unhandled rejection: ${msg}`));
  shutdown(1);
});

(async () => {
  try {
    await Connection.connect(config.MONGODB_URI);
  } catch (err) {
    console.error(`\n${fail(`Database: ${err.message}`)}\n`);
    process.exit(1);
  }

  server
    .listen(config.PORT)
    .on('error', err => {
      console.error(`\n${fail(err.message)}\n`);
      process.exit(1);
    })
    .on('listening', () => {
      console.log(`${readyBox(`http://127.0.0.1:${config.PORT}`, tableWidth)}\n`);
    });
})();
