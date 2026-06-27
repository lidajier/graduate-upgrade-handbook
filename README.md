# 研究生升级宝典

一个面向研究生的学术成长升级工具：把读论文、做实验、开组会、写总结、沉淀研究方向变成可记录、可量化、可回看的成长战绩。

## 当前能力

- 论文记录与 PDF 导入
- 阅读计时与结束阅读总结弹窗
- 论文总结、可复用观点、研究问题、方法、数据、结论、局限记录
- 实验、组会、写作、代码、灵感等战绩记录
- XP、等级、技能点、连续活跃统计
- 研究科技树
- Electron 桌面版
- iOS Safari/PWA 兼容层：没有 Electron 时使用浏览器本地存储模拟数据与 PDF 存储

## 技术栈

- React 18 + TypeScript
- Vite
- Tailwind CSS
- Zustand
- Recharts
- Electron 桌面壳
- sql.js 本地数据库
- PWA Web build for iOS Safari

## 开发

```bash
npm install
npm run dev
```

## 桌面版构建

```bash
npm run build
npm run electron:build
```

## iOS 可用版本：PWA 构建

```bash
npm run ios:pwa:build
npm run ios:pwa:preview
```

把 `dist-ios-pwa/` 部署到 GitHub Pages、Vercel、Netlify 或自己的 HTTPS 服务。iPhone/iPad 使用 Safari 打开网址后，选择“添加到主屏幕”，即可像 App 一样启动。

注意：Electron 不能直接打包成 iOS App。若要生成 `.ipa` 并上架 TestFlight/App Store，需要 macOS + Xcode + Apple Developer 签名，并把 Web 构建接入 Capacitor 或重写为 React Native。

PWA 数据仅保存在当前设备的浏览器本地存储中，换设备、清缓存或卸载主屏幕应用可能导致数据丢失。正式推广前建议升级到 IndexedDB，并增加导入/导出备份。

## 后续维护方向

1. 把浏览器 PWA 数据层从 localStorage 升级到 IndexedDB，提升 PDF 大文件稳定性。
2. 接入真实翻译服务，例如 OpenAI、DeepL、百度翻译等。
3. 给 AI 总结增加 API Key 配置页和失败重试机制。
4. 用 Capacitor 增加原生 iOS 工程，支持 TestFlight。
5. 增加 GitHub Actions 自动构建 PWA 静态产物。
