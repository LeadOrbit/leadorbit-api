const { Op, where } = require('sequelize');
const db = require('../models');
const { Campaign } = require('../models');

// Create a new campaign
const createCampaign = async (req, res) => {
  try {
    const { campaignName, campaignType, steps, senderListId, enrichedListId } = req.body;

    const newCampaign = await Campaign.create({
      name: campaignName,
      type: campaignType,
      enrichedListId,
      senderListId,
      status: 'draft',
    });

    if (Array.isArray(steps) && steps.length > 0) {
      const stepData = steps.map(step => ({
        ...step,
        campaignId: newCampaign.id,
      }));
      await db.Step.bulkCreate(stepData);
    }

    return res.status(201).send({
      success: true,
      message: 'Campaign created successfully',
      campaign: newCampaign,
    });
  } catch (error) {
    console.error('Error creating campaign:', error);
    return res.status(500).send({ success: false, message: 'Failed to create campaign' });
  }
};

// Get all campaigns
const getCampaigns = async (req, res) => {
  try {
    const campaigns = await Campaign.findAll();
    return res.status(200).send({ success: true, campaigns });
  } catch (error) {
    console.error('Error fetching campaigns:', error);
    return res.status(500).send({
      success: false,
      message: 'Failed to fetch campaigns'
    });
  }
};

// Get a single campaign by ID
const getCampaignById = async (req, res) => {
  const { id } = req.params;

  try {
    const campaign = await Campaign.findByPk(id, {
      include: [{ model: db.Step, as: 'steps' }],
    });
    if (!campaign) {
      return res.status(404).send({ success: false, error: 'Campaign not found' });
    }

    return res.status(200).send({
      success: true,
      campaign,
    });
  } catch (error) {
    console.error('Error fetching campaign:', error);
    return res.status(500).send({ success: false, error: 'Failed to fetch campaign' });
  }
};

const updateCampaign = async (req, res) => {
  const { updatedCampaign } = req.body;
  const { id, name, steps } = updatedCampaign;

  try {
    const campaign = await db.Campaign.findByPk(id);
    if (!campaign) {
      return res.status(404).send({ success: false, error: 'Campaign not found' });
    }

    // Update campaign name
    await campaign.update({ name: name ?? campaign.name });

    let newSteps = [];
    let updatedStepIds = [];

    // Handle step updates
    if (Array.isArray(steps)) {
      const existingSteps = await db.Step.findAll({ where: { campaignId: campaign.id } });
      const existingStepMap = new Map(existingSteps.map(step => [step.id, step]));
      const incomingStepIds = new Set();

      const stepsToUpdate = [];

      for (const step of steps) {
        if (step.id && existingStepMap.has(step.id)) {
          const existing = existingStepMap.get(step.id);
          incomingStepIds.add(step.id);

          if (
            existing.type !== step.type ||
            existing.templateId !== step.templateId ||
            new Date(existing.scheduledAt).toISOString() !== new Date(step.scheduledAt).toISOString()
          ) {
            stepsToUpdate.push({
              ...step,
              campaignId: campaign.id,
            });
            updatedStepIds.push(step.id);
          }
        } else {
          const { id, ...stepWithoutId } = step; // <- remove id if exists
          newSteps.push({
            ...stepWithoutId,
            campaignId: campaign.id,
          });
        }
      }

      const stepsToDelete = existingSteps.filter(step => !incomingStepIds.has(step.id));

      await Promise.all([
        ...stepsToUpdate.map(step => db.Step.update(step, { where: { id: step.id } })),
        db.Step.bulkCreate(newSteps),
        db.Step.destroy({ where: { id: stepsToDelete.map(s => s.id) } }),
      ]);
    }

    const contactList = await db.ContactList.findByPk(campaign.enrichedListId);

    if ((newSteps.length > 0 || updatedStepIds.length > 0) && campaign.status === "active" || campaign.status === 'completed') {
      if (!contactList || !contactList.contacts || contactList.contacts.length === 0) {
        return res.status(400).send({ success: false, error: 'No contacts found to re-trigger new steps' });
      }

      const stepsToSchedule = [...newSteps, ...steps.filter(s => updatedStepIds.includes(s.id))];

      for (const step of stepsToSchedule) {
        if (!step.id) {
          console.log("Skipping step with undefined ID:", step); // Add this line for debugging
          continue; // Skip steps that don't have an ID
        }

        const template = await db.EmailTemplate.findByPk(step.templateId);
        if (!template) continue;

        for (const contact of contactList.contacts) {
          const isUnsubscribed = await db.UnsubscribedUsers.findOne({ where: { email: contact.email } });
          if (isUnsubscribed) continue;

          const alreadyScheduled = await db.ScheduledCampaign.findOne({
            where: {
              campaignId: campaign.id,
              templateId: step.templateId,
              recipient: contact,
              stepId: step.id
            },
          });

          if (alreadyScheduled) continue;

          const scheduledCampaign = await db.ScheduledCampaign.create({
            campaignId: campaign.id,
            campaignType: campaign.type || "email",
            senderListId: campaign.senderListId,
            enrichedListId: campaign.enrichedListId,
            recipient: contact,
            scheduledAt: new Date(step.scheduledAt),
            templateId: step.templateId,
            status: 'pending',
            stepId: step.id
          });

          await db.CampaignTracker.create({
            scheduledCampaignId: scheduledCampaign.id,
            sentAt: null,
            openedAt: null,
            clickedAt: null,
            repliedAt: null,
            unsubscribedAt: null,
            unsubscriptionReason: null,
          });
        }

      }
    }

    const updated = await db.Campaign.findByPk(campaign.id, {
      include: [{ model: db.Step, as: 'steps' }],
    });

    await db.Campaign.update({ status: "active" }, { where: { id: campaign.id } })
    return res.status(200).send({
      success: true,
      message: 'Campaign updated successfully',
      campaign: updated,
    });
  } catch (error) {
    console.error('Error updating campaign:', error);
    return res.status(500).send({ success: false, error: 'Failed to update campaign' });
  }
};



