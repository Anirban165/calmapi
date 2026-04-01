'use strict';
const express = require('express');
const AuthController = require('../auth/auth.controller');
const PostController = require('./post.controller');
const router = express.Router();

router.use(AuthController.checkLogin);

router.get('/', PostController.getAll);
router.get('/:id', PostController.get);
router.post('/', PostController.insert);
router.put('/:id', PostController.update);
router.delete('/:id', PostController.delete);

module.exports = router;
