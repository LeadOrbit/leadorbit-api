require("dotenv").config();
const { Sequelize } = require("sequelize");

const sequelize = new Sequelize(process.env.DB_URL, {
  dialect: "postgres",
  logging: process.env.NODE_ENV === "development" ? console.log : false,

  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false,
    },
  },

  pool: {
    max: 5,
    min: 0,
    acquire: 30000, // wait 30 sec before timeout
    idle: 10000,
  },

  retry: {
    max: 5,
  },
});

sequelize
  .authenticate()
  .then(() => console.log("Database connection established successfully"))
  .catch((err) => {
    console.error("Error connecting to the database:", err.message);
  });

module.exports = sequelize;
