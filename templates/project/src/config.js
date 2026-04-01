'use strict';

const isProd = process.env.NODE_ENV === 'production';

if (isProd && (!process.env.JWT_SECRET || !process.env.REFRESH_TOKEN_SECRET)) {
  throw new Error('JWT_SECRET and REFRESH_TOKEN_SECRET must be set in production');
}

module.exports.config = {
  JWT_SECRET: process.env.JWT_SECRET || 'S0M3S3CR3TK3Y',
  JWT_EXPIRY: 900,
  REFRESH_TOKEN_SECRET: process.env.REFRESH_TOKEN_SECRET || 'R3FR3SHS3CR3TK3Y',
  REFRESH_TOKEN_EXPIRY: 604800,
  PORT: process.env.PORT || 5001
};
