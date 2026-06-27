# iOS 打包说明

## 结论

当前项目是 Electron + React 桌面应用。Electron 官方面向桌面平台，不能直接生成 iOS App。为了让 iPhone/iPad 可用，本项目增加了 PWA 路线：

- `npm run ios:pwa:build` 生成 `dist-ios-pwa/`
- 部署到 HTTPS 站点
- iOS Safari 打开后添加到主屏幕

## 为什么不能在当前 Windows 机器上直接生成 .ipa

Apple 的 iOS 原生打包链路需要 macOS、Xcode、Apple Developer 账号和签名证书。Windows 可以准备 Web/PWA 产物，也可以维护源码，但不能直接完成最终 iOS 归档签名。

## 后续如果要做原生 iOS App

推荐路线：

1. 先保持 React/Vite 前端可在浏览器运行。
2. 安装 Capacitor：`npm install @capacitor/core @capacitor/cli @capacitor/ios`。
3. 添加 Capacitor 配置，`webDir` 指向 `dist-ios-pwa`。
4. 在 macOS 上执行 `npx cap add ios` 和 `npx cap open ios`。
5. 在 Xcode 里配置 Bundle ID、Signing Team、图标和权限。
6. 用真机/TestFlight 验证 PDF 导入、阅读计时、总结保存、PWA 数据迁移。

## 当前 PWA 兼容层说明

`src/browserElectronAPI.ts` 会在没有 Electron preload 的环境下安装一个 `window.electronAPI` fallback：

- 数据保存到浏览器 localStorage
- PDF 通过 iOS 文件选择器读入并转为 base64 保存
- XP、论文、实验、组会、科技树在浏览器端本地运行
- 导出 Markdown 通过浏览器下载实现

localStorage 对大 PDF 不够稳，后续应升级 IndexedDB。
