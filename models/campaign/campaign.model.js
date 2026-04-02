module.exports = (sequelize, DataTypes) => {
  const campaign = sequelize.define('Campaign', {
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    type: {
      type: DataTypes.ENUM('email', 'voice'),
      allowNull: false,
    },
    description: {
      type: DataTypes.STRING,
    },
    senderListId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    enrichedListId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('draft', 'active', 'completed', 'paused'),
      defaultValue: 'draft',
    },
    lastSenderIndex: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: -1,
    },
    triggerTime: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  }, {
    timestamps: true,
  });
 campaign.associate = (models) => {
  campaign.hasMany(models.Step, {
    foreignKey: 'campaignId',
    as: 'steps',
  });
  campaign.hasMany(models.ScheduledCampaign, {
    foreignKey: 'campaignId',
    as: 'scheduledInstances',
  });
  
 }
  
  return campaign;
};
