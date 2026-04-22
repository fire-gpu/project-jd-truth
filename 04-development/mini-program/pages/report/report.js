/**
 * JD 说真话 - 报告页（解读报告展示）
 * 功能：展示 AI 解读的结构化报告、反馈评分
 * 通过 URL 参数或本地历史记录获取报告内容直接展示
 */

Page({
  /**
   * 页面初始数据
   */
  data: {
    // 报告数据
    report: null,
    // 是否加载中
    loading: true,
    // 加载失败
    loadError: '',
    // 评分（1-5）
    score: 0,
    // 反馈文字
    feedbackText: '',
    // 是否已提交反馈
    feedbackSubmitted: false,
    // 报告 ID（用于提交反馈）
    reportId: '',
    // 核心维度 HTML
    coreHtml: '',
    // 扩展维度 HTML
    extendedHtml: '',
    // 个性化维度 HTML
    personalHtml: '',
    // 报告内容（Markdown 原文）
    streamContent: '',
    // 岗位类别（用于分享标题）
    jobCategory: ''
  },

  /**
   * 页面加载
   * 支持两种入口：
   * 1. report=xxx — 从首页云函数调用后跳转，携带完整报告
   * 2. historyId=xxx — 从历史记录跳转，从本地存储加载
   */
  onLoad(options) {
    if (options.report) {
      // 从 URL 参数获取报告
      const report = decodeURIComponent(options.report);
      const category = decodeURIComponent(options.category || '');
      this.setData({
        streamContent: report,
        coreHtml: this.markdownToHtml(report),
        loading: false,
        streaming: false,
        jobCategory: category
      });
    } else if (options.historyId) {
      // 从本地历史加载
      this.loadFromLocalHistory(options.historyId);
    } else {
      this.setData({
        loading: false,
        loadError: '未找到报告数据'
      });
    }
  },

  /**
   * 从本地历史记录加载报告
   * @param {string} historyId - 历史记录 ID
   */
  loadFromLocalHistory(historyId) {
    const history = wx.getStorageSync('parseHistory') || [];
    const item = history.find(h => h.id === historyId);
    if (item && item.report) {
      this.setData({
        streamContent: item.report,
        coreHtml: this.markdownToHtml(item.report),
        loading: false,
        streaming: false,
        jobCategory: item.jobCategory || ''
      });
    } else {
      this.setData({
        loading: false,
        loadError: '历史记录不存在'
      });
    }
  },

  /**
   * 解析报告内容，将 Markdown 转为 HTML
   * 后端返回格式：{ report: "Markdown文本", metadata: {...} }
   * 或历史记录格式：{ report: "Markdown文本", metadata: {...}, ... }
   */
  parseReportSections(data) {
    if (!data) return;

    // 后端返回的 report 字段是 Markdown 格式的完整报告文本
    const markdownText = data.report || '';

    if (!markdownText) {
      this.setData({
        coreHtml: '<p class="md-paragraph">报告内容为空</p>'
      });
      return;
    }

    // 将 Markdown 文本转为 HTML，统一放入 coreHtml 渲染
    const htmlContent = this.markdownToHtml(markdownText);

    this.setData({
      coreHtml: htmlContent,
      extendedHtml: '',
      personalHtml: ''
    });
  },

  /**
   * 构建维度区块 HTML
   * @param {string} title - 维度标题
   * @param {string} content - 内容（支持简单 Markdown）
   * @param {string} type - 类型：core / extended / personal
   * @returns {string} HTML 字符串
   */
  buildSectionHtml(title, content, type) {
    // 将内容转为 HTML
    const htmlContent = this.markdownToHtml(content);

    // 根据类型设置不同的样式类
    let sectionClass = 'report-section';
    let iconClass = 'section-icon';
    if (type === 'core') {
      sectionClass += ' section-core';
      iconClass += ' icon-core';
    } else if (type === 'extended') {
      sectionClass += ' section-extended';
      iconClass += ' icon-extended';
    } else if (type === 'personal') {
      sectionClass += ' section-personal';
      iconClass += ' icon-personal';
    }

    return '<div class="' + sectionClass + '">' +
      '<div class="section-header">' +
      '<span class="' + iconClass + '">' + this.getSectionIcon(title) + '</span>' +
      '<span class="section-title">' + title + '</span>' +
      '</div>' +
      '<div class="section-body">' + htmlContent + '</div>' +
      '</div>';
  },

  /**
   * 获取维度图标
   */
  getSectionIcon(title) {
    var icons = {
      '真实工作内容': '&#x1F4CB;',
      '核心能力要求': '&#x1F3AF;',
      '行动建议': '&#x1F6B6;',
      'JD 潜台词': '&#x1F50D;',
      'KPI/考核指标': '&#x1F4CA;',
      '团队协作模式': '&#x1F465;',
      '工作强度信号': '&#x23F0;',
      '差距分析': '&#x1F4D0;'
    };
    return icons[title] || '&#x1F4CC;';
  },

  /**
   * 简易 Markdown 转 HTML
   * 支持：标题（##）、列表（- ）、加粗（**）、换行
   */
  markdownToHtml(text) {
    if (!text) return '';

    var html = text;

    // 维度标题增加 emoji 图标（使用宽松正则，兼容不同分隔符和有无空格）
    html = html.replace(/^(##\s*[一二三四五六][、.．]?\s*真实工作内容)/gm, '💼 $1');
    html = html.replace(/^(##\s*[一二三四五六][、.．]?\s*核心能力要求)/gm, '🎯 $1');
    html = html.replace(/^(##\s*[一二三四五六][、.．]?\s*行动建议)/gm, '🚀 $1');
    html = html.replace(/^(##\s*[一二三四五六][、.．]?\s*JD\s*潜台词)/gm, '🔍 $1');
    html = html.replace(/^(##\s*[一二三四五六][、.．]?\s*考核与工作强度)/gm, '📊 $1');
    html = html.replace(/^(##\s*[一二三四五六][、.．]?\s*差距分析)/gm, '📈 $1');

    // ## 二级标题（兼容有无空格）
    html = html.replace(/^##\s*(.+)$/gm, '<h3 class="md-h3">$1</h3>');

    // ### 三级标题
    html = html.replace(/^### (.+)$/gm, '<h4 class="md-h4">$1</h4>');

    // **加粗**
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

    // - 无序列表
    html = html.replace(/^- (.+)$/gm, '<div class="md-list-item"><span class="md-bullet">-</span><span>$1</span></div>');

    // 1. 2. 有序列表
    html = html.replace(/^\d+\. (.+)$/gm, '<div class="md-list-item"><span class="md-number">$&</span></div>');
    // 修正有序列表显示（去掉数字后面的点）
    html = html.replace(/<span class="md-number">(\d+)\. (.+?)<\/span>/g, '<span class="md-num-badge">$1</span><span>$2</span>');

    // 换行
    html = html.replace(/\n\n/g, '</p><p class="md-paragraph">');
    html = html.replace(/\n/g, '<br/>');

    // 包裹在段落中
    html = '<p class="md-paragraph">' + html + '</p>';

    // 清理空段落
    html = html.replace(/<p class="md-paragraph"><\/p>/g, '');
    html = html.replace(/<p class="md-paragraph"><br\/><\/p>/g, '');

    return html;
  },

  /**
   * 评分点击事件
   */
  onScoreTap(e) {
    var score = e.currentTarget.dataset.score;
    this.setData({ score: score });
  },

  /**
   * 反馈输入事件
   */
  onFeedbackInput(e) {
    this.setData({
      feedbackText: e.detail.value
    });
  },

  /**
   * 提交反馈
   * 通过云函数提交用户评分和反馈
   */
  onSubmitFeedback() {
    var that = this;
    var { reportId, score, feedbackText } = this.data;

    if (!score) {
      wx.showToast({
        title: '请先评分',
        icon: 'none',
        duration: 2000
      });
      return;
    }

    if (!reportId) {
      wx.showToast({
        title: '报告信息不完整，无法提交反馈',
        icon: 'none',
        duration: 2000
      });
      return;
    }

    wx.showLoading({ title: '提交中...' });

    // 通过云函数提交反馈
    wx.cloud.callFunction({
      name: 'parseJD',
      data: {
        action: 'feedback',
        historyId: reportId,
        score: score,
        comment: feedbackText || ''
      }
    }).then(function() {
      wx.hideLoading();
      that.setData({ feedbackSubmitted: true });
      wx.showToast({
        title: '感谢你的反馈！',
        icon: 'success',
        duration: 2000
      });
    }).catch(function(err) {
      wx.hideLoading();
      console.error('[云函数] 提交反馈失败:', err);
      wx.showToast({
        title: '提交失败，请稍后重试',
        icon: 'none',
        duration: 2000
      });
    });
  },

  /**
   * 重新解读（返回首页）
   */
  onReParse() {
    wx.switchTab({
      url: '/pages/index/index'
    });
  },

  /**
   * 复制报告全文
   * 复制 Markdown 原文，方便用户分享或保存
   */
  onCopyReport() {
    // 优先使用流式内容，其次使用 report.report
    const content = this.data.streamContent || (this.data.report && this.data.report.report) || '';
    if (!content) {
      wx.showToast({ title: '暂无报告内容', icon: 'none', duration: 1500 });
      return;
    }
    wx.setClipboardData({
      data: content,
      success: () => {
        wx.showToast({ title: '已复制全文', icon: 'success', duration: 1000 });
      },
      fail: () => {
        wx.showToast({ title: '复制失败', icon: 'none', duration: 1500 });
      }
    });
  },

  /**
   * 分享报告
   */
  onShareReport() {
    wx.showShareMenu({
      withShareTicket: true,
      menus: ['shareAppMessage', 'shareTimeline']
    });
    wx.showToast({ title: '请点击右上角分享', icon: 'none', duration: 2000 });
  },

  /**
   * 继续解读（返回首页）
   */
  onNewParse() {
    wx.navigateBack();
  },

  /**
   * 分享
   */
  onShareAppMessage() {
    const title = this.data.jobCategory
      ? `我用 JD 说真话解读了${this.data.jobCategory}岗位，快来看看！`
      : 'JD 说真话 - AI 帮你读懂招聘 JD';
    return {
      title,
      path: '/pages/index/index'
    };
  }
});
