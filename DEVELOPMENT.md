# 开发与发布说明

本文记录本仓库常用开发检查和发布 Release 的命令，避免每次发布时重新查。

## 项目信息

- 主脚本：`csdn2md.user.js`
- 版本号位置：`csdn2md.user.js` 顶部 metadata 中的 `// @version`
- 发布分支：`main`
- 远程仓库：`csdn2md` → `https://github.com/Qalxry/csdn2md.git`
- GitHub Release 工作流：`.github/workflows/release.yml`
- Release 触发条件：推送 tag，匹配 `v*` 或 `[0-9]*`
- 推荐 tag 风格：`3.4.2`、`3.4.3`，即不带 `v` 前缀

## 发布前检查

先确认工作区改动：

```bash
git status --short
```

检查用户脚本语法：

```bash
node --check csdn2md.user.js
```

确认脚本 metadata 版本号：

```bash
grep -n "@version" csdn2md.user.js
```

如需修改版本号，编辑 `csdn2md.user.js` 顶部：

```js
// @version      3.4.3
```

## 发布 Release

以下以 `3.4.3` 为例。发布新版本时，把命令里的版本号替换成目标版本。

### 1. 提交发布改动

```bash
git add README.md csdn2md.user.js DEVELOPMENT.md .github/workflows/release.yml
git commit -m "chore: release 3.4.3"
git push csdn2md main
```

如果本次没有改 `README.md`、`DEVELOPMENT.md` 或 `.github/workflows/release.yml`，`git add` 里可以只保留实际改动的文件，例如：

```bash
git add csdn2md.user.js
git commit -m "chore: release 3.4.3"
git push csdn2md main
```

### 2. 创建并推送 tag

推荐使用不带 `v` 前缀的版本号：

```bash
git tag 3.4.3
git push csdn2md 3.4.3
```

推送 tag 后，GitHub Actions 会自动运行 `.github/workflows/release.yml`，创建 GitHub Release，并把 `csdn2md.user.js` 作为附件上传。

### 3. 查看工作流状态

如果已安装 GitHub CLI：

```bash
gh run list --workflow Release --limit 5
```

查看最新一次运行详情：

```bash
gh run view --workflow Release --log
```

也可以直接打开 GitHub Actions 页面查看：

```text
https://github.com/Qalxry/csdn2md/actions/workflows/release.yml
```

### 4. 检查 Release 页面

```text
https://github.com/Qalxry/csdn2md/releases/latest
```

确认：

- Release 名称是刚推送的版本号。
- 附件里有 `csdn2md.user.js`。
- 点击附件可以触发用户脚本安装。

## 一次性发布命令模板

确认版本号和提交内容都没问题后，可以用下面这组命令。把 `VERSION` 改成目标版本：

```bash
VERSION=3.4.3
node --check csdn2md.user.js
grep -n "@version" csdn2md.user.js
git status --short
git add README.md csdn2md.user.js DEVELOPMENT.md .github/workflows/release.yml
git commit -m "chore: release ${VERSION}"
git push csdn2md main
git tag "${VERSION}"
git push csdn2md "${VERSION}"
```

如果部分文件没有变化，`git add` 不会有副作用；但如果没有任何可提交改动，`git commit` 会失败，这是正常的。

## 删除错误 tag 后重发

如果 tag 推错了版本或指向了错误提交，先删除本地和远程 tag：

```bash
git tag -d 3.4.3
git push csdn2md :refs/tags/3.4.3
```

然后在正确提交上重新创建并推送：

```bash
git tag 3.4.3
git push csdn2md 3.4.3
```

如果 GitHub Release 已经被创建，还需要到 Release 页面删除错误 Release 后再重推 tag。

## GreasyFork 发布提醒

GitHub Release 会自动创建，但 GreasyFork 是否自动同步取决于 GreasyFork 后台配置。

发布后建议检查：

```text
https://greasyfork.org/scripts/523540
```

确认 GreasyFork 上显示的版本号和 `csdn2md.user.js` 的 `@version` 一致。
