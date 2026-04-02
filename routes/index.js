const express = require("express");
const router = express.Router();
const authenticateToken = require("../middlewares/auth.js");



// Import route files
const authRoutes = require("./auth.routes.js");
const publicRoutes = require("./public.routes.js");
const campaignRoutes = require("./campaign.routes.js");
const dataSourceRoutes = require("./data-source.routes.js");
const dataEnrichmentRoutes = require("./data-enrichment.routes.js");
const notificationRoutes = require("./notification.routes.js");
const emailTemplateRoutes = require("./email-template.routes.js");
const smtpRoutes = require("./smtp.routes.js");
const senderListRoutes = require("./senderList.routes.js");
const trackingRoutes = require("./tracking.routes.js");
const scrapedJobsroute = require("./jobScraping.routes.js");


/**
 * API routes
 * All routes will be prefixed with /api/v1
 */
router.use("/", publicRoutes);
router.use("/auth", authRoutes);
router.use("/campaign", campaignRoutes);
router.use("/data-source", authenticateToken, dataSourceRoutes);
router.use("/data-enrichment", authenticateToken, dataEnrichmentRoutes);
router.use('/notifications', authenticateToken, notificationRoutes);
router.use('/template', authenticateToken, emailTemplateRoutes)
router.use('/settings', authenticateToken, smtpRoutes)
router.use('/sender-list', authenticateToken, senderListRoutes)
router.use('/track', trackingRoutes);
// router.use("/profiles",scrapedDataroute)
// router.use("/scrapping",linkedinScrappingRoute)
// router.use("/email",emailRouter)
router.use("/jobs_details", scrapedJobsroute)
router.use("/ycombinator_scrapping", scrapedJobsroute)

// Export the router
module.exports = router;




