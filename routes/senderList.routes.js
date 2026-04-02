// routes/senderList.routes.js
const express = require('express');
const router = express.Router();
const controller = require('../controllers/senderList.controller');

router.post('/create', controller.createList);
router.get('/', controller.getLists);
router.post('/add-sender', controller.addSender);
router.post('/delete-sender', controller.deleteSender);

module.exports = router;
