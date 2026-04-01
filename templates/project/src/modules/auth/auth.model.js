'use strict';

const mongoose = require('mongoose');
const { Schema } = mongoose;
const jwt = require('jsonwebtoken');
const { config } = require('../../config');
const { JWTSignDTO } = require('./auth.dto');

const jwtKey = config.JWT_SECRET;
const jwtExpiry = config.JWT_EXPIRY;
const refreshKey = config.REFRESH_TOKEN_SECRET;
const refreshExpiry = config.REFRESH_TOKEN_EXPIRY;

class Auth {

  initSchema() {
    const schema = new Schema({
      token: {
        type: String,
        required: true,
        index: true
      },
      refreshToken: {
        type: String,
        required: true,
        index: true
      },
      user: {
        type: Schema.Types.ObjectId,
        required: true,
        ref: 'user',
        index: true
      },
      expiresAt: {
        type: Date,
        default: () => new Date(Date.now() + refreshExpiry * 1000),
        index: { expires: 0 },
      }
    }, { timestamps: true });

    schema.statics.generateToken = function(user) {
      return jwt.sign({ ...new JWTSignDTO(user) }, jwtKey, {
        algorithm: 'HS256',
        expiresIn: jwtExpiry,
      });
    };

    schema.statics.generateRefreshToken = function(user) {
      return jwt.sign({ ...new JWTSignDTO(user) }, refreshKey, {
        algorithm: 'HS256',
        expiresIn: refreshExpiry,
      });
    };

    schema.statics.decodeToken = function(token) {
      return jwt.verify(token, jwtKey);
    };

    schema.statics.decodeRefreshToken = function(token) {
      return jwt.verify(token, refreshKey);
    };

    try {
      mongoose.model('auth', schema);
    } catch { /* Model already registered */ }
  }

  getInstance() {
    this.initSchema();
    return mongoose.model('auth');
  }
}

module.exports = { Auth };
