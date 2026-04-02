const express = require("express");
const router = express.Router();

const { protect } = require("../lib/jwt.js"); // Import protect from jwt.js

const authController = require("../ui_controllers/auth.controllers.js");
const unsubscribeController = require("../ui_controllers/unsubscribe_email.controller.js");
const emailTrackingController = require("../ui_controllers/email_tracking.controller.js");

router.get("/", (req, res) => {
  res.clearCookie("authToken"); // Clear the token cookie
  res.redirect("/login"); // Redirect to login
})
router.get("/login", authController.login);
// router.get("/", (req, res) => res.render("index"));
router.get("/Account/:uid/UnsubscribeEmail", unsubscribeController.unsubscribe);
router.get("/Account/Unsubscribed", (req, res) =>
  res.render("unsubscribed_page")
);
router.get("/Account/AlreadyUnsubscribed", (req, res) =>
  res.render("already_unsubscribed")
);
router.get("/dashboard", protect, (req, res) => res.render("dashboard")); // Use protect middleware
router.get("/unsubscribedUsers",protect,(req,res) => res.render("unsubscribed_users"))
router.get("/logout", (req, res) => {
  res.clearCookie("authToken"); // Clear the token cookie
  res.redirect("/login"); // Redirect to login
});
router.get("/redirect/:uid", emailTrackingController.track_redirect);
router.get('/:uid/img.png',emailTrackingController.track_image);


module.exports = router;
