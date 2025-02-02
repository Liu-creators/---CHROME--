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
    document.querySelector('#summarizeButton').addEventListener('click', () => this.handleSummarize());
    document.querySelector('#copySummaryButton').addEventListener('click', () => this.ui.copyText('summaryResult'));
    document.querySelector('#shareSummaryButton').addEventListener('click', () => this.ui.shareSummary());

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

  async handleSummarize() {
    this.ui.setLoading('summaryResult', true);
    const summaryLength = document.querySelector('#summaryLength').value;

    try {
      const result = await this.kimiApi.summarize(summaryLength);
      document.querySelector('#summaryResult').textContent = result;
    } catch (error) {
      this.ui.showMessage(error.message);
    } finally {
      this.ui.setLoading('summaryResult', false);
    }
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