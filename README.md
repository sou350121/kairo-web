# Kairo Web — 個人全能 AI 指揮中心

手機優先的 PWA Dashboard，讓你隨時了解 Kairo AI 秘書的全局狀態。

## 功能

- **儀表板** — Token 用量、Agent 狀態、Cron 排程、今日日曆
- **對話** — 直接與 Kairo 對話（Connected 模式）
- **任務** — 查看高優先任務、進行中任務
- **捕捉** — 快速捕捉想法發送給 Kairo
- **設定** — 連線設定、Agent 狀態

## 兩種模式

### Demo 模式（無需伺服器）
直接訪問：https://sou350121.github.io/kairo-web/

### Connected 模式（連接你的 Kairo）
1. 訪問上述 URL 或 `http://server:18789/app/`
2. 點「設定」-> 填入 Server URL 和 Auth Token
3. 點「測試連線」-> 成功後即進入 Connected 模式

## 同源部署（gateway）

```bash
sudo cp -r /path/to/kairo-web /opt/LazyingArtBot/kairo-web
sudo rm /opt/LazyingArtBot/dist/.buildstamp && openclaw-restart
```

訪問：`http://server:18789/app/`

## PWA 安裝

在手機瀏覽器打開，點「添加到主畫面」即可安裝為 App。

## 數據 API（Connected 模式）

| 端點 | 描述 |
|------|------|
| `GET /api/status` | 系統狀態 + Agent 列表 |
| `GET /api/cron` | Cron 排程列表 |
| `GET /api/usage/today` | 今日 Token 用量 |
| `GET /api/workspace/:path` | 讀取 workspace 文件 |
