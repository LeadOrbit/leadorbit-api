// models/sender.model.js
module.exports = (sequelize, DataTypes) => {
    const Sender = sequelize.define('Sender', {
      email: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      limit: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
    });
  
    Sender.associate = (models) => {
      Sender.belongsTo(models.SenderList, {
        foreignKey: 'senderListId',
        as: 'list',
      });
    };
  
    return Sender;
  };
  