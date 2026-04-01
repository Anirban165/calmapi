'use strict';
const autoBind = require('auto-bind');
const defaultDTO = require('./CalmDTO');

class CalmController {

  constructor(service) {
    this.service = service;
    this.dto = defaultDTO;
    autoBind(this);
  }

  async getAll(req, res, next) {
    try {
      const response = await this.service.getAll(req.query);
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

  async get(req, res, next) {
    try {
      const response = await this.service.get(req.params.id);
      res.sendCalmResponse(new this.dto.GetDTO(response.data));
    } catch (e) {
      next(e);
    }
  }

  async insert(req, res, next) {
    try {
      if (req.user) {
        req.body.createdBy = req.user._id;
      }
      const response = await this.service.insert(new this.dto.InsertDTO(req.body));
      res.sendCalmResponse(new this.dto.GetDTO(response.data));
    } catch (e) {
      next(e);
    }
  }

  async update(req, res, next) {
    try {
      if (req.user) {
        req.body.updatedBy = req.user._id;
      }
      const response = await this.service.update(req.params.id, new this.dto.UpdateDTO(req.body), req.user?._id);
      res.sendCalmResponse(new this.dto.GetDTO(response.data));
    } catch (e) {
      next(e);
    }
  }

  async delete(req, res, next) {
    try {
      const response = await this.service.delete(req.params.id, req.user?._id);
      res.sendCalmResponse(new this.dto.GetDTO(response.data), { deleted: response.deleted });
    } catch (e) {
      next(e);
    }
  }
}

module.exports = { CalmController };
