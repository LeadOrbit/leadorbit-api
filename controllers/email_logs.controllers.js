const db = require("../models");
const { Op } = require("sequelize");
exports.get_email_details = async (req, res, next) => {
  try {
    const filters = {};

    // Apply filters if provided
    if (req.query.sender) filters.sender = req.query.sender.trim();
    if (req.query.subject)
      filters.subject = { [Op.iLike]: `%${req.query.subject.trim()}%` };
    if (req.query.email_delivered)
      filters.email_delivered = req.query.email_delivered === "true";

    if (req.query.automation_name)
      filters.automation_name = req.query.automation_name.trim();

    if (req.query.email_id) filters.email_id = req.query.email_id.trim();

    // Pagination Setup
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    // Fetch the filtered email logs with pagination
    const { rows: emailLogs, count: totalItems } =
      await db.email_log.findAndCountAll({
        where: filters,
        limit,
        offset,
        order: [["id", "DESC"]], // or 'ASC' depending on your needs
        attributes: {
          exclude: ["body"], // This excludes just the body column
        },
      });

    // Calculate the aggregated data
    const [emailDeliveredCount, emailOpenedCount, clicksCount] =
      await Promise.all([
        db.email_log.count({
          where: { ...filters, email_delivered: true },
        }),
        db.email_log.count({
          where: { ...filters, email_oppened_on: { [Op.not]: null } },
        }),
        db.email_log.count({
          where: { ...filters, clicked: true },
        }),
      ]);

    const totalPages = Math.ceil(totalItems / limit);

    res.json({
      emailLogs,
      stats: {
        total_email_delivered: emailDeliveredCount,
        total_email_opened: emailOpenedCount,
        total_website_visited: clicksCount || 0,
      },
      pagination: {
        totalItems,
        totalPages,
        currentPage: page,
        limit,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch email logs" });
  }
};

exports.fetchBlockedEmails = async (req, res) => {
  try {
    const { email_id = "", page = 1, limit = 10 } = req.query; // Default: page 1, 10 items per page

    const filters = {};
    if (email_id) filters.email_id = { [Op.like]: `%${email_id}%` }; // Use LIKE operator for partial matching

    // Calculate the offset for pagination
    const offset = (page - 1) * limit;

    // Fetch data and count total entries
    const { rows: unsubscribedUsers, count: totalItems } =
      await db.blocked_email.findAndCountAll({
        where: filters,
        limit: parseInt(limit), // Limit the number of results returned
        offset: parseInt(offset), // Skip the previous results
      });

    // Calculate total pages
    const totalPages = Math.ceil(totalItems / limit);

    res.json({
      unsubscribedUsers,
      pagination: {
        totalItems,
        totalPages,
        currentPage: parseInt(page),
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

exports.get_unique_automation_names = async (req, res, next) => {
  try {
    // Fetch all unique automation_name from the email_logs table
    const automationNames = await db.email_log.findAll({
      attributes: [
        [
          db.sequelize.fn("DISTINCT", db.sequelize.col("automation_name")),
          "automation_name",
        ],
      ],
      raw: true,
    });

    // Extracting just the unique names from the result
    const uniqueAutomationNames = automationNames.map(
      (item) => item.automation_name
    );

    res.json({
      automationNames: uniqueAutomationNames,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch unique automation names" });
  }
};

exports.get_email_templates = async (req, res, next) => {
  try {
    const templates = await db.email_template.findAll({
      order: [["createdAt", "DESC"]],
    });

    res.status(200).json({
      success: true,
      data: templates,
    });
  } catch (error) {
    console.error(error);
    next(error);
  }
};

exports.get_email_templates_for_selection = async (req, res, next) => {
  try {
    const templates = await db.email_template.findAll({
      order: [["createdAt", "DESC"]],
      attributes: {
        exclude: ["body"], // Array of fields to exclude
      },
    });

    res.status(200).json({
      success: true,
      data: templates,
    });
  } catch (error) {
    console.error(error);
    next(error);
  }
};

exports.add_email_template = async (req, res, next) => {
  try {
    const { subject, body } = req.body;

    if (!subject || !body) {
      return res.status(400).json({
        success: false,
        message: "Subject and body are required.",
      });
    }

    const newTemplate = await db.email_template.create({
      subject,
      body,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    res.status(201).json({
      success: true,
      message: "Template created successfully",
      data: newTemplate,
    });
  } catch (error) {
    console.error("Error adding template:", error);
    next(error);
  }
};

exports.update_email_template = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { subject, body } = req.body;

    if (!subject || !body) {
      return res.status(400).json({
        success: false,
        message: "Subject and body are required.",
      });
    }

    const existingTemplate = await db.email_template.findByPk(id);

    if (!existingTemplate) {
      return res.status(404).json({
        success: false,
        message: "Template not found.",
      });
    }

    await existingTemplate.update({
      subject,
      body,
      updatedAt: new Date(),
    });

    res.status(200).json({
      success: true,
      message: "Template updated successfully",
      data: existingTemplate,
    });
  } catch (error) {
    console.error("Error updating template:", error);
    next(error);
  }
};

exports.delete_email_template = async (req, res, next) => {
  try {
    const { id } = req.params;

    const existingTemplate = await db.email_template.findByPk(id);

    if (!existingTemplate) {
      return res.status(404).json({
        success: false,
        message: "Template not found.",
      });
    }

    await existingTemplate.destroy();

    res.status(200).json({
      success: true,
      message: "Template deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting template:", error);
    next(error);
  }
};
