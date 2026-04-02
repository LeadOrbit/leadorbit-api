
// models/companyList.js
module.exports = (sequelize, DataTypes) => {
    const credentials = sequelize.define("Credentials", {

        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },

        userId: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },

        source: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        creds: {
            type: DataTypes.JSONB,
            defaultValue: {},
        },

    });
    return credentials;
};
