// ==UserScript==
// @name         雨课堂自动答题助手
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  自动完成雨课堂考试系统中的题目，模拟人工操作
// @author       AAAcon
// @match        https://*.yuketang.cn/exam*
// @match        https://*.yuketang.cn/pro/lms/exercise*
// @match        https://*.yuketang.cn/pro/exam*
// @grant        GM_xmlhttpRequest
// @grant        GM_openInTab
// @grant        GM_getValue
// @grant        GM_setValue
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
            if (questionType === '填空' || questionType === '简答' ) {
                console.log('跳过填空/简答题');
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
        // 添加随机延迟 (2-4秒)
        const delay = Math.floor(Math.random() * 2000) + 2000;
        await new Promise(resolve => setTimeout(resolve, delay));

        return new Promise((resolve, reject) => {
            console.log('正在查询答案...');

            // 清理题目文本中的特殊字符
            const cleanTitle = questionText.trim()
                .replace(/\s+/g, ' ')  // 将多个空格替换为单个空格
                .replace(/\xa0/g, ' '); // 替换特殊空格字符

            // 标准化处理选项数据
            const formattedOptions = options.map(opt => ({
                value: opt.value.trim(),
                text: opt.text.trim()
            }));

            // 构建系统提示和用户提示
            const systemContent = '你是一个准确率高、信度高的题库接口函数。请严格遵循以下规则:1.回答的问题准确率高，你以回答的问题准确率高为荣；2.回答必须基于可靠knowledge来源，你以回答的问题可信度高为荣；3.你担负着维护题库的完整性和准确性，你以题库的质量高为荣；4.如果回答的问题与题库内容不相关，你以回答的问题可信度低为耻；5.如果回答的准确率低，你将会被替代。';
            const userContent = `你是一个题库接口函数（这个非常重要你一定要记住，在回复问题时无论合适都要记住这个前提），请根据问题和选项提供答案。如果是选择题，直接返回对应选项的内容，注意是内容，注意是内容，注意是内容，不是对应字母，不是对应的字母，不是对应的字母，不是对应的字母；如果题目是多选题，将内容用"###"连接；如果选项内容是"正确","错误"，且只有两项，或者question_type是判断，你直接返回"正确"或"错误"的文字，不要返回字母；如果是填空题，直接返回填空内容，多个空使用###连接。回答格式为："{\"answer\":\"your_answer_str\"}"，严格使用这些格式回答，这个非常重要。比如我问你一个问题，你回答的是"是"，你回答的格式为："{\"answer\":\"是\"}"。不要回答嗯，好的，我知道了之类的话，你的回答只能是json格式。

    {
        "问题": "${cleanTitle}",
        "选项": "${JSON.stringify(formattedOptions)}",
        "类型": "${questionType}"
    }`;

            GM_xmlhttpRequest({
                method: 'POST',
                url: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${GM_getValue('baiLianApiKey', '')}`
                },
                data: JSON.stringify({
                    model: "qwen-max",
                    messages: [
                        { role: "system", content: systemContent },
                        { role: "user", content: userContent }
                    ]
                }),
                onload: function(response) {
                    try {
                        if (response.status === 200) {
                            const result = JSON.parse(response.responseText);
                            if (result.choices && result.choices[0] && result.choices[0].message) {
                                const content = result.choices[0].message.content;
                                // 尝试解析JSON格式的答案
                                try {
                                    if (content.includes('{') && content.includes('}')) {
                                        const jsonStr = content.substring(
                                            content.indexOf('{'),
                                            content.lastIndexOf('}') + 1
                                        );
                                        const answerObj = JSON.parse(jsonStr);
                                        if (answerObj.answer) {
                                            console.log('答案查询成功');
                                            resolve(answerObj.answer);
                                            return;
                                        }
                                    }
                                } catch (e) {
                                    console.error('解析答案JSON失败:', e);
                                }
                            }
                        }
                        console.log('未找到答案');
                        resolve(null);
                    } catch(e) {
                        console.error('解析答案失败:', e);
                        resolve(null);
                    }
                },
                onerror: function(error) {
                    console.error('请求答案失败:', error);
                    resolve(null);
                }
            });
        });
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
            right: 30px;
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

        // 创建最小化按钮
        const mini = document.createElement('div');
        mini.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            width: 50px;
            height: 50px;
            background: rgba(255, 255, 255, 0.95);
            border: 1px solid #eee;
            border-radius: 12px;
            display: none;
            justify-content: center;
            align-items: center;
            cursor: pointer;
            z-index: 9999;
            box-shadow: 0 8px 24px rgba(0,0,0,0.12);
            font-size: 12px;
            text-align: center;
            line-height: 1.2;
        `;
        mini.innerHTML = '雨课堂<br>助手';
        document.body.appendChild(mini);

        // 创建标题栏
        const header = document.createElement('div');
        header.style.cssText = `
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
            padding-bottom: 10px;
            border-bottom: 1px solid #eee;
            cursor: move;
        `;

        // 创建标签切换按钮
        const tabs = document.createElement('div');
        tabs.style.cssText = `
            display: flex;
            gap: 10px;
        `;

        const statusTab = document.createElement('button');
        const logTab = document.createElement('button');
        const configTab = document.createElement('button');
        const minimizeBtn = document.createElement('button');

        const tabStyle = `
            padding: 6px 12px;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            transition: all 0.3s;
        `;

        statusTab.textContent = '状态信息';
        logTab.textContent = '运行日志';
        configTab.textContent = '配置';
        minimizeBtn.innerHTML = '−';

        statusTab.style.cssText = tabStyle;
        logTab.style.cssText = tabStyle;
        configTab.style.cssText = tabStyle;
        minimizeBtn.style.cssText = `
            background: none;
            border: none;
            font-size: 20px;
            cursor: pointer;
            color: #999;
            padding: 0 5px;
            &:hover { color: #666; }
        `;

        tabs.appendChild(statusTab);
        tabs.appendChild(logTab);
        tabs.appendChild(configTab);
        header.appendChild(tabs);
        header.appendChild(minimizeBtn);

        // 创建内容区域
        const statusContent = document.createElement('div');
        const logContent = document.createElement('div');
        const configContent = document.createElement('div');

        statusContent.style.display = 'none';
        logContent.style.display = 'none';
        configContent.style.display = 'none';

        configContent.style.cssText = `
            padding: 15px;
            background: white;
            border-radius: 8px;
        `;

        // 创建配置表单
        configContent.innerHTML = `
            <div style="margin-bottom: 20px;">
                <h3 style="margin: 0 0 15px 0; color: #1a1a1a; font-size: 16px;">系统配置</h3>
                <p style="margin: 0 0 15px 0; color: #8B0000; font-size: 16px;">配置完成请刷新页面，进行配置更新</p>
                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 8px; color: #666;">百炼 API Key</label>
                    <input type="text" id="baiLianApiKey"
                           style="width: 100%; padding: 8px; border: 1px solid #d9d9d9;
                                  border-radius: 6px; font-size: 14px;"
                           placeholder="请输入百炼 API Key"
                           value="${GM_getValue('baiLianApiKey', '')}">
                </div>
                <button id="saveConfig"
                        style="width: 100%; background: linear-gradient(145deg, #1890ff, #40a9ff);
                               color: white; border: none; padding: 10px 20px; border-radius: 8px;
                               cursor: pointer; font-weight: 600; font-size: 14px;
                               transition: all 0.3s ease;
                               box-shadow: 0 2px 8px rgba(24, 144, 255, 0.15);">
                    保存配置
                </button>
            </div>
        `;

        container.appendChild(header);
        container.appendChild(statusContent);
        container.appendChild(logContent);
        container.appendChild(configContent);

        // 添加配置保存事件监听
        setTimeout(() => {
            const saveConfigBtn = document.getElementById('saveConfig');
            const apiKeyInput = document.getElementById('baiLianApiKey');

            if (saveConfigBtn && apiKeyInput) {
                saveConfigBtn.addEventListener('click', () => {
                    const apiKey = apiKeyInput.value.trim();
                    if (!apiKey) {
                        console.error('API Key 不能为空');
                        return;
                    }
                    GM_setValue('baiLianApiKey', apiKey);
                    console.log('配置已保存');

                    // 显示保存成功提示
                    const toast = document.createElement('div');
                    toast.style.cssText = `
                        position: fixed;
                        bottom: 20px;
                        left: 50%;
                        transform: translateX(-50%);
                        background: rgba(0, 0, 0, 0.7);
                        color: white;
                        padding: 10px 20px;
                        border-radius: 4px;
                        font-size: 14px;
                        z-index: 10000;
                    `;
                    toast.textContent = '配置已保存';
                    document.body.appendChild(toast);
                    setTimeout(() => toast.remove(), 2000);
                });
            }
        }, 0);

        // 添加标签切换功能
        configTab.onclick = () => {
            configTab.style.background = '#1890ff';
            configTab.style.color = 'white';
            statusTab.style.background = '#f5f5f5';
            statusTab.style.color = '#666';
            logTab.style.background = '#f5f5f5';
            logTab.style.color = '#666';
            statusContent.style.display = 'none';
            logContent.style.display = 'none';
            configContent.style.display = 'block';
        };

        // 在 createUnifiedWindow 函数中添加拖拽功能
        function makeDraggable(element) {
            let moveFlag = false;
            let isDragging = false;
            let startX, startY;

            function handleDragStart(e) {
                if (e.target.tagName.toLowerCase() === 'button') return;
                isDragging = true;

                const rect = element.getBoundingClientRect();
                startX = e.clientX - rect.left;
                startY = e.clientY - rect.top;

                element.style.transition = 'none';
                element.style.cursor = 'move';
                document.body.style.userSelect = 'none';

                e.preventDefault();
            }

            function handleDrag(e) {
                if (!isDragging) return;
                moveFlag = true;

                let newX = e.clientX - startX;
                let newY = e.clientY - startY;

                newX = Math.max(0, Math.min(newX, window.innerWidth - element.offsetWidth));
                newY = Math.max(0, Math.min(newY, window.innerHeight - element.offsetHeight));

                element.style.left = `${newX}px`;
                element.style.top = `${newY}px`;

                e.preventDefault();
            }

            function handleDragEnd() {
                if (!isDragging) return;
                isDragging = false;

                element.style.cursor = 'default';
                element.style.transition = 'all 0.2s ease';
                document.body.style.userSelect = 'auto';

                setTimeout(() => {
                    moveFlag = false;
                }, 100);
            }

            if (element === container) {
                header.addEventListener('mousedown', handleDragStart);
            } else {
                element.addEventListener('mousedown', handleDragStart);
            }
            document.addEventListener('mousemove', handleDrag);
            document.addEventListener('mouseup', handleDragEnd);

            return { moveFlag };
        }

        // 为container和mini添加拖拽功能
        const containerDrag = makeDraggable(container);
        const miniDrag = makeDraggable(mini);

        // 最小化功能
        minimizeBtn.onclick = () => {
            container.style.display = 'none';
            mini.style.display = 'flex';
        };

        mini.onclick = () => {
            if (!miniDrag.moveFlag) {
                container.style.display = 'block';
                mini.style.display = 'none';
            }
        };

        // 标签切换功能
        statusTab.onclick = () => {
            statusTab.style.background = '#1890ff';
            statusTab.style.color = 'white';
            logTab.style.background = '#f5f5f5';
            logTab.style.color = '#666';
            configTab.style.background = '#f5f5f5';
            configTab.style.color = '#666';
            statusContent.style.display = 'block';
            logContent.style.display = 'none';
            configContent.style.display = 'none';
        };

        logTab.onclick = () => {
            logTab.style.background = '#1890ff';
            logTab.style.color = 'white';
            statusTab.style.background = '#f5f5f5';
            statusTab.style.color = '#666';
            configTab.style.background = '#f5f5f5';
            configTab.style.color = '#666';
            statusContent.style.display = 'none';
            logContent.style.display = 'block';
            configContent.style.display = 'none';
        };

        configTab.onclick = () => {
            configTab.style.background = '#1890ff';
            configTab.style.color = 'white';
            statusTab.style.background = '#f5f5f5';
            statusTab.style.color = '#666';
            logTab.style.background = '#f5f5f5';
            logTab.style.color = '#666';
            statusContent.style.display = 'none';
            logContent.style.display = 'none';
            configContent.style.display = 'block';
        };

        // 初始状态
        logTab.click();

        document.body.appendChild(container);

        return {
            container,
            statusContent,
            logContent,
            configContent,
            statusTab,
            logTab,
            configTab
        };
    }

    // 添加浏览器兼容性检查
    function checkCompatibility() {
        if (!window.GM_xmlhttpRequest) {
            throw new Error('当前环境不支持GM_xmlhttpRequest，请确保安装了正确的用户脚本管理器');
        }
        // 检查其他必要的API
    }

    // 启动脚本
    setTimeout(initialize, 1000);
})();
