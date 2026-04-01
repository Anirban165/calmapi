'use strict';

const autoBind = require('auto-bind');
const { CalmService } = require('../../../system/core/CalmService');
const { CalmError } = require('../../../system/core/CalmError');

const MIN_PASSWORD_LENGTH = 8;

class UserService extends CalmService {

  constructor(model) {
    super(model);
    this.model = model;
    autoBind(this);
  }

  validatePassword(password) {
    if (!password || typeof password !== 'string') {
      throw new CalmError('VALIDATION_ERROR', 'Password is required');
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      throw new CalmError(
        'VALIDATION_ERROR',
        `Password must be at least ${MIN_PASSWORD_LENGTH} characters`
      );
    }
  }

  async updatePassword(id, password) {
    this.validatePassword(password);
    const user = await this.model.findById(id);
    if (!user) {
      throw new CalmError('NOT_FOUND_ERROR');
    }
    user.password = password;
    await user.save();
    return { passwordChanged: true };
  }

  // Only allow safe profile fields — never password
  async updateProfile(id, data) {
    const user = await this.model.findById(id);
    if (!user) {
      throw new CalmError('NOT_FOUND_ERROR');
    }

    if (data.name !== undefined) {
      user.name = data.name;
    }

    await user.save();
    return { updated: true };
  }

  async findByEmail(email, includePassword = false) {
    const query = this.model.findByEmail(email);
    const data = includePassword ? await query.select('+password') : await query;
    return { data };
  }
}

module.exports = { UserService };
