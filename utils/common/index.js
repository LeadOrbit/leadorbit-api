const OpenAI = require("openai");
const { findPersonOnApollo, revealEmailFromApollo } = require("../../services/apollo");

const openai = new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: process.env.OPEN_ROUTER_API_KEY,
});


let count = 0;
// Helper functions 
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function getRandomInterval(min = 1, max = 60) {
    return (Math.floor(Math.random() * (max - min + 1)) + min) * 1000;
}

// 🎯 Extract JSON from response text
const extractJSON = (text) => {
    const match = text.match(/```json\n([\s\S]*?)\n```/);
    return match ? match[1] : "No valid JSON found";
};


function extractDomain(url) {
    try {
        const hostname = new URL(url).hostname;

        // Remove subdomains (like www, mail, etc.)
        const parts = hostname.split('.');
        if (parts.length >= 2) {
            console.log("extractDomain", parts.slice(-2).join('.'))
            return parts.slice(-2).join('.'); // Get the last two segments
        }
        console.log("extractDomain", hostname)

        return hostname;
    } catch (err) {
        console.error("Invalid URL:", url);
        return null;
    }
}


async function getCompanyDomains(companyNames) {
    try {
        count++;
        console.log(`🔍Fetching domains for companies: ${companyNames.join(", ")}...`, count);

        const prompt = `You are an AI assistant that helps identify the official domain of companies based on their names. Provide the domain names of the following companies. Return the result strictly in the following JSON format:

    {
      "Company Name 1": "example1.com",
      "Company Name 2": "example2.com",
      ...
    }

    Companies: ${companyNames.join(", ")}
    `;

        const completion = await openai.chat.completions.create({
            model: "mistralai/mistral-small-3.1-24b-instruct:free",
            messages: [
                {
                    role: "system",
                    content: "You are a knowledgeable assistant that returns the domain names of companies based on company names in strict JSON format.",
                },
                {
                    role: "user",
                    content: prompt,
                },
            ],
            max_tokens: 300,
            temperature: 0.2,
        });

        console.log("completion", completion)

        const responseText = completion.choices[0]?.message?.content?.trim();

        // Extract only JSON from response
        const jsonMatch = extractJSON(responseText);

        const domains = jsonMatch ? JSON.parse(jsonMatch) : {};

        return domains;
    } catch (error) {
        console.error("❌ Error fetching domains:", error.message);
        throw error;
    }
}

async function getExistingLinkedInURLs(googleSheetId, sheetName) {
    try {
        console.log("Checking for duplicates LinkedIn URLs");

        const sheets = google.sheets({ version: "v4", auth: await authenticateGoogleSheets() });

        // Step 1: Check if the sheet exists
        const metadata = await sheets.spreadsheets.get({
            spreadsheetId: googleSheetId,
        });

        const sheetNames = metadata.data.sheets.map(s => s.properties.title);
        if (!sheetNames.includes(sheetName)) {
            console.warn(`⚠️ Sheet '${sheetName}' not found. Assuming no existing LinkedIn URLs.`);
            return new Set(); // No sheet yet = no LinkedIn URLs to compare
        }

        // Step 2: Fetch LinkedIn URLs from column D
        const linkedinRange = `'${sheetName}'!D2:D`;

        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: googleSheetId,
            range: linkedinRange,
        });

        const linkedinUrls = response.data.values
            ? response.data.values.flat().filter(url => url && url.trim())
            : [];

        return new Set(linkedinUrls);
    } catch (error) {
        console.error("❌ Failed to fetch existing LinkedIn URLs:", error.message);
        throw error;
    }
}

function extractCompanyNames(arr) {
    return arr.map(str => {
        // Remove state abbreviations like (DE), (NY), etc.
        let cleaned = str.replace(/\s*\([A-Z]{2}\)/g, '');

        // Remove suffixes like "Common Stock", "Preferred Stock", etc.
        cleaned = cleaned.replace(/\s*(Common|Preferred|Class\s\w+|Ordinary)?\s*Stock.*$/i, '');

        return cleaned.trim();
    });
}



