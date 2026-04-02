const { DataTypes } = require("sequelize");
const sequelize = require("../config/db.config.js");

const email_campaigns = sequelize.define(
  "email_campaigns",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    automation_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    list_uri: {
      type: DataTypes.STRING(500),
      allowNull: false,
    },
    template_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    completed_on: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: sequelize.literal("CURRENT_TIMESTAMP"),
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: sequelize.literal("CURRENT_TIMESTAMP"),
    },
  },
  {
    timestamps: false, // Prevents Sequelize from automatically adding timestamps
    createdAt: false,
    updatedAt: false,
  }
);

module.exports = email_campaigns;
