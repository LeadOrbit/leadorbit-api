const db = require("../models");

exports.email_unsubscribe = async (req, res, next) => {
  try {
    const { reason, uid } = req.body;
    if (!uid) {
      return res.status(400).json({
        success: false,
        message: "Invalid request",
      });
    }

    const find_email = await db.email_log.findOne({
      where: {
        uuid: uid,
      },
    });
    if(!find_email){
      return res.status(200).json({
        success: true,
        redirect: "/Account/AlreadyUnsubscribed",
        message: "Email already unsubscribed",
      });
    }
    const exist = await db.blocked_email.findOne({ where: { email_id: find_email.email_id } });
    if (exist) {
      return res.status(200).json({
        success: true,
        redirect: "/Account/AlreadyUnsubscribed",
        message: "Email already unsubscribed",
      });
    }

    await db.blocked_email.create({ email_id: find_email.email_id, reason });
    return res.status(200).json({
      success: true,
      message: "Login successful",
      redirect: "/Account/Unsubscribed",
      token: "demo-token",
    });
  } catch (error) {
    return res.status(200).json({
      success: true,
      redirect: "/Account/AlreadyUnsubscribed",
      message: "Email already unsubscribed",
    });
  }
};
