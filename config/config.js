module.exports = {
  // 微信小程序配置
  weapp: {
    appId: 'your_appid', // 小程序 appId
    appSecret: 'your_appsecret', // 小程序 appSecret
  },
  
  // JWT配置
  jwt: {
    secret: 'your_jwt_secret', // JWT签名密钥
    expiresIn: '7d' // token过期时间
  },
  
  // 数据库配置
  database: {
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: 'your_password',
    database: 'food_map'
  },
  
  // Redis配置(用于存储session)
  redis: {
    host: 'localhost',
    port: 6379,
    password: 'your_redis_password'
  }
} 