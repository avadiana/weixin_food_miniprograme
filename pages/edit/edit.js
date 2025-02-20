Page({
  data: {
    id: '',
    name: '',
    address: '',
    category: '',
    photos: [],
    categories: ['早餐', '正餐', '夜宵', '其他'],
    submitting: false
  },

  onLoad(options) {
    this.setData({ id: options.id })
    this.loadShopData()
  },

  // 加载店铺数据
  async loadShopData() {
    const db = wx.cloud.database()
    try {
      const res = await db.collection('shops').doc(this.data.id).get()
      const shop = res.data
      this.setData({
        name: shop.name,
        address: shop.address,
        category: shop.category,
        photos: shop.photos
      })
    } catch (err) {
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
    }
  },

  // 输入店铺名称
  onNameInput(e) {
    this.setData({ name: e.detail.value })
  },

  // 输入地址
  onAddressInput(e) {
    this.setData({ address: e.detail.value })
  },

  // 选择分类
  onCategoryChange(e) {
    this.setData({ category: this.data.categories[e.detail.value] })
  },

  // 选择图片
  async chooseImage() {
    const res = await wx.chooseImage({
      count: 9 - this.data.photos.length,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera']
    })

    wx.showLoading({ title: '上传中...' })

    try {
      const uploadTasks = res.tempFilePaths.map(filePath => {
        return wx.cloud.uploadFile({
          cloudPath: `shops/${Date.now()}-${Math.floor(Math.random() * 1000)}${filePath.match(/\.[^.]+?$/)[0]}`,
          filePath
        })
      })

      const uploadRes = await Promise.all(uploadTasks)
      const newPhotos = uploadRes.map(res => res.fileID)

      this.setData({
        photos: [...this.data.photos, ...newPhotos]
      })
    } catch (err) {
      wx.showToast({
        title: '上传图片失败',
        icon: 'none'
      })
    }

    wx.hideLoading()
  },

  // 删除图片
  deleteImage(e) {
    const index = e.currentTarget.dataset.index
    const photos = this.data.photos
    photos.splice(index, 1)
    this.setData({ photos })
  },

  // 返回上一页
  goBack() {
    wx.navigateBack()
  },

  // 提交修改
  async submitForm() {
    if (!this.data.name.trim()) {
      return wx.showToast({
        title: '请输入店铺名称',
        icon: 'none'
      })
    }

    if (!this.data.address.trim()) {
      return wx.showToast({
        title: '请输入店铺地址',
        icon: 'none'
      })
    }

    if (!this.data.category) {
      return wx.showToast({
        title: '请选择店铺分类',
        icon: 'none'
      })
    }

    if (this.data.photos.length === 0) {
      return wx.showToast({
        title: '请至少上传一张图片',
        icon: 'none'
      })
    }

    this.setData({ submitting: true })

    try {
      const db = wx.cloud.database()
      await db.collection('shops').doc(this.data.id).update({
        data: {
          name: this.data.name,
          address: this.data.address,
          category: this.data.category,
          photos: this.data.photos,
          updateTime: db.serverDate()
        }
      })

      wx.showToast({
        title: '修改成功',
        icon: 'success'
      })

      // 返回上一页并刷新列表
      const pages = getCurrentPages()
      const listPage = pages[pages.length - 2]
      listPage.setData({
        shopList: [],
        leftColumn: [],
        rightColumn: [],
        page: 1,
        hasMore: true
      }, () => {
        listPage.loadShopList()
        setTimeout(() => {
          wx.navigateBack()
        }, 1500)
      })
    } catch (err) {
      wx.showToast({
        title: '修改失败',
        icon: 'none'
      })
    }

    this.setData({ submitting: false })
  }
}) 