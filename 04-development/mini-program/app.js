/**
 * JD 说真话 - 微信小程序入口文件
 * 全局逻辑：启动时检查登录状态、初始化全局数据
 */

App({
  /**
   * 小程序初始化
   */
  onLaunch() {
    // 初始化云开发
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力');
    } else {
      wx.cloud.init({
        env: 'cloud1-d7gqpqo2u81185c30',
        traceUser: true,
      });
    }

    // 检查本地存储中是否有用户标识
    this.checkUserSession();

    // 启用全局分享
    wx.showShareMenu({
      withShareTicket: true,
      menus: ['shareAppMessage', 'shareTimeline']
    });
  },

  /**
   * 检查用户会话
   */
  checkUserSession() {
    const sessionId = wx.getStorageSync('sessionId');
    if (!sessionId) {
      // 生成临时用户标识（Demo 阶段使用，正式版应接入微信登录）
      const newSessionId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      wx.setStorageSync('sessionId', newSessionId);
    }
  },

  /**
   * 全局数据
   */
  globalData: {
    // 用户会话标识
    sessionId: '',
    // 岗位类别列表
    categories: [
      { id: 'development', name: '开发' },
      { id: 'algorithm', name: '算法' },
      { id: 'product_manager', name: '产品经理' },
      { id: 'operations', name: '运营' },
      { id: 'uiux_design', name: 'UI/UX设计' },
      { id: 'data_analysis', name: '数据分析' }
    ]
  }
});
