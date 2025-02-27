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
    this.loadMyShops()
    
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

    // 设置 CSS 变量
    const style = document.createElement('style')
    style.innerHTML = `
      page {
        --nav-height: ${menuButtonInfo.height + (menuButtonInfo.top - systemInfo.statusBarHeight) * 2}px;
        --nav-top: ${menuButtonInfo.top}px;
      }
    `
    document.head.appendChild(style)
  },

  // 加载我的店铺列表
  async loadMyShops() {
    if (this.data.loading || !this.data.hasMore) return
    
    this.setData({ loading: true })
    
    try {
      const db = wx.cloud.database()
      const res = await db.collection('shops')
        .where({
          'creator.nickName': app.globalData.userInfo.nickName
        })
        .orderBy('createTime', 'desc')
        .skip((this.data.page - 1) * this.data.pageSize)
        .limit(this.data.pageSize)
        .get()

      this.setData({
        shopList: [...this.data.shopList, ...res.data],
        page: this.data.page + 1,
        hasMore: res.data.length === this.data.pageSize,
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

  // 编辑店铺
  editShop(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/edit/edit?id=${id}`
    })
  },

  // 删除店铺
  deleteShop(e) {
    const id = e.currentTarget.dataset.id
    const shop = this.data.shopList.find(shop => shop._id === id)

    wx.showModal({
      title: '确认删除',
      content: '确定要删除这个店铺信息吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            const db = wx.cloud.database()
            
            await db.collection('shops').doc(id).remove()
            
            if (shop.photos && shop.photos.length > 0) {
              await wx.cloud.deleteFile({
                fileList: shop.photos
              })
            }

            // 从列表中移除
            this.setData({
              shopList: this.data.shopList.filter(s => s._id !== id)
            })

            wx.showToast({
              title: '删除成功',
              icon: 'success'
            })
          } catch (err) {
            console.error('删除失败：', err)
            wx.showToast({
              title: '删除失败',
              icon: 'none'
            })
          }
        }
      }
    })
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
      await this.loadMyShops()
      wx.stopPullDownRefresh()
    })
  },

  onReachBottom() {
    this.loadMyShops()
  }
}) 