'use strict';

const express = require('express');
const AuthController = require('./auth.controller');
const router = express.Router();

// Public routes
router.post('/login', AuthController.login);
router.post('/register', AuthController.register);
router.post('/refresh-token', AuthController.refreshToken);
router.post('/request-password-reset', AuthController.requestPasswordReset);
router.post('/password-reset', AuthController.resetPassword);

// Protected routes
router.delete('/logout', AuthController.checkLogin, AuthController.logout);
router.post('/change-password', AuthController.checkLogin, AuthController.changePassword);
router.get('/profile', AuthController.checkLogin, AuthController.getProfile);
router.put('/profile', AuthController.checkLogin, AuthController.updateProfile);

module.exports = router;
