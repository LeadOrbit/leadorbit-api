// routes/smtpRoutes.js
const express = require('express');
const { sendTestEmail, saveSmtpConfiguration, updateSmtpConfiguration, getSmtpConfiguration, deleteSmtpConfiguration } = require('../controllers/smtp.controller');
const router = express.Router();

// Test SMTP connection
router.post('/smtp/test-smtp',sendTestEmail );

router.post('/smtp/save-smtp',saveSmtpConfiguration );

router.put('/smtp/update-smtp/:id',updateSmtpConfiguration );

router.get('/smtp/get-smtp',getSmtpConfiguration );

router.delete('/smtp/delete-smtp/:id',deleteSmtpConfiguration );



module.exports = router;
