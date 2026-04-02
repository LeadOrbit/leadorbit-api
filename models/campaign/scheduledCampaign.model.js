module.exports = (sequelize, DataTypes) => {
    const ScheduledCampaign = sequelize.define('ScheduledCampaign', {
      campaignId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      enrichedListId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      campaignType: {
        type: DataTypes.ENUM('email', 'voice'),
        allowNull: false,
      },
      senderListId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      scheduledAt: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      templateId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM('pending', 'completed'),
        allowNull: false,
      },
      recipient: {
        type: DataTypes.JSONB,
        allowNull: false,
      },
      stepId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
    }, {
      timestamps: true,
    });
  
    ScheduledCampaign.associate = (models) => {
      ScheduledCampaign.belongsTo(models.SenderList, {
        foreignKey: 'senderListId',
        as: 'senderList',
      });
  
      ScheduledCampaign.belongsTo(models.EmailTemplate, {
        foreignKey: 'templateId',
        as: 'template',
      });
  
      ScheduledCampaign.belongsTo(models.Campaign, {
        foreignKey: 'campaignId',
        as: 'campaign',
      });
  
      ScheduledCampaign.belongsTo(models.Step, {
        foreignKey: 'stepId',
        as: 'step',
      });
    };
  
    return ScheduledCampaign;
  };
  