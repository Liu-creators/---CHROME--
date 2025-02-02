# Kimi翻译助手 Chrome插件

基于Kimi API的网页翻译和内容总结Chrome插件。

## 功能特点

- 选中文本即时翻译
- 网页内容智能总结
- 支持多种语言翻译
- 深色/浅色主题切换
- 可自定义默认设置

## 安装说明

1. 克隆或下载本仓库
2. 打开Chrome浏览器，进入扩展程序页面（chrome://extensions/）
3. 开启"开发者模式"
4. 点击"加载已解压的扩展程序"，选择本项目文件夹

## 使用方法

1. 点击Chrome工具栏中的插件图标，打开侧边栏
2. 在设置中输入您的Kimi API Key
3. 选择默认启动标签和主题
4. 开始使用：
   - 翻译：选中网页文本，点击翻译按钮
   - 总结：打开总结标签页，点击生成总结按钮

## 文件结构

```
├── manifest.json          // 插件配置文件
├── sidepanel.html        // 侧边栏HTML
├── styles/
│   └── sidepanel.css     // 样式文件
├── js/
│   ├── sidepanel.js      // 主要逻辑
│   ├── kimiApi.js        // API接口
│   ├── storage.js        // 存储管理
│   └── uiManager.js      // UI管理
├── content.js            // 内容脚本
└── background.js         // 后台脚本
```

## 开发说明

- 使用Chrome Extension Manifest V3
- 采用模块化设计
- 支持异步操作
- 使用Chrome Storage API保存设置

## API文档

### Kimi API

本插件使用Kimi API进行文本翻译和内容总结。您需要：

1. 注册Kimi API账号
2. 获取API Key
3. 在插件设置中配置API Key

## 注意事项

- 请妥善保管您的API Key
- 建议在翻译大段文本前先进行分段
- 总结功能可能需要一定时间处理

## 许可证

MIT License