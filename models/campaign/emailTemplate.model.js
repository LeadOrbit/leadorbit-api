
module.exports = (sequelize, DataTypes) => {

    const emailTemplate = sequelize.define('EmailTemplate', {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        userId: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        version: {
            type: DataTypes.INTEGER,
            defaultValue: 1,
        },

        name: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        subject: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        contentType:{
            type: DataTypes.TEXT,
            allowNull: false,
            defaultValue:"text"
        },
        content: {
            type: DataTypes.TEXT,
            allowNull: false,
        },
    }, {
        timestamps: true, // Sequelize will automatically create 'createdAt' and 'updatedAt' columns
    });
    return emailTemplate
}
