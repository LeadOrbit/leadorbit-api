const db = require("../models");
const { Op } = require("sequelize");
const { sendEmail } = require("./emailSender");
const cron = require("node-cron");

const addTrackingPixel = (body, trackingId, recipientId) => {
  const baseUrl = `${process.env.BACKEND_URL}/api/v1`;
  const trackingUrl = `${baseUrl}/track/open/${recipientId}/${trackingId}`;

  const trackingElements = [
    `<img src="${trackingUrl}" width="1" height="1" alt="" style="width:1px;height:1px;opacity:0.01;" />`,
    `<div style="width:1px;height:1px;opacity:0.01;background-image: url('${trackingUrl}');"></div>`,
    `<style>
            .track-${trackingId} {
                width: 1px;
                height: 1px;
                opacity: 0.01;
                background-image: url('${trackingUrl}');
            }
        </style>
        <div class="track-${trackingId}"></div>`,
  ].join("\n");

  const unsubscribeLink = `<p style="font-size: 12px; color: #888; margin-top: 20px;">
        If you no longer wish to receive emails, <a href="${process.env.FRONTEND_URL}/unsubscribe/${recipientId}/${trackingId}" target="_blank">unsubscribe here</a>.
    </p>`;

  const manualTrackingInfo = `<!--
        Manual tracking URL if automatic tracking fails:
        ${baseUrl}/manual-track/${trackingId}
    -->`;

  // Gmail-safe global style reset
  const inlineStyles = `
        <meta charset="UTF-8">
        <style>
            body, html {
                margin: 0;
                padding: 0;
            }
            p, div, span, li {
                margin: 0;
                padding: 0;
                line-height: 1.2;
            }
            p:empty, p:blank, p:has(br), p:has(&nbsp;) {
                display: none !important;
                height: 0 !important;
                line-height: 0 !important;
            }
            span {
                display: inline !important;
            }
        </style>
    `;

  // Remove visual empty tags
  body = body
    .replace(/<p>(&nbsp;|\s|<br\s*\/?>)*<\/p>/gi, "")
    .replace(/<p>\s*<\/p>/gi, "")
    .replace(/\n/g, "") // remove newlines that Gmail can misinterpret
    .replace(/\s{2,}/g, " "); // normalize excessive whitespace

  if (body.includes("</body>")) {
    return body.replace(
      "</body>",
      `${inlineStyles}${trackingElements}${unsubscribeLink}${manualTrackingInfo}</body>`,
    );
  } else if (body.includes("</html>")) {
    return body.replace(
      "</html>",
      `${inlineStyles}${trackingElements}${unsubscribeLink}${manualTrackingInfo}</html>`,
    );
  } else if (body.toLowerCase().includes("<html")) {
    return `${body}${inlineStyles}${trackingElements}${unsubscribeLink}${manualTrackingInfo}`;
  }

  return `<html><head>${inlineStyles}</head><body>${body}${trackingElements}${unsubscribeLink}${manualTrackingInfo}</body></html>`;
};

