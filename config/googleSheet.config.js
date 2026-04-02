const { google } = require("googleapis");


async function authenticateGoogleSheets() {
    try {
        if (!process.env.GOOGLE_SERVICE_ACCOUNT_CRED) {
            throw new Error("Missing GOOGLE_SERVICE_ACCOUNT_CRED environment variable.");
        }

        const auth = new google.auth.GoogleAuth({
            credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_CRED),
            scopes: ["https://www.googleapis.com/auth/spreadsheets"],
        });

        const client = await auth.getClient();
        return client;
    } catch (error) {
        console.error("❌ Failed to authenticate with Google Sheets:", error.message);
        throw error;
    }
}

module.exports=authenticateGoogleSheets
