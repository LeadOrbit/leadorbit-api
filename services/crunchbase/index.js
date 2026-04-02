const puppeteer = require('puppeteer');

const scrapeCrunchbaseCompanies = async (searchURL, limit = 50) => {
    const browser = await puppeteer.launch({ headless: false }); // set true to run in background
    const page = await browser.newPage();

    try {
        await page.goto(searchURL, { waitUntil: 'domcontentloaded', timeout: 60000 });

        // Scroll to load more results (Crunchbase loads dynamically)
        let companies = [];
        let prevHeight = 0;

        while (companies.length < limit) {
            // Scroll and wait
            await page.evaluate('window.scrollTo(0, document.body.scrollHeight)');
            await page.waitForTimeout(3000);

            // Extract company data
            const newCompanies = await page.evaluate(() => {
                const rows = document.querySelectorAll('.card-content');
                const scraped = [];

                rows.forEach(row => {
                    const nameEl = row.querySelector('a.component--field-formatter.link-accent');
                    const descriptionEl = row.querySelector('.description');

                    const name = nameEl?.innerText || '';
                    const profileLink = nameEl?.href || '';
                    const description = descriptionEl?.innerText || '';

                    if (name && profileLink) {
                        scraped.push({ name, profileLink, description });
                    }
                });

                return scraped;
            });

            // Add unique new companies
            newCompanies.forEach(company => {
                if (!companies.find(c => c.profileLink === company.profileLink)) {
                    companies.push(company);
                }
            });

            // Break if we can't scroll further
            const newHeight = await page.evaluate('document.body.scrollHeight');
            if (newHeight === prevHeight) break;
            prevHeight = newHeight;
        }

        return companies.slice(0, limit);
    } catch (err) {
        console.error('❌ Scraping failed:', err);
        return [];
    } finally {
        await browser.close();
    }
};

// 🧪 Example usage
scrapeCrunchbaseCompanies('https://www.crunchbase.com/discover/organization.companies', 30)
    .then(companies => {
        console.log('✅ Scraped companies:', companies);
    });
