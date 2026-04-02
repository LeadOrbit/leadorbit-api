module.exports = (sequelize, DataTypes) => {
    const step = sequelize.define('Step', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      campaignId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      type: {
        type: DataTypes.ENUM('email', 'voice'),
        allowNull: false,
        defaultValue: 'email',
      },
      templateId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      scheduledAt: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      order: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
    }, {
      tableName: 'Steps',
      timestamps: true,
    });
  
    step.associate = (models) => {
      step.belongsTo(models.Campaign, {
        foreignKey: 'campaignId',
        as: 'campaign',
      });
      step.belongsTo(models.EmailTemplate, {
        foreignKey: 'templateId',
        as: 'template',
      });
    };
  
    return step;
  };
  