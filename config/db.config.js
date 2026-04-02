const { Sequelize } = require("sequelize");

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: "postgres",
  logging: process.env.NODE_ENV === "development" ? console.log : false,
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false,
    },
  },
  retry: {
    max: 5,
    timeout: 5000,
  },
});

sequelize
  .authenticate()
  .then(() => console.log("Database connection established successfully"))
  .catch((err) => {
    console.error("Error connecting to the database:", err.message);
  });

module.exports = sequelize;
