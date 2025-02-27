Page({
  data: {
    shop: null,
    // 注释掉地图相关数据
    // latitude: null,
    // longitude: null,
    // markers: [],
    // mapHeight: 400,
    // devicePixelRatio: 1,
    // platform: '',
    // brand: '',
    // model: '',
    // system: '',
    // locationAuthorized: false
  },

  onLoad(options) {
    // 注释掉地图相关初始化
    // try {
    //   const windowInfo = wx.getWindowInfo()
    //   const deviceInfo = wx.getDeviceInfo()
    //   const appBaseInfo = wx.getAppBaseInfo()
    //   const authSetting = wx.getAppAuthorizeSetting()
    //   this.setData({
    //     mapHeight: windowInfo.windowWidth,
    //     devicePixelRatio: windowInfo.pixelRatio,
    //     platform: deviceInfo.platform,
    //     brand: deviceInfo.brand,
    //     model: deviceInfo.model,
    //     system: deviceInfo.system,
    //     locationAuthorized: authSetting.locationAuthorized
    //   })
    // } catch (err) {
    //   console.error('获取系统信息失败：', err)
    //   this.setData({
    //     mapHeight: 400
    //   })
    // }
    
    this.loadShopDetail(options.id)
  },

  // 加载店铺详情
  async loadShopDetail(id) {
    try {
      const db = wx.cloud.database()
      const res = await db.collection('shops').doc(id).get()
      
      // 打印查看数据是否包含 remarks
      console.log('shop detail:', res.data)
      
      // 格式化时间
      const shop = {
        ...res.data,
        createTime: new Date(res.data.createTime).toLocaleDateString()
      }
      
      this.setData({ shop })

      // 注释掉获取地址经纬度
      // this.getLocationFromAddress(shop.address)
    } catch (err) {
      console.error('加载失败：', err)
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
    }
  },

  // 注释掉地图相关方法
  // getLocationFromAddress() {...},
  // openLocation() {...},

  // 保留其他方法
  previewImage(e) {
    const url = e.currentTarget.dataset.url
    wx.previewImage({
      urls: this.data.shop.photos,
      current: url
    })
  },

  previewMenu(e) {
    const url = e.currentTarget.dataset.url
    wx.previewImage({
      urls: this.data.shop.menuPhotos,
      current: url
    })
  },

  copyAddress() {
    wx.setClipboardData({
      data: this.data.shop.address,
      success: () => {
        wx.showToast({
          title: '地址已复制',
          icon: 'success'
        })
      }
    })
  },

  goBack() {
    wx.navigateBack()
  },

  // 收藏/取消收藏
  async toggleFavorite() {
    try {
      if (!auth.userInfo?.openId) {
        wx.showToast({
          title: '请先登录',
          icon: 'none'
        })
        return
      }

      const db = wx.cloud.database()
      const shop = this.data.shop
      
      // 查询是否已收藏
      const favoriteRes = await db.collection('favorites').where({
        shopId: shop._id,
        _openid: auth.userInfo.openId  // 使用 _openid 而不是 userId
      }).get()

      let isFavorite = false
      if (favoriteRes.data.length > 0) {
        // 取消收藏
        await db.collection('favorites').doc(favoriteRes.data[0]._id).remove()
      } else {
        // 添加收藏
        await db.collection('favorites').add({
          data: {
            shopId: shop._id,
            shopName: shop.name,  // 添加店铺名称便于显示
            shopPhoto: shop.photos[0],  // 添加店铺封面图
            createTime: db.serverDate()
            // _openid 会自动添加
          }
        })
        isFavorite = true
      }

      // 更新全局收藏数
      const app = getApp()
      if (app.globalData.userInfo) {
        app.globalData.userInfo.favoriteCount = 
          (app.globalData.userInfo.favoriteCount || 0) + (isFavorite ? 1 : -1)
      }
      
      // 强制刷新机制
      wx.setStorageSync('last_stats_refresh', 0)
      app.globalData.needRefreshUserStats = true

      wx.showToast({
        title: isFavorite ? '已收藏' : '已取消收藏',
        icon: 'success'
      })

    } catch (err) {
      console.error('收藏操作失败:', err)
      wx.showToast({
        title: '操作失败，请重试',
        icon: 'none'
      })
    }
  }
}) 