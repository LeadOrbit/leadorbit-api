const { ui_page } = require("../constant");
const db = require("../models");

exports.unsubscribe = async (req, res, next) => {
  try {
    const { uid } = req.params;
    if (!uid) {
      return res.render(ui_page["404_page"]);
    }
    const find_email = await db.email_log.findOne({
      where: {
        uuid: uid,
      },
    });
    if (!find_email) {
      res.render(ui_page["500_error"]);
    }
    const exist = await db.blocked_email.findOne({
      where: { email_id: find_email.email_id },
    });
    if (exist) {
      return res.render(ui_page.already_unsubscribed);
    }
    return res.render(ui_page.email_unsubscribe);
  } catch (error) {
    return res.render(ui_page["500_error"]);
  }
};
