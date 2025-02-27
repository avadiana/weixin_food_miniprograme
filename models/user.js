const { DataTypes } = require('sequelize')
const sequelize = require('../utils/database')

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  openId: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false
  },
  nickName: {
    type: DataTypes.STRING,
    allowNull: true
  },
  avatarUrl: {
    type: DataTypes.STRING,
    allowNull: true
  },
  sessionKey: {
    type: DataTypes.STRING,
    allowNull: true
  }
})

module.exports = User 