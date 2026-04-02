const db = require("../models");
const {
    processBatch,
    bulkEnrichPeopleProfiles,
    delay,
    getRandomInterval
} = require("../utils/common");

const enrichmentWithApollo = async (req, res) => {
    try {
        const { selectedList, config, source, organization_locations = ["United States"] } = req.body;
        let { email } = req.user;
        const selectedUser = req.query.selectedUser;


        if (selectedUser) {
            email = selectedUser
        }
        const user = await db.User.findOne({ where: { email } });
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }
        await db.Notification.create({
            userId: user.id,
            message: `Enrichment started for ${config?.name}`,
            type: 'enrichment'
        });
        // Immediately respond to the frontend
        res.status(200).send({
            success: true,
            message: "Enrichment process started.Go to Jobs tab to track progress of the task."
        });

        // Continue enrichment in the background
        setImmediate(async () => {
            try {
                const { name = '' } = config;
                const { id: companyListId } = selectedList;

                const BATCH_SIZE = 10;

                const companyList = await db.CompanyList.findOne({
                    where: { id: companyListId },
                    attributes: ["companyData", "lastProcessedRowNumber", "source", "userId", "searchType"]
                });


                if (!companyList) return;

                let { companyData, lastProcessedRowNumber = 0, userId, searchType } = companyList;
                let totalNewProfilesCount = 0;
                let totalUpdateCount = 0;
                let rows = [];

                if (selectedList.source === 'googleSheet') {
                    companyData.forEach((entry, index) => {
                        if (entry && Array.isArray(entry.rows)) {
                            rows.push(...entry.rows);
                        } else {
                            console.warn(`No valid rows for sheet ${index + 1}:`, entry);
                        }
                    });
                } else if (selectedList.source === "nasdaq") {
                    rows = companyData;
                } else if (selectedList.source === "ycombinator") {
                    rows = companyData;
                }
                else if (selectedList.source === "linkedin") {
                    rows = companyData;
                }
                else if (selectedList.source === "clutch") {
                    rows = companyData;
                }
                else {
                    console.warn("Unknown source or unexpected data format:", source);
                }

                if (rows.length === 0) return;

                let [contactListEntry] = await db.ContactList.findOrCreate({
                    where: {
                        dataSourceListId: companyListId,
                        userId,
                        source
                    },
                    defaults: {
                        name: name.trim().length ? name.trim() : `Contacts for list ${companyListId}`,
                        source,
                        status: "Running",
                        contacts: [],
                        dataSourceListId: companyListId,
                        userId
                    }
                });

                while (lastProcessedRowNumber < rows.length) {
                    const currentBatch = rows
                        .slice(lastProcessedRowNumber, lastProcessedRowNumber + BATCH_SIZE)
                        .map((c) => {
                            if (selectedList.source === "googleSheet") {
                                return c.Company;
                            }

                            if (selectedList.source === "ycombinator") {
                                return c.domain;
                            }

                            if (selectedList.source === "linkedin") {
                                if (searchType === "people") {
                                    return c.linkedin;
                                } else if (searchType === "jobs") {
                                    return c.company_name;
                                } else if (searchType === "company") {
                                    return c.company_name;
                                } else {
                                    return c?.company_linkedin;
                                }
                            }

                            if (selectedList.source === "clutch") {
                                return c.name + " " + c.position;
                            }

                            // Default fallback
                            return c?.name || '';
                        });

                    console.log("currentBatch", currentBatch);

                    const cleanBatch = currentBatch.filter(Boolean);
                    console.log("Processing cleanBatch:", cleanBatch);

                    const peopleInfo = await processBatch(cleanBatch, selectedList.source, organization_locations);

                    if (!peopleInfo.length) {
                        lastProcessedRowNumber += cleanBatch.length;

                        await db.CompanyList.update(
                            { lastProcessedRowNumber },
                            { where: { id: companyListId } }
                        );

                        if (lastProcessedRowNumber >= rows.length) {
                            await contactListEntry.update({ status: "Completed" });
                            await db.Notification.create({
                                userId: user.id,
                                message: `Enrichment completed for ${config?.name}`,
                                type: 'enrichment'
                            });
                            console.log("Final batch with empty peopleInfo. Marked ContactList as Completed.");
                        }

                        continue;
                    }

                    const enrichedProfiles = await bulkEnrichPeopleProfiles(peopleInfo);

                    const uniqueProfilesMap = new Map();
                    for (const profile of enrichedProfiles) {
                        const email = profile.email?.toLowerCase();
                        if (email) uniqueProfilesMap.set(email, profile);
                    }
                    const deduplicatedProfiles = Array.from(uniqueProfilesMap.values());

                    const existingProfiles = Array.isArray(contactListEntry.contacts)
                        ? contactListEntry.contacts
                        : [];
                    const updatedProfilesMap = new Map(existingProfiles.map(p => [p.email?.toLowerCase(), p]));

                    for (const profile of deduplicatedProfiles) {
                        const email = profile.email?.toLowerCase();
                        if (updatedProfilesMap.has(email)) {
                            updatedProfilesMap.set(email, {
                                ...updatedProfilesMap.get(email),
                                ...profile
                            });
                            totalUpdateCount++;
                        } else {
                            updatedProfilesMap.set(email, profile);
                            totalNewProfilesCount++;
                        }
                    }

                    lastProcessedRowNumber += currentBatch.length;
                    const isFinalBatch = lastProcessedRowNumber >= rows.length;

                    const mergedProfiles = Array.from(updatedProfilesMap.values());
                    await contactListEntry.update({
                        contacts: mergedProfiles,
                        status: isFinalBatch ? "Completed" : "Running"
                    });



                    await db.CompanyList.update(
                        { lastProcessedRowNumber },
                        { where: { id: companyListId } }
                    );
                    if (isFinalBatch) {
                        await db.Notification.create({
                            userId: user.id,
                            message: `Enrichment completed for ${config?.name}`,
                            type: 'enrichment'
                        });
                    }
                    console.log("Batch processed. New:", totalNewProfilesCount, "Updated:", totalUpdateCount);
                    await delay(getRandomInterval(45, 60));
                }

                console.log("Enrichment process completed successfully.");
            } catch (backgroundErr) {
                console.error("Background enrichment error:", backgroundErr);
            }
        });

    } catch (error) {
        console.error("Immediate error during enrichment trigger:", error);
        return res.status(500).send({ success: false, error: error.message });
    }
};


