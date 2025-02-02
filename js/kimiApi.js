import { GenerateStructuredSummaryPrompt } from './prompts.js';

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
      targetLanguage === 'ja' ? '日文' : '韩文'}：\n${text}`;

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

  async summarize(contentLength = 'medium', summaryLevel = 'medium') {
    if (!this.apiKey) {
      throw new Error('请先设置Kimi API Key');
    }

    try {
      // 从content script获取页面内容和URL
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const { content, isSelected } = await this.getPageContent();
      
      // 生成结构化总结prompt
      const prompt = GenerateStructuredSummaryPrompt(tab.url, content, summaryLevel, contentLength);

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

  async summarizeContent(contentLength = 'medium') {
    if (!this.apiKey) {
      throw new Error('请先设置Kimi API Key');
    }

    const maxRetries = 2;
    let retryCount = 0;

    while (retryCount <= maxRetries) {
      try {
        // 获取页面内容
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab) {
          throw new Error('无法获取当前标签页');
        }

        const { content } = await this.getPageContent();
        if (!content || content.trim() === '') {
          throw new Error('页面内容为空');
        }

        // 获取语言设置
        const settings = await chrome.storage.local.get(['targetLanguage']);
        const targetLanguage = settings.targetLanguage || 'zh';

        // 构建请求
        const prompt = this.buildSummaryPrompt(tab.url, content, contentLength, targetLanguage);
        
        // 发送API请求
        const response = await this.sendApiRequest(prompt);
        
        return response;
      } catch (error) {
        retryCount++;
        console.error(`总结失败(第${retryCount}次尝试)：`, error);

        if (retryCount > maxRetries) {
          throw new Error(`生成总结失败(已重试${maxRetries}次)：${error.message}`);
        }

        // 等待一段时间后重试
        await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
      }
    }
  }

  buildSummaryPrompt(url, content, contentLength, targetLanguage) {
    const contentLengthGuide = {
      short: {
        zh: {
          guide: '用1-2句话简要概括页面的核心内容要点',
          format: '输出格式：\n1. [第一句话概括最核心的内容，使用中文句号。]\n\t2. [第二句话补充重要细节，使用中文句号。]'
        },
        en: {
          guide: 'Summarize the core content points in 1-2 sentences',
          format: 'Output format:\n1. [First sentence covering the core content.]\n2. [Second sentence adding important details.]'
        },
        ja: {
          guide: '1-2文で内容の要点を簡潔にまとめる',
          format: '出力形式：\n1. [主要な内容を1文で。]\n2. [重要な詳細を補足。]'
        },
        ko: {
          guide: '1-2문장으로 핵심 내용을 간단히 요약',
          format: '출력 형식：\n1. [핵심 내용을 한 문장으로。]\n2. [중요한 세부 사항 보충。]'
        }
      },
      medium: {
        zh: {
          guide: '用3-5句话组成一个段落，概括页面的主要内容和关键信息',
          format: '输出格式：\n[3-5句话组成的段落，每句话使用中文句号分隔，注意段落缩进。]\n例如：\n    这是第一句话。这是第二句话。这是第三句话。这是第四句话。这是第五句话。'
        },
        en: {
          guide: 'Create a paragraph with 3-5 sentences summarizing the main content and key information',
          format: 'Output format:\n[A paragraph of 3-5 sentences, separated by periods, with proper indentation.]\nExample:\n    This is the first sentence. This is the second sentence. This is the third sentence. This is the fourth sentence. This is the fifth sentence.'
        },
        ja: {
          guide: '3-5文の段落で主な内容と重要な情報をまとめる',
          format: '出力形式：\n[3-5文の段落、句点で区切り、適切なインデントを使用。]\n例：\n    これが1文目です。これが2文目です。これが3文目です。これが4文目です。これが5文目です。'
        },
        ko: {
          guide: '3-5문장으로 구성된 단락으로 주요 내용과 핵심 정보를 요약',
          format: '출력 형식：\n[3-5개의 문장으로 구성된 단락, 마침표로 구분, 적절한 들여쓰기 사용.]\n예시：\n    첫 번째 문장입니다。두 번째 문장입니다。세 번째 문장입니다。네 번째 문장입니다。다섯 번째 문장입니다。'
        }
      },
      long: {
        zh: {
          guide: '用2-3个段落详细总结页面内容，包含背景信息、主要内容和重要细节',
          format: '输出格式：\n第一段：\n    [背景信息，2-3句话，使用中文句号分隔，注意段落缩进。]\n第二段：\n    [主要内容，3-4句话，使用中文句号分隔，注意段落缩进。]\n第三段：\n    [重要细节和结论，2-3句话，使用中文句号分隔，注意段落缩进。]'
        },
        en: {
          guide: 'Provide a detailed summary in 2-3 paragraphs, including background information, main content, and important details',
          format: 'Output format:\nFirst paragraph: [Background information, 2-3 sentences, separated by periods, with proper indentation.]\nSecond paragraph: [Main content, 3-4 sentences, separated by periods, with proper indentation.]\nThird paragraph: [Important details and conclusion, 2-3 sentences, separated by periods, with proper indentation.]'
        },
        ja: {
          guide: '2-3段落で背景情報、主な内容、重要な詳細を含む詳細なまとめを提供する',
          format: '出力形式：\n第1段落：\n    [背景情報、2-3文、句点で区切り、適切なインデントを使用。]\n第2段落：\n    [主な内容、3-4文、句点で区切り、適切なインデントを使用。]\n第3段落：\n    [重要な詳細と結論、2-3文、句点で区切り、適切なインデントを使用。]'
        },
        ko: {
          guide: '2-3개의 단락으로 배경 정보, 주요 내용 및 중요한 세부 사항을 포함하여 자세히 요약',
          format: '출력 형식：\n첫 번째 단락：\n    [배경 정보, 2-3문장, 마침표로 구분, 적절한 들여쓰기 사용.]\n두 번째 단락：\n    [주요 내용, 3-4문장, 마침표로 구분, 적절한 들여쓰기 사용.]\n세 번째 단락：\n    [중요한 세부 사항과 결론, 2-3문장, 마침표로 구분, 적절한 들여쓰기 사용.]'
        }
      }
    };

    const languageGuide = {
      zh: {
        outputLanguage: '中文',
        requirements: [
          '保持语言简洁、客观',
          '突出重要信息',
          '确保内容的完整性和准确性',
          '使用规范的中文标点符号（。，：；）',
          '每句话要有完整的主谓宾结构'
        ]
      },
      en: {
        outputLanguage: 'English',
        requirements: [
          'Keep the language concise and objective',
          'Highlight important information',
          'Ensure content completeness and accuracy',
          'Use proper English punctuation (.,;:)',
          'Maintain complete sentence structure'
        ]
      },
      ja: {
        outputLanguage: '日本語',
        requirements: [
          '簡潔で客観的な言葉遣いを保つ',
          '重要な情報を強調する',
          '内容の完全性と正確性を確保する',
          '適切な句読点を使用する（。、：；）',
          '文の構造を完全に保つ'
        ]
      },
      ko: {
        outputLanguage: '한국어',
        requirements: [
          '간결하고 객관적인 언어 사용',
          '중요한 정보 강조',
          '내용의 완전성과 정확성 보장',
          '올바른 문장 부호 사용 (。，：；)',
          '완전한 문장 구조 유지'
        ]
      }
    };

    return `请使用${languageGuide[targetLanguage].outputLanguage}对以下内容进行总结。

