'use strict';

const express = require('express');
const AuthController = require('../auth/auth.controller');
const MediaController = require('./media.controller');
const router = express.Router();

router.use(AuthController.checkLogin);

router.get('/', MediaController.getAll);
router.get('/:id', MediaController.get);

// Upload flows
router.post('/', MediaController.upload.single('file'), MediaController.insert);
router.post('/presigned-upload', MediaController.getPresignedUploadUrl);
router.post('/presigned-download/:id', MediaController.getPresignedDownloadUrl);
router.post('/confirm-upload', MediaController.confirmUpload);

router.delete('/:id', MediaController.delete);

module.exports = router;
