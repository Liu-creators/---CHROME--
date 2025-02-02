export const GenerateStructuredSummaryPrompt = (url, content, summaryLevel, contentLength) => {
  const detailLevel = {
    short: '简要概括，仅包含核心信息和创新亮点',
    medium: '中等详细程度，包含核心信息、创新亮点、关键数据和相关信息',
    long: '全面详细的总结，包含所有可能的部分'
  };

  const contentLengthGuide = {
    short: '用一句话简要概括页面的主要内容',
    medium: '用一个段落（3-5句话）概括页面的主要内容',
    long: '用多个段落详细概括页面的主要内容，包含背景信息和重要细节'
  };

  // 根据总结程度决定显示的部分
  const getSections = (level) => {
    const sections = {
      short: 
`📝 页面总结
[请${contentLengthGuide[contentLength]}]

📌 核心信息
  • [信息1]
  • [信息2]
  • [信息3]

💡 创新亮点
  • [亮点1]
  • [亮点2]
  • [亮点3]`,
      medium: 
`📝 页面总结
[请${contentLengthGuide[contentLength]}]

📌 核心信息
  • [信息1]
  • [信息2]
  • [信息3]

💡 创新亮点
  • [亮点1]
  • [亮点2]
  • [亮点3]

📊 关键数据
  • [数据点1]
  • [数据点2]
  • [数据点3]

🔗 相关信息
  • 相关技术: [相关技术列表]
  • 相关领域: [相关领域列表]
  • 相关案例: [相关案例列表]
  • 参考资料: [重要参考资料]`,
      long: 
`📝 页面总结
[请${contentLengthGuide[contentLength]}]

📌 核心信息
  • [信息1]
  • [信息2]
  • [信息3]

🔍 详细内容
  1. [主题1]
    • [详细点1]
    • [详细点2]
  
  2. [主题2]
    • [详细点1]
    • [详细点2]

💡 创新亮点
  • [亮点1]
  • [亮点2]
  • [亮点3]

📊 关键数据
  • [数据点1]
  • [数据点2]
  • [数据点3]

🔗 相关信息
  • 相关技术: [相关技术列表]
  • 相关领域: [相关领域列表]
  • 相关案例: [相关案例列表]
  • 参考资料: [重要参考资料]`
    };
    return sections[level];
  };

  return `请对以下内容进行结构化总结。
URL: ${url}

总结要求：
1. 总结程度：${detailLevel[summaryLevel]}
2. 页面总结部分：${contentLengthGuide[contentLength]}
3. 其他部分：请按照下面的结构提供完整信息

输出结构：
${getSections(summaryLevel)}

格式要求：
- 保持统一的缩进结构（使用两个空格缩进）
- 使用项目符号标记（•）
- 数字编号使用阿拉伯数字
- 确保emoji标记准确
- 保持结构清晰，重点突出

内容要求：
- 确保信息准确性
- 保持客观中立的语气
- 突出重要的数据和关键信息
- 合理归类和组织信息
- 相关信息部分应该提供有价值的延伸阅读方向

待总结内容：
${content}`
}; 