const {
    getBrowser,
    getBrowserWithoutLogin,
} = require("../../config/puppeteer.config");
const { v4: uuid } = require("uuid");

const hiringTeamSelectors = {
    hiring_manager_name: ".hirer-card__hirer-information .jobs-poster__name",
    hiring_manager_title: ".hirer-card__hirer-information .text-body-small",
    hiring_manager_linkedin: ".hirer-card__hirer-information a",
};
const companySelectors = {
    company_linkedin: "link-without-visited-state",
    company_website: "org-page-navigation__item-anchor",
    company_phone: "",
    company_industry: "org-top-card-summary-info-list__info-item",
    company_size: "org-top-card-summary-info-list__info-item-link",
};

const fallbackCompanySelectors = {
    company_linkedin: ".link-without-visited-state",
    company_website: "span.link-without-visited-state", //1st node
    company_phone: "span.link-without-visited-state", //2nd node
    company_industry: ".t-14.mt5",
    company_size: ".jobs-company__inline-information", //first node
};
class Scrapping {
    profile_list_classes = {
        listItem: ".linked-area",
    };

    profilePageScraping = async (url, limit) => {
        let content = {};
        let browser = await getBrowser();

        const page = await browser.newPage();
        await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });

        await page.evaluate(async () => {
            window.scrollBy(0, document.body.scrollHeight);
            await new Promise((resolve) => setTimeout(resolve, 10000)); // wait for 3 seconds
        });

        const profilePage = await page.evaluate(async () => {
            window.scrollBy(document.body.scrollHeight, 0);
            await new Promise((resolve) => setTimeout(resolve, 3000));
            const items = document.getElementsByTagName("body");
            // return document.URL
            return Array.from(items).map((element, i) => {
                const url = Array.from(
                    element.querySelectorAll("#top-card-text-details-contact-info"),
                ).map((k) => k.getAttribute("href"))?.[0];
                const companyName = Array.from(
                    element.querySelectorAll('button[aria-label^="Current company: "]'),
                ).map((k) =>
                    k.querySelectorAll("span > div")?.[0]?.innerText.trim(),
                )?.[0];

                // Get the inner text of the div within the span inside that button
                const experienceListItem = [
                    element.querySelectorAll("li.artdeco-list__item")?.[0],
                ];
                const currentCompanyLink = Array.from(experienceListItem).map((k) =>
                    k
                        ?.querySelectorAll('a[data-field="experience_company_logo"]')?.[0]
                        ?.getAttribute("href"),
                );
                let jobDescription = Array.from(experienceListItem).map((k) =>
                    Array.from([
                        k?.querySelectorAll(".pvs-list__item--with-top-padding")?.[0],
                    ]).map(
                        (q) => q?.querySelectorAll(".visually-hidden")?.[0]?.innerText,
                    ),
                );
                return {
                    contactUrl: url,
                    companyName,
                    currentCompanyLink,
                    jobDescription,
                };
            });
        });
        content = profilePage;
        return content;
    };

    webscrapping = async (htmlContent, url, cookieData, size, source) => {
        let weburl = "https://www.linkedin.com";
        let content = [];

        try {
            let browser;
            browser = await getBrowserWithoutLogin();

            if (source === "ycombinator") {
                browser = await getBrowserWithoutLogin();
            } else {
                browser = await getBrowser();
            }
            const page = await browser.newPage();
            await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });

            // Verify that the cookies were set

            let paginationButtons = [];
            await page.evaluate(async () => {
                window.scrollBy(0, document.body.scrollHeight);
                await new Promise((resolve) => setTimeout(resolve, 15000)); // wait for 3 seconds
            });
            await page.waitForSelector(".artdeco-pagination__pages", {
                visible: true,
            });

            if (paginationButtons) {
                // Example: Get the text content of the element
                const textContent = await page.evaluate(
                    (el) => el.textContent,
                    paginationButtons,
                );
                console.log(textContent);
            } else {
                console.log("Element not found.");
            }

            paginationButtons = await page.evaluate(() => {
                // Select all elements with the 'data-test-pagination-page-btn' attribute
                const buttons = Array.from(
                    document.querySelectorAll("[data-test-pagination-page-btn]"),
                );

                // Map through the buttons to extract the page number (as text content)
                return buttons.map((button) =>
                    button.getAttribute("data-test-pagination-page-btn"),
                );
            });

            let length = paginationButtons.length;
            length = 1;
            // Iterate through each pagination button
            for (let i = 0; i < length; i++) {
                if (i > 0) {
                    await page.evaluate(async () => {
                        window.scrollBy(0, document.body.scrollHeight);
                        await new Promise((resolve) => setTimeout(resolve, 10000)); // wait for 3 seconds
                    });
                    await page.waitForSelector(".artdeco-pagination__pages", {
                        visible: true,
                    });
                    // Click on the pagination button
                    await page.evaluate((i) => {
                        document
                            .querySelectorAll(".artdeco-pagination__pages--number li button")
                        [i].click();
                    }, i);
                    console.log("page ", i + 1);

                    // Wait for network to be idle after the page loads
                }

                // Scrape the data on the current page
                const pageContent = await page.evaluate(async () => {
                    window.scrollBy(document.body.scrollHeight, 0);
                    await new Promise((resolve) => setTimeout(resolve, 3000));

                    const items = Array.from(
                        document.querySelectorAll(
                            '[data-view-name="search-entity-result-universal-template"]',
                        ),
                    ).length
                        ? document.querySelectorAll(
                            '[data-view-name="search-entity-result-universal-template"]',
                        )
                        : Array.from(
                            document.querySelectorAll(".reusable-search__result-container"),
                        ).length
                            ? document.querySelectorAll(".reusable-search__result-container")
                            : Array.from(document.querySelectorAll(".search-results-container"))
                                .length
                                ? document.querySelectorAll(".search-results-container")
                                : [];

                    return Array.from(items).map((element, i) => {
                        const name = element
                            .querySelectorAll(".app-aware-link span[aria-hidden='true']")?.[0]
                            ?.textContent?.trim()
                            ? element
                                .querySelectorAll(
                                    ".app-aware-link span[aria-hidden='true']",
                                )?.[0]
                                ?.textContent?.trim()
                            : Array.from(
                                element.querySelectorAll(
                                    "a[data-test-app-aware-link] span[aria-hidden='true']",
                                ),
                            ).map((k) => k.innerText)[0] || "";

                        const position = Array.from(
                            element.querySelectorAll(".entity-result__primary-subtitle"),
                        ).map((k) => k.innerText)[0];
                        const status = Array.from(
                            element.querySelectorAll(".entity-result__summary"),
                        ).map((k) => k.innerText)[0];
                        const image = Array.from(
                            element.querySelectorAll(".presence-entity__image"),
                        ).map((k) => k.getAttribute("src"))[0];
                        const url =
                            Array.from(element.querySelectorAll(".app-aware-link")).map((k) =>
                                k.getAttribute("href"),
                            )[0] ||
                            Array.from(
                                element.querySelectorAll("a[data-test-app-aware-link]"),
                            ).map((k) => k.getAttribute("href"))[0];

                        const location = Array.from(
                            element.querySelectorAll(".entity-result__secondary-subtitle"),
                        ).map((k) => k.innerText)[0];
                        const followers =
                            Array.from(
                                element.querySelectorAll(
                                    ".reusable-search-simple-insight__text",
                                ),
                            ).map((k) => k.innerText)[0] || "";

                        return {
                            id: i,
                            status,
                            location,
                            name,
                            position,
                            image,
                            url,
                            followers,
                        };
                    });
                });

                pageContent.filter((temObj) => {
                    if (temObj?.name != "" && temObj?.name) {
                        content.push(temObj);
                    }
                });
            }
            if (content?.length) {
                content = content.filter((k) => {
                    k.id = uuid();
                    return k;
                });
            }

            for (let index = 0; index < content.length; index++) {
                const element = content[index];
                if (
                    element?.url &&
                    element?.url != "" &&
                    element?.name != "" &&
                    element?.name
                ) {
                    let profileUrl = element?.url;

                    const profilePage = await this.profilePageScraping(page, profileUrl);
                    let contactPageUrl = profilePage?.[0]?.contactUrl;
                    let contactDetails = [];
                    if (contactPageUrl && contactPageUrl != "") {
                        contactPageUrl = weburl + contactPageUrl;
                        await page.goto(contactPageUrl, {
                            waitUntil: "domcontentloaded",
                            timeout: 60000,
                        });

                        await page.evaluate(async () => {
                            window.scrollBy(0, document.body.scrollHeight);
                            await new Promise((resolve) => setTimeout(resolve, 10000)); // wait for 3 seconds
                        });

                        const contactPage = await page.evaluate(async () => {
                            window.scrollBy(document.body.scrollHeight, 0);
                            await new Promise((resolve) => setTimeout(resolve, 3000));
                            const items = document.querySelectorAll("body");
                            return Array.from(items).map((element, i) => {
                                const allData = element.querySelectorAll(
                                    ".pv-contact-info__contact-type",
                                );

                                const linkElement = document.querySelectorAll(
                                    ".pv-profile-section__section-info a:not(.app-aware-link)",
                                );
                                const links = Array.from(linkElement).map((anchor) =>
                                    anchor.getAttribute("href"),
                                );

                                return {
                                    allData,
                                    links,
                                };
                            });
                        });
                        contactDetails.push(...contactPage);
                    }
                    element.profilePage = profilePage?.[0];
                    element.contactDetails = contactDetails?.[0];
                }
            }
        } catch (error) {
            console.log("🚀 ~ webscrapping ~ error:", error);
        }

        return content;
    };

    jobs_scraping = async (url, limit = 10, source) => {
        let browser;

        let companySelectors = { ...fallbackCompanySelectors };
        let storedSelectors = {
            ...hiringTeamSelectors,
            ...fallbackCompanySelectors,
        };

        try {
            browser =
                source === "ycombinator"
                    ? await getBrowserWithoutLogin()
                    : await getBrowser();

            const page = await browser.newPage();
            await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
            await page.waitForSelector("div.jobs-company__box", { timeout: 20000 });

            const response_data = [];
            let pageIndex = 1;

            while (response_data.length < limit) {
                // Simulate scrolling
                for (let j = 0; j < 6; j++) {
                    await page.mouse.move(172, 341);
                    await page.mouse.wheel({ deltaY: 400 + Math.random() * 200 });
                    await randomDelay();
                }

                // Extract job summaries
                const jobDetails = await page.evaluate(() => {
                    const found_details = [];
                    const elements = document.querySelectorAll(
                        "div.flex-grow-1.artdeco-entity-lockup__content.ember-view",
                    );
                    elements.forEach((element) => {
                        let obj = { job_title: "", job_link: "", company_name: "" };
                        const job_link = element.querySelector("a.disabled.ember-view");
                        if (job_link) {
                            const jobLinkHref = job_link.getAttribute("href");
                            if (jobLinkHref) {
                                obj.job_link = `https://www.linkedin.com${jobLinkHref}`;
                                obj.job_title = job_link.innerText.trim();
                            }
                        }
                        const company_name = element.querySelector(
                            ".artdeco-entity-lockup__subtitle.ember-view",
                        );
                        obj.company_name = company_name
                            ? company_name.innerText.trim()
                            : "";

                        if (obj.job_title) {
                            found_details.push(obj);
                        }
                    });
                    return found_details;
                });

                for (const job of jobDetails) {
                    if (response_data.length >= limit) break;

                    try {
                        // Open a new page for each job to get detailed info
                        const jobPage = await browser.newPage();
                        await jobPage.goto(job.job_link, {
                            waitUntil: "domcontentloaded",
                            timeout: 60000,
                        });

                        await jobPage.waitForSelector("div.jobs-company__box", {
                            timeout: 20000,
                        });

                        const details = await jobPage.evaluate((selectors) => {
                            function getElement(selector) {
                                if (!selector) return null;
                                return document.querySelector("." + selector);
                            }

                            function getInnerText(selector, defaultValue = "") {
                                const elem = getElement(selector);
                                return elem ? elem.innerText.trim() : defaultValue;
                            }

                            function getHref(selector, defaultValue = "") {
                                const elem = getElement(selector);
                                return elem ? elem.href || elem.innerText.trim() : defaultValue;
                            }

                            const details = {};

                            const safeGetText = (selector, index = 0) => {
                                const el = Array.isArray(selector)
                                    ? document.querySelectorAll(selector[0])[index]
                                    : document.querySelector(selector);
                                return el ? el.innerText.trim() : null;
                            };

                            const safeGetHref = (selector, index = 0) => {
                                const el = Array.isArray(selector)
                                    ? document.querySelectorAll(selector[0])[index]
                                    : document.querySelector(selector);
                                return el ? el.href : null;
                            };

                            details.hiring_manager_name = safeGetText(
                                selectors.hiring_manager_name,
                            );
                            details.hiring_manager_title = safeGetText(
                                selectors.hiring_manager_title,
                            );
                            details.hiring_manager_linkedin = safeGetHref(
                                selectors.hiring_manager_linkedin,
                            );
                            details.company_linkedin = safeGetHref(
                                [selectors.company_linkedin],
                                1,
                            );
                            details.company_industry = safeGetText(
                                selectors.company_industry,
                            );
                            details.company_size = safeGetText([selectors.company_size], 0);

                            return details;
                        }, storedSelectors);

                        // Use company_linkedin + '/about' to scrape additional data about the company
                        const companyPageUrl = `${details.company_linkedin}about`;

                        const companyPage = await browser.newPage();
                        await companyPage.goto(companyPageUrl, {
                            waitUntil: "domcontentloaded",
                            timeout: 60000,
                        });
                        await companyPage.waitForSelector("main");

                        const mainDivsContent = await companyPage.evaluate(() => {
                            const main = document.querySelector("main");
                            if (!main) return "";

                            const divs = main.querySelectorAll("div");
                            let content = "";
                            content += divs[1].outerHTML;

                            return content;
                        });

                        let companyDetails = {};
                        // Save AI response for future scraping
                        if (Object.keys(companySelectors).length === 0) {
                            try {
                                companyDetails = await companyPage.evaluate((selectors) => {
                                    function getElement(selector) {
                                        if (!selector) return null;
                                        return document.querySelector("." + selector);
                                    }

                                  function getInnerText(selector, defaultValue = "") {
                                      const elem = getElement(selector);
                                      return elem ? elem.innerText.trim() : defaultValue;
                                  }

                                  function getHref(selector, defaultValue = "") {
                                      const elem = getElement(selector);
                                      return elem
                                          ? elem.href || elem.innerText.trim()
                                          : defaultValue;
                                  }

                                  const details = {};

                                  details.company_website = document.querySelectorAll(
                                      selectors.company_website,
                                  )[1].innerText;
                                  details.company_phone = document.querySelectorAll(
                                      selectors.company_phone,
                                  )[2].innerText;

                                  return details;
                              }, companySelectors);
                            } catch (error) {
                                console.error("❌ Error saving AI response:", error);
                            }
                        }

                        // Merge company details with job details
                        Object.assign(job, details, companyDetails);
                        response_data.push(job);

                        await jobPage.close();
                        await companyPage.close();
                    } catch (err) {
                        console.error(`❌ Error scraping job: ${job.job_title}`, err);
                    }
                }

                if (response_data.length >= limit) break;

                // Check if next page exists
                const hasNextPage = await page.evaluate(() => {
                    const nextButton = document.querySelector(
                        "button.jobs-search-pagination__button--next",
                    );
                    return nextButton && !nextButton.disabled;
                });

                if (!hasNextPage) {
                    console.log("🚪 No next page found. Ending scrape.");
                    break;
                }

                // Click next page button
                await page.waitForSelector(
                    "button.jobs-search-pagination__button--next",
                    { timeout: 10000 },
                );
                await page.evaluate(() => {
                    const nextButton = document.querySelector(
                        "button.jobs-search-pagination__button--next",
                    );
                    nextButton && nextButton.click();
                });

                await randomDelay(4000, 6000);
                pageIndex++;
            }

            console.log(`🎯 Total jobs scraped: ${response_data.length}`);

            return response_data;
        } catch (error) {
            console.error("❌ Fatal error during scraping:", error);
            return [];
        } finally {
            //await browser.close();
        }
    };

    companies_scrapping = async (url, total_record = 1, source) => {
        let browser;
        if (source === "ycombinator") {
            browser = await getBrowserWithoutLogin();
        } else {
            browser = await getBrowser();
        }
        const page = await browser.newPage();
        try {
            await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });

            await page.evaluate(() => {
                const cursor = document.createElement("div");
                cursor.style.position = "fixed";
                cursor.style.width = "10px";
                cursor.style.height = "10px";
                cursor.style.backgroundColor = "red";
                cursor.style.borderRadius = "50%";
                cursor.style.pointerEvents = "none";
                cursor.style.zIndex = "9999";
                document.body.appendChild(cursor);

                document.addEventListener("mousemove", (e) => {
                    cursor.style.left = `${e.clientX}px`;
                    cursor.style.top = `${e.clientY}px`;
                });
            });
            await new Promise((resolve) => setTimeout(resolve, 2000));
            let scrapped_data = [];
            await page.waitForSelector("a._company_i9oky_355", {
                timeout: 20000,
            }); scrapped_data = await page.evaluate(async (total) => {
                let content = [];
                let firstElement = document.querySelector("a._company_i9oky_355");
                if (!firstElement) return;

                for (let i = 0; i < +total; i++) {
                    let obj = {
                        company_name: "",
                        company_link: "",
                    };
                    obj.company_name = firstElement.querySelector(
                        "span._coName_i9oky_470",
                    ).innerText;
                    obj.company_link = firstElement.href;
                    let nextElement = firstElement.nextElementSibling;

                    if (nextElement) {
                        nextElement.scrollIntoView({ behavior: "smooth", block: "center" });
                        firstElement = nextElement; // Move to the next element
                    }

                    content.push(obj);
                    await new Promise((resolve) => setTimeout(resolve, 200));
                }
                return content;
            }, total_record);
            await page.close();
            // Navigate to each job link
            let response_data = [];
            function getDomain(url) {
                return new URL(url).hostname.replace("www.", ""); // Removes 'www.' if present
            }

            for (const company of scrapped_data) {
                const companyPage = await browser.newPage();

                try {
                    await companyPage.setUserAgent(
                        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36",
                    );

                    await companyPage.setExtraHTTPHeaders({
                        "Accept-Language": "en-US,en;q=0.9",
                    });

                    await companyPage.goto(company.company_link, {
                        waitUntil: "networkidle2",
                        timeout: 60000,
                    });

                    // Extract the company link from the detail page
                    let company_website = await companyPage.evaluate(() => {
                        let element = document.querySelector(
                            ".group.flex.flex-row.items-center.px-3.leading-none.text-linkColor",
                        );
                        return element ? element.innerText.trim() : null;
                    });

                    company.company_website = company_website || ""; // Fallback to the original link if null
                    company.company_domain = getDomain(company_website) || ""; // Fallback to the original link if null
                    response_data.push(company);
                } catch (error) {
                    console.log(`Error scraping ${company}:`, error);
                } finally {
                    await companyPage.close();
                }
            }
            return response_data;
        } catch (error) {
            console.log("🚀 ~ app.post ~ error:", error);
            return [];
        } finally {
            //await browser.close();
        }
    };

    peopleScraping = async (searchUrl, limit = 10) => {
        let content = [];
        let scrapedCount = 0;
        const browser = await getBrowser();
        const page = await browser.newPage();

        try {
            await page.goto(searchUrl, {
                waitUntil: "domcontentloaded",
                timeout: 60000,
            });

            // Loop until the limit is reached
            while (scrapedCount < limit) {
                // Scroll down to load more profiles (in case of infinite scroll)
                await autoScroll(page);

                await page.waitForSelector(".search-results-container", {
                    timeout: 20000,
                });

                // Scrape data from the current page
                const peopleData = await page.evaluate(
                    (limit, scrapedCount) => {
                    const results = [];
                        const container = document.querySelector(
                            ".search-results-container",
                        );
                    if (!container) return results;

                        const lis = container.querySelectorAll("li");
                    let count = scrapedCount;

                        const removeQueryParams = (url) => {
                            return url.split('?')[0];
                        }

                    for (const li of lis) {
                        if (count >= limit) break;

                        // Find profile name
                        const nameAnchor = li.querySelector(
                            'a[data-test-app-aware-link] span[aria-hidden="true"]',
                        );
                        const profileAnchor = li.querySelector(
                            "a[data-test-app-aware-link]",
                        );
                        const name = nameAnchor?.innerText?.trim();
                        const profileUrl = profileAnchor?.href;

                        // Find title/designation
                        const designationDiv = li.querySelector(
                            "div.t-14.t-black.t-normal",
                        );
                        const designation = designationDiv?.innerText?.trim();

                        // Find location
                        const locationDiv = li.querySelector(
                            "div.t-14.t-normal:not(.t-black)",
                        );
                        const location = locationDiv?.innerText?.trim() || "N/A";

                        // Find image
                        const img = li.querySelector("img.presence-entity__image");
                        const imageUrl = img?.src || "N/A";

                        if (name && profileUrl && designation) {
                            results.push({
                                name,
                                linkedin: removeQueryParams(profileUrl),
                                designation,
                                location,
                                imageUrl,
                            });
                        }
                        count++;
                    }

                    return results;
                    },
                    limit,
                    scrapedCount,
                );

                // Add the scraped data to the content array
                content = [...content, ...peopleData];
                scrapedCount += peopleData.length;

                // Check for the next page or scroll
                const nextPageButton = await page.$("button.next-button-selector"); // Replace with the correct selector for the next page button
                if (nextPageButton && scrapedCount < limit) {
                    // Click the next page button
                    await nextPageButton.click();
                    await page.waitForNavigation({ waitUntil: "networkidle2" });
                } else {
                    break; // No more pages or limit reached
                }
            }

        } catch (err) {
            console.error("Error during peopleScraping:", err);
        } finally {
            //await browser.close();
        }

        return content;
    };

    scrapeYCombinatorCompanies = async (url, total_record = 1) => {
        const browser = await getBrowserWithoutLogin();
        const page = await browser.newPage();
        try {
            await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });

            // Optional: mouse cursor visual cue for debugging
            await page.evaluate(() => {
                const cursor = document.createElement("div");
                cursor.style.position = "fixed";
                cursor.style.width = "10px";
                cursor.style.height = "10px";
                cursor.style.backgroundColor = "red";
                cursor.style.borderRadius = "50%";
                cursor.style.pointerEvents = "none";
                cursor.style.zIndex = "9999";
                document.body.appendChild(cursor);

                document.addEventListener("mousemove", (e) => {
                    cursor.style.left = `${e.clientX}px`;
                    cursor.style.top = `${e.clientY}px`;
                });
            });

            await new Promise((resolve) => setTimeout(resolve, 2000));

            await page.waitForSelector("a._company_i9oky_355", { timeout: 20000 });

            // Step 1: Scrape company names & profile links
            const scrapped_data = await page.evaluate((total) => {
                const content = [];
                const companyElements = document.querySelectorAll(
                    "a._company_i9oky_355",
                );

                for (let i = 0; i < Math.min(companyElements.length, total); i++) {
                    const el = companyElements[i];
                    const name =
                        el.querySelector("span._coName_i9oky_470")?.innerText || "";
                    const link = el.href;

                    content.push({
                        company_name: name,
                        company_link: link,
                    });

                    el.scrollIntoView({ behavior: "smooth", block: "center" });
                }

                return content;
            }, total_record);

            await page.close();

            // Helper to extract domain from URL
            const getDomain = (url) => new URL(url).hostname.replace(/^www\./, "");

            // Step 2: Visit each company page to get actual website
            let response_data = [];
            for (const company of scrapped_data) {
                const companyPage = await browser.newPage();
                try {
                    await companyPage.setUserAgent(
                        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36",
                    );
                    await companyPage.setExtraHTTPHeaders({
                        "Accept-Language": "en-US,en;q=0.9",
                    });

                    await companyPage.goto(company.company_link, {
                        waitUntil: "networkidle2",
                        timeout: 60000,
                    });

                    // Extract external company website from company profile
                    const company_website = await companyPage.evaluate(() => {
                        const linkEl = document.querySelector(
                            ".group.flex.flex-row.items-center.px-3.leading-none.text-linkColor",
                        );
                        return linkEl ? linkEl.innerText.trim() : null;
                    });

                    company.company_website = company_website || "";

                    company.domain = company.company_website
                        ? getDomain(company.company_website)
                        : "";

                    await companyPage.waitForSelector(".ycdc-card-new", {
                        timeout: 20000,
                    });

                    const foundersData = await companyPage.evaluate(() => {
                        let founders = [];
                        const cards = document.querySelectorAll(".ycdc-card-new");

                        cards.forEach((card) => {
                            const nameElement = card.querySelector(".text-xl.font-bold");
                            const titleElement = card.querySelector(
                                '[class*="pt-1"][class*="text-gray-600"]',
                            );

                            if (nameElement && titleElement) {
                                const name = nameElement.innerText.trim();
                                const title = titleElement.innerText.trim();

                                founders.push({
                                    name,
                                    title,
                                });
                            }
                        });

                        return founders;
                    });

                    const companyData = await companyPage.evaluate(() => {
                        const companyInfo = {
                            name: null,
                            founded: null,
                            batch: null,
                            teamSize: null,
                            location: null,
                            status: null,
                            primaryPartner: null,
                            socialLinks: {},
                        };

                        // Grab name from headline
                        const nameElement = document.querySelector(
                            ".ycdc-card-new .text-xl a",
                        );
                        if (nameElement) {
                            companyInfo.name = nameElement.textContent.trim();
                        }

                        // Loop through label-value pairs
                        const labelSpans = document.querySelectorAll(
                            ".ycdc-card-new .flex.flex-row.justify-between",
                        );
                        labelSpans.forEach((spanGroup) => {
                            const labels = spanGroup.querySelectorAll("span");

                            for (let i = 0; i < labels.length - 1; i += 2) {
                                const label = labels[i].textContent.trim();
                                const value = labels[i + 1].textContent.trim();

                                if (label === "Founded:") companyInfo.founded = value;
                                else if (label === "Batch:") companyInfo.batch = value;
                                else if (label === "Team Size:") companyInfo.teamSize = value;
                                else if (label === "Location:") companyInfo.location = value;
                                else if (label === "Status:") companyInfo.status = value;
                            }
                        });

                        // Extract primary partner if present
                        const partnerLink = document.querySelector(
                            ".ycdc-card-new .flex.flex-row.justify-between a",
                        );
                        if (partnerLink) {
                            companyInfo.primaryPartner = partnerLink.textContent.trim();
                        }

                        // Extract all social links
                        const linkElements = document.querySelectorAll(
                            ".ycdc-card-new a[href]",
                        );
                        linkElements.forEach((link) => {
                            const href = link.href;
                            if (href.includes("linkedin.com")) {
                                companyInfo.socialLinks.linkedin = href;
                            } else if (href.includes("twitter.com")) {
                                companyInfo.socialLinks.twitter = href;
                            } else if (href.includes("facebook.com")) {
                                companyInfo.socialLinks.facebook = href;
                            } else if (href.includes("crunchbase.com")) {
                                companyInfo.socialLinks.crunchbase = href;
                            } else if (
                                href.startsWith("http") &&
                                !href.includes("ycombinator.com") &&
                                !Object.values(companyInfo.socialLinks).includes(href)
                            ) {
                                // Consider this the main website if it doesn't match known platforms
                                companyInfo.socialLinks.website = href;
                            }
                        });

                        return companyInfo;
                    });

                    let mergedData = {
                        ...company,
                        ...companyData,
                        founders: foundersData,
                    };


                    response_data.push(mergedData);
                } catch (error) {
                    console.log(`❌ Error scraping ${company.company_name}:`, error);
                } finally {
                    await companyPage.close();
                }
            }

            console.log("✅ Final Scraped Data:", response_data);
            return response_data;
        } catch (error) {
            console.log("🚨 Error during scraping:", error);
            return [];
        } finally {
            await browser.close();
        }
    };

}



const randomDelay = (min = 1000, max = 3000) =>
    new Promise((resolve) =>
        setTimeout(resolve, min + Math.random() * (max - min)),
    );

const autoScroll = async (page) => {
    await page.evaluate(async () => {
        await new Promise((resolve) => {
            let totalHeight = 0;
            const distance = 300;
            const timer = setInterval(() => {
                window.scrollBy(0, distance);
                totalHeight += distance;

                if (totalHeight >= document.body.scrollHeight) {
                    clearInterval(timer);
                    resolve();
                }
            }, 400);
        });
    });
};

module.exports.scrapping = new Scrapping();
