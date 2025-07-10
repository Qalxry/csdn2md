// ==UserScript==
// @name         csdn2md - 批量下载CSDN文章为Markdown
// @namespace    http://tampermonkey.net/
// @version      3.2.3
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
// @require      https://cdn.jsdmirror.com/gh/Qalxry/csdn2md/plugins/jszip.min.js#sha256-yeSlK6wYruTz+Q0F+8pgP1sPW/HOjEXmC7TtOiyy7YY=
// @require      https://cdn.jsdmirror.com/gh/Qalxry/csdn2md/plugins/fflate.min.js#sha256-w7NPLp9edNTX1k4BysegwBlUxsQGQU1CGFx7U9aHXd8=
// @require      https://cdn.jsdmirror.com/gh/Qalxry/csdn2md/plugins/streamSaver.min.js#sha256-VxQm++CYEdHipBjKWh4QQHHOYZmyo8F/7dJQxG11xFM=
// ==/UserScript==

(function () {
    "use strict";

    // 需要加载的库及其备用源
    const libsToLoad = {
        JSZip: {
            isLoaded: () => typeof JSZip !== "undefined",
            urls: [
                "https://cdn.jsdelivr.net/gh/Qalxry/csdn2md/plugins/jszip.min.js#sha256-yeSlK6wYruTz+Q0F+8pgP1sPW/HOjEXmC7TtOiyy7YY=",
                "https://cdn.jsdmirror.com/gh/Qalxry/csdn2md/plugins/jszip.min.js#sha256-yeSlK6wYruTz+Q0F+8pgP1sPW/HOjEXmC7TtOiyy7YY=",
                "https://cdnjs.webstatic.cn/ajax/libs/jszip/3.7.1/jszip.min.js#sha256-yeSlK6wYruTz+Q0F+8pgP1sPW/HOjEXmC7TtOiyy7YY=",
                "https://mirrors.sustech.edu.cn/cdnjs/ajax/libs/jszip/3.7.1/jszip.min.js#sha256-yeSlK6wYruTz+Q0F+8pgP1sPW/HOjEXmC7TtOiyy7YY=",
                "https://use.sevencdn.com/ajax/libs/jszip/3.7.1/jszip.min.js#sha256-yeSlK6wYruTz+Q0F+8pgP1sPW/HOjEXmC7TtOiyy7YY=",
                "https://cdn.jsdmirror.com/ajax/libs/jszip/3.7.1/jszip.min.js#sha256-yeSlK6wYruTz+Q0F+8pgP1sPW/HOjEXmC7TtOiyy7YY=",
                "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.7.1/jszip.min.js#sha256-yeSlK6wYruTz+Q0F+8pgP1sPW/HOjEXmC7TtOiyy7YY=",
            ],
        },
        fflate: {
            isLoaded: () => typeof fflate !== "undefined",
            urls: [
                "https://cdn.jsdelivr.net/gh/Qalxry/csdn2md/plugins/fflate.min.js#sha256-w7NPLp9edNTX1k4BysegwBlUxsQGQU1CGFx7U9aHXd8=",
                "https://cdn.jsdmirror.com/gh/Qalxry/csdn2md/plugins/fflate.min.js#sha256-w7NPLp9edNTX1k4BysegwBlUxsQGQU1CGFx7U9aHXd8=",
                "https://npm.webcache.cn/fflate@0.8.2/umd/index.js#sha256-w7NPLp9edNTX1k4BysegwBlUxsQGQU1CGFx7U9aHXd8=",
                "https://use.sevencdn.com/npm/fflate@0.8.2/umd/index.js#sha256-w7NPLp9edNTX1k4BysegwBlUxsQGQU1CGFx7U9aHXd8=",
                "https://cdn.jsdmirror.com/npm/fflate@0.8.2/umd/index.js#sha256-w7NPLp9edNTX1k4BysegwBlUxsQGQU1CGFx7U9aHXd8=",
                "https://unpkg.com/fflate@0.8.2/umd/index.js#sha256-w7NPLp9edNTX1k4BysegwBlUxsQGQU1CGFx7U9aHXd8=",
                "https://cdn.jsdelivr.net/npm/fflate@0.8.2/umd/index.js#sha256-w7NPLp9edNTX1k4BysegwBlUxsQGQU1CGFx7U9aHXd8=",
            ],
        },
        streamSaver: {
            isLoaded: () => typeof streamSaver !== "undefined",
            urls: [
                "https://cdn.jsdelivr.net/gh/Qalxry/csdn2md/plugins/streamSaver.min.js#sha256-VxQm++CYEdHipBjKWh4QQHHOYZmyo8F/7dJQxG11xFM=",
                "https://cdn.jsdmirror.com/gh/Qalxry/csdn2md/plugins/streamSaver.min.js#sha256-VxQm++CYEdHipBjKWh4QQHHOYZmyo8F/7dJQxG11xFM=",
                "https://use.sevencdn.com/npm/streamsaver@2.0.6/StreamSaver.min.js",
                "https://cdn.jsdelivr.net/npm/streamsaver@2.0.6/StreamSaver.min.js",
                "https://cdn.jsdmirror.com/npm/streamsaver@2.0.6/StreamSaver.min.js",
            ],
        },
    };

    // 动态插入脚本
    function loadScript(src) {
        return new Promise((resolve, reject) => {
            const s = document.createElement("script");
            let hash = src.match(/#(.*)$/)?.[1];
            s.src = src;
            if (hash) {
                s.setAttribute("integrity", hash);
                s.setAttribute("crossorigin", "anonymous");
            }
            s.onload = () => {
                resolve();
            };
            s.onerror = () => reject(new Error(`Failed to load ${src.slice(0, 100)}`));
            document.head.appendChild(s);
        });
    }

    // 如果全局对象不存在，就按顺序尝试加载备用源
    (async () => {
        for (const [libName, libData] of Object.entries(libsToLoad)) {
            if (!libData.isLoaded()) {
                console.warn(`${libName} not found, loading from additional sources...`);
                for (const url of libData.urls) {
                    try {
                        await loadScript(url);
                        // 检查是否加载成功
                        if (!libData.isLoaded()) {
                            throw new Error(`not loaded after script injection`);
                        }
                        console.info(`${libName} loaded successfully from ${url}`);
                        break;
                    } catch (e) {
                        console.error(`Failed to load ${libName} from ${url}:`, e);
                    }
                }
            } else {
                console.info(`${libName} is already loaded.`);
            }
        }
    })();

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
                .replaceAll(/[\s]{2,}/g, "")
                .replaceAll(
                    /[\u200B-\u200F\u202A-\u202E\u2060-\u206F\uFEFF\u00AD\u034F\u061C\u180E\u2800\u3164\uFFA0\uFFF9-\uFFFB]/g,
                    ""
                )
                .replaceAll("⎧", "")
                .replaceAll("⎨", "{")
                .replaceAll("⎩", "")
                .replaceAll("⎫", "")
                .replaceAll("⎬", "}")
                .replaceAll("⎭", "")
                .replaceAll("⎡", "[")
                .replaceAll("⎢", "")
                .replaceAll("⎣", "")
                .replaceAll("⎤", "]")
                .replaceAll("⎥", "")
                .replaceAll("⎦", "");
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
            return url.replaceAll(/[?#@!$&'()*+,;=].*$/g, "");
        },

        /**
         * 将文件名转换为安全的文件名
         * @param {string} filename - 原始文件名
         * @returns {string} 安全的文件名
         */
        safeFilename(filename) {
            return filename.replaceAll(/[\\/:*?"<>|]/g, "_");
        },

        /**
         * 压缩HTML内容，移除多余的空白和换行符
         * @param {string} html - 输入的HTML字符串
         * @returns {string} 压缩后的HTML字符串
         */
        shrinkHtml(html) {
            return html
                .replaceAll(/>\s+</g, "><") // 去除标签之间的空白
                .replaceAll(/\s{2,}/g, " ") // 多个空格压缩成一个
                .replaceAll(/^\s+|\s+$/g, ""); // 去除首尾空白
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
                const p = new Promise(async (resolve, reject) => {
                    try {
                        await iteratorFn(item, currentIndex);
                        resolve();
                    } catch (error) {
                        reject(error);
                    }
                });
                ret.push(p);

                if (poolLimit <= array.length) {
                    const e = p.finally(() => executing.splice(executing.indexOf(e), 1));
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

        formatFileSize(bytes) {
            if (bytes === 0) return "0 Bytes";
            const k = 1024;
            const sizes = ["Bytes", "KB", "MB", "GB"];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
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
     * 处理界面相关的功能，支持多种输入类型和分组
     */
    class UIManager {
        /**
         * 创建UI管理器
         **/
        constructor() {
            /** @type {ConfigManager} */
            this.configManager = new ConfigManager(); // 配置管理
            /** @type {ArticleDownloader} */
            this.downloadManager = new ArticleDownloader(); // 下载管理器
            this.downloadManager.setUIManager(this); // 设置UI与下载管理器的双向引用
            this.isDragging = 0;
            this.offsetX = 0;
            this.offsetY = 0;
            this.container = null;
            this.contentBox = null;
            this.mainButton = null;
            this.floatWindow = null;
            this.downloadButton = null;
            this.gotoRepoButton = null;
            this.isOpen = false;
            this.repo_url = "https://github.com/Qalxry/csdn2md";

            // 初始化
            this.initStyles();
            this.initUI();
            this.setupEventListeners();
            this.confirmDialogQueue = [];
            this.confirmDialogActive = false;
            this.updateAllOptions();
        }

        /**
         * 初始化UI样式
         */
        initStyles() {
            GM_addStyle(`
            :root {
                --tm_ui-linear-gradient: linear-gradient(135deg, #12c2e9 0%, #c471ed 50%, #f64f59 100%);
            }

            .tm_floating-container {
                position: fixed;
                bottom: 20px;
                right: 20px;
                z-index: 9999;
                transform-origin: bottom right;
                font-size: 13px;
            }

            .tm_main-button {
                width: 50px;
                height: 50px;
                border-radius: 50%;
                background: var(--tm_ui-linear-gradient);
                box-shadow: 0 0 20px rgba(0,0,0,0.2);
                border: none;
                color: white;
                font-size: 20px;
                cursor: pointer;
                transition: all 0.3s ease;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .tm_content-box {
                background: linear-gradient(45deg, #ffffff, #f8f9fa);
                border-radius: 13px;
                padding: 13px;
                width: 360px;
                box-shadow: 0 7px 20px rgba(0,0,0,0.15);
                margin-bottom: 13px;
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
                gap: 10px;
            }

            #myFloatWindow {
                width: 100%;
                position: relative;
            }

            .tm_ui-options-container {
                max-height: 480px;
                overflow-y: auto;
                padding-right: 5px;
                margin: 10px 0;
                scrollbar-width: thin;
                scrollbar-color: rgba(0,0,0,0.3) transparent;
                position: relative;
            }

            .tm_ui-options-disabled-overlay {
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(240,240,240,0.7);
                z-index: 10;
                display: none;
                border-radius: 8px;
            }

            .tm_ui-options-container::-webkit-scrollbar {
                width: 4px;
            }

            .tm_ui-options-container::-webkit-scrollbar-thumb {
                background-color: rgba(0,0,0,0.3);
                border-radius: 2px;
            }

            .tm_ui-option-group {
                border: 1px solid rgba(0,0,0,0.08);
                border-radius: 6px;
                padding: 0;
                margin-bottom: 7px;
                background: #ffffff;
                box-shadow: 0 1px 2px rgba(0,0,0,0.05);
                overflow: hidden;
                transition: all 0.3s ease;
            }

            .tm_ui-option-group-header {
                padding: 7px 8px;
                cursor: pointer;
                background: rgba(0,0,0,0.02);
                border-bottom: 1px solid rgba(0,0,0,0.08);
                display: flex;
                align-items: center;
                justify-content: space-between;
                user-select: none;
                transition: background 0.2s ease;
            }
            .tm_ui-option-group-header:hover {
                background: rgba(0, 123, 255, 0.05);
            }

            .tm_ui-option-group-title {
                font-weight: 800;
                color: #444;
                flex: 1;
                font-size: 12px;
            }

            .tm_ui-option-group-content {
                padding: 8px;
                overflow: hidden;
                max-height: 0px; /* 设置足够大的展开高度 */
                transition: max-height 0.3s cubic-bezier(0.33, 1, 0.68, 1), padding 0.3s ease, opacity 0.3s ease;
                opacity: 1;
            }

            .tm_ui-option-group-collapsed .tm_ui-option-group-content {
                max-height: 0px;
                padding-top: 0;
                padding-bottom: 0;
                opacity: 0;
            }

            .tm_ui-option-item {
                margin-bottom: 8px;
                display: flex;
                align-items: center;
                flex-wrap: wrap;
            }

            .tm_ui-option-item:last-child {
                margin-bottom: 0;
            }

            .tm_ui-option-label {
                margin-left: 5px;
                flex: 1;
                min-width: 80px;
                font-size: 12px;
            }

            .tm_ui-input-container {
                display: flex;
                align-items: center;
                flex: 1;
                max-width: 100px;
            }

            .tm_ui-tooltip {
                position: relative;
                display: inline-flex;
                margin-left: 6px;
                cursor: help;
            }

            .tm_ui-tooltip-icon {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                width: 12px;
                height: 12px;
                border-radius: 50%;
                background-color: rgba(0,0,0,0.2);
                color: white;
                font-size: 9px;
                font-weight: bold;
                user-select: none; /* 设置不可选择文本 */
            }

            .tm_ui-tooltip-text {
                visibility: hidden;
                background-color: rgba(0,0,0,0.7);
                color: #fff;
                text-align: left;
                border-radius: 4px;
                padding: 5px 7px;
                position: absolute;
                z-index: 10000;
                font-size: 11px;
                opacity: 0;
                transition: opacity 0.3s;
                line-height: 1.4;
                pointer-events: none;
                box-shadow: 0 2px 8px rgba(0,0,0,0.2);
                top: -5px;
                right: 110%;
                white-space: nowrap;
                overflow-wrap: break-word;
            }

            .tm_ui-tooltip:hover .tm_ui-tooltip-text {
                visibility: visible;
                opacity: 1;
            }

            .tm_ui-switch {
                --tm_ui-width: 28px;
                --tm_ui-height: 14px;
                --tm_ui-padding: 2px;
                --tm_ui-duration: 0.2s;
                --tm_ui-color-on:rgb(76, 97, 175);
                --tm_ui-color-off: #e0e0e0;
                --tm_ui-color-knob: #ffffff;
                --tm_ui-shadow: 0 2px 5px rgba(0,0,0,0.2);
                --tm_ui-knob-size: calc(var(--tm_ui-height) - var(--tm_ui-padding) * 2);
                display: inline-block;
                position: relative;
                width: var(--tm_ui-width);
                height: var(--tm_ui-height);
            }
            .tm_ui-switch input {
                opacity: 0;
                width: 0;
                height: 0;
            }
            .tm_ui-switch-slider {
                position: absolute;
                cursor: pointer;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background-color: var(--tm_ui-color-off);
                transition: background-color var(--tm_ui-duration) ease;
                border-radius: var(--tm_ui-height);
                box-shadow: var(--tm_ui-shadow) inset;
            }
            .tm_ui-switch-slider:before {
                position: absolute;
                content: "";
                height: var(--tm_ui-knob-size);
                width: var(--tm_ui-knob-size);
                left: var(--tm_ui-padding);
                bottom: var(--tm_ui-padding);
                background-color: var(--tm_ui-color-knob);
                transition: transform var(--tm_ui-duration) ease;
                border-radius: 50%;
                box-shadow: var(--tm_ui-shadow);
            }
            .tm_ui-switch input:checked + .tm_ui-switch-slider {
                background-color: var(--tm_ui-color-on);
            }
            .tm_ui-switch input:checked + .tm_ui-switch-slider:before {
                transform: translateX(calc(var(--tm_ui-width) - var(--tm_ui-height)));
            }
            .tm_ui-switch input:disabled + .tm_ui-switch-slider {
                opacity: 0.6;
                cursor: not-allowed;
            }

            .tm_ui-range-container {
                display: flex;
                align-items: center;
                width: 100%;
                max-width: 120px;
                gap: 5px;
            }

            .tm_ui-range-input {
                flex: 1;
                width: 90px;
            }

            .tm_ui-range-value {
                width: 25px;
                text-align: center;
                border: 1px solid #ccc;
                border-radius: 2px;
                padding: 1px;
                font-size: 10px;
            }

            .tm_ui-select {
                padding: 3px;
                border-radius: 3px;
                border: 1px solid #ccc;
                background-color: white;
                width: 100%;
                font-size: 11px;
            }

            .tm_ui-input-number, .tm_ui-input-text {
                padding: 3px;
                border-radius: 3px;
                border: 1px solid #ccc;
                width: 100%;
                font-size: 11px;
            }

            .tm_ui-buttons-container {
                display: flex;
                gap: 7px;
                justify-content: center;
                margin-top: 3px;
            }

            #myDownloadButton, #myResetButton {
                text-align: center;
                padding: 5px 8px;
                background: var(--tm_ui-linear-gradient);
                color: white;
                cursor: pointer;
                transition: all 0.3s ease;
                border-radius: 3px;
                border: none;
                font-size: 11px;
            }

            #myDownloadButton {
                width: 100%;
                margin-bottom: 3px;
                padding: 8px;
            }
            
            #myResetButton {
                flex: 1;
            }
            
            #myGotoRepoButton {
                flex: 3;
            }

            .collapse-icon {
                width: 12px;
                height: 12px;
                transition: transform 0.3s ease;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            .tm_ui-option-group-collapsed .collapse-icon {
                transform: rotate(180deg);
            }

            #myDownloadButton:hover, #myResetButton:hover, #myGotoRepoButton:hover {
                transform: scale(1.02);
                box-shadow: 0 1px 5px rgba(0,0,0,0.15);
            }

            #myDownloadButton:disabled, #myResetButton:disabled {
                background: gray;
                color: #aaa;
                cursor: not-allowed;
                transform: none;
                box-shadow: none;
            }

            #myGotoRepoButton {
                background: #000000;
                color: #ffffff;
                text-align: center;
                padding: 5px 8px;
                cursor: pointer;
                transition: all 0.3s ease;
                border-radius: 3px;
                border: none;
                font-size: 11px;
            }
            #myGotoRepoButton:active {
                transform: scale(1);
            }
            #myGotoRepoButton:hover .goto-repo-btn-icon {
                fill: #ffff00;
                transform: scale(1.02);
                rotate: 360deg;
                filter: drop-shadow(0 0 5px rgba(255, 208, 0, 0.8))
                        drop-shadow(0 0 10px rgba(255, 208, 0, 0.6));
            }
            #myGotoRepoButton:hover .goto-repo-btn-text {
                filter: drop-shadow(0 0 5px rgba(255, 255, 255, 0.2))
                        drop-shadow(0 0 10px rgba(255, 255, 255, 0.4));
            }
            #myGotoRepoButton .goto-repo-btn-text {
                transition: all 1s ease;
            }
            #myGotoRepoButton .goto-repo-btn-icon {
                display: inline-block;
                width: 12px;
                height: 12px;
                transition: all 1s ease;
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
            this.mainButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="#FFFFFF"><path d="M480-337q-8 0-15-2.5t-13-8.5L308-492q-12-12-11.5-28t11.5-28q12-12 28.5-12.5T365-549l75 75v-286q0-17 11.5-28.5T480-800q17 0 28.5 11.5T520-760v286l75-75q12-12 28.5-11.5T652-548q11 12 11.5 28T652-492L508-348q-6 6-13 8.5t-15 2.5ZM240-160q-33 0-56.5-23.5T160-240v-80q0-17 11.5-28.5T200-360q17 0 28.5 11.5T240-320v80h480v-80q0-17 11.5-28.5T760-360q17 0 28.5 11.5T800-320v80q0 33-23.5 56.5T720-160H240Z"/></svg>`;

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
                this.container.style.top = Math.min(window.innerHeight - 50, parseInt(savedTop)) + "px";
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
            this.floatWindow.style.display = "flex";
            this.floatWindow.style.flexDirection = "column";
            this.floatWindow.id = "myFloatWindow";

            // 创建下载按钮
            this.downloadButton = document.createElement("button");
            this.downloadButton.innerHTML = "点击下载Markdown<br>（支持文章、专栏、用户全部文章页面）";
            this.downloadButton.id = "myDownloadButton";
            this.floatWindow.appendChild(this.downloadButton);

            // 创建选项容器，设置为可滚动
            const optionContainer = document.createElement("div");
            optionContainer.className = "tm_ui-options-container";
            this.floatWindow.appendChild(optionContainer);

            // 创建选项容器禁用遮罩
            const overlay = document.createElement("div");
            overlay.className = "tm_ui-options-disabled-overlay";
            optionContainer.appendChild(overlay);

            // 添加选项分组
            this.createOptionGroups(optionContainer);

            // 创建底部按钮容器
            const buttonsContainer = document.createElement("div");
            buttonsContainer.className = "tm_ui-buttons-container";
            this.floatWindow.appendChild(buttonsContainer);

            // 创建恢复默认设置按钮
            this.resetButton = document.createElement("button");
            this.resetButton.innerHTML = "恢复默认";
            this.resetButton.id = "myResetButton";
            buttonsContainer.appendChild(this.resetButton);

            // 创建去GitHub按钮
            this.gotoRepoButton = document.createElement("button");
            // this.gotoRepoButton.innerHTML = "前往 GitHub 给作者点个 Star ⭐";
            this.gotoRepoButton.innerHTML = `
                <span class="goto-repo-btn-text">前往 GitHub 给作者点个 Star</span>
                <svg aria-hidden="true" fill="currentColor" viewBox="0 0 47.94 47.94" xmlns="http://www.w3.org/2000/svg"
                     width="12px" height="12px" class="goto-repo-btn-icon">
                    <path
                    d="M26.285,2.486l5.407,10.956c0.376,0.762,1.103,1.29,1.944,1.412l12.091,1.757
                    c2.118,0.308,2.963,2.91,1.431,4.403l-8.749,8.528c-0.608,0.593-0.886,1.448-0.742,2.285l2.065,12.042
                    c0.362,2.109-1.852,3.717-3.746,2.722l-10.814-5.685c-0.752-0.395-1.651-0.395-2.403,0l-10.814,5.685
                    c-1.894,0.996-4.108-0.613-3.746-2.722l2.065-12.042c0.144-0.837-0.134-1.692-0.742-2.285l-8.749-8.528
                    c-1.532-1.494-0.687-4.096,1.431-4.403l12.091-1.757c0.841-0.122,1.568-0.65,1.944-1.412l5.407-10.956
                    C22.602,0.567,25.338,0.567,26.285,2.486z"
                    ></path>
                </svg>
            `;
            this.gotoRepoButton.id = "myGotoRepoButton";
            buttonsContainer.appendChild(this.gotoRepoButton);

            // 将浮窗添加到内容区
            document.getElementById("tmComplexContent").appendChild(this.floatWindow);
        }

        /**
         * 创建选项分组
         * @param {HTMLElement} container - 父容器
         */
        createOptionGroups(container) {
            // 下载设置组
            const downloadGroup = this.createOptionGroup(container, "基础下载设置", true);
            this.addBoolOption({
                id: "parallelDownload",
                label: "批量并行下载模式",
                defaultValue: true,
                container: downloadGroup,
                tooltip: "使用Iframe，能够获取JS动态的内容",
            });
            this.addBoolOption({
                id: "fastDownload",
                label: "快速模式（内存占用低，建议文章较多时启用）",
                defaultValue: false,
                container: downloadGroup,
                tooltip: `使用Fetch API，速度快，但<span style="color:red">无法获取JS动态加载内容</span>。<br>如果不启用，则使用iframe下载，容易内存溢出崩溃。<br><center>不启用时占用内存 ≈ 40MB * 文章数量</center><center>启用后占用内存 ≈ 40MB</center>文章较多时建议启用快速模式。下载后需要<span style="color:red">仔细检查内容<br>是否完整</span>，一般不会有问题。<br>另外，单篇文章直接读取当前页面，不受此选项影响。`,
            });
            this.addBoolOption({
                id: "zipCategories",
                label: "下载为压缩包",
                defaultValue: true,
                container: downloadGroup,
                constraints: {
                    false: [{ id: "saveWebImages", value: false }],
                },
            });
            this.addBoolOption({
                id: "saveWebImages",
                label: "将图片保存至本地",
                defaultValue: true,
                container: downloadGroup,
                tooltip: "默认保存到和MD文件同名的文件夹中",
                constraints: {
                    true: [{ id: "zipCategories", value: true }],
                    false: [{ id: "saveAllImagesToAssets", value: false }],
                },
            });
            this.addBoolOption({
                id: "saveAllImagesToAssets",
                label: "图片保存至assets文件夹",
                defaultValue: true,
                container: downloadGroup,
                tooltip: "如不启用，则保存到和MD文件同名的文件夹中",
                constraints: {
                    true: [
                        { id: "zipCategories", value: true },
                        { id: "saveWebImages", value: true },
                    ],
                },
            });
            this.addBoolOption({
                id: "enableCustomFileName",
                label: "启用批量下载文件名模板",
                defaultValue: true,
                container: downloadGroup,
                tooltip: "启用后，批量下载的文件名将根据下方模板生成",
            });
            this.addStringOption({
                id: "customFileNamePattern",
                label: "批量下载文件名模板",
                defaultValue: "{no}_{title}",
                container: downloadGroup,
                tooltip: "可用变量：{title}、{author}、{index}、{no}（有前导0）",
            });

            const advancedDownloadGroup = this.createOptionGroup(container, "高级下载设置");
            this.addIntOption({
                id: "maxConcurrentDownloads",
                label: "最大并行解析数",
                defaultValue: 4,
                container: advancedDownloadGroup,
                min: 1,
                max: 128,
                step: 1,
                tooltip: "越小越稳定，过大容易风控、内存溢出",
            });
            this.addIntOption({
                id: "delayBetweenDownloads",
                label: "下载间隔（毫秒）",
                defaultValue: 100,
                container: advancedDownloadGroup,
                min: 0,
                max: 60000,
                step: 1,
                tooltip:
                    "每次下载文章之间的延时，单位毫秒。<br>在并行时每个worker的间隔是独立的。<br>用于进一步减慢串行下载避免风控（放到最慢）",
            });
            this.addIntOption({
                id: "downloadAssetRetryCount",
                label: "下载资源失败重试次数",
                defaultValue: 3,
                container: advancedDownloadGroup,
                min: 0,
                max: 32,
                step: 1,
                tooltip: "下载网页、图片等失败时重试次数，0表示不重试",
            });
            this.addIntOption({
                id: "downloadAssetRetryDelay",
                label: "下载资源失败重试延时（毫秒）",
                defaultValue: 1000,
                container: advancedDownloadGroup,
                min: 0,
                max: 60000,
                step: 1,
                tooltip: "下载网页、图片等失败时重试前的延时，单位毫秒。<br>避免过快重试导致服务器风控",
            });
            this.addIntOption({
                id: "startArticleIndex",
                label: "从第几篇文章开始下载",
                defaultValue: 1,
                container: advancedDownloadGroup,
                min: 1,
                max: 10000,
                step: 1,
                tooltip: "从第几篇文章开始下载，1表示第一篇<br>避免一次下载多篇文章时风控，用于分批下载",
            });
            this.addIntOption({
                id: "endArticleIndex",
                label: "下载到第几篇文章",
                defaultValue: 10000,
                container: advancedDownloadGroup,
                min: 1,
                max: 10000,
                step: 1,
                tooltip: "下载到第几篇文章，超出范围则下载到最后一篇<br>避免一次下载多篇文章时风控，用于分批下载",
            });
            this.addSelectOption({
                id: "zipLibrary",
                label: "压缩文件时使用的库",
                defaultValue: "fflate",
                container: advancedDownloadGroup,
                options: [
                    { value: "fflate", label: "fflate（默认，更快）" },
                    { value: "jszip", label: "JSZip（备选，较慢）" },
                ],
                tooltip: "如果提示没有找到fflate，请尝试切换到jszip。<br>流式压缩下载时只能使用fflate。",
            });
            this.addBoolOption({
                id: "enableStreaming",
                label: "启用流式压缩下载（节省内存，实验性功能）",
                defaultValue: false,
                container: advancedDownloadGroup,
                tooltip: "稍微减少内存占用。如下载失败，请关闭此选项。",
                constraints: {
                    true: [{ id: "zipCategories", value: true }],
                },
            });

            // 文章内容组
            const contentGroup = this.createOptionGroup(container, "文章内容设置");
            this.addBoolOption({
                id: "addArticleInfoInYaml",
                label: "添加文章元信息",
                defaultValue: false,
                container: contentGroup,
                tooltip: "以YAML格式添加，对于转Hexo博客比较有用",
                constraints: {
                    true: [{ id: "mergeArticleContent", value: false }],
                },
            });
            this.addBoolOption({
                id: "addArticleTitleToMarkdown",
                label: "添加文章标题",
                defaultValue: true,
                container: contentGroup,
                tooltip: "以一级标题形式添加",
            });
            this.addBoolOption({
                id: "addArticleInfoInBlockquote",
                label: "添加文章阅读量、点赞等信息",
                defaultValue: true,
                container: contentGroup,
                tooltip: "以引用块形式添加",
            });
            this.addBoolOption({
                id: "removeCSDNSearchLink",
                label: "移除CSDN搜索链接",
                defaultValue: true,
                container: contentGroup,
            });
            this.addBoolOption({
                id: "enableColorText",
                label: "启用彩色文字",
                defaultValue: true,
                container: contentGroup,
                tooltip: "使用&lt;span&gt;格式实现彩色文字",
            });
            this.addBoolOption({
                id: "enableImageSize",
                label: "启用图片宽高属性",
                defaultValue: true,
                container: contentGroup,
                tooltip:
                    "仅当网页提供宽高属性时生效。<br>如果启用，则具有宽高的图片会以&lt;img&gt;标签<br>插入文本中。如果不启用，则会以![]()格式插入。",
            });
            this.addBoolOption({
                id: "forceImageCentering",
                label: "全部图片居中",
                defaultValue: false,
                container: contentGroup,
                tooltip:
                    "忽略网页原有的图片对齐方式，全部居中。<br>图片靠左对齐是通过在图片前添加空格实现的，<br>不加空格则Typora显示为居中。",
            });
            this.addBoolOption({
                id: "enableMarkdownEscape",
                label: "启用Markdown特殊字符转义",
                defaultValue: false,
                container: contentGroup,
                tooltip: "把会影响Markdown解析的字符用\\转义",
            });
            this.addStringOption({
                id: "markdownEscapePattern",
                label: "需要转义的Markdown字符",
                defaultValue: "`*_[]{}()#+-.!",
                container: contentGroup,
                tooltip: "填入字符即可，这不是正则表达式，注意不要空格",
            });

            // 批量文章处理组
            const batchGroup = this.createOptionGroup(container, "合并文章设置");
            this.addBoolOption({
                id: "mergeArticleContent",
                label: "启用合并文章",
                defaultValue: false,
                container: batchGroup,
                tooltip: "将多篇文章保存为单个MD文件",
                constraints: {
                    true: [{ id: "addArticleInfoInYaml", value: false }],
                },
            });
            this.addBoolOption({
                id: "addSerialNumberToTitle",
                label: "添加序号到文章标题前",
                defaultValue: false,
                container: batchGroup,
                tooltip: "在合并文章时可能有用",
            });
            this.addBoolOption({
                id: "addArticleInfoInBlockquote_batch",
                label: "合并文章时添加栏目总信息",
                defaultValue: true,
                container: batchGroup,
                tooltip: "以引用块形式添加栏目总阅读量、点赞等",
            });
        }

        /**
         * 创建选项分组
         * @param {HTMLElement} container - 父容器
         * @param {string} title - 分组标题
         * @param {boolean} expanded - 是否展开（默认折叠）
         * @returns {HTMLElement} - 创建的分组元素内容容器
         */
        createOptionGroup(container, title, expanded = false) {
            const group = document.createElement("div");
            group.className = "tm_ui-option-group" + (expanded ? "" : " tm_ui-option-group-collapsed");

            // 创建分组头部（可点击折叠/展开）
            const header = document.createElement("div");
            header.className = "tm_ui-option-group-header";

            const titleElem = document.createElement("div");
            titleElem.className = "tm_ui-option-group-title";
            titleElem.textContent = title;

            // 创建折叠图标
            const icon = document.createElement("span");
            icon.className = "collapse-icon";
            icon.innerHTML = `<svg width="12" height="12" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M4 6L8 10L12 6" stroke="#555555" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>`;

            header.appendChild(titleElem);
            header.appendChild(icon);
            group.appendChild(header);

            // 创建内容区域
            const content = document.createElement("div");
            content.className = "tm_ui-option-group-content";
            group.appendChild(content);

            // 添加点击事件，实现折叠/展开功能
            header.addEventListener("click", () => {
                // 展开，则设置max-height为scrollHeight，折叠则为0
                if (group.classList.contains("tm_ui-option-group-collapsed")) {
                    group.classList.toggle("tm_ui-option-group-collapsed");
                    content.style.maxHeight = content.scrollHeight + 16 + "px";
                } else {
                    group.classList.toggle("tm_ui-option-group-collapsed");
                    content.style.maxHeight = "0px";
                }
            });

            if (expanded) {
                setTimeout(() => {
                    content.style.maxHeight = content.scrollHeight + 16 + "px"; // 16是padding的总和
                }, 100); // 确保在DOM渲染后执行
            }

            container.appendChild(group);
            return content;
        }

        /**
         * 添加布尔选项（复选框）
         * @param {Object} option - 选项对象
         * @param {string} option.id - 选项ID
         * @param {string} option.label - 选项标签
         * @param {boolean} option.defaultValue - 默认值
         * @param {HTMLElement} option.container - 父容器
         * @param {string} [option.tooltip=""] - 提示信息（可选）
         * @param {Object} [option.constraints={}] - 约束条件（可选）
         */
        addBoolOption(option) {
            const { id, label, defaultValue, container, tooltip = "", constraints = {} } = option;
            // 注册到配置管理器
            this.configManager.register(id, defaultValue);

            const optionItem = document.createElement("div");
            optionItem.className = "tm_ui-option-item";

            const checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            checkbox.id = id;
            checkbox.checked = this.configManager.get(id);

            const checkboxWrapper = document.createElement("label");
            checkboxWrapper.className = "tm_ui-switch";
            checkboxWrapper.appendChild(checkbox);
            const slider = document.createElement("span");
            slider.className = "tm_ui-switch-slider";
            checkboxWrapper.appendChild(slider);

            const labelElem = document.createElement("label");
            labelElem.htmlFor = id;
            labelElem.className = "tm_ui-option-label";
            labelElem.textContent = label;

            optionItem.appendChild(labelElem);
            optionItem.appendChild(checkboxWrapper);

            // 添加提示
            if (tooltip) {
                optionItem.appendChild(this.createTooltip(tooltip));
            } else {
                const tooltipElem = this.createTooltip("");
                tooltipElem.style.visibility = "hidden"; // 默认隐藏
                tooltipElem.style.opacity = "0"; // 默认透明
                optionItem.appendChild(tooltipElem);
            }

            container.appendChild(optionItem);

            // 事件监听
            checkbox.addEventListener("change", () => {
                this.configManager.set(id, checkbox.checked);

                // 处理约束
                if (checkbox.checked && constraints.true) {
                    for (const constraint of constraints.true) {
                        if (constraint.id !== undefined && constraint.value !== undefined) {
                            this.configManager.set(constraint.id, constraint.value);
                            this.updateOption(constraint.id);
                        }
                    }
                } else if (!checkbox.checked && constraints.false) {
                    for (const constraint of constraints.false) {
                        if (constraint.id !== undefined && constraint.value !== undefined) {
                            this.configManager.set(constraint.id, constraint.value);
                            this.updateOption(constraint.id);
                        }
                    }
                }
            });

            return optionItem;
        }

        /**
         * 添加整数选项（数字输入框）
         * @param {Object} option - 选项对象
         * @param {string} option.id - 选项ID
         * @param {string} option.label - 选项标签
         * @param {number} option.defaultValue - 默认值
         * @param {HTMLElement} option.container - 父容器
         * @param {number} option.min - 最小值
         * @param {number} option.max - 最大值
         * @param {number} option.step - 步长
         * @param {string} [option.tooltip=""] - 提示信息
         */
        addIntOption(option) {
            const { id, label, defaultValue, container, min, max, step, tooltip = "" } = option;
            // 注册到配置管理器
            this.configManager.register(id, defaultValue);

            const optionItem = document.createElement("div");
            optionItem.className = "tm_ui-option-item";

            const labelElem = document.createElement("label");
            labelElem.className = "tm_ui-option-label";
            labelElem.textContent = label;

            const inputContainer = document.createElement("div");
            inputContainer.className = "tm_ui-input-container";

            const input = document.createElement("input");
            input.type = "number";
            input.className = "tm_ui-input-number";
            input.id = id;
            input.min = min;
            input.max = max;
            input.step = step;
            input.value = this.configManager.get(id);

            inputContainer.appendChild(input);

            optionItem.appendChild(labelElem);
            optionItem.appendChild(inputContainer);

            // 添加提示
            if (tooltip) {
                optionItem.appendChild(this.createTooltip(tooltip));
            }

            container.appendChild(optionItem);

            // 事件监听
            input.addEventListener("change", () => {
                let value = parseInt(input.value);
                if (isNaN(value)) value = defaultValue;
                if (value < min) value = min;
                if (value > max) value = max;

                input.value = value;
                this.configManager.set(id, value);
            });

            return optionItem;
        }

        /**
         * 添加浮点数选项（滑块）
         * @param {Object} option - 选项对象
         * @param {string} option.id - 选项ID
         * @param {string} option.label - 选项标签
         * @param {number} option.defaultValue - 默认值
         * @param {HTMLElement} option.container - 父容器
         * @param {number} option.min - 最小值
         * @param {number} option.max - 最大值
         * @param {number} option.step - 步长
         * @param {string} [option.tooltip=""] - 提示信息
         */
        addFloatOption(option) {
            const { id, label, defaultValue, container, min, max, step, tooltip = "" } = option;
            // 注册到配置管理器
            this.configManager.register(id, defaultValue);

            const optionItem = document.createElement("div");
            optionItem.className = "tm_ui-option-item";

            const labelElem = document.createElement("label");
            labelElem.className = "tm_ui-option-label";
            labelElem.textContent = label;

            // 创建滑块容器
            const inputContainer = document.createElement("div");
            inputContainer.className = "tm_ui-input-container";

            const rangeContainer = document.createElement("div");
            rangeContainer.className = "tm_ui-range-container";

            const slider = document.createElement("input");
            slider.type = "range";
            slider.className = "tm_ui-range-input";
            slider.id = id;
            slider.min = min;
            slider.max = max;
            slider.step = step;
            slider.value = this.configManager.get(id);

            const valueDisplay = document.createElement("span");
            valueDisplay.className = "tm_ui-range-value";
            valueDisplay.textContent = slider.value;

            rangeContainer.appendChild(slider);
            rangeContainer.appendChild(valueDisplay);
            inputContainer.appendChild(rangeContainer);

            optionItem.appendChild(labelElem);
            optionItem.appendChild(inputContainer);

            // 添加提示
            if (tooltip) {
                optionItem.appendChild(this.createTooltip(tooltip));
            }

            container.appendChild(optionItem);

            // 事件监听
            slider.addEventListener("input", () => {
                valueDisplay.textContent = slider.value;
                this.configManager.set(id, parseFloat(slider.value));
            });

            return optionItem;
        }

        /**
         * 添加字符串选项（文本框）
         * @param {Object} option - 选项对象
         * @param {string} option.id - 选项ID
         * @param {string} option.label - 选项标签
         * @param {string} option.defaultValue - 默认值
         * @param {HTMLElement} option.container - 父容器
         * @param {string} [option.tooltip=""] - 提示信息
         */
        addStringOption(option) {
            const { id, label, defaultValue, container, tooltip = "" } = option;
            // 注册到配置管理器
            this.configManager.register(id, defaultValue);

            const optionItem = document.createElement("div");
            optionItem.className = "tm_ui-option-item";

            const labelElem = document.createElement("label");
            labelElem.className = "tm_ui-option-label";
            labelElem.textContent = label;

            const inputContainer = document.createElement("div");
            inputContainer.className = "tm_ui-input-container";

            const input = document.createElement("input");
            input.type = "text";
            input.className = "tm_ui-input-text";
            input.id = id;
            input.value = this.configManager.get(id);

            inputContainer.appendChild(input);

            optionItem.appendChild(labelElem);
            optionItem.appendChild(inputContainer);

            // 添加提示
            if (tooltip) {
                optionItem.appendChild(this.createTooltip(tooltip));
            }

            container.appendChild(optionItem);

            // 事件监听
            input.addEventListener("change", () => {
                this.configManager.set(id, input.value);
            });

            return optionItem;
        }

        /**
         * 添加下拉选择选项
         * @param {Object} option - 选项对象
         * @param {string} option.id - 选项ID
         * @param {string} option.label - 选项标签
         * @param {string} option.defaultValue - 默认值
         * @param {HTMLElement} option.container - 父容器
         * @param {Array} option.options - 选项数组，格式为[{value: '', label: ''}]
         * @param {string} [option.tooltip=""] - 提示信息
         */
        addSelectOption(option) {
            const { id, label, defaultValue, container, options, tooltip = "" } = option;
            // 注册到配置管理器
            this.configManager.register(id, defaultValue);

            const optionItem = document.createElement("div");
            optionItem.className = "tm_ui-option-item";

            const labelElem = document.createElement("label");
            labelElem.className = "tm_ui-option-label";
            labelElem.textContent = label;

            const inputContainer = document.createElement("div");
            inputContainer.className = "tm_ui-input-container";

            const select = document.createElement("select");
            select.className = "tm_ui-select";
            select.id = id;

            // 添加选项
            options.forEach((option) => {
                const optElem = document.createElement("option");
                optElem.value = option.value;
                optElem.textContent = option.label;
                select.appendChild(optElem);
            });

            // 设置当前值
            select.value = this.configManager.get(id);

            inputContainer.appendChild(select);

            optionItem.appendChild(labelElem);
            optionItem.appendChild(inputContainer);

            // 添加提示
            if (tooltip) {
                optionItem.appendChild(this.createTooltip(tooltip));
            }

            container.appendChild(optionItem);

            // 事件监听
            select.addEventListener("change", () => {
                this.configManager.set(id, select.value);
            });

            return optionItem;
        }

        /**
         * 创建提示工具
         * @param {string} text - 提示文本
         * @returns {HTMLElement} 提示元素
         */
        createTooltip(text) {
            const tooltip = document.createElement("div");
            tooltip.className = "tm_ui-tooltip";

            const icon = document.createElement("div");
            icon.className = "tm_ui-tooltip-icon";
            icon.textContent = "?";

            const tooltipText = document.createElement("div");
            tooltipText.className = "tm_ui-tooltip-text";
            tooltipText.innerHTML = text;

            tooltip.appendChild(icon);
            tooltip.appendChild(tooltipText);

            return tooltip;
        }

        /**
         * 更新指定选项的UI状态
         * @param {string} id - 选项ID
         */
        updateOption(id) {
            const element = document.getElementById(id);
            if (!element) return;

            const value = this.configManager.get(id);

            switch (element.type) {
                case "checkbox":
                    element.checked = value;
                    break;
                case "range":
                case "number":
                case "text":
                    element.value = value;
                    break;
                case "select-one":
                    element.value = value;
                    break;
            }
        }

        /**
         * 更新所有选项的状态
         */
        updateAllOptions() {
            for (const id of this.configManager.getAllKeys()) {
                this.updateOption(id);
            }
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
                await this.runMain();
            });

            // 默认设置按钮点击事件
            this.resetButton.addEventListener("click", () => {
                this.configManager.resetToDefaults();
                this.updateAllOptions();
                this.showFloatTip("已恢复默认设置", 1500);
            });

            // GitHub按钮点击事件
            this.gotoRepoButton.addEventListener("click", () => {
                window.open(this.repo_url, "_blank");
            });

            // 拖拽功能
            const draggable = document.getElementById("draggable");
            draggable.addEventListener("mousedown", (e) => {
                if (e.target === this.mainButton || this.mainButton.contains(e.target)) {
                    this.isDragging = true;
                    this.offsetX = e.clientX - draggable.offsetLeft;
                    this.offsetY = e.clientY - draggable.offsetTop;
                }
            });

            document.addEventListener("mousemove", (e) => {
                if (this.isDragging) {
                    draggable.style.top =
                        Math.min(window.innerHeight - 100, Math.max(0, e.clientY - this.offsetY)) + "px";
                }
            });

            document.addEventListener("mouseup", () => {
                if (this.isDragging) {
                    this.isDragging = false;
                    GM_setValue("draggableTop", draggable.style.top);
                }
            });

            // 监视页面缩放事件
            window.addEventListener("resize", () => {
                const savedTop = GM_getValue("draggableTop");
                if (savedTop) {
                    this.container.style.top = Math.min(window.innerHeight - 100, parseInt(savedTop)) + "px";
                }
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
         * 启用悬浮窗
         */
        enableFloatWindow() {
            this.downloadButton.disabled = false;
            this.downloadButton.innerHTML = "下载CSDN文章为Markdown<br>（支持专栏、文章、用户全部文章页面）";
            this.resetButton.disabled = false;

            // 启用所有输入元素
            const inputs = this.floatWindow.querySelectorAll("input, select");
            inputs.forEach((input) => {
                input.disabled = false;
            });

            // 隐藏遮罩层
            const overlay = this.floatWindow.querySelector(".tm_ui-options-disabled-overlay");
            if (overlay) overlay.style.display = "none";
        }

        /**
         * 禁用悬浮窗
         */
        disableFloatWindow() {
            this.downloadButton.innerHTML = "正在下载，请稍候...";
            this.downloadButton.disabled = true;
            this.resetButton.disabled = true;

            // 禁用所有输入元素
            const inputs = this.floatWindow.querySelectorAll("input, select");
            inputs.forEach((input) => {
                input.disabled = true;
            });

            // 显示遮罩层
            const overlay = this.floatWindow.querySelector(".tm_ui-options-disabled-overlay");
            if (overlay) overlay.style.display = "block";
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
                floatTip.style.padding = "7px 10px";
                floatTip.style.backgroundColor = "rgba(0, 0, 0, 0.8)";
                floatTip.style.color = "#fff";
                floatTip.style.borderRadius = "3px";
                floatTip.style.boxShadow = "0 2px 8px rgba(0, 0, 0, 0.2)";
                floatTip.style.zIndex = "10000";
                floatTip.style.fontSize = "12px";
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
            return new Promise((resolve) => {
                if (this.confirmDialogActive) {
                    // 如果已有对话框在显示，加入队列
                    this.confirmDialogQueue.push({ message, onConfirm, onCancel });
                    return;
                }
                this.confirmDialogActive = true;

                // 创建遮罩层
                const overlay = document.createElement("div");
                overlay.style.position = "fixed";
                overlay.style.top = "0";
                overlay.style.left = "0";
                overlay.style.width = "100vw";
                overlay.style.height = "100vh";
                overlay.style.background = "rgba(0,0,0,0.5)";
                overlay.style.zIndex = "10000";
                overlay.style.backdropFilter = "blur(10px)";
                overlay.id = "tm_confirm_overlay";

                // 创建对话框
                const dialog = document.createElement("div");
                dialog.style.position = "fixed";
                dialog.style.top = "50%";
                dialog.style.left = "50%";
                dialog.style.transform = "translate(-50%, -50%)";
                dialog.style.background = "#fff";
                dialog.style.padding = "16px 20px";
                dialog.style.borderRadius = "8px";
                dialog.style.boxShadow = "0 3px 16px rgba(0,0,0,0.25)";
                dialog.style.textAlign = "center";
                dialog.style.minWidth = "280px";
                dialog.style.maxWidth = "90vw";
                dialog.style.wordBreak = "break-all";
                dialog.style.fontSize = "13px";

                // 提示文本
                const msg = document.createElement("div");
                msg.innerHTML = message.replaceAll(/\n/g, "<br>");
                msg.style.marginBottom = "15px";
                msg.style.textAlign = "left"; // 向左对齐
                msg.style.lineHeight = "1.5";
                msg.style.color = "#333";
                dialog.appendChild(msg);

                // 按钮容器
                const btnBox = document.createElement("div");
                btnBox.style.display = "flex";
                btnBox.style.justifyContent = "center";
                btnBox.style.gap = "12px";

                // 确认按钮
                const okBtn = document.createElement("button");
                okBtn.textContent = "确定";
                okBtn.style.padding = "5px 16px";
                okBtn.style.background = "linear-gradient(135deg, #12c2e9 0%, #c471ed 50%, #f64f59 100%)";
                okBtn.style.color = "#fff";
                okBtn.style.border = "none";
                okBtn.style.borderRadius = "3px";
                okBtn.style.cursor = "pointer";
                okBtn.style.transition = "all 0.3s ease";
                okBtn.style.fontWeight = "bold";
                okBtn.style.fontSize = "12px";
                okBtn.onmouseover = () => {
                    okBtn.style.transform = "scale(1.05)";
                    okBtn.style.boxShadow = "0 1px 5px rgba(0,0,0,0.15)";
                };
                okBtn.onmouseout = () => {
                    okBtn.style.transform = "scale(1)";
                    okBtn.style.boxShadow = "none";
                };
                okBtn.onclick = () => {
                    document.body.removeChild(overlay);
                    if (typeof onConfirm === "function") onConfirm();
                    this.processNextDialog();
                    resolve();
                };

                // 取消按钮
                const cancelBtn = document.createElement("button");
                cancelBtn.textContent = "取消";
                cancelBtn.style.padding = "5px 16px";
                cancelBtn.style.background = "#f0f0f0";
                cancelBtn.style.color = "#333";
                cancelBtn.style.border = "none";
                cancelBtn.style.borderRadius = "3px";
                cancelBtn.style.cursor = "pointer";
                cancelBtn.style.transition = "all 0.2s ease";
                cancelBtn.style.fontSize = "12px";
                cancelBtn.onmouseover = () => {
                    cancelBtn.style.background = "#e0e0e0";
                };
                cancelBtn.onmouseout = () => {
                    cancelBtn.style.background = "#f0f0f0";
                };
                cancelBtn.onclick = () => {
                    document.body.removeChild(overlay);
                    if (typeof onCancel === "function") onCancel();
                    this.processNextDialog();
                    resolve();
                };

                btnBox.appendChild(cancelBtn);
                btnBox.appendChild(okBtn);
                dialog.appendChild(btnBox);
                overlay.appendChild(dialog);
                document.body.appendChild(overlay);
            });
        }

        /**
         * 处理队列中的下一个对话框
         */
        processNextDialog() {
            this.confirmDialogActive = false;
            if (this.confirmDialogQueue.length > 0) {
                const nextDialog = this.confirmDialogQueue.shift();
                setTimeout(() => {
                    this.showConfirmDialog(nextDialog.message, nextDialog.onConfirm, nextDialog.onCancel);
                }, 100);
            }
        }

        /**
         * 跳转到 GitHub issue 页面，并将信息参数化到 URL 中
         * @param {string} title - 标题
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

        async mainErrorHandler(error) {
            // 使用对话框
            const now = new Date();
            const timeStr = now
                .toISOString()
                .replace("T", " ")
                .replace(/\.\d+Z$/, "");

            const script_config = this.configManager.exportAll();

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
                        line = decodeURIComponent(line.trim());
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

            await this.showConfirmDialog(
                `下载文章时出错！是否前往Github提交Issue以告知开发者进行修复？（您需要拥有Github账号）\n错误详情：\n${errorDetails}`,
                () =>
                    this.gotoGithubIssue(
                        `[BUG] 下载失败 (${getCurrentPageType()}页面)`,
                        `#### 时间\n\n${timeStr}\n\n#### 错误内容\n\n\`\`\`\n${errorDetails}\n\`\`\`\n\n#### 其他信息\n\n- URL：\`${
                            window.location.href
                        }\`\n- 脚本版本：\`${GM_info.script.version}\`\n- 脚本配置：\n\`\`\`json\n${JSON.stringify(
                            script_config,
                            null,
                            4
                        )}\n\`\`\`\n`
                    ),
                this.showFloatTip("感谢您的反馈！", 2000),
                () => {
                    this.showFloatTip("已取消。", 2000);
                    console.error("下载文章时出错：", error);
                }
            );
        }

        /**
         * 主函数 - 下载文章入口
         */
        async runMain() {
            this.disableFloatWindow();
            const nowConfig = this.configManager.exportAll();
            try {
                switch (getCurrentPageType()) {
                    case "unknown":
                        alert("无法识别的页面。请确保在CSDN文章页面、专栏文章列表页面或用户全部文章列表页面。");
                        break;
                    case "article":
                        await this.downloadManager.downloadSingleArticle(nowConfig);
                        break;
                    case "category":
                        await this.downloadManager.downloadCategory(nowConfig);
                        break;
                    case "user_all_articles":
                        await this.downloadManager.downloadUserAllArticles(nowConfig);
                        break;
                }
            } catch (error) {
                this.mainErrorHandler(error);
            } finally {
                this.enableFloatWindow();
                this.downloadManager.reset(); // 重置FileManager
            }
        }
    }

    /**
     * 配置管理器类
     * 用于管理应用配置
     */
    class ConfigManager {
        constructor() {
            this.configs = new Map(); // 仅用于存储key，实际值从GM_getValue获取
            this.defaults = new Map();
        }

        /**
         * 注册配置项
         * @param {string} key - 配置键
         * @param {any} defaultValue - 默认值
         */
        register(key, defaultValue) {
            this.defaults.set(key, defaultValue);

            // 如果未设置，则使用默认值
            if (GM_getValue(key) === undefined) {
                GM_setValue(key, defaultValue);
            }

            // 加入配置映射
            this.configs.set(key, GM_getValue(key));
        }

        /**
         * 获取配置项值
         * @param {string} key - 配置键
         * @returns {any} 配置值
         */
        get(key) {
            // 直接从GM_getValue获取最新值
            return GM_getValue(key);
        }

        /**
         * 设置配置项值
         * @param {string} key - 配置键
         * @param {any} value - 配置值
         */
        set(key, value) {
            GM_setValue(key, value);
            this.configs.set(key, value);
        }

        /**
         * 重置所有配置到默认值
         */
        resetToDefaults() {
            for (const [key, defaultValue] of this.defaults.entries()) {
                this.set(key, defaultValue);
            }
        }

        /**
         * 获取所有配置键
         * @returns {Array} 配置键数组
         */
        getAllKeys() {
            return Array.from(this.configs.keys());
        }

        /**
         * 导出所有配置
         * @returns {Object} 配置对象
         */
        exportAll() {
            const result = {};
            for (const key of this.getAllKeys()) {
                result[key] = this.get(key);
            }
            return result;
        }

        /**
         * 导入配置
         * @param {Object} configs - 配置对象
         */
        importAll(configs) {
            for (const [key, value] of Object.entries(configs)) {
                if (this.configs.has(key)) {
                    this.set(key, value);
                }
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

            this.zipStream = null;
            this.zipStreamName = "";
            this.zipStreamSize = 0;
            this.zipStreamPendingFiles = new Map(); // 用于存储待处理的Blob对象
            this.zipStreamFileCount = 0;
            this.zipStreamProgressCallback = null;
            this.zipStreamErrorCallback = null;
            this.zipStreamEndFlag = null;
        }

        /**
         * 将文本保存为文件
         * @param {string} content - 文件内容
         * @param {string} filename - 文件名
         * @param {number} index - 文件索引(用于排序)
         */
        async addTextFile(content, filename, index = 0, streaming = false) {
            filename = Utils.safeFilename(filename);

            if (streaming) {
                // 如果是流式处理，直接添加到zip流
                this.addFileToZipStream(filename, content);
            } else {
                // 保存到队列中，等待打包
                this.fileQueue.push({ filename, type: "text/plain", content, index });
            }
        }

        /**
         * 将SVG内容保存到本地，添加到fileQueue，并返回本地路径
         * @param {string} svgText - SVG内容
         * @param {string} assetDirName - 资源文件夹名
         * @param {string} imgPrefix - 图片前缀
         * @returns {Promise<string>} 本地SVG路径
         */
        async addSvgFile(svgText, assetDirName, imgPrefix = "", streaming = false) {
            // 检查参数是否合法
            if (typeof svgText !== "string") {
                throw new Error("[saveSvgToLocal] Invalid argument: svgText must be a string.");
            }

            const imgOwner = imgPrefix + assetDirName;

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
            const filename = `${assetDirName}/${imgPrefix}${index}.svg`;

            // 记录已保存的SVG
            this.imageSet[imgOwner][svgHash] = `./${filename}`;

            // 创建SVG的Blob对象
            const blob = new Blob([svgText], { type: "image/svg+xml" });

            if (streaming) {
                // 如果是流式处理，直接添加到zip流
                this.addFileToZipStream(filename, blob);
            } else {
                // 添加到文件队列
                this.fileQueue.push({ filename, content: blob, type: "image/svg+xml", index });
            }

            // 返回本地路径
            return `./${filename}`;
        }

        /**
         * 将网络图片保存到本地，添加到fileQueue，并返回本地路径
         * @param {string} imgUrl - 图片URL
         * @param {string} assetDirName - 资源文件夹名
         * @param {string} imgPrefix - 图片前缀
         * @returns {Promise<string>} 本地图片路径
         */
        async addWebImageFile(
            imgUrl,
            assetDirName,
            imgPrefix = "",
            streaming = false,
            retryCount = 3,
            retryDelay = 1000
        ) {
            // 检查参数是否合法
            if (typeof imgUrl !== "string") {
                throw new Error("[saveWebImageToLocal] Invalid argument: imgUrl must be a string.");
            }

            // 清理URL
            imgUrl = Utils.clearUrl(imgUrl);

            const imgOwner = imgPrefix + assetDirName;

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
            const filename = `${assetDirName}/${imgPrefix}${index}${ext}`;

            // 记录已保存的图片
            this.imageSet[imgOwner][imgUrl] = `./${filename}`;

            // 获取图片的Blob对象
            // 返回的Promise Blob对象，需要等到打包时进行等待
            const blob = this.fetchResource(imgUrl, "blob", retryCount, retryDelay, "GM_xmlhttpRequest");

            if (streaming) {
                // 存储 Promise 对象
                this.zipStreamPendingFiles.set(
                    filename,
                    new Promise(async (resolve) => {
                        // 等待Blob解析完成
                        try {
                            const blobData = await blob;
                            await this.addFileToZipStream(filename, blobData);
                        } catch (error) {
                            console.dir(`Error fetching image ${imgUrl}:`, error);
                            if (this.zipStreamErrorCallback) {
                                this.zipStreamErrorCallback(error);
                            }
                        }
                        resolve();
                        this.zipStreamPendingFiles.delete(filename); // 完成后从待处理列表中删除
                    })
                );
            } else {
                // 添加到文件队列
                this.fileQueue.push({ filename, content: blob, type: blob.type, index });
            }

            // 返回本地路径
            return `./${filename}`;
        }

        /**
         * 获取网络资源
         * @param {string} url - 资源URL
         * @param {string} [responseType='blob'] - 响应类型，默认为'blob'，可选值为'text'、'json'等
         * @param {number} retryCount - 重试次数，默认值为3
         * @returns {Promise<Blob|string|Object>} - 返回资源的Blob对象或文本内容
         * @throws {Error} - 如果获取资源失败，抛出错误
         */
        async fetchResource(url, responseType = "blob", retryCount = 3, retryDelay = 1000, api = "GM_xmlhttpRequest") {
            return new Promise((resolve, reject) => {
                function attemptFetch(remaining) {
                    if (api === "GM_xmlhttpRequest") {
                        GM_xmlhttpRequest({
                            method: "GET",
                            url: url,
                            responseType: responseType,
                            onload: function (response) {
                                if (response.status === 200) {
                                    resolve(response.response);
                                } else {
                                    if (remaining > 0) {
                                        console.warn(`Retrying fetch for ${url}, attempts left: ${remaining - 1}`);
                                        setTimeout(() => {
                                            attemptFetch(remaining - 1);
                                        }, retryDelay);
                                    } else {
                                        reject(
                                            `Failed to fetch resource: ${url}\nStatus: ${response.status} ${response.statusText}`
                                        );
                                    }
                                }
                            },
                            onerror: function () {
                                if (remaining > 0) {
                                    console.warn(`Retrying fetch for ${url}, attempts left: ${remaining - 1}`);
                                    setTimeout(() => {
                                        attemptFetch(remaining - 1);
                                    }, retryDelay);
                                } else {
                                    reject(`Error fetching resource: ${url}`);
                                }
                            },
                        });
                    } else if (api === "fetch") {
                        fetch(url)
                            .then((response) => {
                                if (!response.ok) {
                                    throw new Error(`HTTP error! status: ${response.status}`);
                                }
                                if (responseType === "json") return response.json();
                                if (responseType.startsWith("text")) return response.text();
                                if (responseType === "blob") return response.blob();
                                throw new Error(`Unsupported response type: ${responseType}`);
                            })
                            .then((data) => {
                                resolve(data);
                            })
                            .catch((error) => {
                                if (remaining > 0) {
                                    console.warn(`Retrying fetch for ${url}, attempts left: ${remaining - 1}`);
                                    setTimeout(() => {
                                        attemptFetch(remaining - 1);
                                    }, retryDelay);
                                } else {
                                    reject(`Error fetching resource: ${url}\n${error.message}`);
                                }
                            });
                    } else {
                        reject(new Error(`Unsupported API: ${api}. Use 'GM_xmlhttpRequest' or 'fetch'.`));
                    }
                }
                attemptFetch(retryCount);
            });
        }

        /**
         * 合并文章内容
         * @param {string} outputFileName - 合并后的文件名
         * @param {string} extraTopContent - 额外的顶部内容
         */
        mergeTextFile(outputFileName, extraTopContent = "") {
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
                filename: `${outputFileName}.md`,
                type: "text/plain",
                content: `${extraTopContent}${mergedContent}`,
            });
            this.fileQueue = newFileQueue;
        }

        /**
         * 创建ZIP流，使用 fflate 库和 streamSaver
         * @param {Array<{name: string, data: Uint8Array|string}>} files - 文件对象数组
         * @param {string} zipName - ZIP文件名
         * @param {function(string, number):void} [onProgress] - 可选的进度回调，接收文件名和索引
         * @param {function(string, number, number):void} [onFinished] - 可选的完成回调，接收当前zip文件名、文件总数、zip大小
         * @param {function(Error):void} [onError] - 可选的错误回调
         **/
        async initializeZipStream(zipName, onProgress = null, onFinished = null, onError = null) {
            if (!zipName.endsWith(".zip")) {
                zipName += ".zip"; // 确保ZIP文件名以.zip结尾
            }
            const downloadStream = streamSaver.createWriteStream(zipName);
            let writer = downloadStream.getWriter();

            // 定义一个在页面卸-载前中止写入的函数
            const abortStream = () => {
                if (writer) {
                    console.dir("页面即将卸载，中止写入流...");
                    writer.abort("用户中断了下载").catch((e) => console.error("中止流时出错:", e));
                    writer = null; // 清理writer引用
                }
            };
            // 注册事件监听器
            window.addEventListener("beforeunload", abortStream);

            // 如果已经有zipStream存在，先结束之前的流
            if (this.zipStream) {
                console.dir("Ending previous ZIP stream before creating a new one.");
                await this.endZipStream();
            }

            this.zipStreamName = zipName;
            this.zipStreamSize = 0;
            this.zipStreamFileCount = 0;

            if (onProgress && typeof onProgress === "function") this.zipStreamProgressCallback = onProgress;
            else this.zipStreamProgressCallback = null;
            if (onError && typeof onError === "function") this.zipStreamErrorCallback = onError;
            else this.zipStreamErrorCallback = null;

            let zipFinalResolve = () => {
                console.dir("ZIP stream resolved.");
                this.zipStream = null; // 清理zipStream引用
            };
            let zipFinalReject = () => {};
            this.zipStreamEndFlag = new Promise((resolve, reject) => {
                zipFinalResolve = resolve;
                zipFinalReject = reject;
            });

            this.zipStream = new fflate.Zip((err, chunk, final) => {
                try {
                    if (err) {
                        writer.abort(err); // 如果出错，中止写入
                        console.dir(`ZIP stream error: ${err}`);
                        if (onError && typeof onError === "function") onError(err);
                        zipFinalReject(err);
                        return;
                    }
                    if (chunk) {
                        this.zipStreamSize += chunk.length; // 累计ZIP数据大小，单位为字节
                        writer.write(chunk);
                    }
                    if (final) {
                        writer.close();
                        writer = null; // 清理writer引用
                        if (onFinished && typeof onFinished === "function") {
                            onFinished(this.zipStreamName, this.zipStreamFileCount, this.zipStreamSize);
                        }
                        zipFinalResolve();
                    }
                } catch (error) {
                    writer.abort(error); // 如果处理过程中出错，中止写入
                    console.dir(`ZIP processing error: ${error}`);
                    if (onError && typeof onError === "function") onError(error);
                    zipFinalReject(error);
                }
            });
        }

        /**
         * 向ZIP流中添加文件
         * @param {string} filename - 文件名
         * @param {string|Uint8Array|Blob|Promise} content - 文件内容，可以是字符串、Uint8Array或Blob
         * @throws {Error} 如果zipStream未初始化或内容类型不支持
         * @return {Promise<void>} 返回一个Promise，表示文件已添加到ZIP流中
         **/
        async addFileToZipStream(filename, content) {
            if (!this.zipStream) throw new Error("ZIP stream is not initialized. Call createZipStream first.");

            let data = null;
            if (typeof content === "string") data = new TextEncoder().encode(content);
            else if (content instanceof Uint8Array) data = content;
            else if (content instanceof Blob) data = new Uint8Array(await content.arrayBuffer());
            else throw new Error("Unsupported content type. Must be string, Uint8Array, or Blob.");

            // 增加文件计数
            this.zipStreamFileCount++;

            console.dir(
                `Add file to stream (No: ${this.zipStreamFileCount}, Now Size: ${Utils.formatFileSize(
                    this.zipStreamSize
                )}): ${filename}`
            );

            const fileStream = new fflate.ZipPassThrough(filename);
            this.zipStream.add(fileStream);
            fileStream.push(data, true);

            if (this.zipStreamProgressCallback && typeof this.zipStreamProgressCallback === "function") {
                this.zipStreamProgressCallback(this.zipStreamFileCount, filename);
            }
        }

        /**
         * 将所有文件添加到ZIP流中
         * @param {boolean} [endStream=true] - 是否在添加完所有文件结束ZIP流
         * @param {function(string, number, number):void} [addFilesFinalCallback=null] - 可选的最终回调，接收当前zip文件名、文件总数、zip大小
         * @throws {Error} 如果zipStream未初始化
         * @return {Promise<void>} 返回一个Promise，表示所有文件已添加到ZIP流中
         **/
        async addAllFilesInQueueToZipStream(endStream = false, addFilesFinalCallback = null) {
            if (!this.zipStream) throw new Error("ZIP stream is not initialized. Call createZipStream first.");

            if (this.fileQueue.length === 0) {
                console.dir("没有文件需要打包到ZIP中");
            } else {
                // 使用 for...of 循环替代 forEach，以便正确处理 async/await
                for (let idx = 0; idx < this.fileQueue.length; idx++) {
                    let status = true;
                    const file = this.fileQueue[idx];

                    // content 可能是 promise（Blob对象），需要等待
                    if (file.content instanceof Promise) {
                        try {
                            file.content = await file.content; // 等待Blob对象
                        } catch (err) {
                            console.dir(`Error resolving content for file ${file.filename}: ${err}`);
                            if (this.zipStreamErrorCallback && typeof this.zipStreamErrorCallback === "function") {
                                this.zipStreamErrorCallback(err);
                            }
                            status = false;
                        }
                    }
                    if (!status) {
                        console.dir(`Skipping file ${file.filename} due to download failure.`);
                        continue; // 如果下载失败，跳过当前文件
                    }
                    // 将文件添加到ZIP中
                    await this.addFileToZipStream(file.filename, file.content);
                }
            }

            // 确保ZIP流已结束
            if (endStream) {
                await this.endZipStream();
                console.dir("Ending ZIP stream after adding all files.");
            }

            // 调用最终回调
            if (addFilesFinalCallback && typeof addFilesFinalCallback === "function") {
                addFilesFinalCallback(this.zipStreamName, this.zipStreamFileCount, this.zipStreamSize);
            }

            // 清空文件队列
            this.reset();
        }

        /**
         * 结束ZIP流，完成写入
         * @throws {Error} 如果zipStream未初始化
         * @return {Promise<void>} 返回一个Promise，表示ZIP流已结束
         **/
        async endZipStream() {
            if (!this.zipStream) throw new Error("ZIP stream is not initialized. Call createZipStream first.");
            // 如果有待处理的Blob对象，等待它们完成
            for (const [filename, blobProcessPromise] of this.zipStreamPendingFiles.entries()) {
                if (blobProcessPromise instanceof Promise) {
                    try {
                        await blobProcessPromise; // 等待Blob对象解析
                    } catch (error) {
                        console.dir(`Error processing pending file ${filename}: ${error}`);
                        if (this.zipStreamErrorCallback && typeof this.zipStreamErrorCallback === "function") {
                            this.zipStreamErrorCallback(error);
                        }
                    }
                }
            }
            // 清空待处理的Blob对象
            this.zipStreamPendingFiles.clear();
            this.zipStream.end();
            try {
                await this.zipStreamEndFlag; // 返回结束的Promise
            } catch (error) {
                console.dir(`Error ending ZIP stream: ${error}`);
                if (this.zipStreamErrorCallback && typeof this.zipStreamErrorCallback === "function") {
                    this.zipStreamErrorCallback(error);
                }
            }
            this.zipStream = null; // 清理zipStream引用
        }

        /**
         * 使用 fflate 将文件打包成 ZIP，支持进度回调
         * @param {Array<{name: string, data: Uint8Array|string}>} files - 文件对象数组
         * @param {function(number, string):void} [onProgress] - 可选的进度回调，接收百分比和文件名
         * @param {function(Error):void} [onError] - 可选的错误回调
         * @return {Promise<Uint8Array>} 返回包含 ZIP 数据的 Promise
         **/
        async createZipWithProgress(files, onProgress = null, onError = null) {
            return new Promise((resolve, reject) => {
                const encoder = new TextEncoder();
                const chunks = [];
                let totalFiles = files.length;
                let processedFiles = 0;

                const zip = new fflate.Zip((err, chunk, final) => {
                    if (err) {
                        // Logger.error("ZIP creation failed:", err);
                        console.dir(`ZIP creation failed: ${err}`);
                        if (onError && typeof onError === "function") {
                            onError(err);
                        }
                        return reject(err);
                    }
                    if (chunk) chunks.push(chunk);
                    if (final) {
                        const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
                        const result = new Uint8Array(totalLength);
                        let offset = 0;
                        for (const chunk of chunks) {
                            result.set(chunk, offset);
                            offset += chunk.length;
                        }
                        resolve(result);
                    }
                });

                if (totalFiles === 0) {
                    zip.end();
                    return;
                }

                files.forEach((file, index) => {
                    const data = typeof file.data === "string" ? encoder.encode(file.data) : file.data;
                    const fileStream = new fflate.ZipPassThrough(file.name);
                    zip.add(fileStream);
                    fileStream.push(data, true);
                    processedFiles++;
                    const percentage = Math.round((processedFiles / totalFiles) * 100);
                    if (onProgress && typeof onProgress === "function") {
                        try {
                            onProgress(percentage, file.name);
                        } catch (e) {
                            // Logger.error("Progress callback error:", e);
                            console.dir(`Progress callback error: ${e}`);
                            if (onError && typeof onError === "function") {
                                onError(e);
                            }
                            return reject(e);
                        }
                    }
                    if (processedFiles === totalFiles) zip.end();
                });
            });
        }

        /**
         * 将文件队列打包为ZIP下载（fflate）
         * @param {string} zipName - ZIP文件名
         */
        async zipAllFilesInQueue(zipName, progressCallback = null, finalCallback = null, api = "fflate") {
            // 检查是否有 fflate 库
            if (typeof fflate === "undefined" || api !== "fflate") {
                // 如果没有 fflate 库，使用 jszip 作为备选方案
                console.warn("使用 jszip 作为备选方案");
                return this.zipAllFilesInQueue_jszip(zipName, progressCallback, finalCallback);
            }

            if (this.fileQueue.length === 0) {
                console.dir("没有文件需要保存");
                return;
            }

            if (!zipName.endsWith(".zip")) {
                zipName = zipName + ".zip"; // 确保ZIP文件名以.zip结尾
            }

            zipName = Utils.safeFilename(zipName);

            const zipFiles = [];

            // 使用 for...of 循环替代 forEach，以便正确处理 async/await
            for (let idx = 0; idx < this.fileQueue.length; idx++) {
                let status = true;
                const file = this.fileQueue[idx];
                // content 可能是 promise（Blob对象），需要等待
                if (file.content instanceof Promise) {
                    if (progressCallback && typeof progressCallback === "function") {
                        progressCallback(`正在下载资源：${file.filename} (${idx + 1}/${this.fileQueue.length})`);
                    }
                    try {
                        file.content = await file.content; // 等待Blob对象
                    } catch (err) {
                        if (progressCallback && typeof progressCallback === "function") {
                            progressCallback(`下载资源失败：${err}`);
                        }
                        status = false;
                    }
                }
                if (!status) {
                    continue; // 如果下载失败，跳过当前文件
                }
                // 将文件添加到ZIP中
                zipFiles.push({
                    name: file.filename,
                    data:
                        file.content instanceof Blob
                            ? new Uint8Array(await file.content.arrayBuffer())
                            : file.content instanceof Uint8Array
                            ? file.content
                            : new TextEncoder().encode(file.content),
                });
            }

            // 获取当前时间，以便计算剩余时间
            const startTime = Date.now();

            // 使用 fflate 创建 ZIP 文件
            const zipContent = await this.createZipWithProgress(
                zipFiles,
                (percent, currentFile) => {
                    // 进度回调
                    if (progressCallback) {
                        // percent: 当前进度百分比
                        // currentFile: 当前正在处理的文件名
                        progressCallback(
                            `正在打包：${currentFile} (${percent}%)(剩余时间：${Utils.formatSeconds(
                                ((Date.now() - startTime) / 1000 / percent) * (100 - percent)
                            )})`
                        );
                    }
                },
                async (error) => {
                    console.error("Error generating ZIP file:", error);
                    if (finalCallback && typeof finalCallback === "function") {
                        finalCallback(`下载失败：${zipName}，错误信息：${error}`);
                        this.reset(); // 清空文件队列
                        throw new Error(`下载失败：${zipName}，错误信息：${error}`);
                    }
                }
            );

            const zipBlob = new Blob([zipContent], { type: "application/octet-stream" });

            // 调用最终回调
            if (finalCallback && typeof finalCallback === "function") {
                finalCallback(
                    `打包完成：${zipName}，文件大小：${Utils.formatFileSize(zipBlob.size)}\n请等待下载完成。`
                );
            }

            this.reset(); // 清空文件队列

            this.fileQueue.push({
                filename: zipName,
                type: "application/zip",
                content: zipBlob,
            });
        }

        /**
         * 将文件队列打包为ZIP下载
         * @param {string} zipName - ZIP文件名
         */
        async zipAllFilesInQueue_jszip(zipName, progressCallback = null, finalCallback = null) {
            if (this.fileQueue.length === 0) {
                console.error("没有文件需要保存");
                return;
            }

            if (!zipName.endsWith(".zip")) {
                zipName = zipName + ".zip"; // 确保ZIP文件名以.zip结尾
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

            return new Promise((resolve, reject) => {
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
                                `打包完成：${zipName}，文件大小：${Utils.formatFileSize(blob.size)}\n请等待下载完成。`
                            );
                        }
                        this.reset(); // 清空文件队列
                        this.fileQueue.push({
                            filename: zipName,
                            type: "application/zip",
                            content: blob,
                        });
                        resolve();
                    })
                    .catch((error) => {
                        // 处理错误
                        this.reset(); // 清空文件队列
                        console.error("Error generating ZIP file:", error);
                        if (finalCallback) {
                            finalCallback(`下载失败：${zipName}，错误信息：${error}`);
                            throw new Error(`下载失败：${zipName}，错误信息：${error}`);
                        }
                        reject(error);
                    });
            });
        }

        /**
         * 下载队列里的全部文件
         */
        async downloadAllFilesInQueue() {
            if (this.fileQueue.length === 0) {
                console.dir("没有文件需要下载");
                return;
            }

            for (let i = 0; i < this.fileQueue.length; i++) {
                const file = this.fileQueue[i];
                let content = file.content;

                // 如果content是Promise，等待其完成
                if (content instanceof Promise) {
                    try {
                        content = await content;
                    } catch (error) {
                        console.error(`下载文件 ${file.filename} 失败:`, error);
                        continue;
                    }
                }

                // 创建Blob对象
                const blob = content instanceof Blob ? content : new Blob([content], { type: file.type });

                // 创建下载链接
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = file.filename;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);

                // 添加小延迟避免浏览器阻止多文件下载
                await new Promise((resolve) => setTimeout(resolve, 100));
            }

            this.reset(); // 清空文件队列
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
        reset() {
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
         * 创建HTML标签到处理函数的映射表
         * @returns {Object} 标签名称到处理方法的映射
         */
        static createTagHandlers() {
            return {
                h1: this.prototype.handleHeading,
                h2: this.prototype.handleHeading,
                h3: this.prototype.handleHeading,
                h4: this.prototype.handleHeading,
                h5: this.prototype.handleHeading,
                h6: this.prototype.handleHeading,
                p: this.prototype.handleParagraph,
                strong: this.prototype.handleStrong,
                b: this.prototype.handleStrong,
                em: this.prototype.handleEmphasis,
                i: this.prototype.handleEmphasis,
                u: this.prototype.handleUnderline,
                s: this.prototype.handleStrikethrough,
                strike: this.prototype.handleStrikethrough,
                a: this.prototype.handleAnchor,
                img: this.prototype.handleImage,
                ul: this.prototype.handleList,
                ol: this.prototype.handleList,
                blockquote: this.prototype.handleBlockquote,
                pre: this.prototype.handlePreformatted,
                code: this.prototype.handleCode,
                hr: this.prototype.handleHorizontalRule,
                br: this.prototype.handleLineBreak,
                table: this.prototype.handleTable,
                div: this.prototype.handleDiv,
                span: this.prototype.handleSpan,
                kbd: this.prototype.handleKeyboard,
                mark: this.prototype.handleMark,
                sub: this.prototype.handleSubscript,
                sup: this.prototype.handleSuperscript,
                svg: this.prototype.handleSvg,
                section: this.prototype.handleSection,
                input: this.prototype.handleInput,
                dl: this.prototype.handleDefinitionList,
                abbr: this.prototype.handleAbbreviation,
                font: this.prototype.handleFont,
                td: this.prototype.handleTableCell,
                th: this.prototype.handleTableCell,
                center: this.prototype.handleCenter,
            };
        }

        /**
         * @param {FileManager} fileManager - 文件管理实例
         * @constructor
         */
        constructor(fileManager) {
            this.fileManager = fileManager;
            this.tagHandlers = MarkdownConverter.createTagHandlers();

            // 预定义的特殊字段
            // 内容之间保持两个换行符
            this.CONSTANT_DOUBLE_NEW_LINE = "<|CSDN2MD@CONSTANT_DOUBLE_NEW_LINE@23hy7b|>";
            // 分隔符用于美化，比如公式和文本之间加上空格会更美观
            this.SEPARATION_BEAUTIFICATION = "<|CSDN2MD@SEPARATION_BEAUTIFICATION@2caev2|>";

            this.DDNL = this.escapeRegExp(this.CONSTANT_DOUBLE_NEW_LINE);
            this.SEPB = this.escapeRegExp(this.SEPARATION_BEAUTIFICATION);

            // 1. 连续的 "\n" 与 CONSTANT_DOUBLE_NEW_LINE 替换为 "\n\n"
            this.RE_DOUBLE_NL = new RegExp(`(?:\\n|${this.DDNL})*${this.DDNL}(?:\\n|${this.DDNL})*`, "g");
            // 2. 连续的 SEPARATION_BEAUTIFICATION 替换为 " "，但如果前面是换行符，替换为 ""
            this.RE_SEP_NOLINE = new RegExp(`(?<!\\n)(?:${this.SEPB})+`, "g");
            this.RE_SEP_WITHNL = new RegExp(`(\\n)(?:${this.SEPB})+`, "g");

            // 节点类型常量
            this.ELEMENT_NODE = 1;
            this.TEXT_NODE = 3;
            this.COMMENT_NODE = 8;
        }

        /**
         * 将HTML内容转换为Markdown格式
         * @param {Element} articleElement - 文章DOM元素
         * @param {Object} config - 配置选项
         * @param {string} [config.assetDirName=""] - 资源文件夹名
         * @param {boolean} [config.enableTOC=true] - 是否启用目录
         * @param {string} [config.imgPrefix=""] - 图片文件前缀
         * @param {boolean} [config.saveWebImages=false] - 是否将网络图片保存到本地
         * @param {number} [config.downloadAssetRetryCount=3] - 下载资源失败时的重试次数
         * @param {boolean} [config.enableStreaming=false] - 是否启用流式处理
         * @param {boolean} [config.forceImageCentering=false] - 是否强制所有图片居中
         * @param {boolean} [config.enableImageSize=false] - 是否保留图片尺寸
         * @param {boolean} [config.enableColorText=false] - 是否保留彩色文本
         * @param {boolean} [config.removeCSDNSearchLink=true] - 是否移除CSDN搜索链接
         * @returns {Promise<string>} Markdown内容
         */
        async htmlToMarkdown(articleElement, config = {}) {
            // 设置默认配置
            const defaultConfig = {
                assetDirName: "",
                enableTOC: true,
                imgPrefix: "",
                saveWebImages: false,
                downloadAssetRetryCount: 3,
                downloadAssetRetryDelay: 1000,
                enableStreaming: false,
                forceImageCentering: false,
                enableImageSize: false,
                enableColorText: false,
                removeCSDNSearchLink: true,
                enableMarkdownEscape: true,
                markdownEscapePattern: "`*_[]{}()#+-.!",
            };

            // 合并用户配置和默认配置，并添加上下文信息
            const context = {
                ...defaultConfig,
                ...config,
                listLevel: 0,
            };

            // 处理文章元素的子节点
            const markdown = await this.processChildren(articleElement, context);

            // 后处理Markdown内容，美化输出
            return this.postProcessMarkdown(markdown.trim());
        }

        /**
         * 处理单个DOM节点
         * @param {Node} node - 当前DOM节点
         * @param {Object} context - 处理上下文
         * @returns {Promise<string>} 节点的Markdown字符串
         */
        async processNode(node, context) {
            switch (node.nodeType) {
                case this.ELEMENT_NODE:
                    const tagName = node.tagName.toLowerCase();
                    const handler = this.tagHandlers[tagName];
                    return handler
                        ? await handler.call(this, node, context)
                        : await this.handleDefaultElement(node, context);

                case this.TEXT_NODE:
                    // 处理文本节点（即没有被单独的标签包裹的文本）
                    if (context.enableMarkdownEscape) {
                        // 如果启用了Markdown转义，则转义文本内容
                        return this.escapeMarkdown(node.textContent, context.markdownEscapePattern);
                    } else {
                        return node.textContent.trim(); // 如果没有启用转义，则直接返回文本内容
                    }
                case this.COMMENT_NODE:
                    // 忽略注释
                    return "";

                default:
                    return "";
            }
        }

        /**
         * 处理元素的子节点
         * @param {Node} node - 父节点
         * @param {Object} context - 处理上下文
         * @returns {Promise<string>} 子节点拼接后的Markdown字符串
         */
        async processChildren(node, context) {
            let result = "";
            for (const child of node.childNodes) {
                result += await this.processNode(child, context);
            }
            return result;
        }

        /**
         * 转义特殊的Markdown字符
         * @param {string} text - 需要转义的文本
         * @returns {string} 转义后的文本
         */
        escapeMarkdown(text, escapePattern = "`*_[]{}()#+-.!") {
            // 注：原代码中有一个被注释掉的转义逻辑，这里只保留了trim操作
            // return text.replace(/([\\`*_\{\}\[\]()#+\-.!])/g, "\\$1").trim();
            // return text.trim(); // 不转义特殊字符

            // 使用正则表达式转义特殊字符
            escapePattern = this.escapeRegExp(escapePattern);
            const escapeRegex = new RegExp(`([${escapePattern}])`, "g");
            return text.replace(escapeRegex, "\\$1").trim();
        }

        /**
         * 对常量做正则转义
         * @param {string} s - 需要转义的字符串
         * @returns {string} 转义后的字符串
         */
        escapeRegExp(s) {
            return s.replaceAll(/[\-\.\*\+\?\^\$\{\}\(\)\|\[\]\\]/g, "\\$&");
        }

        /**
         * 特殊字符串修剪函数：移除字符串开头和结尾的分隔符和空白字符
         * @param {string} text - 需要修剪的字符串
         * @returns {string} 修剪后的字符串
         */
        specialTrim(text = "") {
            return text
                .replace(new RegExp(`^(?:${this.SEPB}|\\s)+`), "")
                .replace(new RegExp(`(?:${this.SEPB}|\\s)+$`), "");
        }

        /**
         * 后处理Markdown内容
         * @param {string} markdown - 原始Markdown内容
         * @returns {string} 处理后的Markdown内容
         */
        postProcessMarkdown(markdown) {
            return markdown
                .replaceAll(this.RE_DOUBLE_NL, "\n\n") // 吃掉前后重复换行和标记，统一为两个换行
                .replaceAll(this.RE_SEP_NOLINE, " ") // 非换行前的标记串 → 空格
                .replaceAll(this.RE_SEP_WITHNL, "$1"); // 换行后的标记串 → 保留换行
        }

        /****************************************
         * 标签处理函数
         ****************************************/

        /**
         * 处理标题元素（h1-h6）
         */
        async handleHeading(node, context) {
            const level = parseInt(node.tagName[1]);

            // 移除节点内部开头的空 <a> 标签
            node.querySelectorAll("a").forEach((aTag) => {
                if (aTag && aTag.textContent.trim() === "") {
                    aTag.remove();
                }
            });

            let content = await this.processChildren(node, context);

            // 按行分割分别处理
            // 如果该行内容不为空且不包含图片，则添加标题前缀
            content = content
                .split("\n")
                .map((line) => {
                    if (line.trim() !== "") {
                        // 如果该行内容是 <img /> 标签，则不添加前缀
                        if (line.trim().search("<img") !== -1 && line.trim().search("/>") !== -1) {
                            return line;
                        }
                        return `${"#".repeat(level)} ${line}`;
                    }
                    return line;
                })
                .join("\n");

            return `${content}${this.CONSTANT_DOUBLE_NEW_LINE}`;
        }

        /**
         * 处理段落元素
         */
        async handleParagraph(node, context) {
            const cls = node.getAttribute("class");
            const style = node.getAttribute("style");

            if (cls && cls.includes("img-center")) {
                // 处理图片居中，类似 <center> 标签
                this.addPicCenterToImages(node);
                return (await this.processChildren(node, context)) + this.CONSTANT_DOUBLE_NEW_LINE;
            }

            // 处理目录
            if (node.getAttribute("id") === "main-toc") {
                if (context.enableTOC) {
                    return `**目录**\n\n[TOC]\n\n`;
                }
                return "";
            }

            let text = await this.processChildren(node, context);

            // 处理带样式的段落
            if (style) {
                if (style.includes("padding-left")) {
                    return "";
                }
                if (style.includes("text-align:center")) {
                    return `<div style="text-align:center;">${Utils.shrinkHtml(node.innerHTML)}</div>\n\n`;
                } else if (style.includes("text-align:right")) {
                    return `<div style="text-align:right;">${Utils.shrinkHtml(node.innerHTML)}</div>\n\n`;
                }
            }

            return `${text}\n\n`;
        }

        /**
         * 处理加粗元素
         */
        async handleStrong(node, context) {
            const content = this.specialTrim(await this.processChildren(node, context));
            if (content === "") return "";
            return `${this.SEPARATION_BEAUTIFICATION}**${content}**${this.SEPARATION_BEAUTIFICATION}`;
        }

        /**
         * 处理斜体元素
         */
        async handleEmphasis(node, context) {
            const content = this.specialTrim(await this.processChildren(node, context));
            if (content === "") return "";
            return `${this.SEPARATION_BEAUTIFICATION}*${content}*${this.SEPARATION_BEAUTIFICATION}`;
        }

        /**
         * 处理下划线元素
         */
        async handleUnderline(node, context) {
            const content = this.specialTrim(await this.processChildren(node, context));
            if (content === "") return "";
            return `${this.SEPARATION_BEAUTIFICATION}<u>${content}</u>${this.SEPARATION_BEAUTIFICATION}`;
        }

        /**
         * 处理删除线元素
         */
        async handleStrikethrough(node, context) {
            const content = this.specialTrim(await this.processChildren(node, context));
            if (content === "") return "";
            return `${this.SEPARATION_BEAUTIFICATION}~~${content}~~${this.SEPARATION_BEAUTIFICATION}`;
        }

        /**
         * 处理链接元素
         */
        async handleAnchor(node, context) {
            const nodeClass = node.getAttribute("class");
            // 忽略脚注返回链接
            if (nodeClass && nodeClass.includes("footnote-backref")) {
                return "";
            }

            const href = node.getAttribute("href") || "";
            // 处理卡片链接
            if (nodeClass && nodeClass.includes("has-card")) {
                const desc = node.title || "";
                return `[${desc}](${href}) `;
            }

            let text = await this.processChildren(node, context);
            // 处理CSDN搜索链接
            if (href.includes("https://so.csdn.net/so/search") && context.removeCSDNSearchLink) {
                return text;
            }

            // 适配旧版CSDN的 "OLE_LINK{xxx}" 链接
            const name = node.getAttribute("name") || "";
            if (name.startsWith("OLE_LINK")) {
                text = text.replaceAll("\n", "");
            }

            // 如果链接和文本都为空，则返回空字符串
            if (text === "" && href === "") return "";
            return `${this.SEPARATION_BEAUTIFICATION}[${text}](${href})${this.SEPARATION_BEAUTIFICATION}`;
        }

        /**
         * 处理图片元素
         */
        async handleImage(node, context) {
            let src = node.getAttribute("src") || "";
            const alt = node.getAttribute("alt") || "";
            const cls = node.getAttribute("class") || "";
            const width = node.getAttribute("width") || "";
            const height = node.getAttribute("height") || "";
            let result = "";

            // 处理数学代码图片
            if (cls.includes("mathcode")) {
                return `${this.SEPARATION_BEAUTIFICATION}\$\$\n${alt}\n\$\$`;
            } else {
                // 根据图片是否居中添加空格
                if (src.includes("#pic_center") || context.forceImageCentering) {
                    result = this.CONSTANT_DOUBLE_NEW_LINE;
                } else {
                    result = " ";
                }

                // 保存网络图片到本地（如果配置启用）
                if (context.saveWebImages) {
                    src = await this.fileManager.addWebImageFile(
                        src,
                        context.assetDirName,
                        context.imgPrefix,
                        context.enableStreaming,
                        context.downloadAssetRetryCount,
                        context.downloadAssetRetryDelay
                    );
                }

                // 处理图片尺寸
                if (height && context.enableImageSize) {
                    // 如果 height 是数字，则添加 px；如果带有单位，则直接使用
                    const heightValue = height.replace(/[^0-9]/g, "");
                    const heightUnit = height.replace(/[0-9]/g, "") || "px";
                    const heightStyle = heightValue ? `max-height:${heightValue}${heightUnit};` : "";
                    result += `<img src="${src}" alt="${alt}" style="${heightStyle} box-sizing:content-box;" />`;
                } else if (width && context.enableImageSize) {
                    // 如果 width 是数字，则添加 px；如果带有单位，则直接使用
                    const widthValue = width.replace(/[^0-9]/g, "");
                    const widthUnit = width.replace(/[0-9]/g, "") || "px";
                    const widthStyle = widthValue ? `max-width:${widthValue}${widthUnit};` : "";
                    result += `<img src="${src}" alt="${alt}" style="${widthStyle} box-sizing:content-box;" />`;
                } else {
                    result += `![${alt}](${src})`;
                }

                return result + this.CONSTANT_DOUBLE_NEW_LINE;
            }
        }

        /**
         * 处理列表元素（ul/ol）
         */
        async handleList(node, context) {
            const ordered = node.tagName.toLowerCase() === "ol";
            // 创建新的上下文，增加列表嵌套级别
            const newContext = { ...context, listLevel: context.listLevel + 1 };

            let result = this.CONSTANT_DOUBLE_NEW_LINE;
            // 筛选出所有li元素
            const children = Array.from(node.children).filter((child) => child.tagName.toLowerCase() === "li");

            for (let index = 0; index < children.length; index++) {
                const child = children[index];

                // 根据列表类型选择前缀和缩进
                const prefix = ordered ? `${index + 1}. ` : `- `;
                const indent = ordered ? "   " : "  ";

                let childText = await this.processChildren(child, newContext);

                // 处理嵌套列表的换行和缩进
                childText = childText.replaceAll(this.RE_DOUBLE_NL, "\n\n");

                // 对除第一行外的所有行添加缩进
                childText = childText
                    .split("\n")
                    .map((line, i) => {
                        // 如果是空行或首行，则不添加缩进
                        if (line.trim() === "" || i === 0) {
                            return line;
                        }
                        return `${indent}${line}`;
                    })
                    .join("\n");

                result += `${prefix}${childText}${this.CONSTANT_DOUBLE_NEW_LINE}`;
            }

            return result;
        }

        /**
         * 处理引用块元素
         */
        async handleBlockquote(node, context) {
            // 处理每一行，添加引用标记 >
            const text = (await this.processChildren(node, context))
                .trim()
                .split("\n")
                .map((line) => (line ? `> ${line}` : "> "))
                .join("\n");

            return `${text}\n\n`;
        }

        /**
         * 处理预格式化代码块
         */
        async handlePreformatted(node, context) {
            const codeNode = node.querySelector("code");
            if (codeNode) {
                const className = codeNode.className || "";
                let language = "";

                // 提取语言信息
                // 新版本的代码块，class含有language-xxx
                if (className.includes("language-")) {
                    for (const item of className.split(" ")) {
                        if (item.startsWith("language-")) {
                            language = item.replace("language-", "");
                            break;
                        }
                    }
                }
                // 老版本的代码块
                else if (className.startsWith("hljs")) {
                    const languageMatch = className.split(" ");
                    language = languageMatch.length > 1 ? languageMatch[1] : "";
                }

                return `\`\`\`${language}\n${await this.processCodeBlock(codeNode)}\`\`\`\n\n`;
            } else {
                const codeText = node.textContent.replace(/^\s+|\s+$/g, "");
                return `\`\`\`\n${codeText}\n\`\`\`\n\n`;
            }
        }

        /**
         * 处理行内代码元素
         */
        async handleCode(node, context) {
            const codeText = node.textContent;
            return `${this.SEPARATION_BEAUTIFICATION}\`${codeText}\`${this.SEPARATION_BEAUTIFICATION}`;
        }

        /**
         * 处理水平分割线元素
         */
        async handleHorizontalRule(node, context) {
            if (node.getAttribute("id") !== "hr-toc") {
                return `---\n\n`;
            }
            return "";
        }

        /**
         * 处理换行元素
         */
        async handleLineBreak(node, context) {
            return `\n`;
        }

        /**
         * 处理表格元素
         */
        async handleTable(node, context) {
            const rows = Array.from(node.querySelectorAll("tr"));
            if (rows.length === 0) return "";

            let table = "";

            // 处理表头
            const headerCells = Array.from(rows[0].querySelectorAll("th, td"));

            const headers = await Promise.all(
                headerCells.map(async (cell) => {
                    const content = await this.processNode(cell, context);
                    return content.trim().replaceAll(this.RE_DOUBLE_NL, "<br />");
                })
            );

            table += `| ${headers.join(" | ")} |\n`;

            // 处理分隔符行（对齐方式）
            const alignments = headerCells.map((cell) => {
                const align = cell.getAttribute("align");
                if (align === "center") return ":---:";
                if (align === "right") return "---:";
                if (align === "left") return ":---";
                return ":---:"; // 默认居中
            });

            table += `|${alignments.join("|")}|\n`;

            // 处理表格内容行
            for (let i = 1; i < rows.length; i++) {
                const cells = Array.from(rows[i].querySelectorAll("td"));
                const rowContent = await Promise.all(
                    cells.map(async (cell) => {
                        const content = await this.processNode(cell, context);
                        return content.trim().replaceAll(this.RE_DOUBLE_NL, "<br />");
                    })
                );

                table += `| ${rowContent.join(" | ")} |`;
                if (i < rows.length - 1) {
                    table += "\n";
                }
            }

            return table + "\n\n";
        }

        /**
         * 处理div元素
         */
        async handleDiv(node, context) {
            const className = node.getAttribute("class") || "";

            // 处理视频盒子
            if (className.includes("csdn-video-box")) {
                const iframe = node.querySelector("iframe");
                if (iframe) {
                    const src = iframe.getAttribute("src") || "";
                    const titleElem = node.querySelector("p");
                    const title = titleElem ? titleElem.textContent || "" : "";

                    const iframeHTML = iframe.outerHTML.replace(
                        "></iframe>",
                        ' style="width: 100%; aspect-ratio: 2;"></iframe>'
                    );

                    return `<div align="center" style="border: 3px solid gray;border-radius: 27px;overflow: hidden;"> <a class="link-info" href="${src}" rel="nofollow" title="${title}">${title}</a>${iframeHTML}</div>\n\n`;
                }
            }
            // 处理目录
            else if (className.includes("toc")) {
                if (context.enableTOC) {
                    const titleElem = node.querySelector("h4");
                    const customTitle = titleElem ? titleElem.textContent || "" : "";
                    return `**${customTitle}**\n\n[TOC]\n\n`;
                }
            }

            return `${await this.processChildren(node, context)}\n`;
        }

        /**
         * 处理span元素
         */
        async handleSpan(node, context) {
            const nodeClass = node.getAttribute("class");

            // 处理KaTeX数学公式
            if (nodeClass) {
                if (nodeClass.includes("katex--inline") || nodeClass.includes("katex--display")) {
                    return this.handleKatexElement(node, nodeClass);
                }
            }

            // 处理带颜色的文本
            const style = node.getAttribute("style") || "";
            if ((style.includes("background-color") || style.includes("color")) && context.enableColorText) {
                if (node.childNodes.length === 1 && node.childNodes[0].nodeType === this.TEXT_NODE) {
                    return `<span style="${style}">${await this.processChildren(node, context)}</span>`;
                }
            }

            return await this.processChildren(node, context);
        }

        /**
         * 处理KaTeX数学公式元素
         */
        handleKatexElement(node, nodeClass) {
            const katexMathmlElem = node.querySelector(".katex-mathml");
            const katexHtmlElem = node.querySelector(".katex-html");

            if (!katexMathmlElem || !katexHtmlElem) return "";

            // 清理KaTeX元素
            this.cleanKatexElements(katexMathmlElem);

            const mathml = Utils.clearSpecialChars(katexMathmlElem.textContent);
            const katexHtml = Utils.clearSpecialChars(katexHtmlElem.textContent);

            // 处理行内公式和行间公式
            if (nodeClass.includes("katex--inline")) {
                // 行内公式
                if (mathml.startsWith(katexHtml)) {
                    return `${this.SEPARATION_BEAUTIFICATION}\$${mathml.replace(katexHtml, "")}\$${
                        this.SEPARATION_BEAUTIFICATION
                    }`;
                } else {
                    return `${this.SEPARATION_BEAUTIFICATION}\$${Utils.clearKatexMathML(
                        katexMathmlElem.textContent
                    )}\$${this.SEPARATION_BEAUTIFICATION}`;
                }
            } else {
                // 行间公式
                if (mathml.startsWith(katexHtml)) {
                    return `${this.CONSTANT_DOUBLE_NEW_LINE}\$\$\n${mathml.replace(katexHtml, "")}\n\$\$${
                        this.CONSTANT_DOUBLE_NEW_LINE
                    }`;
                } else {
                    return `${this.CONSTANT_DOUBLE_NEW_LINE}\$\$\n${Utils.clearKatexMathML(
                        katexMathmlElem.textContent
                    )}\n\$\$${this.CONSTANT_DOUBLE_NEW_LINE}`;
                }
            }
        }

        /**
         * 清理KaTeX元素
         * 移除可能导致公式显示错乱的元素
         */
        cleanKatexElements(katexMathmlElem) {
            const elementsToRemove = [".MathJax_Display", ".MathJax_Preview", ".MathJax_Error"];

            elementsToRemove.forEach((selector) => {
                if (katexMathmlElem.querySelector(selector) && katexMathmlElem.querySelector("script")) {
                    katexMathmlElem.querySelectorAll(selector).forEach((elem) => elem.remove());
                }
            });
        }

        /**
         * 处理键盘按键元素
         */
        async handleKeyboard(node, context) {
            return `${this.SEPARATION_BEAUTIFICATION}<kbd>${node.textContent}</kbd>${this.SEPARATION_BEAUTIFICATION}`;
        }

        /**
         * 处理标记（高亮）元素
         */
        async handleMark(node, context) {
            return `${this.SEPARATION_BEAUTIFICATION}<mark>${await this.processChildren(node, context)}</mark>${
                this.SEPARATION_BEAUTIFICATION
            }`;
        }

        /**
         * 处理下标元素
         */
        async handleSubscript(node, context) {
            return `<sub>${await this.processChildren(node, context)}</sub>`;
        }

        /**
         * 处理上标元素
         */
        async handleSuperscript(node, context) {
            const nodeClass = node.getAttribute("class");
            // 处理脚注引用
            if (nodeClass && nodeClass.includes("footnote-ref")) {
                return `[^${node.textContent}]`;
            } else {
                return `<sup>${await this.processChildren(node, context)}</sup>`;
            }
        }

        /**
         * 处理SVG元素
         */
        async handleSvg(node, context) {
            const style = node.getAttribute("style");
            if (style && style.includes("display: none")) {
                return "";
            }

            // 为foreignObject里的div添加属性xmlns="http://www.w3.org/1999/xhtml"，否则typora无法识别
            const foreignObjects = node.querySelectorAll("foreignObject");
            for (const foreignObject of foreignObjects) {
                const divs = foreignObject.querySelectorAll("div");
                divs.forEach((div) => {
                    div.setAttribute("xmlns", "http://www.w3.org/1999/xhtml");
                });
            }

            // 保存SVG图像
            if (context.saveWebImages) {
                const svgSavePath = await this.fileManager.addSvgFile(
                    node.outerHTML,
                    context.assetDirName,
                    context.imgPrefix,
                    context.enableStreaming
                );
                return `![](${svgSavePath})${this.CONSTANT_DOUBLE_NEW_LINE}`;
            } else {
                // 检查是否有style标签存在于svg元素内，如果有则转换为base64形式
                if (node.querySelector("style")) {
                    const base64 = Utils.svgToBase64(node.outerHTML);
                    return `![](data:image/svg+xml;base64,${base64})${this.CONSTANT_DOUBLE_NEW_LINE}`;
                } else {
                    return `<div align="center">${node.outerHTML}</div>${this.CONSTANT_DOUBLE_NEW_LINE}`;
                }
            }
        }

        /**
         * 处理section元素
         */
        async handleSection(node, context) {
            const nodeClass = node.getAttribute("class");
            // 处理脚注内容
            if (nodeClass && nodeClass.includes("footnotes")) {
                return await this.processFootnotes(node);
            }
            return await this.processChildren(node, context);
        }

        /**
         * 处理input元素
         */
        async handleInput(node, context) {
            // 仅处理checkbox类型的input元素
            if (node.getAttribute("type") === "checkbox") {
                return `[${node.checked ? "x" : " "}] `;
            }
            return "";
        }

        /**
         * 处理定义列表元素
         */
        async handleDefinitionList(node, context) {
            // 自定义列表，直接用HTML
            return `${Utils.shrinkHtml(node.outerHTML)}\n\n`;
        }

        /**
         * 处理缩写元素
         */
        async handleAbbreviation(node, context) {
            return Utils.shrinkHtml(node.outerHTML);
        }

        /**
         * 处理字体元素
         */
        async handleFont(node, context) {
            // 避免进入 default，直接处理子元素
            return await this.processChildren(node, context);
        }

        /**
         * 处理表格单元格元素
         */
        async handleTableCell(node, context) {
            return await this.processChildren(node, context);
        }

        /**
         * 处理居中元素
         */
        async handleCenter(node, context) {
            if (node.childNodes.length === 1 && node.childNodes[0].nodeType === this.TEXT_NODE) {
                // 只有一个文本子节点时，使用center标签
                return `<center>${node.textContent.trim().replaceAll("\n", "<br>")}</center>\n\n`;
            } else {
                // 处理含有图片的居中标签，为图片添加#pic_center后缀
                this.addPicCenterToImages(node);
                return (await this.processChildren(node, context)) + this.CONSTANT_DOUBLE_NEW_LINE;
            }
        }

        /**
         * 默认元素处理器，用于没有特定处理器的元素
         */
        async handleDefaultElement(node, context) {
            return (await this.processChildren(node, context)) + this.CONSTANT_DOUBLE_NEW_LINE;
        }

        /****************************************
         * 辅助方法
         ****************************************/

        /**
         * 为图片添加#pic_center后缀以实现居中效果
         */
        addPicCenterToImages(node) {
            node.querySelectorAll("img").forEach((img) => {
                const src = img.getAttribute("src");
                if (src && !src.includes("#pic_center")) {
                    img.setAttribute("src", src + "#pic_center");
                }
            });
        }

        /**
         * 处理代码块内容
         * 支持新旧两种代码块格式
         */
        async processCodeBlock(codeNode) {
            // 查找code内部是否有ol元素（新版代码块格式）
            const olNode = codeNode.querySelector("ol");

            if (!olNode || olNode.tagName.toLowerCase() !== "ol") {
                // 老版本的代码块，直接返回文本内容
                return codeNode.textContent.replace(/\n$/, "") + "\n";
            }

            // 新版本的代码块，处理每行代码
            const listItems = olNode.querySelectorAll("li");
            let result = "";

            // 遍历每个<li>元素（每行代码）
            listItems.forEach((li) => {
                result += li.textContent + "\n";
            });

            return result;
        }

        /**
         * 处理脚注
         * 将脚注列表转换为Markdown格式
         */
        async processFootnotes(node) {
            const footnotes = Array.from(node.querySelectorAll("li"));
            let result = "";

            for (let index = 0; index < footnotes.length; index++) {
                const li = footnotes[index];
                // 移除换行和返回符号，格式化脚注内容
                const text = (await this.processNode(li, {})).replaceAll("\n", " ").replaceAll("↩︎", "").trim();

                result += `[^${index + 1}]: ${text}\n`;
            }

            return result;
        }
    }

    /**
     * 模块: 文章下载管理
     * 协调各模块完成文章下载功能
     */
    class ArticleDownloader {
        /**
         * @param {UIManager} [uiManager=null] - UI管理器实例
         */
        constructor(uiManager = null) {
            /** @type {FileManager} */
            this.fileManager = new FileManager();
            /** @type {MarkdownConverter} */
            this.markdownConverter = new MarkdownConverter(this.fileManager);
            /** @type {UIManager} */
            this.uiManager = uiManager;
        }

        /**
         * 设置UI管理器
         * @param {UIManager} uiManager - UI管理器实例
         **/
        setUIManager(uiManager) {
            this.uiManager = uiManager;
        }

        reset() {
            this.fileManager.reset();
        }

        async unfoldHideArticleBox(document_body) {
            // 展开隐藏的文章内容
            const hideArticleBox = document_body.querySelector(".hide-article-box");
            if (!hideArticleBox) return;

            const readAllContentBtn = hideArticleBox.querySelector(".read-all-content-btn");
            if (!readAllContentBtn) return;

            readAllContentBtn.click();
            console.dir("已展开隐藏的文章内容。");

            // 动态等待 #article_content 加载完成
            const articleContent = document_body.querySelector("#article_content");
            if (!articleContent) {
                throw new Error("未找到文章内容元素 #article_content");
            }

            // 创建动态等待函数
            const waitForContentStable = (element, timeout = 30000, stabilityDelay = 1000) => {
                return new Promise((resolve, reject) => {
                    let stabilityTimer = null;
                    let timeoutTimer = null;
                    const observer = new MutationObserver(() => {
                        if (timeoutTimer) {
                            clearTimeout(timeoutTimer);
                            timeoutTimer = null; // 清除超时计时器
                        }
                        if (stabilityTimer) clearTimeout(stabilityTimer);
                        stabilityTimer = setTimeout(resolve, stabilityDelay); // 重置稳定倒计时
                    });
                    observer.observe(element, {
                        childList: true, // 监听子元素变化
                        subtree: true, // 监听所有后代
                        attributes: true, // 监听属性变化
                    });
                    // 设置超时强制返回
                    setTimeout(() => {
                        observer.disconnect();
                        reject(new Error(`等待加载超时 (${timeout}ms)`));
                    }, timeout);
                });
            };
            await waitForContentStable(articleContent);
            console.dir("内容展开完成");
        }

        /**
         * 解析网页并转换为Markdown格式
         * @param {Document} doc_body - 文章的body元素
         * @param {Object} config - 配置选项
         * @param {string} config.articleUrl - 文章链接
         * @param {number} config.fileIndex - 文件索引（用于批量下载）
         * @param {number} config.fileTotal - 文件总数（用于批量下载）
         * @param {boolean} config.enableStreaming - 是否启用流式处理
         * @param {boolean} config.mergeArticleContent - 是否合并文章内容
         * @param {boolean} config.saveAllImagesToAssets - 是否将所有图片保存
         * @param {boolean} config.addSerialNumberToTitle - 是否在标题前添加序号
         * @param {boolean} config.addArticleInfoInBlockquote - 是否在引用块中添加文章信息
         * @param {boolean} config.addArticleTitleToMarkdown - 是否在Markdown中添加文章标题
         * @param {boolean} config.addArticleInfoInYaml - 是否在YAML中添加文章信息
         * @param {boolean} config.saveWebImages - 是否保存网络图片
         * @param {number} config.downloadAssetRetryCount - 下载网络图片的重试次数
         * @param {boolean} config.forceImageCentering - 是否强制图片居中
         * @param {boolean} config.enableImageSize - 是否启用图片尺寸
         * @param {boolean} config.enableColorText - 是否启用彩色文本
         * @param {boolean} config.removeCSDNSearchLink - 是否移除CSDN搜索链接
         * @param {string} config.customFileNamePattern - 是否使用自定义文件名模式
         * @param {boolean} config.enableCustomFileName - 是否启用自定义文件名
         * @returns {Promise<string>} 解析后的文章标题
         * @throws {Error} 如果未找到文章内容
         */
        async parseArticle(doc_body, config = {}) {
            const { articleUrl = "", fileIndex = 0, fileTotal = 1 } = config;

            await this.unfoldHideArticleBox(doc_body);
            const articleTitle = doc_body.querySelector("#articleContentId")?.textContent.trim() || "未命名文章";
            const articleAuthor = doc_body.querySelector("#uid")?.textContent.trim() || "";
            const articleInfo =
                doc_body
                    .querySelector(".bar-content")
                    ?.textContent.replace(/\s{2,}/g, " ")
                    .trim() || "";
            const htmlInput = doc_body.querySelector("#content_views");
            if (!htmlInput) throw new Error("未找到文章内容。请检查网页结构是否发生变化。");

            const padNo = `${String(fileIndex).padStart(fileTotal.toString().length, "0")}`;
            let fileName = articleTitle;
            if (fileIndex > 0 && config.enableCustomFileName) {
                fileName = config.customFileNamePattern
                    .replaceAll("{no}", padNo)
                    .replaceAll("{title}", articleTitle)
                    .replaceAll("{author}", articleAuthor)
                    .replaceAll("{index}", fileIndex.toString());
            }

            this.uiManager.showFloatTip(
                `正在解析文章：(${fileTotal - Math.max(1, fileIndex) + 1}/${fileTotal}) ` + articleTitle
            );
            let markdown = await this.markdownConverter.htmlToMarkdown(htmlInput, {
                assetDirName: config.mergeArticleContent || config.saveAllImagesToAssets ? "assets" : fileName,
                enableTOC: !config.mergeArticleContent,
                imgPrefix: `${padNo}_`,
                ...config, // 传入其他配置选项
            });

            if (config.addArticleInfoInBlockquote) {
                markdown = `> ${articleInfo}\n> 文章链接：${Utils.clearUrl(articleUrl)}\n\n${markdown}`;
            }
            if (config.addArticleTitleToMarkdown) {
                if (config.addSerialNumberToTitle) {
                    markdown = `# ${padNo} ${articleTitle}\n\n${markdown}`;
                } else {
                    markdown = `# ${articleTitle}\n\n${markdown}`;
                }
            }
            if (config.addArticleInfoInYaml) {
                const article_info_box = doc_body.querySelector(".article-info-box");
                // 文章标题
                const meta_title = config.addSerialNumberToTitle ? `${padNo} ${articleTitle}` : articleTitle;
                // 文章日期 YYYY-MM-DD HH:MM:SS
                const meta_date =
                    article_info_box
                        ?.querySelector(".time")
                        ?.textContent.match(/\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/)[0] || "";
                let articleMeta = `title: ${meta_title}\ndate: ${meta_date}\n`;
                // 文章分类和标签
                if (article_info_box) {
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
                }
                markdown = `---\n${articleMeta}---\n\n${markdown}`;
            }

            // 这里不启用流式压缩，在解析结束时会统一压缩，文本占用内存比较小
            await this.fileManager.addTextFile(markdown, `${fileName}.md`, fileIndex, false);

            return articleTitle;
        }

        /**
         * 在iframe中下载文章
         * @param {string} url - 文章URL
         * @param {object} config - 配置选项
         * @returns {Promise<void>}
         */
        async downloadArticleInIframe(url, config = {}) {
            return new Promise((resolve, reject) => {
                const originalUrl = url; // 保存原始URL
                let isRedirected = false; // 重置重定向标志

                const hasCaptcha = (doc) => {
                    return doc.body.querySelector(".text-wrap")?.textContent.includes("安全验证");
                };

                const onCheckPassed = () => {
                    // 创建一个隐藏的iframe
                    const iframe = document.createElement("iframe");
                    const showIframe = (iframe_element) => {
                        iframe_element.style.display = "block"; // 显示iframe
                        iframe_element.style.position = "fixed";
                        iframe_element.style.top = "50%";
                        iframe_element.style.left = "50%";
                        iframe_element.style.transform = "translate(-50%, -50%)";
                        iframe_element.style.width = "80vw";
                        iframe_element.style.height = "80vh";
                        iframe_element.style.zIndex = "99999";
                        iframe_element.style.background = "#fff";
                        iframe_element.style.boxShadow = "0 4px 24px rgba(0,0,0,0.18)";
                        iframe_element.style.border = "2px solid #12c2e9";
                        iframe_element.style.borderRadius = "12px";
                    };
                    const hideIframe = (iframe_element) => {
                        iframe_element.style.display = "none"; // 隐藏iframe
                    };
                    hideIframe(iframe); // 初始隐藏iframe
                    document.body.appendChild(iframe);
                    iframe.src = url;

                    // 监听iframe加载完成事件
                    iframe.onload = async () => {
                        console.dir(`iframe加载完成，开始下载文章： Url: ${url}`);
                        try {
                            const doc = iframe.contentDocument || iframe.contentWindow.document;

                            // 检查是否有验证码
                            if (hasCaptcha(doc)) {
                                console.dir(`检测到验证码： Url: ${url}`);
                                await this.uiManager.showConfirmDialog(
                                    `检测到验证码，您需要手动验证通过后，再刷新页面重新进行下载。\n点击确认将显示该验证页面，若取消则无法下载。\nUrl: ${url}`,
                                    async () => {
                                        // 用户点击确认后，重新加载iframe
                                        console.dir(`用户确认验证码处理： Url: ${url}`);
                                        showIframe(iframe);
                                    },
                                    () => {
                                        // 用户点击取消后，移除iframe并拒绝Promise
                                        console.dir(`用户取消验证码处理： Url: ${url}`);
                                        document.body.removeChild(iframe);
                                    }
                                );
                                return;
                            }

                            // 调用解析函数
                            await this.parseArticle(doc.body, {
                                ...config, // 传入其他配置选项
                                articleUrl: url,
                            });
                            // 移除iframe
                            document.body.removeChild(iframe);
                            resolve();
                        } catch (error) {
                            // 在发生错误时移除iframe并拒绝Promise
                            document.body.removeChild(iframe);
                            console.dir(
                                `解析文章时出错： Url: ${url} OriginalUrl: ${originalUrl} Redirected: ${isRedirected}. Original error: ${
                                    error.message || error
                                }`
                            );
                            const newError = new Error(
                                `解析文章时出错：Url: ${url} OriginalUrl: ${originalUrl} Redirected: ${isRedirected}. Original error: ${
                                    error.message || error
                                }`
                            );
                            newError.stack = error.stack;
                            reject(newError);
                        }
                    };

                    // 监听iframe加载错误事件
                    iframe.onerror = (error) => {
                        document.body.removeChild(iframe);
                        console.dir(
                            `Iframe加载失败： Url: ${url} OriginalUrl: ${originalUrl} Redirected: ${isRedirected}. Original error: ${
                                error.message || error
                            }`
                        );
                        const newError = new Error(
                            `Iframe加载失败：Url: ${url} OriginalUrl: ${originalUrl} Redirected: ${isRedirected}. Original error: ${
                                error.message || error
                            }`
                        );
                        newError.stack = error.stack || new Error().stack;
                        reject(error);
                    };
                };

                const uiManager = this.uiManager;

                // FIX: 使用 GM_xmlhttpRequest 检测是否存在重定向
                // https://github.com/Qalxry/csdn2md/issues/6
                // https://github.com/Qalxry/csdn2md/issues/7
                GM_xmlhttpRequest({
                    method: "HEAD",
                    url: url,
                    redirect: "manual", // 禁止自动重定向
                    onload: async function (response) {
                        if (response.status === 301 || response.status === 302) {
                            const redirectUrl = response.responseHeaders.match(/Location:\s*(.+)/i)?.[1];
                            console.dir(`检测到重定向: ${url} -> ${redirectUrl}`);
                            isRedirected = true; // 设置重定向标志
                            // 将 http 替换为 https
                            url = redirectUrl.replace(/^http:\/\//, "https://");
                        } else if (response.status !== 200) {
                            console.dir(`文章页面状态码异常：Url: ${url} Response Status: ${response.status}`);
                            // 这里的检测无意义，反而导致用户体验变差
                            // 因为有些文章页面会返回521状态码，但实际可以下载
                            // if (response.status === 521) {
                            //     console.dir(
                            //         `检查文章 ${url} 时状态码异常：${response.status}，有风控的可能性。`
                            //     );
                            // } else {
                            //     await uiManager.showConfirmDialog(
                            //         `检查文章 ${url} 时状态码异常：${response.status}，是否继续下载？\n（这里只是用HEAD方法预先检查了一下，也许下载时会成功）`,
                            //         () => {
                            //             // 用户点击确认后，继续下载
                            //             console.dir(`用户确认继续下载： Url: ${url}`);
                            //         },
                            //         () => {
                            //             const newError = new Error(
                            //                 `文章页面状态码异常：Url: ${url} Response Status: ${response.status}`
                            //             );
                            //             reject(newError);
                            //         }
                            //     );
                            // }
                        } else {
                            console.dir(`文章页面检查成功：${url}`);
                        }
                        onCheckPassed(); // 检测通过，开始下载
                    },
                    onerror: function (error) {
                        console.dir(`检查文章页面失败： Url: ${url}. Original error: ${error.message || error}`);
                        const newError = new Error(
                            `检查文章页面失败：Url: ${url}. Original error: ${error.message || error}`
                        );
                        newError.stack = error.stack;
                        reject(error);
                    },
                });
            });
        }

        /**
         * 从URL批量下载文章
         * @param {string} url - 文章URL
         * @param {number} index - 文件前缀
         * @param {Object} config - 配置选项
         * @param {boolean} config.fastDownload - 是否快速下载
         * @return {Promise<void>}
         * @throws {Error} 如果下载失败或解析文章时出错
         */
        async downloadOneArticleFromBatch(url, index, total, config = {}) {
            return new Promise(async (resolve, reject) => {
                try {
                    const newConfig = {
                        ...config, // 传入其他配置选项
                        articleUrl: url,
                        fileIndex: index,
                        fileTotal: total,
                    };
                    if (config.fastDownload) {
                        const response = await (await fetch(url)).text();
                        // const response = await this.fileManager.fetchResource(
                        //     url,
                        //     "text/html",
                        //     config.downloadAssetRetryCount || 3,
                        //     config.downloadAssetRetryDelay || 1000,
                        //     "fetch"
                        // );
                        const parser = new DOMParser();
                        const doc = parser.parseFromString(response, "text/html");
                        // 调用解析函数
                        await this.parseArticle(doc.body, newConfig);
                    } else {
                        await this.downloadArticleInIframe(url, newConfig);
                    }
                } catch (error) {
                    reject(error);
                }
                if (config.delayBetweenDownloads && config.delayBetweenDownloads > 0) {
                    setTimeout(() => resolve(), config.delayBetweenDownloads);
                } else {
                    resolve();
                }
            });
        }

        /**
         * 下载专栏的全部文章为Markdown格式
         * @param {Object} config - 配置选项
         * @param {boolean} config.zipCategories - 是否将文章打包成zip
         * @param {string} config.filePrefix - 文件名前缀
         * @param {string} config.articleUrl - 文章链接
         * @param {number} config.maxConcurrentDownloads - 最大并发下载数
         * @param {boolean} config.parallelDownload - 是否并行下载
         * @param {boolean} config.fastDownload - 是否快速下载
         * @param {boolean} config.mergeArticleContent - 是否合并文章内容
         * @param {boolean} config.saveAllImagesToAssets - 是否将所有图片保存
         * @param {boolean} config.addSerialNumber - 是否添加序号
         * @param {boolean} config.addSerialNumberToTitle - 是否在标题前添加序号
         * @param {boolean} config.addArticleInfoInBlockquote - 是否在引用块中添加文章信息
         * @param {boolean} config.addArticleTitleToMarkdown - 是否在Markdown中添加文章标题
         * @param {boolean} config.addArticleInfoInYaml - 是否在YAML中添加文章信息
         * @param {boolean} config.saveWebImages - 是否保存网络图片
         * @param {boolean} config.forceImageCentering - 是否强制图片居中
         * @param {boolean} config.enableImageSize - 是否启用图片尺寸
         * @param {boolean} config.enableColorText - 是否启用彩色文本
         * @param {boolean} config.removeCSDNSearchLink - 是否移除CSDN搜索链接
         * @param {boolean} config.addArticleInfoInBlockquote_batch - 是否在批量下载时在引用块中添加文章信息
         **/
        async downloadCategory(config = {}) {
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

            // FIX: 解决自定义域名在Chrome里下载专栏时，专栏和文章hostname不一致导致跨域问题
            // https://github.com/Qalxry/csdn2md/issues/7
            // 专栏的 url 为 https://blog.csdn.net/{user_id}/category_{category_id}.html
            // 文章的 url 为 https://{custom_domain}.blog.csdn.net/article/details/{article_id}
            //
            // > 方案1：将文章的 url 替换为 https://blog.csdn.net/{user_id}/article/details/{article_id}
            // 会引发 CSDN 的安全策略问题，废弃
            // if (base_url.startsWith("https://blog.csdn.net/")) {
            //     const user_id = base_url.match(/blog\.csdn\.net\/([^\/]+)/)[1];
            //     for (let i = 0; i < url_list.length; i++) {
            //         if (!url_list[i].startsWith("https://blog.csdn.net/")) {
            //             const article_id = url_list[i].match(/\/article\/details\/([^\/]+)/)[1];
            //             url_list[i] = `https://blog.csdn.net/${user_id}/article/details/${article_id}`;
            //         }
            //     }
            // }
            // > 方案2：将专栏的 url 替换为 https://{custom_domain}.blog.csdn.net/category_{category_id}.html
            // 虽然有效，但不确定是否稳定，目前来看可以
            let isAllArticlesCustomDomain = true;
            let isAllArticlesDefaultDomain = true;
            for (let i = 0; i < url_list.length; i++) {
                if (url_list[i].startsWith("https://blog.csdn.net/")) {
                    isAllArticlesCustomDomain = false;
                    break;
                }
            }
            for (let i = 0; i < url_list.length; i++) {
                if (!url_list[i].startsWith("https://blog.csdn.net/")) {
                    isAllArticlesDefaultDomain = false;
                    break;
                }
            }
            if (isAllArticlesCustomDomain) {
                // 如果全部文章都是自定义域名，则将专栏的 url 替换为 https://{custom_domain}.blog.csdn.net/category_{category_id}.html
                if (base_url.startsWith("https://blog.csdn.net/")) {
                    console.dir(
                        `Warning: 文章与专栏的域名不一致，正在将专栏的URL替换为自定义域名。当前专栏URL: ${base_url} 文章URL: ${url_list[0]}`
                    );
                    const custom_domain = url_list[0].match(/https:\/\/([^\/]+)\.blog\.csdn\.net/)[1];
                    GM_setValue("status", {
                        timestamp: Date.now(),
                        action: "downloadCategory",
                        targetUrl: `https://${custom_domain}.blog.csdn.net/category_${category_id}.html`,
                    });
                    window.location.href = `https://${custom_domain}.blog.csdn.net/category_${category_id}.html`;
                }
            } else if (isAllArticlesDefaultDomain) {
                // 如果全部文章都是默认域名，则将专栏的 url 替换为 https://blog.csdn.net/category_{category_id}.html
                if (!base_url.startsWith("https://blog.csdn.net/")) {
                    console.dir(
                        `Warning: 文章与专栏的域名不一致，正在将专栏的URL替换为默认域名。当前专栏URL: ${base_url} 文章URL: ${url_list[0]}`
                    );
                    const user_id = url_list[0].match(/blog\.csdn\.net\/([^\/]+)/)[1];
                    GM_setValue("status", {
                        timestamp: Date.now(),
                        action: "downloadCategory",
                        targetUrl: `https://blog.csdn.net/${user_id}/category_${category_id}.html`,
                    });
                    window.location.href = `https://blog.csdn.net/${user_id}/category_${category_id}.html`;
                }
            } else {
                // 如果文章的域名不一致，则回退为方案1，至少可能可以下载
                console.dir(
                    `Warning: 文章与专栏的域名不一致，可能无法下载。请检查是否有自定义域名。当前专栏URL: ${base_url}`
                );
                if (base_url.startsWith("https://blog.csdn.net/")) {
                    const user_id = base_url.match(/blog\.csdn\.net\/([^\/]+)/)[1];
                    for (let i = 0; i < url_list.length; i++) {
                        if (!url_list[i].startsWith("https://blog.csdn.net/")) {
                            const article_id = url_list[i].match(/\/article\/details\/([^\/]+)/)[1];
                            url_list[i] = `https://blog.csdn.net/${user_id}/article/details/${article_id}`;
                        }
                    }
                }
            }

            if (url_list.length >= 100 && config.parallelDownload) {
                await this.uiManager.showConfirmDialog(
                    `检测到文章数量超过100篇（获取到${url_list.length}篇），使用并行下载可能会导致CSDN风控。\n建议改用串行，虽然慢些但更加稳定。\n点击”确定“将使用串行下载，点击”取消“将继续使用并行下载。`,
                    () => {
                        config.parallelDownload = false; // 串行下载
                        this.uiManager.showFloatTip("已切换为串行下载。");
                    },
                    () => {
                        config.parallelDownload = true; // 并行下载
                        this.uiManager.showFloatTip("继续使用并行下载。");
                    }
                );
            }

            if (config.enableStreaming) {
                this.uiManager.showFloatTip("正在初始化流式下载...");
                await this.fileManager.initializeZipStream(
                    `${document.title}`,
                    (fileName, fileIndex) => {},
                    (zipStreamName, zipStreamFileCount, zipStreamSize) => {
                        this.uiManager.showFloatTip(
                            `打包完成：${zipStreamName}。文件数量：${zipStreamFileCount}，文件大小：${Utils.formatFileSize(
                                zipStreamSize
                            )}\n请等待下载完成。`,
                            3000
                        );
                    },
                    async (error) => {
                        const newError = new Error(`流式下载中出现错误：${error.message || error}`);
                        newError.stack = error.stack || new Error().stack;
                        this.uiManager.showFloatTip(`流式下载中出现错误：${newError.message}`);
                        await this.uiManager.showConfirmDialog(
                            `出现错误：${newError.message}。是否忽略错误继续下载？`,
                            () => {
                                this.uiManager.showFloatTip("已忽略错误，继续下载。");
                            },
                            () => {
                                throw newError;
                            }
                        );
                    }
                );
            }

            // 下载每篇文章
            const totalArticleCount = url_list.length;
            if (config.endArticleIndex < 1) {
                this.uiManager.showFloatTip(`结束文章索引 ${config.endArticleIndex} 小于1，将不下载任何文章。`, 3000);
                return;
            } else if (config.startArticleIndex > totalArticleCount) {
                this.uiManager.showFloatTip(
                    `开始文章索引 ${config.startArticleIndex} 超过总文章数 ${totalArticleCount}，将不下载任何文章。`,
                    3000
                );
                return;
            } else if (config.startArticleIndex > config.endArticleIndex) {
                this.uiManager.showFloatTip(
                    `开始文章索引 ${config.startArticleIndex} 大于结束文章索引 ${config.endArticleIndex}，将不下载任何文章。`,
                    3000
                );
                return;
            } else {
                this.uiManager.showFloatTip(
                    `开始下载文章：从第 ${Math.max(1, config.startArticleIndex)} 篇到第 ${Math.min(
                        totalArticleCount,
                        config.endArticleIndex
                    )} 篇，共 ${url_list.length} 篇。（总文章数：${totalArticleCount}）`
                );
            }
            await Utils.parallelPool(
                url_list,
                async (url, index) => {
                    const articleIndex = totalArticleCount - index; // 反向
                    if (articleIndex >= config.startArticleIndex && articleIndex <= config.endArticleIndex) {
                        await this.downloadOneArticleFromBatch(url, articleIndex, totalArticleCount, config);
                    }
                },
                config.parallelDownload ? config.maxConcurrentDownloads : 1
            );

            if (config.mergeArticleContent) {
                let extraTopContent = "";
                if (config.addArticleTitleToMarkdown) {
                    extraTopContent += `# ${document.title}\n\n`;
                }
                if (config.addArticleInfoInBlockquote_batch) {
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
                    extraTopContent += `> ${batchDesc}\n> ${batchAuthor} ${batchColumnData}\n${batchUrl}\n\n`;
                }
                this.fileManager.mergeTextFile(`${document.title}`, extraTopContent);
            }

            if (config.enableStreaming) {
                this.uiManager.showFloatTip("正在等待流式压缩完成，请稍候...");
                // endStream参数为true，表示结束流式压缩，直接下载
                await this.fileManager.addAllFilesInQueueToZipStream(true);
            } else {
                if (config.zipCategories) {
                    await this.fileManager.zipAllFilesInQueue(
                        `${document.title}`,
                        (info_string) => {
                            this.uiManager.showFloatTip(info_string);
                        },
                        (info_string) => {
                            this.uiManager.showFloatTip(info_string, 3000);
                        },
                        // zip 库选用：fflate / jszip
                        config.zipLibrary || "fflate"
                    );
                }
                await this.fileManager.downloadAllFilesInQueue();
            }
            this.uiManager.showFloatTip("专栏文章全部处理完毕，请等待下载结束。", 3000);
        }

        /**
         * 下载用户的全部文章为Markdown格式
         * @param {Object} config - 配置选项
         * @param {boolean} config.zipCategories - 是否将文章打包成zip
         * @param {string} config.filePrefix - 文件名前缀
         * @param {string} config.articleUrl - 文章链接
         * @param {number} config.maxConcurrentDownloads - 最大并发下载数
         * @param {boolean} config.parallelDownload - 是否并行下载
         * @param {boolean} config.fastDownload - 是否快速下载
         * @param {boolean} config.mergeArticleContent - 是否合并文章内容
         * @param {boolean} config.saveAllImagesToAssets - 是否将所有图片保存
         * @param {boolean} config.addSerialNumber - 是否添加序号
         * @param {boolean} config.addSerialNumberToTitle - 是否在标题前添加序号
         * @param {boolean} config.addArticleInfoInBlockquote - 是否在引用块中添加文章信息
         * @param {boolean} config.addArticleTitleToMarkdown - 是否在Markdown中添加文章标题
         * @param {boolean} config.addArticleInfoInYaml - 是否在YAML中添加文章信息
         * @param {boolean} config.saveWebImages - 是否保存网络图片
         * @param {boolean} config.forceImageCentering - 是否强制图片居中
         * @param {boolean} config.enableImageSize - 是否启用图片尺寸
         * @param {boolean} config.enableColorText - 是否启用彩色文本
         * @param {boolean} config.removeCSDNSearchLink - 是否移除CSDN搜索链接
         * @param {boolean} config.addArticleInfoInBlockquote_batch - 是否在批量下载时在引用块中添加文章信息
         **/
        async downloadUserAllArticles(config = {}) {
            const mainContent = document.body.querySelector(".mainContent");
            const url_list = [];

            // 获取用户原始ID
            // <link rel="canonical" href="https://blog.csdn.net/yanglfree">
            const getUrlListFromAPI = async () => {
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
                    // const response = await (
                    //     await fetch(
                    //         `https://blog.csdn.net/community/home-api/v1/get-business-list?page=${page}&size=100&businessType=blog&orderby=&noMore=false&year=&month=&username=${user_id}`
                    //     )
                    // ).json();
                    const response = await this.fileManager.fetchResource(
                        `https://blog.csdn.net/community/home-api/v1/get-business-list?page=${page}&size=100&businessType=blog&orderby=&noMore=false&year=&month=&username=${user_id}`,
                        "json",
                        config.downloadAssetRetryCount || 3,
                        config.downloadAssetRetryDelay || 1000,
                        "fetch"
                    );
                    if (total_articles === 0) total_articles = response.data.total;
                    if (response.data.list.length === 0) break;
                    temp_url_list.push(...response.data.list.map((item) => item.url));
                    console.dir(
                        `获取到第 ${page} 页 ${response.data.list.length} 篇文章链接 (${temp_url_list.length} / ${total_articles}):`
                    );
                    this.uiManager.showFloatTip(
                        `获取到第 ${page} 页 ${response.data.list.length} 篇文章链接 (${temp_url_list.length} / ${total_articles}):`
                    );
                    page++;
                } while (temp_url_list.length < total_articles);

                return temp_url_list;
            };

            try {
                const res = await getUrlListFromAPI();
                if (res.length === 0) {
                    console.dir(`从API获取文章列表失败，尝试从页面获取文章链接。`);
                } else {
                    url_list.push(...res);
                    console.dir(`从API获取到 ${url_list.length} 篇文章链接。`);
                }
            } catch (error) {
                console.dir(`从API获取文章列表失败，尝试从页面获取文章链接。${error.message || error}`);
            }

            // 如果API获取失败，则从页面获取文章链接
            if (url_list.length === 0) {
                // 滚回顶部
                window.scrollTo({
                    top: 0,
                    behavior: "smooth",
                });
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

            // FIX: 解决自定义域名在Chrome里下载用户主页时，用户主页和文章hostname不一致导致跨域问题
            // https://github.com/Qalxry/csdn2md/issues/7
            // 用户主页的 url 为 https://blog.csdn.net/{user_id} + 可能存在的 ?type=xxx
            // 文章的 url 为 https://{custom_domain}.blog.csdn.net/article/details/{article_id}
            //
            // > 方案1：将文章的 url 替换为 https://blog.csdn.net/{user_id}/article/details/{article_id}
            // 会引发 CSDN 的安全策略问题，废弃
            // if (base_url.startsWith("https://blog.csdn.net/")) {
            //     const user_id = base_url.match(/blog\.csdn\.net\/([^\/]+)/)[1];
            //     for (let i = 0; i < url_list.length; i++) {
            //         if (!url_list[i].startsWith("https://blog.csdn.net/")) {
            //             const article_id = url_list[i].match(/\/article\/details\/([^\/]+)/)[1];
            //             url_list[i] = `https://blog.csdn.net/${user_id}/article/details/${article_id}`;
            //         }
            //     }
            // }
            // > 方案2：将用户主页的 url 替换为 https://{custom_domain}.blog.csdn.net + /?type=xxx
            // 虽然有效，但不确定是否稳定，目前来看可以
            const base_url = window.location.href;
            let isAllArticlesCustomDomain = true;
            let isAllArticlesDefaultDomain = true;
            for (let i = 0; i < url_list.length; i++) {
                if (url_list[i].startsWith("https://blog.csdn.net/")) {
                    isAllArticlesCustomDomain = false;
                    break;
                }
            }
            for (let i = 0; i < url_list.length; i++) {
                if (!url_list[i].startsWith("https://blog.csdn.net/")) {
                    isAllArticlesDefaultDomain = false;
                    break;
                }
            }
            if (isAllArticlesCustomDomain) {
                // 如果全部文章都是自定义域名，则将用户主页的 url 替换为 https://{custom_domain}.blog.csdn.net/category_{category_id}.html
                if (base_url.startsWith("https://blog.csdn.net/")) {
                    console.dir(
                        `Warning: 文章与用户主页的域名不一致，正在将用户主页的URL替换为自定义域名。当前用户主页URL: ${base_url} 文章URL: ${url_list[0]}`
                    );
                    const custom_domain = url_list[0].match(/https:\/\/([^\/]+)\.blog\.csdn\.net/)[1];
                    GM_setValue("status", {
                        timestamp: Date.now(),
                        action: "downloadUserAllArticles",
                        targetUrl: `https://${custom_domain}.blog.csdn.net/?type=blog`,
                    });
                    window.location.href = `https://${custom_domain}.blog.csdn.net/?type=blog`;
                }
            } else if (isAllArticlesDefaultDomain) {
                // 如果全部文章都是默认域名，则将用户主页的 url 替换为 https://blog.csdn.net/category_{category_id}.html
                if (!base_url.startsWith("https://blog.csdn.net/")) {
                    console.dir(
                        `Warning: 文章与用户主页的域名不一致，正在将用户主页的URL替换为默认域名。当前用户主页URL: ${base_url} 文章URL: ${url_list[0]}`
                    );
                    const user_id = url_list[0].match(/blog\.csdn\.net\/([^\/]+)/)[1];
                    GM_setValue("status", {
                        timestamp: Date.now(),
                        action: "downloadUserAllArticles",
                        targetUrl: `https://blog.csdn.net/${user_id}?type=blog`,
                    });
                    window.location.href = `https://blog.csdn.net/${user_id}?type=blog`;
                }
            } else {
                // 如果文章的域名不一致，则回退为方案1，至少可能可以下载
                console.dir(
                    `Warning: 文章与用户主页的域名不一致，可能无法下载。请检查是否有自定义域名。当前用户主页URL: ${base_url}`
                );
                if (base_url.startsWith("https://blog.csdn.net/")) {
                    const user_id = base_url.match(/blog\.csdn\.net\/([^\/]+)/)[1];
                    for (let i = 0; i < url_list.length; i++) {
                        if (!url_list[i].startsWith("https://blog.csdn.net/")) {
                            const article_id = url_list[i].match(/\/article\/details\/([^\/]+)/)[1];
                            url_list[i] = `https://blog.csdn.net/${user_id}/article/details/${article_id}`;
                        }
                    }
                }
            }

            if (url_list.length >= 100 && config.parallelDownload) {
                await this.uiManager.showConfirmDialog(
                    `检测到文章数量超过100篇（获取到${url_list.length}篇），使用并行下载可能会导致CSDN风控。\n建议改用串行，虽然慢些但更加稳定。\n点击”确定“将使用串行下载，点击”取消“将继续使用并行下载。`,
                    () => {
                        config.parallelDownload = false; // 串行下载
                        this.uiManager.showFloatTip("已切换为串行下载。");
                    },
                    () => {
                        config.parallelDownload = true; // 并行下载
                        this.uiManager.showFloatTip("继续使用并行下载。");
                    }
                );
            }

            if (config.enableStreaming) {
                this.uiManager.showFloatTip("正在初始化流式下载...");
                await this.fileManager.initializeZipStream(
                    `${document.title}`,
                    (fileName, fileIndex) => {},
                    (zipStreamName, zipStreamFileCount, zipStreamSize) => {
                        this.uiManager.showFloatTip(
                            `打包完成：${zipStreamName}。文件数量：${zipStreamFileCount}，文件大小：${Utils.formatFileSize(
                                zipStreamSize
                            )}\n请等待下载完成。`,
                            3000
                        );
                    },
                    async (error) => {
                        const newError = new Error(`流式下载中出现错误：${error.message || error}`);
                        newError.stack = error.stack || new Error().stack;
                        this.uiManager.showFloatTip(`流式下载中出现错误：${newError.message}`);
                        await this.uiManager.showConfirmDialog(
                            `出现错误：${newError.message}。是否忽略错误继续下载？`,
                            () => {
                                this.uiManager.showFloatTip("已忽略错误，继续下载。");
                            },
                            () => {
                                throw newError;
                            }
                        );
                    }
                );
            }

            // 下载每篇文章
            const totalArticleCount = url_list.length;
            if (config.endArticleIndex < 1) {
                this.uiManager.showFloatTip(`结束文章索引 ${config.endArticleIndex} 小于1，将不下载任何文章。`, 3000);
                return;
            } else if (config.startArticleIndex > totalArticleCount) {
                this.uiManager.showFloatTip(
                    `开始文章索引 ${config.startArticleIndex} 超过总文章数 ${totalArticleCount}，将不下载任何文章。`,
                    3000
                );
                return;
            } else if (config.startArticleIndex > config.endArticleIndex) {
                this.uiManager.showFloatTip(
                    `开始文章索引 ${config.startArticleIndex} 大于结束文章索引 ${config.endArticleIndex}，将不下载任何文章。`,
                    3000
                );
                return;
            } else {
                this.uiManager.showFloatTip(
                    `开始下载文章：从第 ${Math.max(1, config.startArticleIndex)} 篇到第 ${Math.min(
                        totalArticleCount,
                        config.endArticleIndex
                    )} 篇，共 ${url_list.length} 篇。（总文章数：${totalArticleCount}）`
                );
            }
            await Utils.parallelPool(
                url_list,
                async (url, index) => {
                    const articleIndex = totalArticleCount - index; // 反向
                    if (articleIndex >= config.startArticleIndex && articleIndex <= config.endArticleIndex) {
                        await this.downloadOneArticleFromBatch(url, articleIndex, totalArticleCount, config);
                    }
                },
                config.parallelDownload ? config.maxConcurrentDownloads : 1
            );

            if (config.mergeArticleContent) {
                let extraTopContent = "";
                if (config.addArticleTitleToMarkdown) {
                    extraTopContent += `# ${document.title}\n\n`;
                }
                if (config.addArticleInfoInBlockquote_batch) {
                    extraTopContent += `> ${Utils.clearUrl(window.location.href)}\n\n`;
                }
                // 下载每篇文章
                this.fileManager.mergeTextFile(`${document.title}`, extraTopContent);
            }
            if (config.enableStreaming) {
                this.uiManager.showFloatTip("正在等待流式压缩完成，请稍候...");
                // endStream参数为true，表示结束流式压缩，直接下载
                await this.fileManager.addAllFilesInQueueToZipStream(true);
            } else {
                if (config.zipCategories) {
                    await this.fileManager.zipAllFilesInQueue(
                        `${document.title}`,
                        (info_string) => {
                            this.uiManager.showFloatTip(info_string);
                        },
                        (info_string) => {
                            this.uiManager.showFloatTip(info_string, 3000);
                        },
                        // zip 库选用：fflate / jszip
                        config.zipLibrary || "fflate"
                    );
                }
                await this.fileManager.downloadAllFilesInQueue();
            }
            this.uiManager.showFloatTip("用户全部文章处理完毕，请等待下载结束。", 3000);
        }

        /**
         * 下载单篇文章
         * @param {Object} config - 配置选项
         * @param {boolean} config.zipCategories - 是否将文章打包成zip
         * @param {string} config.enableStreaming - 是否启用流式下载
         * @param {string} config.filePrefix - 文件名前缀
         * @param {string} config.articleUrl - 文章链接
         * @param {boolean} config.parallelDownload - 是否并行下载
         * @param {boolean} config.fastDownload - 是否快速下载
         * @param {boolean} config.mergeArticleContent - 是否合并文章内容
         * @param {boolean} config.saveAllImagesToAssets - 是否将所有图片保存
         * @param {boolean} config.addSerialNumber - 是否添加序号
         * @param {boolean} config.addSerialNumberToTitle - 是否在标题前添加序号
         * @param {boolean} config.addArticleInfoInBlockquote - 是否在引用块中添加文章信息
         * @param {boolean} config.addArticleTitleToMarkdown - 是否在Markdown中添加文章标题
         * @param {boolean} config.addArticleInfoInYaml - 是否在YAML中添加文章信息
         * @param {boolean} config.saveWebImages - 是否保存网络图片
         * @param {number} config.downloadAssetRetryCount - 下载网络图片的重试次数
         * @param {boolean} config.forceImageCentering - 是否强制图片居中
         * @param {boolean} config.enableImageSize - 是否启用图片尺寸
         * @param {boolean} config.enableColorText - 是否启用彩色文本
         * @param {boolean} config.removeCSDNSearchLink - 是否移除CSDN搜索链接
         **/
        async downloadSingleArticle(config = {}) {
            const articleTitle = await this.parseArticle(document.body, {
                articleUrl: window.location.href,
                ...config,
                mergeArticleContent: false,
                enableStreaming: false, // 单篇文章下载不支持流式下载
            });
            if (config.zipCategories) {
                await this.fileManager.zipAllFilesInQueue(
                    `${articleTitle}`,
                    (info_string) => {
                        this.uiManager.showFloatTip(info_string);
                    },
                    (info_string) => {
                        this.uiManager.showFloatTip(info_string, 3000);
                    },
                    // zip 库选用：fflate / jszip
                    config.zipLibrary || "fflate"
                );
            }
            await this.fileManager.downloadAllFilesInQueue();
            this.uiManager.showFloatTip("文章下载完毕！", 4000);
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

        // 初始化App
        const uiManager = new UIManager();

        // 检查是否有下载任务
        const status = GM_getValue("status");
        if (
            status &&
            status.timestamp &&
            status.action &&
            status.targetUrl &&
            Date.now() - status.timestamp < 5 * 60 * 1000 // 检查下载任务是否在5分钟内
        ) {
            GM_setValue("status", null); // 清除下载任务状态
            if (
                status.action === "downloadCategory" &&
                Utils.clearUrl(status.targetUrl) === Utils.clearUrl(window.location.href)
            ) {
                // 如果有下载任务，直接跳转到下载页面
                console.dir(`检测到下载任务，开始自动下载专栏文章： ${status.targetUrl}`);
                uiManager.showFloatTip(`检测到下载任务，开始自动下载专栏文章： ${status.targetUrl}`);
                uiManager.downloadButton.click();
            } else if (
                status.action === "downloadUserAllArticles" &&
                Utils.clearUrl(status.targetUrl) === Utils.clearUrl(window.location.href)
            ) {
                // 如果有下载任务，直接跳转到下载页面
                console.dir(`检测到下载任务，开始自动下载用户全部文章： ${status.targetUrl}`);
                uiManager.showFloatTip(`检测到下载任务，开始自动下载用户全部文章： ${status.targetUrl}`);
                uiManager.downloadButton.click();
            } else {
                console.dir(
                    `检测到下载任务，但当前页面与任务目标页面不一致，跳过自动下载。当前页面：${window.location.href} 任务目标页面：${status.targetUrl}`
                );
                uiManager.showFloatTip(
                    `检测到下载任务，但当前页面与任务目标页面不一致，跳过自动下载。当前页面：${window.location.href} 任务目标页面：${status.targetUrl}`,
                    5000
                );
            }
        }
    }

    // 启动应用
    initApp();
})();
