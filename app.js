// app.js
App({
  onLaunch: function () {
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力')
    } else {
      wx.cloud.init({
        env: 'food-5gny1x8yf00ec3c8', // 替换为你的云环境ID
        traceUser: true,
      })
    }

    this.globalData = {
      userInfo: null
    }
  }
})
