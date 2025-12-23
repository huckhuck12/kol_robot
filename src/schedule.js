const schedule = require('node-schedule');
const api = require('./api');
const dataProcessor = require('./dataProcessor');
const dingTalk = require('./dingTalk');
const storage = require('./storage');
const config = require('../config');

class ScheduleService {
  constructor() {
    this.job = null;
  }

  /**
   * 启动定时任务
   */
  start() {
    // 立即执行一次
    this.executeTask();

    // 设置定时任务，每config.schedule.interval分钟执行一次
    this.job = schedule.scheduleJob(`*/${config.schedule.interval} * * * *`, () => {
      this.executeTask();
    });

    console.log(`定时任务已启动，每${config.schedule.interval}分钟执行一次`);
  }

  /**
   * 停止定时任务
   */
  stop() {
    if (this.job) {
      this.job.cancel();
      this.job = null;
      console.log('定时任务已停止');
    }
  }

  /**
   * 执行任务主逻辑
   */
  async executeTask() {
    console.log(`[${new Date().toLocaleString()}] 开始执行任务...`);
    
    try {
      // 1. 获取API数据
      const data = await api.fetchWithRetry();
      
      // 2. 提取有效信号
      const signals = dataProcessor.extractSignals(data.messages || []);
      console.log(`提取到${signals.length}个有效信号`);
      
      // 3. 读取已处理信号ID
      const processedIds = new Set(storage.getProcessedIds());
      
      // 4. 筛选新信号
      const newSignals = dataProcessor.filterNewSignals(signals, processedIds);
      console.log(`发现${newSignals.length}个新信号`);
      
      // 5. 推送新信号到钉钉
      for (const signal of newSignals) {
        // 格式化信号
        const formattedSignal = dataProcessor.formatSignalForPush(signal);
        
        // 发送到钉钉
        await dingTalk.sendSignal(formattedSignal);
        
        // 标记为已处理
        storage.addProcessedId(signal.id.toString());
        
        // 避免发送频率过高
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      // 6. 清理旧数据
      storage.cleanupOldData();
      
      console.log(`[${new Date().toLocaleString()}] 任务执行完成`);
    } catch (error) {
      console.error(`[${new Date().toLocaleString()}] 任务执行失败:`, error.message);
    }
  }
}

module.exports = new ScheduleService();
