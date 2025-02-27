const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

exports.main = async (event, context) => {
  const { sessionKey, encryptedData, iv } = event
  
  console.log('接收到解密请求参数:', {
    hasSessionKey: !!sessionKey,
    hasEncryptedData: !!encryptedData,
    hasIv: !!iv
  })

  if (!sessionKey || !encryptedData || !iv) {
    return {
      success: false,
      message: '缺少必要的解密参数'
    }
  }

  try {
    // 使用微信提供的解密方法
    const wxContext = cloud.getWXContext()
    const result = await cloud.openapi.security.decryptData({
      encryptedData,
      iv,
      sessionKey
    })

    console.log('解密结果:', result)

    return {
      success: true,
      data: result
    }
  } catch (err) {
    console.error('解密失败:', err)
    return {
      success: false,
      message: '解密失败：' + err.message
    }
  }
} 