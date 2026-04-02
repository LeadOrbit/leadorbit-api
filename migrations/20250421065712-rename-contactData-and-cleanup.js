'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Rename column
    await queryInterface.renameColumn('ContactLists', 'contactData', 'contacts');

    // Optional: Clean up other unknown columns (example shown)
    const tableDesc = await queryInterface.describeTable('ContactLists');

    const allowedColumns = ['id',"dataSourceListId","userId","name","source","status", "contacts", 'createdAt', 'updatedAt']; // Replace with actual columns

    const columnsToRemove = Object.keys(tableDesc).filter(col => !allowedColumns.includes(col));

    for (const column of columnsToRemove) {
      await queryInterface.removeColumn('ContactLists', column);
    }
  },

  down: async (queryInterface, Sequelize) => {
    // Revert rename
    await queryInterface.renameColumn('ContactLists', 'contacts', 'contactData');

    // Note: can't restore removed columns unless you save their definitions
  }
};




