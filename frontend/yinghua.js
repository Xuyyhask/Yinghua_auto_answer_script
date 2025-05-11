// ==UserScript==
// @name         自动答题PRO
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  自动答题
// @author       XXX
// @match        https://mooc.kmcc.edu.cn/user/work*
// @match        https://mooc.kmcc.edu.cn/user/work/doWork*
// @match        https://mooc.kmcc.edu.cn/user/work/submit*
// @match        https://mooc.kmcc.edu.cn/user/node*
// @match        https://kmcc.zjxkeji.com/user/work*
// @match        https://kmcc.zjxkeji.com/user/node*
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

    // 自动寻找测试章节的脚本
    // 修改 findTestSections 函数为异步函数
    async function findTestSections() {
        const chapterGroups = document.querySelectorAll('.detmain-navlist .group');
        const testSections = [];
        const promises = [];

        chapterGroups.forEach(group => {
            const chapterName = group.querySelector('.name a')?.getAttribute('title') || '';
            const items = group.querySelectorAll('.list .item a');

            let homeworkItem = Array.from(items).find(item => item.textContent.includes('章节作业'));
            if (!homeworkItem) {
                homeworkItem = Array.from(items).find(item => item.textContent.includes('章'));
                if (!homeworkItem) return;
            }

            // 将每个 fetch 操作添加到 promises 数组中
            promises.push(
                fetch(homeworkItem.href)
                    .then(response => response.text())
                    .then(html => {
                        const parser = new DOMParser();
                        const doc = parser.parseFromString(html, 'text/html');

                        const startButton = doc.querySelector('.detmain-stard a[target="_blank"]');
                        if (!startButton || !startButton.textContent.includes('开始做题')) return null;

                        return {
                            chapter: chapterName,
                            title: (doc.querySelector('.detmain-title')?.textContent || '').replace('作业标题：', '').trim(),
                            startTime: (doc.querySelector('.detmain-notes .item:nth-child(1)')?.textContent || '').replace('开始时间：', '').trim(),
                            endTime: (doc.querySelector('.detmain-notes .item:nth-child(2)')?.textContent || '').replace('结束时间：', '').trim(),
                            totalScore: (doc.querySelector('.good')?.textContent || '').replace('总分：', '').replace('分', '').trim(),
                            attempts: doc.querySelector('.detmain-dest .item span')?.textContent || '',
                            startUrl: startButton.href
                        };
                    })
                    .catch(error => {
                        console.error('获取章节信息失败:', error);
                        return null;
                    })
            );
        });

        // 等待所有 fetch 操作完成
        const results = await Promise.all(promises);
        results.forEach(result => {
            if (result) testSections.push(result);
        });

        // 更新显示
        displayTestInfo(testSections);
        return testSections;
    }

    // 修改 findAndShowTests 函数为异步函数
    async function findAndShowTests() {
        const tests = await findTestSections();
        console.log('找到的测试章节:', tests);
        return tests;
    }

    // 修改自动执行部分
    setTimeout(async () => {
        try {
            const tests = await findTestSections();
            console.log('找到的测试章节:', tests);
            if (tests && tests.length > 0) {
                console.log('自动开始完成所有作业');
                await startAutoComplete(tests);
            }
        } catch (error) {
            console.error('执行自动答题时出错:', error);
        }
    }, 1000);

    
    // 修改 createLogger 函数
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
        
        const testTab = document.createElement('button');
        const logTab = document.createElement('button');
        
        const tabStyle = `
            padding: 6px 12px;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            transition: all 0.3s;
        `;
        
        testTab.textContent = '测试章节';
        logTab.textContent = '运行日志';
        testTab.style.cssText = tabStyle;
        logTab.style.cssText = tabStyle;
        
        tabs.appendChild(testTab);
        tabs.appendChild(logTab);
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
        const testInfoContent = document.createElement('div');
        const logContent = document.createElement('div');
        
        testInfoContent.style.display = 'block';
        logContent.style.display = 'none';
        
        container.appendChild(testInfoContent);
        container.appendChild(logContent);
        
        // 标签切换功能
        testTab.onclick = () => {
            testTab.style.background = '#1890ff';
            testTab.style.color = 'white';
            logTab.style.background = '#f5f5f5';
            logTab.style.color = '#666';
            testInfoContent.style.display = 'block';
            logContent.style.display = 'none';
        };
        
        logTab.onclick = () => {
            logTab.style.background = '#1890ff';
            logTab.style.color = 'white';
            testTab.style.background = '#f5f5f5';
            testTab.style.color = '#666';
            testInfoContent.style.display = 'none';
            logContent.style.display = 'block';
        };
        
        // 初始状态
        testTab.click();
        
        document.body.appendChild(container);
        
        return {
            container,
            testInfoContent,
            logContent
        };
    }

    // 修改 displayTestInfo 函数
    function displayTestInfo(tests) {
        const { testInfoContent } = window.unifiedWindow || createUnifiedWindow();
        
        if (tests.length === 0) {
            testInfoContent.innerHTML = '<p style="color: #ff4d4f; font-size: 14px; text-align: center;">未找到可用的测试章节</p>';
            return;
        }
        
        let html = '<h3 style="margin: 0 0 15px 0; color: #1a1a1a; font-size: 16px;">找到的测试章节：</h3>';
        html += `
            <div style="margin-bottom: 20px;">
                <button id="autoStartAllTests" style="
                    width: 100%;
                    background: linear-gradient(145deg, #1890ff, #40a9ff);
                    color: white;
                    border: none;
                    padding: 10px 20px;
                    border-radius: 8px;
                    cursor: pointer;
                    font-weight: 600;
                    font-size: 14px;
                    transition: all 0.3s ease;
                    box-shadow: 0 2px 8px rgba(24, 144, 255, 0.15);">
                    自动开始所有作业
                </button>
            </div>
        `;

        tests.forEach((test, index) => {
            html += `
                <div style="
                    margin-bottom: 15px;
                    padding: 15px;
                    border: 1px solid #f0f0f0;
                    border-radius: 10px;
                    background: #fff;
                    transition: all 0.3s ease;
                    cursor: pointer;
                    position: relative;
                    overflow: hidden;
                    &:hover {
                        transform: translateY(-2px);
                        box-shadow: 0 4px 12px rgba(0,0,0,0.08);
                        border-color: #e6f7ff;
                    }">
                    <div style="font-weight: 600; font-size: 15px; color: #262626; margin-bottom: 8px;">
                        ${index + 1}. ${test.chapter}
                    </div>
                    <div style="font-weight: 500; margin: 8px 0; color: #1890ff;">
                        ${test.title}
                    </div>
                    <div style="font-size: 13px; color: #595959; margin: 12px 0;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
                            <span>开始时间: ${test.startTime}</span>
                            <span>结束时间: ${test.endTime}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between;">
                            <span>总分: ${test.totalScore}分</span>
                            <span>剩余次数: ${test.attempts}次</span>
                        </div>
                    </div>
                    <a href="${test.startUrl}" target="_blank" style="
                        display: block;
                        width: 100%;
                        padding: 8px 0;
                        background: #f5f5f5;
                        color: #262626;
                        text-decoration: none;
                        border-radius: 6px;
                        font-size: 13px;
                        text-align: center;
                        transition: all 0.3s ease;
                        margin-top: 10px;
                        &:hover {
                            background: #e6f7ff;
                            color: #1890ff;
                        }">
                        开始做题
                    </a>
                </div>
            `;
        });

        // 添加关闭按钮
        html += `
            <button onclick="this.parentElement.remove()"
                    style="position: absolute; top: 12px; right: 12px;
                           background: none; border: none; cursor: pointer;
                           width: 24px; height: 24px; display: flex;
                           align-items: center; justify-content: center;
                           font-size: 18px; color: #999;
                           border-radius: 50%;
                           transition: all 0.3s ease;
                           &:hover {
                               background: #f5f5f5;
                               color: #666;
                           }">
                ×
            </button>
        `;

        testInfoContent.innerHTML = html;

        // 使用 setTimeout 确保 DOM 完全更新后再绑定事件
        setTimeout(() => {
            const autoStartButton = document.getElementById('autoStartAllTests');
            if (autoStartButton) {
                autoStartButton.addEventListener('click', () => {
                    console.log('点击了：autoStartAllTests');
                    console.log('开始自动完成所有作业，共', tests.length, '个章节');
                    startAutoComplete(tests);
                });
                console.log('事件监听器已成功绑定');
            } else {
                console.error('未找到自动开始按钮');
            }
        }, 0);
    }

    // 等待页面加载完成
    function waitForElement(selector, callback) {
        if (document.querySelector(selector)) {
            callback();
        } else {
            setTimeout(() => waitForElement(selector, callback), 500);
        }
    }

    // 随机延迟函数 (1-3秒)
    const randomDelay = () => Math.floor(Math.random() * 2000) + 1000;

    // 自动答题主函数
    async function autoAnswer() {
        try {
            // 检查弹窗
            const confirmBtn = document.querySelector('.layui-layer-btn0');
            if (confirmBtn) {
                console.log('检测到弹窗，点击确认按钮');
                confirmBtn.click();

                // 等待随机延迟
                await new Promise(resolve => setTimeout(resolve, randomDelay()));

                // 处理可能的后续弹窗
                for (let i = 0; i < 2; i++) {
                    const nextConfirmBtn = document.querySelector('.layui-layer-btn0');
                    if (nextConfirmBtn) {
                        console.log('检测到弹窗，点击确认按钮');
                        nextConfirmBtn.click();
                        await new Promise(resolve => setTimeout(resolve, randomDelay()));
                    }
                }

                // 检查完成按钮
                const completeBtn = document.querySelector('.complete');
                if (completeBtn && completeBtn.style.display !== 'none') {
                    console.log('点击完成作业按钮');
                    completeBtn.click();

                    // 等待最后的确认弹窗
                    await new Promise(resolve => setTimeout(resolve, randomDelay()));
                    const finalConfirmBtn = document.querySelector('.layui-layer-btn0');
                    if (finalConfirmBtn) {
                        console.log('检测到弹窗，点击确认按钮');
                        finalConfirmBtn.click();
                    }
                } else {
                    await continueAnswer();
                }
                return;
            }
            // 如果没有弹窗，继续答题流程
            await continueAnswer();
        } catch (error) {
            console.error('自动答题过程出错:', error);
        }
    }

    // 答题逻辑函数
    async function continueAnswer() {
        // 获取当前显示的题目
        const currentQuestion = document.querySelector('.topic-item[style=""]') || document.querySelector('.topic-item:not([style*="none"])');

        if (!currentQuestion) {
            const completeBtn = document.querySelector('.complete');
            if (completeBtn && completeBtn.style.display !== 'none') {
                console.log('所有题目已完成，点击完成按钮');
                setTimeout(() => completeBtn.click(), randomDelay());
            }
            return;
        }

        // 获取题目信息
        const questionType = currentQuestion.querySelector('.type').textContent.trim();
        const questionText = currentQuestion.querySelector('.name').textContent.trim();

        // 获取所有选项
        const options = currentQuestion.querySelectorAll('.exam-inp');
        if (!options.length) return;

        // 构建选项数组
        const optionsArray = Array.from(options).map(option => {
            const text = option.parentElement.querySelector('.txt').textContent.trim();
            return {
                value: option.value,
                text: text
            };
        });

        // 查询答案
        const an = await queryAnswer(questionText, optionsArray, questionType);
        let answer = an.trim();
        if(answer==='对'){
            answer='正确';
        }

        if (answer) {
            console.log('获取到答案:', answer);

            // 根据答案类型选择
            if (questionType === '单选' || questionType === '判断') {
                let answerSlect = false;

                // 查找匹配的选项并点击
                for (let option of options) {
                    const optionText = option.parentElement.querySelector('.txt').textContent.trim();
                    if (optionText.includes(answer)) {
                        option.click();
                        answerSlect = true;
                        console.log(`${questionType}已选择:`, optionText);
                        break;
                    }
                }

                // 如果没有找到答案,使用随机选择
                if(!answerSlect){
                    console.log('未找到答案,使用随机答案');
                    const randomIndex = Math.floor(Math.random() * options.length);
                    options[randomIndex].click();
                    console.log(`${questionType}已随机选择: ${options[randomIndex].value}`);
                }
            } else if (questionType === '多选') {
                let answerSlect = false;

                // 处理多选题答案(使用###分隔的字符串)
                const answers = answer.split('###').map(a => a.trim());
                for (let option of options) {
                    const optionText = option.parentElement.querySelector('.txt').textContent.trim();
                    if (answers.some(ans => optionText.includes(ans))) {
                        option.click();
                        answerSlect = true;
                        console.log('多选已选择:', optionText);
                    }
                }
                // 如果没有找到答案,使用随机选择
                if(!answerSlect){
                    console.log('未找到答案,使用随机答案');
                    const selectedCount = Math.floor(Math.random() * 3) + 1;
                    const shuffled = Array.from(options).sort(() => 0.5 - Math.random());
                    for (let i = 0; i < selectedCount; i++) {
                        shuffled[i].click();
                        console.log(`多选已随机选择: ${shuffled[i].value}`);
                    }
                }
            }
        } else {
            console.log('未找到答案,使用随机答案');

            // 如果没有找到答案,使用随机选择
            if (questionType === '单选' || questionType === '判断') {
                const randomIndex = Math.floor(Math.random() * options.length);
                options[randomIndex].click();
                console.log(`${questionType}已随机选择: ${options[randomIndex].value}`);
            } else if (questionType === '多选') {
                const selectedCount = Math.floor(Math.random() * 3) + 1;
                const shuffled = Array.from(options).sort(() => 0.5 - Math.random());
                for (let i = 0; i < selectedCount; i++) {
                    shuffled[i].click();
                    console.log(`多选已随机选择: ${shuffled[i].value}`);
                }
            }
        }

        // 提交按钮
        const submitBtn = currentQuestion.querySelector('.next_exam');
        if (submitBtn) {
            setTimeout(() => {
                submitBtn.click();
                console.log('已提交答案');

                // 继续下一题
                setTimeout(autoAnswer, randomDelay());
            }, randomDelay());
        }
    }

    // 查询答案函数
    async function queryAnswer(question, options, type) {
        // 添加随机延迟 (2-4秒)
        const delay = Math.floor(Math.random() * 2000) + 2000;
        await new Promise(resolve => setTimeout(resolve, delay));

        return new Promise((resolve, reject) => {
            console.log('正在查询答案...');
            GM_xmlhttpRequest({
                method: 'GET',
                url: `（这个得需要自己配置，后续我会上传到仓库里面的,目前只是一个主要的油猴脚本，如果你懂一些ocs或者ze的题库配置也可替换这个url）?title=${encodeURIComponent(question)}&options=${encodeURIComponent(JSON.stringify(options))}&type=${encodeURIComponent(type)}`,
                onload: function(response) {
                    try {
                        const result = JSON.parse(response.responseText);
                        if (result.code === 0) {
                            console.log('未找到答案');
                            resolve(null);
                        } else {
                            console.log('答案查询成功');
                            resolve(result.data.data);
                        }
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

    // 修改自动开始所有作业函数
    async function startAutoComplete(tests) {
        if (!tests || tests.length === 0) {
            console.log('没有找到可用的测试');
            return;
        }

        console.log('开始自动完成所有作业，共', tests.length, '个章节');

        for (let i = 0; i < tests.length; i++) {
            const test = tests[i];
            console.log(`开始完成第 ${i + 1} 个作业: ${test.title}`);

            // 使用 GM_openInTab 打开新标签页
            GM_openInTab(test.startUrl, { active: true, insert: true, setParent: true });

            // 等待一定时间后继续下一个作业
            await new Promise(resolve => setTimeout(resolve, 50000));
        }
    }

    // 添加新的自动答题初始化函数
    function initAutoAnswer() {

        // 检查当前页面是否是答题页面
        if (window.location.href.includes('/user/work')) {
            console.log('检测到答题页面，准备开始自动答题');

            // 处理开始答题页面
            async function handleStartPage() {
                // 使用更精确的选择器
                await waitForElement('#startArea #start-btn.start-work', () => {
                    console.log('找到开始答题按钮');
                    const startBtn = document.querySelector('#startArea #start-btn.start-work');
                    if (startBtn) {
                        startBtn.click();
                        console.log('点击开始答题按钮');
                    }
                });

                // 等待确认弹窗出现
                await waitForElement('.layui-layer-btn0', () => {
                    console.log('找到确认弹窗');
                    const confirmBtn = document.querySelector('.layui-layer-btn0');
                    if (confirmBtn) {
                        setTimeout(() => {
                            confirmBtn.click();
                            console.log('点击确认按钮');
                        }, randomDelay());
                    }
                });

                // 等待题目加载完成后开始答题
                await waitForElement('.topic-item', () => {
                    console.log('答题页面加载完成，自动开始答题');
                    autoAnswer();
                });
            }

            // 开始执行
            handleStartPage();
        }
    }
    // 在脚本初始化时调用
    setTimeout(initAutoAnswer, 1000);

    // 自动执行
    setTimeout(findAndShowTests, 1000);
    
    // 在需要记录日志的地方使用
    logger.log('初始化完成', 'info');

    // 导出函数供其他模块使用
    window.findAndShowTests = findAndShowTests;
})();
