import { KimiAPI } from './kimiApi.js';
import { StorageManager } from './storage.js';
import { UIManager } from './uiManager.js';

class SidePanel {
  constructor() {
    this.kimiApi = new KimiAPI();
    this.storage = new StorageManager();
    this.ui = new UIManager();
    
    this.initializeUI();
    this.loadSettings();
    this.setupEventListeners();
    this.connectToBackground();
  }

  connectToBackground() {
    // 连接到background script
    this.port = chrome.runtime.connect({ name: 'sidePanel' });
    
    // 监听来自background的端口消息
    this.port.onMessage.addListener((message) => {
      this.handleMessage(message);
    });

    this.port.onDisconnect.addListener(() => {
      console.log('与background断开连接');
      // 尝试重新连接
      setTimeout(() => this.connectToBackground(), 1000);
    });
  }

  handleMessage(message) {
    if (message.type === 'selectedText' && message.from === 'background') {
      const selectedText = message.text;
      document.querySelector('#selectedText').textContent = selectedText;
      if (selectedText) {
        this.ui.showMessage('已获取选中文本');
      }
    }
  }

  async initializeUI() {
    const settings = await this.storage.getSettings();
    this.ui.initializeTheme(settings.theme);
    this.ui.setActiveTab(settings.defaultTab);
  }

  async loadSettings() {
    const settings = await this.storage.getSettings();
    this.kimiApi.setApiKey(settings.apiKey);
    document.querySelector('#kimiApiKey').value = settings.apiKey || '';
    document.querySelector(`input[name="theme"][value="${settings.theme}"]`).checked = true;
    document.querySelector(`input[name="defaultTab"][value="${settings.defaultTab}"]`).checked = true;
    document.querySelector('#targetLanguage').value = settings.targetLanguage;
  }

  setupEventListeners() {
    // 标签切换
    document.querySelectorAll('.tab-button').forEach(button => {
      button.addEventListener('click', () => this.ui.handleTabClick(button));
    });

    // 翻译功能
    document.querySelector('#translateButton').addEventListener('click', () => this.handleTranslate());
    document.querySelector('#copySourceButton').addEventListener('click', () => this.ui.copyText('selectedText'));
    document.querySelector('#copyTranslationButton').addEventListener('click', () => this.ui.copyText('translationResult'));

    // 总结功能
    document.querySelector('#summarizeContentButton').addEventListener('click', () => this.handleSummarizeContent());
    document.querySelector('#copySummaryButton').addEventListener('click', () => this.ui.copyText('summaryResult'));
    
    // 结构提炼功能
    document.querySelector('#extractStructureButton').addEventListener('click', () => this.handleExtractStructure());
    document.querySelector('#copyStructureButton').addEventListener('click', () => this.ui.copyText('structureResult'));
    document.querySelector('#shareStructureButton').addEventListener('click', () => this.ui.shareStructure());

    // 设置保存
    document.querySelector('#saveSettings').addEventListener('click', () => this.handleSaveSettings());

    // 监听来自background script的消息
    chrome.runtime.onMessage.addListener((message) => {
      this.handleMessage(message);
    });
  }

  async handleTranslate() {
    const sourceText = document.querySelector('#selectedText').textContent;
    if (!sourceText.trim()) {
      this.ui.showMessage('请先选择要翻译的文本');
      return;
    }

    const settings = await this.storage.getSettings();
    this.ui.setLoading('translationResult', true);

    try {
      const result = await this.kimiApi.translate(sourceText, settings.targetLanguage);
      document.querySelector('#translationResult').textContent = result;
    } catch (error) {
      this.ui.showMessage(error.message);
    } finally {
      this.ui.setLoading('translationResult', false);
    }
  }

  async handleSummarizeContent() {
    this.ui.setLoading('summaryResult', true);
    const contentLength = document.querySelector('#summaryContentLength').value;

    try {
      const result = await this.kimiApi.summarizeContent(contentLength);
      // 对总结内容进行格式化处理
      const formattedResult = this.formatSummaryContent(result);
      document.querySelector('#summaryResult').innerHTML = formattedResult;
    } catch (error) {
      this.ui.showMessage(error.message);
    } finally {
      this.ui.setLoading('summaryResult', false);
    }
  }

