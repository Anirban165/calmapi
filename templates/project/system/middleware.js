'use strict';
const crypto = require('crypto');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const pinoHttp = require('pino-http');
const humanizeString = require('humanize-string');
const logger = require('./utils/logger');
const { CalmError } = require('./core');
const { fmtHttpLine } = require('./utils/cli');

// Security

const securityHeaders = helmet({
  crossOriginEmbedderPolicy: true,
  crossOriginResourcePolicy: { policy: 'same-site' },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
});

const noCache = (req, res, next) => {
  res.set({
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    Pragma: 'no-cache',
    Expires: '0',
    'Surrogate-Control': 'no-store'
  });
  next();
};

// CORS

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

const corsOptions = cors({
  origin: (origin, callback) => {
    if (!origin || ALLOWED_ORIGINS.length === 0 || ALLOWED_ORIGINS.includes(origin)) {
      return callback(null, true);
    }
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID']
});

// Compression

const compress = compression({
  filter: (req, res) => (req.headers['x-no-compression'] ? false : compression.filter(req, res)),
  threshold: 1024,
  level: 6
});

// Rate limiters

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { status: false, message: 'Too many requests, please try again later.' }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { status: false, message: 'Too many login attempts, please try again later.' }
});

const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: { status: false, message: 'Too many password reset attempts, please try again later.' }
});

// Request logger

const httpLogger = pinoHttp({
  logger,
  // reuse X-Request-ID from upstream (gateway/nginx) if present, otherwise generate one
  genReqId: req => req.headers['x-request-id'] || crypto.randomUUID(),
  customLogLevel: (req, res, err) => {
    if (err || res.statusCode >= 500) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },
  customProps: (req, res, err, responseTime) => {
    req._responseTime = responseTime;
    return {};
  },
  customSuccessMessage: (req, res, responseTime) =>
    fmtHttpLine(req.method, req.url, res.statusCode, responseTime, req._calmError, req._calmStack),
  customErrorMessage: (req, res, err) =>
    fmtHttpLine(
      req.method,
      req.url,
      res.statusCode,
      req._responseTime,
      req._calmError || err.message,
      req._calmStack
    ),
  serializers: {
    req: req => ({ id: req.id, method: req.method, url: req.url }),
    res: res => ({ statusCode: res.statusCode }),
    err: () => undefined
  }
});

// Input sanitizer

const DANGEROUS_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

const sanitizeObj = (obj, depth = 0) => {
  if (depth > 10 || !(obj instanceof Object)) {
    return obj;
  }
  for (const key of Object.keys(obj)) {
    if (/^\$/.test(key) || DANGEROUS_KEYS.has(key)) {
      delete obj[key];
    } else {
      sanitizeObj(obj[key], depth + 1);
    }
  }
  return obj;
};

const sanitize = (req, res, next) => {
  sanitizeObj(req.params);
  sanitizeObj(req.query);
  sanitizeObj(req.body);
  next();
};

// Error normalizer

const toMongooseErrors = errorsObj => {
  const errors = {};
  for (const [key, val] of Object.entries(errorsObj)) {
    if (val.kind === 'required') {
      errors[key] = `${humanizeString(val.path)} is required`;
    } else if (val.kind === 'unique') {
      errors[key] = `${humanizeString(val.path)} already exists`;
    } else if (val.name === 'CastError') {
      errors[key] = `${humanizeString(val.path)} is of invalid type`;
    } else {
      errors[key] = val.message;
    }
  }
  return errors;
};

const normalizeToCalmError = err => {
  if (err instanceof CalmError) {
    return err;
  }

  if (err.name === 'ValidationError' && err.errors) {
    const errors = toMongooseErrors(err.errors);
    const message = humanizeString(err.message.split(':')[0].trim());
    return new CalmError('VALIDATION_ERROR', message, null, errors);
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || 'field';
    const message = `${humanizeString(field)} already exists`;
    return new CalmError('VALIDATION_ERROR', message, null, { [field]: message });
  }

  return new CalmError(err.message);
};

module.exports = {
  securityHeaders,
  noCache,
  corsOptions,
  compress,
  globalLimiter,
  authLimiter,
  passwordResetLimiter,
  httpLogger,
  sanitize,
  normalizeToCalmError
};
