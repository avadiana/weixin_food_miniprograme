Page({
  data: {
    categories: ['全部', '早餐', '正餐', '夜宵', '其他'],
    categoryIcons: [
      '/images/all.svg',
      '/images/breakfast.svg',
      '/images/lunch.svg',
      '/images/night.svg',
      '/images/other.svg'
    ],
    currentCategory: 0,
    isSticky: false,
    showCategoryPicker: false,
    shopList: [],
    leftColumn: [],
    rightColumn: [],
    page: 1,
    pageSize: 10,
    loading: false,
    hasMore: true
  },

  onLoad() {
    this.setupObserver()
    this.loadShopList()
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
      const query = this.data.currentCategory === 0 ? {} : {
        category: this.data.categories[this.data.currentCategory]
      }
      
      const res = await db.collection('shops')
        .where(query)
        .orderBy('createTime', 'desc')
        .skip((this.data.page - 1) * this.data.pageSize)
        .limit(this.data.pageSize)
        .get()

      const newShops = res.data.map(shop => ({
        ...shop,
        imageLoaded: false,
        categoryIndex: this.data.categories.indexOf(shop.category)
      }))
      
      // 瀑布流布局
      newShops.forEach(shop => {
        if (this.getTotalHeight(this.data.leftColumn) <= this.getTotalHeight(this.data.rightColumn)) {
          this.data.leftColumn.push(shop)
        } else {
          this.data.rightColumn.push(shop)
        }
      })

      this.setData({
        shopList: [...this.data.shopList, ...newShops],
        leftColumn: this.data.leftColumn,
        rightColumn: this.data.rightColumn,
        page: this.data.page + 1,
        hasMore: res.data.length === this.data.pageSize,
        loading: false
      })
    } catch (err) {
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
      this.setData({ loading: false })
    }
  },

  // 计算列高度
  getTotalHeight(column) {
    return column.reduce((height, shop) => {
      // 假设每个卡片的基础高度是300rpx
      return height + 300
    }, 0)
  },

  // 图片加载完成
  onImageLoad(e) {
    const index = e.currentTarget.dataset.index
    const column = this.data.leftColumn.findIndex(shop => shop._id === e.currentTarget.dataset.id) >= 0 ? 'leftColumn' : 'rightColumn'
    const key = `${column}[${index}].imageLoaded`
    this.setData({
      [key]: true
    })
  },

  // 收藏/取消收藏
  async toggleFavorite(e) {
    const id = e.currentTarget.dataset.id
    // TODO: 实现收藏功能
  },

  onPullDownRefresh() {
    this.setData({
      shopList: [],
      leftColumn: [],
      rightColumn: [],
      page: 1,
      hasMore: true
    }, async () => {
      await this.loadShopList()
      wx.stopPullDownRefresh()
    })
  },

  onReachBottom() {
    this.loadShopList()
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

  // 新增: 选择分类
  selectCategory(e) {
    const index = e.currentTarget.dataset.index
    this.setData({
      currentCategory: index,
      showCategoryPicker: false,
      shopList: [],
      leftColumn: [],
      rightColumn: [],
      page: 1,
      hasMore: true
    }, () => {
      this.loadShopList()
    })
  },

  // 跳转到修改页面
  editShop(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/edit/edit?id=${id}`
    })
  }
}) 