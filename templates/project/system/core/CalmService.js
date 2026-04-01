'use strict';
const { isValidObjectId } = require('mongoose');
const autoBind = require('auto-bind');
const { CalmError } = require('./CalmError');

/**
 * Base service providing CRUD operations on a Mongoose model.
 * Override `populateFields` in subclasses to auto-populate relations on every query.
 * Override `filterableFields` to whitelist allowed query filter keys (empty = allow all).
 * Override `ownerField` to enable ownership checks on update/delete.
 */
class CalmService {
  /** @type {import('mongoose').PopulateOptions[]} Applied to getAll() and get() by default. */
  populateFields = [];

  /** @type {string[]} Allowed filter keys for getAll(). Empty array = allow all (no whitelist). */
  filterableFields = [];

  /** @type {string|null} Field name that stores the owner's user ID (e.g. 'createdBy', 'uploadedBy'). Set to enable ownership checks. */
  ownerField = null;

  /** @type {string[]} Fields to search across when `?search=` is used. Empty = disabled. */
  searchableFields = [];

  /**
   * Calm Service
   * @param {import('mongoose').Model} model - Current Model Instance
   */
  constructor(model) {
    this.model = model;
    this.parseObj = data => structuredClone(data);
    autoBind(this);
  }

  /**
   * @param {{ skip?: string|number, limit?: string|number }} param0
   * @returns {{ skip: number, limit: number }}
   */
  parsePagination({ skip, limit }) {
    return {
      skip: Math.min(10000, Math.max(0, parseInt(skip, 10) || 0)),
      limit: Math.min(100, Math.max(1, parseInt(limit, 10) || 10)) // hard cap at 100
    };
  }

  /**
   * @param {Record<string, 1|-1>} rawSortBy
   * @returns {Record<string, 1|-1>}
   */
  parseSort(rawSortBy) {
    const defaultSort = { createdAt: -1 };
    if (!rawSortBy || typeof rawSortBy !== 'object') return defaultSort;

    const cleaned = Object.fromEntries(
      Object.entries(rawSortBy)
        .filter(([k, v]) => {
          if (Number(v) !== 1 && Number(v) !== -1) { return false; }
          // When filterableFields is set, restrict sort keys to those fields + timestamps
          if (this.filterableFields.length > 0) {
            return this.filterableFields.includes(k) || k === 'createdAt' || k === 'updatedAt';
          }
          return true;
        })
        .map(([k, v]) => [k, Number(v)])
    );

    return Object.keys(cleaned).length ? cleaned : defaultSort;
  }

  /**
   * Returns per-call populate options when provided, falling back to class-level defaults.
   * @param {{ populateFields?: import('mongoose').PopulateOptions[] }} ops
   * @returns {import('mongoose').PopulateOptions[]}
   */
  parsePopulate(ops) {
    return Array.isArray(ops.populateFields) ? ops.populateFields : this.populateFields;
  }

  /**
   * Sanitize filter object: only allow keys in `filterableFields` (if set).
   * Rejects any key starting with `$` to prevent MongoDB operator injection.
   * @param {Object} rawFilter
   * @returns {Object}
   */
  sanitizeFilter(rawFilter) {
    const cleaned = {};
    for (const [key, value] of Object.entries(rawFilter)) {
      if (/^\$/.test(key)) continue;
      if (this.filterableFields.length > 0 && !this.filterableFields.includes(key)) continue;
      cleaned[key] = value;
    }
    return cleaned;
  }

  /**
   * Build a `$or` regex query across `searchableFields`.
   * @param {string} rawSearch
   * @returns {Object}
   */
  parseSearch(rawSearch) {
    if (!rawSearch || typeof rawSearch !== 'string') {
      return {};
    }
    if (this.searchableFields.length === 0) {
      return {};
    }
    // Cap length to prevent regex denial-of-service
    const trimmed = rawSearch.slice(0, 100);
    const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return {
      $or: this.searchableFields.map(field => ({
        [field]: { $regex: escaped, $options: 'i' }
      }))
    };
  }

  /**
   * Extract `from` / `to` from the filter and convert to a `createdAt` range query.
   * @param {Object} rawFilter
   * @returns {Object}
   */
  parseDateRange(rawFilter) {
    const { from, to, ...rest } = rawFilter;
    if (!from && !to) {
      return rest;
    }
    const range = {};
    if (from) {
      range.$gte = new Date(from);
    }
    if (to) {
      range.$lte = new Date(to);
    }
    return Object.keys(range).length ? { ...rest, createdAt: range } : rest;
  }

