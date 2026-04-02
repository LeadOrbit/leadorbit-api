
const express = require("express");

const { extractDataFromTargetSource, getExtractionJobsList, getExtractionData, deleteExtractedDataList, } = require("../controllers/data-source.controller");

const router = express.Router();


router.post('/extract-data',extractDataFromTargetSource);

router.get('/extraction-jobs-list',getExtractionJobsList);

router.post('/extraction-data', getExtractionData);

router.delete('/delete-extraction-data/:extractionId', deleteExtractedDataList);






module.exports=router