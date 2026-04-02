const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const getBrowser = async () => {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  return browser;
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Randomized delay function
const randomDelay = (min, max) => {
  const delay = Math.floor(Math.random() * (max - min + 1)) + min;
  return sleep(delay);
};

// Simulate human-like scrolling with pauses
async function autoScroll(page) {
  await page.evaluate(async () => {
    const distance = 300;
    let totalHeight = 0;
    const delay = () => new Promise(resolve => setTimeout(resolve, Math.random() * (200 - 100) + 100));
    const timer = setInterval(async () => {
      const scrollHeight = document.body.scrollHeight;
      window.scrollBy(0, distance);
      totalHeight += distance;

      if (totalHeight >= scrollHeight) {
        clearInterval(timer);
        resolve();
      }
      await delay(); // Simulate a human pause
    }, Math.random() * (300 - 200) + 200); // Human-like scroll interval
  });
}

const scrapeAppDeveloperUrls = async (url) => {
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await autoScroll(page);
    await page.waitForSelector('.provider__description a', { timeout: 30000 });

    const urls = await page.evaluate(() => {
      const data = [];
      const linkss = document.querySelectorAll('.provider__description a');
      linkss.forEach((l) => {
        const href = l.getAttribute('href');
        if (href && href.startsWith('/profile/')) {
          data.push(`https://clutch.co${href}`);
        }
      });
      return data;
    });

    return { total: urls.length, urls };
  } catch (err) {
    console.error('Error in scrapeAppDeveloperUrls:', err);
  } finally {
    await browser.close();
  }
};

const scrapeReviewsFromPage = async (page, url) => {
  try {
    const safeUrl = encodeURI(url);
    await page.goto(safeUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await autoScroll(page);

    await randomDelay(5000, 10000); // Simulate random waiting time to load dynamic content

    await page.waitForSelector('.profile-review', { timeout: 30000 });

    const reviews = await page.evaluate(() => {
      const data = [];
      const reviewEls = document.querySelectorAll('.profile-review');

      reviewEls.forEach((el) => {
        const name =
          el.querySelector('.reviewer_card__name')?.innerText.trim() ||
          el.querySelector('.reviewer_card--name')?.innerText.trim() || '';
        const position = el.querySelector('.reviewer_position')?.innerText.trim() || '';
        const reviewText = el.querySelector('.profile-review__quote')?.innerText.trim() || '';
        const title = el.querySelector('.profile-review__title')?.innerText.trim() || '';
        const date = el.querySelector('.profile-review__date')?.innerText.trim() || '';
        const rating = el.querySelector('.stars')?.getAttribute('data-rating') || 'N/A';

        const reviewerListItems = el.querySelectorAll('ul.reviewer_list li');
        const reviewerInfo = Array.from(reviewerListItems).map((li) => li.innerText.trim());

        const [industry, location, clientSize, reviewType, verification] = reviewerInfo.length >= 5
          ? reviewerInfo
          : [null, null, null, null, null];

        // Only push to data if both name and position are available
        if (name?.trim()?.length && name!="Anonymous" && position?.trim()?.length) {
          data.push({
            name,
            position,
            title,
            date,
            reviewText,
            rating,
            industry,
            location,
            clientSize,
            reviewType,
            verification,
            sourceUrl: window.location.href,
          });
        }
      });

      return data;
    });

    return reviews;
  } catch (err) {
    console.error(`Error scraping reviews from ${url}:`, err.message);
    const htmlContent = await page.content();
    console.log(`HTML snippet for ${url}:`, htmlContent.slice(0, 1000)); // Log first 1000 chars for more context
    return [];
  }
};


const scrapeMultipleReviews = async (url, limit, startPage = 0) => {
  const browser = await getBrowser();
  const page = await browser.newPage();
  let currentPage = startPage && !isNaN(startPage) && startPage >= 0 ? parseInt(startPage) : 0;
  const allReviews = [];
  const maxLimit = limit && !isNaN(limit) && limit > 0 ? parseInt(limit) : Infinity;

  try {
    while (true) {
      const pageUrl = currentPage === 0 ? url : `${url}${url.includes('?') ? '&' : '?'}page=${currentPage}`;
      console.log(`Fetching profile URLs from page ${currentPage}: ${pageUrl}`);

      try {
        const safeUrl = encodeURI(pageUrl);
        await page.goto(safeUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
      } catch (err) {
        console.error(`Failed to load page ${currentPage}:`, err.message);
        break;
      }

      await autoScroll(page);
      await randomDelay(2000, 5000); // Adding small delay to mimic human loading time

      await page.waitForSelector('.sg-pagination-v2', { timeout: 5000 });

      let profileUrls = [];
      try {
        await page.waitForSelector('.provider__description a', { timeout: 120000 });
        profileUrls = await page.evaluate(() => {
          const data = [];
          const linkss = document.querySelectorAll('.provider__description a');
          linkss.forEach((l) => {
            const href = l.getAttribute('href');
            if (href && href.startsWith('/profile/')) {
              data.push(`https://clutch.co${href}`);
            }
          });
          return data;
        });
      } catch (err) {
        console.error(`Failed to find provider links on page ${currentPage}:`, err.message);
        break; // Stop pagination if provider links aren't found
      }

      if (!profileUrls.length) {
        console.log('No more profile URLs found, stopping pagination.');
        break;
      }

      for (const profileUrl of profileUrls) {
        if (allReviews.length >= maxLimit) {
          console.log(`Limit of ${maxLimit} reviews reached, stopping further scraping.`);
          break;
        }

        console.log(`Scraping reviews from: ${profileUrl}`);
        const reviewPage = await browser.newPage();
        try {
          const reviews = await scrapeReviewsFromPage(reviewPage, profileUrl);
          allReviews.push(...reviews.slice(0, maxLimit - allReviews.length));
        } catch (err) {
          console.error(`Error scraping reviews from ${profileUrl}:`, err.message);
        } finally {
          await reviewPage.close();
          await randomDelay(3000, 7000); // Delay between scraping reviews to mimic human behavior
        }
      }

      if (allReviews.length >= maxLimit) {
        break;
      }

      const nextButton = await page.$('a.sg-pagination-v2-next');
      let hasNextPage = false;
      if (nextButton) {
        const isDisabled = await page.evaluate((el) => el.classList.contains('disabled'), nextButton);
        hasNextPage = !isDisabled;
        console.log(`Next button state: ${hasNextPage ? 'Enabled' : 'Disabled'}`);
      }

      if (!hasNextPage) {
        console.log('No more pages to scrape.');
        break;
      }

      currentPage++;
      await randomDelay(3000, 5000); // Random delay between pages
    }

    return { total: allReviews.length, reviews: allReviews };
  } catch (err) {
    console.error('Error in scrapeMultipleReviews:', err);
  } finally {
    await browser.close();
  }
};

async function getDataFromClutch(filters, limit, source) {
  const { url } = filters;
  const result = await scrapeMultipleReviews(url, limit);
  return result?.reviews;
}

module.exports = getDataFromClutch;
