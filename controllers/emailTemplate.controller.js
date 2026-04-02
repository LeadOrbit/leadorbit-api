const db = require('../models');

// Create Email Template
const createEmailTemplate = async (req, res) => {
  try {
    const { name, subject, contentType, content } = req.body;
    const { email } = req.user;

    const user = await db.User.findOne({ where: { email } });
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    if (!name || !subject || !content) {
      return res.status(400).json({ message: 'All fields are required.' });
    }

    const newTemplate = await db.EmailTemplate.create({
      name,
      subject,
      contentType,
      content,
      userId: user.id
    });

    return res.status(201).send({ success: true, newTemplate });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error creating template' });
  }
};

// Update Email Template
const updateEmailTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, subject, contentType, content } = req.body;
    const { email } = req.user;

    const user = await db.User.findOne({ where: { email } });
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const template = await db.EmailTemplate.findByPk(id);
    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }

    template.name = name || template.name;
    template.subject = subject || template.subject;
    template.contentType = contentType || template.contentType;
    template.content = content || template.content;

    await template.save();

    return res.status(200).send({ success: true, template });
  } catch (error) {
    console.error(error);
    return res.status(500).send({ success: false, error: 'Error updating template' });
  }
};

// Get All Email Templates
const getAllEmailTemplates = async (req, res) => {
  try {
    const { email } = req.user;

    const user = await db.User.findOne({ where: { email } });
    if (!user) {
      return res.status(404).send({ success: false, message: "User not found" });
    }

    const templates = await db.EmailTemplate.findAll({ where: { userId: user.id } });
    return res.status(200).send({ success: true, templates });
  } catch (error) {
    console.error(error);
    return res.status(500).send({ success: false, error: 'Error fetching templates' });
  }
};

// Get Single Email Template
const getEmailTemplate = async (req, res) => {
  try {
    const { id } = req.params;

    const template = await db.EmailTemplate.findByPk(id);
    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }

    return res.status(200).send({ success: true, template });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error fetching template' });
  }
};

// Delete Email Template
const deleteEmailTemplate = async (req, res) => {
  try {
    const { id } = req.params;

    const template = await db.EmailTemplate.findByPk(id);
    if (!template) {
      return res.status(404).send({ success: false, error: 'Template not found' });
    }

    await template.destroy();
    return res.status(204).json({ success: true, message: 'Template deleted successfully' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, error: 'Error deleting template' });
  }
};

module.exports = {
  createEmailTemplate,
  updateEmailTemplate,
  getAllEmailTemplates,
  getEmailTemplate,
  deleteEmailTemplate,
};
