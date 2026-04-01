'use strict';

const express = require('express');
const router = express.Router();
const AuthController = require('../auth/auth.controller');
const MODULE_SINGULAR_PASCALController = require('./MODULE_SINGULAR_KEBAB.controller');

router.use(AuthController.checkLogin);

router.get('/', MODULE_SINGULAR_PASCALController.getAll);
router.get('/:id', MODULE_SINGULAR_PASCALController.get);
router.post('/', MODULE_SINGULAR_PASCALController.insert);
router.put('/:id', MODULE_SINGULAR_PASCALController.update);
router.delete('/:id', MODULE_SINGULAR_PASCALController.delete);

module.exports = router;
