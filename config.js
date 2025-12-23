module.exports = {
  // API配置
  api: {
    url: 'http://kol.zhixing.icu/api/user/proxy/frontend-messages',
    params: {
      type: 'all',
      limit: 100
    },
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'application/json, text/plain, */*',
      'Accept-Language': 'zh-CN,zh;q=0.9',
      'Connection': 'keep-alive'
    },
    retry: {
      times: 3,
      delay: 1000
    }
  },

  // 钉钉机器人配置
  dingTalk: {
    webhook: 'https://oapi.dingtalk.com/robot/send?access_token=9a856254285232eaf16f56d3bc24a4bcbaf17c58564a9c64eae2b1fdadd5bd5d',
    secret: 'SECaa230b2e1bed6ec4161d983c0313a0e1c2f47d3e059d95bb0b635761f37eb81c'
  },

  // 定时任务配置（单位：分钟）
  schedule: {
    interval: 5
  },

  // 本地存储配置
  storage: {
    filePath: './data/processedSignals.json',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 保留7天的数据
  }
};
