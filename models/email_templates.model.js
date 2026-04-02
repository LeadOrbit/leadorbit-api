const { DataTypes } = require("sequelize");
const sequelize = require("../config/db.config.js");

const email_templates = sequelize.define(
  "email_templates",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    subject: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    body: {
      type: DataTypes.TEXT,
      allowNull: false,
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

module.exports = email_templates;
