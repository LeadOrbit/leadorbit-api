const express = require('express');
const router = express.Router();
const { createEmailTemplate,
    updateEmailTemplate,
    getAllEmailTemplates,
    getEmailTemplate,
    deleteEmailTemplate,} = require('../controllers/emailTemplate.controller');

// Create a new email template
router.post('/email-templates', createEmailTemplate);

// Update an existing email template
router.put('/email-templates/:id', updateEmailTemplate);

// Get all email templates
router.get('/email-templates', getAllEmailTemplates);

// Get a specific email template by ID
router.get('/email-templates/:id', getEmailTemplate);

// Delete an email template
router.delete('/email-templates/:id', deleteEmailTemplate);

module.exports = router;
