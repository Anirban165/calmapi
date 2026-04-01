'use strict';

const mongoose = require('mongoose');
const { Schema } = mongoose;
const uniqueValidator = require('mongoose-unique-validator');
const { slugify } = require('../../utils');

class Post {

  initSchema() {
    const schema = new Schema({
      title: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200
      },
      slug: {
        type: String,
        index: true
      },
      subtitle: {
        type: String,
        trim: true,
        maxlength: 300
      },
      description: {
        type: String,
        trim: true,
        maxlength: 1000
      },
      content: {
        type: String,
        required: true
      },
      createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'user',
        index: true
      },
      updatedBy: {
        type: Schema.Types.ObjectId,
        ref: 'user'
      }
    }, { timestamps: true });

    schema.index({ createdAt: -1 });

    // Auto-generate slug from title on save
    schema.pre('save', function (next) {
      if (!this.isModified('title')) {
        return next();
      }
      this.slug = slugify(this.title);
      return next();
    });

    schema.plugin(uniqueValidator);

    try {
      mongoose.model('post', schema);
    } catch { /* already registered */ }
  }

  getInstance() {
    this.initSchema();
    return mongoose.model('post');
  }
}

module.exports = { Post };
