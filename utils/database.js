const { Sequelize } = require('sequelize')
const config = require('../config/config')

const sequelize = new Sequelize({
  dialect: 'mysql',
  ...config.database,
  logging: false
})

module.exports = sequelize 