const db = require("../models");

exports.get_email_campaigns = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const { count, rows } = await db.email_campaign.findAndCountAll({
      offset,
      limit,
      order: [["createdAt", "DESC"]],
    });

    res.status(200).json({
      success: true,
      message: "Campaigns fetched successfully",
      data: {
        campaigns: rows,
        pagination: {
          total: count,
          page,
          limit,
          totalPages: Math.ceil(count / limit),
        },
      },
    });
  } catch (error) {
    console.error("Error fetching campaigns:", error);
    next(error);
  }
};

exports.add_email_campaign = async (req, res, next) => {
  try {
    const { list_uri, template_id, automation_name, selected_senders } =
      req.body;

    // Basic validation
    if (
      !list_uri ||
      !template_id ||
      !automation_name ||
      !Array.isArray(selected_senders) ||
      selected_senders.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Missing or invalid fields",
      });
    }
    const campaign = await db.email_campaign.create({
      list_uri,
      template_id,
      automation_name,
      status: "pending",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    if (campaign && campaign.id) {
      await Promise.all(
        selected_senders.map(async (sender) => {
          const master_sender = await db.email_sender.findByPk(sender.id);
          if (master_sender) {
            await db.campaign_sender.create({
              email_campaign_id: campaign.id,
              sender_id: master_sender.id,
              email_user: master_sender.email_user,
              email_password: master_sender.email_password,
              email_name: master_sender.email_name,
              designation: master_sender.designation,
              address: master_sender.address,
              phone: master_sender.phone,
              limit: +sender.limit,
            });
          }
        })
      );
    }

    return res.status(201).json({
      success: true,
      message: "Campaign created successfully",
      // data: campaign,
    });
  } catch (error) {
    console.error("Error creating campaign:", error);
    next(error);
  }
};
