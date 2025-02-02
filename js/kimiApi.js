export class KimiAPI {
  constructor() {
    this.apiKey = '';
    this.baseUrl = 'https://api.moonshot.cn/v1';
  }

  setApiKey(apiKey) {
    this.apiKey = apiKey;
  }

  async translate(text, targetLanguage) {
    if (!this.apiKey) {
      throw new Error('请先设置Kimi API Key');
    }

    const prompt = `请将以下文本翻译成${targetLanguage === 'zh' ? '中文' : 
      targetLanguage === 'en' ? '英文' : 
      targetLanguage === 'ja' ? '日文' : '韩文'}：\n\n${text}`;

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: 'moonshot-v1-8k',
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.3
        })
      });

      if (!response.ok) {
        throw new Error('翻译请求失败');
      }

      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error) {
      throw new Error('翻译失败：' + error.message);
    }
  }

  async summarize(length = 'medium') {
    if (!this.apiKey) {
      throw new Error('请先设置Kimi API Key');
    }

    // 从content script获取页面内容
    const { content, isSelected } = await this.getPageContent();
    
    const lengthPrompt = {
      short: '简短的',
      medium: '中等长度的',
      long: '详细的'
    }[length];

    const prompt = isSelected
      ? `请提供一个${lengthPrompt}总结，概括以下选中内容的要点：\n\n${content}`
      : `请提供一个${lengthPrompt}总结，概括以下网页内容的要点：\n\n${content}`;

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: 'moonshot-v1-8k',
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.3
        })
      });

      if (!response.ok) {
        throw new Error('总结请求失败');
      }

      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error) {
      throw new Error('生成总结失败：' + error.message);
    }
  }

  async getPageContent() {
    return new Promise((resolve, reject) => {
      chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
        if (!tabs[0]) {
          reject(new Error('无法获取当前页面'));
          return;
        }

        chrome.tabs.sendMessage(tabs[0].id, {type: 'getPageContent'}, (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error('无法获取页面内容'));
            return;
          }
          resolve(response);
        });
      });
    });
  }
} 