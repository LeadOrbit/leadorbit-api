module.exports = (sequelize, DataTypes) => {

    const smtp = sequelize.define(
        "Smtp",
        {
            id: {
                type: DataTypes.INTEGER,
                autoIncrement: true,
                primaryKey: true,
            },
            userId: {
                type: DataTypes.INTEGER,
                allowNull: false
            },
            host: {
                type: DataTypes.STRING,
                allowNull: false
            },
            port: {
                type: DataTypes.INTEGER,
                allowNull: false
            },
            encryption: {
                type: DataTypes.STRING,
                allowNull: false
            },
            user: {
                type: DataTypes.STRING,
                allowNull: false
            },
            password: {
                type: DataTypes.STRING,
                allowNull: false
            }

        }, {
        timestamps: true, // Sequelize will automatically create 'createdAt' and 'updatedAt' columns
    }

    );

    return smtp
}
