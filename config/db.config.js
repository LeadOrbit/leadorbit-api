const { Sequelize } = require("sequelize");

const sequelize = new Sequelize(
  process.env.DB_NAME || "emailautomation", // Ensure this is "emailautomation"
  process.env.DB_USER || "postgres",
  process.env.DB_PASSWORD || "admin",
  {
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "5432", 10),
    dialect: "postgres",
    logging: process.env.NODE_ENV === "development" ? console.log : false,
    retry: {
      max: 5, // Maximum retry attempts
      timeout: 5000 // Timeout between retries (ms)
    },
    dialectOptions: process.env.DB_SSL === "true" ? {
      ssl: { 
        rejectUnauthorized: false 
      }
    } : {}
  }
);

sequelize.authenticate()
  .then(() => console.log("Database connection established successfully"))
  .catch(err => {
    console.error("Error connecting to the database:", err.message);
  });

module.exports = sequelize;
