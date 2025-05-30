// ==UserScript==
// @name         雨课堂自动答题助手
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  自动完成雨课堂考试系统中的题目，模拟人工操作，但是还是会存在漏选的情况（原因可能得更改成模拟鼠标点击）
// @author       XXX
// @match        https://*.yuketang.cn/exam*
// @match        https://*.yuketang.cn/pro/lms/exercise*
// @match        https://*.yuketang.cn/pro/exam*
// @grant        GM_xmlhttpRequest
// @grant        GM_openInTab
// ==/UserScript==

(function() {
    'use strict';

    // 在脚本开始时初始化日志系统
    window.unifiedWindow = createUnifiedWindow();
    const logger = createLogger();

    // 创建一个新的代理对象来处理控制台输出
    const consoleProxy = new Proxy(console, {
        get: function(target, property) {
            const original = target[property];
            if (typeof original === 'function') {
                return function(...args) {
                    // 调用原始方法
                    original.apply(target, args);
                    // 记录到我们的日志系统
                    if (logger && typeof logger.log === 'function') {
                        try {
                            logger.log(args.join(' '), property);
                        } catch (e) {
                            original.call(target, '日志记录失败:', e);
                        }
                    }
                };
            }
            return original;
        }
    });

    // 替换全局 console 对象
    window.console = consoleProxy;

    // 在初始化完成后自动切换到日志标签
    setTimeout(() => {
        const logTab = document.querySelector('button[textContent="运行日志"]');
        if (logTab) {
            logTab.click();
        }
    }, 100);

    // 随机延迟函数 (1-3秒)
    const randomDelay = () => Math.floor(Math.random() * 1000) ;

    // 等待元素出现的函数
    function waitForElement(selector, callback, maxWaitTime = 30000) {
        const startTime = Date.now();

        function checkElement() {
            const element = document.querySelector(selector);
            if (element) {
                callback(element);
                return;
            }

            if (Date.now() - startTime > maxWaitTime) {
                console.error(`等待元素 ${selector} 超时`);
                return;
            }

            setTimeout(checkElement, 500);
        }

        checkElement();
    }

    // 主函数：检测页面类型并执行相应操作
    function initialize() {
        console.log('雨课堂自动答题助手已启动');

        // 检测当前页面类型
        if (window.location.href.includes('/exam')) {
            console.log('检测到考试页面');
            handleExamPage();
        } else if (window.location.href.includes('/exercise')) {
            console.log('检测到练习页面');
            handleExercisePage();
        }
    }

    // 处理考试页面
    function handleExamPage() {
        // 修改选择器以匹配实际页面结构
        waitForElement('.exercise-item', () => {
            console.log('考试页面加载完成，准备自动答题');
            setTimeout(autoAnswerExam, randomDelay());
        });
    }

    // 自动答题 - 考试页面
    async function autoAnswerExam() {
        try {
            // 获取所有题目
            const questions = document.querySelectorAll('.exercise-item');
            console.log(`找到 ${questions.length} 道题目`);

            for (let i = 0; i < questions.length; i++) {
                const question = questions[i];
                await processQuestion(question);
                await new Promise(resolve => setTimeout(resolve, randomDelay()));
            }

            console.log('所有题目处理完成');

        } catch (error) {
            console.error('自动答题过程出错:', error);
        }
    }

    // 处理练习页面
    function handleExercisePage() {
        // 等待题目加载完成
        waitForElement('.question-item', () => {
            console.log('练习页面加载完成，准备自动答题');
            setTimeout(autoAnswerExercise, randomDelay());
        });
    }

    // 自动答题 - 练习页面
    async function autoAnswerExercise() {
        try {
            // 获取所有题目
            const questions = document.querySelectorAll('.question-item');
            console.log(`找到 ${questions.length} 道题目`);

            for (let i = 0; i < questions.length; i++) {
                const question = questions[i];
                await processQuestion(question);

                // 随机延迟，模拟人工操作
                await new Promise(resolve => setTimeout(resolve, randomDelay()));
            }

        } catch (error) {
            console.error('自动答题过程出错:', error);
        }
    }

    // 处理单个题目
    async function processQuestion(questionElement) {
        try {
            // 获取题目类型
            const questionType = getQuestionType(questionElement);
            console.log(`题目类型: ${questionType}`);

            // 添加延时，模拟阅读题目时间 (1-3秒)
            await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 ));

            // 如果是填空题或简答题，直接跳过
            if (questionType === '填空' || questionType === '简答'|| questionType === '判断') {
                console.log('跳过填空/简答/判断题');
                return;
            }

            // 获取题目文本
            const questionText = getQuestionText(questionElement);
            console.log(`题目内容: ${questionText.substring(0, 50)}...`);

            // 获取选项
            const options = getOptions(questionElement, questionType);

            // 查询答案
            const answer = await queryAnswer(questionText, options, questionType);

            // 添加延时，模拟思考时间 (1-3秒)
            await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 ));

            // 根据答案选择选项
            if (answer) {
                selectAnswer(questionElement, answer, options, questionType);
                // 添加延时，模拟选择答案后的确认时间 (1-2秒)
                await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 ));
            } else {
                console.log('未找到答案，跳过此题');
            }

        } catch (error) {
            console.error('处理题目时出错:', error);
        }
    }

    // 获取题目类型
    function getQuestionType(questionElement) {
        // 根据实际HTML结构修改选择器
        const typeElement = questionElement.querySelector('.item-type, .type');

        if (typeElement) {
            const typeText = typeElement.textContent.trim();
            if (typeText.includes('单选')) return '单选';
            if (typeText.includes('多选')) return '多选';
            if (typeText.includes('判断')) return '判断';
            if (typeText.includes('填空')) return '填空';
            if (typeText.includes('简答')) return '简答';
            return typeText;
        }

        // 如果找不到类型标识，尝试通过选项结构判断
        if (questionElement.querySelector('.el-radio')) return '单选';
        if (questionElement.querySelector('.el-checkbox')) return '多选';

        return '未知';
    }

    // 获取题目文本
    function getQuestionText(questionElement) {
        // 首先尝试获取题目文本
        const titleElement = questionElement.querySelector('.name');

        if (titleElement) {
            return titleElement.textContent.trim();
        }

        // 如果找不到.name，尝试其他可能的选择器
        const alternativeTitleElement = questionElement.querySelector('.item-body h4.exam-font, .title h4');

        if (alternativeTitleElement) {
            return alternativeTitleElement.textContent.trim();
        }

        return '';
    }

    // 获取选项
    function getOptions(questionElement, questionType) {
        const options = [];
        // 修改选择器以匹配实际的选项元素
        const optionElements = questionElement.querySelectorAll('.el-radio, .el-checkbox');

        optionElements.forEach((element, index) => {
            // 获取选项文本，去除前面的选项字母和分隔符
            const text = element.textContent.trim().replace(/^[A-D][.、\s]?\s*/, '');
            // 生成选项字母（A、B、C、D）
            const optionLetter = String.fromCharCode(65 + index).trim();

            options.push({
                element: element,
                text: text,
                value: optionLetter
            });
        });

        return options;
    }

    // 查询答案函数
    async function queryAnswer(questionText, options, questionType) {
        try {
            console.log('开始查询答案...');

            // 标准化处理选项数据，确保格式正确
            const formattedOptions = options.map(opt => ({
                value: opt.value.trim(),  // 确保值被正确清理,
                text: opt.text.trim()  // 确保文本被正确清理
            }));

            // 清理题目文本中的特殊字符
            const cleanTitle = questionText.trim()
                .replace(/\s+/g, ' ')  // 将多个空格替换为单个空格
                .replace(/\xa0/g, ' '); // 替换特殊空格字符

            // 构建查询参数
            const queryParams = {
                title: cleanTitle,
                options: JSON.stringify(formattedOptions),
                type: questionType.trim()
            };

            // 构建URL
            const url = new URL('http://127.0.0.1:5000/api/query');
            Object.keys(queryParams).forEach(key => {
                url.searchParams.append(key, queryParams[key]);
            });

            // 使用 GM_xmlhttpRequest 发送请求
            return new Promise((resolve, reject) => {
                GM_xmlhttpRequest({
                    method: 'GET',
                    url: url.toString(),
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    onload: function(response) {
                        try {
                            if (response.status === 200) {
                                const responseData = JSON.parse(response.responseText);
                                if (responseData.success && responseData.data.code === 1) {
                                    console.log('获取到答案:', responseData.data.data);
                                    resolve(responseData.data.data.trim());
                                } else {
                                    console.warn('未找到答案');
                                    resolve(null);
                                }
                            } else {
                                console.warn('答案查询失败，状态码:', response.status);
                                resolve(null);
                            }
                        } catch (error) {
                            console.error('解析答案数据失败:', error);
                            resolve(null);
                        }
                    },
                    onerror: function(error) {
                        console.error('答案查询请求失败:', error);
                        resolve(null);
                    }
                });
            });
        } catch (error) {
            console.error('查询答案时出错:', error);
            return null;
        }
    }

    // 根据答案选择选项
    async function selectAnswer(questionElement, answer, options, questionType) {
        console.log(`选择答案: ${answer}`);

        if (questionType === '单选') {
            // 处理单选题
            const radioInputs = questionElement.querySelectorAll('input[type="radio"]');

            for (let i = 0; i < options.length; i++) {
                if (options[i].text.includes(answer) || options[i].value === answer) {
                    if (radioInputs[i]) {
                        radioInputs[i].click();
                        console.log(`已选择选项: ${options[i].text}`);
                    }
                    break;
                }
            }
        } else if (questionType === '多选') {
            // 处理多选题
            const checkboxInputs = questionElement.querySelectorAll('input[type="checkbox"]');

            // 处理多选题答案(使用###分隔的字符串)
            const answers = answer.split('###').map(a => a.trim());

            // 遍历每个选项
            for (let i = 0; i < options.length; i++) {
                const option = options[i];
                const checkbox = checkboxInputs[i];

                // 检查答案是否匹配当前选项
                if (answers.some(ans => option.text.includes(ans)) || answers.includes(option.value)) {
                    if (checkbox) {
                        // 直接点击checkbox输入元素
                        checkbox.click();
                        console.log(`已选择多选项: ${option.text}`);

                        // 添加短暂延迟，确保点击事件被正确处理
                        await new Promise(resolve => setTimeout(resolve, 200));
                    }
                }
            }
        } else if (questionType === '判断') {
            // 处理判断题
            const radioLabels = questionElement.querySelectorAll('.el-radio');

            if (answer.includes('正确') || answer.includes('对') || answer === 'T' || answer === 'true') {
                if (radioLabels[0]) {
                    radioLabels[0].click();
                    console.log('已选择: 正确');
                }
            } else if (answer.includes('错误') || answer.includes('错') || answer === 'F' || answer === 'false') {
                if (radioLabels[1]) {
                    radioLabels[1].click();
                    console.log('已选择: 错误');
                }
            }
        } else {
            // 处理其他类型的题目
            console.warn(`不支持的题目类型: ${questionType}`);
        }
    }

    // 创建日志记录器
    function createLogger() {
        if (!window.unifiedWindow) {
            window.unifiedWindow = createUnifiedWindow();
        }
        const { logContent } = window.unifiedWindow;

        logContent.style.cssText = `
            display: none;
            max-height: 350px;
            overflow-y: auto;
            font-family: monospace;
            background: rgba(0, 0, 0, 0.8);
            border-radius: 8px;
            padding: 15px;
            color: #fff;
        `;

        // 添加清空按钮
        const clearButton = document.createElement('button');
        clearButton.textContent = '清空日志';
        clearButton.style.cssText = `
            background: none;
            border: 1px solid rgba(255,255,255,0.3);
            color: #fff;
            padding: 5px 10px;
            border-radius: 4px;
            cursor: pointer;
            margin-bottom: 10px;
        `;
        clearButton.onclick = () => {
            logContent.innerHTML = '';
            logContent.appendChild(clearButton);
        };
        logContent.appendChild(clearButton);

        return {
            log: (message, type = 'info') => {
                const time = new Date().toLocaleTimeString();
                const colors = {
                    info: '#8cc',
                    success: '#8c8',
                    error: '#c88',
                    warn: '#cc8'
                };
                const line = document.createElement('div');
                line.style.cssText = `
                    margin: 5px 0;
                    color: ${colors[type]};
                    word-break: break-all;
                `;
                line.innerHTML = `[${time}] ${message}`;
                logContent.appendChild(line);
                logContent.scrollTop = logContent.scrollHeight;
            }
        };
    }

    // 创建统一窗口
    function createUnifiedWindow() {
        const container = document.createElement('div');
        container.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            width: 300px;
            max-height: 80vh;
            background: white;
            border: 1px solid #eee;
            border-radius: 12px;
            padding: 20px;
            z-index: 9999;
            overflow-y: auto;
            box-shadow: 0 8px 24px rgba(0,0,0,0.12);
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial;
            transition: all 0.3s ease;
            backdrop-filter: blur(10px);
            background: rgba(255, 255, 255, 0.95);
        `;

        // 创建标题栏
        const header = document.createElement('div');
        header.style.cssText = `
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
            padding-bottom: 10px;
            border-bottom: 1px solid #eee;
        `;

        // 创建标签切换按钮
        const tabs = document.createElement('div');
        tabs.style.cssText = `
            display: flex;
            gap: 10px;
        `;
        const statusTab = document.createElement('button');
        const logTab = document.createElement('button');

        const tabStyle = `
            padding: 6px 12px;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            transition: all 0.3s;
        `;
        logTab.textContent = '运行日志';
        statusTab.textContent = '状态信息';
        statusTab.style.cssText = tabStyle;
        logTab.style.cssText = tabStyle;

        tabs.appendChild(logTab);
        tabs.appendChild(statusTab);
        header.appendChild(tabs);

        // 创建关闭按钮
        const closeButton = document.createElement('button');
        closeButton.innerHTML = '×';
        closeButton.style.cssText = `
            background: none;
            border: none;
            font-size: 20px;
            cursor: pointer;
            color: #999;
            padding: 0 5px;
            &:hover { color: #666; }
        `;
        closeButton.onclick = () => container.remove();
        header.appendChild(closeButton);

        container.appendChild(header);

        // 创建内容区域
        const statusContent = document.createElement('div');
        const logContent = document.createElement('div');

        statusContent.style.cssText = `
            display: block;
        `;

        logContent.style.cssText = `
            display: none;
        `;

        container.appendChild(statusContent);
        container.appendChild(logContent);

        // 添加标签切换功能
        statusTab.onclick = () => {
            statusContent.style.display = 'block';
            logContent.style.display = 'none';
            statusTab.style.background = '#e6f7ff';
            statusTab.style.color = '#1890ff';
            logTab.style.background = 'transparent';
            logTab.style.color = 'inherit';
        };

        logTab.onclick = () => {
            statusContent.style.display = 'none';
            logContent.style.display = 'block';
            logTab.style.background = '#e6f7ff';
            logTab.style.color = '#1890ff';
            statusTab.style.background = 'transparent';
            statusTab.style.color = 'inherit';
        };

        // 初始状态
        statusTab.click();

        // 添加到页面
        document.body.appendChild(container);

        return {
            container,
            statusContent,
            logContent,
            statusTab,
            logTab
        };
    }

    // 启动脚本
    setTimeout(initialize, 1000);
})();
