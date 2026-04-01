/* eslint-disable no-console */
'use strict';
const mongoose = require('mongoose');
const { ok, fail, dim } = require('./utils/cli');

const MAX_RETRIES = 5;
const RETRY_BASE_MS = 1000;

const DB_OPTIONS = {
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  connectTimeoutMS: 10000
};

class Connection {
  static isConnected = false;

  static {
    mongoose.connection.once('connected', () => {
      Connection.isConnected = true;
      mongoose.connection.on('disconnected', () => {
        Connection.isConnected = false;
        console.log(dim('Database disconnected'));
      });
      mongoose.connection.on('error', err => console.error(fail(`Database error: ${err.message}`)));
    });
  }

  static async connect(url) {
    if (this.isConnected) return;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        await mongoose.connect(url, DB_OPTIONS);
        console.log(`${ok('Database connected')}\n`);
        return;
      } catch (err) {
        console.error(fail(`Connection attempt ${attempt}/${MAX_RETRIES}: ${err.message}`));
        if (attempt < MAX_RETRIES)
          await new Promise(r => setTimeout(r, 2 ** attempt * RETRY_BASE_MS));
      }
    }

    throw new Error(`Failed to connect to database after ${MAX_RETRIES} attempts`);
  }

  static async disconnect() {
    if (!this.isConnected) return;
    await mongoose.disconnect();
    this.isConnected = false;
  }
}

module.exports = { Connection };
