'use strict';

const crypto = require('crypto');
const autoBind = require('auto-bind');
const { UserService } = require('../user/user.service');
const { CalmError } = require('../../../system/core/CalmError');
const { CalmCache } = require('../../../system/core/CalmCache');
const { config } = require('../../config');

const TOKEN_CACHE_TTL = (config.JWT_EXPIRY || 900) * 1000;

class AuthService {
  constructor(model, userModel) {
    this.model = model;
    this.userService = new UserService(userModel);
    this.userModel = userModel;
    this.cache = new CalmCache();
    autoBind(this);
  }

  async login(email, password) {
    const { data: user } = await this.userService.findByEmail(email, true);

    if (!user || !user.status) {
      throw new CalmError('VALIDATION_ERROR', 'Invalid credentials');
    }

    const passwordMatched = await user.comparePassword(password);
    if (!passwordMatched) {
      throw new CalmError('VALIDATION_ERROR', 'Invalid credentials');
    }

    const tokenData = await this.postLogin(user);
    return { data: tokenData.toJSON() };
  }

  // Create tokens and cache the user session after successful login
  async postLogin(user) {
    const userData = user.toJSON();
    delete userData.password;

    const token = this.model.generateToken(userData);
    const refreshToken = this.model.generateRefreshToken(userData);

    await this.model.create({
      token,
      refreshToken,
      user: user._id
    });

    const authRecord = await this.model.findOne({ token }).populate('user');
    this.cache.set(`auth:${token}`, userData, TOKEN_CACHE_TTL);

    return authRecord;
  }

  async refreshToken(refreshToken) {
    const authRecord = await this.model.findOne({ refreshToken });
    if (!authRecord) {
      throw new CalmError('UNAUTHORIZED_ERROR', 'Invalid refresh token');
    }

    let decoded;
    try {
      decoded = await this.model.decodeRefreshToken(refreshToken);
    } catch {
      throw new CalmError('UNAUTHORIZED_ERROR', 'Invalid refresh token');
    }

    // Fetch full Mongoose document (not lean) — postLogin needs .toJSON()
    const user = await this.userModel.findById(decoded._id);
    if (!user || !user.status) {
      throw new CalmError('UNAUTHORIZED_ERROR', 'Account is inactive');
    }

    // Invalidate old token from cache and DB (rotation)
    this.cache.delete(`auth:${authRecord.token}`);
    await this.model.deleteOne({ _id: authRecord._id });

    const newAuth = await this.postLogin(user);
    return { data: newAuth.toJSON() };
  }

  async register(data) {
    const userData = await this.userService.insert(data);
    return { data: userData.data };
  }

  async changePassword(id, currentPassword, newPassword) {
    // Verify current password before allowing change
    const user = await this.userModel.findById(id).select('+password');
    if (!user) {
      throw new CalmError('NOT_FOUND_ERROR');
    }
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      throw new CalmError('VALIDATION_ERROR', 'Current password is incorrect');
    }
    // Invalidate all existing sessions for this user
    await this.model.deleteMany({ user: id });

    return this.userService.updatePassword(id, newPassword);
  }

  async getProfile(id) {
    const userData = await this.userService.get(id);
    return { data: userData.data };
  }

  async updateProfile(id, data) {
    return this.userService.updateProfile(id, data);
  }

  async updateUser(id, data) {
    delete data.password;
    return this.userService.update(id, data);
  }

  async logout(token) {
    this.cache.delete(`auth:${token}`);
    return this.model.deleteOne({ token });
  }

  async checkLogin(token) {
    if (!token) {
      throw new CalmError('UNAUTHORIZED_ERROR');
    }

    // Check cache first — avoid DB hit on every request
    const cached = this.cache.get(`auth:${token}`);
    if (cached) {
      return cached;
    }

    // Cache miss — verify against DB and JWT
    const tokenExists = await this.model.countDocuments({ token });
    if (!tokenExists) {
      throw new CalmError('UNAUTHORIZED_ERROR');
    }

    let decoded;
    try {
      decoded = await this.model.decodeToken(token);
    } catch {
      throw new CalmError('UNAUTHORIZED_ERROR');
    }

    const { data: user } = await this.userService.get(decoded._id);
    if (!user || !user.status) {
      throw new CalmError('UNAUTHORIZED_ERROR');
    }

    this.cache.set(`auth:${token}`, user, TOKEN_CACHE_TTL);
    return user;
  }

  // Generate a 6-digit OTP and store it on the user record
  async requestPasswordReset(email) {
    const user = await this.userModel.findByEmail(email).select('+otp +otpExpiry');
    if (!user) {
      // Silent return — don't reveal whether email exists
      return { otp: null };
    }

    const otp = String(crypto.randomInt(100000, 1000000));
    const expiry = new Date();
    expiry.setMinutes(expiry.getMinutes() + 10);

    user.otp = otp;
    user.otpExpiry = expiry;
    await user.save();
    return { otp };
  }

  // Verify OTP and set the new password
  async resetPassword(email, otp, password) {
    const user = await this.userModel.findByEmail(email).select('+otp +otpExpiry');

    if (!user || !user.otp || user.otpExpiry < new Date()) {
      throw new CalmError('VALIDATION_ERROR', 'Invalid or expired OTP');
    }

    // Timing-safe comparison to prevent timing attacks on OTP
    const otpA = Buffer.from(String(user.otp).padEnd(6, '0'));
    const otpB = Buffer.from(String(otp).padEnd(6, '0'));
    if (otpA.length !== otpB.length || !crypto.timingSafeEqual(otpA, otpB)) {
      throw new CalmError('VALIDATION_ERROR', 'Invalid or expired OTP');
    }

    user.otp = '';
    user.otpExpiry = null;
    await user.save();
    // Skip current password check for reset flow
    return this.userService.updatePassword(user._id, password);
  }
}

module.exports = { AuthService };
