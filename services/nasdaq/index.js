const scrapeNasdaqViaBrowser = require("../../utils/nasdaq");

const getDataFrom_NASDAQ = async (filters, limit) => {
    try {
        const results = await scrapeNasdaqViaBrowser({ ...filters, limit });
        return results;
    } catch (error) {
        console.error("❌ Error at getDataFrom_NASDAQ:", error.message);
        throw error;
    }
};

module.exports=getDataFrom_NASDAQ