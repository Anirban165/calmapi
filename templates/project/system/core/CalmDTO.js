'use strict';

// Fields always stripped from outbound responses regardless of model shape.
const SENSITIVE_FIELDS = new Set(['password', '__v', 'otp', 'otpExpiry']);

class GetDTO {
  constructor({ ...props }) {
    Object.keys(props).forEach(key => {
      if (!SENSITIVE_FIELDS.has(key)) {
        this[key] = props[key];
      }
    });
    Object.freeze(this);
  }
}

class InsertDTO {
  constructor({ ...props }) {
    Object.keys(props).forEach(key => {
      this[key] = props[key];
    });
    Object.freeze(this);
  }
}

class UpdateDTO {
  constructor({ ...props }) {
    Object.keys(props).forEach(key => {
      this[key] = props[key];
    });
    // Remove undefined fields so partial updates don't overwrite existing data.
    Object.keys(this).forEach(key => {
      if (this[key] === undefined) delete this[key];
    });
    Object.freeze(this);
  }
}

module.exports = { GetDTO, InsertDTO, UpdateDTO };
