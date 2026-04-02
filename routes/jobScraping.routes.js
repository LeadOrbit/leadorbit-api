const express = require("express");
const { scrappedDataController } = require("../controllers/scrapedData.controller");

const scrapedJobsroute = express.Router();

scrapedJobsroute.post("/", scrappedDataController.getAllJobsDetails);
scrapedJobsroute.post("/companies", scrappedDataController.getComapaniesDetails);

module.exports = scrapedJobsroute;
