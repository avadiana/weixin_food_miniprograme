const jwt = require('jsonwebtoken')
const config = require('../config/config')
const { createError } = require('../utils/error')

module.exports = async (ctx, next) => {
  const token = ctx.header.authorization?.split(' ')[1]
  
  if (!token) {
    throw createError(401, '未登录')
  }

  try {
    const decoded = jwt.verify(token, config.jwt.secret)
    ctx.state.user = decoded
    await next()
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      throw createError(401, 'token已过期')
    }
    throw createError(401, '无效的token')
  }
} 