# Web Push 后台传令 · 部署与使用

## 它能做什么

- **应用完全关闭后**，服务端仍在课前 / 签到 / DDL 到点时给设备推送系统通知
- 复用课刻的同一套提醒引擎（`assets/core.js` 的 `buildReminders` + `buildTaskReminders`）
- 支持早报、鸣钟、签到、暮色预告、任务截止、前晚 DDL 提醒
- 通知点击会回到课刻对应页面；签到通知需要手动处理

## 它不能做什么

- **服务端必须保持运行**：电脑关机、进程停止、服务器宕机时不会推送
- 手机必须能访问到 HTTPS 地址并安装 PWA（iOS 16.4+，且需「添加到主屏幕」）
- 纯静态托管（Netlify/GitHub Pages）只能跑前端，不能承担这个 Node 服务；需要 VPS / 云主机 / 常开电脑

## 本机用法（Windows）

```bash
npm install           # 安装 web-push 依赖
node server.mjs       # 启动 8788，同时启动 push 调度
```

打开 <http://127.0.0.1:8788/> →「御前设置」→「后台传令 · Web Push」→ 开启后台传令。

首次开启时：

1. 浏览器询问通知权限 → 允许
2. 课刻向 `/api/push/subscribe` 提交 PushSubscription 和课表数据
3. 服务端把 VAPID 密钥写入 `push-data/vapid.json`，订阅写入 `push-data/subscriptions.json`
4. 之后每 20 秒检查一次提醒，命中就 `webpush.sendNotification`

> 电脑关机或关掉 `node server.mjs` 后，后台推送停止；此时仍可用页面打开提醒和 `.ics` 兜底。

## 手机使用（需要 HTTPS）

手机浏览器只允许安全上下文使用 Push，所以需要把你的课刻服务放到 HTTPS 域名上。

最小方案：一台 VPS + Caddy（自动 HTTPS）：

```bash
# Ubuntu 示例
sudo apt install nodejs npm caddy -y
git clone <你的仓库> /opt/classtick
cd /opt/classtick && npm install --omit=dev
PORT=8788 HOST=127.0.0.1 node server.mjs   # 用 systemd / pm2 常驻
```

`Caddyfile`：

```caddy
classtick.example.com {
    reverse_proxy 127.0.0.1:8788
}
```

手机 Safari/Chrome 打开 `https://classtick.example.com/` → 添加到主屏幕 → 设置里开启后台传令。

### iOS 注意

- 必须 iOS 16.4+，且**从主屏幕图标打开**（Safari 标签页里的 PWA 不能收 Web Push）
- iPhone 需要 HTTPS；本地 http 不行

## API

| 方法 | 路径 | 作用 |
| --- | --- | --- |
| GET | `/api/push/key` | VAPID 公钥 |
| GET | `/api/push/status` | 订阅数 / 是否有数据 / 下一条传令 |
| POST | `/api/push/subscribe` | 提交 `{subscription, data}` |
| POST | `/api/push/unsubscribe` | 退订 `{endpoint}` |
| POST | `/api/push/sync` | 同步 `{data}` 课表/设置/任务 |
| POST | `/api/push/test` | 给所有订阅发测试通知 |
| POST | `/api/push/selftest` | 用数据计算未来 7 天传令（验收） |

VAPID 私钥在 `push-data/vapid.json`，**不要提交到公开仓库**。换机器时把 `push-data/` 一起迁移，否则旧订阅无法继续推送（需要重新订阅）。

## 安全建议

- 不要把 `push-data/` 暴露到静态目录；当前服务只提供项目文件，`push-data/` 在项目根下但可通过 URL 访问！**部署时请在反代层禁止 `/push-data/`**，或把 `DATA_DIR` 改到项目外（修改 `push-server.mjs` 顶部常量）。
- 服务端只保存课表与任务摘要，不保存 LLM Key（前端同步时会剔除 `llmKey`/`llmBase`）
- 公网部署建议加登录/访问限制，避免陌生人订阅你的课表通知

## 验收

```bash
curl http://127.0.0.1:8788/healthz          # 含 push 状态
curl http://127.0.0.1:8788/api/push/status  # subscribed / hasData / next
curl -X POST http://127.0.0.1:8788/api/push/selftest -H "Content-Type: application/json" \
  -d '{"data":{...课表数据...}}'
```
