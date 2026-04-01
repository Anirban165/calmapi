'use strict';

const { CalmService } = require('../../../system/core/CalmService');

class MODULE_SINGULAR_PASCALService extends CalmService {

  populateFields = [
    { path: 'createdBy', select: 'name email' },
    { path: 'updatedBy', select: 'name email' }
  ];

  // searchableFields = ['title', 'content']; // Uncomment to enable ?search= queries

  constructor(model) {
    super(model);
  }
}

module.exports = { MODULE_SINGULAR_PASCALService };