async function processBatch(batch, source, organization_locations) {
    console.log(`🔍 Processing batch of ${batch.length} companies...,${new Date().toLocaleTimeString()}`);
    try {
        if (!batch.length) {
            return []
        }
        if (source === "nasdaq") {
            // const domains = await getCompanyDomains(batch);
            // const domainList = Object.values(domains);
            // batch = domainList;
            console.log("before batch", batch)

            batch = extractCompanyNames(batch)
            console.log("after batch", batch)


        }



        let peopleInfo = [];

        for (const b of batch) {
            const result = await findPersonOnApollo(b, source, organization_locations);
            console.log("Found People", result)
            if (result) {
                peopleInfo.push(...result); // accumulate results here
            }
            await delay(getRandomInterval(1, 3));
        }

        console.log("peopleInfo", peopleInfo);
        return peopleInfo; // 🔁 fixed return
    } catch (error) {
        console.log("Error at processBatch", error.response?.data || error.message);
        throw error;
    }
}


async function bulkEnrichPeopleProfiles(peopleDetails) {
    console.log(`🔍 Bulk enriching...`);

    const validPeopleDetails = peopleDetails.filter(item => item?.id);
    if (validPeopleDetails.length === 0) {
        console.warn(`⚠️ No valid details to enrich.`);
        return [];
    }

    const batchSize = 10;
    const enrichedResults = [];

    for (let i = 0; i < validPeopleDetails.length; i += batchSize) {
        const batch = validPeopleDetails.slice(i, i + batchSize);
        const batchIds = batch.map(p => p.id);

        try {
            const people = await revealEmailFromApollo(batchIds); // Expecting array of enriched people [{id, email, ...}]
            console.log("Revealed Email", people[0].email);
            console.log("Revealed Phone", people[0].phone);

            // Merge emails into the original batch
            const enrichedBatch = batch
                .filter(original => original.linkedin !== "N/A")
                .map(original => {
                    const enriched = people.find(p => p.id === original.id && p.email);
                    return enriched ? { ...original, email: enriched.email, phone: enriched.phone } : null;
                })
                .filter(Boolean); // Remove nulls

            enrichedResults.push(...enrichedBatch);

        } catch (error) {
            if (error.response?.status === 429) {
                console.warn(`⏳ Rate limited at batch starting index ${i}. Stopping further processing.`);
                break;
            } else {
                console.error(`❌ Error enriching batch starting at index ${i}:`, error.message);
                // optionally continue
                throw error
            }
        }

    }

    console.log(`✅ Enriched ${enrichedResults.length} profiles.`);
    return enrichedResults;
}


// Helper function to dynamically extract data based on AI-suggested selectors
async function getAISelectorsForPage(content) {
    try {
        const prompt = `
        You are an AI assistant that helps extract data from HTML pages. I will provide you with a portion of HTML content, and I need you to suggest the best class names to extract the following pieces of information:
        1. Hiring Manager's Name
        2. Hiring Manager's Title
        3. Hiring Manager's LinkedIn URL
        4. Company Linkedin URL
        5. Company Industry
        6. Company Size
        
        Please ensure that the suggested class names can work for various companies, not just a specific company. The goal is to extract data in a generic way that works across different job postings or company pages.

        The provided HTML content is:
        ${content}
    
        Please do not add comments in the json.
        Please provide the best class names for each of these pieces of information in the following JSON format so that only that can be with the provided class_name:

        {
          "hiring_manager_name": "<class_name>",
          "hiring_manager_title": "<class_name>",
          "hiring_manager_linkedin": "<class_name>",
          "company_linkedin": "<class_name>",
        }
        `;

        const completion = await openai.chat.completions.create({
            model: "mistralai/mistral-small-3.1-24b-instruct:free",
            messages: [
                {
                    role: "system",
                    content: "You are a knowledgeable assistant that suggests selectors for extracting data from HTML pages.",
                },
                {
                    role: "user",
                    content: prompt,
                },
            ],
            max_tokens: 500,
            temperature: 0.2,
        });

        const responseText = completion.choices[0]?.message?.content?.trim();

        // Clean the response text to remove comments but preserve XPath selectors
        const cleanedResponseText = removeComments(responseText);

        // Attempt to extract the JSON from the cleaned response
        const jsonMatch = extractJSON(cleanedResponseText);
        if (jsonMatch) {
            try {
                // Try parsing the cleaned JSON
                const selectors = JSON.parse(jsonMatch);
                return selectors;
            } catch (parseError) {
                console.error("❌ Error parsing JSON:", parseError.message);
                throw new Error("Failed to parse JSON response from AI.");
            }
        } else {
            throw new Error("No valid JSON found in AI response.");
        }

    } catch (error) {
        console.error("❌ Error fetching AI selectors:", error.message);
        throw error;
    }
}

