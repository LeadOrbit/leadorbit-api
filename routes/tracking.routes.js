// routes/tracking.js
const express = require('express');
const db = require('../models');

const router = express.Router();

// Tracking open event
// Express.js route for tracking open
router.get('/open/:recipientId/:trackingId', async (req, res) => {
    const { recipientId, trackingId } = req.params;
    console.log("req.params", req.params)

    if (recipientId && trackingId) {
        // Log the open event in your database

        const tracker = await db.CampaignTracker.findOne({ where: { scheduledCampaignId: trackingId } });
        console.log("tracker", tracker)
        if (tracker && !tracker.openedAt) {
            tracker.openedAt = new Date();
            await tracker.save();
        }
    }

    // Send a 1x1 transparent GIF as the tracking pixel
    const pixel = Buffer.from('R0lGODlhAQABAIAAAAUEBAQAAACH5BAEKAAAALAAAAAABAAEAAAICRAEAOw==', 'base64');
    res.setHeader('Content-Type', 'image/gif');
    res.status(200).send(pixel);
});


// Tracking click event
router.get('/click/:recipientId/:trackingId', async (req, res) => {
    const { recipientId, trackingId } = req.params;
    console.log("req.params", req.params);
    try {
        const tracker = await db.CampaignTracker.findOne({ where: { scheduledCampaignId: trackingId } });
        if (tracker && !tracker.clickedAt) {
            tracker.clickedAt = new Date();
            await tracker.save();
            console.log(`📱 Link clicked: ${trackingId}`);
        }
    } catch (err) {
        console.error('Error tracking click:', err.message);
    }

    // Redirect to your desired landing page
    res.redirect(process.env, FRONTEND_URL);
});

router.post('/unsubscribe/:recipientId/:trackingId', async (req, res) => {
    const { recipientId, trackingId } = req.params;
  
    try {
      const tracker = await db.CampaignTracker.findOne({
        where: { scheduledCampaignId: trackingId }
      });
  
      const scheduled = await db.ScheduledCampaign.findByPk(trackingId);
  
      if (!tracker || !scheduled) {
        return res.status(404).send('Invalid unsubscribe link.');
      }
  
      if (!tracker.unsubscribedAt) {
        tracker.unsubscribedAt = new Date();
        tracker.unsubscriptionReason = 'user_clicked_link';
          //await tracker.save();
  
        const recipientEmail = scheduled.recipient?.email || recipientId;
        console.log(`❌ Unsubscribed: ${recipientEmail}`);
  
          // await db.UnsubscribedUsers.create({
          //   unsubscribedAt: tracker.unsubscribedAt,
          //   unsubscriptionReason: tracker.unsubscriptionReason,
          //   email: recipientEmail
          // });

        // 🔥 Update all scheduled campaigns with matching recipient.email (JSONB field)
          // await db.ScheduledCampaign.update(
          //   { status: 'Unsubscribed' },
          //   {
          //     where: db.Sequelize.where(
          //       db.Sequelize.json('recipient.email'),
          //       recipientId
          //     )
          //   }
          // );
      }
  
      res.send('You have been unsubscribed successfully.');
    } catch (err) {
      console.error('Error tracking unsubscribe:', err.message);
      res.status(500).send('Something went wrong.');
    }
  });
  
  

// Tracking reply event (via email handling)
router.post('/replied/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const tracker = await db.CampaignTracker.findOne({ where: { scheduledCampaignId: id } });
        if (tracker && !tracker.repliedAt) {
            tracker.repliedAt = new Date();
            await tracker.save();
            console.log(`💬 Email replied: ${id}`);
        }
    } catch (err) {
        console.error('Error tracking reply:', err.message);
    }

    // Respond with a confirmation or any custom logic
    res.send('Thank you for your reply!');
});

module.exports = router;
