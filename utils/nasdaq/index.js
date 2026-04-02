const puppeteer = require('puppeteer');

async function scrapeNasdaqViaBrowser({ limit = 100, ...params }) {
    const browser = await puppeteer.launch({
        headless: 'new',
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-features=IsolateOrigins,site-per-process',
            '--disable-web-security',
            '--disable-blink-features=AutomationControlled',
        ],
    });

    const page = await browser.newPage();

    await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
        '(KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
    );

    await page.setViewport({ width: 1280, height: 800 });

    const results = [];
    let offset = 0;

    while (results.length < limit) {
        const queryParams = new URLSearchParams({
            ...params,
            tableonly: false,
            limit: 25,
            offset,
        }).toString();

        const url = `https://api.nasdaq.com/api/screener/stocks?${queryParams}`;
        console.log(`📡 Fetching: ${url}`);

        const data = await page.evaluate(async (url) => {
            const res = await fetch(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0',
                    'Accept': 'application/json',
                    'Origin': 'https://www.nasdaq.com',
                    'Referer': 'https://www.nasdaq.com/',
                },
            });
            const json = await res.json();
            return json?.data?.table?.rows || [];
        }, url);

        if (!data.length) {
            console.warn('⚠️ No more data returned, breaking');
            break;
        }

        results.push(...data);
        offset += data.length;
    }

    await browser.close();
    return results.slice(0, limit);
}

module.exports=scrapeNasdaqViaBrowser