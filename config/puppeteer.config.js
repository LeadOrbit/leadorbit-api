const puppeteer = require("puppeteer");
const os = require("os");
const fs = require("fs");
const path = require("path");

let email = "prashantjaiinfoway@gmail.com";
let password = "prashant@123456";

let browser; let browser2;
let page;

const USER_DATA_DIR = path.join(__dirname, "user_data"); // Directory to store browser session data

// Function to determine executable path based on the OS
function getExecutablePath() {
    const platform = os.platform();

    if (platform === "win32") {
        return "C:/Program Files/Google/Chrome/Application/chrome.exe";
    } else if (platform === "darwin") {
        return "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
    } else if (platform === "linux") {
        return "/usr/bin/google-chrome";
    } else {
        throw new Error("Unsupported platform");
    }
}

// Function to launch the browser and perform the actions
async function launchBrowser() {
    try {
        console.log("USER_DATA_DIR", USER_DATA_DIR)
        browser = await puppeteer.launch({
            headless: true,
            executablePath: getExecutablePath(),
            userDataDir: USER_DATA_DIR, // Specify user data directory
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security'],
        });

        page = await browser.newPage();

        await page.goto("https://www.linkedin.com/feed/", { waitUntil: "domcontentloaded" });

        // Wait for the page to load completely
        await page.waitForSelector('body', { timeout: 30000 });

        // Check if still logged in
        console.log("Checking if logged in...");

        const isLoggedIn = await page.evaluate(() => {
            const profileNav = document.querySelector('[aria-label="Me"]') ||
                document.querySelector('.global-nav__me-photo');
            return profileNav !== null;
        });

        if (!isLoggedIn) {
            console.log("Not logged in. Performing manual login...");

            await page.goto("https://www.linkedin.com/checkpoint/lg/sign-in-another-account", { waitUntil: "domcontentloaded" });

            // Wait for username and password fields to appear
            await page.waitForSelector("#username");
            await page.type("#username", email, { delay: 500 });

            await page.waitForSelector("#password");
            await page.type("#password", password, { delay: 500 });

            await page.click('button[type="submit"]');

            try {
                // Increase the timeout for waiting for the navigation after login
                await page.waitForNavigation({ timeout: 60000 });
            } catch (error) {
                console.log("Error during navigation:", error);
            }

            console.log("Logged in successfully!");
        } else {
            console.log("Already logged in using saved session!");
        }

        console.log("Browser is launched successfully.");
        return browser;
    } catch (error) {
        console.error("Error launching browser:", error);
    }
}

// Function to launch the browser and perform the actions
async function launchBrowserWithoutLogin() {
    try {
        browser2 = await puppeteer.launch({
            headless: true,
            executablePath: getExecutablePath(),
            protocolTimeout: 120000, // increase timeout to prevent errors
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security'],
        });

        page = await browser2.newPage();
        console.log("Browser is launched successfully.");
        return browser2;
    } catch (error) {
        console.error("Error launching browser:", error);
    }
}

// Function to get the browser instance without login (for debugging)
async function getBrowserWithoutLogin() {
    if (!browser2) {
        return await launchBrowserWithoutLogin();
    }
    return browser2;
}

async function getBrowser() {
    if (!browser) {
        return await launchBrowser();
    }
    return browser;
}

// Export the functions
module.exports = { launchBrowser, browser, page, getBrowser, getBrowserWithoutLogin };
