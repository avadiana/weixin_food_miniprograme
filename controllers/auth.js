const jwt = require('jsonwebtoken')
const axios = require('axios')
const config = require('../config/config')
const User = require('../models/user')
const { createError } = require('../utils/error')

class AuthController {
  // 处理微信登录
  async wxLogin(ctx) {
    const { code } = ctx.request.body
    
    if (!code) {
      throw createError(400, '缺少code参数')
    }

    try {
      // 请求微信接口获取openid和session_key
      const wxLoginUrl = `https://api.weixin.qq.com/sns/jscode2session`
      const wxResponse = await axios.get(wxLoginUrl, {
        params: {
          appid: config.weapp.appId,
          secret: config.weapp.appSecret,
          js_code: code,
          grant_type: 'authorization_code'
        }
      })

      const { openid, session_key } = wxResponse.data

      if (!openid) {
        throw createError(401, '微信登录失败')
      }

      // 查找或创建用户
      let [user, created] = await User.findOrCreate({
        where: { openId: openid },
        defaults: {
          sessionKey: session_key
        }
      })

      // 如果用户存在则更新session_key
      if (!created) {
        user.sessionKey = session_key
        await user.save()
      }

      // 生成JWT token
      const token = jwt.sign(
        { 
          userId: user.id,
          openId: openid
        },
        config.jwt.secret,
        { expiresIn: config.jwt.expiresIn }
      )

      ctx.body = {
        success: true,
        data: {
          token,
          isNewUser: created
        }
      }
    } catch (err) {
      throw createError(500, '登录失败:' + err.message)
    }
  }

  // 更新用户信息
  async updateUserInfo(ctx) {
    const { userId } = ctx.state.user
    const userInfo = ctx.request.body

    try {
      const user = await User.findByPk(userId)
      if (!user) {
        throw createError(404, '用户不存在')
      }

      // 更新用户信息
      await user.update({
        nickName: userInfo.nickName,
        avatarUrl: userInfo.avatarUrl
      })

      ctx.body = {
        success: true,
        data: user
      }
    } catch (err) {
      throw createError(500, '更新用户信息失败:' + err.message)
    }
  }
}

module.exports = new AuthController() 