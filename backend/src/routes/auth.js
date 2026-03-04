const express = require('express');
const router = express.Router();
const authController = require('../../controllers/authController');
const authMiddleware = require('../middleware/auth');

// Public routes
router.post('/login', authController.login);
router.get('/verify', authController.verifyToken);

// Protected routes
router.post('/logout', authMiddleware, authController.logout);

module.exports = router;