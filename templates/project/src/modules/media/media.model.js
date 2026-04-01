'use strict';

const mongoose = require('mongoose');
const { Schema } = mongoose;

class Media {

  initSchema() {
    const schema = new Schema({
      originalname: {
        type: String,
        required: true
      },
      encoding: {
        type: String
      },
      mimetype: {
        type: String,
        required: true
      },
      filename: {
        type: String
      },
      path: {
        type: String,
        required: true,
        unique: true
      },
      size: {
        type: Number
      },
      uploadedBy: {
        type: Schema.Types.ObjectId,
        ref: 'user'
      }
    }, { timestamps: true });

    schema.index({ uploadedBy: 1, createdAt: -1 });

    try {
      mongoose.model('media', schema);
    } catch { /* already registered */ }
  }

  getInstance() {
    this.initSchema();
    return mongoose.model('media');
  }
}

module.exports = { Media };
