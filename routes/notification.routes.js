// routes/notificationRoutes.js
const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notification.controller');

router.post('/', notificationController.createNotification);
router.get('/', notificationController.getNotifications);
router.patch('/:notificationId/read', notificationController.markAsRead);

module.exports = router;
