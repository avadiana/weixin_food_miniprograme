const app = getApp()

Page({
  data: {
    categories: [],
    categoryIcons: [],
    currentCategory: 0,
    isSticky: false,
    showCategoryPicker: false,
    shopList: [],
    leftColumn: [],
    rightColumn: [],
    page: 1,
    pageSize: 10,
    loading: false,
    hasMore: true,
    userInfo: null,
    searchKeyword: '',  // 搜索关键词
    isSearching: false,  // 是否在搜索状态
    loadingMore: false, // 添加加载更多状态
    showBackTop: false, // 控制返回顶部按钮显示
    tagMap: {
      'wifi': '有WIFI',
      'card': '可刷卡',
      'parking': '停车方便',
      'quiet': '环境安静',
      'valuable': '性价比高',
      'service': '服务周到'
    }
  },

  onLoad() {
    // 从全局获取分类数据
    this.setData({
      categories: app.globalData.categories,
      categoryIcons: app.globalData.categoryIcons,
      userInfo: app.globalData.userInfo
    })
    this.setupObserver()
    this.loadShopList()
  },

  onShow() {
    // 每次显示页面时更新用户信息
    if (this.data.userInfo !== app.globalData.userInfo) {
      this.setData({
        userInfo: app.globalData.userInfo
      })
    }

    // 检查是否需要刷新店铺列表
    if (app.globalData.needRefreshShopList) {
      console.log('检测到店铺数据变化，刷新列表')
      this.setData({
        shopList: [],
        leftColumn: [],
        rightColumn: [],
        page: 1,
        hasMore: true
      }, () => {
        this.loadShopList()
      })
      app.globalData.needRefreshShopList = false
    }
  },

  // 设置吸顶监听
  setupObserver() {
    this.observer = wx.createIntersectionObserver(this)
    this.observer.relativeToViewport().observe('.category-nav', (res) => {
      this.setData({
        isSticky: res.intersectionRatio <= 0
      })
    })
  },

  // 切换分类
  async switchCategory(e) {
    const index = e.currentTarget.dataset.index
    if (index === this.data.currentCategory) return
    
    this.setData({
      currentCategory: index,
      shopList: [],
      leftColumn: [],
      rightColumn: [],
      page: 1,
      hasMore: true
    })
    
    await this.loadShopList()
  },

  // 加载店铺列表
  async loadShopList() {
    if (this.data.loading || !this.data.hasMore) return
    
    this.setData({ loading: true })
    
    try {
      const db = wx.cloud.database()
      const _ = db.command
      
      // 构建查询条件
      let query = {}
      
      // 分类筛选
      if (this.data.currentCategory !== 0) {
        query.category = this.data.categories[this.data.currentCategory]
      }
      
      // 搜索条件
      if (this.data.isSearching && this.data.searchKeyword) {
        const keyword = this.data.searchKeyword.trim()
        // 扩展搜索条件,加入标签搜索
        query = _.or([
          {
            name: db.RegExp({
              regexp: keyword,
              options: 'i'
            })
          },
          {
            address: db.RegExp({
              regexp: keyword,
              options: 'i'
            })
          },
          {
            // 新增: 标签搜索
            tags: db.RegExp({
              regexp: keyword,
              options: 'i'
            })
          }
        ])
      }
      
      const res = await db.collection('shops')
        .where(query)
        .skip((this.data.page - 1) * this.data.pageSize)
        .limit(this.data.pageSize)
        .orderBy('createTime', 'desc')
        .get()

      // 如果用户已登录，获取收藏状态
      let favorites = []
      if (app.globalData.isLogin) {
        const favRes = await db.collection('favorites')
          .where({
            userId: app.globalData.userInfo.nickName,
            shopId: _.in(res.data.map(shop => shop._id))
          })
          .get()
        favorites = favRes.data.map(f => f.shopId)
      }

      const newShops = res.data.map(shop => ({
        ...shop,
        imageLoaded: false,
        categoryIndex: this.data.categories.indexOf(shop.category),
        isFavorite: favorites.includes(shop._id)
      }))

      // 优化状态更新，合并setData调用
      const newState = {
        shopList: [...this.data.shopList, ...newShops],
        page: this.data.page + 1,
        hasMore: res.data.length === this.data.pageSize,
        loading: false
      }
      
      this.setData(newState)
    } catch (err) {
      console.error('加载店铺列表失败：', err)
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
    } finally {
      this.setData({ loading: false })
    }
  },

  // 图片加载完成
  onImageLoad(e) {
    const index = e.currentTarget.dataset.index
    const key = `shopList[${index}].imageLoaded`
    this.setData({
      [key]: true
    })
  },

  // 切换收藏状态
  async toggleFavorite(e) {
    if (!app.globalData.isLogin) {
      return wx.showToast({
        title: '请先登录',
        icon: 'none'
      })
    }

    const id = e.currentTarget.dataset.id
    const shop = this.data.shopList.find(shop => shop._id === id)
    const db = wx.cloud.database()

    try {
      if (shop.isFavorite) {
        // 取消收藏
        const res = await db.collection('favorites').where({
          userId: app.globalData.userInfo.nickName,
          shopId: id
        }).remove()
        
        if (!res.stats || res.stats.removed === 0) {
          throw new Error('取消收藏失败')
        }
      } else {
        // 添加收藏
        const res = await db.collection('favorites').add({
          data: {
            userId: app.globalData.userInfo.nickName,
            shopId: id,
            createTime: db.serverDate()
          }
        })
        
        if (!res._id) {
          throw new Error('收藏失败')
        }
      }

      // 更新本地状态
      const shopList = this.data.shopList.map(s => {
        if (s._id === id) {
          return { ...s, isFavorite: !s.isFavorite }
        }
        return s
      })

      this.setData({ shopList })

      wx.showToast({
        title: shop.isFavorite ? '已取消收藏' : '收藏成功',
        icon: 'success'
      })

      // 标记需要刷新用户统计
      app.globalData.needRefreshUserStats = true
    } catch (err) {
      console.error('操作失败：', err)
      wx.showToast({
        title: err.message || '操作失败',
        icon: 'none'
      })
    }
  },

  // 下拉刷新处理
  async onPullDownRefresh() {
    try {
      // 重置列表状态
      this.setData({
        shopList: [],
        leftColumn: [],
        rightColumn: [],
        page: 1,
        hasMore: true
      })

      // 重新加载数据
      await this.loadShopList()
    } catch (err) {
      console.error('刷新失败：', err)
      wx.showToast({
        title: '刷新失败',
        icon: 'none'
      })
    } finally {
      // 停止下拉刷新动画
      wx.stopPullDownRefresh()
    }
  },

  // 优化触底加载
  async onReachBottom() {
    if (this.data.loading || this.data.loadingMore || !this.data.hasMore) return
    
    this.setData({ loadingMore: true })
    try {
      await this.loadShopList()
    } finally {
      this.setData({ loadingMore: false })
    }
  },

  // 新增: 显示分类选择器
  showCategorySelect() {
    this.setData({
      showCategoryPicker: true
    })
  },

  // 新增: 关闭分类选择器
  hideCategorySelect() {
    this.setData({
      showCategoryPicker: false
    })
  },

  // 选择分类
  selectCategory(e) {
    const index = e.currentTarget.dataset.index
    this.setData({
      currentCategory: index,
      showCategoryPicker: false,
      // 重置列表相关数据
      shopList: [],
      leftColumn: [],
      rightColumn: [],
      page: 1,
      hasMore: true
    }, () => {
      // 重新加载数据
      this.loadShopList()
    })
  },

  // 停止事件冒泡
  stopPropagation() {
    return
  },

  // 切换分类选择器显示状态
  toggleCategoryPicker() {
    this.setData({
      showCategoryPicker: !this.data.showCategoryPicker
    })
  },

  // 修改编辑按钮点击处理
  editShop(e) {
    const id = e.currentTarget.dataset.id
    const shop = this.data.shopList.find(shop => shop._id === id)
    
    // 检查是否登录
    if (!app.globalData.isLogin) {
      return wx.showToast({
        title: '请先登录',
        icon: 'none'
      })
    }

    // 检查是否是创建者
    if (!shop.creator || shop.creator.nickName !== app.globalData.userInfo.nickName) {
      return wx.showToast({
        title: '只有创建者可以修改',
        icon: 'none'
      })
    }

    // 有权限则跳转到编辑页面
    wx.navigateTo({
      url: `/pages/edit/edit?id=${id}`
    })
  },

  // 删除店铺
  deleteShop(e) {
    const id = e.currentTarget.dataset.id
    const shop = this.data.shopList.find(shop => shop._id === id)
    
    // 检查是否登录
    if (!app.globalData.isLogin) {
      return wx.showToast({
        title: '请先登录',
        icon: 'none'
      })
    }

    // 检查是否是创建者
    if (!shop.creator || shop.creator.nickName !== app.globalData.userInfo.nickName) {
      return wx.showToast({
        title: '只有创建者可以删除',
        icon: 'none'
      })
    }

    // 显示确认对话框
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这个店铺信息吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            const db = wx.cloud.database()
            
            // 删除店铺信息
            await db.collection('shops').doc(id).remove()
            
            // 删除相关的图片文件
            if (shop.photos && shop.photos.length > 0) {
              await wx.cloud.deleteFile({
                fileList: shop.photos
              })
            }

            wx.showToast({
              title: '删除成功',
              icon: 'success'
            })

            // 刷新列表
            this.setData({
              shopList: [],
              leftColumn: [],
              rightColumn: [],
              page: 1,
              hasMore: true
            }, () => {
              this.loadShopList()
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

  // 复制店铺名称
  copyName(e) {
    const name = e.currentTarget.dataset.name
    wx.setClipboardData({
      data: name,
      success: () => {
        wx.showToast({
          title: '店名已复制',
          icon: 'success'
        })
      }
    })
  },

  // 搜索输入
  onSearchInput(e) {
    this.setData({
      searchKeyword: e.detail.value
    })
    if (e.detail.value === '') {
      this.resetSearch()
    }
  },

  // 执行搜索
  async onSearch() {
    if (!this.data.searchKeyword.trim()) {
      return
    }

    this.setData({
      isSearching: true,
      shopList: [],
      leftColumn: [],
      rightColumn: [],
      page: 1,
      hasMore: true
    })

    await this.loadShopList()
  },

  // 清除搜索
  clearSearch() {
    this.setData({
      searchKeyword: ''
    })
    this.resetSearch()
  },

  // 重置搜索状态
  async resetSearch() {
    this.setData({
      isSearching: false,
      shopList: [],
      leftColumn: [],
      rightColumn: [],
      page: 1,
      hasMore: true
    })
    await this.loadShopList()
  },

  // 预览菜单图片
  previewMenu(e) {
    const { photos, current } = e.currentTarget.dataset
    wx.previewImage({
      urls: photos,
      current
    })
  },

  // 跳转到店铺详情
  goToDetail(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/shop-detail/shop-detail?id=${id}`
    })
  },

  // 监听页面滚动
  onPageScroll(e) {
    // 滚动超过500px时显示返回顶部按钮
    const shouldShow = e.scrollTop > 500
    if (shouldShow !== this.data.showBackTop) {
      this.setData({
        showBackTop: shouldShow
      })
    }
  },

  // 返回顶部
  scrollToTop() {
    wx.pageScrollTo({
      scrollTop: 0,
      duration: 300
    })
  },
}) 