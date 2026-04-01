'use strict';

const autoBind = require('auto-bind');
const multer = require('multer');
const path = require('path');
const { CalmController } = require('../../../system/core/CalmController');
const { S3Upload } = require('../../plugins');
const { CalmError } = require('../../../system/core/CalmError');
const { Media } = require('./media.model');
const { MediaService } = require('./media.service');
const mediaDTO = require('./media.dto');

const mediaService = new MediaService(new Media().getInstance());

const ALLOWED_MIMETYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'application/pdf',
  'video/mp4',
  'video/webm',
  'audio/mpeg',
  'audio/wav',
  'audio/ogg'
]);

const ALLOWED_EXTENSIONS = new Set([
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
  '.webp',
  '.svg',
  '.pdf',
  '.mp4',
  '.webm',
  '.mp3',
  '.wav',
  '.ogg'
]);

function fileFilter(req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();

  if (ALLOWED_MIMETYPES.has(file.mimetype) && ALLOWED_EXTENSIONS.has(ext)) {
    return cb(null, true);
  }

  cb(new CalmError('VALIDATION_ERROR', 'File type not allowed'));
}

class MediaController extends CalmController {
  // 25 MB limit
  upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 1024 * 1024 * 25 },
    fileFilter
  });

  constructor(service) {
    super(service);
    this.dto = { ...this.dto, ...mediaDTO };
    this.S3Upload = new S3Upload();
    autoBind(this);
  }

  async insert(req, res, next) {
    try {
      if (!req.file) {
        throw new CalmError('VALIDATION_ERROR', 'File is required');
      }

      const { key } = await this.S3Upload.uploadFile(req.file.buffer, req.file.originalname, {
        ACL: 'public-read',
        pathPrefix: 'uploads',
        contentType: req.file.mimetype
      });

      // Free the buffer after upload
      req.file.buffer = null;

      const response = await this.service.insert(
        new this.dto.InsertDTO({
          ...req.file,
          path: key,
          uploadedBy: req.user?._id
        })
      );
      res.sendCalmResponse(new this.dto.GetDTO(response.data));
    } catch (e) {
      next(e);
    }
  }

  async getPresignedUploadUrl(req, res, next) {
    try {
      const { fileName, contentType } = req.body;
      if (!fileName) {
        throw new CalmError('VALIDATION_ERROR', 'fileName is required');
      }
      const { url, key } = await this.S3Upload.getPresignedUploadUrl(fileName, {
        ACL: 'private',
        pathPrefix: 'uploads',
        contentType
      });
      res.sendCalmResponse({ url, key });
    } catch (e) {
      next(e);
    }
  }

  async confirmUpload(req, res, next) {
    try {
      const { key, originalname, mimetype, size } = req.body;
      if (!key) {
        throw new CalmError('VALIDATION_ERROR', 'key is required');
      }

      // Validate key format: must start with 'uploads/' and follow YYYY/MM/uuid.ext pattern
      const KEY_PATTERN =
        /^uploads\/\d{4}\/\d{2}\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.[a-z0-9]+$/i;
      if (!KEY_PATTERN.test(key)) {
        throw new CalmError('VALIDATION_ERROR', 'Invalid key format');
      }

      const response = await this.service.insert(
        new this.dto.InsertDTO({
          originalname,
          mimetype,
          size,
          path: key,
          uploadedBy: req.user?._id
        })
      );
      res.sendCalmResponse(new this.dto.GetDTO(response.data));
    } catch (e) {
      next(e);
    }
  }

  async getPresignedDownloadUrl(req, res, next) {
    try {
      const record = await this.service.get(req.params.id);
      const { url } = await this.S3Upload.getPresignedDownloadUrl(record.data.path);
      res.sendCalmResponse({ url, key: record.data.path });
    } catch (e) {
      next(e);
    }
  }

  async delete(req, res, next) {
    try {
      const response = await this.service.delete(req.params.id, req.user?._id);
      await this.S3Upload.deleteFile(response.data.path);
      res.sendCalmResponse(new this.dto.GetDTO(response.data), { deleted: true });
    } catch (e) {
      next(e);
    }
  }
}

module.exports = new MediaController(mediaService);
