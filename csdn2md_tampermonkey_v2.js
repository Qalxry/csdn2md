// ==UserScript==
// @name         csdn2md - 批量下载CSDN文章为Markdown
// @namespace    http://tampermonkey.net/
// @version      2.1.10
// @description  下载CSDN文章为Markdown格式，支持专栏批量下载。CSDN排版经过精心调教，最大程度支持CSDN的全部Markdown语法：KaTeX内联公式、KaTeX公式块、图片、内联代码、代码块、Bilibili视频控件、有序/无序/任务/自定义列表、目录、注脚、加粗斜体删除线下滑线高亮、内容居左/中/右、引用块、链接、快捷键（kbd）、表格、上下标、甘特图、UML图、FlowChart流程图
// @author       ShizuriYuki
// @match        https://*.csdn.net/*
// @icon         https://g.csdnimg.cn/static/logo/favicon32.ico
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @run-at       document-idle
// @license      PolyForm Strict License 1.0.0  https://polyformproject.org/licenses/strict/1.0.0/
// @supportURL   https://github.com/Qalxry/csdn2md
// @require      https://cdnjs.cloudflare.com/ajax/libs/jszip/3.7.1/jszip.min.js
// ==/UserScript==

(function () {
    "use strict";

    /**
     * 模块: 工具函数
     * 提供各种辅助功能的工具函数集合
     */
    const Utils = {
        /**
         * 清除字符串中的特殊字符
         * @param {string} str - 输入字符串
         * @returns {string} 清理后的字符串
         */
        clearSpecialChars(str) {
            return str
                .replace(/[\s]{2,}/g, "")
                .replace(
                    /[\u200B-\u200F\u202A-\u202E\u2060-\u206F\uFEFF\u00AD\u034F\u061C\u180E\u2800\u3164\uFFA0\uFFF9-\uFFFB]/g,
                    ""
                )
                .replace("⎧", "")
                .replace("⎨", "{")
                .replace("⎩", "")
                .replace("⎫", "")
                .replace("⎬", "}")
                .replace("⎭", "")
                .replace("⎡", "[")
                .replace("⎢", "")
                .replace("⎣", "")
                .replace("⎤", "]")
                .replace("⎥", "")
                .replace("⎦", "");
        },

        /**
         * 根据长度特征清除字符串中开头的杂乱字符
         * @param {string} str - 输入字符串
         * @returns {string} 清理后的字符串
         */
        clearKatexMathML(str) {
            const strSplit = str.split(/(?=.*\n)(?=.* )[\s\n]{10,}/);
            let maxLen = 0;
            let maxStr = "";
            for (const item of strSplit) {
                if (item.length > maxLen) {
                    maxLen = item.length;
                    maxStr = item;
                }
            }
            return maxStr;
        },

        /**
         * 清理URL中的参数和锚点
         * @param {string} url - 输入URL
         * @returns {string} 清理后的URL
         */
        clearUrl(url) {
            return url.replace(/[?#@!$&'()*+,;=].*$/, "");
        },

        /**
         * 将文件名转换为安全的文件名
         * @param {string} filename - 原始文件名
         * @returns {string} 安全的文件名
         */
        safeFilename(filename) {
            return filename.replace(/[\\/:*?"<>|]/g, "_");
        },

        /**
         * 压缩HTML内容，移除多余的空白和换行符
         * @param {string} html - 输入的HTML字符串
         * @returns {string} 压缩后的HTML字符串
         */
        shrinkHtml(html) {
            return html
                .replace(/>\s+</g, "><") // 去除标签之间的空白
                .replace(/\s{2,}/g, " ") // 多个空格压缩成一个
                .replace(/^\s+|\s+$/g, ""); // 去除首尾空白
        },

        /**
         * 将SVG图片转换为Base64编码的字符串
         * @param {string} svgText - SVG图片的文本内容
         * @returns {string} Base64编码的字符串
         */
        svgToBase64(svgText) {
            const uint8Array = new TextEncoder().encode(svgText);
            const binaryString = uint8Array.reduce((data, byte) => data + String.fromCharCode(byte), "");
            return btoa(binaryString);
        },

        formatSeconds(seconds) {
            const hrs = Math.floor(seconds / 3600);
            const mins = Math.floor((seconds % 3600) / 60);
            const secs = Math.floor(seconds % 60);
            const pad = (num) => num.toString().padStart(2, "0");
            return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
        },

        async parallelPool(array, iteratorFn, poolLimit = 10) {
            const ret = []; // 存储所有任务
            const executing = []; // 存储正在执行的任务
            let index = 0;
            for (const item of array) {
                const currentIndex = index++;
                const p = Promise.resolve().then(() => iteratorFn(item, currentIndex));
                ret.push(p);

                if (poolLimit <= array.length) {
                    const e = p.then(() => executing.splice(executing.indexOf(e), 1));
                    executing.push(e);

                    if (executing.length >= poolLimit) {
                        await Promise.race(executing);
                    }
                }
            }

            return Promise.all(ret);
        },

        /**
         * 计算字符串的简单哈希值
         * @param {string} str - 输入字符串
         * @param {number} length - 返回的16进制字符串长度，默认为8
         * @returns {string} 指定长度的16进制哈希字符串
         */
        simpleHash(str, length = 8) {
            let hash = 0;
            if (str.length === 0) return "0".repeat(length);

            for (let i = 0; i < str.length; i++) {
                const char = str.charCodeAt(i);
                hash = (hash << 5) - hash + char;
                hash = hash & hash; // 转换为32位整数
            }

            // 转换为16进制并确保为正数
            let hexHash = Math.abs(hash).toString(16);

            // 如果长度不够，重复哈希直到达到要求长度
            while (hexHash.length < length) {
                hash = (hash << 5) - hash + hash;
                hash = hash & hash;
                hexHash += Math.abs(hash).toString(16);
            }

            // 截取到指定长度
            return hexHash.substring(0, length);
        },
    };

    /**
     * 模块: 锁管理
     * 处理异步操作锁
     */
    class ReentrantAsyncLock {
        /**
         * 创建一个可重入异步锁
         * @param {boolean} enableReentrant - 是否启用重入功能
         */
        constructor(enableReentrant = true) {
            this.queue = [];
            this.locked = false;
            this.owner = null; // 记录锁的持有者，用于重入
            this.enableReentrant = enableReentrant;
        }

        /**
         * 获取锁
         * @param {any} ownerId - 锁持有者的标识
         * @returns {Promise<void>}
         */
        async acquire(ownerId = null) {
            if (this.locked) {
                // 如果允许重入，且当前持有者是ownerId，则直接返回
                if (this.enableReentrant && this.owner === ownerId) {
                    return;
                }
                // 否则加入队列等待
                await new Promise((resolve) => this.queue.push(resolve));
            }
            this.locked = true;
            this.owner = ownerId;
        }

        /**
         * 释放锁
         * @param {any} ownerId - 锁持有者的标识
         */
        release(ownerId) {
            if (this.enableReentrant && this.owner !== ownerId) {
                throw new Error("Cannot release a lock you do not own");
            }
            this.locked = false;
            this.owner = null;
            if (this.queue.length > 0) {
                const resolve = this.queue.shift();
                resolve();
                this.locked = true;
                this.owner = ownerId; // 继续持有锁
            }
        }
    }

    /**
     * 模块: UI管理
     * 处理界面相关的功能
     */
    class UIManager {
        constructor(fileManager, downloadManager) {
            this.fileManager = fileManager;
            this.downloadManager = downloadManager;
            this.isDragging = 0;
            this.offsetX = 0;
            this.offsetY = 0;
            this.container = null;
            this.contentBox = null;
            this.mainButton = null;
            this.floatWindow = null;
            this.downloadButton = null;
            this.gotoRepoButton = null;
            this.defaultOptions = {};
            this.optionDivList = [];
            this.optionCheckBoxList = [];
            this.isOpen = false;
            this.repo_url = "https://github.com/Qalxry/csdn2md";
            this.initStyles();
            this.initUI();
            this.setupEventListeners();
        }

        /**
         * 初始化UI样式
         */
        initStyles() {
            GM_addStyle(`
                .tm_floating-container {
                    position: fixed;
                    bottom: 30px;
                    right: 30px;
                    z-index: 9999;
                    transform-origin: bottom right;
                }

                .tm_main-button {
                    width: 60px;
                    height: 60px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, #12c2e9 0%, #c471ed 50%, #f64f59 100%);
                    box-shadow: 0 0 20px rgba(0,0,0,0.2);
                    border: none;
                    color: white;
                    font-size: 30px;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .tm_content-box {
                    background: linear-gradient(45deg, #ffffff, #f8f9fa);
                    border-radius: 20px;
                    padding: 20px;
                    min-width: 480px !important;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.15);
                    margin-bottom: 20px;
                    opacity: 0;
                    transform: scale(0);
                    transform-origin: bottom right;
                    transition: all 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
                    position: absolute;
                    bottom: 100%;
                    right: 0;
                }

                .tm_content-box.open {
                    opacity: 1;
                    transform: scale(1);
                }

                .tm_complex-content {
                    display: flex;
                    flex-direction: column;
                    gap: 15px;
                }

                .tm_content-item {
                    padding: 15px;
                    background: rgba(255,255,255,0.9);
                    border-radius: 10px;
                    border: 1px solid rgba(0,0,0,0.1);
                    transition: transform 0.2s ease;
                }

                .tm_content-item:hover {
                    transform: scale(1.1);
                }

                #myFloatWindow label {
                    white-space: nowrap;  /* 防止文字换行 */
                    user-select: none;    /* 优化用户体验 */
                }

                #myDownloadButton, #myGotoRepoButton, #myResetButton {
                    text-align: center;
                    padding: 5px 10px;
                    background: linear-gradient(135deg, #12c2e9 0%, #c471ed 50%, #f64f59 100%);
                    color: white;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    border-radius: 5px;
                    border: none;
                }

                #myDownloadButton {
                    margin-bottom: 5px;
                }

                #myGotoRepoButton, #myResetButton {
                    margin-top: 12px;
                }

                #myDownloadButton:hover, #myGotoRepoButton:hover, #myResetButton:hover {
                    transform: scale(1.1);
                }

                #myDownloadButton:disabled, #myGotoRepoButton:disabled, #myResetButton:disabled {
                    background: gray;
                    color: #aaa;
                    cursor: not-allowed;
                    transform: none;
                }
            `);
        }

        /**
         * 初始化UI元素
         */
        initUI() {
            // 创建悬浮容器
            this.container = document.createElement("div");
            this.container.className = "tm_floating-container";
            this.container.id = "draggable";

            // 创建主按钮
            this.mainButton = document.createElement("button");
            this.mainButton.className = "tm_main-button";
            this.mainButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#FFFFFF"><path d="M480-337q-8 0-15-2.5t-13-8.5L308-492q-12-12-11.5-28t11.5-28q12-12 28.5-12.5T365-549l75 75v-286q0-17 11.5-28.5T480-800q17 0 28.5 11.5T520-760v286l75-75q12-12 28.5-11.5T652-548q11 12 11.5 28T652-492L508-348q-6 6-13 8.5t-15 2.5ZM240-160q-33 0-56.5-23.5T160-240v-80q0-17 11.5-28.5T200-360q17 0 28.5 11.5T240-320v80h480v-80q0-17 11.5-28.5T760-360q17 0 28.5 11.5T800-320v80q0 33-23.5 56.5T720-160H240Z"/></svg>`;

            // 创建内容区域
            this.contentBox = document.createElement("div");
            this.contentBox.className = "tm_content-box";

            // 创建复杂内容
            this.contentBox.innerHTML = `
                <div class="tm_complex-content" id="tmComplexContent"></div>
            `;

            // 组装元素
            this.container.appendChild(this.contentBox);
            this.container.appendChild(this.mainButton);
            document.body.appendChild(this.container);

            // 还原之前保存的位置
            const savedTop = GM_getValue("draggableTop");
            if (savedTop) {
                this.container.style.top = Math.min(window.innerHeight - 100, parseInt(savedTop)) + "px";
            }

            // 创建浮动窗口
            this.createFloatWindow();
        }

        /**
         * 创建浮动窗口和选项
         */
        createFloatWindow() {
            // 创建悬浮窗
            this.floatWindow = document.createElement("div");
            this.floatWindow.style.alignItems = "center";
            this.floatWindow.style.display = "flex";
            this.floatWindow.style.flexDirection = "column"; // 里面的元素每个占一行
            this.floatWindow.id = "myFloatWindow";

            // 创建下载按钮
            this.downloadButton = document.createElement("button");
            this.downloadButton.innerHTML =
                "下载CSDN文章为Markdown<br>（支持专栏、文章、用户全部文章页面）<br>（推荐使用typora打开下载的Markdown）";
            this.downloadButton.id = "myDownloadButton";
            this.floatWindow.appendChild(this.downloadButton);

            // 创建选项容器
            const optionContainer = document.createElement("div");
            optionContainer.style.display = "flex";
            optionContainer.style.flexDirection = "column";
            optionContainer.style.alignItems = "left";
            optionContainer.style.marginTop = "10px";
            this.floatWindow.appendChild(optionContainer);

            // 添加选项
            this.addOption("parallelDownload", "批量并行下载模式", true, optionContainer);
            this.addOption(
                "fastDownload",
                "批量高速下载模式（有代码块语言无法识别等问题，能接受就开）",
                false,
                optionContainer
            );
            this.addOption("addSerialNumber", "批量文章文件加入序号前缀", true, optionContainer);
            this.addOption("zipCategories", "下载为压缩包", true, optionContainer, {
                false: [{ id: "saveWebImages", value: false }],
            });
            this.addOption("addArticleInfoInYaml", "添加文章元信息（以YAML元信息格式）", false, optionContainer);
            this.addOption("addArticleTitleToMarkdown", "添加文章标题（以一级标题形式）", true, optionContainer);
            this.addOption(
                "addArticleInfoInBlockquote",
                "添加阅读量、点赞等信息（以引用块形式）",
                true,
                optionContainer
            );
            this.addOption(
                "saveWebImages",
                "将图片保存至本地（默认保存到与md文件同名的文件夹，以相对路径使用）",
                true,
                optionContainer,
                {
                    true: [{ id: "zipCategories", value: true }],
                }
            );
            this.addOption(
                "saveAllImagesToAssets",
                "将图片保存统一保存到assets文件夹内，以相对路径使用",
                true,
                optionContainer,
                {
                    true: [
                        { id: "zipCategories", value: true },
                        { id: "saveWebImages", value: true },
                    ],
                }
            );
            this.addOption("forceImageCentering", "全部图片居中排版", false, optionContainer);
            this.addOption("enableImageSize", "启用图片宽高属性（如果网页中的图片具有宽高）", true, optionContainer);
            this.addOption("removeCSDNSearchLink", "移除CSDN搜索链接", true, optionContainer);
            this.addOption("enableColorText", "启用彩色文字（以span形式保存）", true, optionContainer);
            this.addOption("mergeArticleContent", "合并批量文章内容（以一篇文章的形式保存）", false, optionContainer, {
                true: [
                    { id: "zipCategories", value: true },
                    { id: "addArticleInfoInYaml", value: false },
                ],
            });
            this.addOption(
                "addSerialNumberToTitle",
                "添加序号到标题前缀（建议在合并文章时开启）",
                false,
                optionContainer
            );
            this.addOption(
                "addArticleInfoInBlockquote_batch",
                "合并文章时添加阅读量、点赞等信息（以引用块形式）",
                true,
                optionContainer
            );

            // 创建恢复默认设置按钮
            this.resetButton = document.createElement("button");
            this.resetButton.innerHTML = "恢复默认设置";
            this.resetButton.id = "myResetButton";
            this.floatWindow.appendChild(this.resetButton);

            // 创建去GitHub按钮
            this.gotoRepoButton = document.createElement("button");
            this.gotoRepoButton.innerHTML = "前往 GitHub 给作者点个 Star ⭐ ➡️";
            this.gotoRepoButton.id = "myGotoRepoButton";
            this.floatWindow.appendChild(this.gotoRepoButton);

            // 将浮窗添加到内容区
            document.getElementById("tmComplexContent").appendChild(this.floatWindow);
        }

        /**
         * 设置事件监听器
         */
        setupEventListeners() {
            // 主按钮点击事件
            this.mainButton.addEventListener("click", (e) => {
                e.stopPropagation();
                this.toggleContent();
            });

            // 点击外部区域关闭
            document.addEventListener("click", (e) => {
                if (!this.container.contains(e.target)) {
                    this.closeContent();
                }
            });

            // 阻止内容区域点击关闭
            this.contentBox.addEventListener("click", (e) => {
                e.stopPropagation();
            });

            // 下载按钮点击事件
            this.downloadButton.addEventListener("click", async () => {
                await this.downloadManager.runMain();
            });

            // 默认设置按钮点击事件
            this.resetButton.addEventListener("click", () => {
                Object.entries(this.defaultOptions).forEach(([id, value]) => GM_setValue(id, value));
                this.updateAllOptions();
                this.showFloatTip("已恢复默认设置", 1000);
            });

            // GitHub按钮点击事件
            this.gotoRepoButton.addEventListener("click", () => {
                window.open(this.repo_url, "_blank");
            });

            // 拖拽功能
            const draggable = document.getElementById("draggable");
            draggable.addEventListener("mousedown", (e) => {
                this.isDragging = true;
                this.offsetX = e.clientX - draggable.offsetLeft;
                this.offsetY = e.clientY - draggable.offsetTop;
            });

            document.addEventListener("mousemove", (e) => {
                if (this.isDragging) {
                    // draggable.style.left = `${e.clientX - offsetX}px`;  // 左侧拖拽
                    // draggable.style.top = `${e.clientY - this.offsetY}px`;
                    draggable.style.top =
                        Math.min(window.innerHeight - 100, Math.max(0, e.clientY - this.offsetY)) + "px"; // 限制在窗口内
                }
            });

            // 监视页面缩放事件
            window.addEventListener("resize", () => {
                const savedTop = GM_getValue("draggableTop");
                if (savedTop) {
                    this.container.style.top = Math.min(window.innerHeight - 100, parseInt(savedTop)) + "px";
                }
            });

            document.addEventListener("mouseup", () => {
                this.isDragging = false;
                GM_setValue("draggableTop", draggable.style.top);
            });

            // 监听窗口聚焦事件
            window.addEventListener("focus", () => {
                this.updateAllOptions();
            });
        }

        /**
         * 切换内容区域显示状态
         */
        toggleContent() {
            this.isOpen = !this.isOpen;
            this.contentBox.classList.toggle("open", this.isOpen);
            this.mainButton.style.transform = this.isOpen ? "scale(1.1) rotate(360deg)" : "scale(1) rotate(0deg)";
        }

        /**
         * 关闭内容区域
         */
        closeContent() {
            this.isOpen = false;
            this.contentBox.classList.remove("open");
            this.mainButton.style.transform = "scale(1) rotate(0deg)";
        }

        /**
         * 添加选项
         * @param {string} id - 选项ID
         * @param {string} innerHTML - 选项文本
         * @param {boolean} defaultValue - 默认值
         * @param {HTMLElement} container - 父容器
         * @param {Object} constraints - 约束条件
         */
        addOption(id, innerHTML, defaultValue, container, constraints = {}) {
            this.defaultOptions[id] = defaultValue;

            if (GM_getValue(id) === undefined) {
                GM_setValue(id, defaultValue);
            }
            const checked = GM_getValue(id);
            const optionDiv = document.createElement("div");
            optionDiv.style.display = "flex";
            optionDiv.style.alignItems = "left";

            const optionCheckbox = document.createElement("input");
            optionCheckbox.type = "checkbox";
            optionCheckbox.checked = checked;
            optionCheckbox.id = id + "Checkbox";
            optionCheckbox.style.marginRight = "5px";

            const optionLabel = document.createElement("label");
            optionLabel.htmlFor = optionCheckbox.id;
            optionLabel.textContent = innerHTML;
            optionLabel.style.marginRight = "10px";

            optionDiv.appendChild(optionCheckbox);
            optionDiv.appendChild(optionLabel);

            this.optionDivList.push(optionDiv);
            this.optionCheckBoxList.push(optionCheckbox);
            container.appendChild(optionDiv);

            optionCheckbox.addEventListener("change", () => {
                GM_setValue(id, optionCheckbox.checked);
                if (optionCheckbox.checked) {
                    if (constraints.true) {
                        for (const constraint of constraints.true) {
                            if (constraint.id !== undefined && constraint.value !== undefined) {
                                GM_setValue(constraint.id, constraint.value);
                            }
                        }
                        this.updateAllOptions();
                    }
                } else {
                    if (constraints.false) {
                        for (const constraint of constraints.false) {
                            if (constraint.id !== undefined && constraint.value !== undefined) {
                                GM_setValue(constraint.id, constraint.value);
                            }
                        }
                        this.updateAllOptions();
                    }
                }
            });
        }

        /**
         * 更新所有选项的状态
         */
        updateAllOptions() {
            this.optionCheckBoxList.forEach((optionElem) => {
                optionElem.checked = GM_getValue(optionElem.id.replace("Checkbox", ""));
            });
        }

        /**
         * 启用悬浮窗
         */
        enableFloatWindow() {
            this.downloadButton.disabled = false;
            this.downloadButton.innerHTML =
                "下载CSDN文章为Markdown<br>（支持专栏、文章、用户全部文章页面）<br>（推荐使用typora打开下载的Markdown）";
            this.resetButton.disabled = false;
            this.optionCheckBoxList.forEach((optionElem) => {
                optionElem.disabled = false;
            });
        }

        /**
         * 禁用悬浮窗
         */
        disableFloatWindow() {
            this.downloadButton.innerHTML = "正在下载，请稍候...";
            this.downloadButton.disabled = true;
            this.resetButton.disabled = true;
            this.optionCheckBoxList.forEach((optionElem) => {
                optionElem.disabled = true;
            });
        }

        /**
         * 显示悬浮提示
         * @param {string} text - 提示内容
         * @param {number} timeout - 自动关闭时间(毫秒)
         */
        showFloatTip(text, timeout = 0) {
            if (document.getElementById("myInfoFloatTip")) {
                document.getElementById("myInfoFloatTip").innerHTML = text;
            } else {
                const floatTip = document.createElement("div");
                floatTip.style.position = "fixed";
                floatTip.style.top = "40%";
                floatTip.style.left = "50%";
                floatTip.style.transform = "translateX(-50%)";
                floatTip.style.padding = "10px";
                floatTip.style.backgroundColor = "rgba(0, 0, 0, 0.7)";
                floatTip.style.color = "#fff";
                floatTip.style.borderRadius = "5px";
                floatTip.style.boxShadow = "0 2px 5px rgba(0, 0, 0, 0.5)";
                floatTip.style.zIndex = "9999";
                floatTip.innerHTML = text;
                floatTip.id = "myInfoFloatTip";
                document.body.appendChild(floatTip);
            }

            if (timeout > 0) {
                setTimeout(() => {
                    this.hideFloatTip();
                }, timeout);
            }
        }

        /**
         * 显示一个确认对话框
         * @param {string} message - 提示信息
         * @param {function} onConfirm - 确认回调
         * @param {function} onCancel - 取消回调
         */
        showConfirmDialog(message, onConfirm, onCancel) {
            // 创建遮罩层
            const overlay = document.createElement("div");
            overlay.style.position = "fixed";
            overlay.style.top = "0";
            overlay.style.left = "0";
            overlay.style.width = "100vw";
            overlay.style.height = "100vh";
            overlay.style.background = "rgba(0,0,0,0.3)";
            overlay.style.zIndex = "10000";
            overlay.id = "tm_confirm_overlay";

            // 创建对话框
            const dialog = document.createElement("div");
            dialog.style.position = "fixed";
            dialog.style.top = "50%";
            dialog.style.left = "50%";
            dialog.style.transform = "translate(-50%, -50%)";
            dialog.style.background = "#fff";
            dialog.style.padding = "24px 32px";
            dialog.style.borderRadius = "12px";
            dialog.style.boxShadow = "0 4px 24px rgba(0,0,0,0.18)";
            dialog.style.textAlign = "center";
            dialog.style.minWidth = "420px";
            dialog.style.maxWidth = "90vw";
            dialog.style.wordBreak = "break-all";

            // 提示文本
            const msg = document.createElement("div");
            msg.innerHTML = message.replace(/\n/g, "<br>");
            msg.style.marginBottom = "18px";
            msg.style.textAlign = "left"; // 向左对齐
            dialog.appendChild(msg);

            // 按钮容器
            const btnBox = document.createElement("div");
            btnBox.style.display = "flex";
            btnBox.style.justifyContent = "center";
            btnBox.style.gap = "18px";

            // 确认按钮
            const okBtn = document.createElement("button");
            okBtn.textContent = "确定";
            okBtn.style.padding = "6px 18px";
            okBtn.style.background = "linear-gradient(135deg, #12c2e9 0%, #c471ed 50%, #f64f59 100%)";
            okBtn.style.color = "#fff";
            okBtn.style.border = "none";
            okBtn.style.borderRadius = "5px";
            okBtn.style.cursor = "pointer";
            okBtn.style.transition = "all 0.3s ease";
            okBtn.onmouseover = () => {
                okBtn.style.transform = "scale(1.05)";
            };
            okBtn.onmouseout = () => {
                okBtn.style.transform = "scale(1)";
            };
            okBtn.onclick = () => {
                document.body.removeChild(overlay);
                if (typeof onConfirm === "function") onConfirm();
            };

            // 取消按钮
            const cancelBtn = document.createElement("button");
            cancelBtn.textContent = "取消";
            cancelBtn.style.padding = "6px 18px";
            cancelBtn.style.background = "#ccc";
            cancelBtn.style.color = "#333";
            cancelBtn.style.border = "none";
            cancelBtn.style.borderRadius = "5px";
            cancelBtn.style.cursor = "pointer";
            cancelBtn.onclick = () => {
                document.body.removeChild(overlay);
                if (typeof onCancel === "function") onCancel();
            };

            btnBox.appendChild(cancelBtn);
            btnBox.appendChild(okBtn);
            dialog.appendChild(btnBox);
            overlay.appendChild(dialog);
            document.body.appendChild(overlay);
        }

        /**
         * 跳转到 GitHub issue 页面，并将信息参数化到 URL 中
         * @param {string} info - 要传递的信息
         */
        gotoGithubIssue(title, info) {
            const url = `${this.repo_url}/issues/new?title=${encodeURIComponent(title)}&body=${encodeURIComponent(
                info
            )}`;
            window.open(url, "_blank");
        }

        /**
         * 隐藏悬浮提示
         */
        hideFloatTip() {
            if (document.getElementById("myInfoFloatTip")) {
                document.getElementById("myInfoFloatTip").remove();
            }
        }
    }

    /**
     * 模块: 文件管理
     * 处理文件相关的操作
     */
    class FileManager {
        constructor() {
            this.fileQueue = [];
            this.imageCount = {};
            this.imageSet = {};
        }

        /**
         * 将文本保存为文件
         * @param {string} content - 文件内容
         * @param {string} filename - 文件名
         * @param {number} index - 文件索引(用于排序)
         */
        async saveTextAsFile(content, filename, index = 0) {
            filename = Utils.safeFilename(filename);
            if (GM_getValue("zipCategories") || GM_getValue("mergeArticleContent")) {
                // 保存到队列中，等待打包
                this.fileQueue.push({ filename, type: "text/plain", content, index });
                return;
            }

            const blob = new Blob([content], { type: "text/plain" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }

        /**
         * 将SVG内容保存到本地，添加到fileQueue，并返回本地路径
         * @param {string} svgText - SVG内容
         * @param {string} mdAssetDirName - 资源文件夹名
         * @param {string} img_prefix - 图片前缀
         * @returns {Promise<string>} 本地SVG路径
         */
        async saveSvgToLocal(svgText, mdAssetDirName, img_prefix = "") {
            // 检查参数是否合法
            if (typeof svgText !== "string") {
                throw new Error("[saveSvgToLocal] Invalid argument: svgText must be a string.");
            }

            const imgOwner = img_prefix + mdAssetDirName;

            // 初始化
            if (!this.imageCount[imgOwner]) {
                this.imageSet[imgOwner] = {};
                this.imageCount[imgOwner] = 0;
            }
            // 检查是否已保存过该SVG（通过内容哈希）
            const svgHash = Utils.simpleHash(svgText, 16); // 使用16位哈希
            if (this.imageSet[imgOwner][svgHash]) {
                return this.imageSet[imgOwner][svgHash];
            }

            // 记录图片数量
            this.imageCount[imgOwner]++;
            const index = this.imageCount[imgOwner];
            const filename = `${mdAssetDirName}/${img_prefix}${index}.svg`;

            // 记录已保存的SVG
            this.imageSet[imgOwner][svgHash] = `./${filename}`;

            // 创建SVG的Blob对象
            const blob = new Blob([svgText], { type: "image/svg+xml" });

            // 添加到文件队列
            this.fileQueue.push({ filename, content: blob, type: "image/svg+xml", index });

            // 返回本地路径
            return `./${filename}`;
        }

        /**
         * 将网络图片保存到本地，添加到fileQueue，并返回本地路径
         * @param {string} imgUrl - 图片URL
         * @param {string} mdAssetDirName - 资源文件夹名
         * @param {string} img_prefix - 图片前缀
         * @returns {Promise<string>} 本地图片路径
         */
        async saveWebImageToLocal(imgUrl, mdAssetDirName, img_prefix = "") {
            // 检查参数是否合法
            if (typeof imgUrl !== "string") {
                throw new Error("[saveWebImageToLocal] Invalid argument: imgUrl must be a string.");
            }

            // 清理URL
            imgUrl = Utils.clearUrl(imgUrl);

            const imgOwner = img_prefix + mdAssetDirName;

            // 初始化
            if (!this.imageCount[imgOwner]) {
                this.imageSet[imgOwner] = {};
                this.imageCount[imgOwner] = 0;
            }

            // 检查是否已保存过该图片
            if (this.imageSet[imgOwner][imgUrl]) {
                return this.imageSet[imgOwner][imgUrl];
            }

            // 记录图片数量
            this.imageCount[imgOwner]++;
            const index = this.imageCount[imgOwner];
            let ext = imgUrl.split(".").pop();
            const allowedExt = ["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp", "ico", "avif"];
            if (!allowedExt.includes(ext)) {
                console.warn(`[saveWebImageToLocal] Unsupported image format: ${ext}`);
                ext = "";
            } else {
                ext = `.${ext}`;
            }
            const filename = `${mdAssetDirName}/${img_prefix}${index}${ext}`;

            // 记录已保存的图片
            this.imageSet[imgOwner][imgUrl] = `./${filename}`;

            // 获取图片的Blob对象
            // const blob = await this.fetchImageAsBlob(imgUrl);
            const blob = this.fetchImageAsBlob(imgUrl); // Promise返回的Blob对象，需要等到打包时进行等待

            // 添加到文件队列
            this.fileQueue.push({ filename, content: blob, type: blob.type, index });

            // 返回本地路径
            return `./${filename}`;
        }

        /**
         * 获取网络资源
         * @param {string} url - 资源URL
         * @param {number} retryCount - 重试次数，默认值为3
         * @returns {Promise<Blob>} 资源Blob对象
         */
        async fetchImageAsBlob(url, retryCount = 3) {
            return new Promise((resolve, reject) => {
                function attemptFetch(remaining) {
                    GM_xmlhttpRequest({
                        method: "GET",
                        url: url,
                        responseType: "blob",
                        onload: function (response) {
                            if (response.status === 200) {
                                resolve(response.response);
                            } else {
                                if (remaining > 0) {
                                    attemptFetch(remaining - 1);
                                } else {
                                    reject(`Failed to fetch resource: ${url}`);
                                }
                            }
                        },
                        onerror: function () {
                            if (remaining > 0) {
                                attemptFetch(remaining - 1);
                            } else {
                                reject(`Error fetching resource: ${url}`);
                            }
                        },
                    });
                }
                attemptFetch(retryCount);
            });
        }

        /**
         * 合并文章内容
         * @param {string} mergeName - 合并后的文件名
         * @param {string} extraPrefix - 额外前缀
         */
        mergeArticleContent(mergeName, extraPrefix = "") {
            // 检查队列是否只有一个md文件
            let mdCount = 0;
            this.fileQueue.forEach((file) => {
                if (file.type === "text/plain") {
                    mdCount++;
                }
            });
            if (mdCount <= 1) {
                return;
            }

            // 合并文章内容
            const textArray = [];
            const newFileQueue = [];
            this.fileQueue.forEach((file) => {
                if (file.type === "text/plain") {
                    textArray.push({ content: file.content, index: file.index });
                } else {
                    newFileQueue.push(file);
                }
            });

            // 按照index排序
            textArray.sort((a, b) => a.index - b.index);
            const mergedContent = textArray.map((item) => item.content).join("\n\n\n\n");

            newFileQueue.push({
                filename: `${mergeName}.md`,
                type: "text/plain",
                content: `${extraPrefix}${mergedContent}`,
            });
            this.fileQueue = newFileQueue;
        }

        /**
         * 下载合并后的文章
         */
        downloadMergedArticle() {
            const content = this.fileQueue.pop();
            const blob = new Blob([content.content], { type: "text/plain" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = content.filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }

        /**
         * 将文件队列打包为ZIP下载
         * @param {string} zipName - ZIP文件名
         */
        async saveAllFileToZip(zipName, progressCallback = null, finalCallback = null) {
            if (this.fileQueue.length === 0) {
                console.error("没有文件需要保存");
                return;
            }

            zipName = Utils.safeFilename(zipName);
            // 创建JSZip实例
            const zip = new JSZip();

            // 使用 for...of 循环替代 forEach，以便正确处理 async/await
            for (let idx = 0; idx < this.fileQueue.length; idx++) {
                let status = true;
                const file = this.fileQueue[idx];
                // content 可能是 promise（Blob对象），需要等待
                if (file.content instanceof Promise) {
                    if (progressCallback) {
                        progressCallback(`正在下载资源：${file.filename} (${idx + 1}/${this.fileQueue.length})`);
                    }
                    try {
                        file.content = await file.content; // 等待Blob对象
                    } catch (err) {
                        if (progressCallback) {
                            progressCallback(`下载资源失败：${err}`);
                        }
                        status = false;
                    }
                }
                if (!status) {
                    continue; // 如果下载失败，跳过当前文件
                }
                // 将文件添加到ZIP中
                zip.file(file.filename, file.content);
            }

            // 获取当前时间，以便计算剩余时间
            const startTime = Date.now();

            // 生成ZIP文件
            zip.generateAsync({ type: "blob" }, (metadata) => {
                // 进度回调
                if (progressCallback) {
                    // metadata.percent: 当前进度百分比
                    // metadata.currentFile: 当前正在处理的文件名
                    progressCallback(
                        `正在打包：${metadata.currentFile} (${Math.round(
                            metadata.percent
                        )}%)(剩余时间：${Utils.formatSeconds(
                            ((Date.now() - startTime) / 1000 / metadata.percent) * (100 - metadata.percent)
                        )})`
                    );
                }
            })
                .then((blob) => {
                    // 调用最终回调
                    if (finalCallback) {
                        finalCallback(
                            `打包完成：${zipName}.zip，文件大小：${(blob.size / 1024 / 1024).toFixed(
                                2
                            )} MB\n请等待下载完成。`
                        );
                    }
                    // 创建下载链接
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `${zipName}.zip`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                    this.clearFileQueue(); // 清空文件队列
                    this.clearImageCache(); // 清空图片缓存
                })
                .catch((error) => {
                    // 处理错误
                    console.error("Error generating ZIP file:", error);
                    if (finalCallback) {
                        finalCallback(`下载失败：${zipName}.zip，错误信息：${error}`);
                        throw new Error(`下载失败：${zipName}.zip，错误信息：${error}`);
                    }
                    this.clearFileQueue(); // 清空文件队列
                    this.clearImageCache(); // 清空图片缓存
                });
        }

        /**
         * 重置图片计数器和缓存
         */
        clearImageCache() {
            this.imageCount = {};
            this.imageSet = {};
        }

        /**
         * 清空文件队列
         */
        clearFileQueue() {
            this.fileQueue = [];
        }

        /**
         * 重置FileManager
         */
        async reset() {
            this.clearFileQueue();
            this.clearImageCache();
        }
    }

    /**
     * 模块: Markdown转换
     * 将HTML转换为Markdown
     */
    class MarkdownConverter {
        /**
         * @param {FileManager} fileManager - 文件管理实例
         *
         * @constructor
         **/
        constructor(fileManager) {
            this.fileManager = fileManager;
        }

        /**
         * 将HTML内容转换为Markdown格式
         * @param {Element} articleElement - 文章DOM元素
         * @param {string} mdAssetDirName - 资源文件夹名
         * @param {boolean} enableTOC - 是否启用目录
         * @returns {Promise<string>} Markdown内容
         */
        async htmlToMarkdown(articleElement, mdAssetDirName = "", enableTOC = true, img_prefix = "") {
            // 预定义的特殊字段
            // 内容之间保持两个换行符
            const CONSTANT_DOUBLE_NEW_LINE = "<|CSDN2MD@CONSTANT_DOUBLE_NEW_LINE@23hy7b|>";
            // 分隔符用于美化，比如公式和文本之间加上空格会更美观
            const SEPARATION_BEAUTIFICATION = "<|CSDN2MD@SEPARATION_BEAUTIFICATION@2caev2|>";

            // 处理预定义的特殊字段
            const DDNL = escapeRegExp(CONSTANT_DOUBLE_NEW_LINE);
            const SEPB = escapeRegExp(SEPARATION_BEAUTIFICATION);

            /**
             * 特殊字符串修剪函数：移除字符串开头和结尾的分隔符(SEPB)和空白字符
             * @param {string} [text=""] - 需要修剪的字符串 / The string to be trimmed
             * @returns {string} 修剪后的字符串 / The trimmed string
             */
            function SpecialTrim(text = "") {
                return text.replace(new RegExp(`^(?:${SEPB}|\\s)+`), "").replace(new RegExp(`(?:${SEPB}|\\s)+$`), "");
            }

            // 1. 连续的 "\n" 与 CONSTANT_DOUBLE_NEW_LINE 替换为 "\n\n"
            const RE_DOUBLE_NL = new RegExp(`(?:\\n|${DDNL})*${DDNL}(?:\\n|${DDNL})*`, "g");
            // 2. 连续的 SEPARATION_BEAUTIFICATION 替换为 " "，但如果前面是换行符，替换为 ""
            const RE_SEP_NOLINE = new RegExp(`(?<!\\n)(?:${SEPB})+`, "g");
            const RE_SEP_WITHNL = new RegExp(`(\\n)(?:${SEPB})+`, "g");

            // 辅助：对常量做正则转义
            function escapeRegExp(s) {
                return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            }

            // 辅助函数，用于转义特殊的Markdown字符
            const escapeMarkdown = (text) => {
                // return text.replace(/([\\`*_\{\}\[\]()#+\-.!])/g, "\\$1").trim();
                return text.trim(); // 不转义特殊字符
            };

            /**
             * 递归处理DOM节点并将其转换为Markdown
             * @param {Node} node - 当前DOM节点
             * @param {number} listLevel - 当前列表嵌套级别
             * @returns {Promise<string>} 节点的Markdown字符串
             */
            const processNode = async (node, listLevel = 0) => {
                let result = "";
                const ELEMENT_NODE = 1;
                const TEXT_NODE = 3;
                const COMMENT_NODE = 8;

                switch (node.nodeType) {
                    case ELEMENT_NODE:
                        // 处理元素节点
                        switch (node.tagName.toLowerCase()) {
                            case "h1":
                            case "h2":
                            case "h3":
                            case "h4":
                            case "h5":
                            case "h6":
                                {
                                    const htype = Number(node.tagName[1]);

                                    // FIX: 修复该页面中，hx标签的内容中有其他标签，而这里直接使用了textContent，造成内容丢失的BUG
                                    // URL: https://blog.csdn.net/naozibuok/article/details/142671763
                                    // <<< FIX BEGIN >>>

                                    // 不再直接使用textContent
                                    // result += `${"#".repeat(htype)} ${node.textContent.trim()}\n\n`;

                                    // 移除节点内部开头的 <a> 标签
                                    node.querySelectorAll("a").forEach((aTag) => {
                                        if (aTag && aTag.textContent.trim() === "") {
                                            aTag.remove();
                                        }
                                    });
                                    // // 创建一个浮动的div元素，作为打印hx标签的内容，因为console.log被重写了
                                    // let hxContent = document.getElementById("hxContent");
                                    // if (!hxContent) {
                                    //     hxContent = document.createElement("div");
                                    //     hxContent.id = "hxContent";
                                    //     hxContent.style.position = "absolute";
                                    //     hxContent.style.left = "0";
                                    //     hxContent.style.top = "0";
                                    //     hxContent.style.zIndex = "9999";
                                    //     hxContent.style.backgroundColor = "lightgray";
                                    //     hxContent.style.border = "1px solid black";
                                    //     hxContent.style.padding = "10px";
                                    //     hxContent.style.width = "auto";
                                    //     hxContent.style.height = "auto";
                                    //     hxContent.style.whiteSpace = "pre-wrap";
                                    //     hxContent.style.fontSize = "16px";
                                    //     document.body.appendChild(hxContent);
                                    // }
                                    // hxContent.innerHTML += node.nodeType + " " + node.tagName + "<br>";
                                    // hxContent.innerHTML += `Original: <br><textarea readonly rows="3" cols="100">${node.outerHTML}</textarea><br>`;
                                    // 处理节点内部元素，包括hx标签的文本
                                    let childContent = await processChildren(node, listLevel);
                                    // hxContent.innerHTML += `Processed: <br><textarea readonly rows="3" cols="100">${childContent}</textarea><br>`;
                                    const hPrefix = "#".repeat(htype);
                                    // 按行分割分别处理。
                                    // 如果该行内容不为空，则添加前缀。
                                    childContent = childContent
                                        .split("\n")
                                        .map((line) => {
                                            if (line.trim() !== "") {
                                                // 如果该行内容是 <img /> 标签，则不添加前缀
                                                if (
                                                    line.trim().search("<img") !== -1 &&
                                                    line.trim().search("/>") !== -1
                                                ) {
                                                    return line;
                                                }
                                                return `${hPrefix} ${line}`;
                                            } else {
                                                return line;
                                            }
                                        })
                                        .join("\n");
                                    // hxContent.innerHTML += `Markdown: <br><textarea readonly rows="1" cols="100">${childContent.replaceAll(
                                    //     "\n",
                                    //     "\\n"
                                    // )}</textarea><br><hr>`;
                                    result += `${childContent}${CONSTANT_DOUBLE_NEW_LINE}`;
                                    // <<< FIX END >>>
                                }
                                break;
                            case "p":
                                {
                                    const cls = node.getAttribute("class");
                                    const style = node.getAttribute("style");
                                    if (cls && cls.includes("img-center")) {
                                        // Same as <center> tag
                                        node.childNodes.forEach((child) => {
                                            if (
                                                child.nodeType === ELEMENT_NODE &&
                                                child.tagName.toLowerCase() === "img"
                                            ) {
                                                if (!child.getAttribute("src").includes("#pic_center")) {
                                                    child.setAttribute(
                                                        "src",
                                                        child.getAttribute("src") + "#pic_center"
                                                    );
                                                }
                                            }
                                        });
                                        result += await processChildren(node, listLevel);
                                        result += CONSTANT_DOUBLE_NEW_LINE;
                                        break;
                                    }
                                    if (node.getAttribute("id") === "main-toc") {
                                        if (enableTOC) {
                                            result += `**目录**\n\n[TOC]\n\n`;
                                        }
                                        break;
                                    }
                                    let text = await processChildren(node, listLevel);
                                    if (style) {
                                        if (style.includes("padding-left")) {
                                            break;
                                        }
                                        if (style.includes("text-align:center")) {
                                            text = `<div style="text-align:center;">${Utils.shrinkHtml(
                                                node.innerHTML
                                            )}</div>\n\n`;
                                        } else if (style.includes("text-align:right")) {
                                            text = `<div style="text-align:right;">${Utils.shrinkHtml(
                                                node.innerHTML
                                            )}</div>\n\n`;
                                        } else if (style.includes("text-align:justify")) {
                                            text += "\n\n";
                                        } else {
                                            text += "\n\n";
                                        }
                                    } else {
                                        text += "\n\n";
                                    }
                                    result += text;
                                }
                                break;
                            case "strong":
                            case "b":
                                result += `${SEPARATION_BEAUTIFICATION}**${SpecialTrim(
                                    await processChildren(node, listLevel)
                                )}**${SEPARATION_BEAUTIFICATION}`;
                                break;
                            case "em":
                            case "i":
                                result += `${SEPARATION_BEAUTIFICATION}*${SpecialTrim(
                                    await processChildren(node, listLevel)
                                )}*${SEPARATION_BEAUTIFICATION}`;
                                break;
                            case "u":
                                result += `${SEPARATION_BEAUTIFICATION}<u>${SpecialTrim(
                                    await processChildren(node, listLevel)
                                )}</u>${SEPARATION_BEAUTIFICATION}`;
                                break;
                            case "s":
                            case "strike":
                                result += `${SEPARATION_BEAUTIFICATION}~~${SpecialTrim(
                                    await processChildren(node, listLevel)
                                )}~~${SEPARATION_BEAUTIFICATION}`;
                                break;
                            case "a":
                                {
                                    const node_class = node.getAttribute("class");
                                    if (node_class && node_class.includes("footnote-backref")) {
                                        break;
                                    }
                                    const href = node.getAttribute("href") || "";
                                    if (node_class && node_class.includes("has-card")) {
                                        const desc = node.title || "";
                                        result += `[${desc}](${href}) `;
                                        break;
                                    }
                                    const text = await processChildren(node, listLevel);
                                    if (
                                        href.includes("https://so.csdn.net/so/search") &&
                                        GM_getValue("removeCSDNSearchLink")
                                    ) {
                                        result += `${text}`;
                                        break;
                                    }
                                    result += `${SEPARATION_BEAUTIFICATION}[${text}](${href})${SEPARATION_BEAUTIFICATION}`;
                                }
                                break;
                            case "img":
                                {
                                    let src = node.getAttribute("src") || "";
                                    const alt = node.getAttribute("alt") || "";
                                    const cls = node.getAttribute("class") || "";
                                    const width = node.getAttribute("width") || "";
                                    const height = node.getAttribute("height") || "";

                                    if (cls.includes("mathcode")) {
                                        result += `${SEPARATION_BEAUTIFICATION}\$\$\n${alt}\n\$\$`;
                                    } else {
                                        if (src.includes("#pic_center") || GM_getValue("forceImageCentering")) {
                                            result += CONSTANT_DOUBLE_NEW_LINE;
                                        } else {
                                            result += " ";
                                        }
                                        if (GM_getValue("saveWebImages")) {
                                            src = await this.fileManager.saveWebImageToLocal(
                                                src,
                                                mdAssetDirName,
                                                img_prefix
                                            );
                                        }
                                        if (height && GM_getValue("enableImageSize")) {
                                            // 如果 height 是数字，则添加 px
                                            // 如果带有单位，则直接使用
                                            const heightValue = height.replace(/[^0-9]/g, "");
                                            const heightUnit = height.replace(/[0-9]/g, "") || "px";
                                            const heightStyle = heightValue
                                                ? `max-height:${heightValue}${heightUnit};`
                                                : "";
                                            result += `<img src="${src}" alt="${alt}" style="${heightStyle} box-sizing:content-box;" />`;
                                        } else if (width && GM_getValue("enableImageSize")) {
                                            // 如果 width 是数字，则添加 px
                                            // 如果带有单位，则直接使用
                                            const widthValue = width.replace(/[^0-9]/g, "");
                                            const widthUnit = width.replace(/[0-9]/g, "") || "px";
                                            const widthStyle = widthValue ? `max-width:${widthValue}${widthUnit};` : "";
                                            result += `<img src="${src}" alt="${alt}" style="${widthStyle} box-sizing:content-box;" />`;
                                        } else {
                                            result += `![${alt}](${src})`;
                                        }
                                        result += CONSTANT_DOUBLE_NEW_LINE;
                                    }
                                }
                                break;
                            case "ul":
                                result += await processList(node, listLevel, false);
                                break;
                            case "ol":
                                result += await processList(node, listLevel, true);
                                break;
                            case "blockquote":
                                {
                                    const text = (await processChildren(node, listLevel))
                                        .trim()
                                        .split("\n")
                                        .map((line) => (line ? `> ${line}` : "> "))
                                        .join("\n");
                                    result += `${text}\n\n`;
                                }
                                break;
                            case "pre":
                                {
                                    const codeNode = node.querySelector("code");
                                    if (codeNode) {
                                        const className = codeNode.className || "";
                                        let language = "";
                                        // 新版本的代码块，class含有language-xxx
                                        if (className.includes("language-")) {
                                            const languageMatch = className.split(" ");
                                            // 找到第一个language-开头的字符串
                                            for (const item of languageMatch) {
                                                if (item.startsWith("language-")) {
                                                    language = item;
                                                    break;
                                                }
                                            }
                                            language = language.replace("language-", "");
                                        }
                                        // 老版本的代码块
                                        else if (className.startsWith("hljs")) {
                                            const languageMatch = className.split(" ");
                                            language = languageMatch ? languageMatch[1] : "";
                                        }
                                        result += `\`\`\`${language}\n${await processCodeBlock(codeNode)}\`\`\`\n\n`;
                                    } else {
                                        console.warn("Code block without <code> element:", node.outerHTML);
                                        const codeText = node.textContent.replace(/^\s+|\s+$/g, "");
                                        result += `\`\`\`\n${codeText}\n\`\`\`\n\n`;
                                    }
                                }
                                break;
                            case "code":
                                {
                                    const codeText = node.textContent;
                                    result += `${SEPARATION_BEAUTIFICATION}\`${codeText}\`${SEPARATION_BEAUTIFICATION}`;
                                }
                                break;
                            case "hr":
                                if (node.getAttribute("id") !== "hr-toc") {
                                    result += `---\n\n`;
                                }
                                break;
                            case "br":
                                result += `\n`;
                                break;
                            case "table":
                                result += (await processTable(node)) + "\n\n";
                                break;
                            case "div":
                                {
                                    const className = node.getAttribute("class") || "";
                                    if (className.includes("csdn-video-box")) {
                                        const iframe = node.querySelector("iframe");
                                        const src = iframe.getAttribute("src") || "";
                                        const title = node.querySelector("p").textContent || "";
                                        const iframeHTML = iframe.outerHTML.replace(
                                            "></iframe>",
                                            ' style="width: 100%; aspect-ratio: 2;"></iframe>'
                                        );
                                        result += `<div align="center" style="border: 3px solid gray;border-radius: 27px;overflow: hidden;"> <a class="link-info" href="${src}" rel="nofollow" title="${title}">${title}</a>${iframeHTML}</div>\n\n`;
                                    } else if (className.includes("toc")) {
                                        const customTitle = node.querySelector("h4")?.textContent || "";
                                        if (enableTOC) {
                                            result += `**${customTitle}**\n\n[TOC]\n\n`;
                                        }
                                    } else {
                                        result += `${await processChildren(node, listLevel)}\n`;
                                    }
                                }
                                break;
                            case "span":
                                {
                                    const node_class = node.getAttribute("class");
                                    if (node_class) {
                                        if (
                                            node_class.includes("katex--inline") ||
                                            node_class.includes("katex--display")
                                        ) {
                                            const katex_mathml_elem = node.querySelector(".katex-mathml");
                                            const katex_html_elem = node.querySelector(".katex-html");
                                            if (katex_mathml_elem !== null && katex_html_elem !== null) {
                                                // 移除.katex-mathml里的.MathJax_Display类，否则会造成错乱
                                                if (
                                                    katex_mathml_elem.querySelector(".MathJax_Display") &&
                                                    katex_mathml_elem.querySelector("script")
                                                ) {
                                                    katex_mathml_elem
                                                        .querySelectorAll(".MathJax_Display")
                                                        .forEach((elem) => elem.remove());
                                                }
                                                if (
                                                    katex_mathml_elem.querySelector(".MathJax_Preview") &&
                                                    katex_mathml_elem.querySelector("script")
                                                ) {
                                                    katex_mathml_elem
                                                        .querySelectorAll(".MathJax_Preview")
                                                        .forEach((elem) => elem.remove());
                                                }
                                                if (
                                                    katex_mathml_elem.querySelector(".MathJax_Error") &&
                                                    katex_mathml_elem.querySelector("script")
                                                ) {
                                                    katex_mathml_elem
                                                        .querySelectorAll(".MathJax_Error")
                                                        .forEach((elem) => elem.remove());
                                                }

                                                const mathml = Utils.clearSpecialChars(katex_mathml_elem.textContent);
                                                const katex_html = Utils.clearSpecialChars(katex_html_elem.textContent);
                                                if (node_class.includes("katex--inline")) {
                                                    if (mathml.startsWith(katex_html)) {
                                                        result += `${SEPARATION_BEAUTIFICATION}\$${mathml.replace(
                                                            katex_html,
                                                            ""
                                                        )}\$${SEPARATION_BEAUTIFICATION}`;
                                                    } else {
                                                        result += `${SEPARATION_BEAUTIFICATION}\$${Utils.clearKatexMathML(
                                                            katex_mathml_elem.textContent
                                                        )}\$${SEPARATION_BEAUTIFICATION}`;
                                                    }
                                                } else {
                                                    if (mathml.startsWith(katex_html)) {
                                                        result += `${CONSTANT_DOUBLE_NEW_LINE}\$\$\n${mathml.replace(
                                                            katex_html,
                                                            ""
                                                        )}\n\$\$${CONSTANT_DOUBLE_NEW_LINE}`;
                                                    } else {
                                                        result += `${CONSTANT_DOUBLE_NEW_LINE}\$\$\n${Utils.clearKatexMathML(
                                                            katex_mathml_elem.textContent
                                                        )}\n\$\$${CONSTANT_DOUBLE_NEW_LINE}`;
                                                    }
                                                }
                                            }
                                            break;
                                        }
                                    }
                                    const style = node.getAttribute("style") || "";
                                    if (
                                        (style.includes("background-color") || style.includes("color")) &&
                                        GM_getValue("enableColorText")
                                    ) {
                                        result += `<span style="${style}">${await processChildren(
                                            node,
                                            listLevel
                                        )}</span>`;
                                    } else {
                                        result += await processChildren(node, listLevel);
                                    }
                                }
                                break;
                            case "kbd":
                                result += `${SEPARATION_BEAUTIFICATION}<kbd>${node.textContent}</kbd>${SEPARATION_BEAUTIFICATION}`;
                                break;
                            case "mark":
                                result += `${SEPARATION_BEAUTIFICATION}<mark>${await processChildren(
                                    node,
                                    listLevel
                                )}</mark>${SEPARATION_BEAUTIFICATION}`;
                                break;
                            case "sub":
                                result += `<sub>${await processChildren(node, listLevel)}</sub>`;
                                break;
                            case "sup":
                                {
                                    const node_class = node.getAttribute("class");
                                    if (node_class && node_class.includes("footnote-ref")) {
                                        result += `[^${node.textContent}]`;
                                    } else {
                                        result += `<sup>${await processChildren(node, listLevel)}</sup>`;
                                    }
                                }
                                break;
                            case "svg":
                                {
                                    const style = node.getAttribute("style");
                                    if (style && style.includes("display: none")) {
                                        break;
                                    }
                                    // 为foreignObject里的div添加属性xmlns="http://www.w3.org/1999/xhtml"，否则typora无法识别
                                    const foreignObjects = node.querySelectorAll("foreignObject");
                                    for (const foreignObject of foreignObjects) {
                                        const divs = foreignObject.querySelectorAll("div");
                                        divs.forEach((div) => {
                                            div.setAttribute("xmlns", "http://www.w3.org/1999/xhtml");
                                        });
                                    }
                                    if (GM_getValue("saveWebImages")) {
                                        const svgSavePath = await this.fileManager.saveSvgToLocal(
                                            node.outerHTML,
                                            mdAssetDirName,
                                            img_prefix
                                        );
                                        result += `![](${svgSavePath})${CONSTANT_DOUBLE_NEW_LINE}`;
                                    } else {
                                        // 检查是否有style标签存在于svg元素内，如果有则转换为base64形式
                                        if (node.querySelector("style")) {
                                            // 将SVG转换为base64编码
                                            const base64 = Utils.svgToBase64(node.outerHTML);
                                            result += `![](data:image/svg+xml;base64,${base64})${CONSTANT_DOUBLE_NEW_LINE}`;
                                        } else {
                                            result += `<div align="center">${node.outerHTML}</div>${CONSTANT_DOUBLE_NEW_LINE}`;
                                        }
                                    }
                                }
                                break;
                            case "section": // 这个是注脚的内容
                                {
                                    const node_class = node.getAttribute("class");
                                    if (node_class && node_class.includes("footnotes")) {
                                        result += await processFootnotes(node);
                                    }
                                }
                                break;
                            case "input":
                                // 仅处理checkbox类型的input元素
                                if (node.getAttribute("type") === "checkbox") {
                                    result += `[${node.checked ? "x" : " "}] `;
                                }
                                break;
                            case "dl":
                                // 自定义列表，直接用html
                                result += `${Utils.shrinkHtml(node.outerHTML)}\n\n`;
                                break;
                            case "abbr":
                                result += `${Utils.shrinkHtml(node.outerHTML)}`;
                                break;
                            case "font":
                                // 避免进入 default : https://blog.csdn.net/azhengye/article/details/8481846
                                result += await processChildren(node, listLevel);
                                break;
                            case "td":
                            case "th":
                                // 处理表格单元格
                                result += await processChildren(node, listLevel);
                                break;
                            case "center":
                                // 处理居中标签
                                if (node.childNodes.length === 1 && node.childNodes[0].nodeType === TEXT_NODE) {
                                    result += `<center>${node.textContent.trim().replace("\n", "<br>")}</center>\n\n`;
                                } else {
                                    node.childNodes.forEach((child) => {
                                        if (child.nodeType === ELEMENT_NODE && child.tagName.toLowerCase() === "img") {
                                            if (!child.getAttribute("src").includes("#pic_center")) {
                                                child.setAttribute("src", child.getAttribute("src") + "#pic_center");
                                            }
                                        }
                                    });
                                    result += await processChildren(node, listLevel);
                                    result += CONSTANT_DOUBLE_NEW_LINE;
                                }
                                break;
                            default:
                                result += await processChildren(node, listLevel);
                                result += CONSTANT_DOUBLE_NEW_LINE;
                                break;
                        }
                        break;
                    case TEXT_NODE:
                        // 处理文本节点（即没有被单独的标签包裹的文本）
                        result += escapeMarkdown(node.textContent);
                        break;
                    case COMMENT_NODE:
                        // 忽略注释
                        break;
                    default:
                        break;
                }
                return result;
            };

            /**
             * 处理给定节点的子节点
             * @param {Node} node - 父节点
             * @param {number} listLevel - 当前列表嵌套级别
             * @returns {Promise<string>} 子节点拼接后的Markdown字符串
             */
            const processChildren = async (node, listLevel) => {
                let text = "";
                for (const child of node.childNodes) {
                    text += await processNode(child, listLevel);
                }
                return text;
            };

            /**
             * 处理列表元素
             * @param {Element} node - 列表元素
             * @param {number} listLevel - 当前列表嵌套级别
             * @param {boolean} ordered - 列表是否有序
             * @returns {Promise<string>} 列表的Markdown字符串
             */
            const processList = async (node, listLevel, ordered) => {
                let text = CONSTANT_DOUBLE_NEW_LINE;
                const children = Array.from(node.children).filter((child) => child.tagName.toLowerCase() === "li");
                for (let index = 0; index < children.length; index++) {
                    const child = children[index];

                    let prefix = ordered ? `${index + 1}. ` : `- `;
                    let indent = ordered ? "   " : "  ";

                    let childText = `${await processChildren(child, listLevel + 1)}`;

                    // 由于缩进，这里必须先替换掉 CONSTANT_DOUBLE_NEW_LINE
                    childText = childText.replace(RE_DOUBLE_NL, "\n\n");

                    childText = childText
                        .split("\n")
                        .map((line, index) => {
                            // 如果是空行，则不添加缩进
                            if (line.trim() === "" || index === 0) {
                                return line;
                            }
                            // 否则添加缩进
                            return `${indent}${line}`;
                        })
                        .join("\n");

                    text += `${prefix}${childText}${CONSTANT_DOUBLE_NEW_LINE}`;
                }
                // text += `\n`;
                return text;
            };

            /**
             * 处理表格
             * @param {Element} node - 包含表格的元素
             * @returns {Promise<string>} 表格的Markdown字符串
             */
            const processTable = async (node) => {
                const rows = Array.from(node.querySelectorAll("tr"));
                if (rows.length === 0) return "";

                let table = "";

                // 处理表头
                const headerCells = Array.from(rows[0].querySelectorAll("th, td"));
                const headers = await Promise.all(
                    headerCells.map(async (cell) => (await processNode(cell)).trim().replaceAll(RE_DOUBLE_NL, "<br />"))
                );
                table += `| ${headers.join(" | ")} |\n`;

                // 处理分隔符
                const alignments = headerCells.map((cell) => {
                    const align = cell.getAttribute("align");
                    if (align === "center") {
                        return ":---:";
                    } else if (align === "right") {
                        return "---:";
                    } else if (align === "left") {
                        return ":---";
                    } else {
                        return ":---:";
                    }
                });
                table += `|${alignments.join("|")}|\n`;

                // 处理表格内容
                for (let i = 1; i < rows.length; i++) {
                    const cells = Array.from(rows[i].querySelectorAll("td"));
                    const row = await Promise.all(
                        cells.map(async (cell) => (await processNode(cell)).trim().replaceAll(RE_DOUBLE_NL, "<br />"))
                    );
                    table += `| ${row.join(" | ")} |`;
                    if (i < rows.length - 1) {
                        table += "\n";
                    }
                }
                return table;
            };

            /**
             * 处理代码块
             * @param {Element} codeNode - 包含代码的元素
             * @returns {Promise<string>} 代码块的Markdown字符串
             */
            const processCodeBlock = async (codeNode) => {
                // 查找code内部是否有ol元素
                const node = codeNode.querySelector("ol");

                // 确保传入的节点是一个<ol>元素
                if (!node || node.tagName.toLowerCase() !== "ol") {
                    // 如果没有ol元素，则说明是老版本，直接返回codeNode的textContent
                    return codeNode.textContent.replace(/\n$/, "") + "\n";
                }

                // 获取所有<li>子元素
                const listItems = node.querySelectorAll("li");
                let result = "";

                // 遍历每个<li>元素
                listItems.forEach((li) => {
                    result += li.textContent;
                    result += "\n";
                });

                return result;
            };

            /**
             * 处理脚注
             * @param {Element} node - 包含脚注的元素
             * @returns {Promise<string>} 脚注的Markdown字符串
             */
            const processFootnotes = async (node) => {
                const footnotes = Array.from(node.querySelectorAll("li"));
                let result = "";

                for (let index = 0; index < footnotes.length; index++) {
                    const li = footnotes[index];
                    const text = (await processNode(li)).replaceAll("\n", " ").replaceAll("↩︎", "").trim();
                    result += `[^${index + 1}]: ${text}\n`;
                }

                return result;
            };

            let markdown = "";
            for (const child of articleElement.childNodes) {
                markdown += await processNode(child);
            }
            markdown = markdown.trim();

            markdown = markdown
                .replaceAll(RE_DOUBLE_NL, "\n\n") // 1. 吃掉前后重复换行和标记，统一为两个换行
                .replaceAll(RE_SEP_NOLINE, " ") // 2.a 非换行前的标记串 → 空格
                .replaceAll(RE_SEP_WITHNL, "$1"); // 2.b 换行后的标记串 → 保留换行

            return markdown;
        }
    }

    /**
     * 模块: 文章下载管理
     * 协调各模块完成文章下载功能
     */
    class ArticleDownloader {
        /**
         * @param {FileManager} fileManager
         * @param {MarkdownConverter} markdownConverter
         * @param {UIManager} uiManager
         */
        constructor(fileManager, markdownConverter, uiManager) {
            /** @type {FileManager} */
            this.fileManager = fileManager;
            /** @type {MarkdownConverter} */
            this.markdownConverter = markdownConverter;
            /** @type {UIManager} */
            this.uiManager = uiManager;
        }

        /**
         * 解析网页并转换为Markdown格式
         * @param {Document} doc_body - 文章的body元素
         * @param {boolean} getZip - 是否下载为ZIP
         * @param {string} url - 文章URL
         * @param {string} prefix - 文件前缀
         */
        async parseArticle(doc_body, getZip = false, url = "", prefix = "") {
            const articleTitle = doc_body.querySelector("#articleContentId")?.textContent.trim() || "未命名文章";
            const articleInfo =
                doc_body
                    .querySelector(".bar-content")
                    ?.textContent.replace(/\s{2,}/g, " ")
                    .trim() || "";
            const htmlInput = doc_body.querySelector("#content_views");
            if (!htmlInput) {
                alert("未找到文章内容。");
                return;
            }

            let mode = GM_getValue("parallelDownload") ? "并行" : "串行";
            mode += GM_getValue("fastDownload") ? "快速" : "完整";
            this.uiManager.showFloatTip(`正在以${mode}模式解析文章：` + articleTitle);

            if (url === "") {
                url = window.location.href;
            }
            url = Utils.clearUrl(url);

            let markdown = await this.markdownConverter.htmlToMarkdown(
                htmlInput,
                GM_getValue("mergeArticleContent") || GM_getValue("saveAllImagesToAssets")
                    ? "assets"
                    : GM_getValue("addSerialNumber")
                    ? `${prefix}${articleTitle}`
                    : `${articleTitle}`,
                !GM_getValue("mergeArticleContent"),
                GM_getValue("mergeArticleContent") || GM_getValue("saveAllImagesToAssets") ? prefix : ""
            );

            if (GM_getValue("addArticleInfoInBlockquote")) {
                markdown = `> ${articleInfo}\n> 文章链接：${url}\n\n${markdown}`;
            }

            if (GM_getValue("addArticleTitleToMarkdown")) {
                if (GM_getValue("addSerialNumberToTitle")) {
                    markdown = `# ${prefix}${articleTitle}\n\n${markdown}`;
                } else {
                    markdown = `# ${articleTitle}\n\n${markdown}`;
                }
            }

            if (GM_getValue("addArticleInfoInYaml")) {
                const article_info_box = doc_body.querySelector(".article-info-box");
                // 文章标题
                const meta_title = GM_getValue("addSerialNumberToTitle") ? `${prefix}${articleTitle}` : articleTitle;
                // 文章日期 YYYY-MM-DD HH:MM:SS
                const meta_date =
                    article_info_box
                        .querySelector(".time")
                        ?.textContent.match(/\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/)[0] || "";
                let articleMeta = `title: ${meta_title}\ndate: ${meta_date}\n`;

                // 文章分类和标签
                const meta_category_and_tags = Array.from(article_info_box.querySelectorAll(".tag-link")) || [];
                if (meta_category_and_tags.length > 0 && article_info_box.textContent.includes("分类专栏")) {
                    articleMeta += `categories:\n- ${meta_category_and_tags[0].textContent}\n`;
                    meta_category_and_tags.shift();
                }
                if (meta_category_and_tags.length > 0 && article_info_box.textContent.includes("文章标签")) {
                    articleMeta += `tags:\n${Array.from(meta_category_and_tags)
                        .map((tag) => `- ${tag.textContent}`)
                        .join("\n")}\n`;
                }
                markdown = `---\n${articleMeta}---\n\n${markdown}`;
            }

            // 从prefix中获取序号
            let index = 0;
            if (prefix !== "" && prefix.endsWith("_")) {
                index = Number(prefix.slice(0, -1));
            }
            // 如果是批量下载，则需要添加序号
            const saveFileName = GM_getValue("addSerialNumber") ? `${prefix}${articleTitle}.md` : `${articleTitle}.md`;
            await this.fileManager.saveTextAsFile(markdown, saveFileName, index);

            if (getZip) {
                await this.fileManager.saveAllFileToZip(
                    `${prefix}${articleTitle}`,
                    (info_string) => {
                        this.uiManager.showFloatTip(info_string);
                    },
                    (info_string) => {
                        this.uiManager.enableFloatWindow();
                        this.uiManager.showFloatTip(info_string, 3000);
                    }
                );
            }
        }

        /**
         * 在iframe中下载文章
         * @param {string} url - 文章URL
         * @param {string} prefix - 文件前缀
         * @returns {Promise<void>}
         */
        async downloadArticleInIframe(url, prefix = "") {
            return new Promise((resolve, reject) => {
                const originalUrl = url; // 保存原始URL
                let isRedirected = false; // 重置重定向标志

                const onCheckPassed = () => {
                    // 创建一个隐藏的iframe
                    const iframe = document.createElement("iframe");
                    iframe.style.display = "none"; // 隐藏iframe
                    document.body.appendChild(iframe);
                    iframe.src = url;

                    // 监听iframe加载完成事件
                    iframe.onload = async () => {
                        console.dir("iframe加载完成，开始下载文章：", url);
                        try {
                            const doc = iframe.contentDocument || iframe.contentWindow.document;
                            // 调用解析函数
                            await this.parseArticle(doc.body, false, url, prefix);
                            // 移除iframe
                            document.body.removeChild(iframe);
                            resolve();
                        } catch (error) {
                            // 在发生错误时移除iframe并拒绝Promise
                            document.body.removeChild(iframe);
                            console.dir("(downloadArticleInIframe) 解析文章时出错：", error);
                            error.message += `(downloadArticleInIframe) 解析文章时出错：Url: ${url} OriginalUrl: ${originalUrl} Redirected: ${isRedirected}`;
                            reject(error);
                        }
                    };

                    // 监听iframe加载错误事件
                    iframe.onerror = (error) => {
                        document.body.removeChild(iframe);
                        console.dir("(downloadArticleInIframe) Iframe加载失败：", url, error);
                        error.message += `(downloadArticleInIframe) Iframe加载失败：Url: ${url} OriginalUrl: ${originalUrl} Redirected: ${isRedirected}`;
                        reject(error);
                    };
                };

                // FIX: 使用 GM_xmlhttpRequest 检测是否存在重定向
                // https://github.com/Qalxry/csdn2md/issues/6
                // https://github.com/Qalxry/csdn2md/issues/7
                GM_xmlhttpRequest({
                    method: "HEAD",
                    url: url,
                    redirect: "manual", // 禁止自动重定向
                    onload: function (response) {
                        if (response.status === 301 || response.status === 302) {
                            const redirectUrl = response.responseHeaders.match(/Location:\s*(.+)/i)?.[1];
                            console.dir(`(downloadArticleInIframe) 检测到重定向: ${url} -> ${redirectUrl}`);
                            isRedirected = true; // 设置重定向标志
                            // 将 http 替换为 https
                            url = redirectUrl.replace(/^http:\/\//, "https://");
                        } else if (response.status !== 200) {
                            console.dir(
                                `(downloadArticleInIframe) 文章页面状态码异常：Url: ${url} Response Status: ${response.status}`
                            );
                            const error = new Error(
                                `(downloadArticleInIframe) 文章页面状态码异常：Url: ${url} Response Status: ${response.status}`
                            );
                            reject(error);
                        } else {
                            console.dir("(downloadArticleInIframe) 文章页面加载成功：", url);
                        }
                        onCheckPassed(); // 检测通过，开始下载
                    },
                    onerror: function (error) {
                        console.dir(`(downloadArticleInIframe) 无法加载文章页面：`, url, error);
                        error.message += `(downloadArticleInIframe) 无法加载文章页面：Url: ${url}`;
                        reject(error);
                    },
                });
            });
        }

        /**
         * 从URL批量下载文章
         * @param {string} url - 文章URL
         * @param {string} prefix - 文件前缀
         */
        async downloadArticleFromURL(url, prefix = "") {
            if (GM_getValue("fastDownload")) {
                const response = await fetch(url);
                const text = await response.text();
                const parser = new DOMParser();
                const doc = parser.parseFromString(text, "text/html");
                // 调用解析函数
                await this.parseArticle(doc.body, false, url, prefix);
            } else {
                await this.downloadArticleInIframe(url, prefix);
            }
        }

        /**
         * 下载专栏的全部文章为Markdown格式
         */
        async downloadCategory() {
            // 获取专栏id，注意url可能是/category_数字.html或/category_数字_数字.html，需要第一个数字
            this.uiManager.showFloatTip("正在获取专栏的全部文章链接...");
            const base_url = window.location.href;
            const category_id = base_url.match(/category_(\d+)(?:_\d+)?\.html/)[1];
            const url_list = [];
            let page = 1;
            let doc_body = document.body;

            while (true) {
                let hasNextArticle = false;
                // 获取当前页面的文章列表
                doc_body
                    .querySelector(".column_article_list")
                    .querySelectorAll("a")
                    .forEach((item) => {
                        url_list.push(item.href);
                        hasNextArticle = true;
                    });
                if (!hasNextArticle) break;

                // 下一页
                page++;
                const next_url = base_url.replace(
                    /category_\d+(?:_\d+)?\.html/,
                    `category_${category_id}_${page}.html`
                );
                const response = await fetch(next_url);
                const text = await response.text();
                const parser = new DOMParser();
                doc_body = parser.parseFromString(text, "text/html").body;
            }

            if (url_list.length === 0) {
                this.uiManager.showFloatTip("没有找到文章。");
                return;
            } else {
                this.uiManager.showFloatTip(`找到 ${url_list.length} 篇文章。开始解析...`);
            }

            // 下载每篇文章
            const prefixMaxLength = url_list.length.toString().length;
            if (GM_getValue("parallelDownload")) {
                // await Promise.all(
                //     url_list.map((url, index) =>
                //         this.downloadArticleFromURL(
                //             url,
                //             `${String(url_list.length - index).padStart(prefixMaxLength, "0")}_`
                //         )
                //     )
                // );
                await Utils.parallelPool(url_list, (url, index) =>
                    this.downloadArticleFromURL(
                        url,
                        `${String(url_list.length - index).padStart(prefixMaxLength, "0")}_`
                    )
                );
            } else {
                for (let i = 0; i < url_list.length; i++) {
                    await this.downloadArticleFromURL(
                        url_list[i],
                        `${String(url_list.length - i).padStart(prefixMaxLength, "0")}_`
                    );
                }
            }

            let extraPrefix = "";
            if (GM_getValue("addArticleTitleToMarkdown")) {
                extraPrefix += `# ${document.title}\n\n`;
            }
            if (GM_getValue("addArticleInfoInBlockquote_batch")) {
                const batchTitle = document.body.querySelector(".column_title")?.textContent.trim() || "";
                const batchDesc = document.body.querySelector(".column_text_desc")?.textContent.trim() || "";
                const batchColumnData =
                    document.body
                        .querySelector(".column_data")
                        ?.textContent.replace(/\s{2,}/g, " ")
                        .trim() || "";
                const batchAuthor =
                    document.body
                        .querySelector(".column_person_tit")
                        ?.textContent.replace(/\s{2,}/g, " ")
                        .trim() || "";
                const batchUrl = Utils.clearUrl(base_url);
                extraPrefix += `> ${batchDesc}\n> ${batchAuthor} ${batchColumnData}\n${batchUrl}\n\n`;
            }

            if (GM_getValue("mergeArticleContent")) {
                this.fileManager.mergeArticleContent(`${document.title}`, extraPrefix);
            }

            if (GM_getValue("zipCategories")) {
                await this.fileManager.saveAllFileToZip(
                    `${document.title}`,
                    (info_string) => {
                        this.uiManager.showFloatTip(info_string);
                    },
                    (info_string) => {
                        this.uiManager.enableFloatWindow();
                        this.uiManager.showFloatTip(info_string, 3000);
                    }
                );
            } else {
                if (GM_getValue("mergeArticleContent")) {
                    this.fileManager.downloadMergedArticle();
                }
                this.uiManager.showFloatTip("专栏文章全部处理完毕，请等待下载结束。", 3000);
            }
        }

        /**
         * 下载用户的全部文章为Markdown格式
         */
        async downloadUserAllArticles() {
            const mainContent = document.body.querySelector(".mainContent");
            const url_list = [];

            // 获取用户原始ID
            // <link rel="canonical" href="https://blog.csdn.net/yanglfree">
            async function getUrlListFromAPI() {
                let user_id = document.querySelector("link[rel='canonical']")?.href.match(/\/([^\/]+)$/)?.[1];
                if (!user_id) {
                    console.dir(`Warning: 无法从canonical链接中获取用户ID。`);
                    user_id = document.querySelector(".blog-second-rss-btn a")?.href.match(/\/([^\/]+)\/rss/)?.[1];
                    if (!user_id) {
                        console.dir(`Warning: 无法从RSS链接中获取用户ID。`);
                        throw new Error("无法获取用户ID，请检查页面是否正确。");
                    }
                }
                // 使用 API 获取文章列表
                // https://blog.csdn.net/community/home-api/v1/get-business-list?page=1&size=20&businessType=blog&orderby=&noMore=false&year=&month=&username=yanglfree
                const temp_url_list = [];
                let total_articles = 0;
                let page = 1;

                do {
                    console.dir(
                        `正在获取第 ${page} 页文章链接: https://blog.csdn.net/community/home-api/v1/get-business-list?page=${page}&size=100&businessType=blog&orderby=&noMore=false&year=&month=&username=${user_id}`
                    );
                    const response = await (
                        await fetch(
                            `https://blog.csdn.net/community/home-api/v1/get-business-list?page=${page}&size=100&businessType=blog&orderby=&noMore=false&year=&month=&username=${user_id}`
                        )
                    ).json();
                    if (total_articles === 0) total_articles = response.data.total;
                    if (response.data.list.length === 0) break;
                    temp_url_list.push(...response.data.list.map((item) => item.url));
                    console.dir(
                        `获取到第 ${page} 页 ${response.data.list.length} 篇文章链接 (${temp_url_list.length} / ${total_articles}):`
                    );
                    page++;
                } while (temp_url_list.length < total_articles);

                return temp_url_list;
            }

            try {
                const res = await getUrlListFromAPI();
                if (res.length === 0) {
                    console.dir("从API获取文章列表失败，尝试从页面获取文章链接。", error);
                } else {
                    url_list.push(...res);
                    console.dir(`从API获取到 ${url_list.length} 篇文章链接。`);
                }
            } catch (error) {
                console.dir("从API获取文章列表失败，尝试从页面获取文章链接。", error);
            }

            // 如果API获取失败，则从页面获取文章链接
            if (url_list.length === 0) {
                this.uiManager.showFloatTip("正在获取用户全部文章链接。可能需要进行多次页面滚动，请耐心等待。");
                const url_set = new Set();
                while (true) {
                    // 等待2秒，等待页面加载完成
                    await new Promise((resolve) => setTimeout(resolve, 2000));
                    window.scrollTo({
                        top: document.body.scrollHeight,
                        behavior: "smooth",
                    });

                    let end = true;
                    mainContent.querySelectorAll("article").forEach((item) => {
                        const url = item.querySelector("a").href;
                        if (!url_set.has(url)) {
                            url_list.push(url);
                            url_set.add(url);
                            end = false;
                        }
                    });

                    if (end) break;
                }
                // 滚回顶部
                window.scrollTo({
                    top: 0,
                    behavior: "smooth",
                });
            }

            if (url_list.length === 0) {
                this.uiManager.showFloatTip("没有找到文章。");
            } else {
                this.uiManager.showFloatTip(`找到 ${url_list.length} 篇文章。开始解析...`);
            }

            // 下载每篇文章
            const prefixMaxLength = url_list.length.toString().length;
            if (GM_getValue("parallelDownload")) {
                // await Promise.all(
                //     url_list.map((url, index) =>
                //         this.downloadArticleFromURL(
                //             url,
                //             `${String(url_list.length - index).padStart(prefixMaxLength, "0")}_`
                //         )
                //     )
                // );
                await Utils.parallelPool(url_list, (url, index) =>
                    this.downloadArticleFromURL(
                        url,
                        `${String(url_list.length - index).padStart(prefixMaxLength, "0")}_`
                    )
                );
            } else {
                for (let i = 0; i < url_list.length; i++) {
                    await this.downloadArticleFromURL(
                        url_list[i],
                        `${String(url_list.length - i).padStart(prefixMaxLength, "0")}_`
                    );
                }
            }

            let extraPrefix = "";
            if (GM_getValue("addArticleTitleToMarkdown")) {
                extraPrefix += `# ${document.title}\n\n`;
            }
            if (GM_getValue("addArticleInfoInBlockquote_batch")) {
                const batchUrl = Utils.clearUrl(window.location.href);
                extraPrefix += `> ${batchUrl}\n\n`;
            }

            if (GM_getValue("mergeArticleContent")) {
                this.fileManager.mergeArticleContent(`${document.title}`, extraPrefix);
            }

            if (GM_getValue("zipCategories")) {
                await this.fileManager.saveAllFileToZip(
                    `${document.title}`,
                    (info_string) => {
                        this.uiManager.showFloatTip(info_string);
                    },
                    (info_string) => {
                        this.uiManager.enableFloatWindow();
                        this.uiManager.showFloatTip(info_string, 3000);
                    }
                );
            } else {
                if (GM_getValue("mergeArticleContent")) {
                    this.fileManager.downloadMergedArticle();
                }
                this.uiManager.showFloatTip("用户全部文章处理完毕，请等待下载结束。", 3000);
            }
        }

        mainErrorHandler(error) {
            // 使用对话框
            const now = new Date();
            const timeStr = now
                .toISOString()
                .replace("T", " ")
                .replace(/\.\d+Z$/, "");

            const script_config = {};
            this.uiManager.optionCheckBoxList.forEach((optionElem) => {
                script_config[optionElem.id.replace("Checkbox", "")] = optionElem.checked;
            });

            // More detailed error capturing with formatted stack trace
            let errorDetails = "";
            if (error instanceof Error) {
                errorDetails += `name: ${error.name}\n`;
                errorDetails += `message: ${error.message}\n`;

                // Format stack trace to be more readable
                if (error.stack) {
                    errorDetails += "stack trace:\n";
                    const stackLines = error.stack.split("\n");

                    // Process each line of the stack trace
                    stackLines.forEach((line) => {
                        // Extract the relevant parts from each stack line
                        const match = line.match(/([^@\s]+)@(.*?):(\d+):(\d+)/);
                        if (match) {
                            const [_, functionName, filePath, lineNum, colNum] = match;

                            // Get just the filename from the path
                            const fileName = filePath.split("/").pop().split("?")[0];

                            // filename 里被编码为url的特殊字符需要解码，以便查看
                            const decodedFileName = decodeURIComponent(fileName);

                            // Add formatted line to error details
                            errorDetails += `  → func:${functionName} (file:${decodedFileName}@line:${lineNum}@col:${colNum})\n`;
                        } else {
                            // For lines that don't match the pattern, include them as is
                            errorDetails += `  ${line.trim()}\n`;
                        }
                    });
                }

                // Capture custom properties
                for (const key in error) {
                    if (
                        Object.prototype.hasOwnProperty.call(error, key) &&
                        key !== "stack" &&
                        key !== "message" &&
                        key !== "name"
                    ) {
                        errorDetails += `${key}: ${JSON.stringify(error[key])}\n`;
                    }
                }
            } else if (typeof error === "object" && error !== null) {
                errorDetails = JSON.stringify(error, null, 2);
            } else {
                errorDetails = String(error);
            }
            errorDetails = errorDetails.trim();

            this.uiManager.showConfirmDialog(
                `下载文章时出错！是否前往Github提交Issue以告知开发者进行修复？（您需要拥有Github账号）\n错误详情：\n${errorDetails}`,
                () =>
                    this.uiManager.gotoGithubIssue(
                        `[BUG] 下载失败 (${getCurrentPageType()}页面)`,
                        `#### 时间\n\n${timeStr}\n\n#### 错误内容\n\n\`\`\`\n${errorDetails}\n\`\`\`\n\n#### 其他信息\n\n- URL：\`${
                            window.location.href
                        }\`\n- 脚本版本：\`${GM_info.script.version}\`\n- 脚本配置：\n\`\`\`json\n${JSON.stringify(
                            script_config,
                            null,
                            4
                        )}\n\`\`\`\n`
                    ),
                this.uiManager.showFloatTip("感谢您的反馈！", 2000),
                () => {
                    this.uiManager.showFloatTip("已取消。", 2000);
                    console.error("下载文章时出错：", error);
                }
            );
        }

        /**
         * 主函数 - 下载文章入口
         */
        async runMain() {
            this.uiManager.disableFloatWindow();
            const url_type = getCurrentPageType();
            try {
                switch (url_type) {
                    case "unknown":
                        alert("无法识别的页面。请确保在CSDN文章页面、专栏文章列表页面或用户全部文章列表页面。");
                        break;
                    case "article":
                        // 文章页面
                        // 由于单篇文章无需合并，所以这里需要将mergeArticleContent设置为false
                        const mergeArticleContentSetting = GM_getValue("mergeArticleContent");
                        GM_setValue("mergeArticleContent", false);
                        await this.parseArticle(document.body, GM_getValue("zipCategories"), window.location.href, "");
                        GM_setValue("mergeArticleContent", mergeArticleContentSetting);
                        this.uiManager.showFloatTip("文章下载完毕！", 4000);
                        break;
                    case "category":
                        await this.downloadCategory();
                        break;
                    case "user_all_articles":
                        await this.downloadUserAllArticles();
                        break;
                }
            } catch (error) {
                this.mainErrorHandler(error);
            } finally {
                if (!GM_getValue("zipCategories")) {
                    this.uiManager.enableFloatWindow();
                }
                this.fileManager.reset(); // 重置FileManager
            }
        }
    }

    /**
     * 判断当前页面类型
     * @returns {"category"|"article"|"user_all_articles"|"unknown"}
     */
    function getCurrentPageType() {
        const url = window.location.href;
        if (url.includes("category")) {
            return "category";
        } else if (url.includes("article/details")) {
            return "article";
        } else if (
            url.includes("type=blog") ||
            url.includes("type=lately") ||
            url.match(/^https:\/\/[^.]+\.blog\.csdn\.net\/$/) ||
            url.match(/^https:\/\/blog\.csdn\.net\/[^\/]+\/?$/)
        ) {
            return "user_all_articles";
        } else {
            return "unknown";
        }
    }

    // 初始化应用
    function initApp() {
        // 确保在目标页面
        if (getCurrentPageType() === "unknown") {
            console.dir({
                message: "当前页面不是CSDN文章页面、专栏文章列表页面或用户全部文章列表页面，脚本不会执行。",
                url: window.location.href,
            });
            return;
        }

        const fileManager = new FileManager();
        const markdownConverter = new MarkdownConverter(fileManager);
        const uiManager = new UIManager(fileManager);
        const downloadManager = new ArticleDownloader(fileManager, markdownConverter, uiManager);

        // 设置UI与下载管理器的双向引用
        uiManager.downloadManager = downloadManager;

        // 更新选项状态
        uiManager.updateAllOptions();
    }

    // 启动应用
    initApp();
})();
