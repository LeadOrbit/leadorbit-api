
module.exports = (sequelize, DataTypes) => {
    const campaignTracker = sequelize.define(
        "CampaignTracker",
        {
            id: {
                type: DataTypes.INTEGER,
                autoIncrement: true,
                primaryKey: true,
            },
            scheduledCampaignId:{
                type: DataTypes.INTEGER,
                allowNull:false
            },
            sentAt: {
                type: DataTypes.DATE,
                allowNull:true
            },
            openedAt: {
                type: DataTypes.DATE,
                allowNull:true
            },
            clickedAt: {
                type: DataTypes.DATE,
                allowNull:true
            },
            repliedAt: {
                type: DataTypes.DATE,
                allowNull:true
            },
            unsubscribedAt: {
                type: DataTypes.DATE,
                allowNull:true
            },
            unsubscriptionReason:{
                type: DataTypes.STRING,
                allowNull:true
            },
            senderEmail: {
                type: DataTypes.STRING,
                allowNull: true,
              }
              
        }, {
        timestamps: true, // Sequelize will automatically create 'createdAt' and 'updatedAt' columns
    }

    );
    campaignTracker.associate = (models) => {
        campaignTracker.belongsTo(models.ScheduledCampaign, {
          foreignKey: 'scheduledCampaignId',
          as: 'campaign',
        });   
      };
    return campaignTracker;
};
