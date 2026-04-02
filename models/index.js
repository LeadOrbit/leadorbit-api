const { Sequelize, DataTypes } = require('sequelize');
const sequelize = require('../config/db.config.js');
// const email_logs = require('./email_logs.model.js');
// const blocked_emails = require('./blocked_emails.model.js');
// const email_templates = require('./email_templates.model.js');
// const user = require('./user.model.js');
// const email_senders = require('./email_senders.model.js');
// const campaign_senders = require('./campaign_senders.model.js');
// const email_campaigns = require('./email_compaign.model.js');

const db = {};
db.Sequelize = Sequelize;
db.sequelize = sequelize;
// db.email_log = email_logs;
// db.blocked_email = blocked_emails;
// db.email_template = email_templates;
// db.email_sender = email_senders;
// db.campaign_sender = campaign_senders;
// db.email_campaign = email_campaigns;

db.User = require('./user.model.js')(sequelize, DataTypes);
db.CompanyList = require('./dataSource/companyList.model.js')(sequelize, DataTypes);
db.ContactList = require('./dataEnrichment/contactList.model.js')(sequelize, DataTypes);
db.Credentials = require('./dataEnrichment/credentials.model.js')(sequelize, DataTypes);
db.Notification = require('./notification.model.js')(sequelize, DataTypes);
db.Smtp = require('./smtp.model.js')(sequelize, DataTypes);
db.SenderList = require('./senderList.model')(sequelize, DataTypes);
db.Sender = require('./sender.model')(sequelize, DataTypes);
db.Campaign = require('./campaign/campaign.model.js')(sequelize, DataTypes);
db.EmailTemplate = require('./campaign/emailTemplate.model.js')(sequelize, DataTypes);
db.ScheduledCampaign = require('./campaign/scheduledCampaign.model.js')(sequelize, DataTypes);
db.CampaignTracker = require('./campaign/campaignTracker.model.js')(sequelize, DataTypes);
db.Step = require("./campaign/step.model.js")(sequelize, DataTypes);
db.UnsubscribedUsers = require('./campaign/unsubscribedUsers.model.js')(sequelize, DataTypes);
// Setup associations
Object.values(db).forEach((model) => {
    if (model.associate) model.associate(db);
});

module.exports = db;