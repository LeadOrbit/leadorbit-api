const { DataTypes } = require("sequelize");
const sequelize = require("../config/db.config.js");

const email_senders = sequelize.define(
  "email_senders",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    email_user: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    email_password: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    email_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    designation: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    address: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    limit: {
      type: DataTypes.STRING,
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

module.exports = email_senders;
