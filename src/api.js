const axios = require('axios');
const config = require('../config');

/**
 * 模拟浏览器访问API，获取KOL交易信号
 * @returns {Promise<Object>} API响应数据
 */
async function fetchKOLMessages() {
  try {
    const response = await axios.get(config.api.url, {
      params: config.api.params,
      headers: config.api.headers,
      timeout: 10000 // 10秒超时
    });

    return response.data;
  } catch (error) {
    console.error('API请求失败:', error.message);
    throw error;
  }
}

/**
 * 带重试机制的API请求
 * @returns {Promise<Object>} API响应数据
 */
async function fetchWithRetry() {
  let retryCount = 0;
  const maxRetry = config.api.retry.times;
  const retryDelay = config.api.retry.delay;

  while (retryCount < maxRetry) {
    try {
      return await fetchKOLMessages();
    } catch (error) {
      retryCount++;
      console.error(`API请求重试 (${retryCount}/${maxRetry}):`, error.message);
      
      if (retryCount < maxRetry) {
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
  }

  throw new Error(`API请求失败，已重试${maxRetry}次`);
}

module.exports = {
  fetchWithRetry
};
