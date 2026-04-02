const { extractSheetId, getSheetNames, getSheetRows } = require("../../utils/googleSheet");

async function getDataFrom_GoogleSheet(googleSheetLink, limit) {
    try {
        const googleSheetId = extractSheetId(googleSheetLink);
        const sheetNames = await getSheetNames(googleSheetId);

        let result = [];

        for (const sheetName of sheetNames) {
            // process each sheet dynamically

            const { data, lastRow } = await getSheetRows(googleSheetId, sheetName,limit);

            result.push({
                sheetId:googleSheetId,
                sheetName,
                rows:data,
                lastRow:lastRow
            })
            // populate database

            // return all data from googleSheet with sheetname

        }
        return result

    } catch (error) {
        console.error("Error", error)
    }
}

module.exports = getDataFrom_GoogleSheet