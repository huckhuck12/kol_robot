/**
 * KOL交易信号推送系统
 * 主程序入口
 */

const scheduleService = require('./schedule');
const config = require('../config');

class App {
  constructor() {
    this.isRunning = false;
  }

  /**
   * 初始化应用
   */
  init() {
    console.log('='.repeat(60));
    console.log('KOL交易信号推送系统');
    console.log('='.repeat(60));
    
    // 检查配置
    this.checkConfig();
    
    // 启动定时任务
    this.start();
    
    // 监听进程终止信号
    this.setupGracefulShutdown();
  }

  /**
   * 检查配置
   */
  checkConfig() {
    if (!config.api.url) {
      console.error('API URL未配置，请检查config.js文件');
      process.exit(1);
    }
    
    if (!config.dingTalk.webhook) {
      console.warn('⚠️  钉钉机器人webhook未配置，推送功能将不可用');
    }
    
    console.log('✅ 配置检查完成');
  }

  /**
   * 启动应用
   */
  start() {
    if (this.isRunning) {
      console.log('应用已经在运行中');
      return;
    }
    
    scheduleService.start();
    this.isRunning = true;
    
    console.log('✅ 应用已启动');
    console.log(`📅 定时任务：每${config.schedule.interval}分钟执行一次`);
    console.log('🔔 等待新的交易信号...');
    console.log('='.repeat(60));
  }

  /**
   * 停止应用
   */
  stop() {
    if (!this.isRunning) {
      console.log('应用未在运行中');
      return;
    }
    
    scheduleService.stop();
    this.isRunning = false;
    
    console.log('✅ 应用已停止');
  }

  /**
   * 设置优雅退出
   */
  setupGracefulShutdown() {
    // 监听Ctrl+C
    process.on('SIGINT', () => {
      console.log('\n收到终止信号，正在关闭应用...');
      this.stop();
      process.exit(0);
    });
    
    // 监听kill信号
    process.on('SIGTERM', () => {
      console.log('\n收到终止信号，正在关闭应用...');
      this.stop();
      process.exit(0);
    });
  }
}

// 初始化应用
const app = new App();
app.init();

module.exports = app;
