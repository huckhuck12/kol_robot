/**
 * KOL交易信号推送系统
 * 主程序入口 - 单次执行模式
 */

const api = require('./api');
const dataProcessor = require('./dataProcessor');
const dingTalk = require('./dingTalk');
const storage = require('./storage');
const config = require('../config');

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
    
    // 3. 读取已处理信号ID
    const processedIds = new Set(storage.getProcessedIds());
    
    // 4. 筛选新信号
    const newSignals = dataProcessor.filterNewSignals(validSignals, processedIds);
    console.log(`✨ 发现 ${newSignals.length} 个新信号`);
    
    if (newSignals.length === 0) {
      console.log('🔔 所有信号都已处理过');
      return;
    }
    
    // 5. 推送新信号到钉钉
    console.log('📤 开始推送信号到钉钉...');
    let successCount = 0;
    let failedCount = 0;
    
    for (const signal of newSignals) {
      // 发送到钉钉
      const success = await dingTalk.sendSignal(signal);
      
      if (success) {
        successCount++;
        // 标记为已处理
        storage.addProcessedId(signal.id.toString());
      } else {
        failedCount++;
      }
      
      // 避免发送频率过高
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log(`📊 推送结果：成功 ${successCount} 个，失败 ${failedCount} 个`);
    
    // 6. 清理旧数据
    storage.cleanupOldData();
    
    console.log('✅ 单次轮询任务完成');
    console.log('='.repeat(60));
    
    // 执行完成后退出进程
    process.exit(0);
    
  } catch (error) {
    console.error('❌ 单次轮询任务失败:', error.message);
    console.error(error.stack);
    console.log('='.repeat(60));
    
    // 出错后退出进程
    process.exit(1);
  }
}

// 执行单次轮询任务
runSinglePoll();
