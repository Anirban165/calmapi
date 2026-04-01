'use strict';

class GetDTO {
  constructor({ ...props }) {
    this._id = props._id;
    this.originalname = props.originalname;
    this.mimetype = props.mimetype;
    this.size = props.size;
    this.path = props.path;
    this.uploadedBy = props.uploadedBy;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;

    Object.freeze(this);
  }
}

class InsertDTO {
  constructor({ ...props }) {
    this.originalname = props.originalname;
    this.encoding = props.encoding;
    this.mimetype = props.mimetype;
    this.filename = props.filename;
    this.path = props.path;
    this.size = props.size;
    this.uploadedBy = props.uploadedBy;

    Object.freeze(this);
  }
}

class UpdateDTO {
  constructor({ ...props }) {
    this.originalname = props.originalname;

    Object.keys(this).forEach(key => {
      if (this[key] === undefined) {
        delete this[key];
      }
    });

    Object.freeze(this);
  }
}

module.exports = { GetDTO, InsertDTO, UpdateDTO };
