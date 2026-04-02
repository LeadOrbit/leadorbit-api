
const express = require("express");
const { enrichmentWithApollo, getEnrichmentJobsList, getEnrichedData, deleteEnrichedDataList, getCredentials, saveOrUpdateCredentials } = require("../controllers/data-enrichment.controller");


const router = express.Router();


router.post('/enrich-data',enrichmentWithApollo);

router.get('/enrichment-jobs-list',getEnrichmentJobsList);

router.post('/enriched-data', getEnrichedData);

router.delete('/delete-enriched-data/:enrichmentId', deleteEnrichedDataList);

router.get('/credentials', getCredentials);

router.post('/save-credentials', saveOrUpdateCredentials);


module.exports=router