'use strict';
const express = require('express');
const packageJson = require('../package.json');
const { apiRoutes } = require('./routes/api');
const { CalmError } = require('./core');
const healthRoutes = require('./routes/health');
const { securityHeaders, noCache, corsOptions, compress, sanitize } = require('./middleware');
const { globalLimiter, authLimiter, passwordResetLimiter, httpLogger, normalizeToCalmError } = require('./middleware');

const AUTH_ROUTES = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/refresh-token',
  '/api/auth/request-password-reset',
  '/api/auth/password-reset'
];

const PASSWORD_RESET_ROUTES = [
  '/api/auth/request-password-reset',
  '/api/auth/password-reset'
];

const server = express();

// Security
server.use(securityHeaders);
server.use(noCache);
server.use(corsOptions);

// Performance
server.use(compress);

// Rate limiting
server.use(globalLimiter);
AUTH_ROUTES.forEach(route => server.use(route, authLimiter));
PASSWORD_RESET_ROUTES.forEach(route => server.use(route, passwordResetLimiter));

// Logging & body parsing
server.use(httpLogger);
server.use((req, res, next) => {
  res.setHeader('X-Request-ID', req.id);
  next();
});
server.use(express.json({ limit: '1mb' }));
server.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Routes
server.get('/', (req, res) => {
  res.json({ status: true, message: `Welcome to the ${packageJson.name}` });
});

server.use(healthRoutes);
server.use(sanitize);
server.use('/api', apiRoutes);

server.use('/*', (req, res, next) => {
  next(new CalmError('NOT_FOUND_ERROR'));
});

server.use((err, req, res, next) => {
  const calmErr = normalizeToCalmError(err);
  req._calmError = calmErr.message;
  if (process.env.NODE_ENV !== 'production') {
    req._calmStack = calmErr.stack;
  }
  res.status(calmErr.statusCode).json(calmErr.toJSON());
});

module.exports = { server };
