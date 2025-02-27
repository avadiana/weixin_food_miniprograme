const Router = require('koa-router')
const authController = require('../controllers/auth')
const authMiddleware = require('../middlewares/auth')

const router = new Router({ prefix: '/api' })

// 微信登录接口
router.post('/wx-auth', authController.wxLogin)

// 更新用户信息(需要验证token)
router.post('/user/update', authMiddleware, authController.updateUserInfo)

module.exports = router 