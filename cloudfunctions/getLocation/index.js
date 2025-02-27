const cloud = require('wx-server-sdk')
const request = require('request-promise')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

exports.main = async (event, context) => {
  const { address } = event
  const key = 'TFJBZ-3TWC3-GKU3V-O7IMG-HIMK6-OBF3J'

  console.log('开始处理地址:', address)

  try {
    if (!address) {
      return {
        success: false,
        message: '地址不能为空'
      }
    }

    // 构建请求URL和参数
    const url = 'https://apis.map.qq.com/ws/geocoder/v1/'
    const params = {
      address: address,
      key: key,
      output: 'json'
    }

    console.log('准备发送请求:', { url, params })

    // 发送请求
    const response = await request({
      url: url,
      method: 'GET',
      qs: params,
      json: true,
      timeout: 10000
    })

    console.log('腾讯地图API响应:', JSON.stringify(response))

    // 处理响应
    if (response && response.status === 0 && response.result && response.result.location) {
      return {
        success: true,
        location: response.result.location,
        message: '获取位置成功',
        formatted_address: response.result.formatted_addresses?.recommend 
          || response.result.address 
          || address
      }
    }

    // 处理错误响应
    return {
      success: false,
      message: response?.message || '无法解析该地址的位置信息',
      raw_response: response
    }

  } catch (err) {
    console.error('请求发生错误:', err)
    return {
      success: false,
      message: '位置服务暂时不可用，请稍后重试',
      error: err.message
    }
  }
} 