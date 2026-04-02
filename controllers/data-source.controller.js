const { CompanyList, User, sequelize } = require("../models");
const getDataFromClutch = require("../services/clutch");
const getDataFrom_GoogleSheet = require("../services/googleSheet");
const getDataFrom_Linkdin = require("../services/linkdin");
const getDataFrom_NASDAQ = require("../services/nasdaq");
const getDataFrom_YCombinator = require("../services/yCombinator");


const extractDataFromTargetSource = async (req, res) => {
    try {
        const { targetSource, name, filters, googleSheetLink, limit } = req.body;

        const { email } = req.user;

        let user = await User.findOne({
            where: {
                email
            }
        });


        switch (targetSource.toUpperCase()) {
            case "NASDAQ": {
                const results = await getDataFrom_NASDAQ(filters, limit);

                // save it to companyList model
                await CompanyList.create({
                    userId: user.dataValues.id,
                    name: name,
                    source: targetSource,
                    lastProcessedRowNumber: 1,
                    status: "Completed",
                    companyData: results
                })
                return res.status(200).json({
                    success: true,
                    message: "Extraction successful",
                    data: results,
                });
            }
            case "GOOGLESHEET": {
                const results = await getDataFrom_GoogleSheet(googleSheetLink, limit);

                // save it to companyList model
                await CompanyList.create({
                    userId: user.dataValues.id,
                    name: name,
                    source: targetSource,
                    lastProcessedRowNumber: 1,
                    status: "Completed",
                    companyData: results
                })
                return res.status(200).json({
                    success: true,
                    message: "Extraction successful",
                    data: results,
                });
            }
            case "YCOMBINATOR": {
                const results = await getDataFrom_YCombinator(filters, limit, targetSource);

                // save it to companyList model
                await CompanyList.create({
                    userId: user.dataValues.id,
                    name: name,
                    source: targetSource,
                    lastProcessedRowNumber: 1,
                    status: "Completed",
                    companyData: results
                })
                return res.status(200).json({
                    success: true,
                    message: "Extraction successful",
                    data: results,
                });
            }
            case "LINKEDIN": {
                const results = await getDataFrom_Linkdin(filters, limit, targetSource);
                // save it to companyList model
                await CompanyList.create({
                    userId: user.dataValues.id,
                    name: name,
                    source: targetSource,
                    searchType: filters?.searchType,
                    lastProcessedRowNumber: 1,
                    status: "Completed",
                    companyData: results
                })
                return res.status(200).json({
                    success: true,
                    message: "Extraction successful",
                    data: results,
                });
            }
            case "CLUTCH": {
                const results = await getDataFromClutch(filters, limit, targetSource);
                // save it to companyList model
                await CompanyList.create({
                    userId: user.dataValues.id,
                    name: name,
                    source: targetSource,
                    searchType: filters?.searchType,
                    lastProcessedRowNumber: 1,
                    status: "Completed",
                    companyData: results
                })
                return res.status(200).json({
                    success: true,
                    message: "Extraction successful",
                    data: results,
                });
            }
            default: {
                return res.status(400).json({
                    success: false,
                    message: `Unsupported targetSource: ${targetSource}`,
                });
            }
        }
    } catch (error) {
        console.error("❌ Error at extractDataFromTargetSource:", error.message);
        return res.status(500).json({
            success: false,
            message: "Server error during extraction",
            error: error.message,
        });
    }
};

const getExtractionJobsList = async (req, res) => {
    try {
        let { email } = req.user;
        const selectedUser = req.query.selectedUser;


        if (selectedUser) {
            email = selectedUser
        }
        const user = await User.findOne({
            where: { email }
        });

        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        const extractionJobs = await CompanyList.findAll({
            where: {
                userId: user.id
            },
            attributes: ['id', 'name', 'source', 'status', 'lastProcessedRowNumber', 'createdAt'], // only these fields

            order: [['createdAt', 'DESC']]
        });

        if (extractionJobs.length) {
            return res.status(200).json({
                success: true,
                jobs: extractionJobs
            });
        } else {
            return res.status(200).json({
                success: true,
                jobs: [],
                message: "No extraction jobs found."
            });
        }
    } catch (error) {
        console.error("Error fetching extraction jobs:", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

const getExtractionData = async (req, res) => {
    try {
        let { email } = req.user;
        const selectedUser = req.query.selectedUser;

        if (selectedUser) {
            email = selectedUser
        }
        const { list, page = 1, limit = 10, sheetId = null,
            sheetName = null } = req.body;
        const extractionId = list.id;

        // 👇 Add this
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const offset = (pageNum - 1) * limitNum;

        const user = await User.findOne({ where: { email } });
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        const extractionJob = await CompanyList.findOne({
            where: {
                id: extractionId,
                userId: user.id,
            },
        });

        if (!extractionJob) {
            return res.status(404).json({ success: false, message: "Extraction job not found or access denied" });
        }

        const { id, source, companyData } = extractionJob;

        // if (source === "nasdaq") {
        //     // ✅ NASDAQ pagination (JSONB root array)

        // }
        const totalCountResult = await sequelize.query(
            `SELECT jsonb_array_length("companyData") AS count FROM "CompanyLists" WHERE id = :id AND "userId" = :userId`,
            {
                replacements: { id: extractionId, userId: user.id },
                type: sequelize.QueryTypes.SELECT,
            }
        );
        const totalCount = totalCountResult[0]?.count || 0;

        const paginatedResult = await sequelize.query(
            `SELECT jsonb_array_elements("companyData") AS item
       FROM "CompanyLists"
       WHERE id = :id AND "userId" = :userId
       OFFSET :offset LIMIT :limit`,
            {
                replacements: {
                    id: extractionId,
                    userId: user.id,
                    offset,
                    limit,
                },
                type: sequelize.QueryTypes.SELECT,
            }
        );

        const extractedData = paginatedResult.map(row => row.item);

        return res.status(200).json({
            success: true,
            id,
            source,
            extractedData,
            totalCount,
            currentPage: page,
            totalPages: Math.ceil(totalCount / limit),
        });

    } catch (error) {
        console.error("Error fetching extraction data:", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};


const deleteExtractedDataList = async (req, res) => {
    try {
        let { email } = req.user;
        const selectedUser = req.query.selectedUser;
        console.log("selectedUser", selectedUser)

        console.log("email", email)

        if (selectedUser) {
            email = selectedUser
        } const extractionDataListId = req.params.extractionId;

        if (!extractionDataListId) {
            return res.status(400).json({ success: false, message: "Id is missing" });
        }

        const user = await User.findOne({ where: { email } });

        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        const deletedCount = await CompanyList.destroy({
            where: {
                id: extractionDataListId,
                userId: user.id // Optional: ensure the user owns the list
            }
        });

        if (deletedCount > 0) {
            return res.status(200).json({
                success: true,
                message: "List deleted successfully"
            });
        } else {
            return res.status(404).json({
                success: false,
                message: "List not found or already deleted"
            });
        }
    } catch (error) {
        console.error("Error deleting extracted data list:", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

module.exports = {
    extractDataFromTargetSource,
    getExtractionJobsList,
    getExtractionData,
    deleteExtractedDataList
};
