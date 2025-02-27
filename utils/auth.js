// 登录管理类
class AuthManager {
  constructor() {
    this.userInfo = wx.getStorageSync('user_info')
    this.sessionKey = ''
    this.lastAuthTime = wx.getStorageSync('last_auth_time') || 0
    this.isLogging = false
    this.retryCount = 0
    this.maxRetries = 3
    this.lastProfileTime = 0 // 记录上次调用getUserProfile的时间
    this.lastSyncPromptTime = wx.getStorageSync('last_sync_prompt_time') || 0
    this.profileCallCount = 0  // 添加调用次数计数
    this.resetTime = Date.now()  // 添加重置时间
  }

  // 检查是否已登录
  isLoggedIn() {
    return !!this.userInfo
  }

  // 检查是否需要显示授权弹窗
  shouldShowAuth() {
    const now = Date.now()
    // 24小时内不重复显示
    if (now - this.lastAuthTime < 24 * 60 * 60 * 1000) {
      return false
    }
    return true
  }

  // 登录方法
  async login(userInfo) {
    try {
      console.log('开始登录流程，用户信息:', userInfo)

      // 先处理头像
      let avatarUrl = userInfo.avatarUrl
      if (avatarUrl && avatarUrl.startsWith('http://tmp/')) {
        avatarUrl = await this.uploadAvatarToCloud(avatarUrl)
      }

      // 调用云函数获取openid
      const { result } = await wx.cloud.callFunction({
        name: 'login'
      })

      if (!result || !result.success) {
        throw new Error(result?.message || '登录失败')
      }

      // 合并用户信息，使用处理后的头像URL
      const fullUserInfo = {
        ...userInfo,
        avatarUrl, // 使用处理后的头像URL
        openId: result.data.openId,
        lastLoginTime: new Date().getTime()
      }

      // 更新用户信息到数据库
      const updateResult = await wx.cloud.callFunction({
        name: 'updateUser',
        data: {
          userInfo: fullUserInfo
        }
      })

      if (!updateResult.result || !updateResult.result.success) {
        throw new Error('更新用户信息失败')
      }

      // 保存到本地
      this.userInfo = fullUserInfo
      wx.setStorageSync('user_info', fullUserInfo)

      // 更新全局状态
      const app = getApp()
      app.globalData.userInfo = fullUserInfo
      app.globalData.isLogin = true

      return {
        success: true,
        data: fullUserInfo
      }
    } catch (err) {
      console.error('登录失败:', err)
      throw err
    }
  }

  // 获取用户信息
  async getUserProfile() {
    try {
      console.log('开始获取用户信息...')
      
      // 直接调用 getUserProfile 获取用户信息
      const { userInfo } = await wx.getUserProfile({
        desc: '用于完善会员资料', // 声明获取用户个人信息后的用途
        lang: 'zh_CN'
      })

      console.log('getUserProfile 返回结果:', {
        hasUserInfo: !!userInfo,
        avatarUrl: userInfo?.avatarUrl,
        nickName: userInfo?.nickName
      })

      if (!userInfo) {
        return {
          success: false,
          message: '获取用户信息失败'
        }
      }

      // 基础登录获取openid
      const userData = await this.login()

      // 合并用户信息
      const fullUserInfo = {
        ...userInfo,
        openId: userData.openId
      }

      console.log('合并后的用户信息:', fullUserInfo)

      // 更新用户信息
      await this.updateUserInfo(fullUserInfo)
      return { success: true, data: fullUserInfo }
    } catch (err) {
      console.error('获取用户信息失败:', err)
      return { success: false, message: err.message }
    }
  }

  // 更新用户信息
  async updateUserInfo(userInfo) {
    try {
      const { result } = await wx.cloud.callFunction({
        name: 'updateUser',
        data: { userInfo }
      })

      if (!result || !result.success) {
        throw new Error(result?.message || '更新用户信息失败')
      }

      // 保存用户信息
      this.userInfo = userInfo
      wx.setStorageSync('user_info', userInfo)

      // 更新全局状态
      const app = getApp()
      app.updateLoginStatus(userInfo)

      return true
    } catch (err) {
      console.error('更新用户信息失败:', err)
      throw err
    }
  }

  // 退出登录
  logout() {
    // 清除本地存储
    this.userInfo = null
    wx.removeStorageSync('user_info')
    wx.removeStorageSync('last_auth_time')
    
    // 更新全局状态
    const app = getApp()
    app.globalData.userInfo = null
    app.globalData.isLogin = false
  }

  // 检查是否可以调用getUserProfile
  canGetUserProfile() {
    const now = Date.now()
    console.log('检查 getUserProfile 调用:', {
      profileCallCount: this.profileCallCount,
      timeSinceLastReset: now - this.resetTime
    })
    
    // 每30秒重置一次计数
    if (now - this.resetTime > 30000) {
      console.log('重置调用计数')
      this.profileCallCount = 0
      this.resetTime = now
    }

    // 允许在30秒内调用4次
    if (this.profileCallCount >= 4) {
      console.log('达到调用限制')
      wx.showToast({
        title: '请稍后再试',
        icon: 'none'
      })
      return false
    }

    this.profileCallCount++
    console.log('允许调用，当前计数:', this.profileCallCount)
    return true
  }

