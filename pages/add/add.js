// pages/add/add.js
const app = getApp()

Page({

    /**
     * 页面的初始数据
     */
    data: {
        name: '',              // 店铺名称
        address: '',           // 店铺地址
        category: '',          // 店铺分类
        photos: [],           // 店铺图片
        categories: [],       // 分类列表
        submitting: false,    // 提交状态
        isLogin: false,       // 登录状态
        averagePrice: '',     // 人均消费
        menuPhotos: [],       // 菜单图片
        // 预设标签选项
        tagOptions: [
            { label: '有WIFI', value: 'wifi' },
            { label: '可刷卡', value: 'card' },
            { label: '停车方便', value: 'parking' },
            { label: '环境安静', value: 'quiet' },
            { label: '性价比高', value: 'valuable' },
            { label: '服务周到', value: 'service' }
        ],
        selectedTags: [],         // 已选标签
        showCustomTagInput: false, // 显示自定义标签输入
        customTag: '',             // 自定义标签输入值
        remarks: '', // 备注信息
    },

    /**
     * 生命周期函数--监听页面加载
     */
    onLoad(options) {
        // 获取除"全部"之外的分类
        this.setData({
            categories: app.globalData.categories.slice(1),
            isLogin: app.globalData.isLogin
        })

        if (!this.data.isLogin) {
            wx.showModal({
                title: '提示',
                content: '请先登录后再添加店铺信息',
                showCancel: false,
                success: () => {
                    wx.navigateBack()
                }
            })
        }
    },

    /**
     * 生命周期函数--监听页面初次渲染完成
     */
    onReady() {

    },

    /**
     * 生命周期函数--监听页面显示
     */
    onShow() {

    },

    /**
     * 生命周期函数--监听页面隐藏
     */
    onHide() {

    },

    /**
     * 生命周期函数--监听页面卸载
     */
    onUnload() {

    },

    /**
     * 页面相关事件处理函数--监听用户下拉动作
     */
    onPullDownRefresh() {

    },

    /**
     * 页面上拉触底事件的处理函数
     */
    onReachBottom() {

    },

    /**
     * 用户点击右上角分享
     */
    onShareAppMessage() {

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
        const index = e.detail.value
        this.setData({
            category: this.data.categories[index]
        })
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
            // 上传图片到云存储
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

    // 获取用户信息
    getUserInfo(e) {
        if (e.detail.userInfo) {
            app.globalData.userInfo = e.detail.userInfo
            app.globalData.isLogin = true
            this.setData({
                isLogin: true
            })
        }
    },

    // 选择菜单图片
    async chooseMenuImage() {
        try {
            const res = await wx.chooseImage({
                count: 5 - this.data.menuPhotos.length,
                sizeType: ['compressed'],
                sourceType: ['album', 'camera']
            })

            wx.showLoading({ title: '上传中...' })

            // 上传菜单图片到云存储
            const uploadTasks = res.tempFilePaths.map(filePath => {
                return wx.cloud.uploadFile({
                    cloudPath: `menu-photos/${Date.now()}-${Math.floor(Math.random() * 1000000)}.jpg`,
                    filePath
                })
            })

            const uploadRes = await Promise.all(uploadTasks)
            const newPhotos = uploadRes.map(res => res.fileID)

            this.setData({
                menuPhotos: [...this.data.menuPhotos, ...newPhotos]
            })

            wx.hideLoading()
        } catch (err) {
            console.error(err)
            wx.hideLoading()
            wx.showToast({
                title: '上传失败',
                icon: 'none'
            })
        }
    },

    // 删除菜单图片
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
            console.error('删除失败：', err)
            wx.showToast({
                title: '删除失败',
                icon: 'none'
            })
        }
    },

    // 预览菜单图片
    previewMenuPhoto(e) {
        const url = e.currentTarget.dataset.url
        wx.previewImage({
            urls: this.data.menuPhotos,
            current: url
        })
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

    // 处理自定义标签输入
    onCustomTagInput(e) {
        this.setData({
            customTag: e.detail.value.trim()
        })
    },

    // 处理回车确认
    onCustomTagConfirm(e) {
        const value = e.detail.value.trim()
        if (value) {
            this.addCustomTag(value)
        }
    },

    // 点击确认按钮
    confirmCustomTag() {
        const value = this.data.customTag.trim()
        if (value) {
            this.addCustomTag(value)
        }
    },

    // 统一的添加标签逻辑
    addCustomTag(value) {
        const { selectedTags, tagOptions } = this.data
        
        // 检查是否已存在相同的标签（不区分大小写）
        const lowerValue = value.toLowerCase()
        const exists = selectedTags.some(tag => tag.toLowerCase() === lowerValue) ||
                      tagOptions.some(tag => tag.label.toLowerCase() === lowerValue)
        
        if (exists) {
            wx.showToast({
                title: '该标签已存在',
                icon: 'none'
            })
            return
        }

        // 添加新标签
        this.setData({
            tagOptions: [...tagOptions, { label: value, value: value }],
            selectedTags: [...selectedTags, value],
            showCustomTagInput: false,
            customTag: ''
        })
    },

    // 取消添加自定义标签
    hideCustomTagInput() {
        this.setData({
            showCustomTagInput: false,
            customTag: ''
        })
    },

    // 备注输入处理
    onRemarksInput(e) {
        this.setData({
            remarks: e.detail.value
        })
    },

    // 提交表单
    async submitForm() {
        // 表单验证
        if (!this.data.isLogin) {
            return wx.showToast({
                title: '请先登录',
                icon: 'none'
            })
        }

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
            
            // 检查店铺名称是否已存在
            const nameCheck = await db.collection('shops').where({
                name: this.data.name.trim()
            }).get()

            if (nameCheck.data.length > 0) {
                this.setData({ submitting: false })
                return wx.showToast({
                    title: '该店铺名称已存在',
                    icon: 'none'
                })
            }

            const formData = {
                name: this.data.name,
                address: this.data.address,
                category: this.data.category,
                photos: this.data.photos,
                menuPhotos: this.data.menuPhotos,
                averagePrice: Number(this.data.averagePrice) || 0,
                tags: this.data.selectedTags,
                remarks: this.data.remarks,
                location: {
                    type: 'Point',
                    coordinates: [this.data.longitude, this.data.latitude]
                },
                createTime: db.serverDate(),
                creator: {
                    nickName: app.globalData.userInfo.nickName || '微信用户',
                    avatarUrl: app.globalData.userInfo.avatarUrl || '/images/user.svg',
                    openId: app.globalData.userInfo.openId
                },
            }

            // 添加到数据库
            const result = await db.collection('shops').add({
                data: formData
            })

            if (result._id) {
                app.globalData.needRefreshShopList = true  // 标记需要刷新列表
                
                wx.showToast({
                    title: '添加成功',
                    icon: 'success'
                })

                setTimeout(() => {
                    wx.navigateBack()
                }, 1500)
            }
        } catch (err) {
            console.error('添加失败：', err)
            wx.showToast({
                title: '添加失败',
                icon: 'none'
            })
        }

        this.setData({ submitting: false })
    },

    // 添加返回方法
    goBack() {
        wx.navigateBack({
            delta: 1
        })
    },

    // 处理输入框失焦事件
    onCustomTagBlur(e) {
        const value = e.detail.value.trim()
        if (value) {
            this.addCustomTag(value)
        } else {
            // 如果输入为空，直接隐藏输入框
            this.hideCustomTagInput()
        }
    },

    // 添加人均消费输入处理方法
    onAveragePriceInput(e) {
        // 确保输入的是数字
        const value = e.detail.value.replace(/[^\d]/g, '')
        this.setData({
            averagePrice: value
        })
    },
})