// Delete a campaign
const deleteCampaign = async (req, res) => {
  const { id } = req.params;

  try {
    const campaign = await Campaign.findByPk(id);
    if (!campaign) {
      return res.status(404).send({ success: false, error: 'Campaign not found' });
    }

    await db.Step.destroy({ where: { campaignId: campaign.id } });
    await campaign.destroy();

    return res.status(200).send({ success: true, message: 'Campaign deleted successfully' });
  } catch (error) {
    console.error('Error deleting campaign:', error);
    return res.status(500).send({ success: false, error: 'Failed to delete campaign' });
  }
};

const triggerCampaign = async (req, res) => {
  const { id } = req.params;
  const { trigger } = req.body;
  console.log("trigger", trigger);

  try {
    const campaign = await db.Campaign.findByPk(id, {
      include: [{ model: db.Step, as: 'steps' }]
    });

    if (!campaign) {
      return res.status(404).send({ success: false, error: 'Campaign not found' });
    }

    if (trigger.trim().toLowerCase() === "completed") {
      return res.status(200).send({
        success: true,
        message: 'Campaign is completed successfully. Add Steps to Continue the Campaign',
      });
    }

    if (trigger.trim().toLowerCase() === "start") {
      const contactList = await db.ContactList.findByPk(campaign.enrichedListId);

      if (!contactList || !contactList.contacts || contactList.contacts.length === 0) {
        return res.status(400).send({ success: false, error: 'No contacts found in the list' });
      }

      const senderList = await db.SenderList.findByPk(campaign.senderListId);

      const triggerTime = new Date();

      for (const contact of contactList.contacts) {
        // 🔍 Check if contact.email is unsubscribed
        const unsubscribed = await db.UnsubscribedUsers.findOne({
          where: { email: contact.email }
        });

        if (unsubscribed) {
          console.log(`Skipping unsubscribed contact: ${contact.email}`);
          continue; // ❌ Skip if unsubscribed
        }

        for (const step of campaign.steps) {
          const template = await db.EmailTemplate.findByPk(step.templateId);
          if (!senderList || !template) {
            return res.status(400).send({ success: false, error: 'Invalid sender list or template in steps' });
          }

          const scheduledAt = new Date(step.scheduledAt.getTime());

          const scheduledCampaign = await db.ScheduledCampaign.create({
            campaignId: campaign.id,
            campaignType: campaign.type || "email",
            senderListId: campaign.senderListId,
            enrichedListId: campaign.enrichedListId,
            recipient: contact,
            scheduledAt,
            templateId: step.templateId,
            status: 'pending',
            stepId: step.id
          });

          await db.CampaignTracker.create({
            scheduledCampaignId: scheduledCampaign.id,
            sentAt: null,
            openedAt: null,
            clickedAt: null,
            repliedAt: null,
            unsubscribedAt: null,
            unsubscriptionReason: null,
          });
        }
      }

      await campaign.update({
        status: 'active',
        triggerTime,
      });

      return res.status(200).send({
        success: true,
        message: 'Campaign triggered and scheduled successfully',
      });
    }

    if (trigger.trim().toLowerCase() === "pause") {
      await db.ScheduledCampaign.update(
        { status: 'paused' },
        {
          where: {
            campaignId: campaign.id,
            status: 'pending',
            scheduledAt: { [db.Sequelize.Op.gt]: new Date() }
          }
        }
      );

      await campaign.update({ status: 'paused' });

      return res.status(200).send({
        success: true,
        message: 'Campaign paused successfully',
      });
    }

    if (trigger.trim().toLowerCase() === "resume") {
      await db.ScheduledCampaign.update(
        { status: 'pending' },
        {
          where: {
            campaignId: campaign.id,
            status: 'paused'
          }
        }
      );

      await campaign.update({ status: 'active' });

      return res.status(200).send({
        success: true,
        message: 'Campaign resumed successfully',
      });
    }

    return res.status(400).send({ success: false, error: 'Invalid trigger' });

  } catch (error) {
    console.error('Error triggering campaign:', error);
    return res.status(500).send({ success: false, error: 'Failed to trigger campaign' });
  }
};


