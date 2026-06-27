# 研究生升级宝典交接日志

## 2026-06-27 当前目标

用户要求：

1. 将 D:\AcademicRPG 项目整理成后续可维护的 GitHub 项目。
2. 项目名称改为“研究生升级宝典”。
3. 让项目可以在 iOS 上使用。
4. 每一步都记录：做了什么、结果是什么、下一步是什么、整体计划是什么，方便断线后交给其他 agent 继续。

## 重要技术结论

- 当前项目是 Electron + React + Vite + TypeScript 项目。
- Electron 不能直接打包成 iOS App。
- 当前 Windows 环境不能直接生成 iOS `.ipa`，真正 iOS 原生包需要 macOS + Xcode + Apple Developer 签名。
- 已采用现实可落地路线：新增 iOS Safari/PWA 版本。
- iOS 使用方式：构建 `dist-ios-pwa/`，部署到 HTTPS 站点，iPhone/iPad 用 Safari 打开并“添加到主屏幕”。

## 已完成

### 1. 项目命名

已将主要品牌名从“学术成长升级器 / Academic RPG”改为“研究生升级宝典”。

涉及文件：

- package.json
- index.html
- electron/main.ts
- src/components/TitleBar.tsx
- src/pages/Dashboard.tsx
- src/pages/GrowthTree.tsx

### 2. 新增 iOS/PWA 路线

新增文件：

- src/browserElectronAPI.ts
- vite.web.config.ts
- public/manifest.webmanifest
- public/app-icon.svg
- docs/ios-packaging.md
- README.md
- .github/workflows/build.yml
- .gitignore

说明：

- `src/browserElectronAPI.ts` 会在没有 Electron preload 的浏览器环境下安装一个 `window.electronAPI` 兼容层。
- PWA 数据当前保存到 localStorage。
- PDF 在浏览器端通过文件选择器读取并转为 base64 保存。
- 这是 iOS Safari 上可用的雏形路线，后续建议升级到 IndexedDB。

### 3. 构建验证

已成功执行：

```bash
npm run ios:pwa:build
```

成功产物：

- D:\AcademicRPG\dist-ios-pwa

注意：

- 构建有 chunk size warning，但不是失败。
- 有 Vite CJS deprecation/PostCSS module type warning，也不是失败。

### 4. 桌面构建状态

执行：

```bash
npm run build
```

结果：失败。

失败原因：

```text
EPERM: operation not permitted, open 'D:\AcademicRPG\dist-electron\pdf-DrHs_suq.js'
```

判断：

- TypeScript 已通过。
- 前端 Vite transform 已通过。
- 失败发生在写入旧 `dist-electron` 输出文件。
- 更像文件权限或占用，不是源码逻辑错误。

后续处理建议：

1. 关闭正在运行的 Electron/Vite/Node 进程。
2. 删除或清空 `dist-electron/` 后重跑 `npm run build`。
3. 如果不想删除，先把 `dist-electron` 记为可清理项，等用户确认后再删。

## GitHub 状态

已检查：

- `gh --version` 存在。
- `gh auth status` 显示账号 `lidajier` token invalid。
- 当前 D:\AcademicRPG 还不是 Git 仓库。

后续计划：

1. 修正 `package-lock.json` 内旧项目名。
2. 初始化 Git 仓库。
3. 提交源码。
4. 尝试创建 GitHub 仓库 `graduate-upgrade-handbook` 或中文名对应 repo。
5. 如果 `gh` 因 token invalid 失败，需要用户重新登录：`gh auth login -h github.com`。

## 可清理项

这些文件/目录不应提交 Git，已加入 `.gitignore` 或计划忽略：

- node_modules/
- dist/
- dist-electron/
- dist-ios-pwa/
- release/
- .npm-cache/
- errors.txt
- tsc_errors.txt
- *.bak_*

是否删除需用户确认，当前不要随意删除。

## 下一步

1. 修正 package-lock 项目名。
2. 确认 .gitignore 生效。
3. 初始化 Git 仓库并提交。
4. 尝试 GitHub 上传；如果认证失败，输出清晰恢复步骤。

## 2026-06-27 交接日志 008

已做：根据独立审查结果，生成 `app-icon-180.png`、`app-icon-192.png`、`app-icon-512.png`、`apple-touch-icon.png`；将 manifest 和 HTML 图标路径改为相对路径；将 `vite.web.config.ts` 加入 `tsconfig.node.json`；在 README 补充 PWA 数据仅保存在当前设备浏览器本地存储的限制。

结果：iOS 添加到主屏幕的图标路径和 PNG 兼容性更稳，GitHub Pages 子路径部署风险降低。

下一步：重新执行 `npm run ios:pwa:build`，确认 PWA 构建仍然通过。

## 2026-06-27 交接日志 012

已做：检查 Git 用户配置，发现全局 user.name=foxi、user.email=3160648664@qq.com；同时发现 Electron Windows 打包配置引用 `public/icon.png`，但目录里没有该文件。

结果：已将 `public/app-icon-512.png` 复制为 `public/icon.png`，避免后续桌面打包因图标缺失失败。

下一步：初始化 Git 仓库，确认 `.gitignore` 生效，只提交源码、配置、文档和图标，不提交依赖目录和构建产物。

## 2026-06-27 交接日志 016

已做：执行 `git status --short`，确认 `.gitignore` 生效；整理 `package.json` 为标准可读 JSON。

结果：待提交文件只包含源码、配置、文档、图标和 GitHub workflow；依赖目录、构建产物、缓存、错误日志和备份文件没有进入待提交列表。Git 提示无法读取全局 ignore 文件，但不影响当前仓库提交。

下一步：执行 `git add .` 和首次 commit。

## 2026-06-27 交接日志 017

已做：恢复任务后重新检查 `git status --short`、项目目录和日志尾部；确认仓库已初始化，`.gitignore` 生效，待提交内容是源码、配置、文档、图标和 GitHub workflow。已启动审核 agent 并行检查技术栈、iOS/PWA 表述、GitHub 上传风险和体验评分。

结果：当前可以进入 `git add .` 和首次提交阶段。构建产物、依赖目录、缓存和错误日志仍未进入待提交列表。

下一步：执行 `git add .`，再执行首次 commit；之后尝试用 GitHub CLI 创建并推送仓库。

## 2026-06-27 交接日志 018

已做：执行 `git add .`。第一次在普通沙箱下失败，错误为无法创建 `D:/AcademicRPG/.git/index.lock`；随后按权限规则提权重试成功。

结果：源码、配置、文档、图标和 GitHub workflow 已进入暂存区。Git 输出 LF/CRLF 换行符提示，这是 Windows 常见提示，不阻塞提交。

下一步：重新暂存更新后的 `HANDOFF_LOG.md`，检查暂存状态，然后执行首次 commit。