// Helper function to dynamically extract data based on AI-suggested selectors
async function getAISelectorsForCompany(content) {
    try {
        const prompt = `
        You are an AI assistant that helps extract data from HTML pages. I will provide you with a portion of HTML content, and I need you to suggest the best class names to extract the following pieces of information:
        1. Company Website
        2. Company Phone
        3. Company Industry
        4.. Company Size
        
        Please ensure that the suggested class names can work for various companies, not just a specific company. The goal is to extract data in a generic way that works across different job postings or company pages.

        The provided HTML content is:
        ${content}
    
        Please do not add comments in the json.
        Please provide the best class names for each of these pieces of information in the following JSON format so that only that can be with the provided class_name:

        {
          "company_website": "<class_name>",
          "company_phone": "<class_name>",
          "company_industry": "<class_name>",
          "company_size": "<class_name>",
        }
        `;

        const completion = await openai.chat.completions.create({
            model: "mistralai/mistral-small-3.1-24b-instruct:free",
            messages: [
                {
                    role: "system",
                    content: "You are a knowledgeable assistant that suggests selectors for extracting data from HTML pages.",
                },
                {
                    role: "user",
                    content: prompt,
                },
            ],
            max_tokens: 500,
            temperature: 0.2,
        });

        const responseText = completion.choices[0]?.message?.content?.trim();

        // Clean the response text to remove comments but preserve XPath selectors
        const cleanedResponseText = removeComments(responseText);

        // Attempt to extract the JSON from the cleaned response
        const jsonMatch = extractJSON(cleanedResponseText);
        if (jsonMatch) {
            try {
                // Try parsing the cleaned JSON
                const selectors = JSON.parse(jsonMatch);
                return selectors;
            } catch (parseError) {
                console.error("❌ Error parsing JSON:", parseError.message);
                throw new Error("Failed to parse JSON response from AI.");
            }
        } else {
            throw new Error("No valid JSON found in AI response.");
        }

    } catch (error) {
        console.error("❌ Error fetching AI selectors:", error.message);
        throw error;
    }
}

// // Helper function to extract JSON-like structure from a string
// function extractJSON(str) {
//     // Use a regular expression to attempt to find the JSON structure in the response text
//     const jsonRegex = /({.*})/s;
//     const match = str.match(jsonRegex);
//     return match ? match[0] : null;
// }

// Helper function to remove comments from JSON response, but preserve XPath selectors
function removeComments(str) {
    // This regular expression will match single-line and multi-line comments, but it will ignore content inside XPaths
    return str.replace(/\/\/[^\n]*|\/\*[\s\S]*?\*\//g, (match) => {
        // Check if the match occurs within an XPath (e.g., within `//` or `/*` structure)
        if (match.startsWith('//') || match.startsWith('/*')) {
            return match;
        }
        return ''; // Remove comment
    });
}



