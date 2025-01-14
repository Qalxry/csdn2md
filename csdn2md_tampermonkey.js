// ==UserScript==
// @name         csdn2md - 批量下载CSDN文章为Markdown
// @namespace    http://tampermonkey.net/
// @version      1.1.6
// @description  下载CSDN文章为Markdown格式，支持专栏批量下载。CSDN排版经过精心调教，最大程度支持CSDN的全部Markdown语法：KaTeX内联公式、KaTeX公式块、图片、内联代码、代码块、Bilibili视频控件、有序/无序/任务/自定义列表、目录、注脚、加粗斜体删除线下滑线高亮、内容居左/中/右、引用块、链接、快捷键（kbd）、表格、上下标、甘特图、UML图、FlowChart流程图
// @author       ShizuriYuki
// @match        https://*.csdn.net/*
// @icon         https://g.csdnimg.cn/static/logo/favicon32.ico
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_xmlhttpRequest
// @run-at       document-end
// @license      PolyForm Strict License 1.0.0  https://polyformproject.org/licenses/strict/1.0.0/
// @supportURL   https://github.com/Qalxry/csdn2md
// @require      https://cdnjs.cloudflare.com/ajax/libs/jszip/3.7.1/jszip.min.js
// ==/UserScript==

(function () {
    "use strict";

    /**
     * 可重入异步锁。
     */
    class ReentrantAsyncLock {
        constructor() {
            this.queue = [];
            this.locked = false;
            this.owner = null; // 记录锁的持有者
        }

        async acquire(ownerId) {
            if (this.locked && this.owner !== ownerId) {
                await new Promise((resolve) => this.queue.push(resolve));
            }
            this.locked = true;
            this.owner = ownerId;
        }

        release(ownerId) {
            if (this.owner !== ownerId) {
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
     * 显示悬浮提示框。
     * @param {string} text - 提示框的文本内容。
     */
    function showFloatTip(text, timeout = 0) {
        if (document.getElementById("myInfoFloatTip")) {
            document.getElementById("myInfoFloatTip").remove();
        }
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

        if (timeout > 0) {
            setTimeout(() => {
                hideFloatTip();
            }, timeout);
        }
    }

    /**
     * 隐藏悬浮提示框。
     */
    function hideFloatTip() {
        if (document.getElementById("myInfoFloatTip")) {
            document.getElementById("myInfoFloatTip").remove();
        }
    }

    // 创建悬浮窗
    const floatWindow = document.createElement("div");
    floatWindow.style.position = "fixed";
    floatWindow.style.bottom = "20px";
    floatWindow.style.right = "20px";
    floatWindow.style.padding = "10px";
    floatWindow.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
    floatWindow.style.color = "#fff";
    floatWindow.style.borderRadius = "5px";
    floatWindow.style.boxShadow = "0 2px 5px rgba(0, 0, 0, 0.5)";
    floatWindow.style.zIndex = "9999";
    floatWindow.style.display = "flex";
    floatWindow.style.flexDirection = "column"; // 里面的元素每个占一行
    floatWindow.id = "myFloatWindow";

    // 创建下载按钮
    const downloadButton = document.createElement("button");
    downloadButton.innerHTML =
        "下载CSDN文章为Markdown<br>（支持专栏、文章、用户全部文章页面）<br>（推荐使用typora打开下载的Markdown）";
    downloadButton.style.textAlign = "center";
    downloadButton.style.padding = "5px 10px";
    downloadButton.style.border = "none";
    downloadButton.style.backgroundColor = "#4CAF50";
    downloadButton.style.color = "white";
    downloadButton.style.borderRadius = "3px";
    downloadButton.style.cursor = "pointer";
    downloadButton.id = "myDownloadButton";
    // 为下载按钮添加hover效果
    downloadButton.addEventListener("mouseover", function () {
        downloadButton.style.backgroundColor = "#45a049";
    });
    downloadButton.addEventListener("mouseout", function () {
        downloadButton.style.backgroundColor = "#4CAF50";
    });
    // 将按钮添加到悬浮窗
    floatWindow.appendChild(downloadButton);

    // 创建选项 checkbox
    // 从油猴脚本中获取选项的值
    // - 专栏高速下载模式（会导致乱序，但可通过下面的加入序号排序）
    // - 专栏文章文件加入序号前缀
    // - 将专栏文章整合为压缩包
    const optionDivList = [];
    const optionCheckBoxList = [];

    function updateAllOptions() {
        optionCheckBoxList.forEach((optionElem) => {
            optionElem.checked = GM_getValue(optionElem.id.replace("Checkbox", ""));
        });
    }

    function addOption(id, innerHTML, defaultValue = false, constraints = { true: null, false: null }) {
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
        optionDivList.push(optionDiv);
        optionCheckBoxList.push(optionCheckbox);
        floatWindow.appendChild(optionDiv);
        optionCheckbox.addEventListener("change", function () {
            GM_setValue(id, optionCheckbox.checked);
            if (optionCheckbox.checked) {
                if (constraints.true !== null) {
                    for (const constraint of constraints.true) {
                        if (constraint.id !== undefined && constraint.value !== undefined) {
                            GM_setValue(constraint.id, constraint.value);
                        }
                    }
                    updateAllOptions();
                }
            } else {
                if (constraints.false !== null) {
                    for (const constraint of constraints.false) {
                        if (constraint.id !== undefined && constraint.value !== undefined) {
                            GM_setValue(constraint.id, constraint.value);
                        }
                    }
                    updateAllOptions();
                }
            }
        });
    }

    addOption("parallelDownload", "批量并行下载模式（下载乱序，但可以添加前缀弥补）", false);
    addOption("fastDownload", "批量高速下载模式（有代码块语言无法识别等问题，能接受就开）", false);
    addOption("addSerialNumber", "批量文章文件加入序号前缀", false);
    addOption("zipCategories", "下载为压缩包", true, { false: [{ id: "saveWebImages", value: false }] });
    addOption("addArticleInfoInYaml", "添加文章元信息（以YAML元信息格式）", false);
    addOption("addArticleTitleToMarkdown", "添加文章标题（以一级标题形式）", true);
    addOption("addArticleInfoInBlockquote", "添加阅读量、点赞等信息（以引用块形式）", true);
    addOption("saveWebImages", "将图片保存到与MD文件同名的文件夹内，以相对路径使用", true, {
        true: [{ id: "zipCategories", value: true }],
    });
    addOption("forceImageCentering", "全部图片居中排版", false);
    addOption("enableImageSize", "启用图片宽高属性（如果网页中的图片具有宽高）", true);
    addOption("removeCSDNSearchLink", "移除CSDN搜索链接", true);
    addOption("enableColorText", "启用彩色文字（以span形式保存）", true);

    function enableFloatWindow() {
        downloadButton.disabled = false;
        downloadButton.innerHTML =
            "下载CSDN文章为Markdown<br>（支持专栏、文章、用户全部文章页面）<br>（推荐使用typora打开下载的Markdown）";
        optionCheckBoxList.forEach((optionElem) => {
            optionElem.disabled = false;
        });
    }

    function disableFloatWindow() {
        downloadButton.disabled = true;
        downloadButton.innerHTML = "正在下载，请稍候...";
        optionCheckBoxList.forEach((optionElem) => {
            optionElem.disabled = true;
        });
    }

    async function testMain() {
        // 1s
        await new Promise((resolve) => setTimeout(resolve, 1000));
        console.log("1s");
    }

    // 按钮点击事件
    downloadButton.addEventListener("click", async function () {
        await runMain();
        // await testMain();
    });

    document.body.appendChild(floatWindow);

    // 监听窗口的 focus 事件
    window.addEventListener("focus", function () {
        // 脚本选项可能在其他窗口中被修改，所以每次窗口获得焦点时都要重新加载
        updateAllOptions();
    });

    // 全局变量
    let fileQueue = [];

    /**
     * 将 SVG 图片转换为 Base64 编码的字符串。
     * @param {string} text - SVG 图片的文本内容。
     * @returns {string} - Base64 编码的字符串。
     */
    function svgToBase64(svgText) {
        const uint8Array = new TextEncoder().encode(svgText);
        const binaryString = uint8Array.reduce((data, byte) => data + String.fromCharCode(byte), "");
        return btoa(binaryString);
    }

    /**
     * 压缩HTML内容，移除多余的空白和换行符。
     * @param {string} html - 输入的HTML字符串。
     * @returns {string} - 压缩后的HTML字符串。
     */
    function shrinkHtml(html) {
        return html
            .replace(/>\s+</g, "><") // 去除标签之间的空白
            .replace(/\s{2,}/g, " ") // 多个空格压缩成一个
            .replace(/^\s+|\s+$/g, ""); // 去除首尾空白
    }

    /**
     * 清除字符串中的特殊字符。
     * @param {string} str - 输入的字符串。
     * @returns {string} - 清除特殊字符后的字符串。
     */
    function clearSpecialChars(str) {
        return str
            .replace(/[\s]{2,}/g, "")
            .replace(
                /[\u200B-\u200F\u202A-\u202E\u2060-\u206F\uFEFF\u00AD\u034F\u061C\u180E\u2800\u3164\uFFA0\uFFF9-\uFFFB]/g,
                ""
            );
    }

    /**
     * 依靠油猴脚本的 GM_xmlhttpRequest 方法获取网络资源。
     * @param {string} url - 网络资源的 URL。
     * @returns {Promise<Blob>} - 网络资源的 Blob 对象。
     */
    async function fetchImageAsBlob(url) {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: "GET",
                url: url,
                responseType: "blob",
                onload: function (response) {
                    if (response.status === 200) {
                        resolve(response.response);
                    } else {
                        reject(`Failed to fetch resource: ${url}`);
                    }
                },
                onerror: function () {
                    reject(`Error fetching resource: ${url}`);
                },
            });
        });
    }

    /**
     * 将网络图片添加到 fileQueue { filename, content, type }，并返回本地路径。
     * 会将图片名称改为 articleTitle/count.后缀 的形式，这样在添加图片到 zip 的时候就会自动创建文件夹。
     * @param {string} imgUrl - 图片的网络路径。
     * @param {string} articleTitle - 文章标题。
     * @returns {Promise<string>} - 本地路径，格式为 ./articleTitle/图片名 。
     */
    async function saveWebImageToLocal(imgUrl, articleTitle, reset = false) {
        if (reset) {
            window.imageCount = {};
            window.imageSet = {};
            return;
        }

        // 检查参数是否合法
        if (typeof imgUrl !== "string") {
            showFloatTip("【ERROR】Invalid argument: imgUrl must be a string.");
            throw new Error("[saveWebImageToLocal] Invalid argument: imgUrl must be a string.");
        }

        // 去除 #pic_center
        imgUrl = imgUrl.replace("#pic_center", "");

        // 用于记录当前文章中的图片数量
        if (!window.imageCount) {
            window.imageCount = {};
            window.imageSet = {};
        }
        if (!window.imageCount[articleTitle]) {
            window.imageSet[articleTitle] = {};
            window.imageCount[articleTitle] = 0;
        }

        // 检查是否已保存过该图片
        if (window.imageSet[articleTitle][imgUrl]) {
            return window.imageSet[articleTitle][imgUrl];
        }

        // 记录图片数量
        window.imageCount[articleTitle]++;

        // 获取图片的 Blob 对象
        const blob = await fetchImageAsBlob(imgUrl);

        let ext = imgUrl.split(".").pop();
        const allowedExt = ["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp", "ico", "avif"];
        if (!allowedExt.includes(ext)) {
            console.warn(`[saveWebImageToLocal] Unsupported image format: ${ext}`);
            ext = "";
        } else {
            ext = `.${ext}`;
        }

        // 生成文件名
        const filename = `${articleTitle}/${window.imageCount[articleTitle]}${ext}`;
        fileQueue.push({ filename, content: blob, type: blob.type });

        // 记录已保存的图片
        window.imageSet[articleTitle][imgUrl] = `./${filename}`;

        // 返回本地路径
        return `./${filename}`;
    }

    /**
     * 将文件名转换为安全的文件名。（路径名中不允许的字符都替换为其对应的全角字符）
     * @param {string} filename - 原始文件名。
     * @returns {string} - 安全的文件名。
     */
    function safeFilename(filename) {
        return filename.replace(/[\\/:*?"<>|]/g, "_");
        // return filename
        //     .replace(/\//g, "／")
        //     .replace(/\\/g, "＼")
        //     .replace(/:/g, "：")
        //     .replace(/\*/g, "＊")
        //     .replace(/\?/g, "？")
        //     .replace(/"/g, "＂")
        //     .replace(/</g, "＜")
        //     .replace(/>/g, "＞")
        //     .replace(/\|/g, "｜");
    }

    /**
     * 将文本保存为文件。但也支持先缓存到队列中，给后续打包为 zip 文件使用。
     * @param {string} content
     * @param {string} filename
     */
    async function saveTextAsFile(content, filename) {
        filename = safeFilename(filename);
        if (GM_getValue("zipCategories")) {
            // 保存到队列中，等待打包
            fileQueue.push({ filename, type: "text/plain", content });
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
     * 从 queue 中，将所有 text 转换为 md 文件，并放入文件夹中，然后将文件夹打包为 zip 文件，最后下载 zip 文件。
     * @param {string} zipName - zip 文件名。
     * @returns {Promise<void>}
     */
    async function saveAllFileToZip(zipName) {
        if (fileQueue.length === 0) {
            showFloatTip("【ERROR】没有文件需要保存。");
            return;
        }
        zipName = safeFilename(zipName);
        // 创建 JSZip 实例
        const zip = new JSZip();

        fileQueue.forEach((file) => {
            // 将文件添加到 ZIP 中
            zip.file(file.filename, file.content);
        });

        // 生成 ZIP 文件
        zip.generateAsync({ type: "blob" })
            .then((blob) => {
                // 创建下载链接
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `${zipName}.zip`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);

                fileQueue = [];
            })
            .catch((error) => {
                console.error("Error generating ZIP file:", error);
            });
    }

    /**
     * 将 HTML 内容转换为 Markdown 格式。
     * @param {Element} articleElement - 文章的 DOM 元素。
     * @param {string} markdownFileName - Markdown 文件名。
     * @returns {Promise<string>} - 转换后的 Markdown 字符串。
     */
    async function htmlToMarkdown(articleElement, markdownFileName = "") {
        // 辅助函数，用于转义特殊的 Markdown 字符
        const escapeMarkdown = (text) => {
            // return text.replace(/([\\`*_\{\}\[\]()#+\-.!])/g, "\\$1").trim();
            return text.trim();
        };

        /**
         * 递归处理 DOM 节点并将其转换为 Markdown。
         * @param {Node} node - 当前的 DOM 节点。
         * @param {number} listLevel - 当前列表嵌套级别。
         * @returns {Promise<string>} - 节点的 Markdown 字符串。
         */
        async function processNode(node, listLevel = 0) {
            let result = "";
            const ELEMENT_NODE = 1;
            const TEXT_NODE = 3;
            const COMMENT_NODE = 8;
            switch (node.nodeType) {
                case ELEMENT_NODE:
                    switch (node.tagName.toLowerCase()) {
                        case "h1":
                        case "h2":
                        case "h3":
                        case "h4":
                        case "h5":
                        case "h6":
                            {
                                const htype = Number(node.tagName[1]);
                                result += `${"#".repeat(htype)} ${node.textContent.trim()}\n\n`;
                            }
                            break;
                        case "p":
                            {
                                const style = node.getAttribute("style");
                                if (node.getAttribute("id") === "main-toc") {
                                    result += `**目录**\n\n[TOC]\n\n`;
                                    break;
                                }
                                let text = await processChildren(node, listLevel);
                                if (style) {
                                    if (style.includes("padding-left")) {
                                        break;
                                    }
                                    if (style.includes("text-align:center")) {
                                        // text = `<div style="text-align:center;">${text}</div>\n\n`;
                                        text = `<div style="text-align:center;">${shrinkHtml(
                                            node.innerHTML
                                        )}</div>\n\n`;
                                    } else if (style.includes("text-align:right")) {
                                        // text = `<div style="text-align:right;">${text}</div>\n\n`;
                                        text = `<div style="text-align:right;">${shrinkHtml(node.innerHTML)}</div>\n\n`;
                                    } else if (style.includes("text-align:justify")) {
                                        // text = `<div style="text-align:justify;">${text}</div>\n\n`;
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
                            result += ` **${(await processChildren(node, listLevel)).trim()}** `;
                            break;
                        case "em":
                        case "i":
                            result += ` *${(await processChildren(node, listLevel)).trim()}* `;
                            break;
                        case "u":
                            result += ` <u>${(await processChildren(node, listLevel)).trim()}</u> `;
                            break;
                        case "s":
                        case "strike":
                            result += ` ~~${(await processChildren(node, listLevel)).trim()}~~ `;
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
                                result += ` [${text}](${href}) `;
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
                                    result += `$$\n${alt}\n$$`;
                                } else {
                                    if (src.includes("#pic_center") || GM_getValue("forceImageCentering")) {
                                        result += "\n\n";
                                    } else {
                                        result += " ";
                                    }
                                    if (GM_getValue("saveWebImages")) {
                                        src = await saveWebImageToLocal(src, markdownFileName);
                                    }
                                    if (width && height && GM_getValue("enableImageSize")) {
                                        // result += `<img src="${src}" alt="${alt}" width="${width}" height="${height}" />`;
                                        // result += `<img src="${src}" alt="${alt}" style="max-width:${width}px; max-height:${height}px; box-sizing:content-box;" />`;
                                        result += `<img src="${src}" alt="${alt}" style="max-height:${height}px; box-sizing:content-box;" />`;
                                    } else {
                                        result += `![${alt}](${src})`;
                                    }
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
                                    // 新版本的代码块，class 含有 language-xxx
                                    if (className.includes("language-")) {
                                        // const languageMatch = className.match(/language-(\w+)/);
                                        // language = languageMatch ? languageMatch[0] : "";
                                        const languageMatch = className.split(" ");
                                        // 找到第一个 language- 开头的字符串
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
                                result += ` \`${codeText}\` `;
                            }
                            break;
                        case "hr":
                            if (node.getAttribute("id") !== "hr-toc") {
                                result += `---\n\n`;
                            }
                            break;
                        case "br":
                            result += `  \n`;
                            break;
                        case "table":
                            result += (await processTable(node)) + "\n\n";
                            break;
                        // case 'iframe':
                        //     {
                        //         const src = node.getAttribute('src') || '';
                        //         const iframeHTML = node.outerHTML.replace('></iframe>', ' style="width: 100%; aspect-ratio: 2;"></iframe>'); // Ensure proper closing
                        //         result += `${iframeHTML}\n\n`;
                        //     }
                        //     break;
                        case "div":
                            {
                                const className = node.getAttribute("class") || "";
                                if (className.includes("csdn-video-box")) {
                                    // Handle video boxes or other specific divs
                                    // result += `<div>${processChildren(node, listLevel)}</div>\n\n`;

                                    // 不递归处理了，直接在这里进行解析
                                    const iframe = node.querySelector("iframe");
                                    const src = iframe.getAttribute("src") || "";
                                    const title = node.querySelector("p").textContent || "";
                                    const iframeHTML = iframe.outerHTML.replace(
                                        "></iframe>",
                                        ' style="width: 100%; aspect-ratio: 2;"></iframe>'
                                    ); // Ensure video box is full width
                                    result += `<div align="center" style="border: 3px solid gray;border-radius: 27px;overflow: hidden;"> <a class="link-info" href="${src}" rel="nofollow" title="${title}">${title}</a>${iframeHTML}</div>\n\n`;
                                } else if (className.includes("toc")) {
                                    const customTitle = node.querySelector("h4").textContent || "";
                                    result += `**${customTitle}**\n\n[TOC]\n\n`;
                                } else {
                                    result += await processChildren(node, listLevel);
                                }
                            }
                            break;
                        case "span":
                            {
                                const node_class = node.getAttribute("class");
                                if (node_class) {
                                    if (node_class.includes("katex--inline")) {
                                        // class="katex-mathml"
                                        const mathml = clearSpecialChars(
                                            node.querySelector(".katex-mathml").textContent
                                        );
                                        const katex_html = clearSpecialChars(
                                            node.querySelector(".katex-html").textContent
                                        );
                                        // result += ` $${mathml.replace(katex_html, "")}$ `;

                                        if (mathml.startsWith(katex_html)) {
                                            result += ` $${mathml.replace(katex_html, "")}$ `;
                                        } else {
                                            // 字符串切片，去掉 mathml 开头等同长度的 katex_html，注意不能用 replace，因为 katex_html 里的字符顺序可能会变
                                            result += ` $${mathml.slice(katex_html.length)}$ `;
                                        }
                                        break;
                                    } else if (node_class.includes("katex--display")) {
                                        const mathml = clearSpecialChars(
                                            node.querySelector(".katex-mathml").textContent
                                        );
                                        const katex_html = clearSpecialChars(
                                            node.querySelector(".katex-html").textContent
                                        );
                                        // result += `$$\n${mathml.replace(katex_html, "")}\n$$\n\n`;

                                        if (mathml.startsWith(katex_html)) {
                                            result += `$$\n${mathml.replace(katex_html, "")}\n$$\n\n`;
                                        } else {
                                            // 字符串切片，去掉 mathml 开头等同长度的 katex_html，注意不能用 replace，因为 katex_html 里的字符顺序可能会变
                                            result += `$$\n${mathml.slice(katex_html.length)}\n$$\n\n`;
                                        }
                                        break;
                                    }
                                }
                                const style = node.getAttribute("style") || "";
                                if (
                                    (style.includes("background-color") || style.includes("color")) &&
                                    GM_getValue("enableColorText")
                                ) {
                                    result += `<span style="${style}">${await processChildren(node, listLevel)}</span>`;
                                } else {
                                    result += await processChildren(node, listLevel);
                                }
                            }
                            break;
                        case "kbd":
                            result += ` <kbd>${node.textContent}</kbd> `;
                            break;
                        case "mark":
                            result += ` <mark>${await processChildren(node, listLevel)}</mark> `;
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
                                // 必须为 foreignObject 里的 div 添加属性 xmlns="http://www.w3.org/1999/xhtml" ，否则 typora 无法识别
                                const foreignObjects = node.querySelectorAll("foreignObject");
                                for (const foreignObject of foreignObjects) {
                                    const divs = foreignObject.querySelectorAll("div");
                                    divs.forEach((div) => {
                                        div.setAttribute("xmlns", "http://www.w3.org/1999/xhtml");
                                    });
                                }
                                // 检查是否有 style 标签存在于 svg 元素内，如果有，则需要将 svg 元素转换为 img 元素，用 Base64 编码的方式显示。否则直接返回 svg 元素
                                if (node.querySelector("style")) {
                                    const base64 = svgToBase64(node.outerHTML);
                                    // result += `<img src="data:image/svg;base64,${base64}" alt="SVG Image" />`;
                                    result += `![SVG Image](data:image/svg+xml;base64,${base64})\n\n`;
                                } else {
                                    result += `<div align="center">${node.outerHTML}</div>\n\n`;
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
                            // 仅处理 checkbox 类型的 input 元素
                            if (node.getAttribute("type") === "checkbox") {
                                result += `[${node.checked ? "x" : " "}] `;
                            }
                            break;
                        case "dl":
                            // 自定义列表，懒得解析了，直接用 html 吧
                            result += `${shrinkHtml(node.outerHTML)}\n\n`;
                            break;
                        case "abbr":
                            result += `${shrinkHtml(node.outerHTML)}`;
                            break;
                        default:
                            result += await processChildren(node, listLevel);
                            result += "\n\n";
                            break;
                    }
                    break;
                case TEXT_NODE:
                    result += escapeMarkdown(node.textContent);
                    break;
                case COMMENT_NODE:
                    // Ignore comments
                    break;
                default:
                    break;
            }
            return result;
        }

        /**
         * 处理给定节点的子节点。
         * @param {Node} node - 父节点。
         * @param {number} listLevel - 当前列表嵌套级别。
         * @returns {Promise<string>} - 子节点拼接后的 Markdown 字符串。
         */
        async function processChildren(node, listLevel) {
            let text = "";
            for (const child of node.childNodes) {
                text += await processNode(child, listLevel);
            }
            return text;
        }

        /**
         * 处理列表元素 (<ul> 或 <ol>)。
         * @param {Element} node - 列表元素。
         * @param {number} listLevel - 当前列表嵌套级别。
         * @param {boolean} ordered - 列表是否有序。
         * @returns {Promise<string>} - 列表的 Markdown 字符串。
         */
        async function processList(node, listLevel, ordered) {
            let text = "";
            const children = Array.from(node.children).filter((child) => child.tagName.toLowerCase() === "li");
            text += "\n";
            for (let index = 0; index < children.length; index++) {
                const child = children[index];
                let prefix = ordered ? `${"   ".repeat(listLevel)}${index + 1}. ` : `${"  ".repeat(listLevel)}- `;
                const childText = (await processChildren(child, listLevel + 1)).trim();
                text += `${prefix}${childText}\n`;
            }
            text += `\n`;
            return text;
        }

        /**
         * 处理表格。
         * @param {Element} node - 包含表格的元素。
         * @returns {Promise<string>} - 表格的 Markdown 字符串。
         */
        async function processTable(node) {
            const rows = Array.from(node.querySelectorAll("tr"));
            if (rows.length === 0) return "";

            let table = "";

            // Process header
            const headerCells = Array.from(rows[0].querySelectorAll("th, td"));
            const headers = await Promise.all(headerCells.map(async (cell) => (await processNode(cell)).trim()));
            table += `| ${headers.join(" | ")} |\n`;

            // Process separator
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

            // Process body
            for (let i = 1; i < rows.length; i++) {
                const cells = Array.from(rows[i].querySelectorAll("td"));
                const row = await Promise.all(cells.map(async (cell) => (await processNode(cell)).trim()));
                table += `| ${row.join(" | ")} |\n`;
            }

            return table;
        }

        /**
         * 处理代码块。有两种代码块，一种是老版本的代码块，一种是新版本的代码块。
         * @param {Element} node - 包含代码块的元素。一般是 <pre> 元素。
         * @returns {Promise<string>} - 代码块的 Markdown 字符串。
         */
        async function processCodeBlock(codeNode) {
            // 查找 code 内部是否有 ol 元素，这两个是老/新版本的代码块，需要分开处理
            const node = codeNode.querySelector("ol");

            // 确保传入的节点是一个 <ol> 元素
            if (!node || node.tagName.toLowerCase() !== "ol") {
                // console.error('Invalid node: Expected an <ol> element.');
                // return '';
                // 如果没有 ol 元素，则说明是老版本，直接返回 codeNode 的 textContent
                // return codeNode.textContent + '\n';

                // 如果尾部有换行符，则去掉
                return codeNode.textContent.replace(/\n$/, "") + "\n";
            }

            // 获取所有 <li> 子元素
            const listItems = node.querySelectorAll("li");
            let result = "";

            // 遍历每个 <li> 元素
            listItems.forEach((li, index) => {
                // 将 <li> 的 textContent 添加到结果中
                result += li.textContent;
                result += "\n";
            });

            return result;
        }

        /**
         * 处理脚注。
         * @param {Element} node - 包含脚注的元素。
         * @returns {Promise<string>} - 脚注的 Markdown 字符串。
         */
        async function processFootnotes(node) {
            const footnotes = Array.from(node.querySelectorAll("li"));
            let result = "";

            for (let index = 0; index < footnotes.length; index++) {
                const li = footnotes[index];
                const text = (await processNode(li)).replaceAll("\n", " ").replaceAll("↩︎", "").trim();
                result += `[^${index + 1}]: ${text}\n`;
            }

            return result;
        }

        let markdown = "";
        for (const child of articleElement.childNodes) {
            markdown += await processNode(child);
        }
        // markdown = markdown.replace(/[\n]{3,}/g, '\n\n');
        return markdown.trim();
    }

    /**
     * 下载文章内容并转换为 Markdown 格式。并保存为文件。这里会额外获取文章标题和文章信息并添加到 Markdown 文件的开头。
     * @param {Document} doc_body - 文章的 body 元素。
     * @returns {Promise<void>} - 下载完成后的 Promise 对象。
     */
    async function downloadCSDNArticleToMarkdown(doc_body, getZip = false, url = "", prefix = "") {
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
        showFloatTip(`正在以${mode}模式下载文章：` + articleTitle);

        if (url === "") {
            url = window.location.href;
        }

        let markdown = await htmlToMarkdown(htmlInput, `${prefix}${articleTitle}`);

        if (GM_getValue("addArticleInfoInBlockquote")) {
            markdown = `> ${articleInfo}\n> 文章链接：${url}\n\n${markdown}`;
        }

        if (GM_getValue("addArticleTitleToMarkdown")) {
            markdown = `# ${articleTitle}\n\n${markdown}`;
        }

        if (GM_getValue("addArticleInfoInYaml")) {
            const article_info_box = doc_body.querySelector(".article-info-box");
            const meta_title = articleTitle;
            // 文字文字 YYYY-MM-DD HH:MM:SS 文字文字
            const meta_date =
                article_info_box.querySelector(".time")?.textContent.match(/\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/)[0] ||
                "";
            let articleMeta = `title: ${meta_title}\ndate: ${meta_date}\n`;

            // 文章分类
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

        // markdown = `# ${articleTitle}\n\n> ${articleInfo}\n\n${markdown}`;

        await saveTextAsFile(markdown, `${prefix}${articleTitle}.md`);
        if (getZip) {
            await saveAllFileToZip(`${articleTitle}`);
        }
    }

    /**
     * 创建一个隐藏的 iframe 并下载指定 URL 的文章。
     * @param {string} url - 文章的 URL。
     * @returns {Promise<void>} - 下载完成后的 Promise 对象。
     */
    async function downloadArticleInIframe(url, prefix = "") {
        return new Promise((resolve, reject) => {
            // 创建一个隐藏的 iframe
            const iframe = document.createElement("iframe");
            iframe.style.display = "none";
            iframe.src = url;
            document.body.appendChild(iframe);

            // 监听 iframe 加载完成事件
            iframe.onload = async () => {
                try {
                    const doc = iframe.contentDocument || iframe.contentWindow.document;

                    // 调用下载函数
                    await downloadCSDNArticleToMarkdown(doc.body, false, url, prefix);

                    // 移除 iframe
                    document.body.removeChild(iframe);

                    resolve();
                } catch (error) {
                    // 在发生错误时移除 iframe 并拒绝 Promise
                    document.body.removeChild(iframe);
                    console.error("下载文章时出错：", error);
                    reject(error);
                }
            };

            // 监听 iframe 加载错误事件
            iframe.onerror = async () => {
                document.body.removeChild(iframe);
                console.error("无法加载文章页面：", url);
                reject(new Error("无法加载文章页面"));
            };
        });
    }

    async function downloadArticleFromCategory(url, prefix = "") {
        if (!GM_getValue("addSerialNumber")) {
            prefix = "";
        }
        if (GM_getValue("fastDownload")) {
            const response = await fetch(url);
            const text = await response.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(text, "text/html");
            // 调用下载函数
            await downloadCSDNArticleToMarkdown(doc.body, false, url, prefix);
        } else {
            await downloadArticleInIframe(url, prefix);
        }
    }

    /**
     * 下载专栏的全部文章为 Markdown 格式。
     * @returns {Promise<void>} - 下载完成后的 Promise 对象。
     */
    async function downloadCSDNCategoryToMarkdown() {
        // 获取专栏 id，注意 url 可能是 /category_数字.html 或 /category_数字_数字.html，需要第一个数字
        showFloatTip("正在获取专栏的全部文章链接...");
        const base_url = window.location.href;
        const category_id = base_url.match(/category_(\d+)(?:_\d+)?\.html/)[1];
        
        const url_list = [];
        let page = 1;
        let doc_body = document.body;
        while (true) {
            let hasNextArticle = false;
            // 获取当前页面的文章列表
            doc_body.querySelector(".column_article_list").querySelectorAll("a").forEach((item) => {
                url_list.push(item.href);
                hasNextArticle = true;
            });
            if (!hasNextArticle) break;
            // 下一页
            page++;
            const next_url = base_url.replace(/category_\d+(?:_\d+)?\.html/, `category_${category_id}_${page}.html`);
            const response = await fetch(next_url);
            const text = await response.text();
            const parser = new DOMParser();
            doc_body = parser.parseFromString(text, "text/html").body;
        }
        if (url_list.length === 0) {
            showFloatTip("没有找到文章。");
            return;
        } else {
            showFloatTip(`找到 ${url_list.length} 篇文章。开始下载...（预计时间：${Math.round(url_list.length * 0.6)} 秒）`);
        }
        
        // 下载每篇文章
        const prefixMaxLength = url_list.length.toString().length;
        if (GM_getValue("parallelDownload")) {
            await Promise.all(url_list.map((url, index) => downloadArticleFromCategory(url, `${String(url_list.length - index).padStart(prefixMaxLength, '0')}_`)));
        } else {
            for (let i = 0; i < url_list.length; i++) {
                await downloadArticleFromCategory(url_list[i], `${String(url_list.length - i).padStart(prefixMaxLength, '0')}_`);
            }
        }

        if (GM_getValue("zipCategories")) {
            await saveAllFileToZip(`${document.title}`);
            showFloatTip(`专栏文章全部处理完毕，请等待打包。（预计时间： ${Math.round(url_list.length * 0.25)} 秒）`, url_list.length * 250);
        } else {
            showFloatTip("专栏文章全部处理完毕，请等待下载结束。", 3000);
        }

    }

    /**
     * 下载用户的全部文章为 Markdown 格式。
     * @returns {Promise<void>} - 下载完成后的 Promise 对象。
     */
    async function downloadAllArticlesOfUserToMarkdown() {
        showFloatTip("正在获取用户全部文章链接。可能需要进行多次页面滚动，请耐心等待。");

        const mainContent = document.body.querySelector(".mainContent");

        const url_list = [];
        const url_set = new Set();

        while (true) {
            // 等待 2 秒，等待页面加载完成
            await new Promise((resolve) => setTimeout(resolve, 2000));
            window.scrollTo({
                top: document.body.scrollHeight,
                behavior: "smooth", // 可选，使滚动平滑
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
            behavior: "smooth", // 可选，使滚动平滑
        });

        if (url_list.length === 0) {
            showFloatTip("没有找到文章。");
        } else {
            showFloatTip(`找到 ${url_list.length} 篇文章。开始下载...（预计时间：${Math.round(url_list.length * 0.6)} 秒）`);
        }

        // 下载每篇文章
        const prefixMaxLength = url_list.length.toString().length;
        if (GM_getValue("parallelDownload")) {
            await Promise.all(url_list.map((url, index) => downloadArticleFromCategory(url, `${String(url_list.length - index).padStart(prefixMaxLength, '0')}_`)));
        } else {
            for (let i = 0; i < url_list.length; i++) {
                await downloadArticleFromCategory(url_list[i], `${String(url_list.length - i).padStart(prefixMaxLength, '0')}_`);
            }
        }

        if (GM_getValue("zipCategories")) {
            await saveAllFileToZip(`${document.title}`);
            showFloatTip(`用户全部文章处理完毕，请等待打包。（预计时间： ${Math.round(url_list.length * 0.25)} 秒）`, url_list.length * 250);
        } else {
            showFloatTip("用户全部文章处理完毕，请等待下载结束。", 3000);
        }

    }

    /**
     * 主函数。点击下载按钮后执行。
     * @returns {Promise<void>} - 运行完成后的 Promise
     */
    async function runMain() {
        // 检查是专栏还是文章
        // 专栏的 url 里有 category
        // 文章的 url 里有 article/details
        disableFloatWindow();
        const url = window.location.href;
        if (url.includes("category")) {
            // 专栏
            await downloadCSDNCategoryToMarkdown();
        } else if (url.includes("article/details")) {
            // 文章
            await downloadCSDNArticleToMarkdown(document.body, GM_getValue("zipCategories"), window.location.href);
            showFloatTip("文章下载完成。", 3000);
        } else if (url.includes("type=blog")) {
            await downloadAllArticlesOfUserToMarkdown();
        } else {
            alert("无法识别的页面。");
        }
        enableFloatWindow();
        saveWebImageToLocal(null, null, true);
    }
})();
