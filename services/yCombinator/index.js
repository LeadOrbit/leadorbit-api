const { scrapping } = require('../../utils/webscrapping');

async function getDataFrom_YCombinator(filters = {}, limit = 10) {
    const { batch, industry, isHiring, companySize, region } = filters;

    const queryParams = [];

    if (isHiring) queryParams.push(`isHiring=${isHiring}`);
    if (batch?.trim()?.length) queryParams.push(`batch=${encodeURIComponent(batch)}`);
    if (region?.trim()?.length) queryParams.push(`regions=${encodeURIComponent(region)}`);
    if (industry?.trim()?.length) queryParams.push(`industry=${encodeURIComponent(industry)}`);

    if (companySize && typeof companySize === 'string' && companySize.includes('-')) {
        const [min, max] = companySize.split('-').map(s => s.trim());
        const encodedSize = encodeURIComponent(JSON.stringify([min, max]));
        queryParams.push(`team_size=${encodedSize}`);
    }

    const queryString = queryParams.length > 0 ? `?${queryParams.join('&')}` : '';
    const url = `https://www.ycombinator.com/companies${queryString}`;

    console.log("url", url);

    try {
        const result = await scrapping.scrapeYCombinatorCompanies(url, limit);
        return result;
    } catch (error) {
        console.error("Error fetching YCombinator data:", error);
        return [];
    }
}

module.exports = getDataFrom_YCombinator;