const getCampaignStats = async (req, res) => {
  const campaignId = parseInt(req.params.id);

  try {
    const campaign = await db.Campaign.findByPk(campaignId, {
      include: [
        {
          model: db.Step,
          as: 'steps',
          include: [
            {
              model: db.EmailTemplate,
              as: 'template',
              attributes: ['id', 'name', 'subject'],
            }
          ],
          order: [['order', 'ASC']],
        },
      ],
    });

    if (!campaign) {
      return res.status(404).json({ message: 'Campaign not found' });
    }

    // Fetch all ScheduledCampaigns for this campaign
    const scheduledCampaigns = await db.ScheduledCampaign.findAll({
      where: { campaignId },
      attributes: ['id', 'templateId', 'status', 'scheduledAt'],
    });

    const scheduledMap = scheduledCampaigns.reduce((acc, sched) => {
      if (!acc[sched.templateId]) acc[sched.templateId] = [];
      acc[sched.templateId].push(sched.id);
      return acc;
    }, {});

    // Aggregate global stats
    const allScheduledIds = scheduledCampaigns.map(sc => sc.id);

    const [totalSent, totalOpened, totalClicked, totalReplied, totalUnsubscribed] = await Promise.all([
      db.CampaignTracker.count({ where: { scheduledCampaignId: { [Op.in]: allScheduledIds }, sentAt: { [Op.ne]: null } } }),
      db.CampaignTracker.count({ where: { scheduledCampaignId: { [Op.in]: allScheduledIds }, openedAt: { [Op.ne]: null } } }),
      db.CampaignTracker.count({ where: { scheduledCampaignId: { [Op.in]: allScheduledIds }, clickedAt: { [Op.ne]: null } } }),
      db.CampaignTracker.count({ where: { scheduledCampaignId: { [Op.in]: allScheduledIds }, repliedAt: { [Op.ne]: null } } }),
      db.CampaignTracker.count({ where: { scheduledCampaignId: { [Op.in]: allScheduledIds }, unsubscribedAt: { [Op.ne]: null } } }),
    ]);

    // Stats per step
    const stepStats = await Promise.all(campaign.steps.map(async (step) => {
      const stepScheduledIds = scheduledMap[step.templateId] || [];

      if (stepScheduledIds.length === 0) {
        return {
          stepId: step.id,
          order: step.order,
          template: step.template,
          scheduledCount: 0,
          sent: 0,
          opened: 0,
          clicked: 0,
          replied: 0,
          unsubscribed: 0,
        };
      }

      const [sent, opened, clicked, replied, unsubscribed] = await Promise.all([
        db.CampaignTracker.count({ where: { scheduledCampaignId: { [Op.in]: stepScheduledIds }, sentAt: { [Op.ne]: null } } }),
        db.CampaignTracker.count({ where: { scheduledCampaignId: { [Op.in]: stepScheduledIds }, openedAt: { [Op.ne]: null } } }),
        db.CampaignTracker.count({ where: { scheduledCampaignId: { [Op.in]: stepScheduledIds }, clickedAt: { [Op.ne]: null } } }),
        db.CampaignTracker.count({ where: { scheduledCampaignId: { [Op.in]: stepScheduledIds }, repliedAt: { [Op.ne]: null } } }),
        db.CampaignTracker.count({ where: { scheduledCampaignId: { [Op.in]: stepScheduledIds }, unsubscribedAt: { [Op.ne]: null } } }),
      ]);

      return {
        stepId: step.id,
        order: step.order,
        template: step.template,
        scheduledCount: stepScheduledIds.length,
        sent,
        opened,
        clicked,
        replied,
        unsubscribed,
      };
    }));

    res.status(200).send({
      success: true,
      campaign: {
        id: campaign.id,
        name: campaign.name,
        type: campaign.type,
        description: campaign.description,
      },
      globalStats: {
        totalSteps: campaign.steps.length,
        totalScheduled: allScheduledIds.length,
        totalSent,
        totalOpened,
        totalClicked,
        totalReplied,
        totalUnsubscribed,
      },
      stepStats,
    });

  } catch (err) {
    console.error('Campaign stats error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};
const getRecipientStats = async (req, res) => {
  const campaignId = parseInt(req.params.id);

  try {
    // Find all scheduled campaigns for this campaign
    const scheduledCampaigns = await db.ScheduledCampaign.findAll({
      where: { campaignId },
      attributes: ['id', 'recipient'],
    });

    const scheduledCampaignIds = scheduledCampaigns.map(sc => sc.id);
    if (!scheduledCampaignIds.length) {
      return res.status(404).json({ message: 'No recipients scheduled for this campaign.' });
    }

    // Get all CampaignTrackers for this campaign
    const trackers = await db.CampaignTracker.findAll({
      where: {
        scheduledCampaignId: { [Op.in]: scheduledCampaignIds }
      },
      include: [
        {
          model: db.ScheduledCampaign,
          as: 'campaign',
          attributes: ['recipient', 'templateId', 'scheduledAt'],
        }
      ],
      order: [['createdAt', 'DESC']],
    });

    // Group data by recipient
    const recipientStatsMap = {};

    trackers.forEach(tracker => {
      const { campaign: scheduled, sentAt, openedAt, clickedAt, repliedAt, unsubscribedAt, unsubscriptionReason, senderEmail } = tracker;
      const recipient = scheduled.recipient;

      // You might store recipient as JSON object — ensure you normalize it
      const email = recipient?.email || recipient; // fallback if it's just an email string

      if (!email) return;

      if (!recipientStatsMap[email]) {
        recipientStatsMap[email] = {
          email,
          steps: [],
          totalSent: 0,
          totalOpened: 0,
          totalClicked: 0,
          totalReplied: 0,
          totalUnsubscribed: 0,
        };
      }

      const stepData = {
        templateId: scheduled.templateId,
        scheduledAt: scheduled.scheduledAt,
        sentAt,
        openedAt,
        clickedAt,
        repliedAt,
        unsubscribedAt,
        unsubscriptionReason,
        senderEmail,
      };

      recipientStatsMap[email].steps.push(stepData);
      if (sentAt) recipientStatsMap[email].totalSent++;
      if (openedAt) recipientStatsMap[email].totalOpened++;
      if (clickedAt) recipientStatsMap[email].totalClicked++;
      if (repliedAt) recipientStatsMap[email].totalReplied++;
      if (unsubscribedAt) recipientStatsMap[email].totalUnsubscribed++;
    });

    const recipients = Object.values(recipientStatsMap);

    res.status(200).json({ recipients });

  } catch (err) {
    console.error('Recipient stats error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};


module.exports = {
  createCampaign,
  getCampaigns,
  getCampaignById,
  updateCampaign,
  deleteCampaign,
  triggerCampaign,
  getCampaignStats,
  getRecipientStats
};
