const { process_data } = require("../helper/process_data_list.js");
const sheetsHelper = require("../lib/google_sheet.js");
let job_processing = false;
module.exports = {
  name: "Fetching Lists",
  schedule: "*/5 * * * *", // Runs every minute (adjust as needed)
  run: async () => {
    if (job_processing) {
      console.info("🚧 Job is already in progress. Skipping this execution.");
      return;
    }
    job_processing = true;
    console.log("🔄 Running Fetching Lists at:", new Date().toISOString());
    try {
      const url = process.env.AUTOMATION_LIST_URI;

      // Fetch all data from the Google Sheet
      const lists = await sheetsHelper.getSheetData(url);
      if (!lists || lists.length === 0) {
        console.log("📭 No data found in the sheet.");
      } else {
        let updates = [];

        for (const list of lists) {
          if (!list.completed_on) {
            try {
              const updatedDate = new Date().toISOString();
              console.log("✅ Processing for list:", list);

              // processing data to send email
              await process_data(list);

              // check after process the data is there have any pending list available or not
              const clients = await sheetsHelper.getSheetData(
                list.contact_list_uri
              );
              const pending_list = clients.filter(
                (client) => client && !client.email_send_on
              );
              if (pending_list && pending_list.length <= 0) {
                updates.push({
                  matchCriteria: {
                    sl: list.sl,
                    contact_list_uri: list.contact_list_uri,
                    sender_email_uri: list.sender_email_uri,
                    topic_uri: list.topic_uri,
                  },
                  columnToUpdate: "completed_on",
                  newValue: updatedDate,
                });
              }
            } catch (error) {
              console.error("❌ Error updating completed_on:", error);
            }
          }
        }
        if (updates.length > 0) {
          for (const update of updates) {
            await sheetsHelper.updateSheetData(
              url,
              update.matchCriteria,
              update.columnToUpdate,
              update.newValue
            );
          }
          console.log(
            `✅ Successfully updated ${updates.length} row(s) in the sheet.`
          );
        } else {
          console.log("🚀 No updates required.");
        }
      }
    } catch (error) {
      console.error("❌ Error in Fetching Lists:", error);
    } finally {
      job_processing = false;
      console.info("✅ Job is processed and ready for new executions.");
    }
  },
};
