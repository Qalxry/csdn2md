// ==UserScript==
// @name         csdn2md - 批量下载CSDN文章为Markdown
// @namespace    http://tampermonkey.net/
// @version      1.0.3
// @description  下载CSDN文章为Markdown格式，支持专栏批量下载。CSDN排版经过精心调教，最大程度支持CSDN的全部Markdown语法：KaTeX内联公式、KaTeX公式块、图片、内联代码、代码块、Bilibili视频控件、有序/无序/任务/自定义列表、目录、注脚、加粗斜体删除线下滑线高亮、内容居左/中/右、引用块、链接、快捷键（kbd）、表格、上下标、甘特图、UML图、FlowChart流程图
// @author       ShizuriYuki
// @match        https://*.csdn.net/*
// @icon         https://g.csdnimg.cn/static/logo/favicon32.ico
// @grant        none
// @run-at       document-end
// @license      PolyForm Strict License 1.0.0  https://polyformproject.org/licenses/strict/1.0.0/
// @supportURL   https://github.com/Qalxry/csdn2md
// ==/UserScript==

(function () {
    "use strict";

    // 创建悬浮窗
    const floatWindow = document.createElement("div");
    floatWindow.style.position = "fixed";
    floatWindow.style.bottom = "20px";
    floatWindow.style.right = "20px";
    floatWindow.style.padding = "10px";
    floatWindow.style.backgroundColor = "rgba(0, 0, 0, 0.7)";
    floatWindow.style.color = "#fff";
    floatWindow.style.borderRadius = "5px";
    floatWindow.style.boxShadow = "0 2px 5px rgba(0, 0, 0, 0.5)";
    floatWindow.style.zIndex = "9999";

    // 创建下载按钮
    const downloadButton = document.createElement("button");
    downloadButton.textContent = "下载CSDN文章为Markdown\n（支持专栏和文章页面，推荐使用typora打开下载的Markdown）";
    downloadButton.style.textAlign = "center";
    downloadButton.style.padding = "5px 10px";
    downloadButton.style.border = "none";
    downloadButton.style.backgroundColor = "#4CAF50";
    downloadButton.style.color = "white";
    downloadButton.style.borderRadius = "3px";
    downloadButton.style.cursor = "pointer";

    // 按钮点击事件
    downloadButton.addEventListener("click", runMain);

    // 将按钮添加到悬浮窗
    floatWindow.appendChild(downloadButton);
    document.body.appendChild(floatWindow);

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
     * @param {*} str 
     * @returns 
     */
    function clearSpecialChars(str) {
        return str.replace(/[\s]{2,}/g, "").replace(/[\u200B-\u200F\u202A-\u202E\u2060-\u206F\uFEFF\u00AD\u034F\u061C\u180E\u2800\u3164\uFFA0\uFFF9-\uFFFB]/g, "");
    }

    /**
     * 将 HTML 内容转换为 Markdown 格式。
     * @param {Element} html - HTML 内容。
     * @returns {string} - 转换后的 Markdown 字符串。
     */
    function htmlToMarkdown(html) {
        // // Create a DOM parser
        // const document = new JSDOM(html).window.document;
        // const content = document.getElementById("content_views");

        // Create a DOM parser
        // const parser = new DOMParser();
        // const doc = parser.parseFromString(html, 'text/html');
        // const content = doc.getElementById('content_views');

        // Directly use the input HTML content
        const content = html;

        let markdown = "";

        // 辅助函数，用于转义特殊的 Markdown 字符
        const escapeMarkdown = (text) => {
            // return text.replace(/([\\`*_\{\}\[\]()#+\-.!])/g, "\\$1").trim();
            return text.trim();
        };

        /**
         * 递归处理 DOM 节点并将其转换为 Markdown。
         * @param {Node} node - 当前的 DOM 节点。
         * @param {number} listLevel - 当前列表嵌套级别。
         * @returns {string} - 节点的 Markdown 字符串。
         */
        function processNode(node, listLevel = 0) {
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
                                let text = processChildren(node, listLevel);
                                if (style) {
                                    if (style.includes("padding-left")) {
                                        break;
                                    }
                                    if (style.includes("text-align:center")) {
                                        text = `<div style="text-align:center;">${text}</div>\n\n`;
                                    } else if (style.includes("text-align:right")) {
                                        text = `<div style="text-align:right;">${text}</div>\n\n`;
                                    } else if (style.includes("text-align:justify")) {
                                        text = `<div style="text-align:justify;">${text}</div>\n\n`;
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
                            result += ` **${processChildren(node, listLevel).trim()}** `;
                            break;
                        case "em":
                        case "i":
                            result += ` *${processChildren(node, listLevel).trim()}* `;
                            break;
                        case "u":
                            result += ` <u>${processChildren(node, listLevel).trim()}</u> `;
                            break;
                        case "s":
                        case "strike":
                            result += ` ~~${processChildren(node, listLevel).trim()}~~ `;
                            break;
                        case "a":
                            {
                                const node_class = node.getAttribute("class");
                                if (node_class && node_class.includes("footnote-backref")) {
                                    break;
                                }
                                const href = node.getAttribute("href") || "";
                                const text = processChildren(node, listLevel);
                                result += ` [${text}](${href}) `;
                            }
                            break;
                        case "img":
                            {
                                const src = node.getAttribute("src") || "";
                                const alt = node.getAttribute("alt") || "";
                                const cls = node.getAttribute("class") || "";
                                // const width = node.getAttribute("width") || "";
                                // const height = node.getAttribute("height") || "";

                                // 获取实际渲染的宽度和高度
                                const computedStyle = window.getComputedStyle(node);
                                const width = parseFloat(computedStyle.width);
                                const height = parseFloat(computedStyle.height);

                                if (cls.includes("mathcode")) {
                                    result += `$$\n${alt}\n$$`;
                                } else {
                                    if (src.includes("#pic_center")) {
                                        result += "\n\n";
                                    } else {
                                        result += " ";
                                    }
                                    if (width && height) {
                                        // result += `<img src="${src}" alt="${alt}" width="${width}" height="${height}" />`;
                                        result += `<img src="${src}" alt="${alt}" width="${width}" height="${height}" style="box-sizing:content-box;" />`;
                                    } else {
                                        result += `![${alt}](${src})`;
                                    }
                                }
                            }
                            break;
                        case "ul":
                            result += processList(node, listLevel, false);
                            break;
                        case "ol":
                            result += processList(node, listLevel, true);
                            break;
                        case "blockquote":
                            {
                                const text = processChildren(node, listLevel)
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
                                    result += `\`\`\`${language}\n${processCodeBlock(codeNode)}\`\`\`\n\n`;
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
                            result += processTable(node) + "\n\n";
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
                                    result += processChildren(node, listLevel);
                                }
                            }
                            break;
                        case "span":
                            {
                                const node_class = node.getAttribute("class");
                                if (node_class) {
                                    if (node_class.includes("katex--inline")) {
                                        // class="katex-mathml"
                                        const mathml = clearSpecialChars(node.querySelector(".katex-mathml").textContent);
                                        const katex_html = clearSpecialChars(node.querySelector(".katex-html").textContent);
                                        // result += ` $${mathml.replace(katex_html, "")}$ `;
                                        
                                        if (mathml.startsWith(katex_html)) {
                                            result += ` $${mathml.replace(katex_html, "")}$ `;
                                        } else {
                                            // 字符串切片，去掉 mathml 开头等同长度的 katex_html，注意不能用 replace，因为 katex_html 里的字符顺序可能会变
                                            result += ` $${mathml.slice(katex_html.length)}$ `;
                                        }
                                        break;
                                    } else if (node_class.includes("katex--display")) {
                                        const mathml = clearSpecialChars(node.querySelector(".katex-mathml").textContent);
                                        const katex_html = clearSpecialChars(node.querySelector(".katex-html").textContent);
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
                                if (style.includes("background-color") || style.includes("color")) {
                                    result += `<span style="${style}">${processChildren(node, listLevel)}</span>`;
                                } else {
                                    result += processChildren(node, listLevel);
                                }
                            }
                            break;
                        case "kbd":
                            result += ` <kbd>${node.textContent}</kbd> `;
                            break;
                        case "mark":
                            result += ` <mark>${processChildren(node, listLevel)}</mark> `;
                            break;
                        case "sub":
                            result += `<sub>${processChildren(node, listLevel)}</sub>`;
                            break;
                        case "sup":
                            {
                                const node_class = node.getAttribute("class");
                                if (node_class && node_class.includes("footnote-ref")) {
                                    result += `[^${node.textContent}]`;
                                } else {
                                    result += `<sup>${processChildren(node, listLevel)}</sup>`;
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
                                    result += processFootnotes(node);
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
                        default:
                            result += processChildren(node, listLevel);
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
         * @returns {string} - 子节点拼接后的 Markdown 字符串。
         */
        function processChildren(node, listLevel) {
            let text = "";
            node.childNodes.forEach((child) => {
                text += processNode(child, listLevel);
            });
            return text;
        }

        /**
         * 处理列表元素 (<ul> 或 <ol>)。
         * @param {Element} node - 列表元素。
         * @param {number} listLevel - 当前列表嵌套级别。
         * @param {boolean} ordered - 列表是否有序。
         * @returns {string} - 列表的 Markdown 字符串。
         */
        function processList(node, listLevel, ordered) {
            let text = "";
            const children = Array.from(node.children).filter((child) => child.tagName.toLowerCase() === "li");
            text += "\n";
            children.forEach((child, index) => {
                let prefix = ordered ? `${"   ".repeat(listLevel)}${index + 1}. ` : `${"  ".repeat(listLevel)}- `;
                text += `${prefix}${processChildren(child, listLevel + 1).trim()}\n`;
            });
            text += `\n`;
            return text;
        }

        /**
         * 处理表格。
         * @param {Element} node - 包含表格的元素。
         * @returns {string} - 表格的 Markdown 字符串。
         */
        function processTable(node) {
            const rows = Array.from(node.querySelectorAll("tr"));
            if (rows.length === 0) return "";

            let table = "";

            // Process header
            const headerCells = Array.from(rows[0].querySelectorAll("th, td"));
            const headers = headerCells.map((cell) => processNode(cell).trim());
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
                    return "---";
                }
            });
            table += `|${alignments.join("|")}|\n`;

            // Process body
            for (let i = 1; i < rows.length; i++) {
                const cells = Array.from(rows[i].querySelectorAll("td"));
                const row = cells.map((cell) => processNode(cell).trim()).join(" | ");
                table += `| ${row} |\n`;
            }

            return table;
        }

        /**
         * 处理代码块。有两种代码块，一种是老版本的代码块，一种是新版本的代码块。
         * @param {Element} node - 包含代码块的元素。一般是 <pre> 元素。
         * @returns {string} - 代码块的 Markdown 字符串。
         */
        function processCodeBlock(codeNode) {
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
         * @returns {string} - 脚注的 Markdown 字符串。
         */
        function processFootnotes(node) {
            const footnotes = Array.from(node.querySelectorAll("li"));
            let result = "";

            footnotes.forEach((li, index) => {
                const text = processNode(li).replaceAll("\n", " ").replaceAll("↩︎", "").trim();
                result += `[^${index + 1}]: ${text}\n`;
            });

            return result;
        }

        // Start processing child nodes
        content.childNodes.forEach((child) => {
            markdown += processNode(child);
        });

        // // Trim excessive newlines
        // markdown = markdown.replace(/[\n]{3,}/g, '\n\n');

        return markdown.trim();
    }

    /**
     * 将文本保存为文件。
     * @param {string} text
     * @param {string} filename
     */
    function saveTextAsFile(text, filename) {
        const blob = new Blob([text], { type: "text/plain" });
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
     * 下载文章内容并转换为 Markdown 格式。并保存为文件。这里会额外获取文章标题和文章信息并添加到 Markdown 文件的开头。
     * @param {Document} doc_body - 文章的 body 元素。
     * @returns {Promise<void>} - 下载完成后的 Promise 对象。
     */
    async function downloadCSDNArticleToMarkdown(doc_body) {
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
        let markdown = htmlToMarkdown(htmlInput);
        markdown = `# ${articleTitle}\n\n> ${articleInfo}\n\n${markdown}`;
        saveTextAsFile(markdown, `${articleTitle}.md`);
    }

    /**
     * 下载文章内容并转换为 Markdown 格式。
     * @param {string} url - 文章的 URL。
     * @returns {Promise<void>} - 下载完成后的 Promise 对象。
     */
    async function downloadArticle(url) {
        const response = await fetch(url);
        const text = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(text, "text/html");

        // 在这里处理文章内容并转换为 Markdown
        const title = doc.title;

        // alert('正在下载文章：' + title);

        // alert 会阻塞页面，所以这里要用别的方式显示提示信息，在页面上方显示一个悬浮提示框
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
        floatTip.textContent = "正在下载文章：" + title;
        floatTip.id = "myInfoFloatTip";
        document.body.appendChild(floatTip);

        // 调用下载函数
        downloadCSDNArticleToMarkdown(doc.body);
    }

    /**
     * 下载专栏的全部文章为 Markdown 格式。
     * @returns {Promise<void>} - 下载完成后的 Promise 对象。
     */
    async function downloadCSDNCategoriesToMarkdown() {
        // 获取专栏 id，注意 url 可能是 /category_数字.html 或 /category_数字_数字.html，需要第一个数字
        const base_url = window.location.href;
        const category_id = base_url.match(/category_(\d+)(?:_\d+)?\.html/)[1];
        let page = 1;
        const original_html = document.body.innerHTML;
        while (true) {
            // 获取当前页面的文章列表
            const url_list = [];
            document.body
                .querySelector(".column_article_list")
                .querySelectorAll("a")
                .forEach((item) => {
                    url_list.push(item.href);
                });

            if (url_list.length === 0) {
                break;
            }

            // 下载每篇文章
            for (const url of url_list) {
                await downloadArticle(url);
            }

            // 下一页
            page++;
            const next_url = base_url.replace(/category_\d+(?:_\d+)?\.html/, `category_${category_id}_${page}.html`);
            const response = await fetch(next_url);
            const text = await response.text();
            document.body.innerHTML = text; // 更新页面内容
        }
        document.body.innerHTML = original_html; // 恢复原始页面内容
    }

    /**
     * 主函数。点击下载按钮后执行。
     * @returns {Promise<void>} - 运行完成后的 Promise
     */
    async function runMain() {
        // 检查是专栏还是文章
        // 专栏的 url 里有 category
        // 文章的 url 里有 article/details
        const url = window.location.href;
        if (url.includes("category")) {
            // 专栏
            await downloadCSDNCategoriesToMarkdown();
        } else if (url.includes("article/details")) {
            // 文章
            await downloadCSDNArticleToMarkdown(document.body);
        } else {
            alert("无法识别的页面。");
        }
    }
})();
