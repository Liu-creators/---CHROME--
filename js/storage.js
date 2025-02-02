export class StorageManager {
  constructor() {
    this.defaultSettings = {
      apiKey: '',
      theme: 'light',
      defaultTab: 'translate',
      targetLanguage: 'zh'
    };
  }

  async getSettings() {
    return new Promise((resolve) => {
      chrome.storage.sync.get(this.defaultSettings, (settings) => {
        resolve(settings);
      });
    });
  }

  async saveSettings(settings) {
    return new Promise((resolve) => {
      chrome.storage.sync.set(settings, () => {
        resolve();
      });
    });
  }

  async clearSettings() {
    return new Promise((resolve) => {
      chrome.storage.sync.clear(() => {
        resolve();
      });
    });
  }
} 