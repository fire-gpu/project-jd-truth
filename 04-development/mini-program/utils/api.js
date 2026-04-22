/**
 * JD 说真话 - API 请求封装
 * 统一处理请求拦截、错误处理、登录态管理
 */

// 开发环境后端地址
const BASE_URL = 'http://localhost:3000';

// WebSocket 地址（将 http 替换为 ws）
const WS_URL = BASE_URL.replace(/^http/, 'ws');

/**
 * 通用请求方法
 * @param {string} url - 接口路径（不含 BASE_URL）
 * @param {string} method - 请求方法：GET / POST / PUT / DELETE
 * @param {object} data - 请求参数
 * @returns {Promise} 返回 Promise 对象
 */
function request(url, method, data) {
  return new Promise((resolve, reject) => {
    // 获取用户会话标识
    const sessionId = wx.getStorageSync('sessionId') || '';

    wx.request({
      url: BASE_URL + url,
      method: method,
      data: data,
      header: {
        'Content-Type': 'application/json',
        'X-Session-Id': sessionId
      },
      timeout: 30000, // 30秒超时（AI 解读可能较慢）
      success(res) {
        // HTTP 状态码 2xx 视为成功
        if (res.statusCode >= 200 && res.statusCode < 300) {
          // 业务层成功判断（后端返回 { success: true, data: ... } 格式）
          if (res.data && res.data.success === true) {
            resolve(res.data.data);
          } else {
            // 业务层报错
            const errMsg = (res.data && res.data.error && res.data.error.message) || '请求失败，请稍后重试';
            reject(new Error(errMsg));
          }
        } else if (res.statusCode === 401) {
          // 未授权，清除本地会话
          wx.removeStorageSync('sessionId');
          reject(new Error('登录已过期，请重新打开小程序'));
        } else {
          // 其他 HTTP 错误
          const errMsg = (res.data && res.data.message) || '网络异常，请稍后重试';
          reject(new Error(errMsg));
        }
      },
      fail(err) {
        // 网络层面失败（无网络、超时等）
        console.error('请求失败:', url, err);
        reject(new Error('网络连接失败，请检查网络后重试'));
      }
    });
  });
}

/**
 * JD 智能解读
 * @param {string} jdText - JD 文本内容
 * @param {string} jobCategory - 岗位类别 ID
 * @param {string} userBackground - 用户背景（选填）
 * @returns {Promise} 返回解读报告数据
 */
function parseJD(jdText, jobCategory, userBackground) {
  return request('/api/parse', 'POST', {
    jdText: jdText,
    jobCategory: jobCategory,
    userBackground: userBackground || ''
  });
}

/**
 * 获取岗位类别列表
 * @returns {Promise} 返回岗位类别数组
 */
function getCategories() {
  return request('/api/categories', 'GET', {});
}

/**
 * 获取解读历史列表
 * @param {number} page - 页码，从 1 开始
 * @param {number} pageSize - 每页条数
 * @returns {Promise} 返回历史记录列表
 */
function getHistory(page, pageSize) {
  return request('/api/history', 'GET', {
    page: page || 1,
    pageSize: pageSize || 20
  });
}

/**
 * 获取单条历史记录详情
 * @param {string} historyId - 历史记录 ID
 * @returns {Promise} 返回历史记录详情
 */
function getHistoryDetail(historyId) {
  return request('/api/history/' + historyId, 'GET', {});
}

/**
 * 提交用户反馈评分
 * @param {string} historyId - 历史记录 ID
 * @param {number} score - 评分 1-5
 * @param {string} comment - 反馈文字（选填）
 * @returns {Promise} 返回提交结果
 */
function submitFeedback(historyId, score, comment) {
  return request('/api/feedback', 'POST', {
    historyId: historyId,
    score: score,
    comment: comment || ''
  });
}

/**
 * WebSocket 流式 JD 解读
 * 通过 WebSocket 连接实现实时流式输出，解决 AI 解读等待时间过长的问题
 *
 * @param {string} jdText - JD 文本内容
 * @param {string} jobCategory - 岗位类别 ID
 * @param {string} userBackground - 用户背景（选填）
 * @param {Object} callbacks - 回调函数集合
 * @param {Function} callbacks.onChunk - 收到内容片段时回调 (content: string) => void
 * @param {Function} callbacks.onDone - 解读完成时回调 (data: { historyId, metadata }) => void
 * @param {Function} callbacks.onError - 出错时回调 (error: Error) => void
 * @returns {Object} socketTask - WebSocket 连接任务对象，可调用 close() 关闭连接
 */
function parseJDStream(jdText, jobCategory, userBackground, callbacks) {
  const { onChunk, onDone, onError } = callbacks;

  // 构建 WebSocket URL
  const wsUrl = WS_URL + '/ws/parse';

  // 创建 WebSocket 连接
  const socketTask = wx.connectSocket({
    url: wsUrl,
    header: {
      'Content-Type': 'application/json'
    }
  });

  // 连接打开后发送请求数据
  socketTask.onOpen(function () {
    console.log('[WebSocket] 连接已建立，发送解读请求');
    socketTask.send({
      data: JSON.stringify({
        jdText: jdText,
        jobCategory: jobCategory,
        userBackground: userBackground || ''
      })
    });
  });

  // 接收服务端推送的消息
  socketTask.onMessage(function (res) {
    try {
      const msg = JSON.parse(res.data);

      switch (msg.type) {
        case 'chunk':
          // 收到内容片段，调用 onChunk 回调
          if (typeof onChunk === 'function') {
            onChunk(msg.content);
          }
          break;

        case 'done':
          // 解读完成，调用 onDone 回调
          console.log('[WebSocket] 解读完成，historyId:', msg.historyId);
          if (typeof onDone === 'function') {
            onDone(msg);
          }
          // 完成后关闭连接
          socketTask.close();
          break;

        case 'error':
          // 服务端报错
          console.error('[WebSocket] 服务端错误:', msg.message);
          if (typeof onError === 'function') {
            onError(new Error(msg.message || '解读失败'));
          }
          socketTask.close();
          break;

        default:
          console.warn('[WebSocket] 未知消息类型:', msg.type);
      }
    } catch (e) {
      console.error('[WebSocket] 消息解析失败:', e);
    }
  });

  // 连接错误
  socketTask.onError(function (err) {
    console.error('[WebSocket] 连接错误:', err);
    if (typeof onError === 'function') {
      onError(new Error('WebSocket 连接失败，请检查网络后重试'));
    }
  });

  // 连接关闭
  socketTask.onClose(function (res) {
    console.log('[WebSocket] 连接已关闭, code:', res.code);
  });

  return socketTask;
}

module.exports = {
  request: request,
  parseJD: parseJD,
  parseJDStream: parseJDStream,
  getCategories: getCategories,
  getHistory: getHistory,
  getHistoryDetail: getHistoryDetail,
  submitFeedback: submitFeedback
};
