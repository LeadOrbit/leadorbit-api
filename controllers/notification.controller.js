const db = require('../models');

const createNotification = async (req, res) => {
    try {
        const { message, type = "info" } = req.body;

        const { email } = req.user;
        const user = await db.User.findOne({ where: { email } });
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        const notification = await db.Notification.create({
            userId: user.id,
            message,
            type
        });

        res.status(201).send({ success: true, notification });
    } catch (error) {
        console.error("Error creating notification:", error);
        res.status(500).send({ success: false, message: error.message });
    }
};

const getNotifications = async (req, res) => {
    try {
        const { email } = req.user;

        const user = await db.User.findOne({ where: { email } });
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        const notifications = await db.Notification.findAll({
            where: { userId: user.id },
            order: [['createdAt', 'DESC']]
        });

        res.status(200).send({ success: true, notifications });
    } catch (error) {
        console.error("Error fetching notifications:", error);
        res.status(500).send({ success: false, message: error.message });
    }
};

const markAsRead = async (req, res) => {
    try {
        const { notificationId } = req.params;

        const notification = await db.Notification.findByPk(notificationId);
        if (!notification) {
            return res.status(404).send({ success: false, message: "Notification not found" });
        }

        notification.isRead = true;
        await notification.save();

        res.status(200).send({ success: true, notification });
    } catch (error) {
        console.error("Error updating notification:", error);
        res.status(500).send({ success: false, message: error.message });
    }
};

module.exports = {
    createNotification,
    getNotifications,
    markAsRead
};
