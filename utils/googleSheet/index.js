const authenticateGoogleSheets = require("../../config/googleSheet.config");
const { readFileSync, existsSync, writeFileSync } =require('fs')
const { join } =require('path');
const {google} =require( 'googleapis')

const progressFile = join(process.cwd(), 'public', 'progress.json');


function extractSheetId(googleSheetUrl) {
    try {
        const match = googleSheetUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
        return match ? match[1] : null;
    } catch (error) {
        console.error("Error extracting sheet ID:", error);
        return null;
    }
}


async function getSheetRows(googleSheetIdFetch, sheetName, limit) {
  console.log("Reading from Google Sheet tab:", sheetName);
  const spreadsheetId = googleSheetIdFetch;
  const lastRow = await getLastProcessedRow(spreadsheetId, sheetName);
  const sheets = google.sheets({ version: "v4", auth: await authenticateGoogleSheets() });

  try {
    // 1. Try to get the header row (Row 1)
    const headerRes = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `'${sheetName}'!1:1`,
    });

    let headers = headerRes.data.values?.[0] || [];

    // 2. If no headers found, generate fallback headers based on actual data row length
    if (headers.length === 0) {
      console.warn("⚠️ No headers found. Generating fallback headers.");

      const previewData = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `'${sheetName}'!A${lastRow + 1}:Z${lastRow + 1}`,
      });

      const firstRow = previewData.data.values?.[0] || [];
      headers = firstRow.map((_, i) => `Column ${String.fromCharCode(65 + i)}`); // A, B, C...
    }

    // 3. Fetch actual data rows
    const dataRangeStart = lastRow + 1;
    const dataRangeEnd = dataRangeStart + Number(limit) - 1;
    console.log("Last ROw", lastRow);
    console.log("dataRangeStart", dataRangeStart);

    console.log("limit", limit)

    console.log("RANGE", `'${sheetName}'!A${dataRangeStart}:Z${dataRangeEnd}`)
    const sheetData = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `'${sheetName}'!A${dataRangeStart}:Z${dataRangeEnd}`,
    });

    const rows = sheetData.data.values || [];

    // 4. Format rows using headers
    const formattedData = rows.map(row => {
      const rowObject = {};
      headers.forEach((header, i) => {
        rowObject[header.trim()] = (row[i] || "").trim();
      });
      return rowObject;
    });

    return { data: formattedData, lastRow };
  } catch (error) {
    console.error("❌ Error reading Google Sheet:", error.message);
    throw error;
  }
}


async function getSheetNames(spreadsheetId) {
    const sheets = google.sheets({ version: "v4", auth: await authenticateGoogleSheets() });

    const response = await sheets.spreadsheets.get({
        spreadsheetId,
    });

    const sheetNames = response.data.sheets.map(sheet => sheet.properties.title);
    return sheetNames;
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


function safeReadJSON(filePath) {
  try {
    const raw = readFileSync(filePath, 'utf-8').trim();
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}


function getLastProcessedRow(sheetId, sheetName) {
  console.log("Reading last processed row, Sheet Id:", sheetId);
  if (!existsSync(progressFile)) return 1;

  const data = safeReadJSON(progressFile);
  const sheetData = data[sheetId] || {};
  const lastRow = sheetData[sheetName];

  if (lastRow === undefined) {
    console.log(`ℹ️ No progress found for Sheet "${sheetName}". Starting from row 2.`);
    return 1;
  }

  return lastRow;
}


function setLastProcessedRow(sheetId, sheetName, rowNumber) {
  console.log("Setting last processed row, Sheet Id:", sheetId, "Row Number:", rowNumber);

  const data = existsSync(progressFile) ? safeReadJSON(progressFile) : {};

  if (!data[sheetId]) {
    data[sheetId] = {};
  }

  data[sheetId][sheetName] = rowNumber;

  writeFileSync(progressFile, JSON.stringify(data, null, 2));
}


module.exports = {
    extractSheetId, getExistingLinkedInURLs, getSheetNames, getSheetRows
}