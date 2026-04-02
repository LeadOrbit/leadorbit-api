const { scrapping } = require('../../utils/webscrapping');

async function getDataFrom_Linkedin(filters, limit = 10, source) {
    const { searchType, keywords = '' } = filters;
    const encodedKeywords = encodeURIComponent(keywords.trim());

    let url;
    let result;
    console.log("searchType", searchType);
    console.log("keywords", keywords);

    console.log("filters", filters);

    try {
        if (searchType === "jobs") {
            url = `https://www.linkedin.com/jobs/search/?keywords=${encodedKeywords}&origin=JOBS_HOME_KEYWORD_AUTOCOMPLETE&refresh=true`;
            result = await scrapping.jobs_scraping(url, limit, source);
        } else if (searchType === "people") {
            url = `https://www.linkedin.com/search/results/people/?keywords=${encodedKeywords}&origin=FACETED_SEARCH&sid=vqs`;
            result = await scrapping.peopleScraping(url, limit);
        } else {
            // default to company search
            url = `https://www.linkedin.com/search/results/companies/?keywords=${encodedKeywords}&origin=SWITCH_SEARCH_VERTICAL&sid=tT%40`;
            result = await scrapping.companies_scrapping(url, limit, source);
        }

        return result;
    } catch (err) {
        console.error("LinkedIn scraping failed:", err);
        return [];
    }
}

module.exports = getDataFrom_Linkedin;
