'use strict';
const {
  S3Client,
  DeleteObjectCommand,
  PutObjectCommand,
  GetObjectCommand
} = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { v4: uuid } = require('uuid');

class S3Upload {
  constructor(options = {}) {
    const config = {
      credentials: {
        accessKeyId: options.accessKeyId || process.env.ACCESS_KEY_ID,
        secretAccessKey: options.secretAccessKey || process.env.SECRET_ACCESS_KEY
      },
      region: options.region || process.env.REGION || 'ap-south-1'
    };

    const endpoint = options.endpoint || process.env.S3_ENDPOINT;
    if (endpoint) {
      config.endpoint = endpoint;
      config.forcePathStyle = options.forcePathStyle !== undefined ? options.forcePathStyle : true;
    }

    this.S3 = new S3Client(config);
    this.bucket = options.bucket || process.env.BUCKET_NAME;
    this.region = config.region;
  }

  _generateKey(fileName, pathPrefix) {
    const ext = fileName.split('.').pop();
    const date = new Date();
    let key = `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${uuid()}.${ext}`;
    if (pathPrefix) {
      key = `${pathPrefix}/${key}`;
    }
    return key;
  }

  getPublicUrl(key) {
    const endpoint = process.env.S3_ENDPOINT;
    if (endpoint) {
      return `${endpoint}/${this.bucket}/${key}`;
    }
    return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;
  }

  async uploadFile(buffer, fileName, ops = { ACL: 'public-read' }) {
    const Key = this._generateKey(fileName, ops.pathPrefix);
    await this.S3.send(
      new PutObjectCommand({
        ACL: ops.ACL,
        Bucket: this.bucket,
        Key,
        Body: buffer,
        ContentType: ops.contentType
      })
    );
    return { key: Key };
  }

  async getPresignedUploadUrl(fileName, ops = { ACL: 'public-read', expiresIn: 600 }) {
    const Key = this._generateKey(fileName, ops.pathPrefix);
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key,
      ACL: ops.ACL,
      ContentType: ops.contentType || 'application/octet-stream'
    });
    const url = await getSignedUrl(this.S3, command, { expiresIn: ops.expiresIn || 600 });
    return { url, key: Key };
  }

  async getPresignedDownloadUrl(key, ops = {}) {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ...(ops.responseContentDisposition && {
        ResponseContentDisposition: ops.responseContentDisposition
      }),
      ...(ops.responseContentType && { ResponseContentType: ops.responseContentType })
    });
    const url = await getSignedUrl(this.S3, command, { expiresIn: ops.expiresIn || 3600 });
    return { url, key };
  }

  async deleteFile(key) {
    return this.S3.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }
}

module.exports = { S3Upload };
