'use strict';

class CalmCache {
  /**
   * @param {number} [maxSize=1024]  - Maximum number of entries before LRU eviction.
   */
  constructor(maxSize = 1024) {
    this._store = new Map();
    this._timers = new Map();
    this._maxSize = maxSize;
  }

  /**
   * Returns the cached value, or `undefined` if missing or expired.
   * @param {string} key
   * @returns {any}
   */
  get(key) {
    const entry = this._store.get(key);
    if (!entry) {
      return undefined;
    }
    if (entry.expiresAt && entry.expiresAt < Date.now()) {
      this.delete(key);
      return undefined;
    }
    return entry.value;
  }

  /**
   * Stores a value. Pass `ttlMs > 0` for automatic expiry.
   * @param {string} key
   * @param {any} value
   * @param {number} [ttlMs=0]  - Time-to-live in milliseconds. 0 = no expiry.
   * @returns {this}
   */
  set(key, value, ttlMs = 0) {
    if (this._timers.has(key)) {
      clearTimeout(this._timers.get(key));
      this._timers.delete(key);
    }

    const entry = {
      value,
      expiresAt: ttlMs > 0 ? Date.now() + ttlMs : null
    };
    this._store.set(key, entry);

    // Evict oldest entry when cache exceeds max size
    if (this._store.size > this._maxSize) {
      const oldest = this._store.keys().next().value;
      this.delete(oldest);
    }

    if (ttlMs > 0) {
      const timer = setTimeout(() => {
        this._store.delete(key);
        this._timers.delete(key);
      }, ttlMs);
      timer.unref(); // prevent timer from keeping the Node.js process alive
      this._timers.set(key, timer);
    }

    return this;
  }

  /**
   * @param {string} key
   * @returns {boolean}
   */
  has(key) {
    return this.get(key) !== undefined;
  }

  /**
   * Removes an entry and clears its expiry timer.
   * @param {string} key
   * @returns {boolean}
   */
  delete(key) {
    if (this._timers.has(key)) {
      clearTimeout(this._timers.get(key));
      this._timers.delete(key);
    }
    return this._store.delete(key);
  }

  /** Removes all entries and clears all expiry timers. */
  clear() {
    this._timers.forEach(timer => clearTimeout(timer));
    this._timers.clear();
    this._store.clear();
  }

  /** @returns {number} Current number of entries in the cache. */
  get size() {
    return this._store.size;
  }
}

module.exports = { CalmCache };
