const app = getApp()
const auth = require('../../utils/auth').default

Page({
  data: {
    // ... 其他数据 ...
    tagOptions: [
      { label: '有WIFI', value: 'wifi' },
      { label: '可刷卡', value: 'card' },
      { label: '停车方便', value: 'parking' },
      { label: '环境安静', value: 'quiet' },
      { label: '性价比高', value: 'valuable' },
      { label: '服务周到', value: 'service' }
    ],
    selectedTags: [],
    // 移除自定义标签相关的数据
    // customTag: '',
    // showCustomTagInput: false,
    // ... 其他数据 ...
  },

  // ... 其他代码 ...

  // 检查登录状态
  async checkLogin() {
    console.log('开始检查登录状态')
    if (!auth.isLoggedIn()) {
      console.log('用户未登录，显示登录提示')
      wx.showModal({
        title: '提示',
        content: '请先在用户中心登录后再添加店铺信息',
        confirmText: '去登录',
        cancelText: '取消',
        async success(res) {
          console.log('用户操作结果:', res)
          if (res.confirm) {
            console.log('用户确认登录，准备跳转')
            // 设置全局状态
            app.globalData.needAutoLogin = true
            app.globalData.redirectToAfterLogin = '/pages/add-shop/add-shop'
            
            // 跳转到用户页面
            wx.switchTab({
              url: '/pages/user/user'
            })
          }
        }
      })
      return false
    }
    return true
  },

  // 添加店铺前检查登录
  async handleAddShop() {
    console.log('准备添加店铺')
    if (!auth.isLoggedIn()) {
      await this.checkLogin()
      return
    }
    // ... 继续添加店铺的逻辑 ...
  },

  // 处理标签选择
  handleTagSelect(e) {
    const { value } = e.currentTarget.dataset
    const { selectedTags } = this.data
    
    const index = selectedTags.indexOf(value)
    if (index > -1) {
      // 移除标签
      this.setData({
        selectedTags: selectedTags.filter(tag => tag !== value)
      })
    } else {
      // 添加标签
      this.setData({
        selectedTags: [...selectedTags, value]
      })
    }
  },

  // 提交店铺信息
  async submitShop() {
    try {
      // 先检查用户信息是否完整
      if (!auth.userInfo || !auth.userInfo.openId) {
        console.error('用户信息不完整:', auth.userInfo)
        wx.showToast({
          title: '登录状态异常，请重新登录',
          icon: 'none'
        })
        return
      }

      console.log('准备添加店铺，当前用户信息:', auth.userInfo)

      const db = wx.cloud.database()
      const result = await db.collection('shops').add({
        data: {
          name: this.data.name,
          address: this.data.address,
          photos: this.data.photos,
          menuPhotos: this.data.menuPhotos,
          category: this.data.category,
          remarks: this.data.remarks,
          // 存储标签的值而不是标签的显示文本
          tags: this.data.selectedTags,
          creator: {
            openId: auth.userInfo.openId,
            nickName: auth.userInfo.nickName || '微信用户',
            avatarUrl: auth.userInfo.avatarUrl || '/images/user.svg'
          },
          createTime: db.serverDate(),
          creatorInfo: {
            ...auth.userInfo,
            addTime: new Date().toISOString()
          }
        }
      })

      if (result._id) {
        const app = getApp()
        
        // 强制更新全局用户信息
        app.globalData.userInfo = { 
          ...auth.userInfo,
          contributedCount: (app.globalData.userInfo?.contributedCount || 0) + 1
        }
        
        // 触发双重刷新机制
        app.globalData.needRefreshUserStats = true
        wx.setStorageSync('last_stats_refresh', 0)  // 重置刷新时间

        console.log('添加成功，已更新全局用户信息')

        wx.showToast({
          title: '添加成功',
          icon: 'success'
        })

        setTimeout(() => {
          wx.navigateBack()
        }, 1500)
      }
    } catch (err) {
      console.error('添加店铺失败:', err)
      wx.showToast({
        title: '添加失败，请重试',
        icon: 'none'
      })
    }
  }
}) 