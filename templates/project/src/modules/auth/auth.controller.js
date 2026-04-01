'use strict';

const autoBind = require('auto-bind');
const { User } = require('../user/user.model');
const userDTO = require('../user/user.dto');
const logger = require('../../../system/utils/logger');
const { CalmError } = require('../../../system/core/CalmError');
const authDTO = require('./auth.dto');
const { Auth } = require('./auth.model');
const { AuthService } = require('./auth.service');

const authService = new AuthService(new Auth().getInstance(), new User().getInstance());

class AuthController {

  constructor(service) {
    this.service = service;
    this.dto = authDTO;
    this.userDTO = userDTO;
    autoBind(this);
  }

  async login(req, res, next) {
    try {
      const loginData = new this.dto.LoginRequestDTO(req.body);
      const response = await this.service.login(loginData.email, loginData.password);
      res.sendCalmResponse(new this.dto.LoginResponseDTO(response.data));
    } catch (e) {
      next(e);
    }
  }

  async register(req, res, next) {
    try {
      const registerData = new this.dto.RegisterRequestDTO({ ...req.body });
      const response = await this.service.register(registerData);
      res.sendCalmResponse(new this.dto.RegisterResponseDTO(response.data));
    } catch (e) {
      next(e);
    }
  }

  async requestPasswordReset(req, res, next) {
    try {
      const { email } = req.body;
      const { otp } = await this.service.requestPasswordReset(email);
      if (process.env.NODE_ENV !== 'production') {
        logger.debug({ otp }, 'Password reset OTP generated');
      }
      res.sendCalmResponse(null);
    } catch (e) {
      next(e);
    }
  }

  async resetPassword(req, res, next) {
    try {
      const { email, otp, password } = req.body;
      if (!email || !otp || !password) {
        throw new CalmError('VALIDATION_ERROR', 'Email, OTP and password are required');
      }
      await this.service.resetPassword(email, otp, password);
      res.sendCalmResponse(null, { updated: true });
    } catch (e) {
      next(e);
    }
  }

  async changePassword(req, res, next) {
    try {
      const { currentPassword, password } = req.body;
      if (!currentPassword || !password) {
        throw new CalmError('VALIDATION_ERROR', 'Current password and new password are required');
      }
      await this.service.changePassword(req.user._id, currentPassword, password);
      res.sendCalmResponse(null, { updated: true });
    } catch (e) {
      next(e);
    }
  }

  async getProfile(req, res, next) {
    try {
      const response = await this.service.getProfile(req.user._id);
      res.sendCalmResponse(new this.userDTO.GetDTO(response.data));
    } catch (e) {
      next(e);
    }
  }

  async updateProfile(req, res, next) {
    try {
      await this.service.updateProfile(req.user._id, new this.userDTO.UpdateDTO(req.body));
      res.sendCalmResponse(null, { updated: true });
    } catch (e) {
      next(e);
    }
  }

  async logout(req, res, next) {
    try {
      await this.service.logout(req.token);
      res.sendCalmResponse(null, { deleted: true });
    } catch (e) {
      next(e);
    }
  }

  async refreshToken(req, res, next) {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) {
        throw new CalmError('VALIDATION_ERROR', 'Refresh token is required');
      }
      const response = await this.service.refreshToken(refreshToken);
      res.sendCalmResponse(new this.dto.LoginResponseDTO(response.data));
    } catch (e) {
      next(e);
    }
  }

  async checkLogin(req, res, next) {
    try {
      const token = this.extractToken(req);
      req.user = await this.service.checkLogin(token);
      req.authorized = true;
      req.token = token;
      next();
    } catch (e) {
      next(e);
    }
  }

  async optionalCheckLogin(req, res, next) {
    try {
      const token = this.extractToken(req);
      req.user = await this.service.checkLogin(token);
      req.authorized = true;
      req.token = token;
      next();
    } catch {
      next();
    }
  }

  // Pull the Bearer token from the Authorization header
  extractToken(req) {
    const header = req.headers.authorization;
    if (header && header.startsWith('Bearer ')) {
      return header.slice(7);
    }
    return null;
  }
}

module.exports = new AuthController(authService);
