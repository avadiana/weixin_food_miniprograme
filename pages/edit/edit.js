const app = getApp()

Page({
  data: {
    id: '',
    name: '',
    address: '',
    category: '',
    photos: [],
    menuPhotos: [],
    averagePrice: '',
    categories: [],
    submitting: false,
    tagOptions: [
      { label: '有WIFI', value: 'wifi' },
      { label: '可刷卡', value: 'card' },
      { label: '停车方便', value: 'parking' },
      { label: '环境安静', value: 'quiet' },
      { label: '性价比高', value: 'valuable' },
      { label: '服务周到', value: 'service' }
    ],
    selectedTags: [],
    showCustomTagInput: false,
    customTag: '',
    remarks: ''
  },

  onLoad(options) {
    this.setData({
      categories: app.globalData.categories.slice(1),
      id: options.id
    })
    if (options.id) {
      this.loadShopDetail(options.id)
    }
  },

  // 加载店铺数据
  async loadShopData() {
    const db = wx.cloud.database()
    try {
      const res = await db.collection('shops').doc(this.data.id).get()
      const shop = res.data

      // 检查权限
      if (!app.globalData.isLogin) {
        wx.showModal({
          title: '提示',
          content: '请先登录',
          showCancel: false,
          success: () => {
            wx.navigateBack()
          }
        })
        return
      }

      if (!shop.creator || shop.creator.nickName !== app.globalData.userInfo.nickName) {
        wx.showModal({
          title: '提示',
          content: '只有创建者可以修改店铺信息',
          showCancel: false,
          success: () => {
            wx.navigateBack()
          }
        })
        return
      }
    } catch (err) {
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
      setTimeout(() => {
        wx.navigateBack()
      }, 1500)
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

  // 添加人均消费输入处理
  onAveragePriceInput(e) {
    this.setData({
      averagePrice: e.detail.value
    })
  },

  // 添加备注信息输入处理函数
  onRemarksInput(e) {
    this.setData({
      remarks: e.detail.value
    })
  },

  // 添加菜单图片上传方法
  async chooseMenuImage() {
    const res = await wx.chooseImage({
      count: 5 - this.data.menuPhotos.length,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera']
    })

    wx.showLoading({ title: '上传中...' })

    try {
      const uploadTasks = res.tempFilePaths.map(filePath => {
        return wx.cloud.uploadFile({
          cloudPath: `menus/${Date.now()}-${Math.floor(Math.random() * 1000)}${filePath.match(/\.[^.]+?$/)[0]}`,
          filePath
        })
      })

      const uploadRes = await Promise.all(uploadTasks)
      const newPhotos = uploadRes.map(res => res.fileID)

      this.setData({
        menuPhotos: [...this.data.menuPhotos, ...newPhotos]
      })
    } catch (err) {
      wx.showToast({
        title: '上传图片失败',
        icon: 'none'
      })
    }

    wx.hideLoading()
  },

  // 添加删除菜单图片方法
  async deleteMenuPhoto(e) {
    const index = e.currentTarget.dataset.index
    const photo = this.data.menuPhotos[index]

    try {
      await wx.cloud.deleteFile({
        fileList: [photo]
      })

      const menuPhotos = this.data.menuPhotos.filter((_, i) => i !== index)
      this.setData({ menuPhotos })
    } catch (err) {
      wx.showToast({
        title: '删除失败',
        icon: 'none'
      })
    }
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

    this.setData({ submitting: true })

    try {
      const db = wx.cloud.database()
      
      // 检查店铺名称是否已存在（排除当前店铺）
      const _ = db.command
      const nameCheck = await db.collection('shops').where({
        _id: _.neq(this.data.id),  // 排除当前店铺
        name: this.data.name.trim()
      }).get()

      if (nameCheck.data.length > 0) {
        this.setData({ submitting: false })
        return wx.showToast({
          title: '该店铺名称已存在',
          icon: 'none'
        })
      }

      await db.collection('shops').doc(this.data.id).update({
        data: {
          name: this.data.name,
          address: this.data.address,
          category: this.data.category,
          photos: this.data.photos,
          menuPhotos: this.data.menuPhotos,
          averagePrice: parseInt(this.data.averagePrice) || 0,
          tags: this.data.selectedTags,
          remarks: this.data.remarks,
          updateTime: db.serverDate()
        }
      })

      const app = getApp()
      app.globalData.needRefreshShopList = true  // 标记需要刷新列表
      
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
      console.error('修改失败：', err)
      wx.showToast({
        title: '修改失败',
        icon: 'none'
      })
    }

    this.setData({ submitting: false })
  },

  // 加载店铺详情时处理标签数据
  async loadShopDetail(id) {
    try {
      const db = wx.cloud.database()
      const res = await db.collection('shops').doc(id).get()
      const shop = res.data

      // 检查权限
      if (!app.globalData.isLogin) {
        wx.showModal({
          title: '提示',
          content: '请先登录',
          showCancel: false,
          success: () => {
            wx.navigateBack()
          }
        })
        return
      }

      if (!shop.creator || shop.creator.nickName !== app.globalData.userInfo.nickName) {
        wx.showModal({
          title: '提示',
          content: '只有创建者可以修改店铺信息',
          showCancel: false,
          success: () => {
            wx.navigateBack()
          }
        })
        return
      }

      // 将value转换为label
      const convertedTags = (shop.tags || []).map(tag => {
        const tagOption = this.data.tagOptions.find(item => item.value === tag)
        return tagOption ? tagOption.label : tag
      })

      // 处理已有标签
      const tagOptions = this.data.tagOptions.map(item => ({
        ...item,
        selected: convertedTags.includes(item.label)
      }))

      // 添加自定义标签到选项中
      const customTags = convertedTags.filter(tag => 
        !this.data.tagOptions.find(item => item.label === tag)
      )
      customTags.forEach(tag => {
        tagOptions.push({
          label: tag,
          value: tag,
          selected: true
        })
      })

      this.setData({
        name: shop.name,
        address: shop.address,
        category: shop.category,
        photos: shop.photos || [],
        menuPhotos: shop.menuPhotos || [],
        averagePrice: shop.averagePrice || '',
        remarks: shop.remarks || '',
        tagOptions,
        selectedTags: convertedTags
      })
    } catch (err) {
      console.error('加载失败：', err)
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
      setTimeout(() => {
        wx.navigateBack()
      }, 1500)
    }
  },

  // 切换标签选中状态
  toggleTag(e) {
    const tag = e.currentTarget.dataset.tag
    const tagOption = this.data.tagOptions.find(item => item.value === tag)
    const label = tagOption ? tagOption.label : tag
    const index = this.data.selectedTags.indexOf(label)
    
    if (index > -1) {
      this.data.selectedTags.splice(index, 1)
    } else {
      this.data.selectedTags.push(label)
    }
    
    // 更新标签选中状态
    const tagOptions = this.data.tagOptions.map(item => ({
      ...item,
      selected: this.data.selectedTags.includes(item.label)
    }))
    
    this.setData({
      tagOptions,
      selectedTags: this.data.selectedTags
    })
  },

  // 显示自定义标签输入框
  showCustomTagInput() {
    this.setData({ showCustomTagInput: true })
  },

  // 添加自定义标签
  addCustomTag(e) {
    const value = e.detail.value.trim()
    if (!value) return
    
    // 检查是否已存在相同的标签
    const exists = this.data.selectedTags.includes(value) ||
                  this.data.tagOptions.some(item => item.label === value)
    
    if (exists) {
      wx.showToast({
        title: '该标签已存在',
        icon: 'none'
      })
      return
    }
    
    // 添加到选项中
    const newTag = {
      label: value,
      value: value,
      selected: true
    }
    
    this.setData({
      tagOptions: [...this.data.tagOptions, newTag],
      selectedTags: [...this.data.selectedTags, value],
      showCustomTagInput: false,
      customTag: ''
    })
  }
}) 