// Function to extract the hiring manager and company details using AI-recommended selectors
async function extractDataFromPage(page, aiSelectors) {
    try {
        const data = await page.evaluate((selectors) => {
            const result = {};

            // Extract hiring manager's information
            const managerNameElement = document.querySelector(selectors.hiring_manager_name);
            result.hiring_manager_name = managerNameElement ? managerNameElement.innerText.trim() : '';

            const managerTitleElement = document.querySelector(selectors.hiring_manager_title);
            result.hiring_manager_title = managerTitleElement ? managerTitleElement.innerText.trim() : '';

            const managerLinkedInElement = document.querySelector(selectors.hiring_manager_linkedin);
            result.hiring_manager_linkedin = managerLinkedInElement ? managerLinkedInElement.href : '';

            // Extract company details
            const companyWebsiteElement = document.querySelector(selectors.company_website);
            result.company_website = companyWebsiteElement ? companyWebsiteElement.href : '';

            const companyIndustryElement = document.querySelector(selectors.company_industry);
            result.company_industry = companyIndustryElement ? companyIndustryElement.innerText.trim() : '';

            const companySizeElement = document.querySelector(selectors.company_size);
            result.company_size = companySizeElement ? companySizeElement.innerText.trim() : '';

            return result;
        }, aiSelectors);

        return data;
    } catch (error) {
        console.error("❌ Error extracting data from page:", error.message);
        throw error;
    }
}

// Main function to process and extract relevant data from a page
async function getPageData(pageContent) {
    try {
        console.log("🔍 Analyzing page content for AI selectors...");

        // Step 1: Get AI-generated selectors
        const aiSelectors = await getAISelectorsForPage(pageContent);

        // Step 2: Extract data from the page using the AI selectors
        const data = await extractDataFromPage(pageContent, aiSelectors);

        return data;
    } catch (error) {
        console.error("❌ Error processing page data:", error.message);
        throw error;
    }
}

// Helper function to dynamically extract data based on AI-suggested selectors
async function getAISelectorsForPeople(content) {
    try {
        const prompt = `
        You are an AI assistant that helps extract data from HTML pages. I will provide you with a portion of HTML content, and I need you to suggest the class names to extract the following pieces of information:
        1. Person
        2. Designation
        3. Company
        
        
        The provided HTML content is:
        ${content}
    
        Please do not add comments in the json.
        Please provide the best class names for each of these pieces of information in the following JSON format:
        
        {
          "person": "<class_name>",
          "designation": "<class_name>",
          "company": "<class_name>",
        }
        `;

        const completion = await openai.chat.completions.create({
            model: "mistralai/mistral-small-3.1-24b-instruct:free",
            messages: [
                {
                    role: "system",
                    content: "You are a knowledgeable assistant that suggests selectors for extracting data from HTML pages.",
                },
                {
                    role: "user",
                    content: prompt,
                },
            ],
            max_tokens: 500,
            temperature: 0.2,
        });
        console.log("completion", JSON.stringify(completion));
        const responseText = completion.choices[0]?.message?.content?.trim();

        // Clean the response text to remove comments but preserve XPath selectors
        const cleanedResponseText = removeComments(responseText);

        // Attempt to extract the JSON from the cleaned response
        const jsonMatch = extractJSON(cleanedResponseText);
        if (jsonMatch) {
            try {
                // Try parsing the cleaned JSON
                const selectors = JSON.parse(jsonMatch);
                return selectors;
            } catch (parseError) {
                console.error("❌ Error parsing JSON:", parseError.message);
                throw new Error("Failed to parse JSON response from AI.");
            }
        } else {
            throw new Error("No valid JSON found in AI response.");
        }

    } catch (error) {
        console.error("❌ Error fetching AI selectors:", error.message);
        throw error;
    }
}




module.exports = { delay, getRandomInterval, extractJSON, extractDomain, getCompanyDomains, openai, processBatch, bulkEnrichPeopleProfiles, getAISelectorsForPage, getAISelectorsForCompany, getAISelectorsForPeople }