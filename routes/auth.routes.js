const express = require("express");
const router = express.Router();
const authController = require("../controllers/auth.controller.js");
const emailController = require("../controllers/email_logs.controllers.js");
const { api_protect } = require("../lib/jwt.js");
const sendersController = require("../controllers/senders.controllers.js");
const authenticateToken = require("../middlewares/auth.js");

// POST /auth/login
router.post("/send-otp", authController.sendOtp);
router.post("/verify-otp", authController.verifyOtp)
router.get("/google/url", authController.getGoogleAuthUrl);
router.get("/google/callback", authController.googleCallback);

// sender routes
router.get("/senders", sendersController.get_all_senders);
router.post("/senders", sendersController.add_sender);
router.put("/senders/:id", sendersController.update_sender);
router.delete("/senders/:id", sendersController.delete_sender);

// email template routes
router.post("/email-templates", emailController.add_email_template);
router.get("/email-templates", emailController.get_email_templates);
router.get(
  "/email-templates/select",
  emailController.get_email_templates_for_selection
);
// router.get("/email-templates/:id", emailController.get_email_template_by_id);
router.put("/email-templates/:id", emailController.update_email_template);
router.delete("/email-templates/:id", emailController.delete_email_template);

// blocked users
router.get("/blocked-emails", emailController.fetchBlockedEmails);

// email logs routes
router.get("/email-logs", api_protect, emailController.get_email_details);
router.get("/get_all_automation", emailController.get_unique_automation_names);

router.get("/all-users", authenticateToken, authController.getAllUsers)

module.exports = router;
