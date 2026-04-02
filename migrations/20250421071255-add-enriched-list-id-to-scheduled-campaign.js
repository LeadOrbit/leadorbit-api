'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('ScheduledCampaign', 'enrichedListId', {
      type: Sequelize.INTEGER,
      allowNull: false, // Column will not accept null values
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('ScheduledCampaign', 'enrichedListId');
  }
};
