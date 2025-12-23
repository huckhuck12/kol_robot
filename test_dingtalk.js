const axios = require('axios');
const config = require('./config');

/**
 * 测试钉钉机器人推送
 */
async function testDingTalk() {
  console.log('开始测试钉钉机器人推送...');
  
  // 测试消息
  const testMessage = {
    msgtype: 'text',
    text: {
      content: '【测试消息】这是一个简单的测试消息，用于验证钉钉机器人是否能正常工作。'
    }
  };
  
  try {
    const response = await axios.post(config.dingTalk.webhook, testMessage, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ 钉钉API请求成功');
    console.log('响应状态码:', response.status);
    console.log('响应数据:', response.data);
    
    if (response.data.errcode === 0) {
      console.log('🎉 钉钉消息发送成功！');
    } else {
      console.error('❌ 钉钉消息发送失败:', response.data.errmsg);
    }
  } catch (error) {
    console.error('❌ 网络请求失败:', error.message);
    if (error.response) {
      console.error('响应状态码:', error.response.status);
      console.error('响应数据:', error.response.data);
    }
  }
}

// 执行测试
testDingTalk();
