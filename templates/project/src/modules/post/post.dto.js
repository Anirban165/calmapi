'use strict';

class GetDTO {
  constructor({ ...props }) {
    this._id = props._id;
    this.title = props.title;
    this.slug = props.slug;
    this.subtitle = props.subtitle;
    this.description = props.description;
    this.content = props.content;
    this.createdBy = props.createdBy;
    this.updatedBy = props.updatedBy;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
    Object.freeze(this);
  }
}

class InsertDTO {
  constructor({ ...props }) {
    this.title = props.title;
    this.subtitle = props.subtitle;
    this.description = props.description;
    this.content = props.content;
    this.createdBy = props.createdBy;
    Object.freeze(this);
  }
}

class UpdateDTO {
  constructor({ ...props }) {
    this.title = props.title;
    this.subtitle = props.subtitle;
    this.description = props.description;
    this.content = props.content;
    this.updatedBy = props.updatedBy;
    Object.keys(this).forEach(key => {
      if (this[key] === undefined) {
        delete this[key];
      }
    });
    Object.freeze(this);
  }
}

module.exports = { GetDTO, InsertDTO, UpdateDTO };
