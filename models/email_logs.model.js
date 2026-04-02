const { DataTypes } = require("sequelize");
const sequelize = require("../config/db.config.js");

const Order_relays = sequelize.define(
  "email_logs",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    automation_name:{
      type: DataTypes.STRING,
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    uuid: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    email_id: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    subject: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    body: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    sender: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    email_delivered: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    email_oppened_on: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    clicked: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    website_visited: {
      type: DataTypes.BOOLEAN,
      default: false,
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

module.exports = Order_relays;
