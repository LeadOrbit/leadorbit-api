const nodemailer = require('nodemailer');
const db = require('../models');
const Smtp = db.Smtp;
const { encrypt, decrypt } = require('../utils/encryption'); // Encryption helpers

const sendTestEmail = async (req, res) => {
  const { host, port, encryption, user, password, toEmail } = req.body;
  const { email } = req.user;

  try {
    const existingUser = await db.User.findOne({ where: { email } });
    if (!existingUser) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: encryption === 'SSL',
      auth: {
        user,
        pass: password,
      },
      tls: encryption === 'TLS' ? { rejectUnauthorized: false } : undefined,
    });

    await transporter.sendMail({
      from: user,
      to: toEmail || user,
      subject: 'SMTP Test Email',
      text: 'This is a test email to verify SMTP configuration.',
    });

    res.status(200).json({ success: true, message: 'SMTP test email sent successfully.' });
  } catch (err) {
    console.error('SMTP test error:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

const saveSmtpConfiguration = async (req, res) => {
  const { host, port, encryption, user, password } = req.body;
  const { email } = req.user;

  try {
    const existingUser = await db.User.findOne({ where: { email } });
    if (!existingUser) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const encryptedPassword = encrypt(password);

    const smtpConfig = await Smtp.create({
      host,
      port,
      encryption,
      user,
      password: encryptedPassword,
      userId: existingUser.id,
    });

    res.status(201).json({ success: true, message: 'SMTP configuration saved.', smtpConfig });
  } catch (err) {
    console.error('Save SMTP error:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

const updateSmtpConfiguration = async (req, res) => {
  const { id } = req.params;
  const { host, port, encryption, user, password } = req.body;
  const { email } = req.user;

  try {
    const existingUser = await db.User.findOne({ where: { email } });
    if (!existingUser) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const smtp = await Smtp.findByPk(id);
    if (!smtp) {
      return res.status(404).json({ success: false, message: 'SMTP config not found.' });
    }

    const encryptedPassword = password ? encrypt(password) : smtp.password;

    await smtp.update({
      host,
      port,
      encryption,
      user,
      password: encryptedPassword,
    });

    res.status(200).json({ success: true, message: 'SMTP configuration updated.', smtp });
  } catch (err) {
    console.error('Update SMTP error:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

const getSmtpConfiguration = async (req, res) => {
  const { email } = req.user;

  try {
    const existingUser = await db.User.findOne({ where: { email } });
    if (!existingUser) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const configs = await Smtp.findAll({
      where: { userId: existingUser.id },
      attributes: ['id', 'host', 'port', 'encryption', 'user', 'createdAt'],
    });

    res.status(200).json({ success: true, configs });
  } catch (err) {
    console.error('Get SMTP error:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

const deleteSmtpConfiguration = async (req, res) => {
  const { id } = req.params;
  const { email } = req.user;

  try {
    const existingUser = await db.User.findOne({ where: { email } });
    if (!existingUser) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const deleted = await Smtp.destroy({ where: { id, userId: existingUser.id } });
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'SMTP config not found or unauthorized.' });
    }

    res.status(200).json({ success: true, message: 'SMTP configuration deleted.' });
  } catch (err) {
    console.error('Delete SMTP error:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  sendTestEmail,
  saveSmtpConfiguration,
  updateSmtpConfiguration,
  getSmtpConfiguration,
  deleteSmtpConfiguration,
};