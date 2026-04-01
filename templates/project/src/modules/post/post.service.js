'use strict';

const { CalmService } = require('../../../system/core/CalmService');

class PostService extends CalmService {
  populateFields = [
    { path: 'createdBy', select: 'name email' },
    { path: 'updatedBy', select: 'name email' }
  ];

  /** Only allow filtering by these fields in getAll() */
  filterableFields = ['title', 'slug', 'createdBy'];

  /** Enable ?search= across these text fields */
  searchableFields = ['title', 'subtitle', 'description'];

  /** Enforce ownership: only the creator can update/delete */
  ownerField = 'createdBy';

  constructor(model) {
    super(model);
  }
}

module.exports = { PostService };
