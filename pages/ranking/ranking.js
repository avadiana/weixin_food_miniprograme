/**
 * 贡献排行榜页面
 * 展示用户贡献的店铺数量排名，支持实时更新和动画效果
 */
const app = getApp()

Page({
  /**
   * 页面的初始数据
   */
  data: {
    rankingList: [], // 排行榜数据列表
    loading: true, // 加载状态
    currentUser: null, // 当前用户信息
    refreshing: false, // 刷新状态
    statusBarHeight: 0, // 状态栏高度
    navBarHeight: 0, // 导航栏高度
  },

  /**
   * 生命周期函数--监听页面加载
   * 初始化页面数据，设置导航栏高度
   */
  onLoad() {
    this.setData({
      currentUser: app.globalData.userInfo
    })
    
    // 获取系统信息，计算导航栏高度
    const systemInfo = wx.getSystemInfoSync()
    const menuButtonInfo = wx.getMenuButtonBoundingClientRect()
    const navBarHeight = (menuButtonInfo.top - systemInfo.statusBarHeight) * 2 + menuButtonInfo.height
    
    this.setData({
      statusBarHeight: systemInfo.statusBarHeight,
      navBarHeight: navBarHeight
    })

    this.loadRankingList()
  },

  /**
   * 加载排行榜数据
   * 从云数据库获取用户贡献的店铺数量并排序
   */
  async loadRankingList() {
    if (this.data.refreshing) return
    
    try {
      this.setData({ loading: true, refreshing: true })
      const db = wx.cloud.database()
      const $ = db.command.aggregate

      // 获取所有店铺的创建者信息并按创建者分组计数
      const result = await db.collection('shops')
        .aggregate()
        .group({
          _id: '$creator.openId',
          count: $.sum(1),
          userInfo: $.first('$creator')
        })
        .sort({
          count: -1, // 按数量降序排序
          '_id': 1 // 相同数量时按openId排序保证顺序稳定
        })
        .limit(50) // 限制返回前50名
        .end()

      // 处理排名数据，添加特殊标记
      const rankingList = result.list.map((item, index) => {
        const rank = index + 1
        let rankClass = ''
        
        // 设置前三名的特殊样式类
        if (rank === 1) rankClass = 'gold'
        else if (rank === 2) rankClass = 'silver'
        else if (rank === 3) rankClass = 'bronze'

        return {
          rank,
          rankClass,
          openid: item._id,
          count: item.count,
          avatarUrl: item.userInfo.avatarUrl || '/images/user.svg',
          nickName: item.userInfo.nickName || '微信用户',
          isCurrentUser: this.data.currentUser && item._id === this.data.currentUser.openId
        }
      })

      this.setData({
        rankingList,
        loading: false,
        refreshing: false
      })
    } catch (err) {
      console.error('加载排行榜失败：', err)
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
      this.setData({ 
        loading: false,
        refreshing: false
      })
    }
  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   * 刷新排行榜数据
   */
  async onPullDownRefresh() {
    try {
      await this.loadRankingList()
    } finally {
      wx.stopPullDownRefresh()
    }
  },

  /**
   * 返回上一页
   */
  goBack() {
    wx.navigateBack()
  }
}) 