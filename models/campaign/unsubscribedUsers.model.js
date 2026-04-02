
module.exports = (sequelize, DataTypes) => {
    const unsubscribedUsers = sequelize.define(
        "UnsubscribedUsers",
        {
            id: {
                type: DataTypes.INTEGER,
                autoIncrement: true,
                primaryKey: true,
            },
            unsubscribedAt: {
                type: DataTypes.DATE,
                allowNull:true
            },
            unsubscriptionReason:{
                type: DataTypes.STRING,
                allowNull:true
            },
            email: {
                type: DataTypes.STRING,
                allowNull: true,
            }
              
        }, {
        timestamps: true, // Sequelize will automatically create 'createdAt' and 'updatedAt' columns
    }

    );
   
    return unsubscribedUsers;
};
