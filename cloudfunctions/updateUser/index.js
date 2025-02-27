const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  try {
    const { userInfo } = event
    const { OPENID } = cloud.getWXContext()

    // 确保 openId 匹配
    if (userInfo.openId !== OPENID) {
      throw new Error('用户身份验证失败')
    }

    // 查询用户是否存在
    const user = await db.collection('users').where({
      openId: OPENID
    }).get()

    if (user.data.length === 0) {
      // 创建新用户
      await db.collection('users').add({
        data: {
          ...userInfo,
          createTime: db.serverDate(),
          lastLoginTime: db.serverDate()
        }
      })
    } else {
      // 更新现有用户
      await db.collection('users').doc(user.data[0]._id).update({
        data: {
          nickName: userInfo.nickName,
          avatarUrl: userInfo.avatarUrl,
          lastLoginTime: db.serverDate()
        }
      })
    }

    return {
      success: true
    }
  } catch (err) {
    console.error('更新用户信息失败:', err)
    return {
      success: false,
      message: err.message
    }
  }
} 