// 存储侧边栏端口和状态
let sidePanelPorts = new Set();
let activeTabId = null;

// 监听侧边栏连接
chrome.runtime.onConnect.addListener((port) => {
  if (port.name === 'sidePanel') {
    console.log('侧边栏已连接');
    // 添加新的连接
    sidePanelPorts.add(port);
    
    // 获取当前活动标签页并启用选择功能
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      if (tabs[0]) {
        activeTabId = tabs[0].id;
        // 等待一段时间确保content script已加载
        await new Promise(resolve => setTimeout(resolve, 500));
        // 启用选择文本功能
        await enableSelectionInTab(activeTabId, true);
      }
    });
    
    // 监听断开连接
    port.onDisconnect.addListener(() => {
      console.log('侧边栏已断开连接');
      sidePanelPorts.delete(port);
      
      // 如果没有活动的侧边栏连接，禁用选择文本功能
      if (sidePanelPorts.size === 0 && activeTabId) {
        enableSelectionInTab(activeTabId, false);
        activeTabId = null;
      }
    });
  }
});

// 启用或禁用标签页中的选择文本功能
async function enableSelectionInTab(tabId, enable) {
  try {
    console.log(`${enable ? '启用' : '禁用'}标签页 ${tabId} 的选择功能`);
    await chrome.tabs.sendMessage(tabId, {
      type: 'enableSelection',
      enable: enable
    });
  } catch (error) {
    console.log('设置选择文本状态失败:', error);
    // 如果发送消息失败，可能需要注入content script
    if (enable) {
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tabId },
          files: ['content.js']
        });
        // 重试发送消息
        await chrome.tabs.sendMessage(tabId, {
          type: 'enableSelection',
          enable: enable
        });
      } catch (injectError) {
        console.error('注入content script失败:', injectError);
      }
    }
  }
}

// 监听标签页切换
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  if (sidePanelPorts.size > 0) {
    // 如果有旧的活动标签页，禁用其选择功能
    if (activeTabId && activeTabId !== activeInfo.tabId) {
      await enableSelectionInTab(activeTabId, false);
    }
    // 在新的活动标签页启用选择功能
    activeTabId = activeInfo.tabId;
    await enableSelectionInTab(activeTabId, true);
  }
});

// 监听标签页更新
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tabId === activeTabId && sidePanelPorts.size > 0) {
    // 页面加载完成后重新启用选择功能
    await enableSelectionInTab(tabId, true);
  }
});

// 监听扩展图标点击事件
chrome.action.onClicked.addListener(async (tab) => {
  try {
    await chrome.sidePanel.open({ windowId: tab.windowId });
    console.log('侧边栏已打开');
  } catch (error) {
    console.error('无法打开侧边栏:', error);
  }
});

// 创建右键菜单
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'translateSelection',
    title: '翻译选中文本',
    contexts: ['selection']
  });
});

// 监听右键菜单点击
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'translateSelection') {
    try {
      // 打开侧边栏
      await chrome.sidePanel.open({ windowId: tab.windowId });
      
      // 发送选中的文本
      const selectedText = info.selectionText;
      if (selectedText) {
        broadcastMessage({
          type: 'selectedText',
          text: selectedText,
          from: 'background'
        });
      }
    } catch (error) {
      console.error('处理选中文本失败:', error);
    }
  }
});

// 广播消息到所有侧边栏
function broadcastMessage(message) {
  console.log('广播消息:', message);
  
  // 通过runtime.sendMessage发送
  chrome.runtime.sendMessage(message).catch(() => {
    console.log('runtime.sendMessage发送失败');
  });

  // 通过端口发送
  sidePanelPorts.forEach(port => {
    try {
      port.postMessage(message);
    } catch (error) {
      console.error('发送消息到侧边栏失败:', error);
      sidePanelPorts.delete(port); // 移除失效的端口
    }
  });
}

// 监听来自content script的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('收到消息:', message);
  
  if (message.type === 'selectedText' && message.from === 'content') {
    broadcastMessage({
      type: 'selectedText',
      text: message.text,
      from: 'background'
    });
  }
}); 