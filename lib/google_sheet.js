const { google } = require("googleapis");
const serviceAccount = require("../credentials.json");
const path = require("path");

class GoogleSheetsHelper {
  constructor() {
    this.auth = new google.auth.GoogleAuth({
      credentials: serviceAccount,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });
    this.sheets = google.sheets({ version: "v4" });
  }

  /**
   * Extracts spreadsheet ID from URL
   * @param {string} url - Google Sheets URL
   * @returns {string} - Spreadsheet ID
   */
  extractSpreadsheetId(url) {
    const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (!match || !match[1]) {
      throw new Error("Invalid Google Sheets URL");
    }
    return match[1];
  }

  /**
   * Gets all data from a Google Sheet
   * @param {string} url - Google Sheets URL
   * @param {string} [sheetName] - Optional sheet name (defaults to first sheet)
   * @returns {Promise<Array>} - Array of objects with header keys
   */
  async getSheetData(url, sheetName = null, retryCount = 0, maxRetries = 5) {
    const spreadsheetId = this.extractSpreadsheetId(url);
    const authClient = await this.auth.getClient();

    try {
      // Get sheet metadata
      const metadata = await this.sheets.spreadsheets.get({
        auth: authClient,
        spreadsheetId,
      });

      const sheet = sheetName
        ? metadata.data.sheets.find((s) => s.properties.title === sheetName)
        : metadata.data.sheets[0];

      if (!sheet) {
        throw new Error(`Sheet "${sheetName || "first sheet"}" not found`);
      }

      // Get data with limited range
      const range = `${sheet.properties.title}!A1:Z`;
      const response = await this.sheets.spreadsheets.values.get({
        auth: authClient,
        spreadsheetId,
        range,
      });

      const rows = response.data.values;
      if (!rows || rows.length === 0) {
        return [];
      }

      // Convert to array of objects
      const headers = rows[0];
      return rows.slice(1).map((row) => {
        return headers.reduce((obj, header, i) => {
          obj[header] = row[i] || null;
          return obj;
        }, {});
      });
    } catch (error) {
      if (error.code === 429) {
        if (retryCount >= maxRetries) {
          console.error(`Max retries reached (${maxRetries}). Aborting.`);
          throw error;
        }

        const waitTime = Math.pow(2, retryCount) * 60000; // Exponential backoff
        console.warn(
          `Rate limited. Waiting ${
            waitTime / 60000
          } minute(s) before retrying...`
        );

        await new Promise((resolve) => setTimeout(resolve, waitTime));

        // Retry with updated retryCount
        return this.getSheetData(url, sheetName, retryCount + 1, maxRetries);
      }

      console.error("Error fetching Google Sheet data:", error.message);
      throw error;
    }
  }

  async updateSheetData(
    url,
    matchCriteria,
    columnToUpdate,
    newValue,
    sheetName = null
  ) {
    try {
      const spreadsheetId = this.extractSpreadsheetId(url);
      const authClient = await this.auth.getClient();

      // Get sheet metadata
      const metadata = await this.sheets.spreadsheets.get({
        auth: authClient,
        spreadsheetId,
      });

      // Determine which sheet to update
      const sheet =
        sheetName && metadata.data.sheets
          ? metadata.data.sheets.find((s) => s.properties.title === sheetName)
          : metadata.data.sheets[0];

      if (!sheet) {
        throw new Error(`Sheet ${sheetName || "first sheet"} not found`);
      }

      const sheetTitle = sheet.properties.title;
      const range = `${sheetTitle}!A1:Z`;

      // Get current sheet data
      const response = await this.sheets.spreadsheets.values.get({
        auth: authClient,
        spreadsheetId,
        range,
      });

      let rows = response.data.values;
      if (!rows || rows.length === 0) {
        throw new Error("No data found in the sheet.");
      }

      const headers = rows[0]; // First row contains column names
      const columnIndex = headers.indexOf(columnToUpdate);

      if (columnIndex === -1) {
        throw new Error(`Column '${columnToUpdate}' not found in the sheet.`);
      }

      let updates = [];

      // Find the correct row by matching criteria
      const rowIndex = rows.findIndex((row, index) => {
        if (index === 0) return false; // Skip header row
        return Object.entries(matchCriteria).every(([key, value]) => {
          const colIndex = headers.indexOf(key);
          return colIndex !== -1 && row[colIndex] === value;
        });
      });

      if (rowIndex > 0) {
        // Ensure it's not the header row
        const updateRange = `${sheetTitle}!${String.fromCharCode(
          65 + columnIndex
        )}${rowIndex + 1}`;
        updates.push({
          range: updateRange,
          values: [[newValue]],
        });
      }

      if (updates.length === 0) {
        console.log("No matching rows found to update.");
        return;
      }

      // Perform batch update
      const updateResponse = await this.sheets.spreadsheets.values.batchUpdate({
        auth: authClient,
        spreadsheetId,
        resource: {
          valueInputOption: "RAW",
          data: updates,
        },
      });

      console.log(
        `Updated ${updates.length} row(s) in column '${columnToUpdate}'`
      );
      return updateResponse.data;
    } catch (error) {
      console.error("Error updating Google Sheet data:", error);
      throw error;
    }
  }
}

// Singleton instance
const sheetsHelper = new GoogleSheetsHelper();
module.exports = sheetsHelper;
