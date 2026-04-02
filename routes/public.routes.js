const express = require('express');
const router = express.Router();
const commonControllers = require('../controllers/common.controller.js');

// POST /auth/login
router.post('/unsubscribe', commonControllers.email_unsubscribe);

module.exports = router;