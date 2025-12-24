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
    try {
      // 处理有signal字段的消息
      if (message.signal && message.signal.trim() !== '') {
        const signal = parseSignal(message);
        if (signal) {
          // 构建原始链接（基于平台和消息ID）
          let originalLink = '';
          if (message.platform && message.channel_id && message.message_id) {
            // 基于不同平台构建合理的链接格式
            if (message.platform === 'discord') {
              originalLink = `https://discord.com/channels/${message.guild_id}/${message.channel_id}/${message.message_id}`;
            } else if (message.platform === 'kook') {
              originalLink = `https://www.kookapp.cn/app/channels/${message.channel_id}/messages/${message.message_id}`;
            } else {
              // 默认格式
              originalLink = `${message.platform}://channel/${message.channel_id}/message/${message.message_id}`;
            }
          }
          
          validSignals.push({
            id: message.id,
            author: message.author_nickname,
            authorAvatar: message.author_avatar,
            platform: message.platform,
            channel: message.channel_name,
            messageTime: message.message_time,
            timestamp: message.timestamp,
            originalLink: originalLink,
            messageContent: message.message_content, // 添加原始消息内容
            ...signal
          });
        }
      } 
      // 处理包含图片或其他内容的消息（即使signal为空）
      else if (message.message_content && message.message_content.trim() !== '') {
        // 构建原始链接
        let originalLink = '';
        if (message.platform && message.channel_id && message.message_id) {
          if (message.platform === 'kook') {
            originalLink = `https://www.kookapp.cn/app/channels/${message.channel_id}/messages/${message.message_id}`;
          } else if (message.platform === 'discord') {
            originalLink = `https://discord.com/channels/${message.guild_id}/${message.channel_id}/${message.message_id}`;
          } else {
            originalLink = `${message.platform}://channel/${message.channel_id}/message/${message.message_id}`;
          }
        }
        
        // 尝试从message_content中提取交易对
        const content = message.message_content;
        const symbolMatch = content.match(/\$([A-Z0-9]+)\//i) || content.match(/\$([A-Z0-9]+)/i);
        const symbol = symbolMatch ? symbolMatch[1].trim().toUpperCase() : '未知币种';
        
        validSignals.push({
          id: message.id,
          author: message.author_nickname,
          authorAvatar: message.author_avatar,
          platform: message.platform,
          channel: message.channel_name,
          messageTime: message.message_time,
          timestamp: message.timestamp,
          originalLink: originalLink,
          messageContent: content, // 包含原始消息内容（图片等）
          symbol: symbol,
          direction: '未知方向',
          entryPrice: '未知',
          stopLoss: '未知',
          targetPrice: '未知',
          leverage: '未知',
          analysis: message.analysis || '无',
          originalContent: content
        });
      }
    } catch (error) {
      console.error('解析信号失败:', error.message, '消息ID:', message.id);
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
  // 处理时间显示问题，始终从timestamp生成正确时间
  let timestamp;
  if (signal.timestamp) {
    // 确保timestamp是数字类型
    const rawTimestamp = typeof signal.timestamp === 'string' ? parseInt(signal.timestamp) : signal.timestamp;
    
    // 根据数值大小判断是秒级还是毫秒级
    // 1e12是一个阈值，超过则认为是毫秒级
    if (rawTimestamp > 1e12) {
      timestamp = rawTimestamp;
    } else if (rawTimestamp > 0) {
      timestamp = rawTimestamp * 1000;
    } else {
      // 无效的timestamp，使用当前时间
      timestamp = Date.now();
    }
  } else {
    // 如果没有timestamp，使用当前时间
    timestamp = Date.now();
  }
  
  // 将UTC时间转换为北京时间
  const messageTime = new Date(timestamp).toLocaleString('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
  
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
    messageTime: messageTime,
    channel: signal.channel,
    originalLink: signal.originalLink || '',
    messageContent: signal.messageContent || ''
  };
}

module.exports = {
  extractSignals,
  filterNewSignals,
  formatSignalForPush
};
