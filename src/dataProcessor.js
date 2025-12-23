/**
 * 数据处理模块
 * 负责提取、过滤和格式化KOL交易信号
 */

/**
 * 从消息中提取有效的交易信号
 * @param {Array} messages API返回的消息列表
 * @returns {Array} 提取的有效交易信号列表
 */
function extractSignals(messages) {
  const validSignals = [];

  messages.forEach(message => {
    // 检查是否包含交易信号
    if (message.signal && message.signal.trim() !== '') {
      try {
        const signal = parseSignal(message);
        if (signal) {
          validSignals.push({
            id: message.id,
            author: message.author_nickname,
            authorAvatar: message.author_avatar,
            platform: message.platform,
            channel: message.channel_name,
            messageTime: message.message_time,
            timestamp: message.timestamp,
            ...signal
          });
        }
      } catch (error) {
        console.error('解析信号失败:', error.message, '消息ID:', message.id);
      }
    }
  });

  return validSignals;
}

/**
 * 解析信号内容
 * @param {Object} message 原始消息对象
 * @returns {Object|null} 解析后的信号对象
 */
function parseSignal(message) {
  const signal = message.signal;
  const content = message.message_content;
  
  // 提取交易对
  const symbolMatch = signal.match(/币种：([^\n]+)/) || 
                      content.match(/\$([A-Z0-9]+)\//i) ||
                      content.match(/\$([A-Z0-9]+)/i);
  if (!symbolMatch) return null;

  const symbol = symbolMatch[1].trim().toUpperCase();
  
  // 提取交易方向
  const directionMatch = signal.match(/方向：([^\n]+)/) || 
                        content.match(/(多头|空头|long|short)/i);
  const direction = directionMatch ? directionMatch[1].trim().toLowerCase() : 'unknown';
  
  // 提取入场价格
  const entryMatch = signal.match(/入场：([^\n]+)/) || 
                     content.match(/Entry:?\s*([\d\.\$]+)/i) ||
                     content.match(/入场点：?\s*([\d\.\$]+)/i);
  const entryPrice = entryMatch ? entryMatch[1].trim() : '市场价格';
  
  // 提取止损价格
  const stopLossMatch = signal.match(/止损：([^\n]+)/) || 
                        content.match(/Stop Loss:?\s*([\d\.\$]+)/i) ||
                        content.match(/止损：?\s*([\d\.\$]+)/i);
  const stopLoss = stopLossMatch ? stopLossMatch[1].trim() : '';
  
  // 提取目标价格
  const targetMatch = signal.match(/目标：([^\n]+)/) || 
                      content.match(/Target:?\s*([\d\.\$]+)/i) ||
                      content.match(/目标：?\s*([\d\.\$]+)/i);
  const targetPrice = targetMatch ? targetMatch[1].trim() : '';
  
  // 提取杠杆建议
  const leverageMatch = signal.match(/杠杆：([^\n]+)/) || 
                        content.match(/Leverage:?\s*([\dXx]+)/i) ||
                        content.match(/杠杆：?\s*([\dXx]+)/i);
  const leverage = leverageMatch ? leverageMatch[1].trim() : '';
  
  // 提取分析理由
  const analysis = message.analysis || '';
  
  return {
    symbol,
    direction,
    entryPrice,
    stopLoss,
    targetPrice,
    leverage,
    analysis,
    originalContent: content
  };
}

/**
 * 筛选新信号（与已处理信号对比）
 * @param {Array} signals 提取的信号列表
 * @param {Set} processedIds 已处理信号ID集合
 * @returns {Array} 新信号列表
 */
function filterNewSignals(signals, processedIds) {
  return signals.filter(signal => !processedIds.has(signal.id.toString()));
}

/**
 * 格式化信号用于推送
 * @param {Object} signal 交易信号对象
 * @returns {Object} 格式化后的信号
 */
function formatSignalForPush(signal) {
  return {
    id: signal.id,
    title: `【${signal.author}】${signal.symbol} 交易信号`,
    author: signal.author,
    symbol: signal.symbol,
    direction: signal.direction === 'long' || signal.direction === '多头' ? '多头' : '空头',
    entryPrice: signal.entryPrice,
    stopLoss: signal.stopLoss,
    targetPrice: signal.targetPrice,
    leverage: signal.leverage,
    analysis: signal.analysis,
    messageTime: signal.messageTime,
    channel: signal.channel
  };
}

module.exports = {
  extractSignals,
  filterNewSignals,
  formatSignalForPush
};
