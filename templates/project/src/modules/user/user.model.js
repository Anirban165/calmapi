'use strict';

const mongoose = require('mongoose');
const { Schema } = mongoose;
const uniqueValidator = require('mongoose-unique-validator');
const bcrypt = require('bcrypt');

const SALT_WORK_FACTOR = 12;

class User {

  initSchema() {
    const schema = new Schema({
      name: {
        type: String,
        required: true,
        trim: true,
        minlength: 2,
        maxlength: 100
      },
      email: {
        type: String,
        unique: true,
        required: true,
        lowercase: true,
        trim: true,
        index: true,
        match: [/^\S+@\S+\.\S+$/, 'Invalid email format']
      },
      password: {
        type: String,
        required: true,
        select: false
      },
      status: {
        type: Boolean,
        required: true,
        default: true
      },
      otp: {
        type: String,
        select: false
      },
      otpExpiry: {
        type: Date,
        select: false
      }
    }, { timestamps: true });

    // Hash password before saving
    schema.pre('save', async function () {
      if (this.isModified('password') || this.isNew) {
        const salt = await bcrypt.genSalt(SALT_WORK_FACTOR);
        this.password = await bcrypt.hash(this.password, salt);
      }
    });

    schema.methods.comparePassword = async function (candidatePassword) {
      return bcrypt.compare(candidatePassword, this.password);
    };

    schema.statics.findByEmail = function (email) {
      return this.findOne({ email });
    };

    schema.plugin(uniqueValidator);

    try {
      mongoose.model('user', schema);
    } catch { /* already registered */ }
  }

  getInstance() {
    this.initSchema();
    return mongoose.model('user');
  }
}

module.exports = { User };
