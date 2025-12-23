/**
 * 本地存储模块
 * 负责管理已处理的交易信号ID
 */

const fs = require('fs');
const path = require('path');
const config = require('../config');

/**
 * 本地存储类
 */
class Storage {
  constructor() {
    this.filePath = path.resolve(config.storage.filePath);
    this.ensureFileExists();
  }

  /**
   * 确保存储文件存在
   */
  ensureFileExists() {
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    if (!fs.existsSync(this.filePath)) {
      fs.writeFileSync(this.filePath, JSON.stringify({ processedIds: [], lastClean: Date.now() }));
    }
  }

  /**
   * 读取已处理的信号ID列表
   * @returns {Array<string>} 已处理信号ID列表
   */
  getProcessedIds() {
    try {
      const data = fs.readFileSync(this.filePath, 'utf8');
      const parsed = JSON.parse(data);
      return parsed.processedIds || [];
    } catch (error) {
      console.error('读取存储文件失败:', error.message);
      return [];
    }
  }

  /**
   * 添加单个已处理的信号ID
   * @param {string} id 信号ID
   */
  addProcessedId(id) {
    try {
      const data = JSON.parse(fs.readFileSync(this.filePath, 'utf8'));
      if (!data.processedIds.includes(id)) {
        data.processedIds.push(id);
        data.lastClean = Date.now();
        fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2));
      }
    } catch (error) {
      console.error('添加处理ID失败:', error.message);
    }
  }

  /**
   * 清理旧数据
   */
  cleanupOldData() {
    try {
      const data = JSON.parse(fs.readFileSync(this.filePath, 'utf8'));
      
      // 保留最近1000个ID
      if (data.processedIds.length > 1000) {
        data.processedIds = data.processedIds.slice(-1000);
        data.lastClean = Date.now();
        fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2));
        console.log('已清理旧数据，保留最近1000个ID');
      }
    } catch (error) {
      console.error('清理旧数据失败:', error.message);
    }
  }
}

// 导出单例实例
module.exports = new Storage();