  /**
   * Validate a MongoDB ObjectId and throw 400 if invalid.
   * @param {string} id
   */
  validateId(id) {
    if (!isValidObjectId(id)) {
      throw new CalmError('BAD_REQUEST', 'Invalid resource ID');
    }
  }

  /**
   * Verify that the resource belongs to the given user.
   * Only runs when `ownerField` is set on the service.
   * @param {string} id - Resource ID
   * @param {string} userId - Authenticated user ID
   * @returns {Promise<void>}
   */
  async checkOwnership(id, userId) {
    if (!this.ownerField) return;
    this.validateId(id);
    const item = await this.model.findById(id).select(this.ownerField).lean();
    if (!item) {
      throw new CalmError('NOT_FOUND_ERROR');
    }
    if (String(item[this.ownerField]) !== String(userId)) {
      throw new CalmError('PERMISSION_DENIED_ERROR', 'You do not own this resource');
    }
  }

  /**
   * Get All Items
   * @param { Object } query - Query Parameters (supports filters, sortBy, skip, limit)
   * @param { Object } [ops] - Options
   * @param { Array } [ops.populateFields] - Populate Fields
   * @returns {Promise<{ data: Object[], total: number }>}
   */
  async getAll(query, ops = {}) {
    try {
      const {
        sortBy: rawSortBy,
        skip: rawSkip,
        limit: rawLimit,
        search: rawSearch,
        ...rawFilter
      } = query;
      const dateFiltered = this.parseDateRange(rawFilter);
      const searchFilter = this.parseSearch(rawSearch);
      const filter = { ...this.sanitizeFilter(dateFiltered), ...searchFilter };
      const { skip, limit } = this.parsePagination({ skip: rawSkip, limit: rawLimit });
      const sortBy = this.parseSort(rawSortBy);
      const populate = this.parsePopulate(ops);

      const [items, total] = await Promise.all([
        this.model.find(filter).sort(sortBy).skip(skip).limit(limit).populate(populate).lean(),
        this.model.countDocuments(filter)
      ]);

      return { data: this.parseObj(items), total, skip, limit };
    } catch (errors) {
      throw errors;
    }
  }

  /**
   * Get Single Item
   * @param { string } id - Instance ID
   * @param { Object } [ops] - Options
   * @param { Array } [ops.populateFields] - Populate Fields [{path: 'fieldName', select: 'prop1 prop2 ...', populate: 'childFieldName'}]
   * @returns {Promise<{ data: Object }>}
   */
  async get(id, ops = {}) {
    try {
      this.validateId(id);
      const populate = this.parsePopulate(ops);
      const item = await this.model.findById(id).populate(populate);

      if (!item) {
        throw new CalmError('NOT_FOUND_ERROR');
      }

      return { data: item.toJSON() };
    } catch (errors) {
      throw errors;
    }
  }

  /**
   * Create Item
   * @param { Object } data - Instance Object (validated InsertDTO)
   * @returns {Promise<{ data: Object }>}
   */
  async insert(data) {
    try {
      const item = await this.model.create(data);

      if (item) {
        return { data: item.toJSON() };
      }

      throw new CalmError(null, 'Failed to create resource');
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update Item
   * @param { string } id - Instance ID
   * @param { Object } data - Updated Object (validated UpdateDTO)
   * @returns {Promise<{ data: Object }>}
   */
  async update(id, data, userId = null) {
    try {
      this.validateId(id);
      await this.checkOwnership(id, userId);

      const item = await this.model.findByIdAndUpdate(
        id,
        { ...data },
        { new: true, runValidators: true, context: 'query' }
      );

      if (!item) {
        throw new CalmError('NOT_FOUND_ERROR');
      }

      return { data: this.parseObj(item) };
    } catch (errors) {
      throw errors;
    }
  }

  /**
   * Delete Item
   * @param { string } id - Item ID
   * @returns {Promise<{ data: Object, deleted: true }>}
   */
  async delete(id, userId = null) {
    try {
      this.validateId(id);
      await this.checkOwnership(id, userId);

      const item = await this.model.findByIdAndDelete(id);

      if (!item) {
        throw new CalmError('NOT_FOUND_ERROR');
      }

      return { data: this.parseObj(item), deleted: true };
    } catch (errors) {
      throw errors;
    }
  }
}

module.exports = {
  CalmService
};
