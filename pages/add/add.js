// pages/add/add.js
Page({

    /**
     * 页面的初始数据
     */
    data: {
        name: '',
        address: '',
        category: '',
        photos: [],
        categories: ['早餐', '正餐', '下午茶', '夜宵', '书店', '谷子店', '其他'],
        submitting: false
    },

    /**
     * 生命周期函数--监听页面加载
     */
    onLoad(options) {

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

    // 提交表单
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
            await db.collection('shops').add({
                data: {
                    name: this.data.name,
                    address: this.data.address,
                    category: this.data.category,
                    photos: this.data.photos,
                    createTime: db.serverDate()
                }
            })

            wx.showToast({
                title: '添加成功',
                icon: 'success'
            })

            setTimeout(() => {
                wx.navigateBack()
            }, 1500)
        } catch (err) {
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
    }
})