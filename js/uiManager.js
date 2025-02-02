export class UIManager {
  constructor() {
    this.messageTimeout = null;
  }

  initializeTheme(theme) {
    if (theme === 'system') {
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.body.setAttribute('data-theme', isDark ? 'dark' : 'light');
    } else {
      document.body.setAttribute('data-theme', theme);
    }
  }

  setActiveTab(tabId) {
    // 移除所有标签页的active类
    document.querySelectorAll('.tab-button').forEach(tab => {
      tab.classList.remove('active');
    });
    document.querySelectorAll('.panel').forEach(panel => {
      panel.classList.remove('active');
    });

    // 设置当前标签页为active
    const targetTab = document.querySelector(`#${tabId}Tab`);
    const targetPanel = document.querySelector(`#${tabId}Panel`);
    
    if (targetTab && targetPanel) {
      targetTab.classList.add('active');
      targetPanel.classList.add('active');
    }
  }

  handleTabClick(button) {
    const tabId = button.id.replace('Tab', '');
    this.setActiveTab(tabId);
  }

  setLoading(elementId, isLoading) {
    const element = document.querySelector(`#${elementId}`);
    if (element) {
      if (isLoading) {
        element.classList.add('loading');
        element.textContent = '处理中...';
      } else {
        element.classList.remove('loading');
      }
    }
  }

  async copyText(elementId) {
    const element = document.querySelector(`#${elementId}`);
    if (element && element.textContent) {
      try {
        await navigator.clipboard.writeText(element.textContent);
        this.showMessage('复制成功');
      } catch (error) {
        this.showMessage('复制失败');
      }
    }
  }

  async shareSummary() {
    const summaryText = document.querySelector('#summaryResult').textContent;
    if (summaryText) {
      try {
        await navigator.share({
          title: '页面内容总结',
          text: summaryText
        });
      } catch (error) {
        // 如果设备不支持分享API，则复制到剪贴板
        await this.copyText('summaryResult');
      }
    }
  }

  showMessage(message) {
    // 创建或获取消息元素
    let messageElement = document.querySelector('.message-popup');
    if (!messageElement) {
      messageElement = document.createElement('div');
      messageElement.className = 'message-popup';
      document.body.appendChild(messageElement);
    }

    // 设置消息内容和显示
    messageElement.textContent = message;
    messageElement.classList.add('show');

    // 清除之前的定时器
    if (this.messageTimeout) {
      clearTimeout(this.messageTimeout);
    }

    // 3秒后隐藏消息
    this.messageTimeout = setTimeout(() => {
      messageElement.classList.remove('show');
    }, 3000);
  }
} 