  formatSummaryContent(content) {
    if (!content) return '';
    
    // 将内容按段落分割
    const lines = content.split('\n');
    let formattedHtml = '';
    
    // 处理简短模式（带编号的格式）
    if (lines[0].trim().startsWith('1.')) {
      lines.forEach(line => {
        if (line.trim() === '') {
        } else if (line.trim().match(/^\d+\./)) {
          // 编号项缩进处理
          formattedHtml += `<div class="summary-numbered-item">${line.trim()}</div>`;
        }
      });
      return formattedHtml;
    }
    
    // 处理中等和详细模式（段落格式）
    lines.forEach(line => {
      const trimmedLine = line.trim();
      if (trimmedLine === '') {
      } else if (trimmedLine.startsWith('第') && trimmedLine.includes('段')) {
        // 段落标题
        formattedHtml += `<div class="summary-paragraph-title">${trimmedLine}</div>`;
      } else {
        // 正常段落内容
        formattedHtml += `<div class="summary-paragraph-content">${trimmedLine}</div>`;
      }
    });
    
    return formattedHtml;
  }

  async handleExtractStructure() {
    this.ui.setLoading('structureResult', true);
    const summaryLevel = document.querySelector('#summaryLevel').value;

    try {
      const result = await this.kimiApi.extractStructure(summaryLevel);
      // 对结构化内容进行格式化处理
      const formattedResult = this.formatStructuredContent(result);
      document.querySelector('#structureResult').innerHTML = formattedResult;
    } catch (error) {
      this.ui.showMessage(error.message);
    } finally {
      this.ui.setLoading('structureResult', false);
    }
  }

  formatStructuredContent(content) {
    if (!content) return '';
    
    // 将内容按行分割
    const lines = content.split('\n');
    let formattedHtml = '';
    let currentIndentLevel = 0;
    
    for (let line of lines) {
      // 跳过空行，但保留换行
      if (line.trim() === '') {
        continue;
      }

      // 检测缩进级别（每两个空格算一级）
      const indentMatch = line.match(/^(\s*)/);
      const spaceCount = indentMatch ? indentMatch[1].length : 0;
      currentIndentLevel = Math.floor(spaceCount / 2);

      // 根据不同的行首标记添加适当的样式
      let styledLine = line;
      
      // 处理emoji标题
      if (line.match(/^[^\s].*?[📌💡📊🔗🔍]/)) {
        styledLine = `<div class="content-title">${line}</div>`;
      }
      // 处理一级项目（•）
      else if (line.includes('•')) {
        styledLine = `<div class="content-level-1">${line}</div>`;
      }
      // 处理二级项目（-）
      else if (line.trim().startsWith('-')) {
        styledLine = `<div class="content-level-2">${line}</div>`;
      }
      // 处理三级项目（数字编号）
      else if (line.trim().match(/^\d+\./)) {
        styledLine = `<div class="content-level-3">${line}</div>`;
      }
      // 处理补充说明（缩进内容）
      else if (currentIndentLevel > 0) {
        styledLine = `<div class="content-indent-${currentIndentLevel}">${line}</div>`;
      }
      // 其他内容
      else {
        styledLine = `<div class="content-text">${line}</div>`;
      }

      formattedHtml += styledLine;
    }

    return formattedHtml;
  }

  async handleSaveSettings() {
    const settings = {
      apiKey: document.querySelector('#kimiApiKey').value,
      theme: document.querySelector('input[name="theme"]:checked').value,
      defaultTab: document.querySelector('input[name="defaultTab"]:checked').value,
      targetLanguage: document.querySelector('#targetLanguage').value
    };

    await this.storage.saveSettings(settings);
    this.kimiApi.setApiKey(settings.apiKey);
    this.ui.initializeTheme(settings.theme);
    this.ui.showMessage('设置已保存');
  }
}

// 初始化应用
new SidePanel(); 