const processScheduledCampaigns = async () => {
  console.log(
    `[${new Date().toISOString()}] 🔍 Checking for pending scheduled campaigns...`,
  );

  try {
    const scheduledSteps = await db.ScheduledCampaign.findAll({
      where: {
        status: "pending",
        scheduledAt: { [Op.lte]: new Date() },
      },
      include: [
        {
          model: db.Campaign,
          as: "campaign",
          where: { status: "active" },
          required: true,
        },
        {
          model: db.EmailTemplate,
          as: "template",
        },
        {
          model: db.SenderList,
          as: "senderList",
          include: [{ model: db.Sender, as: "senders" }],
        },
      ],
    });

    if (scheduledSteps.length === 0) {
      console.log(
        `[${new Date().toISOString()}] ✅ No pending campaigns to process.`,
      );
      return;
    }

    for (const step of scheduledSteps) {
      const { campaign, recipient, template, senderList } = step;

      if (!recipient?.email) {
        console.warn(
          `⚠️ Missing recipient email in step ID ${step.id}, skipping...`,
        );
        continue;
      }

      const recipientEmail = recipient.email;
      console.log(
        `📤 Preparing to send to: ${recipientEmail} for Campaign ID: ${campaign.id}`,
      );

      const tracker = await db.CampaignTracker.findOne({
        where: { scheduledCampaignId: step.id },
      });

      if (tracker?.sentAt) {
        console.log(`⏭️ Already sent to ${recipientEmail}, skipping...`);
        continue;
      }

      const senders = senderList?.senders || [];
      if (senders.length === 0) {
        console.warn(
          `⚠️ No senders available in sender list ${step.senderListId}, skipping...`,
        );
        continue;
      }

      let sender;

      const previousTracker = await db.CampaignTracker.findOne({
        where: {
          senderEmail: { [Op.ne]: null },
        },
        include: [
          {
            model: db.ScheduledCampaign,
            as: "campaign",
            required: true,
            where: {
              campaignId: campaign.id,
              id: { [Op.ne]: step.id },
              recipient: { [Op.contains]: { id: recipient.id } },
            },
          },
        ],
      });

      if (previousTracker?.senderEmail) {
        sender = senders.find((s) => s.email === previousTracker.senderEmail);
        if (sender) {
          console.log(
            `🔁 Reusing sender ${sender.email} for ${recipientEmail}`,
          );
        } else {
          console.warn(
            `⚠️ Previous sender ${previousTracker.senderEmail} not in current sender list. Falling back to round-robin.`,
          );
        }
      }

      if (!sender) {
        const nextIndex = (campaign.lastSenderIndex + 1) % senders.length;
        sender = senders[nextIndex];
        campaign.lastSenderIndex = nextIndex;
        await campaign.save();
        console.log(`🎯 Selected sender (round-robin): ${sender.email}`);
      }

      if (!template?.content) {
        console.warn(
          `⚠️ Missing template content for step ${step.id}, skipping...`,
        );
        continue;
      }

      const placeHolders = [
        "{{name}}",
        "{{company}}",
        "{{designation}}",
        "{{industry}}",
        "{{city}}",
        "{{state}}",
      ];
      let emailContent = template.content;

      placeHolders.forEach((placeholder) => {
        switch (placeholder) {
          case "{{name}}":
            emailContent = emailContent.replace(
              placeholder,
              recipient.name || "User",
            );
            break;
          case "{{company}}":
            emailContent = emailContent.replace(
              placeholder,
              recipient.organisation.name || "",
            );
            break;
          case "{{designation}}":
            emailContent = emailContent.replace(
              placeholder,
              recipient.organisation.title || "",
            );
            break;
          case "{{industry}}":
            emailContent = emailContent.replace(
              placeholder,
              recipient.organisation.industry || "",
            );
            break;
          case "{{country}}":
            emailContent = emailContent.replace(
              placeholder,
              recipient.country || "",
            );
            break;
          case "{{city}}":
            emailContent = emailContent.replace(
              placeholder,
              recipient.city || "",
            );
            break;
          case "{{state}}":
            emailContent = emailContent.replace(
              placeholder,
              recipient.state || "",
            );
            break;
          default:
            break;
        }
      });

      //const unsubscribeLink = generateUnsubscribeUrl(recipient.email, step.id);
      emailContent = addTrackingPixel(emailContent, step.id, recipient.email);

      try {
        const replyTo = `${sender.email}`; // setup catch-all inbox
        console.log("emailContent", emailContent);
        await sendEmail(
          sender.email,
          recipientEmail,
          template.subject,
          emailContent,
          replyTo,
        );

        await db.CampaignTracker.update(
          { sentAt: new Date(), senderEmail: sender.email },
          { where: { scheduledCampaignId: step.id } },
        );

        step.status = "completed";
        await step.save();

        console.log(`✅ Email sent to ${recipientEmail} using ${sender.email}`);
      } catch (err) {
        console.error(
          `❌ Failed to send email to ${recipientEmail} using ${sender.email}:`,
          err.message,
        );
        step.status = "failed";
        await step.save();
      }

      // After processing the step, check if all steps of the campaign are completed
      const allStepsCompleted = await db.ScheduledCampaign.count({
        where: { campaignId: campaign.id, status: "completed" },
      });

      const totalSteps = await db.ScheduledCampaign.count({
        where: { campaignId: campaign.id },
      });

      if (allStepsCompleted === totalSteps) {
        await db.Campaign.update(
          { status: "completed" },
          { where: { id: campaign.id } },
        );
        console.log(`📝 Campaign ${campaign.id} marked as completed.`);
      }
    }
  } catch (error) {
    console.error("❌ Error processing campaigns:", error);
  }

  console.log(
    `[${new Date().toISOString()}] 🏁 Finished processing scheduled campaigns.`,
  );
};

const startCampaignScheduler = () => {
  // console.log("⏱️ Campaign scheduler started - runs every 30 seconds...");
  //cron.schedule("*/30 * * * * *", processScheduledCampaigns);
};

module.exports = { startCampaignScheduler };
