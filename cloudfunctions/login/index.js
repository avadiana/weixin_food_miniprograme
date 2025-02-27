const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  try {
    const wxContext = cloud.getWXContext()
    console.log('wxContext:', wxContext)

    if (!wxContext.OPENID) {
      return {
        success: false,
        message: '获取用户标识失败'
      }
    }

    // 查询或创建用户
    const userCollection = db.collection('users')
    const user = await userCollection.where({ openId: wxContext.OPENID }).get()
    
    let userData = null

    if (user.data.length === 0) {
      // 创建新用户
      const newUser = {
        openId: wxContext.OPENID,
        createTime: db.serverDate(),
        lastLoginTime: db.serverDate()
      }
      
      const addResult = await userCollection.add({ data: newUser })
      userData = { 
        _id: addResult._id, 
        ...newUser, 
        openId: wxContext.OPENID
      }
    } else {
      // 更新现有用户
      const existUser = user.data[0]
      await userCollection.doc(existUser._id).update({
        data: { lastLoginTime: db.serverDate() }
      })
      userData = { 
        ...existUser, 
        openId: wxContext.OPENID
      }
    }

    return {
      success: true,
      data: userData
    }
  } catch (err) {
    console.error('登录失败:', err)
    return {
      success: false,
      message: err.message || '登录失败'
    }
  }
} 