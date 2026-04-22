/**
 * JD 说真话 - 历史记录页
 * 功能：展示用户的解读历史列表，支持查看完整报告
 * 历史数据从本地存储（localStorage）读取
 */

Page({
  /**
   * 页面初始数据
   */
  data: {
    // 历史记录列表
    historyList: [],
    // 是否加载中
    loading: true,
    // 是否加载失败
    loadError: '',
    // 当前页码
    page: 1,
    // 每页条数
    pageSize: 20,
    // 是否还有更多数据
    hasMore: true,
    // 是否正在加载更多
    loadingMore: false,
    // 是否为空状态
    isEmpty: false
  },

  /**
   * 页面显示时刷新数据
   * 每次切换到该 tab 时都会触发
   */
  onShow() {
    // 重置分页状态，重新加载
    this.setData({
      page: 1,
      hasMore: true,
      historyList: []
    });
    this.loadHistory();
  },

  /**
   * 下拉刷新
   */
  onPullDownRefresh() {
    this.setData({
      page: 1,
      hasMore: true,
      historyList: []
    });
    this.loadHistory();
    wx.stopPullDownRefresh();
  },

  /**
   * 加载历史记录
   * 从本地存储读取，不再调用后端 API
   */
  loadHistory() {
    const history = wx.getStorageSync('parseHistory') || [];
    this.setData({
      historyList: history,
      loading: false,
      isEmpty: history.length === 0,
      hasMore: false
    });
  },

  /**
   * 点击历史记录，查看完整报告
   */
  goToDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: '/pages/report/report?historyId=' + id
    });
  },

  /**
   * 获取岗位类别名称
   */
  getCategoryName(categoryId) {
    var app = getApp();
    var categories = app.globalData.categories;
    for (var i = 0; i < categories.length; i++) {
      if (categories[i].id === categoryId) {
        return categories[i].name;
      }
    }
    return '其他';
  },

  /**
   * 格式化时间
   */
  formatTime(dateStr) {
    if (!dateStr) return '';
    var date = new Date(dateStr);
    var year = date.getFullYear();
    var month = (date.getMonth() + 1).toString().padStart(2, '0');
    var day = date.getDate().toString().padStart(2, '0');
    var hour = date.getHours().toString().padStart(2, '0');
    var minute = date.getMinutes().toString().padStart(2, '0');
    return year + '-' + month + '-' + day + ' ' + hour + ':' + minute;
  },

  /**
   * 跳转到首页
   */
  goToIndex: function() {
    wx.switchTab({
      url: '/pages/index/index'
    });
  },

  /**
   * 分享给朋友
   */
  onShareAppMessage() {
    return {
      title: 'JD 说真话 - AI 帮你读懂招聘 JD',
      path: '/pages/index/index'
    };
  }
});
