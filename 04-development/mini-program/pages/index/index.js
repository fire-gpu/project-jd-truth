/**
 * JD 说真话 - 首页（JD 输入页）
 * 功能：输入 JD 文本、可选用户背景、选择岗位类别、提交解读
 * 通过微信云函数调用后端解析服务
 */

Page({
  /**
   * 页面初始数据
   */
  data: {
    // JD 文本内容
    jdText: '',
    // 用户背景
    userBackground: '',
    // 岗位类别列表
    categories: [],
    // 当前选中的岗位类别 ID
    selectedCategory: '',
    // 是否正在提交
    submitting: false,
    // JD 文本字数
    jdTextLength: 0,
    // 用户背景字数
    bgTextLength: 0,
    // JD 最少字数限制
    minJdLength: 10,
    // 用户背景最多字数限制
    maxBgLength: 200
  },

  /**
   * 页面加载
   */
  onLoad() {
    // 从全局数据获取岗位类别
    const app = getApp();
    this.setData({
      categories: app.globalData.categories
    });
  },

  onShow() {
    // 从 report 页返回时重置 submitting 状态
    this.setData({ submitting: false });
  },

  /**
   * JD 文本输入事件
   */
  onJdInput(e) {
    const value = e.detail.value;
    this.setData({
      jdText: value,
      jdTextLength: value.length
    });
  },

  /**
   * 粘贴按钮点击事件
   * 从剪贴板读取内容并填入 JD 输入框
   */
  onPaste() {
    wx.getClipboardData({
      success: (res) => {
        if (res.data) {
          this.setData({
            jdText: res.data,
            jdTextLength: res.data.length
          });
          wx.showToast({ title: '已粘贴', icon: 'success', duration: 1000 });
        }
      },
      fail: () => {
        wx.showToast({ title: '剪贴板为空', icon: 'none', duration: 1500 });
      }
    });
  },

  /**
   * 用户背景输入事件
   */
  onBgInput(e) {
    const value = e.detail.value;
    // 限制最多 200 字
    if (value.length > this.data.maxBgLength) {
      this.setData({
        userBackground: value.substring(0, this.data.maxBgLength),
        bgTextLength: this.data.maxBgLength
      });
      return;
    }
    this.setData({
      userBackground: value,
      bgTextLength: value.length
    });
  },

  /**
   * 岗位类别选择事件
   */
  onSelectCategory(e) {
    const categoryId = e.currentTarget.dataset.id;
    this.setData({
      selectedCategory: categoryId
    });
  },

  /**
   * 提交解读
   * 调用云函数 parseJD，拿到结果后跳转到报告页展示
   */
  onSubmit() {
    const that = this;
    const { jdText, selectedCategory, userBackground, minJdLength } = this.data;

    // 表单验证
    if (!jdText || jdText.trim().length < minJdLength) {
      wx.showToast({
        title: '请输入至少 ' + minJdLength + ' 个字的 JD 内容',
        icon: 'none',
        duration: 2000
      });
      return;
    }

    if (!selectedCategory) {
      wx.showToast({
        title: '请选择岗位类别',
        icon: 'none',
        duration: 2000
      });
      return;
    }

    // 防止重复提交（冷却 5 秒）
    if (this.data.submitting) {
      wx.showToast({
        title: '请稍后再试',
        icon: 'none',
        duration: 1500
      });
      return;
    }

    this.setData({ submitting: true });

    // 调用云函数
    wx.cloud.callFunction({
      name: 'parseJD',
      data: {
        action: 'parse',
        jdText: jdText.trim(),
        jobCategory: selectedCategory,
        userBackground: userBackground.trim() || ''
      }
    }).then(res => {
      if (res.result && res.result.success) {
        const reportData = res.result.data;
        // 保存到本地历史
        const historyId = reportData.historyId || Date.now().toString();
        const history = wx.getStorageSync('parseHistory') || [];
        history.unshift({
          id: historyId,
          jdText: jdText.trim(),
          jobCategory: selectedCategory,
          categoryName: reportData.categoryName || selectedCategory,
          report: reportData.report,
          createdAt: new Date().toISOString(),
          reportLength: reportData.report.length
        });
        // 只保留最近 50 条
        if (history.length > 50) history.length = 50;
        wx.setStorageSync('parseHistory', history);

        // 跳转到报告页（loading 由 onShow 在返回时重置，跳转期间保持显示）
        wx.navigateTo({
          url: '/pages/report/report?historyId=' + historyId,
          fail: () => {
            that.setData({ submitting: false });
          }
        });
      } else {
        wx.showToast({
          title: (res.result && res.result.error && res.result.error.message) || '解读失败，请重试',
          icon: 'none',
          duration: 3000
        });
        that.setData({ submitting: false });
      }
    }).catch(err => {
      console.error('[云函数] 调用失败:', JSON.stringify(err));
      wx.showToast({
        title: err.errMsg || err.message || '网络异常，请稍后重试',
        icon: 'none',
        duration: 5000
      });
      that.setData({ submitting: false });
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
