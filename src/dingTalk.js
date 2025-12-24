/**
 * 钉钉推送模块
 * 负责向钉钉机器人发送交易信号
 */

const axios = require('axios');
const crypto = require('crypto');
const config = require('../config');

class DingTalkService {
  constructor() {
    this.webhook = config.dingTalk.webhook;
    this.secret = config.dingTalk.secret;
  }

  /**
   * 生成钉钉机器人签名
   * @returns {Object} 包含timestamp和sign的对象
   */
  generateSign() {
    const timestamp = Date.now();
    const stringToSign = `${timestamp}\n${this.secret}`;
    const hmac = crypto.createHmac('sha256', this.secret);
    hmac.update(stringToSign);
    const sign = encodeURIComponent(hmac.digest('base64'));
    
    return { timestamp, sign };
  }

  /**
   * 构建完整的Webhook URL（包含签名）
   * @returns {string} 完整的Webhook URL
   */
  buildWebhookUrl() {
    const { timestamp, sign } = this.generateSign();
    return `${this.webhook}&timestamp=${timestamp}&sign=${sign}`;
  }

  /**
   * 格式化交易信号为适合移动端显示的简洁Markdown消息
   * @param {Object} signal 交易信号
   * @returns {Object} Markdown消息格式
   */
  formatMessage(signal) {
    // 构建适合移动端显示的简洁Markdown消息，确保每条信息独占一行
    const markdownText = `📊 **KOL交易信号**\n` +
                        `👤 **作者**: ${signal.author || '未知作者'}\n` +
                        `📈 **交易对**: ${signal.symbol || '未知币种'}\n` +
                        `➡️ **方向**: ${signal.direction || '未知方向'}\n` +
                        `🎯 **入场价**: ${signal.entryPrice || '市价'}\n` +
                        `🛑 **止损**: ${signal.stopLoss || '未设置'}\n` +
                        `🎯 **目标价**: ${signal.targetPrice || '未设置'}\n` +
                        `🔢 **杠杆**: ${signal.leverage || '未建议'}\n` +
                        `📢 **频道**: ${signal.channel || '未知频道'}\n` +
                        `⏰ **时间**: ${signal.messageTime || new Date().toLocaleString('zh-CN')}\n` +
                        `💡 **分析理由**: ${signal.analysis || '无'}\n` +
                        `${signal.originalLink ? `🔗 **原始链接**: [点击查看](${signal.originalLink})\n` : ''}` +
                        `${signal.messageContent ? `📝 **原始消息**: ${signal.messageContent}\n` : ''}` +
                        `\n*消息来自KOL交易信号推送系统*`;
    
    return {
      msgtype: 'markdown',
      markdown: {
        title: `${signal.author || '未知作者'} - ${signal.symbol || '未知币种'}`,
        text: markdownText
      }
    };
  }

  /**
   * 发送交易信号到钉钉
   * @param {Object} signal 交易信号
   * @returns {Promise<boolean>} 是否发送成功
   */
  async sendSignal(signal) {
    if (!this.webhook) {
      console.warn('钉钉机器人webhook未配置，跳过推送');
      return false;
    }

    try {
      const webhookUrl = this.buildWebhookUrl();
      
      // 格式化消息
      const message = this.formatMessage(signal);
      
      // 发送Markdown消息
      const response = await axios.post(webhookUrl, message, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      // 检查响应结果
      if (response.data && response.data.errcode === 0) {
        console.log(`✅ 钉钉推送成功：${signal.author || '未知作者'} - ${signal.symbol || '未知币种'}`);
        return true;
      } else {
        console.error(`❌ 钉钉推送失败，错误码：${response.data.errcode}，错误信息：${response.data.errmsg}`);
        return false;
      }
    } catch (error) {
      console.error('❌ 钉钉推送异常:', error.message);
      return false;
    }
  }
}

module.exports = new DingTalkService();