URL: ${url}

总结要求：
1. ${contentLengthGuide[contentLength][targetLanguage].guide}
${languageGuide[targetLanguage].requirements.map((req, index) => `${index + 2}. ${req}`).join('\n')}

${contentLengthGuide[contentLength][targetLanguage].format}

格式规范：
1. 严格按照上述输出格式进行排版
2. 不要添加任何额外的标题或编号
3. 保持适当的段落间距
4. 使用规范的标点符号
5. 确保语言流畅自然

待总结内容：
${content}

注意：请严格按照指定的输出格式生成内容，不要添加任何额外的格式或标记。如果内容不足以填充某个部分，保持该部分完整性的同时精简内容。`;
  }

  async sendApiRequest(prompt) {
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
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`API请求失败(${response.status}): ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }

  async extractStructure(summaryLevel = 'medium') {
    if (!this.apiKey) {
      throw new Error('请先设置Kimi API Key');
    }

    try {
      // 从content script获取页面内容和URL
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const { content } = await this.getPageContent();
      
      const detailLevel = {
        short: '简要概括，仅包含核心信息和创新亮点',
        medium: '中等详细程度，包含核心信息、创新亮点、关键数据和相关信息',
        long: '全面详细的总结，包含所有可能的部分'
      };

      // 根据总结程度决定显示的部分
      const getStructure = (level) => {
        const structures = {
          short: 
`📌 核心信息

  • 主要要点：
    - 要点一：[一句话说明]
    - 要点二：[一句话说明]
    - 要点三：[一句话说明]

💡 创新亮点

  • 特色之处：
    - 亮点一：[具体说明]
    - 亮点二：[具体说明]
    - 亮点三：[具体说明]`,

          medium: 
`📌 核心信息

  • 主要要点：
    - 要点一：[主要内容]
      补充说明：[额外信息]
    - 要点二：[主要内容]
      补充说明：[额外信息]
    - 要点三：[主要内容]
      补充说明：[额外信息]

💡 创新亮点

  • 特色之处：
    - 亮点一：[具体描述]
    - 亮点二：[具体描述]

📊 关键数据

  • 重要数据：
    - 数据一：[具体数值]
      说明：[数据分析]
    - 数据二：[具体数值]
      说明：[数据分析]

🔗 相关信息

  • 相关主题：
    - [主题一]
      说明：[简要描述]
    - [主题二]
      说明：[简要描述]
  
  • 延伸阅读：
    - [资源一]
      推荐原因：[价值说明]
    - [资源二]
      推荐原因：[价值说明]`,

          long: 
`📌 核心信息

  • 主要要点：
    - 要点一：[详细说明]
      背景：[背景信息]
      影响：[影响分析]
    - 要点二：[详细说明]
      背景：[背景信息]
      影响：[影响分析]
    - 要点三：[详细说明]
      背景：[背景信息]
      影响：[影响分析]

🔍 详细内容

  • 主题一：[主题名称]
    - 核心观点：
      1. [观点一]
         论据：[支持证据]
      2. [观点二]
         论据：[支持证据]
    
    - 深入分析：
      1. [分析点一]
      2. [分析点二]
  
  • 主题二：[主题名称]
    - 核心观点：
      1. [观点一]
         论据：[支持证据]
      2. [观点二]
         论据：[支持证据]
    
    - 深入分析：
      1. [分析点一]
      2. [分析点二]

💡 创新亮点

  • 创新特色：
    - 特色一：[详细描述]
      价值：[价值分析]
      应用：[应用场景]
    - 特色二：[详细描述]
      价值：[价值分析]
      应用：[应用场景]
    - 特色三：[详细描述]
      价值：[价值分析]
      应用：[应用场景]

📊 关键数据

  • 核心数据：
    - 数据一：[具体数值]
      来源：[数据来源]
      分析：[深入分析]
      影响：[影响评估]
    - 数据二：[具体数值]
      来源：[数据来源]
      分析：[深入分析]
      影响：[影响评估]

🔗 相关信息

  • 相关主题：
    - [主题一]
      关联度：[关联说明]
      参考价值：[价值说明]
    - [主题二]
      关联度：[关联说明]
      参考价值：[价值说明]
  
  • 延伸阅读：
    - [资源一]
      内容概述：[主要内容]
      参考价值：[价值说明]
    - [资源二]
      内容概述：[主要内容]
      参考价值：[价值说明]
  
  • 参考资料：
    - [来源一]：[出处说明]
    - [来源二]：[出处说明]`
        };
        return structures[level];
      };

      const prompt = `请对以下内容进行结构化分析，并严格按照指定模板输出，不要添加任何模板之外的内容。

URL: ${tab.url}

分析要求：
1. 分析程度：${detailLevel[summaryLevel]}
2. 严格按照下面的结构模板提取信息，不要添加任何额外的标题或内容
3. 保持每个部分的独立性和清晰度
4. 确保emoji标记正确显示
5. 严格遵守缩进层级关系

重要提示：
1. 简短模式下，仅输出"核心信息"和"创新亮点"两个部分
2. 中等模式下，输出四个部分：核心信息、创新亮点、关键数据、相关信息
3. 详细模式下，输出全部内容
4. 严禁添加模板中未定义的部分
5. 严禁改变模板的结构和层级

格式规范：
1. 每个主标题必须以emoji开头
2. 标题后必须空一行
3. 使用"•"标记一级项目
4. 使用"-"标记二级项目
5. 使用数字标记三级项目
6. 所有中文标点使用：、。，！？
7. 每个层级使用两个空格缩进
8. 并列项之间不空行
9. 大标题之间必须空一行

输出结构：
${getStructure(summaryLevel)}

待分析内容：
${content}

注意：请严格按照上述模板输出，不要添加任何模板之外的内容。如果内容不足以填充某个部分，使用"暂无"或"无"来占位，但不要删除模板中的任何部分。`;

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
        throw new Error('结构提取请求失败');
      }

      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error) {
      throw new Error('提取结构失败：' + error.message);
    }
  }

  async getPageContent() {
    const maxRetries = 3;
    let retryCount = 0;

    const tryGetContent = async () => {
      return new Promise((resolve, reject) => {
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
          if (!tabs[0]) {
            reject(new Error('无法获取当前页面'));
            return;
          }

          // 添加超时处理
          const timeoutId = setTimeout(() => {
            reject(new Error('获取页面内容超时'));
          }, 5000);

          chrome.tabs.sendMessage(tabs[0].id, {type: 'getPageContent'}, (response) => {
            clearTimeout(timeoutId);
            
            if (chrome.runtime.lastError) {
              reject(new Error('无法获取页面内容：' + chrome.runtime.lastError.message));
              return;
            }

            if (!response || !response.content) {
              reject(new Error('页面内容为空'));
              return;
            }

            resolve(response);
          });
        });
      });
    };

    while (retryCount < maxRetries) {
      try {
        return await tryGetContent();
      } catch (error) {
        retryCount++;
        if (retryCount === maxRetries) {
          throw new Error(`获取页面内容失败(已重试${maxRetries}次)：${error.message}`);
        }
        // 等待一段时间后重试
        await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
      }
    }
  }
} 