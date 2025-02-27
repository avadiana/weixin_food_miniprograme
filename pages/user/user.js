import auth from '../../utils/auth'

const app = getApp()

Page({
  data: {
    userInfo: null,
    tempUserInfo: {
      avatarUrl: '',
      nickName: ''
    },
    contributedCount: 0,
    favoriteCount: 0,
    statusBarHeight: 0,  // 状态栏高度
    navBarHeight: 0,     // 导航栏高度
    showSyncButton: false,
    lastRefresh: 0,
  },

  onLoad() {
    console.log('用户页面加载')
    
    // 获取系统信息
    const { windowHeight, statusBarHeight } = app.globalData.systemInfo
    const menuButtonInfo = wx.getMenuButtonBoundingClientRect()
    const navBarHeight = (menuButtonInfo.top - statusBarHeight) * 2 + menuButtonInfo.height
    
    // 从全局状态获取用户信息
    const userInfo = app.globalData.userInfo || auth.userInfo
    
    this.setData({
      statusBarHeight,
      navBarHeight,
      userInfo: userInfo
    })

    if (userInfo) {
      this.loadUserStats()
    }
  },

  onShow() {
    console.log('用户页面显示，检查统计刷新状态')
    const app = getApp()
    
    // 强制刷新用户信息
    this.setData({
      userInfo: app.globalData.userInfo || auth.userInfo
    }, () => {
      // 检查是否需要刷新统计数据
      if (app.globalData.needRefreshUserStats) {
        console.log('触发统计刷新')
        this.loadUserStats()
        app.globalData.needRefreshUserStats = false
      } else {
        // 至少每5分钟自动刷新一次
        const lastRefresh = this.data.lastRefresh || 0
        if (Date.now() - lastRefresh > 300000) {
          console.log('定时强制刷新统计')
          this.loadUserStats()
        }
      }
    })

    if (app.globalData.needAutoLogin) {
      this.triggerLogin()
    }
  },

  // 加载用户统计
  async loadUserStats() {
    const userInfo = this.data.userInfo
    if (!userInfo?.openId) {
      console.log('未找到有效用户信息')
      return
    }

    console.log('正在查询统计，用户openId:', userInfo.openId)
    
    try {
      const db = wx.cloud.database()
      const _ = db.command
      
      // 修正查询条件
      const [shopsRes, favoritesRes] = await Promise.all([
        db.collection('shops')
          .where(_.or([
            {'creator.openId': userInfo.openId},
            {_openid: userInfo.openId}
          ]))
          .count(),
        
        db.collection('favorites')
          .where({
            _openid: userInfo.openId  // 使用 _openid 查询
          })
          .count()
      ])

      console.log('统计结果:', {
        贡献店铺: shopsRes.total,
        收藏店铺: favoritesRes.total
      })

      this.setData({
        contributedCount: shopsRes.total,
        favoriteCount: favoritesRes.total,
        lastRefresh: Date.now()
      })

    } catch (err) {
      console.error('统计查询失败:', err)
      wx.showToast({
        title: '数据加载失败',
        icon: 'none'
      })
    }
  },

  // 处理授权登录
  async handleAuthLogin(e) {
    try {
      wx.showLoading({ title: '登录中...' })
      
      const result = await auth.handleAuthLogin(e)
      if (!result.success) {
        // 用户拒绝授权，使用默认头像
        this.setData({
          userInfo: {
            avatarUrl: '/images/user.svg',
            nickName: '微信用户'
          }
        })
        return
      }

      this.setData({ userInfo: result.data })
      await this.loadUserStats()

    } catch (err) {
      wx.showToast({
        title: '登录失败，请重试',
        icon: 'none'
      })
    } finally {
      wx.hideLoading()
    }
  },

  // 获取用户详细信息
  async handleGetProfile() {
    if (!auth.shouldShowAuth()) {
      wx.showToast({
        title: '请稍后再试',
        icon: 'none'
      })
      return
    }

    try {
      wx.showLoading({ title: '同步中...' })
      
      const result = await auth.getUserProfile()
      if (!result.success) {
        return
      }

      this.setData({ userInfo: result.data })
      await this.loadUserStats()

      wx.showToast({
        title: '同步成功',
        icon: 'success'
      })
    } catch (err) {
      wx.showToast({
        title: '同步失败，请重试',
        icon: 'none'
      })
    } finally {
      wx.hideLoading()
    }
  },

  // 跳过资料同步
  handleSkipProfile() {
    this.setData({
      userInfo: {
        avatarUrl: '/images/user.svg',
        nickName: '微信用户'
      }
    })
  },

  // 处理选择头像
  async onChooseAvatar(e) {
    try {
      wx.showLoading({
        title: '处理头像中...',
        mask: true
      })

      const tempFilePath = e.detail.avatarUrl
      
      // 使用 auth 的方法处理头像
      const avatarUrl = await auth.handleAvatar(tempFilePath)
      
      this.setData({
        'tempUserInfo.avatarUrl': avatarUrl
      }, () => {
        console.log('头像已更新:', avatarUrl)
      })

      wx.hideLoading()
    } catch (err) {
      console.error('处理头像失败:', err)
      wx.hideLoading()
      wx.showToast({
        title: '头像设置失败',
        icon: 'none'
      })
    }
  },

  // 处理输入昵称
  onInputNickname(e) {
    console.log('输入昵称:', e.detail)
    const nickName = e.detail.value
    
    this.setData({
      'tempUserInfo.nickName': nickName
    })
  },

  // 处理隐私授权和登录
  async handlePrivacyAuth() {
    try {
      // 先处理隐私授权
      const privacyAuthorized = await wx.getPrivacySetting({
        success: (res) => {
          console.log('隐私授权状态:', res)
          return res.needAuthorization === false
        }
      })

      // 如果未授权，显示隐私协议
      if (!privacyAuthorized) {
        await wx.requirePrivacyAuthorize({
          success: () => {
            // 用户同意隐私授权后，直接进行登录
            this.handleLogin()
          },
          fail: (err) => {
            console.log('用户拒绝隐私授权:', err)
            wx.showToast({
              title: '请先同意隐私协议',
              icon: 'none'
            })
          }
        })
      } else {
        // 已授权，直接登录
        this.handleLogin()
      }
    } catch (err) {
      console.error('隐私授权处理失败:', err)
      wx.showToast({
        title: '登录失败，请重试',
        icon: 'none'
      })
    }
  },

  // 处理登录
  async handleLogin() {
    try {
      console.log('开始登录流程')
      wx.showLoading({ title: '登录中...' })

      const { tempUserInfo } = this.data
      if (!tempUserInfo.avatarUrl || !tempUserInfo.nickName) {
        wx.showToast({
          title: '请先选择头像并输入昵称',
          icon: 'none'
        })
        return
      }

      // 调用登录方法
      const result = await auth.login(tempUserInfo)
      console.log('登录结果:', result)

      if (!result.success) {
        throw new Error(result.message || '登录失败')
      }

      this.setData({ 
        userInfo: result.data,
        tempUserInfo: { avatarUrl: '', nickName: '' }
      })
      
      await this.loadUserStats()

      wx.showToast({
        title: '登录成功',
        icon: 'success'
      })

      // 处理登录后的重定向
      this.handleLoginSuccess()
    } catch (err) {
      console.error('登录失败:', err)
      wx.showToast({
        title: err.message || '登录失败，请重试',
        icon: 'none'
      })
    } finally {
      wx.hideLoading()
    }
  },

  // 处理登录成功后的重定向
  handleLoginSuccess() {
    const redirectTo = app.globalData.redirectToAfterLogin
    if (redirectTo) {
      // 清除重定向记录
      app.globalData.redirectToAfterLogin = null
      app.globalData.needAutoLogin = false

      // 延迟执行跳转，确保当前页面状态已更新
      setTimeout(() => {
        if (redirectTo.startsWith('/pages/')) {
          wx.navigateTo({
            url: redirectTo,
            fail: () => {
              // 如果 navigateTo 失败，尝试 switchTab
              wx.switchTab({
                url: redirectTo
              })
            }
          })
        }
      }, 500)
    }
  },

  // 同步资料按钮点击事件
  async handleSync() {
    const syncSuccess = await auth.syncUserProfile()
    if (syncSuccess) {
      this.setData({
        userInfo: auth.userInfo,
        showSyncButton: false
      })
      this.loadUserStats()
    }
  },

  // 跳转到我的店铺
  goToMyShops() {
    if (!this.data.userInfo) {
      return wx.showToast({
        title: '请先登录',
        icon: 'none'
      })
    }
    wx.navigateTo({
      url: '/pages/my-shops/my-shops'
    })
  },

  // 跳转到我的收藏
  goToFavorites() {
    if (!this.data.userInfo) {
      return wx.showToast({
        title: '请先登录',
        icon: 'none'
      })
    }
    wx.navigateTo({
      url: '/pages/my-favorites/my-favorites'
    })
  },

  // 跳转到排行榜
  goToRanking() {
    wx.navigateTo({
      url: '/pages/ranking/ranking'
    })
  },

  // 修改退出登录方法名和实现
  handleLogout() {
    console.log('退出按钮被点击') // 先测试事件是否被触发
    
    wx.showModal({
      title: '提示',
      content: '确定要退出登录吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            console.log('用户确认退出')
            wx.showLoading({ title: '退出中...' })
            
            // 调用 auth 的退出方法
            auth.logout()
            
            // 重置页面状态
            this.setData({
              userInfo: null,
              contributedCount: 0,
              favoriteCount: 0,
              showSyncButton: false
            })

            wx.showToast({
              title: '已退出登录',
              icon: 'success'
            })
          } catch (err) {
            console.error('退出登录失败:', err)
            wx.showToast({
              title: '退出失败，请重试',
              icon: 'none'
            })
          } finally {
            wx.hideLoading()
          }
        } else {
          console.log('用户取消退出')
        }
      },
      fail: (err) => {
        console.error('显示退出确认框失败:', err)
      }
    })
  },

  // 触发登录流程
  async triggerLogin() {
    console.log('触发登录流程')
    try {
      const success = await this.handleLogin()
      console.log('登录结果:', success)
    } catch (err) {
      console.error('登录失败:', err)
    }
  },

  // 处理获取用户信息
  async handleGetUserProfile() {
    try {
      console.log('点击了微信快捷登录按钮')
      wx.showLoading({ title: '登录中...' })
      
      // 获取用户信息
      const { userInfo } = await wx.getUserProfile({
        desc: '用于完善会员资料',
        lang: 'zh_CN'
      })

      console.log('获取到用户信息:', userInfo)

      if (!userInfo) {
        throw new Error('获取用户信息失败')
      }

      // 调用登录方法
      const result = await auth.login(userInfo)
      console.log('登录结果:', result)

      if (!result.success) {
        throw new Error(result.message || '登录失败')
      }

      // 更新页面显示
      this.setData({ 
        userInfo: result.data,
        tempUserInfo: {
          avatarUrl: userInfo.avatarUrl,
          nickName: userInfo.nickName
        }
      })
      
      // 加载用户统计
      await this.loadUserStats()

      wx.showToast({
        title: '登录成功',
        icon: 'success'
      })

      // 处理登录后的重定向
      this.handleLoginSuccess()
    } catch (err) {
      console.error('登录失败:', err)
      wx.showToast({
        title: err.message || '登录失败，请重试',
        icon: 'none',
        duration: 2000
      })
    } finally {
      wx.hideLoading()
    }
  },

  // 添加下拉刷新处理函数
  async onPullDownRefresh() {
    try {
      // 只刷新统计数据
      if (auth.isLoggedIn()) {
        await this.loadUserStats()
        
        wx.showToast({
          title: '刷新成功',
          icon: 'success'
        })
      }
    } catch (err) {
      console.error('刷新统计数据失败:', err)
      wx.showToast({
        title: '刷新失败',
        icon: 'none'
      })
    } finally {
      wx.stopPullDownRefresh()
    }
  },

  // 添加手动刷新按钮处理函数
  async handleRefresh() {
    wx.showLoading({
      title: '刷新中...'
    })

    try {
      // 只刷新统计数据
      if (auth.isLoggedIn()) {
        await this.loadUserStats()
        
        wx.showToast({
          title: '刷新成功',
          icon: 'success'
        })
      }
    } catch (err) {
      console.error('刷新统计数据失败:', err)
      wx.showToast({
        title: '刷新失败',
        icon: 'none'
      })
    } finally {
      wx.hideLoading()
    }
  },
}) 