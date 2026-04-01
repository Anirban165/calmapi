'use strict';
const { config } = require('../config');

// Recursively removes keys from response data (e.g. config.EXCLUDED_ITEMS_FROM_RESPONSE).
// eslint-disable-next-line func-style
function stripKeys(data, keys) {
  if (Array.isArray(data)) {
    return data.map(item => stripKeys(item, keys));
  }
  if (data !== null && typeof data === 'object' && !(data instanceof Date)) {
    return Object.fromEntries(
      Object.entries(data)
        .filter(([key]) => !keys.includes(key))
        .map(([key, val]) => [key, stripKeys(val, keys)])
    );
  }
  return data;
}

module.exports = {
  /**
   * Express response helper — call as `res.sendCalmResponse(data, options)`.
   * @param {object | object[] | null} data
   * @param {{ message?: string, deleted?: boolean, updated?: boolean, totalCount?: number }} [options]
   */
  CalmResponse(data, options = {}) {
    const filtered = stripKeys(data, config.EXCLUDED_ITEMS_FROM_RESPONSE);

    const response = {
      error: false,
      status: true,
      statusCode: 200,
      responseTimestamp: new Date()
    };

    if (options.message != null) response.message = options.message;
    if (options.deleted != null) response.deleted = options.deleted;
    if (options.updated != null) response.updated = options.updated;
    if (options.totalCount != null) {
      response.totalCount = options.totalCount;
    }
    if (options.page != null) {
      response.page = options.page;
    }
    if (options.limit != null) {
      response.limit = options.limit;
    }
    if (options.hasNext != null) {
      response.hasNext = options.hasNext;
    }
    if (options.hasPrev != null) {
      response.hasPrev = options.hasPrev;
    }

    if (Array.isArray(filtered)) {
      response.data = filtered;
    } else if (filtered && typeof filtered === 'object') {
      response.data = { ...filtered };
    } else {
      response.data = data;
    }

    this.status(200).json(response);
  }
};
