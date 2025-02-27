// app.js - 小程序全局配置文件

import auth from './utils/auth'

App({
  // 全局数据对象
  globalData: {
    // 店铺分类数组
    categories: ['全部', '早餐', '正餐', '喝茶', '咖啡厅', '酒吧', '夜宵', '书&谷子店', '其他'],
    // 分类对应的图标路径
    categoryIcons: [
      '/images/all.svg',
      '/images/breakfast.svg',
      '/images/lunch.svg',
      '/images/tea.svg',
      '/images/coffee.svg',
      '/images/bar.svg',
      '/images/night.svg',
      '/images/book-grain.svg',
      '/images/other.svg'
    ],
    // 用户信息相关
    userInfo: null,
    isLogin: false,
    needAutoLogin: false,
    needRefreshUserStats: false,
    redirectToAfterLogin: null,
    systemInfo: {},
    needRefreshShopList: false  // 添加店铺列表刷新标记
  },

  // 小程序启动时执行
  onLaunch() {
    // 初始化云开发
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力')
    } else {
      wx.cloud.init({
        env: 'food-5gny1x8yf00ec3c8',
        traceUser: true
      })
    }

    // 获取系统信息
    try {
      const systemInfo = wx.getWindowInfo()
      const appBaseInfo = wx.getAppBaseInfo()
      this.globalData.systemInfo = {
        ...systemInfo,
        ...appBaseInfo
      }
    } catch (err) {
      console.error('获取系统信息失败:', err)
    }

    // 恢复登录状态
    this.restoreLoginState()

    // 添加登录状态监听
    wx.onAppShow(() => {
      // 恢复登录状态
      this.restoreLoginState()
      console.log('小程序显示，检查统计刷新状态:', this.globalData.needRefreshUserStats)
    })
  },

  // 恢复登录状态
  restoreLoginState() {
    try {
      const userInfo = wx.getStorageSync('user_info')
      if (userInfo) {
        this.globalData.userInfo = userInfo
        this.globalData.isLogin = true
      }
    } catch (err) {
      console.error('恢复登录状态失败:', err)
    }
  },

  // 更新登录状态
  updateLoginStatus(userInfo) {
    this.globalData.userInfo = userInfo
    this.globalData.isLogin = !!userInfo
  }
})
