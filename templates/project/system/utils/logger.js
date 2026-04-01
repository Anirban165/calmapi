'use strict';
const pino = require('pino');

const isDev = process.env.NODE_ENV !== 'production';

// pino-pretty as a direct stream so messageFormat can be a function
const prettyStream = require('pino-pretty')({
  colorize: true,
  translateTime: 'SYS:dd mmm HH:MM:ss',
  ignore: 'pid,hostname,req,res,responseTime,err,level,service,version',
  messageFormat: (log, messageKey) => {
    const COLORS = {
      trace: '\x1b[2m',
      debug: '\x1b[35m',
      info: '\x1b[32m',
      warn: '\x1b[33m',
      error: '\x1b[31m',
      fatal: '\x1b[31m\x1b[1m'
    };
    const col = COLORS[log.level] || '';
    const lbl = (typeof log.level === 'string' ? log.level.toUpperCase() : 'INFO').padEnd(5);
    return `${col}${lbl}\x1b[0m  ${log[messageKey]}`;
  },
  singleLine: true
});

const logger = pino(
  {
    level: process.env.LOG_LEVEL || (isDev ? 'debug' : 'info'),
    formatters: { level: label => ({ level: label }) },
    base: isDev ? undefined : { service: 'calmapi', version: process.env.npm_package_version },
    timestamp: pino.stdTimeFunctions.isoTime
  },
  prettyStream
);

module.exports = logger;
