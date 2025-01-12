// Description: Convert CSDN HTML to Markdown using Node.js.
// Author: ShizuriYuki
// Date: 2025-01-11
// Last Update: 2025-01-11
// License: Polyform Strict License 1.0.0 (https://polyformproject.org/licenses/strict/1.0.0/)
// Version: 1.0.1
// SupportURL: https://github.com/Qalxry/csdn2md

const { JSDOM } = require("jsdom");
const { TextEncoder } = require("util");
const fs = require("fs");

/**
 * 将 SVG 图片转换为 Base64 编码的字符串。
 * @param {string} text - SVG 图片的文本内容。
 * @returns {string} - Base64 编码的字符串。
 */
function svgToBase64(svgText) {
    const uint8Array = new TextEncoder().encode(svgText);
    const binaryString = uint8Array.reduce((data, byte) => data + String.fromCharCode(byte), '');
    return btoa(binaryString);
}

/**
 * 压缩HTML内容，移除多余的空白和换行符。
 * @param {string} html - 输入的HTML字符串。
 * @returns {string} - 压缩后的HTML字符串。
 */
function shrinkHtml(html) {
    return html
        .replace(/>\s+</g, '><')   // 去除标签之间的空白
        .replace(/\s{2,}/g, ' ')   // 多个空格压缩成一个
        .replace(/^\s+|\s+$/g, ''); // 去除首尾空白
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
 * 转换 CSDN HTML 到 Markdown 格式。
 * @param {string} html - CSDN 文章的 HTML 内容。含有 id="content_views" 的 div 元素。
 * @returns {string} - Markdown 格式的文本。
 */
function htmlToMarkdown(html) {
    const htype_map = {
        一级标题: 1,
        二级标题: 2,
        三级标题: 3,
        四级标题: 4,
        五级标题: 5,
        六级标题: 6,
    };

    // Create a DOM parser
    const document = new JSDOM(html).window.document;
    const content = document.getElementById("content_views");

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
                            // 解析 id 里的 url 编码，如 %E4%B8%80%E7%BA%A7%E6%A0%87%E9%A2%98 -> 一级标题
                            if (node.getAttribute("id")) {
                                const htype = decodeURIComponent(node.getAttribute("id"));
                                result += `${"#".repeat(htype_map[htype])} ${node.textContent.trim()}\n\n`;
                            }
                            else {
                                const htype = Number(node.tagName[1]);
                                result += `${"#".repeat(htype)} ${node.textContent.trim()}\n\n`;
                            }
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
                            const width = node.getAttribute("width") || "";
                            const height = node.getAttribute("height") || "";
                            if (cls.includes("mathcode")) {
                                result += `$$\n${alt}\n$$`;
                            } else {
                                if (src.includes('#pic_center')) {
                                    result += '\n\n';
                                } else {
                                    result += ' ';
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
                                const languageMatch = className.match(/language-(\w+)/);
                                const language = languageMatch ? languageMatch[1] : "";

                                // const codeText = codeNode.textContent.replace(/^\s+|\s+$/g, '');
                                // result += `\`\`\`${language}\n${codeText}\n\`\`\`\n\n`;

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
                        break
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
                            const foreignObjects = node.querySelectorAll('foreignObject');
                            for (const foreignObject of foreignObjects) {
                                const divs = foreignObject.querySelectorAll('div');
                                divs.forEach(div => {
                                    div.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml');
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
                    case 'dl':
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
            // return codeNode.textContent;
            return codeNode.textContent.replace(/\n$/, '') + '\n';
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


// Example usage:
(function () {
    {
        // 从 ./examples/case1.html 中读取 HTML 内容
        // 将 Markdown 内容写入到 ./examples/case1.md 文件中
        console.log("(case1) Converting HTML to Markdown...");
        const htmlInput = fs.readFileSync('./examples/case1.html', 'utf-8');
        const markdownOutput = htmlToMarkdown(htmlInput);
        fs.writeFileSync('./examples/case1.md', markdownOutput);
        console.log("(case1) Conversion completed.");
    }
    {
        // 从 ./examples/case2.html 中读取 HTML 内容
        // 将 Markdown 内容写入到 ./examples/case2.md 文件中
        console.log("(case2) Converting CSDN HTML to Markdown...");
        const htmlInput = fs.readFileSync('./examples/case2.html', 'utf-8');
        const markdownOutput = htmlToMarkdown(htmlInput);
        fs.writeFileSync('./examples/case2.md', markdownOutput);
        console.log("(case2) Conversion completed.");
    }
    console.log("All conversions completed.");
})();

