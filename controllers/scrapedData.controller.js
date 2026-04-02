const fs = require("fs");
const path = require("path");
const { scrapping } = require("../utils/webscrapping");

// __dirname is automatically available in CommonJS, no need to reassign it

class ScrappedDataController {
  // Get all profiles
  async getAllProfiles(req, res) {
    const jsonFilePath = "./scrapedData.json";
    try {
      let data = fs.readFileSync(jsonFilePath, { encoding: "utf-8" });
      res.json({ data: JSON.parse(data) });
    } catch (error) {
      console.error("❌ Error reading file:", error);
      res.json({ status: false, error: error.message });
    }
  }

  // Get all job details
  async getAllJobsDetails(req, res) {
    try {
      const { url, page_no } = req.body;
      const jobs = await scrapping.jobs_scraping(url, page_no);
      
      const dirPath = path.join(__dirname, "../scrapped_data");
      const filePath = path.join(dirPath, "jobs.json");

      // Ensure the directory exists
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }

      // Write the data to the file
      try {
        fs.writeFileSync(filePath, JSON.stringify(jobs, null, 2), "utf-8");
        console.log("✅ File written successfully:", filePath);
      } catch (writeError) {
        console.error("❌ Error writing file:", writeError);
      }

      res.json({ data: jobs });
    } catch (error) {
      console.log("🚀 ~ getAllJobsDetails ~ error:", error);
      res.json({ status: false, error: error.message });
    }
  }

  // Get companies details
  async getComapaniesDetails(req, res) {
    try {
      const { url, total_record } = req.body;
      const companies = await scrapping.companies_scrapping(url, total_record);

      const dirPath = path.join(__dirname, "../scrapped_data");
      const filePath = path.join(dirPath, "companies.json");

      // Ensure the directory exists
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }

      // Write the data to the file
      try {
        fs.writeFileSync(filePath, JSON.stringify(companies, null, 2), "utf-8");
        console.log("✅ File written successfully:", filePath);
      } catch (writeError) {
        console.error("❌ Error writing file:", writeError);
      }

      res.json({ data: companies });
    } catch (error) {
      console.log("🚀 ~ getComapaniesDetails ~ error:", error);
      res.json({ status: false, error: error.message });
    }
  }
}

// Export the controller for use in other modules
module.exports = {
  scrappedDataController: new ScrappedDataController(),
};
