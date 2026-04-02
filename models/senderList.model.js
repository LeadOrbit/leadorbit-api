// models/senderList.model.js
module.exports = (sequelize, DataTypes) => {
    const SenderList = sequelize.define('SenderList', {
      name: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
    });
  
    SenderList.associate = (models) => {
      SenderList.hasMany(models.Sender, {
        as: 'senders',
        foreignKey: 'senderListId',
        onDelete: 'CASCADE',
      });
    };
  
    return SenderList;
  };
  