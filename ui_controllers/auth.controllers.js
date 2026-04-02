const { ui_page } = require("../constant");

exports.login = async (req, res, next) => {
    try {
        const { username, password } = req.body;
        return res.render(ui_page.login)
    } catch (error) {
        return res.render(ui_page["500_error"]);
    }
};