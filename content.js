// 存储上一次选中的文本
let lastSelectedText = '';
let isSelectionEnabled = false;

// 发送选中的文本到background
function sendSelectedText() {
  try {
    const selection = window.getSelection();
    const selectedText = selection ? selection.toString().trim() : '';
    
    if (selectedText && selectedText !== lastSelectedText) {
      lastSelectedText = selectedText;
      chrome.runtime.sendMessage({
        type: 'selectedText',
        text: selectedText,
        from: 'content'
      }).catch(error => {
        console.log('发送选中文本失败:', error);
      });
    }
  } catch (error) {
    console.log('获取选中文本失败:', error);
  }
}

// 防抖函数
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// 使用防抖处理选中文本发送
const debouncedSendSelectedText = debounce(sendSelectedText, 300);

// 监听文本选择事件
function setupSelectionListeners() {
  document.addEventListener('mouseup', debouncedSendSelectedText);
  document.addEventListener('keyup', debouncedSendSelectedText);
  document.addEventListener('selectionchange', debouncedSendSelectedText);
  console.log('已设置选择文本监听器');
}

// 移除文本选择事件监听
function removeSelectionListeners() {
  document.removeEventListener('mouseup', debouncedSendSelectedText);
  document.removeEventListener('keyup', debouncedSendSelectedText);
  document.removeEventListener('selectionchange', debouncedSendSelectedText);
  console.log('已移除选择文本监听器');
}

// 监听来自插件的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('收到消息:', message);

  if (message.type === 'getPageContent') {
    try {
      const selection = window.getSelection();
      const selectedText = selection ? selection.toString().trim() : '';
      
      if (selectedText) {
        sendResponse({ content: selectedText, isSelected: true });
      } else {
        const mainContent = document.body.innerText;
        sendResponse({ content: mainContent, isSelected: false });
      }
    } catch (error) {
      console.log('获取页面内容失败:', error);
      sendResponse({ content: '', isSelected: false, error: error.message });
    }
  } else if (message.type === 'getSelectedText') {
    // 获取选中的文本
    const selection = window.getSelection();
    const selectedText = selection ? selection.toString().trim() : '';
    sendResponse({ text: selectedText });
  } else if (message.type === 'enableSelection') {
    // 启用或禁用选择文本功能
    isSelectionEnabled = message.enable;
    console.log('选择文本功能状态:', isSelectionEnabled);
    
    if (isSelectionEnabled) {
      setupSelectionListeners();
      // 如果当前有选中的文本，立即发送
      const selection = window.getSelection();
      const selectedText = selection ? selection.toString().trim() : '';
      if (selectedText) {
        sendSelectedText();
      }
    } else {
      removeSelectionListeners();
    }
    sendResponse({ success: true });
  }
  return true;
}); 