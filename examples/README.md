# Example

该目录下，case1 是 CSDN 富文本编辑器的功能演示。case2 是 CSDN Markdown 编辑器的功能演示。

您可以下载转换后的 Markdown 文件、PDF文件、DOCX文件，查看转换效果。

油猴脚本下载的 markdown 文件还会添加文章标题、作者、发布时间等信息，而 nodejs 版本则不会（需要额外的实现），请注意。

示例 CSDN 文章页面：

- case1：https://blog.csdn.net/Qalxry/article/details/145078403
- case2：https://blog.csdn.net/Qalxry/article/details/145082335

目录结构：

```
examples/
├── case1.html  # CSDN 富文本编辑器功能演示
├── case1.md    # 油猴脚本转换后的 Markdown 文件
├── case1.pdf   # case1.md 转换后的 PDF 文件
├── case2.html  # CSDN Markdown 编辑器功能演示
├── case2.md    # 油猴脚本转换后的 Markdown 文件
└── case2.pdf   # case2.md 转换后的 PDF 文件
```

