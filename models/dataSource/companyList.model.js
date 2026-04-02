//models/companyList.js
module.exports = (sequelize, DataTypes) => {
  const companyList = sequelize.define("CompanyList", {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    source: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    searchType: {
      type: DataTypes.STRING,
      default: "Any"
    },
    lastProcessedRowNumber: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    companyData: {
      type: DataTypes.JSONB,
      defaultValue: [],
    },
    status: {
      type: DataTypes.STRING,
      default: "Not Started"
    }
  });
  return companyList;
}