const getEnrichmentJobsList = async (req, res) => {
    try {
        let { email } = req.user;
        const selectedUser = req.query.selectedUser;
        console.log("selectedUser", selectedUser)

        console.log("email", email)

        if (selectedUser) {
            email = selectedUser
        }

        const user = await db.User.findOne({
            where: { email }
        });

        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        const enrichmentJobs = await db.ContactList.findAll({
            where: {
                userId: user.id
            },
            attributes: ['id', 'dataSourceListId', 'name', 'source', 'status', 'createdAt', 'updatedAt'], // only these fields

            order: [['createdAt', 'DESC']]
        });

        if (enrichmentJobs.length) {
            return res.status(200).json({
                success: true,
                jobs: enrichmentJobs
            });
        } else {
            return res.status(200).json({
                success: true,
                jobs: [],
                message: "No enrichment jobs found."
            });
        }
    } catch (error) {
        console.error("Error fetching enrichment jobs:", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};


const getEnrichedData = async (req, res) => {
    try {
        let { email } = req.user;
        const selectedUser = req.query.selectedUser;
        console.log("selectedUser", selectedUser)

        console.log("email", email)

        if (selectedUser) {
            email = selectedUser
        }
        const { list, page = 1, limit = 10 } = req.body;

        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const offset = (pageNum - 1) * limitNum;

        const user = await db.User.findOne({ where: { email } });
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        const enrichmentJob = await db.ContactList.findOne({
            where: {
                id: list.id,
                userId: user.id,
            },
        });

        if (!enrichmentJob) {
            return res.status(404).json({ success: false, message: "Enrichment job not found or access denied" });
        }

        const { id, source, status, contacts = [] } = enrichmentJob;

        // Apply pagination to contacts array
        const paginatedData = contacts.slice(offset, offset + limitNum);

        return res.status(200).json({
            success: true,
            id,
            source,
            status,
            enrichedData: paginatedData,
            page: pageNum,
            totalCount: contacts.length,
            totalPages: Math.ceil(contacts.length / limitNum),
        });

    } catch (error) {
        console.error("Error fetching enriched data:", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};


const deleteEnrichedDataList = async (req, res) => {
    try {
        let { email } = req.user;
        const selectedUser = req.query.selectedUser;
        console.log("selectedUser", selectedUser)

        console.log("email", email)

        if (selectedUser) {
            email = selectedUser
        }
        const enrichedDataListId = req.params.enrichmentId;

        if (!enrichedDataListId) {
            return res.status(400).json({ success: false, message: "Id is missing" });
        }

        const user = await db.User.findOne({ where: { email } });

        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        const deletedCount = await db.ContactList.destroy({
            where: {
                id: enrichedDataListId,
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
        console.error("Error deleting enriched data list:", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};


const getCredentials = async (req, res) => {

    let { email } = req.user;
    const selectedUser = req.query.selectedUser;
    console.log("selectedUser", selectedUser)

    console.log("email", email)

    if (selectedUser) {
        email = selectedUser
    } const user = await db.User.findOne({ where: { email } });

    if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
    }
    try {
        const credentials = await db.Credentials.findOne({
            where: { userId: user.id },
        });

        if (!credentials) {
            return res.status(200).json({});
        }

        res.status(200).json(credentials.data);
    } catch (error) {
        console.error("Failed to fetch credentials:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

const saveOrUpdateCredentials = async (req, res) => {
    const credentialsData = req.body;
    let { email } = req.user;
    const selectedUser = req.query.selectedUser;
    console.log("selectedUser", selectedUser)

    console.log("email", email)

    if (selectedUser) {
        email = selectedUser
    } const user = await db.User.findOne({ where: { email } });

    if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
    }
    try {
        const existing = await db.Credentials.findOne({
            where: { userId: user.id },
        });

        if (existing) {
            const updated = await db.Credentials.update({
                where: { userId: user.id },
                creds: { creds: credentialsData },
            });
            return res.status(200).json({ message: "Updated", credentials: updated });
        } else {
            const created = await db.Credentials.create({
                data: {
                    source,
                    creds: credentialsData,
                },
            });
            return res.status(201).json({ message: "Created", credentials: created });
        }
    } catch (error) {
        console.error("Failed to save/update credentials:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};



module.exports = {
    enrichmentWithApollo, getEnrichmentJobsList, getEnrichedData, deleteEnrichedDataList, saveOrUpdateCredentials, getCredentials
};

