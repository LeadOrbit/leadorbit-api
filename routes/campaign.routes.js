// routes/campaignRoutes.js
const express = require('express');
const router = express.Router();
const {
    createCampaign,
    getCampaigns,
    getCampaignById,
    updateCampaign,
    deleteCampaign,
    triggerCampaign,
    getCampaignStats,
    getRecipientStats,
} = require('../controllers/campaign.controller');

// Route to create a new campaign
router.post('/create', createCampaign);

// Route to get all campaigns
router.get('/all', getCampaigns);

// Route to get a specific campaign by ID
router.get('/:id', getCampaignById);

// Route to update a campaign
router.put('/', updateCampaign);

// Route to delete a campaign
router.delete('/:id', deleteCampaign);

// Route to trigger a campaign
router.post('/:id/trigger', triggerCampaign);

router.get('/:id/stats', getCampaignStats);

router.get('/:id/recipients/stats', getRecipientStats);


module.exports = router;
