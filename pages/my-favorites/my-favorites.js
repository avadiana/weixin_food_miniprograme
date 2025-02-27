const app = getApp()

Page({
  data: {
    shopList: [],
    page: 1,
    pageSize: 10,
    loading: false,
    hasMore: true,
    statusBarHeight: 0,  // 状态栏高度
    navBarHeight: 0,     // 导航栏高度
  },

  onLoad() {
    this.loadFavorites()
    
    // 获取系统信息
    const systemInfo = wx.getSystemInfoSync()
    // 获取胶囊按钮位置
    const menuButtonInfo = wx.getMenuButtonBoundingClientRect()
    
    // 计算导航栏高度
    const navBarHeight = (menuButtonInfo.top - systemInfo.statusBarHeight) * 2 + menuButtonInfo.height
    
    this.setData({
      statusBarHeight: systemInfo.statusBarHeight,
      navBarHeight: navBarHeight
    })
  },

  // 加载收藏列表
  async loadFavorites() {
    if (this.data.loading || !this.data.hasMore) return
    
    this.setData({ loading: true })
    
    try {
      const db = wx.cloud.database()
      
      // 先获取收藏记录
      const favoriteRes = await db.collection('favorites')
        .where({
          userId: app.globalData.userInfo.nickName
        })
        .orderBy('createTime', 'desc')
        .skip((this.data.page - 1) * this.data.pageSize)
        .limit(this.data.pageSize)
        .get()

      if (favoriteRes.data.length === 0) {
        this.setData({
          loading: false,
          hasMore: false
        })
        return
      }

      // 获取店铺详情
      const shopIds = favoriteRes.data.map(f => f.shopId)
      const _ = db.command
      const shopRes = await db.collection('shops')
        .where({
          _id: _.in(shopIds)
        })
        .get()

      // 合并数据
      const shopList = shopRes.data.map(shop => ({
        ...shop,
        isFavorite: true
      }))

      this.setData({
        shopList: [...this.data.shopList, ...shopList],
        page: this.data.page + 1,
        hasMore: favoriteRes.data.length === this.data.pageSize,
        loading: false
      })
    } catch (err) {
      console.error('加载失败：', err)
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
      this.setData({ loading: false })
    }
  },

  // 取消收藏
  async cancelFavorite(e) {
    const id = e.currentTarget.dataset.id
    
    try {
      const db = wx.cloud.database()
      await db.collection('favorites')
        .where({
          userId: app.globalData.userInfo.nickName,
          shopId: id
        })
        .remove()

      // 从列表中移除
      this.setData({
        shopList: this.data.shopList.filter(shop => shop._id !== id)
      })

      wx.showToast({
        title: '已取消收藏',
        icon: 'success'
      })
    } catch (err) {
      console.error('取消失败：', err)
      wx.showToast({
        title: '操作失败',
        icon: 'none'
      })
    }
  },

  // 复制地址
  copyAddress(e) {
    const address = e.currentTarget.dataset.address
    wx.setClipboardData({
      data: address,
      success: () => {
        wx.showToast({
          title: '地址已复制',
          icon: 'success'
        })
      }
    })
  },

  // 跳转到详情页
  goToDetail(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/shop-detail/shop-detail?id=${id}`
    })
  },

  // 返回上一页
  goBack() {
    wx.navigateBack()
  },

  onPullDownRefresh() {
    this.setData({
      shopList: [],
      page: 1,
      hasMore: true
    }, async () => {
      await this.loadFavorites()
      wx.stopPullDownRefresh()
    })
  },

  onReachBottom() {
    this.loadFavorites()
  }
}) 