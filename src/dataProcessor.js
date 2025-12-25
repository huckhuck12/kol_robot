/**
 * 数据处理模块
 * 负责提取、过滤和格式化KOL交易信号
 * 包含频道屏蔽、信号解析和质量评估功能
 */

/**
 * 从消息中提取有效的交易信号
 * @param {Array} messages API返回的消息列表
 * @returns {Array} 提取的有效交易信号列表
 */
function extractSignals(messages, options = {}) {
  const validSignals = [];

  // 获取屏蔽频道列表
  const blockedChannels = options.blockedChannels || new Set();

  // 检查消息是否来自屏蔽频道
  const isBlockedChannel = (message) => {
    return blockedChannels.has(String(message.channel_id));
  };

  messages.forEach(message => {
    try {
      // 检查是否为屏蔽频道的消息
      if (isBlockedChannel(message)) {
        return; // 跳过屏蔽频道的消息
      }
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

      // 处理有signal字段的消息
      if (message.signal && message.signal.trim() !== '') {
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
            originalLink: originalLink,
            messageContent: message.message_content, // 添加原始消息内容
            ...signal
          });
        }
      }
      // 处理没有signal字段但可能包含交易信号的消息
      else if (message.message_content && message.message_content.trim() !== '') {
        // 构建临时signal对象，用于解析
        const tempMessage = {
          ...message,
          signal: message.message_content // 将message_content作为signal进行解析
        };

        // 尝试解析信号
        let signal = parseSignal(tempMessage);

        if (!signal) {
          // 如果标准解析失败，尝试使用原网站风格的解析函数
          signal = parseSignalOriginal(tempMessage);

          // 如果原网站风格解析也失败，使用基础解析
          if (!signal || !signal.symbol || signal.symbol === '') {
            // 如果解析失败，尝试从message_content中提取基本信息
            const content = message.message_content;

            // 提取交易对 - 增强版本
            const symbolMatch =
              content.match(/\$([A-Z0-9]+)\//i) ||
              content.match(/\$([A-Z0-9]+)/i) ||
              content.match(/#([A-Z0-9]+)\s+/i) ||
              content.match(/([A-Z0-9]+)\s*(?:多头|空头|long|short)/i) ||
              content.match(/(BTC|ETH|SOL|BNB|ADA|DOGE|XRP|DOT|UNI|LTC|MATIC|AVAX|SHIB|TRX|LINK|XLM|TON|NEAR|ICP|BSV|EOS|XMR|DASH|ZEC|ETC|BCH|FIL|ALGO|ATOM|MANA|SAND|AXS|CHZ|FTM|TRB|AAVE|MKR|COMP|SNX|DYDX|CRV|APE|APT|INJ|RDNT|JTO|PYTH|TIA|FET|RNDR|WIF|ORBS|PEPE|FLOKI|ELON|SHIB|DOGE|BONK|HNT|IMX|MINA|TOMO|REN|GRT|OMG|ZRX|KNC|BAT|NEO|QTUM|ONT|IOTA|THETA|VET|EGLD|KSM|DODO|RUNE|CRPT|SXP|AKRO|CTXC|DENT|REEF|SUSHI|YFI|1INCH|CELR|STX|RVN|DGB|HBAR|XEM|HOT|LSK|ARDR|SC|ZIL|OMG|STRK|BLUR|SEI|OP|ARB|BASE|ZKS|BNX|AGIX|RNDR|LOOM|CHR|PERP|GALA|AXL|OCEAN|FET|BLUR|PIXEL|STMX|HFT|CHESS|HIFI|SYS|XNO|AR|FLUX|TURBO|NTRN|ZETA|ALT|SAGA|JUP|WLD|PYTH|TIA|INJ|FET|RNDR|WIF|ORBS|PEPE|FLOKI|ELON|SHIB|DOGE|BONK|HNT|IMX|MINA|TOMO|REN|GRT|OMG|ZRX|KNC|BAT|NEO|QTUM|ONT|IOTA|THETA|VET|EGLD|KSM|DODO|RUNE|CRPT|SXP|AKRO|CTXC|DENT|REEF|SUSHI|YFI|1INCH|CELR|STX|RVN|DGB|HBAR|XEM|HOT|LSK|ARDR|SC|ZIL|OMG|STRK|BLUR|SEI|OP|ARB|BASE|ZKS|BNX|AGIX|RNDR|LOOM|CHR|PERP|GALA|AXL|OCEAN|FET|BLUR|PIXEL|STMX|HFT|CHESS|HIFI|SYS|XNO|AR|FLUX|TURBO|NTRN|ZETA|ALT|SAGA|JUP|WLD)/i);

            const symbol = symbolMatch ? symbolMatch[1].trim().toUpperCase() : '未知币种';

            // 提取交易方向 - 增强版本
            const directionMatch =
              content.match(/(多头|空头|long|short|做多|做空|看涨|看跌|多单|空单|buy|sell|up|down)/i) ||
              content.match(/(上|下|涨|跌)方/i) ||
              content.match(/(\^|↓|⬆|⬇)/);

            let direction = '未知方向';
            if (directionMatch) {
              const dir = directionMatch[1].trim().toLowerCase();
              const directionMap = {
                '多头': 'long', 'long': 'long', '做多': 'long', '看涨': 'long', '多单': 'long',
                'buy': 'long', 'up': 'long', '^': 'long', '⬆': 'long', '上方': 'long', '涨': 'long',
                '空头': 'short', 'short': 'short', '做空': 'short', '看跌': 'short', '空单': 'short',
                'sell': 'short', 'down': 'short', '↓': 'short', '⬇': 'short', '下方': 'short', '跌': 'short'
              };
              direction = directionMap[dir] || dir;
            }

            // 提取入场价格 - 增强版本
            const entryMatch =
              content.match(/Entry:?\s*([\d\.\$]+)/i) ||
                content.match(/入场点：?\s*([\d\.\$]+)/i) ||
                content.match(/市价短多/i) ? ['市价短多', '市价'] :
                content.match(/市价做空/i) ? ['市价做空', '市价'] :
                  content.match(/市价/i) ? ['市价', '市价'] :
                    content.match(/([\d\.]+)\s*(?:入场|进场|建仓)/i) ||
                    content.match(/建仓：?\s*([\d\.]+)/i) ||
                    content.match(/买入：?\s*([\d\.]+)/i) ||
                    content.match(/卖出：?\s*([\d\.]+)/i);
            const entryPrice = entryMatch ? entryMatch[1].trim() : '未知';

            // 提取止损价格 - 增强版本
            const stopLossMatch =
              content.match(/Stop\s*Loss:?\s*([\d\.\$]+)/i) ||
              content.match(/止损：?\s*([\d\.\$]+)/i) ||
              content.match(/SL:?\s*([\d\.]+)/i) ||
              content.match(/止损设置：?\s*([\d\.]+)/i);
            const stopLoss = stopLossMatch ? stopLossMatch[1].trim() : '未知';

            // 提取目标价格 - 增强版本
            const targetMatch =
              content.match(/Target:?\s*([\d\.\$]+)/i) ||
              content.match(/目标：?\s*([\d\.\$]+)/i) ||
              content.match(/TP:?\s*([\d\.]+)/i) ||
              content.match(/止盈：?\s*([\d\.]+)/i) ||
              content.match(/目标位：?\s*([\d\.]+)/i);
            const targetPrice = targetMatch ? targetMatch[1].trim() : '未知';

            // 提取杠杆建议 - 增强版本
            const leverageMatch =
              content.match(/Leverage:?\s*([\dXx]+)/i) ||
              content.match(/杠杆：?\s*([\dXx]+)/i) ||
              content.match(/([\d]+)X/i) ||
              content.match(/([\d]+)倍/i) ||
              content.match(/杠杆([\d]+)/i);
            const leverage = leverageMatch ? leverageMatch[1].trim() : '未知';

            // 提取交易对 - 增强版本
            const basicSymbolMatch =
              content.match(/\$([A-Z0-9]+)\/[A-Z0-9]+/i) ||  // 匹配 $BTC/USDT 格式
              content.match(/\$([A-Z0-9]+)/i) ||
              content.match(/#([A-Z0-9]+)\s+/i) ||
              content.match(/([A-Z0-9]+)\s*(?:多头|空头|long|short)/i) ||
              content.match(/(BTC|ETH|SOL|BNB|ADA|DOGE|XRP|DOT|UNI|LTC|MATIC|AVAX|SHIB|TRX|LINK|XLM|TON|NEAR|ICP|BSV|EOS|XMR|DASH|ZEC|ETC|BCH|FIL|ALGO|ATOM|MANA|SAND|AXS|CHZ|FTM|TRB|AAVE|MKR|COMP|SNX|DYDX|CRV|APE|APT|INJ|RDNT|JTO|PYTH|TIA|FET|RNDR|WIF|ORBS|PEPE|FLOKI|ELON|SHIB|DOGE|BONK|HNT|IMX|MINA|TOMO|REN|GRT|OMG|ZRX|KNC|BAT|NEO|QTUM|ONT|IOTA|THETA|VET|EGLD|KSM|DODO|RUNE|CRPT|SXP|AKRO|CTXC|DENT|REEF|SUSHI|YFI|1INCH|CELR|STX|RVN|DGB|HBAR|XEM|HOT|LSK|ARDR|SC|ZIL|OMG|STRK|BLUR|SEI|OP|ARB|BASE|ZKS|BNX|AGIX|RNDR|LOOM|CHR|PERP|GALA|AXL|OCEAN|FET|BLUR|PIXEL|STMX|HFT|CHESS|HIFI|SYS|XNO|AR|FLUX|TURBO|NTRN|ZETA|ALT|SAGA|JUP|WLD|PYTH|TIA|INJ|FET|RNDR|WIF|ORBS|PEPE|FLOKI|ELON|SHIB|DOGE|BONK|HNT|IMX|MINA|TOMO|REN|GRT|OMG|ZRX|KNC|BAT|NEO|QTUM|ONT|IOTA|THETA|VET|EGLD|KSM|DODO|RUNE|CRPT|SXP|AKRO|CTXC|DENT|REEF|SUSHI|YFI|1INCH|CELR|STX|RVN|DGB|HBAR|XEM|HOT|LSK|ARDR|SC|ZIL|OMG|STRK|BLUR|SEI|OP|ARB|BASE|ZKS|BNX|AGIX|RNDR|LOOM|CHR|PERP|GALA|AXL|OCEAN|FET|BLUR|PIXEL|STMX|HFT|CHESS|HIFI|SYS|XNO|AR|FLUX|TURBO|NTRN|ZETA|ALT|SAGA|JUP|WLD)/i);

            const basicSymbol = basicSymbolMatch ? basicSymbolMatch[1].trim().toUpperCase() : '未知币种';

            // 提取交易方向 - 增强版本
            const basicDirectionMatch =
              content.match(/(多头|空头|long|short|做多|做空|看涨|看跌|多单|空单|buy|sell|up|down)/i) ||
              content.match(/(上|下|涨|跌)方/i) ||
              content.match(/(\^|↓|⬆|⬇)/);

            let basicDirection = '未知方向';
            if (basicDirectionMatch) {
              const dir = basicDirectionMatch[1].trim().toLowerCase();
              const directionMap = {
                '多头': 'long', 'long': 'long', '做多': 'long', '看涨': 'long', '多单': 'long',
                'buy': 'long', 'up': 'long', '^': 'long', '⬆': 'long', '上方': 'long', '涨': 'long',
                '空头': 'short', 'short': 'short', '做空': 'short', '看跌': 'short', '空单': 'short',
                'sell': 'short', 'down': 'short', '↓': 'short', '⬇': 'short', '下方': 'short', '跌': 'short'
              };
              basicDirection = directionMap[dir] || dir;
            }

            // 提取入场价格 - 增强版本
            const basicEntryMatch =
              content.match(/Entry:?\s*([\d\.\$]+)/i) ||
                content.match(/入场点：?\s*([\d\.\$]+)/i) ||
                content.match(/市价短多/i) ? ['市价短多', '市价'] :
                content.match(/市价做空/i) ? ['市价做空', '市价'] :
                  content.match(/市价/i) ? ['市价', '市价'] :
                    content.match(/([\d\.]+)\s*(?:入场|进场|建仓)/i) ||
                    content.match(/建仓：?\s*([\d\.]+)/i) ||
                    content.match(/买入：?\s*([\d\.]+)/i) ||
                    content.match(/卖出：?\s*([\d\.]+)/i);
            const basicEntryPrice = basicEntryMatch ? basicEntryMatch[1].trim() : '未知';

            // 提取止损价格 - 增强版本
            const basicStopLossMatch =
              content.match(/Stop\s*Loss:?\s*([\d\.\$]+)/i) ||
              content.match(/止损：?\s*([\d\.\$]+)/i) ||
              content.match(/SL:?\s*([\d\.]+)/i) ||
              content.match(/止损设置：?\s*([\d\.]+)/i);
            const basicStopLoss = basicStopLossMatch ? basicStopLossMatch[1].trim() : '未知';

            // 提取目标价格 - 增强版本
            const basicTargetMatch =
              content.match(/Target:?\s*([\d\.\$]+)/i) ||
              content.match(/目标：?\s*([\d\.\$]+)/i) ||
              content.match(/TP:?\s*([\d\.]+)/i) ||
              content.match(/止盈：?\s*([\d\.]+)/i) ||
              content.match(/目标位：?\s*([\d\.]+)/i);
            const basicTargetPrice = basicTargetMatch ? basicTargetMatch[1].trim() : '未知';

            // 提取杠杆建议 - 增强版本
            const basicLeverageMatch =
              content.match(/Leverage:?\s*([\dXx]+)/i) ||
              content.match(/杠杆：?\s*([\dXx]+)/i) ||
              content.match(/([\d]+)X/i) ||
              content.match(/([\d]+)倍/i) ||
              content.match(/杠杆([\d]+)/i);
            const basicLeverage = basicLeverageMatch ? basicLeverageMatch[1].trim() : '未知';

            // 构建信号对象
            signal = {
              symbol: basicSymbol,
              direction: basicDirection,
              entryPrice: basicEntryPrice,
              stopLoss: basicStopLoss,
              targetPrice: basicTargetPrice,
              leverage: basicLeverage,
              analysis: message.analysis || '无',
              originalContent: content
            };
          }
        }

        // 添加到有效信号列表
        validSignals.push({
          id: message.id,
          author: message.author_nickname,
          authorAvatar: message.author_avatar,
          platform: message.platform,
          channel: message.channel_name,
          messageTime: message.message_time,
          timestamp: message.timestamp,
          originalLink: originalLink,
          messageContent: message.message_content,
          ...signal
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
  const fullContent = `${signal || ''}\n${content || ''}`;

  // 提取交易对 - 增强支持更多格式
  const symbolMatch =
    signal.match(/币种：([^\n]+)/) ||
    signal.match(/交易对：([^\n]+)/) ||
    content.match(/\$([A-Z0-9]+)\//i) ||
    content.match(/\$([A-Z0-9]+)/i) ||
    content.match(/#([A-Z0-9]+)\s+/i) ||
    content.match(/([A-Z0-9]+)\s*(?:多头|空头|long|short)/i) ||
    content.match(/(BTC|ETH|SOL|BNB|ADA|DOGE|XRP|DOT|UNI|LTC|MATIC|AVAX|SHIB|TRX|LINK|XLM|TON|NEAR|ICP|BSV|EOS|XMR|DASH|ZEC|ETC|BCH|FIL|ALGO|ATOM|MANA|SAND|AXS|CHZ|FTM|TRB|AAVE|MKR|COMP|SNX|DYDX|CRV|APE|APT|INJ|RDNT|JTO|PYTH|TIA|FET|RNDR|WIF|ORBS|PEPE|FLOKI|ELON|SHIB|DOGE|BONK|HNT|IMX|MINA|TOMO|REN|GRT|OMG|ZRX|KNC|BAT|NEO|QTUM|ONT|IOTA|THETA|VET|EGLD|KSM|DODO|RUNE|CRPT|SXP|AKRO|CTXC|DENT|REEF|SUSHI|YFI|1INCH|CELR|STX|RVN|DGB|HBAR|XEM|HOT|LSK|ARDR|SC|ZIL|OMG|STRK|BLUR|SEI|OP|ARB|BASE|ZKS|BNX|AGIX|RNDR|LOOM|CHR|PERP|GALA|AXL|OCEAN|FET|BLUR|PIXEL|STMX|HFT|CHESS|HIFI|SYS|XNO|AR|FLUX|TURBO|NTRN|ZETA|ALT|SAGA|JUP|WLD|PYTH|TIA|INJ|FET|RNDR|WIF|ORBS|PEPE|FLOKI|ELON|SHIB|DOGE|BONK|HNT|IMX|MINA|TOMO|REN|GRT|OMG|ZRX|KNC|BAT|NEO|QTUM|ONT|IOTA|THETA|VET|EGLD|KSM|DODO|RUNE|CRPT|SXP|AKRO|CTXC|DENT|REEF|SUSHI|YFI|1INCH|CELR|STX|RVN|DGB|HBAR|XEM|HOT|LSK|ARDR|SC|ZIL|OMG|STRK|BLUR|SEI|OP|ARB|BASE|ZKS|BNX|AGIX|RNDR|LOOM|CHR|PERP|GALA|AXL|OCEAN|FET|BLUR|PIXEL|STMX|HFT|CHESS|HIFI|SYS|XNO|AR|FLUX|TURBO|NTRN|ZETA|ALT|SAGA|JUP|WLD)/i);
  if (!symbolMatch) return null;

  const symbol = symbolMatch[1].trim().toUpperCase();

  // 提取交易方向 - 增强支持更多表述方式
  const directionMatch =
    signal.match(/方向：([^\n]+)/) ||
    signal.match(/多空：([^\n]+)/) ||
    signal.match(/立场：([^\n]+)/) ||
    content.match(/(多头|空头|long|short|做多|做空|看涨|看跌|多单|空单|buy|sell|up|down)/i) ||
    content.match(/(上|下|涨|跌)方/i) ||
    content.match(/(\^|↓|⬆|⬇)/);
  let direction = 'unknown';
  if (directionMatch) {
    const dir = directionMatch[1].trim().toLowerCase();
    // 映射各种方向表述到标准方向
    const directionMap = {
      '多头': 'long', 'long': 'long', '做多': 'long', '看涨': 'long', '多单': 'long',
      'buy': 'long', 'up': 'long', '^': 'long', '⬆': 'long', '上方': 'long', '涨': 'long',
      '空头': 'short', 'short': 'short', '做空': 'short', '看跌': 'short', '空单': 'short',
      'sell': 'short', 'down': 'short', '↓': 'short', '⬇': 'short', '下方': 'short', '跌': 'short'
    };
    direction = directionMap[dir] || dir;
  }

  // 提取入场价格 - 增强支持更多格式
  const entryMatch =
    signal.match(/入场：([^\n]+)/) ||
      signal.match(/入场价：([^\n]+)/) ||
      signal.match(/进场：([^\n]+)/) ||
      signal.match(/进场价：([^\n]+)/) ||
      content.match(/Entry:?\s*([\d\.\$]+)/i) ||
      content.match(/入场点：?\s*([\d\.\$]+)/i) ||
      content.match(/市价短多/i) ? ['市价短多', '市价'] :
      content.match(/市价做空/i) ? ['市价做空', '市价'] :
        content.match(/市价/i) ? ['市价', '市价'] :
          content.match(/([\d\.]+)\s*(?:入场|进场|建仓)/i) ||
          content.match(/建仓：?\s*([\d\.]+)/i) ||
          content.match(/买入：?\s*([\d\.]+)/i) ||
          content.match(/卖出：?\s*([\d\.]+)/i);
  const entryPrice = entryMatch ? entryMatch[1].trim() : '市场价格';

  // 提取止损价格 - 增强支持更多格式
  const stopLossMatch =
    signal.match(/止损：([^\n]+)/) ||
    signal.match(/止损价：([^\n]+)/) ||
    signal.match(/止损点：([^\n]+)/) ||
    content.match(/Stop\s*Loss:?\s*([\d\.\$]+)/i) ||
    content.match(/止损：?\s*([\d\.\$]+)/i) ||
    content.match(/SL:?\s*([\d\.]+)/i) ||
    content.match(/止损设置：?\s*([\d\.]+)/i);
  const stopLoss = stopLossMatch ? stopLossMatch[1].trim() : '';

  // 提取目标价格 - 增强支持更多格式
  const targetMatch =
    signal.match(/目标：([^\n]+)/) ||
    signal.match(/目标价：([^\n]+)/) ||
    signal.match(/目标点：([^\n]+)/) ||
    signal.match(/止盈：([^\n]+)/) ||
    content.match(/Target:?\s*([\d\.\$]+)/i) ||
    content.match(/目标：?\s*([\d\.\$]+)/i) ||
    content.match(/TP:?\s*([\d\.]+)/i) ||
    content.match(/止盈：?\s*([\d\.]+)/i) ||
    content.match(/目标位：?\s*([\d\.]+)/i);
  const targetPrice = targetMatch ? targetMatch[1].trim() : '';

  // 提取杠杆建议 - 增强支持更多格式
  const leverageMatch =
    signal.match(/杠杆：([^\n]+)/) ||
    signal.match(/倍率：([^\n]+)/) ||
    content.match(/Leverage:?\s*([\dXx]+)/i) ||
    content.match(/杠杆：?\s*([\dXx]+)/i) ||
    content.match(/([\d]+)X/i) ||
    content.match(/([\d]+)倍/i) ||
    content.match(/杠杆([\d]+)/i);
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
 * 原网站风格的信号解析函数
 * 使用链式判断方式解析交易信号
 * @param {Object} message 原始消息对象
 * @returns {Object} 解析后的信号对象
 */
function parseSignalOriginal(message) {
  const content = message.message_content || "";
  const signal = message.signal || "";
  const fullContent = content + " " + signal;

  const result = {
    symbol: "",
    entryPrice: "",
    stopLoss: "",
    takeProfit: "",
    direction: "",
    leverage: "",
    position: "",
    type: ""
  };

  // 解析交易方向
  if (/方向[：:]\s*(多单|做多|Long)/i.test(fullContent)) {
    result.direction = "long";
  } else if (/方向[：:]\s*(空单|做空|Short)/i.test(fullContent)) {
    result.direction = "short";
  } else if (/方向[：:]\s*(现货)/i.test(fullContent)) {
    result.direction = "spot";
  } else if (/方向[：:]\s*(平仓)/i.test(fullContent)) {
    result.direction = "close";
  } else if (signal.includes("做多") || signal.includes("多单") || signal.includes("Long")) {
    result.direction = "long";
  } else if (signal.includes("做空") || signal.includes("空单") || signal.includes("Short")) {
    result.direction = "short";
  } else if (signal.includes("现货")) {
    result.direction = "spot";
  }

  // 解析交易对/币种
  const symbolMatch = fullContent.match(/币种[：:]\s*[#$]?([A-Z0-9]{1,10})\b/i) ||
    fullContent.match(/[#$]([A-Z][A-Z0-9]{0,9})\b/i) ||
    fullContent.match(/\b([A-Z]{2,10})(\/USDT|USDT|\/USD)?\b/);
  if (symbolMatch) {
    const extractedSymbol = symbolMatch[1].toUpperCase().replace(/^[#$]/, "");
    if (/^[A-Z0-9]+$/.test(extractedSymbol) && /[A-Z]/.test(extractedSymbol)) {
      result.symbol = extractedSymbol;
    }
  }

  // 解析入场价格
  const entryMatch = fullContent.match(/入场[价位]*[:：]?\s*([\d.,\-~附近市价]+)/i) ||
    fullContent.match(/价格[:：]?\s*([\d.,\-~]+)/i);
  if (entryMatch) {
    result.entryPrice = entryMatch[1];
  }

  // 解析止损价格
  const stopLossMatch = fullContent.match(/止损[:：]?\s*([\d.,]+)/i);
  if (stopLossMatch) {
    result.stopLoss = stopLossMatch[1];
  }

  // 解析目标价格
  const takeProfitMatch = fullContent.match(/止盈[:：]?\s*([\d.,\-~]+)/i) ||
    fullContent.match(/目标[:：]?\s*([\d.,\-~<>]+)/i);
  if (takeProfitMatch) {
    result.takeProfit = takeProfitMatch[1];
  }

  // 解析杠杆
  const leverageMatch = fullContent.match(/杠杆[:：]?\s*([\d]+)\s*倍/i) ||
    fullContent.match(/([\d]+)\s*倍/i);
  if (leverageMatch) {
    result.leverage = leverageMatch[1] + "x";
  }

  // 解析仓位
  const positionMatch = fullContent.match(/仓位[:：]?\s*([\d]+)%/i);
  if (positionMatch) {
    result.position = positionMatch[1] + "%";
  }

  // 确定交易类型
  if (signal.includes("现货") || result.direction === "spot") {
    result.type = "现货";
  } else if (result.leverage || signal.includes("合约")) {
    result.type = "合约";
  }

  return result;
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

  // 获取信号质量信息
  const quality = signal.quality || {
    score: 0,
    level: '未知',
    details: []
  };

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
    messageContent: signal.messageContent || '',
    quality: quality.score,
    qualityLevel: quality.level,
    qualityDetails: quality.details
  };
}

/**
 * 评估交易信号质量
 * @param {Object} signal 交易信号对象
 * @returns {Object} 包含质量评分和评估细节的对象
 */
function evaluateSignalQuality(signal) {
  let score = 0;
  const details = [];

  // 1. 基本信息完整性（最高40分）
  if (signal.symbol && signal.symbol !== '未知币种') {
    score += 15;
    details.push('币种信息完整');
  } else {
    details.push('币种信息缺失');
  }

  if (signal.direction && signal.direction !== 'unknown' && signal.direction !== '未知方向') {
    score += 15;
    details.push('交易方向明确');
  } else {
    details.push('交易方向不明确');
  }

  if (signal.entryPrice && signal.entryPrice !== '未知') {
    score += 10;
    details.push('入场价格明确');
  } else {
    details.push('入场价格不明确');
  }

  // 2. 风险控制（最高20分）
  if (signal.stopLoss && signal.stopLoss !== '未知' && signal.stopLoss !== '') {
    score += 15;
    details.push('包含止损设置');
  } else {
    details.push('缺少止损设置');
  }

  // 3. 目标明确性（最高20分）
  if (signal.targetPrice && signal.targetPrice !== '未知' && signal.targetPrice !== '') {
    score += 20;
    details.push('目标价格明确');
  } else {
    details.push('缺少目标价格');
  }

  // 4. 分析依据（最高10分）
  if (signal.analysis && signal.analysis !== '无' && signal.analysis.trim() !== '') {
    score += 10;
    details.push('包含分析依据');
  } else {
    details.push('缺少分析依据');
  }

  // 5. 杠杆合理性（最高10分）
  if (signal.leverage && signal.leverage !== '未知' && signal.leverage !== '') {
    const leverageNum = parseInt(signal.leverage.replace(/[^0-9]/g, ''));
    if (leverageNum > 0 && leverageNum <= 50) {
      score += 10;
      details.push('杠杆设置合理');
    } else {
      score += 5;
      details.push('杠杆设置较高');
    }
  } else {
    // 不扣分，杠杆不是必填项
    score += 5;
    details.push('杠杆信息可选');
  }

  // 6. 信号格式规范性（最高10分）
  // 基于信号来源和格式判断
  if (signal.platform && (signal.platform === 'discord' || signal.platform === 'kook')) {
    score += 5;
    details.push('来自正规平台');
  }

  // 综合评分等级
  let level = '低';
  if (score >= 90) {
    level = '极高';
  } else if (score >= 75) {
    level = '高';
  } else if (score >= 50) {
    level = '中';
  } else if (score >= 30) {
    level = '低';
  } else {
    level = '极低';
  }

  return {
    score,
    level,
    details
  };
}

/**
 * 筛选高质量信号
 * @param {Array} signals 信号列表
 * @param {number} minScore 最低分数要求（默认60分）
 * @returns {Array} 高质量信号列表
 */
function filterHighQualitySignals(signals, minScore = 60) {
  return signals.filter(signal => {
    const quality = evaluateSignalQuality(signal);
    signal.quality = quality;
    return quality.score >= minScore;
  });
}

/**
 * 根据原网站逻辑过滤信号
 * @param {Array} signals 信号列表
 * @param {Object} filters 过滤条件
 * @param {Set} blockedChannels 屏蔽频道列表
 * @returns {Array} 过滤后的信号列表
 */
function filterSignalsByOriginalLogic(signals, filters = {}, blockedChannels = new Set()) {
  let filteredSignals = signals;

  // 过滤屏蔽频道
  if (blockedChannels && blockedChannels.size > 0) {
    filteredSignals = filteredSignals.filter(signal =>
      !blockedChannels.has(String(signal.channel_id))
    );
  }

  // 根据方向过滤
  if (filters.direction && filters.direction !== "all") {
    filteredSignals = filteredSignals.filter(signal =>
      signal.direction === filters.direction
    );
  }

  // 根据币种过滤
  if (filters.symbol && filters.symbol !== "all") {
    filteredSignals = filteredSignals.filter(signal =>
      signal.symbol === filters.symbol
    );
  }

  // 根据作者过滤
  if (filters.author && filters.author !== "all") {
    filteredSignals = filteredSignals.filter(signal =>
      signal.author === filters.author
    );
  }

  // 根据时间范围过滤
  if (filters.timeRange && filters.timeRange !== "all") {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);

    filteredSignals = filteredSignals.filter(signal => {
      const signalTime = signal.timestamp ? new Date(signal.timestamp) : new Date(signal.messageTime);

      switch (filters.timeRange) {
        case "today":
          return signalTime >= todayStart;
        case "3days":
          const threeDaysAgo = new Date(todayStart);
          threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
          return signalTime >= threeDaysAgo;
        case "week":
          const weekAgo = new Date(todayStart);
          weekAgo.setDate(weekAgo.getDate() - 7);
          return signalTime >= weekAgo;
        case "month":
          const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
          return signalTime >= monthStart;
        default:
          return true;
      }
    });
  }

  // 根据搜索关键词过滤
  if (filters.searchQuery && filters.searchQuery.trim()) {
    const query = filters.searchQuery.toLowerCase();
    filteredSignals = filteredSignals.filter(signal => {
      return (signal.symbol && signal.symbol.toLowerCase().includes(query)) ||
        (signal.messageContent && signal.messageContent.toLowerCase().includes(query)) ||
        (signal.author && signal.author.toLowerCase().includes(query)) ||
        (signal.channel && signal.channel.toLowerCase().includes(query));
    });
  }

  return filteredSignals;
}

module.exports = {
  extractSignals,
  filterNewSignals,
  formatSignalForPush,
  evaluateSignalQuality,
  filterHighQualitySignals,
  parseSignalOriginal,
  filterSignalsByOriginalLogic
};
