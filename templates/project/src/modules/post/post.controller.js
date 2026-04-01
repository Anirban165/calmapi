'use strict';

const autoBind = require('auto-bind');
const { CalmController } = require('../../../system/core/CalmController');
const { PostService } = require('./post.service');
const { Post } = require('./post.model');
const postDTO = require('./post.dto');

const postService = new PostService(new Post().getInstance());

class PostController extends CalmController {

  constructor(service) {
    super(service);
    this.dto = { ...this.dto, ...postDTO };
    autoBind(this);
  }

  async getAll(req, res, next) {
    try {
      const response = await this.service.getAll(req.query, {
        populateFields: [
          { path: 'createdBy', select: 'name email' },
          { path: 'updatedBy', select: 'name email' }
        ]
      });

      res.sendCalmResponse(
        response.data.map(x => new this.dto.GetDTO(x)),
        {
          totalCount: response.total,
          page: Math.floor(response.skip / response.limit) + 1,
          limit: response.limit,
          hasNext: response.skip + response.limit < response.total,
          hasPrev: response.skip > 0
        }
      );
    } catch (e) {
      next(e);
    }
  }
}

module.exports = new PostController(postService);
