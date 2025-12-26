/**
 * KOL交易信号推送系统
 * 主程序入口 - 支持两种运行模式
 * 1. 单次执行模式：用于GitHub Actions短轮询
 * 2. 本地持续轮询模式：用于本地运行
 */

const api = require('./api');
const dataProcessor = require('./dataProcessor');
const dingTalk = require('./dingTalk');
const config = require('../config');

// 本地持续轮询模式下才需要storage模块
let storage;
if (!process.argv.includes('--single')) {
  storage = require('./storage');
}

/**
 * 执行单次轮询任务
 */
async function runSinglePoll() {
  console.log('='.repeat(60));
  console.log('KOL交易信号推送系统 - 单次轮询');
  console.log('='.repeat(60));
  
  try {
    // 检查配置
    if (!config.api.url) {
      throw new Error('API URL未配置');
    }
    
    if (!config.dingTalk.webhook) {
      console.warn('⚠️  钉钉机器人webhook未配置，推送功能将不可用');
    }
    
    console.log('✅ 配置检查完成');
    
    // 1. 获取API数据
    console.log('🔍 正在获取KOL交易信号...');
    const data = await api.fetchWithRetry();
    console.log(`📥 获取到 ${data.messages.length} 条消息`);
    
    // 2. 提取有效信号
    const validSignals = dataProcessor.extractSignals(data.messages || []);
    console.log(`📋 提取到 ${validSignals.length} 个有效信号`);
    
    if (validSignals.length === 0) {
      console.log('🔔 没有发现有效交易信号');
      return;
    }
    
    // 去掉10分钟限制，保留所有有效信号
    let newSignals = validSignals;
    
    // 再根据运行模式进行额外筛选
    if (!process.argv.includes('--single')) {
      // 本地模式：使用storage模块跟踪已处理信号
      const processedIds = new Set(storage.getProcessedIds());
      newSignals = newSignals.filter(signal => !processedIds.has(signal.id.toString()));
    }
    
    // 8. 只保留当天的信号
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    newSignals = newSignals.filter(signal => {
      const signalTime = typeof signal.timestamp === 'number' ? signal.timestamp : parseInt(signal.timestamp);
      const signalMs = signalTime > 1e12 ? signalTime : signalTime * 1000;
      const signalDate = new Date(signalMs);
      return signalDate >= todayStart;
    });
    
    console.log(`📅 过滤后剩余 ${newSignals.length} 个当天信号`);
    
    // 7. 为所有信号添加质量评分，但不筛选
    const allSignalsWithQuality = newSignals.map(signal => {
      const quality = dataProcessor.evaluateSignalQuality(signal);
      return {
        ...signal,
        quality: quality
      };
    });
    
    console.log(`🎯 为 ${allSignalsWithQuality.length} 个信号添加了质量评分`);
    
    if (allSignalsWithQuality.length === 0) {
      console.log('🔔 没有发现新信号');
      return;
    }
    
    // 8. 按时间从早到晚排序，从离现在最久的开始推送
    allSignalsWithQuality.sort((a, b) => {
      // 获取时间戳
      const aTime = typeof a.timestamp === 'number' ? a.timestamp : parseInt(a.timestamp);
      const bTime = typeof b.timestamp === 'number' ? b.timestamp : parseInt(b.timestamp);
      // 转换为毫秒级
      const aMs = aTime > 1e12 ? aTime : aTime * 1000;
      const bMs = bTime > 1e12 ? bTime : bTime * 1000;
      // 从早到晚排序
      return aMs - bMs;
    });
    
    console.log(`✨ 最终推送 ${allSignalsWithQuality.length} 个信号，按时间从早到晚排序`);
    
    // 5. 推送新信号到钉钉
    console.log('📤 开始推送信号到钉钉...');
    let successCount = 0;
    let failedCount = 0;
    
    for (const signal of allSignalsWithQuality) {
      // 格式化信号用于推送（包括时间转换）
      const formattedSignal = dataProcessor.formatSignalForPush(signal);
      
      // 发送到钉钉
      const success = await dingTalk.sendSignal(formattedSignal);
      
      if (success) {
        successCount++;
        // 本地模式下标记为已处理
        if (storage) {
          storage.addProcessedId(signal.id.toString());
        }
      } else {
        failedCount++;
      }
      
      // 避免发送频率过高
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log(`📊 推送结果：成功 ${successCount} 个，失败 ${failedCount} 个`);
    
    // 6. 本地模式下清理旧数据
    if (storage) {
      storage.cleanupOldData();
    }
    
    console.log('✅ 单次轮询任务完成');
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('❌ 单次轮询任务失败:', error.message);
    console.error(error.stack);
    console.log('='.repeat(60));
  }
}

/**
 * 本地持续轮询模式
 */
function startLocalPolling() {
  console.log('='.repeat(60));
  console.log('KOL交易信号推送系统 - 本地持续轮询模式');
  console.log('='.repeat(60));
  console.log(`🔄 轮询间隔：${config.schedule.interval}分钟`);
  console.log('📅 首次执行：立即执行');
  console.log('🔔 按 Ctrl+C 停止');
  console.log('='.repeat(60));
  
  // 立即执行一次
  runSinglePoll();
  
  // 设置定时任务，每config.schedule.interval分钟执行一次
  const interval = config.schedule.interval * 60 * 1000;
  const timer = setInterval(runSinglePoll, interval);
  
  // 监听退出信号
  process.on('SIGINT', () => {
    console.log('\n🔴 收到停止信号，正在停止轮询...');
    clearInterval(timer);
    console.log('✅ 轮询已停止，感谢使用！');
    process.exit(0);
  });
}

/**
 * 主函数 - 根据命令行参数决定运行模式
 */
function main() {
  // 检查运行模式
  if (process.argv.includes('--single')) {
    // 单次执行模式（用于GitHub Actions）
    runSinglePoll();
  } else {
    // 本地持续轮询模式
    startLocalPolling();
  }
}

// 执行主函数
main();
