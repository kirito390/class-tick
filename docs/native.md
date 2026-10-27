# 原生壳（Capacitor）· 打包 Android / iOS

课刻的 Web 部分已经可以独立安装为 PWA；如果你需要**原生壳**（应用商店、系统通知权限、桌面小组件插件），用 Capacitor 再包一层。

## 已准备好的内容

| 文件 | 作用 |
| --- | --- |
| `capacitor.config.json` | appId `com.classtick.app`，webDir `native/www` |
| `tools/prepare_native.mjs` | 把 `index.html / assets / icons / sw.js / manifest` 复制到 `native/www`，并隐藏「安装」按钮 |
| `android/` | 已 `npx cap add android` 生成的 Android 工程 |
| `package.json` 脚本 | `native:prepare` / `native:sync` / `native:android` |

> **已构建 APK**：`dist/课刻-ClassTick-v1.6-Android.apk`（14 MB，release，debug keystore 签名）。
> 本机使用便携 JDK 17 + Android SDK 34 编译；重建命令：`powershell -File tools/build_apk.ps1`。

安装：把 APK 传到手机 → 文件管理器打开 → 允许「安装未知应用」→ 安装。首次启动会加载离线 WebView 资源，无需联网。

## Android

环境：Android Studio（含 Android SDK）、JDK 17。

```bash
npm install
npm run native:prepare        # 生成 native/www
npx cap sync android          # 同步 Web 资源到 android/
npx cap open android          # 用 Android Studio 打开
```

在 Android Studio 里：

1. 等 Gradle Sync 完成
2. `Build → Build Bundle(s) / APK(s) → Build APK(s)`
3. 产物在 `android/app/build/outputs/apk/debug/app-debug.apk`
4. 发布签名：`Build → Generate Signed Bundle / APK`

## iOS（仅 macOS）

```bash
npm install
npx cap add ios
npm run native:prepare
npx cap sync ios
npx cap open ios
```

Xcode 里设置 Team 与 Bundle ID，连真机运行 / Archive。

## 原生壳下怎么提醒

- **Web Push**：Android WebView / iOS WKWebView 对 Push API 支持不完整，原生壳内不要依赖浏览器 Push
- 更稳的方案是 Capacitor 本地通知插件：
  - `@capacitor/local-notifications`：壳内本地排程（应用被杀也能响，需系统权限）
  - 或继续用 Web Push：把 `server.mjs` 部署到 HTTPS，让用户在**系统浏览器 PWA** 中使用后台推送
- 课刻当前的原生壳只负责「壳 + WebView」，未内置通知插件；需要的话可以在 `native/` 里加插件并在 `app.js` 里桥接

## 系统桌面小组件

纯 Web / WebView 进不了 Android AppWidget、iOS WidgetKit。要做原生小组件需要：

- Android：`AppWidgetProvider` + Glance/RemoteViews，读取课表缓存（可用 Capacitor 插件桥接）
- iOS：WidgetKit + App Group 共享数据
- Windows：Tauri/Electron 的小窗口方案（课刻已有 `?widget=1` 应用窗口，可继续用）

## 为什么不是 Tauri

Tauri 适合 Windows/macOS/Linux 桌面壳，体积更小；但它不直接产出 Android/iOS 商店包（移动端仍走 Capacitor/原生）。桌面端若要打包，可在后续加一个 Tauri 配置，复用同一份 `native/www`。

## 验收

```bash
npm run native:prepare
npx cap sync android
ls android/app/src/main/assets/public/index.html
powershell -File tools/build_apk.ps1        # 重新构建 release APK
```

APK 信息：package `com.classtick.app`，versionName `1.6.0`，minSdk 22，targetSdk 34，SHA256 见构建输出。
