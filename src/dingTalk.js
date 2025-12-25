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
  /**
 * 格式化交易信号为【移动端友好】的纯文本消息
 */
  formatMessage(signal) {
    const lines = [];

    lines.push('【📢 KOL 交易信号】');
    lines.push('');

    lines.push(`👤 作者：${signal.author || '未知'}`);
    lines.push(`📈 交易对：${signal.symbol || '未知'}`);
    lines.push(`➡️ 方向：${signal.direction || '未知'}`);
    lines.push(`🎯 入场：${signal.entryPrice || '市价'}`);
    lines.push(`🛑 止损：${signal.stopLoss || '未设置'}`);
    lines.push(`🎯 目标：${signal.targetPrice || '未设置'}`);
    lines.push(`🔢 杠杆：${signal.leverage || '未建议'}`);
    lines.push(`⭐ 质量：${signal.quality || 0}分 (${signal.qualityLevel || '未知'})`);
    lines.push(`📢 频道：${signal.channel || '未知'}`);
    lines.push(`⏰ 时间：${signal.messageTime || new Date().toLocaleString('zh-CN')}`);

    if (signal.analysis) {
      lines.push('');
      lines.push(`💡 分析：${signal.analysis}`);
    }

    if (signal.originalLink) {
      lines.push('');
      lines.push(`🔗 原文：${signal.originalLink}`);
    }

    if (signal.messageContent) {
      lines.push('');
      lines.push('📝 原始消息：');
      lines.push(signal.messageContent);
    }

    lines.push('');
    lines.push('——');
    lines.push('来自 KOL 信号推送系统');

    return {
      msgtype: 'text',
      text: {
        content: lines.join('\n')
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
