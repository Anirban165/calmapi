'use strict';

const { CalmService } = require('../../../system/core/CalmService');

class MediaService extends CalmService {

  populateFields = [
    { path: 'uploadedBy', select: 'name email' }
  ];

  /** Only allow filtering by these fields in getAll() */
  filterableFields = ['mimetype', 'uploadedBy', 'originalname'];

  /** Enforce ownership: only the uploader can delete */
  ownerField = 'uploadedBy';

  constructor(model) {
    super(model);
  }
}

module.exports = { MediaService };