  // 检查是否需要提示同步信息
  shouldPromptSync() {
    const now = Date.now()
    // 24小时内不重复提示
    if (now - this.lastSyncPromptTime < 24 * 60 * 60 * 1000) {
      return false
    }
    return true
  }

  // 提示用户同步信息
  async promptSyncProfile() {
    if (!this.shouldPromptSync()) {
      return false
    }

    // 记录提示时间
    this.lastSyncPromptTime = Date.now()
    wx.setStorageSync('last_sync_prompt_time', this.lastSyncPromptTime)

    return new Promise((resolve) => {
      wx.showModal({
        title: '完善资料',
        content: '是否将微信头像和昵称同步到小程序？',
        confirmText: '同步信息',
        cancelText: '暂不同步',
        success: (res) => {
          if (res.confirm) {
            resolve(true)
          } else {
            resolve(false)
          }
        },
        fail: () => {
          resolve(false)
        }
      })
    })
  }

  // 同步用户信息
  async syncUserProfile() {
    try {
      if (!this.canGetUserProfile()) {
        wx.showToast({
          title: '请勿频繁操作',
          icon: 'none'
        })
        return false
      }

      wx.showLoading({ title: '同步中...' })

      // 获取用户信息
      const { userInfo } = await wx.getUserProfile({
        desc: '用于完善会员资料'
      }).catch(err => {
        console.log('用户拒绝授权:', err)
        return {}
      })

      if (!userInfo) {
        wx.showToast({
          title: '获取信息失败',
          icon: 'none'
        })
        return false
      }

      // 更新用户信息
      const success = await this.updateUserInfo(userInfo)
      
      if (success) {
        wx.showToast({
          title: '同步成功',
          icon: 'success'
        })
      }

      return success
    } catch (err) {
      console.error('同步用户信息失败:', err)
      wx.showToast({
        title: '同步失败，请重试',
        icon: 'none'
      })
      return false
    } finally {
      wx.hideLoading()
    }
  }

  // 处理需要登录的场景
  handleLoginRequired(redirectPath) {
    return new Promise((resolve) => {
      const app = getApp()
      
      wx.showModal({
        title: '提示',
        content: '请先登录后再继续操作',
        confirmText: '去登录',
        cancelText: '取消',
        success: (res) => {
          if (res.confirm) {
            app.globalData.redirectToAfterLogin = redirectPath
            wx.switchTab({
              url: '/pages/user/user',
              success: () => resolve(true),
              fail: () => resolve(false)
            })
          } else {
            resolve(false)
          }
        },
        fail: () => resolve(false)
      })
    })
  }

  // 处理头像上传到云存储
  async uploadAvatarToCloud(tempFilePath) {
    try {
      console.log('准备上传头像:', tempFilePath)

      // 获取文件信息
      const fileInfo = await wx.getFileInfo({
        filePath: tempFilePath
      }).catch(err => {
        console.warn('获取文件信息失败:', err)
        return { size: 0 }
      })

      // 检查文件大小（限制为 2MB）
      if (fileInfo.size > 2 * 1024 * 1024) {
        console.warn('头像文件过大:', fileInfo.size)
        throw new Error('头像文件不能超过2MB')
      }

      // 生成云存储路径
      const timestamp = Date.now()
      const randomStr = Math.random().toString(36).slice(-6)
      const cloudPath = `avatars/${timestamp}-${randomStr}.jpg`

      // 上传文件
      const uploadResult = await wx.cloud.uploadFile({
        cloudPath,
        filePath: tempFilePath
      })

      if (!uploadResult.fileID) {
        throw new Error('上传失败：未获取到文件ID')
      }

      console.log('头像上传成功:', uploadResult.fileID)
      return uploadResult.fileID

    } catch (err) {
      console.error('上传头像失败:', err)
      throw err // 向上抛出错误，让调用者处理
    }
  }

  // 添加一个专门处理头像的方法
  async handleAvatar(avatarUrl) {
    try {
      if (!avatarUrl) {
        console.log('没有收到头像URL')
        return DEFAULT_AVATAR
      }

      console.log('处理头像URL:', avatarUrl)

      // 如果是临时文件路径，上传到云存储
      if (avatarUrl.startsWith('http://tmp/') || avatarUrl.startsWith('wxfile://')) {
        const cloudUrl = await this.uploadAvatarToCloud(avatarUrl)
        console.log('上传到云存储后的URL:', cloudUrl)
        return cloudUrl
      }
      
      // 如果已经是云文件或http链接，直接返回
      if (avatarUrl.startsWith('cloud://') || avatarUrl.startsWith('http')) {
        console.log('使用现有URL:', avatarUrl)
        return avatarUrl
      }

      // 其他情况返回默认头像
      console.log('使用默认头像')
      return DEFAULT_AVATAR
    } catch (err) {
      console.error('处理头像失败:', err)
      return DEFAULT_AVATAR
    }
  }
}

// 添加默认头像常量
const DEFAULT_AVATAR = '/images/user.svg' // 使用已有的用户图标作为默认头像

export default new AuthManager() 