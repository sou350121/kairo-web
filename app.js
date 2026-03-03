(function () {
  "use strict";

  // ─── Config & State ───────────────────────────────────────────────────────

  const cfg = {
    serverUrl: localStorage.getItem("kw_server") || "",
    token: localStorage.getItem("kw_token") || "",
    mode: localStorage.getItem("kw_mode") || "demo", // 'demo' | 'live'
    lanUrl: localStorage.getItem("kw_lan_url") || "",
  };

  function saveConfig() {
    localStorage.setItem("kw_server", cfg.serverUrl);
    localStorage.setItem("kw_token", cfg.token);
    localStorage.setItem("kw_mode", cfg.mode);
    localStorage.setItem("kw_lan_url", cfg.lanUrl);
  }

  // ─── KairoAPI Class ───────────────────────────────────────────────────────

  class KairoAPI {
    constructor(baseUrl, token) {
      this.baseUrl = baseUrl.replace(/\/$/, "");
      this.token = token;
    }

    async _fetch(path, opts = {}) {
      const headers = { "Content-Type": "application/json" };
      if (this.token) {
        headers["Authorization"] = `Bearer ${this.token}`;
      }
      const res = await fetch(this.baseUrl + path, {
        ...opts,
        headers: { ...headers, ...opts.headers },
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      return res.json();
    }

    async testConnection() {
      return this._fetch("/api/status");
    }

    async getStatus() {
      return this._fetch("/api/status");
    }

    async getCronJobs() {
      return this._fetch("/api/cron");
    }

    async getUsageToday() {
      return this._fetch("/api/usage/today");
    }

    async getWorkspaceFile(path) {
      return this._fetch(`/api/workspace/${encodeURIComponent(path)}`);
    }

    async sendChat(messages, stream = false) {
      return this._fetch("/v1/chat/completions", {
        method: "POST",
        body: JSON.stringify({ model: "openclaw", messages, stream }),
      });
    }

    async getHealth() {
      return this._fetch("/api/health");
    }

    async sendCapture(text, tags) {
      return this._fetch("/hooks/agent", {
        method: "POST",
        body: JSON.stringify({
          message: `[${tags.join(", ")}] ${text}`,
          name: "KairoWeb",
          wakeMode: "now",
          deliver: true,
        }),
      });
    }

    async getSetupStatus() {
      return this._fetch("/api/setup/status");
    }

    async validateSetup(type, value, opts) {
      return this._fetch("/api/setup/validate", {
        method: "POST",
        body: JSON.stringify({ type, value, ...opts }),
      });
    }

    async applySetup(data) {
      return this._fetch("/api/setup/apply", {
        method: "POST",
        body: JSON.stringify(data),
      });
    }
  }

  let api = null;
  function getAPI() {
    if (!api && cfg.serverUrl) {
      api = new KairoAPI(cfg.serverUrl, cfg.token);
    }
    return api;
  }

  // ─── Mock Data ────────────────────────────────────────────────────────────

  const MOCK = {
    status: {
      ok: true,
      uptime: 172800,
      version: "1.0.0",
      agents: [
        { id: "main", name: "Planner", online: true, lastHeartbeatMs: 120000 },
        { id: "executor", name: "Executor", online: true, lastHeartbeatMs: 180000 },
        { id: "reviewer", name: "Reviewer", online: true, lastHeartbeatMs: 30000 },
      ],
    },

    cron: {
      jobs: [
        {
          id: "morning-report",
          name: "晨報",
          enabled: true,
          schedule: "10 7 * * *",
          state: { lastRunAtMs: Date.now() - 3600000, nextRunAtMs: Date.now() + 82800000 },
        },
        {
          id: "lang-course",
          name: "語言課程",
          enabled: true,
          schedule: "0 8 * * *",
          state: { lastRunAtMs: Date.now() - 7200000, nextRunAtMs: Date.now() + 72000000 },
        },
        {
          id: "health-course",
          name: "健康課程",
          enabled: true,
          schedule: "30 7 * * *",
          state: { lastRunAtMs: Date.now() - 5400000, nextRunAtMs: Date.now() + 75600000 },
        },
        {
          id: "calendar-capture",
          name: "日曆捕捉",
          enabled: true,
          schedule: "0 7 * * *",
          state: {},
        },
        {
          id: "gmail-digest",
          name: "Gmail 摘要",
          enabled: true,
          schedule: "30 6 * * *",
          state: {},
        },
        { id: "tophub", name: "熱榜", enabled: true, schedule: "0 9 * * *", state: {} },
        { id: "heartbeat", name: "心跳", enabled: true, schedule: "*/30 7-23 * * *", state: {} },
        { id: "weekly-review", name: "週反思", enabled: true, schedule: "0 20 * * 0", state: {} },
      ],
      summary: { active: 28, disabled: 2, errored: 2 },
    },

    usage: {
      byModel: {
        "gpt-5.3-codex": { input: 45000, output: 12000, cost: 1.89 },
        "qwen-plus": { input: 8000, output: 3000, cost: 0.02 },
      },
      byAgent: {
        main: { total: 32000, cost: 1.12 },
        executor: { total: 18000, cost: 0.65 },
        reviewer: { total: 5000, cost: 0.14 },
      },
      total: { input: 53000, output: 15000, tokens: 68000, cost: 1.91 },
    },

    health: {
      ok: true,
      ts: Date.now(),
      uptime: 86400,
      agents: [
        { id: "main", name: "Planner", status: "online" },
        { id: "executor", name: "Executor", status: "online" },
        { id: "reviewer", name: "Reviewer", status: "online" },
      ],
      feishu: { tokenPresent: true, tokenExpiredSoon: false, expiresInMinutes: 118 },
      cron: { activeJobs: 28, disabledJobs: 2, nextJobName: "語言課程", nextRunAtMs: Date.now() + 32 * 60000 },
    },

    tasks: [
      {
        id: 1,
        title: "完成 Kairo Web Dashboard",
        priority: "HIGH",
        status: "active",
        due: "2026-03-05",
        agent: "executor",
      },
      {
        id: 2,
        title: "複習日語 N2 語法",
        priority: "HIGH",
        status: "pending",
        due: "2026-03-10",
        agent: "main",
      },
      {
        id: 3,
        title: "聯繫投資人 Alex",
        priority: "HIGH",
        status: "pending",
        due: "2026-03-15",
        agent: "main",
      },
      {
        id: 4,
        title: "閱讀《思考快與慢》第4章",
        priority: "MED",
        status: "pending",
        due: null,
        agent: "main",
      },
      {
        id: 5,
        title: "週反思 — 上週進展",
        priority: "MED",
        status: "done",
        due: "2026-03-01",
        agent: "reviewer",
      },
      {
        id: 6,
        title: "Gmail 設置自動分類規則",
        priority: "LOW",
        status: "pending",
        due: null,
        agent: "executor",
      },
      {
        id: 7,
        title: "健康打卡：跑步 5km",
        priority: "MED",
        status: "active",
        due: "2026-03-02",
        agent: "executor",
      },
      {
        id: 8,
        title: "準備月度彙報 PPT",
        priority: "HIGH",
        status: "pending",
        due: "2026-03-28",
        agent: "main",
      },
    ],

    calendar: [
      { time: "09:00", title: "與團隊 standup 會議", duration: "30m", type: "meeting" },
      { time: "14:00", title: "投資人電話 — Series A 討論", duration: "1h", type: "important" },
      { time: "16:30", title: "語言課程複習", duration: "45m", type: "study" },
      { time: "18:00", title: "健身：HIIT 20分鐘", duration: "20m", type: "health" },
      { time: "20:00", title: "閱讀時間", duration: "60m", type: "personal" },
    ],

    calendarFull: (function () {
      var d0 = new Date();
      var fmt = function (d) {
        return d.toISOString().slice(0, 10);
      };
      var ad = function (d, n) {
        var r = new Date(d);
        r.setDate(r.getDate() + n);
        return r;
      };
      return [
        // Yesterday
        {
          date: fmt(ad(d0, -1)),
          time: "14:00",
          summary: "週報回顧",
          location: "",
          attendees: "",
          type: "work",
          source: "mock",
          allDay: false,
        },
        {
          date: fmt(ad(d0, -1)),
          time: "19:00",
          summary: "晚跑 5km",
          location: "公園",
          attendees: "",
          type: "health",
          source: "mock",
          allDay: false,
        },
        // Today
        {
          date: fmt(d0),
          time: "09:00",
          summary: "站立會議 standup",
          location: "辦公室",
          attendees: "團隊",
          type: "meeting",
          source: "mock",
          allDay: false,
        },
        {
          date: fmt(d0),
          time: "11:30",
          summary: "語言課程複習",
          location: "",
          attendees: "",
          type: "study",
          source: "mock",
          allDay: false,
        },
        {
          date: fmt(d0),
          time: "14:00",
          summary: "投資人電話 — Series A",
          location: "Zoom",
          attendees: "Alex Chen",
          type: "important",
          source: "mock",
          allDay: false,
        },
        {
          date: fmt(d0),
          time: "18:00",
          summary: "HIIT 訓練",
          location: "健身房",
          attendees: "",
          type: "health",
          source: "mock",
          allDay: false,
        },
        {
          date: fmt(d0),
          time: "20:00",
          summary: "閱讀時間",
          location: "",
          attendees: "",
          type: "personal",
          source: "mock",
          allDay: false,
        },
        // Tomorrow
        {
          date: fmt(ad(d0, 1)),
          time: "全天",
          summary: "Q1 復盤準備",
          location: "",
          attendees: "",
          type: "work",
          source: "mock",
          allDay: true,
        },
        {
          date: fmt(ad(d0, 1)),
          time: "10:00",
          summary: "產品評審會議",
          location: "會議室 A",
          attendees: "產品團隊",
          type: "meeting",
          source: "mock",
          allDay: false,
        },
        {
          date: fmt(ad(d0, 1)),
          time: "15:30",
          summary: "日語口語練習",
          location: "",
          attendees: "",
          type: "study",
          source: "mock",
          allDay: false,
        },
        // Day +2
        {
          date: fmt(ad(d0, 2)),
          time: "09:30",
          summary: "醫療體檢",
          location: "醫院",
          attendees: "",
          type: "health",
          source: "mock",
          allDay: false,
        },
        {
          date: fmt(ad(d0, 2)),
          time: "14:00",
          summary: "技術分享：AI 工具鏈",
          location: "線上",
          attendees: "",
          type: "study",
          source: "mock",
          allDay: false,
        },
        // Day +3
        {
          date: fmt(ad(d0, 3)),
          time: "11:00",
          summary: "合同簽署",
          location: "律師事務所",
          attendees: "法務",
          type: "important",
          source: "mock",
          allDay: false,
        },
        {
          date: fmt(ad(d0, 3)),
          time: "19:30",
          summary: "朋友聚餐",
          location: "日料",
          attendees: "小明, 小紅",
          type: "personal",
          source: "mock",
          allDay: false,
        },
        // Day +5
        {
          date: fmt(ad(d0, 5)),
          time: "09:00",
          summary: "季度 OKR 回顧",
          location: "線上",
          attendees: "全員",
          type: "meeting",
          source: "mock",
          allDay: false,
        },
        // Day +6
        {
          date: fmt(ad(d0, 6)),
          time: "全天",
          summary: "週末休息日",
          location: "",
          attendees: "",
          type: "personal",
          source: "mock",
          allDay: true,
        },
      ];
    })(),

    usageHistory: [1200, 890, 2100, 1560, 3200, 1890, 2450], // last 7 days tokens (k)

    projects: [
      {
        id: "nsfc-2026",
        title: "國自然基金申請",
        deadline: "2026-04-30",
        priority: "HIGH",
        agent: "main",
        notes: "面上項目，需提前 2 月籌備",
        subtasks: [
          { id: "s1", title: "確定研究方向與題目", done: true },
          { id: "s2", title: "查閱近 5 年相關文獻（50+ 篇）", done: true },
          { id: "s3", title: "撰寫立項依據", done: false },
          { id: "s4", title: "設計研究內容與目標", done: false },
          { id: "s5", title: "繪製技術路線圖", done: false },
          { id: "s6", title: "可行性分析與研究基礎", done: false },
          { id: "s7", title: "預算與人員安排", done: false },
          { id: "s8", title: "提交系主任審核", done: false },
          { id: "s9", title: "最終定稿上傳系統", done: false },
        ],
      },
      {
        id: "kairo-v2",
        title: "Kairo 產品 v2.0 發布",
        deadline: "2026-03-31",
        priority: "HIGH",
        agent: "executor",
        notes: "完成 PWA + 行程功能",
        subtasks: [
          { id: "s1", title: "PWA Dashboard 完善", done: true },
          { id: "s2", title: "日曆頁面實現", done: true },
          { id: "s3", title: "任務推進視圖升級", done: false },
          { id: "s4", title: "數據持久化", done: false },
          { id: "s5", title: "發布 GitHub Pages", done: false },
        ],
      },
      {
        id: "investor-roadshow",
        title: "投資人路演準備",
        deadline: "2026-03-15",
        priority: "HIGH",
        agent: "main",
        notes: "Series A Pre，3 位目標投資人",
        subtasks: [
          { id: "s1", title: "更新 pitch deck（20 頁）", done: false },
          { id: "s2", title: "財務模型修正", done: false },
          { id: "s3", title: "確認 Alex 會面時間", done: false },
          { id: "s4", title: "準備 FAQ 問答集", done: false },
        ],
      },
      {
        id: "lang-n2",
        title: "日語 N2 備考",
        deadline: "2026-07-06",
        priority: "MED",
        agent: "executor",
        notes: "7 月考試，每日練習",
        subtasks: [
          { id: "s1", title: "完成語法書第 1-5 章", done: true },
          { id: "s2", title: "刷完 N2 真題 2019-2023", done: false },
          { id: "s3", title: "詞彙量達到 6000", done: false },
          { id: "s4", title: "完成 3 套模擬考", done: false },
        ],
      },
    ],

    chatHistory: [
      {
        role: "assistant",
        content:
          "早上好！今日 7:10 晨報已發送。你有 2 個高優先任務需要跟進，日曆上下午有投資人電話。有什麼我可以幫你的嗎？",
      },
    ],
  };

  // ─── Hash Router ──────────────────────────────────────────────────────────

  const pages = new Set(["dashboard", "chat", "tasks", "calendar", "capture", "settings", "setup"]);
  let currentPage = "dashboard";

  function navigateTo(page) {
    if (!pages.has(page)) {
      page = "dashboard";
    }
    currentPage = page;

    // Update pages
    document.querySelectorAll(".page").forEach(function (el) {
      el.classList.remove("active");
    });
    const target = document.getElementById("page-" + page);
    if (target) {
      target.classList.add("active");
    }

    // Update bottom nav
    document.querySelectorAll(".nav-tab").forEach(function (el) {
      el.classList.toggle("active", el.dataset.page === page);
    });

    // Render page content
    renderPage(page);
  }

  function renderPage(page) {
    switch (page) {
      case "dashboard":
        void renderDashboard();
        break;
      case "chat":
        /* chat is maintained */ break;
      case "tasks":
        renderTasks();
        break;
      case "calendar":
        void renderCalendar();
        break;
      case "capture":
        renderCaptureHistory();
        break;
      case "settings":
        renderSettings();
        break;
      case "setup":
        renderSetupWizard();
        break;
    }
  }

  // ─── Dashboard Renderer ───────────────────────────────────────────────────

  // ─── Health Panel ─────────────────────────────────────────────────────────
  function buildHealthPanelHtml(data) {
    if (!data) return "";
    const { agents = [], feishu = {}, cron = {}, uptime = 0, ts } = data;

    const d = Math.floor(uptime / 86400), h = Math.floor((uptime % 86400) / 3600), m = Math.floor((uptime % 3600) / 60);
    const uptimeStr = d > 0 ? `${d}天 ${h}h ${m}m` : `${h}h ${m}m`;

    let nextStr = "暫無排程";
    if (cron.nextJobName && cron.nextRunAtMs) {
      const diffMin = Math.round((cron.nextRunAtMs - Date.now()) / 60000);
      nextStr = diffMin > 0 ? `${cron.nextJobName} <em>· ${diffMin}m 後</em>` : cron.nextJobName;
    }

    const feishuInfo = !feishu.tokenPresent
      ? { cls: "hv-err", txt: "❌ Token 未設置" }
      : feishu.tokenExpiredSoon
      ? { cls: "hv-warn", txt: `⚠️ 即將過期（${feishu.expiresInMinutes}m）` }
      : { cls: "hv-ok", txt: `✅ Token 有效 <em>· ${Math.floor(feishu.expiresInMinutes / 60)}h ${feishu.expiresInMinutes % 60}m</em>` };

    const now = ts ? new Date(ts) : new Date();
    const tsStr = `${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`;

    return `
<div class="health-card">
  <div class="health-header">
    <div class="health-title-group">
      <span class="health-title">系統健康</span>
      <span class="health-ts">更新 ${tsStr}</span>
    </div>
    <div class="health-refresh" id="hc-refresh-btn" title="刷新">↻</div>
  </div>
  <div class="health-agents">
    ${agents.map(a => `
      <div class="agent-chip ${a.status === "online" ? "online" : "offline"}">
        <div class="agent-dot"></div>
        <span class="agent-name">${a.name}</span>
        <span class="agent-id">${a.id}</span>
      </div>`).join("")}
  </div>
  <div class="health-rows">
    <div class="health-row">
      <span class="health-row-label">飛書日曆</span>
      <span class="health-row-value ${feishuInfo.cls}">${feishuInfo.txt}</span>
    </div>
    <div class="health-row">
      <span class="health-row-label">Cron</span>
      <span class="health-row-value hv-ok">✅ ${cron.activeJobs ?? 0} 活躍 <em>· ${cron.disabledJobs ?? 0} 停用</em></span>
    </div>
    <div class="health-row">
      <span class="health-row-label">下次執行</span>
      <span class="health-row-value">⏰ ${nextStr}</span>
    </div>
    <div class="health-row">
      <span class="health-row-label">運行時長</span>
      <span class="health-row-value">🟢 ${uptimeStr}</span>
    </div>
  </div>
</div>`;
  }

  async function renderHealthPanel() {
    const container = document.getElementById("health-panel");
    if (!container) return;
    let data = MOCK.health;
    if (cfg.mode === "live" && getAPI()) {
      try { data = await getAPI().getHealth(); } catch {}
    }
    container.innerHTML = buildHealthPanelHtml(data);
    const btn = document.getElementById("hc-refresh-btn");
    if (btn) {
      btn.addEventListener("click", async function () {
        btn.classList.add("spinning");
        await renderHealthPanel();
        btn.classList.remove("spinning");
      });
    }
  }

    async function renderDashboard() {
    // Get data (with live fallback to mock)
    let status = MOCK.status;
    let usage = MOCK.usage;
    let cron = MOCK.cron;

    if (cfg.mode === "live" && getAPI()) {
      try {
        status = await getAPI().getStatus();
      } catch (e) {
        console.warn("getStatus failed:", e);
      }
      try {
        usage = await getAPI().getUsageToday();
      } catch (e) {
        console.warn("getUsageToday failed:", e);
      }
      try {
        cron = await getAPI().getCronJobs();
      } catch (e) {
        console.warn("getCronJobs failed:", e);
      }
    }

    // Tokens card
    const totalTokens = (usage.total && usage.total.tokens) || 0;
    const tokensEl = document.getElementById("mv-tokens");
    if (tokensEl) {
      tokensEl.textContent =
        totalTokens >= 1000 ? `${(totalTokens / 1000).toFixed(1)}k` : String(totalTokens);
    }
    const cost = (usage.total && usage.total.cost) || 0;
    const subTokensEl = document.getElementById("ms-tokens");
    if (subTokensEl) {
      subTokensEl.textContent = `$${cost.toFixed(2)} 今日花費`;
    }

    // Agents card
    const agents = status.agents || [];
    const onlineCount = agents.filter(function (a) {
      return a.online;
    }).length;
    const agentsEl = document.getElementById("mv-agents");
    if (agentsEl) {
      agentsEl.textContent = `${onlineCount}/${agents.length}`;
    }
    const dotsEl = document.getElementById("ms-agents");
    if (dotsEl) {
      dotsEl.innerHTML = agents
        .map(function (a) {
          return `<span class="status-dot-sm ${a.online ? "" : "offline"}" title="${a.name}"></span>`;
        })
        .join("");
    }

    // Tasks card
    const tasks = MOCK.tasks;
    const highPriority = tasks.filter(function (t) {
      return t.priority === "HIGH" && t.status !== "done";
    });
    const tasksEl = document.getElementById("mv-tasks");
    if (tasksEl) {
      tasksEl.textContent = String(highPriority.length);
    }
    const doneCount = tasks.filter(function (t) {
      return t.status === "done";
    }).length;
    const subTasksEl = document.getElementById("ms-tasks");
    if (subTasksEl) {
      subTasksEl.textContent = `${Math.round((doneCount / tasks.length) * 100)}% 完成率`;
    }

    // Cron card
    const jobsArr = cron.jobs || [];
    const activeJobs = jobsArr.filter(function (j) {
      return j.enabled;
    }).length;
    const cronEl = document.getElementById("mv-cron");
    if (cronEl) {
      cronEl.textContent = String(activeJobs);
    }
    const nextJob = jobsArr
      .filter(function (j) {
        return j.state && j.state.nextRunAtMs;
      })
      .toSorted(function (a, b) {
        return a.state.nextRunAtMs - b.state.nextRunAtMs;
      })[0];
    const subCronEl = document.getElementById("ms-cron");
    if (subCronEl) {
      if (nextJob) {
        const diffMin = Math.round((nextJob.state.nextRunAtMs - Date.now()) / 60000);
        subCronEl.textContent = `下次 ${diffMin}分後`;
      } else {
        subCronEl.textContent = `${activeJobs} 活躍`;
      }
    }

    // Usage chart
    drawUsageChart();

    // Calendar
    void renderCalendarCards();

    // Task highlights
    renderTaskHighlights();

    // Kairo news / latest chat message
    const newsEl = document.getElementById("kairo-news");
    if (newsEl) {
      const lastMsg = MOCK.chatHistory[MOCK.chatHistory.length - 1];
      newsEl.textContent = (lastMsg && lastMsg.content) || "";
    }
  }

  // ─── SVG Bar Chart (canvas) ───────────────────────────────────────────────

  function drawUsageChart() {
    const canvas = document.getElementById("usage-chart");
    if (!canvas) {
      return;
    }
    const data = MOCK.usageHistory;
    const W = canvas.offsetWidth || 300;
    const H = 80;
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, W, H);

    const max = Math.max.apply(null, data) || 1;
    const barW = (W - (data.length - 1) * 6) / data.length;
    const days = ["一", "二", "三", "四", "五", "六", "日"];
    const today = new Date().getDay();

    data.forEach(function (val, i) {
      const x = i * (barW + 6);
      const barH = (val / max) * (H - 20);
      const y = H - barH - 16;
      const isToday = i === data.length - 1;

      // Gradient fill
      const grad = ctx.createLinearGradient(0, y, 0, H - 16);
      grad.addColorStop(0, isToday ? "rgba(245,158,11,0.9)" : "rgba(245,158,11,0.4)");
      grad.addColorStop(1, isToday ? "rgba(249,115,22,0.7)" : "rgba(245,158,11,0.1)");

      ctx.fillStyle = grad;
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(x, y, barW, barH, 3);
      } else {
        ctx.rect(x, y, barW, barH);
      }
      ctx.fill();

      // Day label
      ctx.fillStyle = isToday ? "#f59e0b" : "#71717a";
      ctx.font = `${isToday ? "600" : "400"} 9px Sora, sans-serif`;
      ctx.textAlign = "center";
      const dayIdx = (today - (data.length - 1 - i) + 7) % 7;
      ctx.fillText(days[dayIdx], x + barW / 2, H - 2);
    });
  }

  // ─── Calendar Cards ───────────────────────────────────────────────────────

  async function renderCalendarCards() {
    const container = document.getElementById("calendar-list");
    if (!container) {
      return;
    }

    let events;
    try {
      events = await fetchCalendarData();
    } catch {
      events = MOCK.calendarFull;
    }

    // Filter today's events
    const todayStr = new Date().toISOString().slice(0, 10);
    let todayEvents = events.filter(function (ev) {
      return ev.date === todayStr;
    });

    // Fallback to first 3 mock events if nothing for today
    if (todayEvents.length === 0 && cfg.mode !== "live") {
      todayEvents = MOCK.calendar.slice(0, 3).map(function (ev) {
        return { time: ev.time, summary: ev.title, type: ev.type, source: "mock", allDay: false };
      });
    }

    if (todayEvents.length === 0) {
      container.innerHTML = '<div class="empty-state" style="padding:1rem 0">今日無行程</div>';
      return;
    }

    const typeIcon = {
      meeting: "🤝",
      important: "⭐",
      study: "📚",
      health: "🏃",
      personal: "🧘",
      work: "💼",
    };

    container.innerHTML = todayEvents
      .slice(0, 3)
      .map(function (ev) {
        const icon = typeIcon[ev.type] || "📅";
        const timeStr = ev.allDay ? "全天" : ev.time || "";
        return `
        <div class="list-card">
          <div class="list-card-icon">${icon}</div>
          <div class="list-card-body">
            <div class="list-card-title">${escapeHtml(ev.summary || ev.title || "")}</div>
            <div class="list-card-sub">${escapeHtml(timeStr)}</div>
          </div>
        </div>
      `;
      })
      .join("");
  }

  // ─── Calendar Helpers ─────────────────────────────────────────────────────

  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function inferEventType(summary) {
    var s = (summary || "").toLowerCase();
    if (/會議|meeting|standup|討論|評審|合同|簽署|電話|call/.test(s)) {
      return "meeting";
    }
    if (/投資|investor|series|融資|ipo|重要|urgent/.test(s)) {
      return "important";
    }
    if (/課程|學習|複習|英語|日語|日文|語言|閱讀|讀書|study|learn/.test(s)) {
      return "study";
    }
    if (/健身|跑步|運動|健康|gym|hiit|瑜伽|yoga|訓練|體檢|medical/.test(s)) {
      return "health";
    }
    return "personal";
  }

  function parseCalendarMarkdown(content) {
    var lines = content.split("\n");
    var events = [];
    var headerFound = false;
    var colMap = {};

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].trim();
      if (!line.startsWith("|")) {
        continue;
      }

      var cells = line
        .split("|")
        .map(function (c) {
          return c.trim();
        })
        .slice(1, -1); // remove empty first and last

      // Skip separator lines (contains ---)
      if (
        cells.every(function (c) {
          return /^[-:]+$/.test(c);
        })
      ) {
        continue;
      }

      if (!headerFound) {
        cells.forEach(function (c, idx) {
          colMap[c.toLowerCase()] = idx;
        });
        headerFound = true;
        continue;
      }

      var get = function (name) {
        var idx = colMap[name];
        return idx !== undefined ? cells[idx] || "" : "";
      };

      var date = get("date") || get("日期");
      var time = get("time") || get("時間");
      var summary = get("summary") || get("標題") || get("title") || get("event");
      var location = get("location") || get("地點");
      var attendees = get("attendees") || get("參與者");

      if (!date || !summary) {
        continue;
      }

      var allDay = time === "全天" || time === "-" || time === "" || time === "all day";

      events.push({
        date: date,
        time: allDay ? "全天" : time,
        summary: summary,
        location: location,
        attendees: attendees,
        type: inferEventType(summary),
        source: "feishu",
        allDay: allDay,
      });
    }

    events.sort(function (a, b) {
      if (a.date < b.date) {
        return -1;
      }
      if (a.date > b.date) {
        return 1;
      }
      if (a.allDay && !b.allDay) {
        return -1;
      }
      if (!a.allDay && b.allDay) {
        return 1;
      }
      return a.time < b.time ? -1 : a.time > b.time ? 1 : 0;
    });

    return events;
  }

  function getLocalCalendarEvents() {
    try {
      return JSON.parse(localStorage.getItem("kw_calendar_events") || "[]");
    } catch {
      return [];
    }
  }

  function addLocalCalendarEvent(ev) {
    var events = getLocalCalendarEvents();
    var item = {
      id: Date.now(),
      date: ev.date,
      time: ev.time || "全天",
      summary: ev.summary,
      location: "",
      attendees: "",
      type: inferEventType(ev.summary),
      source: "local",
      allDay: !ev.time || ev.time === "全天",
    };
    events.push(item);
    try {
      localStorage.setItem("kw_calendar_events", JSON.stringify(events.slice(-100)));
    } catch {}
    return item;
  }

  function getProjects() {
    try {
      var stored = localStorage.getItem("kw_projects");
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {}
    // Seed with mock data
    var seed = MOCK.projects.map(function (p) {
      return JSON.parse(JSON.stringify(p));
    });
    try {
      localStorage.setItem("kw_projects", JSON.stringify(seed));
    } catch {}
    return seed;
  }

  function saveProjects(projects) {
    try {
      localStorage.setItem("kw_projects", JSON.stringify(projects));
    } catch {}
  }

  function getUrgencyClass(daysLeft) {
    if (daysLeft < 0) {
      return "urgency-overdue";
    }
    if (daysLeft < 14) {
      return "urgency-critical";
    }
    if (daysLeft < 30) {
      return "urgency-sprint";
    }
    if (daysLeft < 60) {
      return "urgency-preparing";
    }
    return "urgency-runway";
  }

  var calendarCache = null;
  var calendarCacheTs = 0;
  var CAL_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  async function fetchCalendarData() {
    var localEvents = getLocalCalendarEvents();
    var remoteEvents = [];

    if (cfg.mode === "live" && getAPI()) {
      var now = Date.now();
      if (calendarCache && now - calendarCacheTs < CAL_CACHE_TTL) {
        remoteEvents = calendarCache;
      } else {
        try {
          var result = await getAPI().getWorkspaceFile(
            "automation/assistant_hub/02_work/calendar.md",
          );
          var content = (result && result.content) || "";
          if (content) {
            remoteEvents = parseCalendarMarkdown(content);
            calendarCache = remoteEvents;
            calendarCacheTs = now;
          }
        } catch (e) {
          console.warn("fetchCalendarData failed:", e);
        }
      }
    } else {
      remoteEvents = MOCK.calendarFull;
    }

    var all = remoteEvents.concat(localEvents);
    all.sort(function (a, b) {
      if (a.date < b.date) {
        return -1;
      }
      if (a.date > b.date) {
        return 1;
      }
      if (a.allDay && !b.allDay) {
        return -1;
      }
      if (!a.allDay && b.allDay) {
        return 1;
      }
      return a.time < b.time ? -1 : a.time > b.time ? 1 : 0;
    });

    return all;
  }

  // ─── Calendar Page Renderer ───────────────────────────────────────────────

  var calendarViewMode = "grid"; // "grid" | "tasks"
  var calendarNavYear = new Date().getFullYear();
  var calendarNavMonth = new Date().getMonth(); // 0-based
  var calendarSelectedDate = null; // "YYYY-MM-DD"

  async function renderCalendar() {
    var todayEl = document.getElementById("cal-today-date");
    if (todayEl) {
      var now = new Date();
      todayEl.textContent = now.toLocaleDateString("zh-TW", {
        month: "long",
        day: "numeric",
        weekday: "short",
      });
    }
    var addDateEl = document.getElementById("cal-add-date");
    if (addDateEl && !addDateEl.value) {
      addDateEl.value = new Date().toISOString().slice(0, 10);
    }

    if (calendarViewMode === "tasks") {
      var strip = document.getElementById("cal-add-strip");
      if (strip) {
        strip.style.display = "none";
      }
      renderTaskDrivenView();
      return;
    }

    // grid mode (also catch legacy "timeline" value)
    calendarViewMode = "grid";
    var strip2 = document.getElementById("cal-add-strip");
    if (strip2) {
      strip2.style.display = "";
    }
    var events = await fetchCalendarData();
    renderCalendarGridView(events);
  }

  function renderCalendarGridView(events) {
    var content = document.getElementById("cal-content");
    if (!content) {
      return;
    }

    var now = new Date();
    var todayStr = now.toISOString().slice(0, 10);
    var year = calendarNavYear;
    var month = calendarNavMonth; // 0-based

    // Find next upcoming event for the banner
    var upcoming = events
      .filter(function (e) {
        var dt = new Date(e.date + (e.time && e.time !== "全天" ? "T" + e.time : "T23:59"));
        return dt >= now;
      })
      .toSorted(function (a, b) {
        return new Date(a.date) - new Date(b.date);
      })[0];

    var nextBannerHtml = "";
    if (upcoming) {
      var upTimeLabel =
        upcoming.time === "全天" ? upcoming.date : upcoming.date + " " + upcoming.time;
      nextBannerHtml =
        '<div class="cal-next-banner">' +
        '<span class="cal-next-banner-label">NEXT</span>' +
        '<span class="cal-next-banner-title">' +
        escapeHtml(upcoming.summary) +
        "</span>" +
        '<span class="cal-next-banner-time">' +
        escapeHtml(upTimeLabel) +
        "</span>" +
        "</div>";
    }

    // Build event map by date
    var eventMap = {};
    events.forEach(function (ev) {
      if (!eventMap[ev.date]) {
        eventMap[ev.date] = [];
      }
      eventMap[ev.date].push(ev);
    });

    var monthNames = [
      "一月",
      "二月",
      "三月",
      "四月",
      "五月",
      "六月",
      "七月",
      "八月",
      "九月",
      "十月",
      "十一月",
      "十二月",
    ];

    var firstDay = new Date(year, month, 1).getDay();
    var firstDayMon = firstDay === 0 ? 6 : firstDay - 1;
    var daysInMonth = new Date(year, month + 1, 0).getDate();
    var daysInPrevMonth = new Date(year, month, 0).getDate();

    var cells = [];
    for (var i = 0; i < firstDayMon; i++) {
      cells.push({ day: daysInPrevMonth - firstDayMon + 1 + i, outMonth: true, dateStr: null });
    }
    for (var d = 1; d <= daysInMonth; d++) {
      var ds = year + "-" + String(month + 1).padStart(2, "0") + "-" + String(d).padStart(2, "0");
      cells.push({ day: d, outMonth: false, dateStr: ds });
    }
    var rem = (7 - (cells.length % 7)) % 7;
    for (var j = 1; j <= rem; j++) {
      cells.push({ day: j, outMonth: true, dateStr: null });
    }

    var dowHtml = ["一", "二", "三", "四", "五", "六", "日"]
      .map(function (d) {
        return `<div class="cal-grid-dow">${d}</div>`;
      })
      .join("");

    var cellsHtml = cells
      .map(function (cell) {
        var cls = ["cal-cell"];
        if (cell.outMonth) {
          cls.push("out-month");
        }
        if (cell.dateStr === todayStr) {
          cls.push("today");
        }
        if (cell.dateStr && cell.dateStr === calendarSelectedDate) {
          cls.push("selected");
        }

        var dots = "";
        if (cell.dateStr && eventMap[cell.dateStr]) {
          var evs = eventMap[cell.dateStr].slice(0, 3);
          dots = evs
            .map(function (ev) {
              return `<span class="cal-dot-sm ${escapeHtml(ev.type || "personal")}"></span>`;
            })
            .join("");
        }

        var da = cell.dateStr ? `data-date="${cell.dateStr}"` : "";
        return `<div class="${cls.join(" ")}" ${da}><div class="cal-cell-num">${cell.day}</div><div class="cal-cell-dots">${dots}</div></div>`;
      })
      .join("");

    // Day panel
    var dayPanelHtml = "";
    if (calendarSelectedDate) {
      var selObj = new Date(calendarSelectedDate + "T12:00:00");
      var selLabel = selObj.toLocaleDateString("zh-TW", {
        month: "long",
        day: "numeric",
        weekday: "long",
      });
      var selEvs = eventMap[calendarSelectedDate] || [];
      var evRowsHtml = selEvs.length
        ? selEvs
            .map(function (ev) {
              var type = inferEventType(ev.summary);
              var timeLabel = ev.allDay ? "全天" : ev.time || "";
              var loc = ev.location && ev.location !== "-" ? ev.location : "";
              return (
                '<div class="cal-day-event-item">' +
                '<span class="cal-day-event-time">' +
                escapeHtml(timeLabel) +
                "</span>" +
                '<div class="cal-day-event-bar type-' +
                escapeHtml(type) +
                '"></div>' +
                '<div class="cal-day-event-body">' +
                '<div class="cal-day-event-title">' +
                escapeHtml(ev.summary) +
                "</div>" +
                (loc ? '<div class="cal-day-event-meta">📍 ' + escapeHtml(loc) + "</div>" : "") +
                "</div>" +
                "</div>"
              );
            })
            .join("")
        : '<div style="font-size:0.8rem;color:var(--lp-muted);padding:0.25rem 0">無行程</div>';
      dayPanelHtml =
        '<div id="cal-day-panel"><div class="cal-day-panel-header">' +
        escapeHtml(selLabel) +
        "</div>" +
        evRowsHtml +
        "</div>";
    }

    content.innerHTML =
      '<div id="cal-grid-view">' +
      nextBannerHtml +
      '<div class="cal-month-nav">' +
      '<button class="cal-month-nav-btn" id="cal-prev-month" aria-label="上月">‹</button>' +
      '<div class="cal-month-title">' +
      '<span class="cal-month-name">' +
      monthNames[month] +
      "</span>" +
      '<span class="cal-month-year">' +
      year +
      "</span>" +
      "</div>" +
      '<button class="cal-month-nav-btn" id="cal-next-month" aria-label="下月">›</button>' +
      "</div>" +
      '<div class="cal-grid-wrap">' +
      '<div class="cal-grid">' +
      dowHtml +
      cellsHtml +
      "</div>" +
      dayPanelHtml +
      "</div>" +
      "</div>";

    document.getElementById("cal-prev-month")?.addEventListener("click", function () {
      calendarNavMonth--;
      if (calendarNavMonth < 0) {
        calendarNavMonth = 11;
        calendarNavYear--;
      }
      void renderCalendar();
    });
    document.getElementById("cal-next-month")?.addEventListener("click", function () {
      calendarNavMonth++;
      if (calendarNavMonth > 11) {
        calendarNavMonth = 0;
        calendarNavYear++;
      }
      void renderCalendar();
    });

    content.querySelectorAll(".cal-cell[data-date]").forEach(function (cell) {
      cell.addEventListener("click", function () {
        var date = cell.dataset.date;
        calendarSelectedDate = calendarSelectedDate === date ? null : date;
        renderCalendarGridView(events);
      });
    });
  }

  // ─── Task-Driven View ─────────────────────────────────────────────────────

  function renderTaskDrivenView() {
    var content = document.getElementById("cal-content");
    if (!content) {
      return;
    }

    var projects = getProjects();
    var now = new Date();
    var showAddForm = false;

    function renderProjects() {
      var sorted = projects.slice().toSorted(function (a, b) {
        if (!a.deadline) {
          return 1;
        }
        if (!b.deadline) {
          return -1;
        }
        return a.deadline < b.deadline ? -1 : 1;
      });

      var urgentCount = sorted.filter(function (p) {
        if (!p.deadline) {
          return false;
        }
        var d = Math.round((new Date(p.deadline + "T12:00:00") - now) / 86400000);
        return d <= 14;
      }).length;
      var activeCount = sorted.filter(function (p) {
        return p.subtasks.some(function (s) {
          return !s.done;
        });
      }).length;

      var statsHtml =
        `<div class="project-stats-bar">` +
        `<span class="proj-stat-chip">${projects.length} 個主線任務</span>` +
        (urgentCount > 0
          ? `<span class="proj-stat-chip urgent">⚡ ${urgentCount} 個緊急</span>`
          : "") +
        (activeCount > 0
          ? `<span class="proj-stat-chip on-track">${activeCount} 個進行中</span>`
          : "") +
        `</div>`;

      var formHtml = showAddForm
        ? `<div class="add-project-form" id="add-project-form">
          <input type="text" id="apf-title" placeholder="主線任務名稱（如：申請國自然基金）" maxlength="60" />
          <div class="apf-row">
            <input type="date" id="apf-deadline" placeholder="截止日期" />
            <input type="text" id="apf-notes" placeholder="備注（可選）" maxlength="80" />
          </div>
          <div class="apf-actions">
            <button class="apf-save" id="apf-save">＋ 創建</button>
            <button class="apf-cancel" id="apf-cancel">取消</button>
          </div>
        </div>`
        : "";

      var cardsHtml = sorted
        .map(function (proj, idx) {
          var doneCount = proj.subtasks.filter(function (s) {
            return s.done;
          }).length;
          var totalCount = proj.subtasks.length;
          var pct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;
          var daysLeft = proj.deadline
            ? Math.round((new Date(proj.deadline + "T12:00:00") - now) / 86400000)
            : null;
          var urgency = daysLeft === null ? "urgency-runway" : getUrgencyClass(daysLeft);

          var ddlText =
            daysLeft === null
              ? "無截止"
              : daysLeft < 0
                ? `逾期 ${-daysLeft} 天`
                : daysLeft === 0
                  ? "今天截止"
                  : daysLeft === 1
                    ? "明天截止"
                    : daysLeft < 7
                      ? `${daysLeft} 天後`
                      : daysLeft < 30
                        ? `${Math.floor(daysLeft / 7)} 週後`
                        : `${Math.ceil(daysLeft / 30)} 月後 · ${proj.deadline.slice(5)}`;

          var SHOW = 5;
          var nextUpIdx = proj.subtasks.findIndex(function (s) {
            return !s.done;
          });
          var visibleSubs = proj.subtasks.slice(0, SHOW);
          var hiddenCount = Math.max(0, proj.subtasks.length - SHOW);

          var subsHtml = visibleSubs
            .map(function (sub, si) {
              var isNext = si === nextUpIdx && !sub.done;
              return (
                `<li class="subtask-row${sub.done ? " is-done" : ""}${isNext ? " is-next" : ""}" ` +
                `data-proj="${escapeHtml(proj.id)}" data-sub="${escapeHtml(sub.id)}">` +
                `<div class="subtask-box"></div>` +
                `<span class="subtask-text">${escapeHtml(sub.title)}</span>` +
                (isNext ? `<span class="subtask-next-arrow">◀</span>` : "") +
                `</li>`
              );
            })
            .join("");

          var moreHtml =
            hiddenCount > 0
              ? `<button class="subtask-expand-btn" data-proj="${escapeHtml(proj.id)}" data-action="expand">` +
                `··· 還有 ${hiddenCount} 項未顯示</button>`
              : "";

          var delay = Math.min(idx * 0.07, 0.56);

          return (
            `<div class="project-mission-card ${urgency} fade-in" ` +
            `style="animation-delay:${delay}s" data-proj="${escapeHtml(proj.id)}">` +
            `<div class="proj-urgency-strip"></div>` +
            `<div class="proj-card-body">` +
            `<div class="proj-header">` +
            `<div class="proj-title">${escapeHtml(proj.title)}</div>` +
            `<span class="proj-ddl-badge">${escapeHtml(ddlText)}</span>` +
            `</div>` +
            `<div class="proj-progress-row">` +
            `<div class="proj-progress-track"><div class="proj-progress-fill" style="width:${pct}%"></div></div>` +
            `<span class="proj-progress-label">${pct}% · ${doneCount}/${totalCount}</span>` +
            `</div>` +
            `<ul class="subtask-list">${subsHtml}</ul>` +
            moreHtml +
            `<div class="subtask-add-row">` +
            `<input class="subtask-add-input" type="text" placeholder="+ 新增子任務…" maxlength="80" data-proj="${escapeHtml(proj.id)}" />` +
            `<button class="subtask-add-confirm" data-proj="${escapeHtml(proj.id)}" data-action="add-sub">+</button>` +
            `</div>` +
            `</div>` +
            `</div>`
          );
        })
        .join("");

      content.innerHTML =
        `<div id="cal-task-view">` +
        statsHtml +
        formHtml +
        cardsHtml +
        `<button class="add-project-btn" id="show-add-proj">＋ 新增主線任務</button>` +
        `</div>`;

      // ── event delegation ──────────────────────────────────────────

      // Toggle subtask done
      content.querySelectorAll(".subtask-row").forEach(function (row) {
        row.addEventListener("click", function () {
          var pId = row.dataset.proj;
          var sId = row.dataset.sub;
          var p = projects.find(function (x) {
            return x.id === pId;
          });
          if (!p) {
            return;
          }
          var s = p.subtasks.find(function (x) {
            return x.id === sId;
          });
          if (!s) {
            return;
          }
          s.done = !s.done;
          saveProjects(projects);
          renderProjects();
        });
      });

      // Add subtask confirm button
      content.querySelectorAll("[data-action='add-sub']").forEach(function (btn) {
        btn.addEventListener("click", function () {
          var pId = btn.dataset.proj;
          var inp = content.querySelector(`.subtask-add-input[data-proj="${pId}"]`);
          var title = inp ? inp.value.trim() : "";
          if (!title) {
            if (inp) {
              inp.focus();
            }
            return;
          }
          var p = projects.find(function (x) {
            return x.id === pId;
          });
          if (!p) {
            return;
          }
          p.subtasks.push({ id: "s" + Date.now(), title: title, done: false });
          saveProjects(projects);
          renderProjects();
        });
      });

      // Add subtask Enter key
      content.querySelectorAll(".subtask-add-input").forEach(function (inp) {
        inp.addEventListener("keydown", function (e) {
          if (e.key !== "Enter") {
            return;
          }
          var btn = content.querySelector(
            `[data-action="add-sub"][data-proj="${inp.dataset.proj}"]`,
          );
          if (btn) {
            btn.click();
          }
        });
      });

      // Expand hidden subtasks
      content.querySelectorAll("[data-action='expand']").forEach(function (btn) {
        btn.addEventListener("click", function () {
          var pId = btn.dataset.proj;
          var p = projects.find(function (x) {
            return x.id === pId;
          });
          if (!p) {
            return;
          }
          var nextUp = p.subtasks.findIndex(function (s) {
            return !s.done;
          });
          var card = content.querySelector(`.project-mission-card[data-proj="${pId}"]`);
          if (!card) {
            return;
          }
          var ul = card.querySelector(".subtask-list");
          if (!ul) {
            return;
          }
          ul.innerHTML = p.subtasks
            .map(function (sub, si) {
              var isNext = si === nextUp && !sub.done;
              return (
                `<li class="subtask-row${sub.done ? " is-done" : ""}${isNext ? " is-next" : ""}" ` +
                `data-proj="${escapeHtml(pId)}" data-sub="${escapeHtml(sub.id)}">` +
                `<div class="subtask-box"></div>` +
                `<span class="subtask-text">${escapeHtml(sub.title)}</span>` +
                (isNext ? `<span class="subtask-next-arrow">◀</span>` : "") +
                `</li>`
              );
            })
            .join("");
          btn.remove();
          ul.querySelectorAll(".subtask-row").forEach(function (row) {
            row.addEventListener("click", function () {
              var sId = row.dataset.sub;
              var s = p.subtasks.find(function (x) {
                return x.id === sId;
              });
              if (!s) {
                return;
              }
              s.done = !s.done;
              saveProjects(projects);
              renderProjects();
            });
          });
        });
      });

      // Show add-project form
      var showBtn = document.getElementById("show-add-proj");
      if (showBtn) {
        showBtn.addEventListener("click", function () {
          showAddForm = true;
          renderProjects();
          var t = document.getElementById("apf-title");
          if (t) {
            t.focus();
          }
        });
      }

      // Save new project
      var saveBtn = document.getElementById("apf-save");
      if (saveBtn) {
        saveBtn.addEventListener("click", function () {
          var t = document.getElementById("apf-title");
          var d = document.getElementById("apf-deadline");
          var n = document.getElementById("apf-notes");
          var title = t ? t.value.trim() : "";
          if (!title) {
            if (t) {
              t.focus();
            }
            return;
          }
          projects.push({
            id: "proj-" + Date.now(),
            title: title,
            deadline: d ? d.value : "",
            priority: "HIGH",
            agent: "main",
            notes: n ? n.value.trim() : "",
            subtasks: [],
          });
          saveProjects(projects);
          showAddForm = false;
          renderProjects();
        });
      }

      // Cancel add form
      var cancelBtn = document.getElementById("apf-cancel");
      if (cancelBtn) {
        cancelBtn.addEventListener("click", function () {
          showAddForm = false;
          renderProjects();
        });
      }
    }

    renderProjects();
  }

  // ─── Task Highlights (Dashboard) ──────────────────────────────────────────

  function renderTaskHighlights() {
    const container = document.getElementById("task-highlights");
    if (!container) {
      return;
    }
    const high = MOCK.tasks
      .filter(function (t) {
        return t.priority === "HIGH" && t.status !== "done";
      })
      .slice(0, 3);

    container.innerHTML = high
      .map(function (task) {
        return `
        <div class="list-card">
          <div class="list-card-icon">🔴</div>
          <div class="list-card-body">
            <div class="list-card-title">${task.title}</div>
            <div class="list-card-sub">${task.due ? "截止 " + task.due : "無截止日期"} · ${task.agent}</div>
          </div>
          <span class="list-card-badge badge-high">HIGH</span>
        </div>
      `;
      })
      .join("");
  }

  // ─── Full Tasks Page ──────────────────────────────────────────────────────

  let taskFilter = "all";

  function renderTasks() {
    let tasks = MOCK.tasks;

    if (taskFilter === "high") {
      tasks = tasks.filter(function (t) {
        return t.priority === "HIGH";
      });
    } else if (taskFilter === "active") {
      tasks = tasks.filter(function (t) {
        return t.status === "active";
      });
    } else if (taskFilter === "done") {
      tasks = tasks.filter(function (t) {
        return t.status === "done";
      });
    }

    const priorityBadgeClass = { HIGH: "badge-high", MED: "badge-med", LOW: "badge-low" };
    const statusIcon = { pending: "⏳", active: "🔄", done: "✅" };

    const container = document.getElementById("tasks-list");
    if (!container) {
      return;
    }

    if (tasks.length === 0) {
      container.innerHTML = '<div class="empty-state">暫無任務</div>';
      return;
    }

    container.innerHTML = tasks
      .map(function (task) {
        const icon = statusIcon[task.status] || "📋";
        const badgeClass = priorityBadgeClass[task.priority] || "badge-low";
        const strikeClass = task.status === "done" ? "done-strike" : "";
        const dueTxt = task.due ? "截止 " + task.due : "無截止";
        return `
        <div class="list-card">
          <div class="list-card-icon">${icon}</div>
          <div class="list-card-body">
            <div class="list-card-title ${strikeClass}">${task.title}</div>
            <div class="list-card-sub">${dueTxt} · @${task.agent}</div>
          </div>
          <span class="list-card-badge ${badgeClass}">${task.priority}</span>
        </div>
      `;
      })
      .join("");
  }

  // ─── Capture Page ─────────────────────────────────────────────────────────

  let selectedTags = [];

  function renderCaptureHistory() {
    const history = JSON.parse(localStorage.getItem("kw_captures") || "[]");
    const container = document.getElementById("capture-history");
    if (!container) {
      return;
    }

    if (history.length === 0) {
      container.innerHTML = '<div class="empty-state">還沒有捕捉記錄</div>';
      return;
    }

    container.innerHTML = history
      .slice(-10)
      .toReversed()
      .map(function (item) {
        const preview = item.text.length > 60 ? item.text.slice(0, 60) + "…" : item.text;
        const tagStr = item.tags && item.tags.length ? " · " + item.tags.join(", ") : "";
        return `
        <div class="list-card">
          <div class="list-card-icon">📝</div>
          <div class="list-card-body">
            <div class="list-card-title">${preview}</div>
            <div class="list-card-sub">${new Date(item.ts).toLocaleString("zh-CN")}${tagStr}</div>
          </div>
        </div>
      `;
      })
      .join("");
  }

  async function submitCapture(text) {
    const tags = selectedTags.slice();
    const item = { text: text, tags: tags, ts: Date.now() };

    // Save to localStorage
    const history = JSON.parse(localStorage.getItem("kw_captures") || "[]");
    history.push(item);
    localStorage.setItem("kw_captures", JSON.stringify(history.slice(-50)));

    if (cfg.mode === "live" && getAPI()) {
      try {
        await getAPI().sendCapture(text, tags);
      } catch (e) {
        console.warn("Capture API failed:", e);
      }
    }

    renderCaptureHistory();
  }

  // ─── Setup Wizard ─────────────────────────────────────────────────────────

  const SETUP_STEPS = [
    { id: "pin",      title: "驗證",    icon: "🔑" },
    { id: "welcome",  title: "歡迎",    icon: "🌟" },
    { id: "channel",  title: "通訊頻道", icon: "💬" },
    { id: "llm",      title: "AI 大腦",  icon: "🧠" },
    { id: "optional", title: "進階選項", icon: "⚙️" },
    { id: "review",   title: "啟動",    icon: "🚀" },
  ];

  var setupState = {
    step: 0,
    data: { telegram: {}, llm: { provider: "dashscope" }, gateway: {}, feishu: {}, github: {} },
    validation: {},
    directionBack: false,
    mode: "quick",
    serverStatus: "unknown",
  };

  var setupValidationTimers = {};

  function checkServerConnectivity(onSuccess, onFail) {
    var baseUrl = cfg.serverUrl || "";
    if (!baseUrl) { onFail("未設定服務器 URL"); return; }

    // Detect Mixed Content: HTTPS page -> HTTP server
    if (location.protocol === "https:" && baseUrl.startsWith("http:")) {
      onFail("__mixed_content__");
      return;
    }

    var ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
    var timer = ctrl ? setTimeout(function() { ctrl.abort(); }, 6000) : null;
    fetch(baseUrl + "/api/health", ctrl ? { signal: ctrl.signal } : {})
      .then(function(r) { clearTimeout(timer); return r.ok ? r.json() : Promise.reject(r.status); })
      .then(function() { onSuccess(); })
      .catch(function(err) {
        clearTimeout(timer);
        onFail(String(err));
      });
  }

  function setupCheckServer() {
    setupState.serverStatus = "unknown";
    checkServerConnectivity(
      function() {
        setupState.serverStatus = "ok";
        renderSetupWizard();
      },
      function(err) {
        setupState.serverStatus = err === "__mixed_content__" ? "mixed_content" : "unreachable";
        renderSetupWizard();
      }
    );
  }
  window.setupCheckServer = function() { setupCheckServer(); };

  function renderSetupWizard() {
    var container = document.getElementById("page-setup");
    if (!container) return;

    var html = '<div style="padding-top:env(safe-area-inset-top,0.5rem)">';
    // Stepper
    html += '<div class="sw-stepper">';
    SETUP_STEPS.forEach(function(step, i) {
      var cls = i < setupState.step ? "sw-stepper__step sw-stepper__step--completed"
              : i === setupState.step ? "sw-stepper__step sw-stepper__step--active"
              : "sw-stepper__step";
      html += '<div class="' + cls + '">';
      html += '<div class="sw-stepper__step-circle">';
      html += i < setupState.step ? "✓" : (i + 1);
      html += '</div>';
      html += '<div class="sw-stepper__step-label">' + step.title + '</div>';
      html += '</div>';
      if (i < SETUP_STEPS.length - 1) {
        html += '<div class="sw-stepper__connector' + (i < setupState.step ? ' sw-stepper__connector--done' : '') + '"></div>';
      }
    });
    html += '</div>';

    // Panel
    html += '<div id="sw-panel-container">';
    html += buildSetupStepHtml(setupState.step);
    html += '</div>';
    html += '</div>';

    container.innerHTML = html;
    attachSetupListeners();
  }

  function buildSetupStepHtml(step) {
    switch (step) {
      case 0: return buildPinStep();
      case 1: return buildWelcomeStep();
      case 2: return buildChannelStep();
      case 3: return buildLLMStep();
      case 4: return buildOptionalStep();
      case 5: return buildReviewStep();
      default: return "";
    }
  }

  function buildPinStep() {
    // Kick off server connectivity check if not yet done
    if (setupState.serverStatus === "unknown") {
      setTimeout(function() { setupCheckServer(); }, 0);
    }

    var pinValidation = setupState.validation["setup-pin"] || {};
    function statusIcon(v) {
      if (!v.state) return "";
      if (v.state === "checking") return '<span class="sw-spinning">⟳</span>';
      if (v.state === "valid") return '<span class="sw-check-pop">✅</span>';
      if (v.state === "error") return '❌';
      return "";
    }
    function inputCls(v) {
      if (v.state === "valid") return "sw-token-input sw-token-input--valid";
      if (v.state === "error") return "sw-token-input sw-token-input--error";
      return "sw-token-input";
    }

    var serverBanner = "";
    if (setupState.serverStatus === "unreachable") {
      serverBanner = '<div class="sw-alert sw-alert--error" style="margin-bottom:1rem">' +
        '❌ 無法連接服務器（' + (cfg.serverUrl || "未設定") + '）<br>' +
        '<button onclick="setupCheckServer()" style="margin-top:0.4rem;padding:0.2rem 0.8rem;cursor:pointer">重試</button>' +
        '</div>';
    } else if (setupState.serverStatus === "mixed_content") {
      // Prefer LAN IP for local access when behind NAT
      var localBase = cfg.lanUrl || (cfg.serverUrl || "").replace(/^https?:\/\//, "http://");
      var localUrl = localBase.replace(/^https:/, "http:") + "/app/#setup";
      serverBanner = '<div class="sw-alert sw-alert--warn" style="margin-bottom:1rem">' +
        '⚠️ 瀏覽器安全限制：HTTPS 頁面無法直接連接 HTTP 服務器。<br>' +
        '請使用本地地址訪問設定向導：<br>' +
        '<a href="' + localUrl + '" style="color:var(--lp-primary);word-break:break-all">' + localUrl + '</a>' +
        '</div>';
    }

    return '<div class="sw-panel active">' +
      serverBanner +
      '<div class="sw-step-hero">' +
        '<span class="sw-step-hero__icon">🔑</span>' +
        '<div class="sw-step-hero__title">輸入設定 PIN 碼</div>' +
        '<div class="sw-step-hero__sub">安裝時終端顯示的 6 位 PIN 碼</div>' +
      '</div>' +
      '<div class="' + inputCls(pinValidation) + '">' +
        '<label class="sw-token-input__label">PIN 碼（大寫字母 + 數字）</label>' +
        '<input type="text" id="sw-pin-input" placeholder="A1B2C3" maxlength="6" ' +
          'style="text-transform:uppercase;letter-spacing:0.2em;font-size:1.2rem;text-align:center" ' +
          'value="' + (setupState.data.pin || "") + '" autocomplete="off" />' +
        '<span class="sw-token-input__status">' + statusIcon(pinValidation) + '</span>' +
        '<div class="sw-token-input__detail">' + (pinValidation.detail || pinValidation.error || "") + '</div>' +
      '</div>' +
      '<div style="font-size:0.78rem;color:var(--lp-muted);text-align:center;margin-top:0.5rem;">' +
        '找不到 PIN？在服務器上運行：<code style="background:var(--lp-bg-card);padding:0.1rem 0.3rem;border-radius:0.2rem;">cat ~/.openclaw/setup.pin</code>' +
      '</div>' +
      (function() {
        var pinMissing = setupState.validation["setup-pin"] && setupState.validation["setup-pin"].pinMissing;
        return pinMissing ? (
          '<div style="margin-top:0.5rem;background:var(--lp-bg-card);border-radius:0.4rem;padding:0.6rem;font-size:0.75rem">' +
          '<div style="color:var(--lp-warn);margin-bottom:0.3rem">⚠️ PIN 不存在，需重新生成：</div>' +
          '<code style="display:block;font-family:monospace;font-size:0.72rem;color:var(--lp-primary);white-space:pre-wrap">newpin=$(LC_ALL=C tr -dc A-Z0-9 &lt;/dev/urandom | head -c6); echo $newpin &gt; ~/.openclaw/setup.pin; echo $(($(date +%s)+3600)) &gt; ~/.openclaw/setup.pin.expiry; echo PIN: $newpin</code>' +
          '<div style="margin-top:0.3rem;color:var(--lp-muted)">或 AI 助理可呼叫：POST /api/setup/generate-pin（本機限定）</div>' +
          '</div>'
        ) : '';
      })() +
      '<div class="sw-nav-bar" style="justify-content:flex-end">' +
        '<button class="sw-btn sw-btn--primary" id="sw-next" ' +
          (pinValidation.state === "valid" ? "" : "disabled") + '>確認 →</button>' +
      '</div>' +
    '</div>';
  }

  function buildWelcomeStep() {
    return '<div class="sw-panel active">' +
      '<div class="sw-step-hero">' +
        '<span class="sw-step-hero__icon">🌟</span>' +
        '<div class="sw-step-hero__title">歡迎使用 Kairo</div>' +
        '<div class="sw-step-hero__sub">AI 個人秘書系統 · 5 步完成設定</div>' +
      '</div>' +
      '<div class="sw-mode-grid">' +
        '<div class="sw-mode-card sw-mode-card--primary" id="sw-quick-start">' +
          '<span class="sw-mode-card__icon">⚡</span>' +
          '<div class="sw-mode-card__title">快速設定</div>' +
          '<div class="sw-mode-card__sub">Telegram + AI，5 分鐘完成</div>' +
          '<div class="sw-mode-card__badge">推薦</div>' +
        '</div>' +
        '<div class="sw-mode-card" id="sw-advanced-start">' +
          '<span class="sw-mode-card__icon">🔧</span>' +
          '<div class="sw-mode-card__title">進階設定</div>' +
          '<div class="sw-mode-card__sub">包含 Feishu、GitHub 等整合</div>' +
        '</div>' +
      '</div>' +
      '<div class="sw-nav-bar">' +
        '<button class="sw-btn sw-btn--ghost" id="sw-exit">離開</button>' +
        '<button class="sw-btn sw-btn--primary" id="sw-next">開始設定 →</button>' +
      '</div>' +
    '</div>';
  }

  function buildChannelStep() {
    var tg = setupState.data.telegram;
    var tokenVal = tg.botToken || "";
    var userIdVal = tg.userId || "";
    var tokenValidation = setupState.validation["telegram-token"] || {};
    var userIdValidation = setupState.validation["telegram-user-id"] || {};

    function statusIcon(v) {
      if (!v.state) return "";
      if (v.state === "checking") return '<span class="sw-spinning">⟳</span>';
      if (v.state === "valid") return '<span class="sw-check-pop">✅</span>';
      if (v.state === "error") return '❌';
      return "";
    }
    function inputCls(v) {
      if (!v.state) return "sw-token-input";
      if (v.state === "valid") return "sw-token-input sw-token-input--valid";
      if (v.state === "error") return "sw-token-input sw-token-input--error";
      return "sw-token-input";
    }
    function detailTxt(v) {
      if (v.detail) return v.detail;
      if (v.error) return v.error;
      return "";
    }

    return '<div class="sw-panel active">' +
      '<div class="sw-step-hero">' +
        '<span class="sw-step-hero__icon">💬</span>' +
        '<div class="sw-step-hero__title">連接 Telegram</div>' +
        '<div class="sw-step-hero__sub">設定 Bot Token 和你的用戶 ID</div>' +
      '</div>' +
      '<details class="sw-guide">' +
        '<summary>📖 如何取得 Bot Token？</summary>' +
        '<div class="sw-guide__body">' +
          '<div class="sw-guide__step"><div class="sw-guide__num">1</div><div>在 Telegram 搜尋 <strong>@BotFather</strong></div></div>' +
          '<div class="sw-guide__step"><div class="sw-guide__num">2</div><div>發送 <code>/newbot</code>，按提示命名你的 Bot</div></div>' +
          '<div class="sw-guide__step"><div class="sw-guide__num">3</div><div>複製格式如 <code>123456:ABCdef...</code> 的 Token</div></div>' +
        '</div>' +
      '</details>' +
      '<div class="' + inputCls(tokenValidation) + '">' +
        '<label class="sw-token-input__label">Bot Token</label>' +
        '<input type="text" id="sw-tg-token" placeholder="123456:ABCdef..." value="' + tokenVal + '" autocomplete="off" />' +
        '<span class="sw-token-input__status">' + statusIcon(tokenValidation) + '</span>' +
        '<div class="sw-token-input__detail">' + detailTxt(tokenValidation) + '</div>' +
      '</div>' +
      '<details class="sw-guide">' +
        '<summary>📖 如何取得用戶 ID？</summary>' +
        '<div class="sw-guide__body">' +
          '<div class="sw-guide__step"><div class="sw-guide__num">1</div><div>在 Telegram 搜尋 <strong>@userinfobot</strong></div></div>' +
          '<div class="sw-guide__step"><div class="sw-guide__num">2</div><div>發送任意訊息</div></div>' +
          '<div class="sw-guide__step"><div class="sw-guide__num">3</div><div>複製回覆中的數字 ID</div></div>' +
        '</div>' +
      '</details>' +
      '<div class="' + inputCls(userIdValidation) + '">' +
        '<label class="sw-token-input__label">你的 Telegram User ID</label>' +
        '<input type="text" id="sw-tg-userid" placeholder="1234567890" value="' + userIdVal + '" autocomplete="off" inputmode="numeric" />' +
        '<span class="sw-token-input__status">' + statusIcon(userIdValidation) + '</span>' +
        '<div class="sw-token-input__detail">' + detailTxt(userIdValidation) + '</div>' +
      '</div>' +
      '<div class="sw-nav-bar">' +
        '<button class="sw-btn sw-btn--ghost" id="sw-back">← 返回</button>' +
        '<button class="sw-btn sw-btn--skip" id="sw-skip">跳過</button>' +
        '<button class="sw-btn sw-btn--primary" id="sw-next" ' + (canProceedChannel() ? "" : "disabled") + '>下一步 →</button>' +
      '</div>' +
    '</div>';
  }

  function canProceedChannel() {
    var tv = setupState.validation["telegram-token"];
    var uv = setupState.validation["telegram-user-id"];
    return (tv && tv.state === "valid") || (uv && uv.state === "valid");
  }

  function buildLLMStep() {
    var llm = setupState.data.llm;
    var selectedProvider = llm.provider || "dashscope";
    var keyVal = llm.apiKey || "";
    var keyValidation = setupState.validation["llm-api-key"] || {};

    var providers = [
      { id: "dashscope", icon: "🌐", name: "DashScope", tag: "免費額度" },
      { id: "openai", icon: "🤖", name: "OpenAI", tag: "GPT-4o" },
      { id: "anthropic", icon: "🧬", name: "Anthropic", tag: "Claude" },
    ];

    function statusIcon(v) {
      if (!v.state) return "";
      if (v.state === "checking") return '<span class="sw-spinning">⟳</span>';
      if (v.state === "valid") return '<span class="sw-check-pop">✅</span>';
      if (v.state === "error") return '❌';
      return "";
    }
    function inputCls(v) {
      if (!v.state) return "sw-token-input";
      if (v.state === "valid") return "sw-token-input sw-token-input--valid";
      if (v.state === "error") return "sw-token-input sw-token-input--error";
      return "sw-token-input";
    }

    var providerCards = providers.map(function(p) {
      var selected = p.id === selectedProvider ? " sw-provider-card--selected" : "";
      return '<div class="sw-provider-card' + selected + '" data-provider="' + p.id + '">' +
        '<span class="sw-provider-card__icon">' + p.icon + '</span>' +
        '<div class="sw-provider-card__name">' + p.name + '</div>' +
        '<div class="sw-provider-card__tag">' + p.tag + '</div>' +
      '</div>';
    }).join("");

    var guideLinks = {
      openai: 'platform.openai.com/api-keys',
      dashscope: 'dashscope.console.aliyun.com → API-KEY 管理',
      anthropic: 'console.anthropic.com/settings/keys',
    };
    var guideText = guideLinks[selectedProvider] || "";

    return '<div class="sw-panel active">' +
      '<div class="sw-step-hero">' +
        '<span class="sw-step-hero__icon">🧠</span>' +
        '<div class="sw-step-hero__title">選擇 AI 大腦</div>' +
        '<div class="sw-step-hero__sub">選擇你的 LLM 供應商並輸入 API Key</div>' +
      '</div>' +
      '<div class="sw-section-label">LLM 供應商</div>' +
      '<div class="sw-provider-grid" id="sw-provider-grid">' + providerCards + '</div>' +
      '<div class="' + inputCls(keyValidation) + '">' +
        '<label class="sw-token-input__label">API Key</label>' +
        '<input type="text" id="sw-llm-key" placeholder="sk-..." value="' + keyVal + '" autocomplete="off" />' +
        '<span class="sw-token-input__status">' + statusIcon(keyValidation) + '</span>' +
        '<div class="sw-token-input__detail">' + (keyValidation.detail || keyValidation.error || "") + '</div>' +
      '</div>' +
      (guideText ? '<details class="sw-guide"><summary>📖 如何取得 API Key？</summary>' +
        '<div class="sw-guide__body">' +
          '<div class="sw-guide__step"><div class="sw-guide__num">1</div><div>打開 <code>' + guideText + '</code></div></div>' +
          '<div class="sw-guide__step"><div class="sw-guide__num">2</div><div>創建新的 API Key</div></div>' +
          '<div class="sw-guide__step"><div class="sw-guide__num">3</div><div>複製 Key 貼入上方輸入框</div></div>' +
        '</div>' +
      '</details>' : '') +
      '<div class="sw-nav-bar">' +
        '<button class="sw-btn sw-btn--ghost" id="sw-back">← 返回</button>' +
        '<button class="sw-btn sw-btn--skip" id="sw-skip">跳過</button>' +
        '<button class="sw-btn sw-btn--primary" id="sw-next" ' + (keyValidation.state === "valid" ? "" : "disabled") + '>下一步 →</button>' +
      '</div>' +
    '</div>';
  }

  function buildOptionalStep() {
    return '<div class="sw-panel active">' +
      '<div class="sw-step-hero">' +
        '<span class="sw-step-hero__icon">⚙️</span>' +
        '<div class="sw-step-hero__title">進階選項</div>' +
        '<div class="sw-step-hero__sub">可選整合，之後也可以設定</div>' +
      '</div>' +
      '<details class="sw-optional-card">' +
        '<summary>🔵 Feishu / Lark <span class="sw-optional-card__tag">選填</span></summary>' +
        '<div class="sw-optional-card__body">' +
          '<div class="sw-token-input">' +
            '<label class="sw-token-input__label">App ID</label>' +
            '<input type="text" id="sw-feishu-appid" placeholder="cli_..." value="' + (setupState.data.feishu.appId || "") + '" />' +
          '</div>' +
          '<div class="sw-token-input">' +
            '<label class="sw-token-input__label">App Secret</label>' +
            '<input type="password" id="sw-feishu-secret" placeholder="••••••••" value="' + (setupState.data.feishu.appSecret || "") + '" />' +
          '</div>' +
          '<div id="sw-feishu-status" style="font-size:0.8rem;margin-top:0.3rem"></div>' +
        '</div>' +
      '</details>' +
      '<details class="sw-optional-card">' +
        '<summary>🔐 Gateway Auth Token <span class="sw-optional-card__tag">選填</span></summary>' +
        '<div class="sw-optional-card__body">' +
          '<div class="sw-token-input">' +
            '<label class="sw-token-input__label">Auth Token（留空 = 無認證）</label>' +
            '<input type="password" id="sw-gw-token" placeholder="自定義密鑰" value="' + (setupState.data.gateway.authToken || "") + '" />' +
          '</div>' +
        '</div>' +
      '</details>' +
      '<div class="sw-nav-bar">' +
        '<button class="sw-btn sw-btn--ghost" id="sw-back">← 返回</button>' +
        '<button class="sw-btn sw-btn--primary" id="sw-next">下一步 →</button>' +
      '</div>' +
    '</div>';
  }

  function buildReviewStep() {
    var services = [
      {
        icon: "✈️", name: "Telegram",
        state: setupState.data.telegram.botToken ? "ok" : "skip",
        detail: setupState.data.telegram.botToken
          ? ("Bot token 已設定" + (setupState.validation["telegram-token"]?.detail ? " · " + setupState.validation["telegram-token"].detail : ""))
          : "未設定（跳過）",
      },
      {
        icon: "🧠", name: "AI 大腦",
        state: setupState.data.llm.apiKey ? "ok" : "skip",
        detail: setupState.data.llm.apiKey
          ? (setupState.data.llm.provider + " · API Key 已設定")
          : "未設定（跳過）",
      },
      {
        icon: "🔵", name: "Feishu",
        state: setupState.data.feishu.appId ? "ok" : "skip",
        detail: setupState.data.feishu.appId ? "App ID 已設定" : "未設定（跳過）",
      },
      {
        icon: "🔐", name: "Gateway Auth",
        state: setupState.data.gateway.authToken ? "ok" : "skip",
        detail: setupState.data.gateway.authToken ? "自定義 Token 已設定" : "開放訪問（無認證）",
      },
    ];

    var cardsHtml = services.map(function(s) {
      var statusEmoji = { ok: "🟢", warn: "🟡", error: "🔴", skip: "⚪" };
      return '<div class="sw-service-card sw-service-card--' + s.state + '">' +
        '<div class="sw-service-card__icon">' + s.icon + '</div>' +
        '<div class="sw-service-card__body">' +
          '<div class="sw-service-card__name">' + s.name + '</div>' +
          '<div class="sw-service-card__detail">' + s.detail + '</div>' +
        '</div>' +
        '<div class="sw-service-card__status">' + (statusEmoji[s.state] || "⚪") + '</div>' +
      '</div>';
    }).join("");

    return '<div class="sw-panel active">' +
      '<div class="sw-step-hero">' +
        '<span class="sw-step-hero__icon">🚀</span>' +
        '<div class="sw-step-hero__title">確認並啟動</div>' +
        '<div class="sw-step-hero__sub">確認設定後，寫入配置並重啟服務</div>' +
      '</div>' +
      '<div style="display:flex;flex-direction:column;gap:0.5rem;">' + cardsHtml + '</div>' +
      '<div style="background:var(--lp-bg-card);border:1px solid var(--lp-border);border-radius:var(--lp-radius);padding:0.75rem;font-size:0.8rem;color:var(--lp-muted);">' +
        '⚠️ 設定寫入後需要重啟 Gateway 才能生效。如果你在 server 端安裝，重啟後 Bot 即上線。' +
      '</div>' +
      '<div id="sw-apply-error" style="color:#ef4444;font-size:0.8rem;display:none;"></div>' +
      '<div class="sw-nav-bar">' +
        '<button class="sw-btn sw-btn--ghost" id="sw-back">← 返回</button>' +
        '<button class="sw-btn sw-btn--primary" id="sw-launch">🚀 寫入配置</button>' +
      '</div>' +
    '</div>';
  }

  function buildCelebrationHtml() {
    return '<div class="sw-celebration">' +
      '<span class="sw-celebration__check">🎉</span>' +
      '<div class="sw-celebration__title">設定完成！</div>' +
      '<div class="sw-celebration__sub">配置已寫入，請重啟 Gateway 以使設定生效。</div>' +
      '<div style="background:var(--lp-bg-card);border-radius:0.5rem;padding:0.8rem;margin:0.8rem 0;text-align:left">' +
        '<div style="font-size:0.75rem;color:var(--lp-muted);margin-bottom:0.4rem">重啟服務器上的 Gateway：</div>' +
        '<code style="font-family:monospace;font-size:0.8rem;display:block;color:var(--lp-primary)">' +
        'sudo systemctl --user restart openclaw-gateway.service' +
        '</code>' +
        '<div style="font-size:0.72rem;color:var(--lp-muted);margin-top:0.4rem">或：openclaw-restart</div>' +
      '</div>' +
      '<button class="sw-btn sw-btn--primary" id="sw-go-dashboard" style="margin:0 auto;display:block;">前往儀表板</button>' +
    '</div>';
  }

  function attachSetupListeners() {
    // Next
    var nextBtn = document.getElementById("sw-next");
    if (nextBtn) {
      nextBtn.addEventListener("click", function() {
        collectCurrentStepData();
        setupState.directionBack = false;
        // Quick mode: skip Step 4 (Optional) when leaving Step 3 (LLM)
        if (setupState.step === 3 && setupState.mode === "quick") {
          setupState.step = 5;
        } else {
          setupState.step = Math.min(setupState.step + 1, SETUP_STEPS.length - 1);
        }
        renderSetupWizard();
      });
    }

    // Back
    var backBtn = document.getElementById("sw-back");
    if (backBtn) {
      backBtn.addEventListener("click", function() {
        collectCurrentStepData();
        setupState.directionBack = true;
        // Quick mode: skip Step 4 (Optional) when going back from Step 5 (Review)
        if (setupState.step === 5 && setupState.mode === "quick") {
          setupState.step = 3;
        } else {
          setupState.step = Math.max(setupState.step - 1, 0);
        }
        renderSetupWizard();
      });
    }

    // Skip
    var skipBtn = document.getElementById("sw-skip");
    if (skipBtn) {
      skipBtn.addEventListener("click", function() {
        setupState.directionBack = false;
        setupState.step = Math.min(setupState.step + 1, SETUP_STEPS.length - 1);
        renderSetupWizard();
      });
    }

    // Exit
    var exitBtn = document.getElementById("sw-exit");
    if (exitBtn) {
      exitBtn.addEventListener("click", function() {
        navigateTo("dashboard");
      });
    }

    // Quick/Advanced start on welcome
    var quickStart = document.getElementById("sw-quick-start");
    if (quickStart) {
      quickStart.addEventListener("click", function() {
        setupState.mode = "quick";
        setupState.directionBack = false;
        setupState.step = 2;
        renderSetupWizard();
      });
    }
    var advancedStart = document.getElementById("sw-advanced-start");
    if (advancedStart) {
      advancedStart.addEventListener("click", function() {
        setupState.mode = "advanced";
        setupState.directionBack = false;
        setupState.step = 2;
        renderSetupWizard();
      });
    }

    // Go to dashboard from celebration
    var goDash = document.getElementById("sw-go-dashboard");
    if (goDash) {
      goDash.addEventListener("click", function() { navigateTo("dashboard"); });
    }

    // Launch button
    var launchBtn = document.getElementById("sw-launch");
    if (launchBtn) {
      launchBtn.addEventListener("click", function() {
        collectCurrentStepData();
        void applySetupConfig();
      });
    }

    // Provider cards
    var providerGrid = document.getElementById("sw-provider-grid");
    if (providerGrid) {
      providerGrid.addEventListener("click", function(e) {
        var card = e.target.closest(".sw-provider-card");
        if (!card) return;
        var provider = card.dataset.provider;
        setupState.data.llm.provider = provider;
        // Clear api key validation since provider changed
        delete setupState.validation["llm-api-key"];
        renderSetupWizard();
      });
    }

    // Token input debounce validation
    setupTokenInputValidation("sw-pin-input", "setup-pin");
    setupTokenInputValidation("sw-tg-token", "telegram-token");
    setupTokenInputValidation("sw-tg-userid", "telegram-user-id");
    setupTokenInputValidation("sw-llm-key", "llm-api-key");

    // Feishu debounced validation (Step 4)
    var feishuAppId = document.getElementById("sw-feishu-appid");
    var feishuSecret = document.getElementById("sw-feishu-secret");
    if (feishuAppId && feishuSecret) {
      function validateFeishu() {
        var appId = feishuAppId.value.trim();
        var appSecret = feishuSecret.value.trim();
        if (!appId || !appSecret) return;
        var baseUrl = cfg.serverUrl || "";
        var setupHeaders = { "Content-Type": "application/json", "X-Setup-Pin": setupState.data.pin || "" };
        fetch(baseUrl + "/api/setup/validate", {
          method: "POST",
          headers: setupHeaders,
          body: JSON.stringify({ type: "feishu-credentials", appId: appId, appSecret: appSecret })
        })
        .then(function(r) { return r.json(); })
        .then(function(data) {
          var statusEl = document.getElementById("sw-feishu-status");
          if (statusEl) {
            if (data.ok) {
              var appName = (data.details && data.details.appName) ? data.details.appName : "驗證成功";
              statusEl.innerHTML = '<span style="color:var(--lp-success)">✅ ' + appName + '</span>';
            } else {
              statusEl.innerHTML = '<span style="color:var(--lp-danger)">❌ ' + (data.error || "驗證失敗") + '</span>';
            }
          }
        }).catch(function() {
          var statusEl = document.getElementById("sw-feishu-status");
          if (statusEl) statusEl.innerHTML = '<span style="color:var(--lp-muted)">❓ 連接失敗</span>';
        });
      }
      var feishuTimer;
      [feishuAppId, feishuSecret].forEach(function(el) {
        el.addEventListener("input", function() {
          clearTimeout(feishuTimer);
          feishuTimer = setTimeout(validateFeishu, 700);
        });
      });
    }
  }

  function setupTokenInputValidation(inputId, validationType) {
    var input = document.getElementById(inputId);
    if (!input) return;

    var validate = function() {
      var value = input.value.trim();
      if (!value) {
        delete setupState.validation[validationType];
        updateValidationUI(inputId, validationType);
        return;
      }
      if (setupValidationTimers[validationType]) {
        clearTimeout(setupValidationTimers[validationType]);
      }
      setupValidationTimers[validationType] = setTimeout(function() {
        doValidate(validationType, value);
      }, 500);
    };

    input.addEventListener("input", validate);
    input.addEventListener("paste", function() {
      // Flash animation
      input.style.animation = "none";
      requestAnimationFrame(function() {
        input.style.animation = "";
        input.parentElement.classList.add("sw-paste-flash");
        setTimeout(function() { input.parentElement.classList.remove("sw-paste-flash"); }, 600);
      });
      setTimeout(validate, 50);
    });

    // Validate immediately if already has value
    if (input.value.trim()) {
      setTimeout(validate, 100);
    }
  }

  function doValidate(type, value) {
    setupState.validation[type] = { state: "checking" };
    updateValidationUI(null, type);

    var baseUrl = cfg.serverUrl || "";
    var opts = {};
    if (type === "setup-pin") {
      // Store pin in state for use in subsequent requests
      setupState.data.pin = value.toUpperCase();
    }
    if (type === "llm-api-key") {
      opts = { provider: setupState.data.llm.provider };
    }

    var setupHeaders = { "Content-Type": "application/json" };
    if (setupState.data.pin && type !== "setup-pin") {
      setupHeaders["X-Setup-Pin"] = setupState.data.pin;
    }
    fetch(baseUrl + "/api/setup/validate", {
      method: "POST",
      headers: setupHeaders,
      body: JSON.stringify({ type: type, value: value, ...opts }),
    })
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (data.ok) {
        var detail = "";
        if (data.details) {
          if (data.details.botUsername) detail = "Bot: @" + data.details.botUsername;
          else if (data.details.userId) detail = "ID: " + data.details.userId;
          else if (data.details.models) detail = "Models: " + data.details.models.slice(0, 2).join(", ");
        }
        setupState.validation[type] = { state: "valid", detail: detail };
      } else {
        setupState.validation[type] = { state: "error", error: data.error || "Validation failed" };
      }
      updateValidationUI(null, type);
      // Re-render to update Next button enabled state
      var panel = document.getElementById("sw-panel-container");
      if (panel) panel.innerHTML = buildSetupStepHtml(setupState.step);
      attachSetupListeners();
    })
    .catch(function(err) {
      setupState.validation[type] = { state: "error", error: String(err) };
      updateValidationUI(null, type);
    });
  }

  function updateValidationUI(inputId, validationType) {
    // Re-render the panel to reflect validation state
    var panel = document.getElementById("sw-panel-container");
    if (panel) {
      panel.innerHTML = buildSetupStepHtml(setupState.step);
      attachSetupListeners();
    }
  }

  function collectCurrentStepData() {
    var step = setupState.step;
    if (step === 0) {
      var pinInput = document.getElementById("sw-pin-input");
      if (pinInput) setupState.data.pin = pinInput.value.trim().toUpperCase();
    } else if (step === 2) {
      var tgToken = document.getElementById("sw-tg-token");
      var tgUser = document.getElementById("sw-tg-userid");
      if (tgToken) setupState.data.telegram.botToken = tgToken.value.trim();
      if (tgUser) setupState.data.telegram.userId = tgUser.value.trim();
    } else if (step === 3) {
      var llmKey = document.getElementById("sw-llm-key");
      if (llmKey) setupState.data.llm.apiKey = llmKey.value.trim();
    } else if (step === 4) {
      var fsAppId = document.getElementById("sw-feishu-appid");
      var fsSecret = document.getElementById("sw-feishu-secret");
      var gwToken = document.getElementById("sw-gw-token");
      if (fsAppId) setupState.data.feishu.appId = fsAppId.value.trim();
      if (fsSecret) setupState.data.feishu.appSecret = fsSecret.value.trim();
      if (gwToken) setupState.data.gateway.authToken = gwToken.value.trim();
    }
  }

  async function applySetupConfig() {
    var launchBtn = document.getElementById("sw-launch");
    var errEl = document.getElementById("sw-apply-error");
    if (launchBtn) { launchBtn.disabled = true; launchBtn.textContent = "⟳ 寫入中..."; }
    if (errEl) errEl.style.display = "none";

    try {
      var payload = {};
      var d = setupState.data;
      if (d.telegram.botToken) {
        payload.telegram = { botToken: d.telegram.botToken, userId: d.telegram.userId };
      }
      if (d.llm.apiKey) {
        payload.llm = { provider: d.llm.provider, apiKey: d.llm.apiKey, model: d.llm.model || "" };
      }
      if (d.feishu.appId && d.feishu.appSecret) {
        payload.feishu = { appId: d.feishu.appId, appSecret: d.feishu.appSecret };
      }
      if (d.gateway.authToken) {
        payload.gateway = { authToken: d.gateway.authToken };
      }

      var baseUrl = cfg.serverUrl || "";
      var r = await fetch(baseUrl + "/api/setup/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Setup-Pin": setupState.data.pin || "" },
        body: JSON.stringify(payload),
      });
      var data = await r.json();
      if (data.ok) {
        var container = document.getElementById("page-setup");
        if (container) {
          container.innerHTML = buildCelebrationHtml();
          var goDash = document.getElementById("sw-go-dashboard");
          if (goDash) goDash.addEventListener("click", function() { navigateTo("dashboard"); });
        }
      } else {
        if (errEl) { errEl.textContent = data.error || "寫入失敗"; errEl.style.display = "block"; }
        if (launchBtn) { launchBtn.disabled = false; launchBtn.textContent = "🚀 寫入配置"; }
      }
    } catch (err) {
      if (errEl) { errEl.textContent = String(err); errEl.style.display = "block"; }
      if (launchBtn) { launchBtn.disabled = false; launchBtn.textContent = "🚀 寫入配置"; }
    }
  }

  // ─── Settings Page ────────────────────────────────────────────────────────

  function renderSettings() {
    // Load saved values into inputs
    const serverInput = document.getElementById("server-url");
    const tokenInput = document.getElementById("auth-token");
    if (serverInput) {
      serverInput.value = cfg.serverUrl;
    }
    if (tokenInput) {
      tokenInput.value = cfg.token;
    }

    // Connection status indicator
    const dot = document.getElementById("status-dot");
    const text = document.getElementById("status-text");
    if (cfg.mode === "live") {
      if (dot) {
        dot.classList.add("online");
        dot.classList.remove("error");
      }
      if (text) {
        text.textContent = `已連線: ${cfg.serverUrl}`;
      }
    } else {
      if (dot) {
        dot.classList.remove("online");
        dot.classList.remove("error");
      }
      if (text) {
        text.textContent = "未連線 (Demo 模式)";
      }
    }

    // Agent status
    renderAgentStatus();

    // Cron overview
    renderCronOverview();

    // Service health panel
    renderServiceHealth();
  }

  function renderServiceHealth() {
    var container = document.getElementById("sw-health-container");
    if (!container) return;
    if (cfg.mode !== "live") {
      container.innerHTML = '<div style="font-size:0.8rem;color:var(--lp-muted);padding:0.5rem 0;">連接到 Server 後可查看服務健康狀態</div>';
      return;
    }
    container.innerHTML = '<div style="font-size:0.8rem;color:var(--lp-muted);padding:0.5rem 0;">載入中...</div>';
    fetch((cfg.serverUrl || "") + "/api/setup/status")
      .then(function(r) { return r.json(); })
      .then(function(data) {
        if (!data.ok) { container.innerHTML = '<div style="font-size:0.8rem;color:#ef4444;">無法取得狀態</div>'; return; }
        var h = data.health || {};
        var c = data.configured || {};
        var services = [
          {
            icon: "✈️", name: "Telegram",
            state: h.telegram === "ok" ? "ok" : h.telegram === "unconfigured" ? "skip" : "error",
            detail: c.telegram ? "@" + c.telegram.botUsername : "未設定",
          },
          {
            icon: "🧠", name: "AI 大腦",
            state: h.llm === "ok" ? "ok" : h.llm === "unconfigured" ? "skip" : "error",
            detail: c.llm ? (c.llm.provider + " · " + c.llm.model) : "未設定",
          },
          {
            icon: "🔵", name: "Feishu",
            state: h.feishu === "ok" ? "ok" : h.feishu === "expiring" ? "warn" : h.feishu === "expired" ? "error" : "skip",
            detail: h.feishu === "expiring" ? "Token 即將過期" : h.feishu === "expired" ? "Token 已過期" : (c.feishu ? c.feishu.appId : "未設定"),
          },
        ];
        var statusEmoji = { ok: "🟢", warn: "🟡", error: "🔴", skip: "⚪" };
        container.innerHTML = services.map(function(s) {
          return '<div class="sw-service-card sw-service-card--' + s.state + '" style="margin-bottom:0.4rem;">' +
            '<div class="sw-service-card__icon">' + s.icon + '</div>' +
            '<div class="sw-service-card__body">' +
              '<div class="sw-service-card__name">' + s.name + '</div>' +
              '<div class="sw-service-card__detail">' + s.detail + '</div>' +
            '</div>' +
            '<div class="sw-service-card__status">' + (statusEmoji[s.state] || "⚪") + '</div>' +
          '</div>';
        }).join("") +
        '<button class="sw-btn sw-btn--ghost" onclick="navigateTo(\'setup\')" style="width:100%;margin-top:0.5rem;font-size:0.8rem;">⚙️ 重新設定 Wizard</button>';
      })
      .catch(function() { container.innerHTML = '<div style="font-size:0.8rem;color:var(--lp-muted);">無法連接到 Server</div>'; });
  }

  function renderAgentStatus() {
    const container = document.getElementById("agent-status-list");
    if (!container) {
      return;
    }
    const agents = MOCK.status.agents;
    const agentIcon = { main: "🧠", executor: "⚡", reviewer: "👁️" };

    container.innerHTML = agents
      .map(function (a) {
        const icon = agentIcon[a.id] || "🤖";
        const lastActive = Math.round(a.lastHeartbeatMs / 60000);
        return `
        <div class="list-card">
          <div class="list-card-icon">${icon}</div>
          <div class="list-card-body">
            <div class="list-card-title">${a.name}</div>
            <div class="list-card-sub">ID: ${a.id} · 上次活躍 ${lastActive}分前</div>
          </div>
          <span class="status-dot-sm ${a.online ? "" : "offline"}"></span>
        </div>
      `;
      })
      .join("");
  }

  function renderCronOverview() {
    const container = document.getElementById("cron-overview");
    if (!container) {
      return;
    }
    const s = MOCK.cron.summary;
    container.innerHTML = `
      <div class="cron-stat">
        <div class="cron-stat-val" style="color:var(--lp-teal, #14b8a6)">${s.active}</div>
        <div class="cron-stat-label">活躍</div>
      </div>
      <div class="cron-stat">
        <div class="cron-stat-val" style="color:var(--lp-muted, #71717a)">${s.disabled}</div>
        <div class="cron-stat-label">禁用</div>
      </div>
      <div class="cron-stat">
        <div class="cron-stat-val" style="color:#ef4444">${s.errored}</div>
        <div class="cron-stat-label">錯誤</div>
      </div>
    `;
  }

  // ─── Chat Page ────────────────────────────────────────────────────────────

  const chatMessages = [];

  function addChatBubble(role, content) {
    chatMessages.push({ role: role, content: content });
    const container = document.getElementById("chat-messages");
    if (!container) {
      return;
    }

    const bubble = document.createElement("div");
    bubble.className = `chat-bubble bubble-${role === "user" ? "user" : "bot"}`;
    bubble.textContent = content;
    container.appendChild(bubble);
    container.scrollTop = container.scrollHeight;
  }

  async function sendChatMessage(text) {
    if (!text.trim()) {
      return;
    }
    addChatBubble("user", text);

    const typing = document.getElementById("typing-indicator");
    if (typing) {
      typing.classList.remove("hidden");
    }

    if (cfg.mode === "live" && getAPI()) {
      try {
        const msgs = chatMessages.map(function (m) {
          return { role: m.role === "bot" ? "assistant" : m.role, content: m.content };
        });
        const result = await getAPI().sendChat(msgs);
        const reply =
          (result &&
            result.choices &&
            result.choices[0] &&
            result.choices[0].message &&
            result.choices[0].message.content) ||
          "（無回覆）";
        if (typing) {
          typing.classList.add("hidden");
        }
        addChatBubble("bot", reply);
      } catch (e) {
        if (typing) {
          typing.classList.add("hidden");
        }
        addChatBubble("bot", `連線錯誤: ${e.message}`);
      }
    } else {
      // Demo mode: mock responses
      const mockReplies = [
        "好的，我已記錄。稍後會在晨報中彙總。",
        "明白！我會幫你跟蹤這個任務，到期提醒你。",
        "這個我可以幫你處理。你希望我優先安排哪個時間段？",
        "已添加到你的待辦清單。優先級：HIGH。",
        "收到！我會在明天的晨報中包含這個更新。",
        "好的，我會監控這件事並在有進展時通知你。",
      ];
      const delay = 800 + Math.random() * 400;
      setTimeout(function () {
        if (typing) {
          typing.classList.add("hidden");
        }
        const reply = mockReplies[Math.floor(Math.random() * mockReplies.length)];
        addChatBubble("bot", reply);
      }, delay);
    }
  }

  // ─── Particle Animation (Welcome Screen) ──────────────────────────────────

  let particleAnimId = null;

  function initParticles() {
    const canvas = document.getElementById("welcome-particles");
    if (!canvas) {
      return;
    }
    canvas.width = 80;
    canvas.height = 80;
    const ctx = canvas.getContext("2d");

    const particles = Array.from({ length: 20 }, function () {
      return {
        x: Math.random() * 80,
        y: Math.random() * 80,
        r: Math.random() * 2 + 0.5,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        alpha: Math.random() * 0.6 + 0.2,
      };
    });

    function draw() {
      ctx.clearRect(0, 0, 80, 80);
      particles.forEach(function (p) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > 80) {
          p.vx *= -1;
        }
        if (p.y < 0 || p.y > 80) {
          p.vy *= -1;
        }
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(245,158,11,${p.alpha})`;
        ctx.fill();
      });
      particleAnimId = requestAnimationFrame(draw);
    }
    draw();
  }

  function stopParticles() {
    if (particleAnimId !== null) {
      cancelAnimationFrame(particleAnimId);
      particleAnimId = null;
    }
  }

  // ─── Welcome Screen Logic ─────────────────────────────────────────────────

  function showWelcome() {
    const ws = document.getElementById("welcome-screen");
    const app = document.getElementById("app-root");
    if (ws) {
      ws.classList.remove("hidden");
    }
    if (app) {
      app.classList.add("hidden");
    }
    initParticles();
  }

  function hideWelcome() {
    stopParticles();
    const ws = document.getElementById("welcome-screen");
    const app = document.getElementById("app-root");
    if (ws) {
      ws.classList.add("hidden");
    }
    if (app) {
      app.classList.remove("hidden");
    }
  }

  // ─── Event Listeners Setup ────────────────────────────────────────────────

  function setupEventListeners() {
    // Welcome screen buttons
    const btnDemo = document.getElementById("btn-demo");
    if (btnDemo) {
      btnDemo.addEventListener("click", function () {
        cfg.mode = "demo";
        saveConfig();
        hideWelcome();
        navigateTo("dashboard");
      });
    }

    const btnConnect = document.getElementById("btn-connect");
    if (btnConnect) {
      btnConnect.addEventListener("click", function () {
        cfg.mode = "demo"; // Start in demo mode; user configures in settings
        saveConfig();
        hideWelcome();
        navigateTo("settings");
      });
    }

    // Bottom nav clicks
    document.querySelectorAll(".nav-tab").forEach(function (tab) {
      tab.addEventListener("click", function (e) {
        e.preventDefault();
        const page = tab.dataset.page;
        if (page) {
          location.hash = page;
          navigateTo(page);
        }
      });
    });

    // Filter tabs (Tasks page) — exclude calendar view tabs
    document.querySelectorAll(".filter-tab:not([data-cal-view])").forEach(function (tab) {
      tab.addEventListener("click", function () {
        document.querySelectorAll(".filter-tab:not([data-cal-view])").forEach(function (t) {
          t.classList.remove("active");
        });
        tab.classList.add("active");
        taskFilter = tab.dataset.filter || "all";
        renderTasks();
      });
    });

    // Calendar mode switcher tabs
    document.querySelectorAll("[data-cal-mode]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        document.querySelectorAll("[data-cal-mode]").forEach(function (b) {
          b.classList.remove("active");
          b.setAttribute("aria-selected", "false");
        });
        btn.classList.add("active");
        btn.setAttribute("aria-selected", "true");
        calendarViewMode = btn.dataset.calMode || "grid";
        void renderCalendar();
      });
    });

    // Dashboard "查看全部" → jump to calendar page
    var calViewAll = document.getElementById("cal-view-all");
    if (calViewAll) {
      calViewAll.addEventListener("click", function () {
        location.hash = "calendar";
        navigateTo("calendar");
      });
    }

    // Calendar quick-add button
    var calAddBtn = document.getElementById("cal-add-btn");
    if (calAddBtn) {
      calAddBtn.addEventListener("click", async function () {
        var dateEl = document.getElementById("cal-add-date");
        var timeEl = document.getElementById("cal-add-time");
        var titleEl = document.getElementById("cal-add-title");
        var dateVal = dateEl ? dateEl.value : "";
        var timeVal = timeEl ? timeEl.value : "";
        var titleVal = titleEl ? titleEl.value.trim() : "";

        if (!titleVal) {
          if (titleEl) {
            titleEl.focus();
          }
          return;
        }
        if (!dateVal) {
          dateVal = new Date().toISOString().slice(0, 10);
        }

        addLocalCalendarEvent({ date: dateVal, time: timeVal, summary: titleVal });

        if (titleEl) {
          titleEl.value = "";
        }

        // Fire-and-forget notify Kairo
        if (cfg.mode === "live" && getAPI()) {
          try {
            await getAPI().sendCapture(
              "新行程: " + titleVal + " @ " + dateVal + (timeVal ? " " + timeVal : ""),
              ["calendar"],
            );
          } catch {
            // ignore
          }
        }

        void renderCalendar();
      });
    }

    // Tag buttons (Capture page)
    document.querySelectorAll(".tag-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        const tag = btn.dataset.tag;
        if (!tag) {
          return;
        }
        if (selectedTags.indexOf(tag) !== -1) {
          selectedTags = selectedTags.filter(function (t) {
            return t !== tag;
          });
          btn.classList.remove("active");
        } else {
          selectedTags.push(tag);
          btn.classList.add("active");
        }
      });
    });

    // Capture submit
    const captureSubmit = document.getElementById("capture-submit");
    if (captureSubmit) {
      captureSubmit.addEventListener("click", async function () {
        const input = document.getElementById("capture-text");
        const text = input ? input.value.trim() : "";
        if (!text) {
          return;
        }
        captureSubmit.disabled = true;
        captureSubmit.textContent = "發送中…";
        try {
          await submitCapture(text);
          if (input) {
            input.value = "";
          }
          selectedTags = [];
          document.querySelectorAll(".tag-btn").forEach(function (b) {
            b.classList.remove("active");
          });
          alert("已發送給 Kairo！");
        } catch (e) {
          console.error("submitCapture failed:", e);
          alert("發送失敗，請稍後重試。");
        } finally {
          captureSubmit.disabled = false;
          captureSubmit.textContent = "發送給 Kairo";
        }
      });
    }

    // Chat form submit
    const chatForm = document.getElementById("chat-form");
    if (chatForm) {
      chatForm.addEventListener("submit", async function (e) {
        e.preventDefault();
        const input = document.getElementById("chat-input");
        const text = input ? input.value.trim() : "";
        if (!text) {
          return;
        }
        if (input) {
          input.value = "";
          input.style.height = "auto";
        }
        await sendChatMessage(text);
      });
    }

    // Chat input auto-resize
    const chatInput = document.getElementById("chat-input");
    if (chatInput) {
      chatInput.addEventListener("input", function () {
        this.style.height = "auto";
        this.style.height = Math.min(this.scrollHeight, 120) + "px";
      });

      // Enter to send (Shift+Enter for newline)
      chatInput.addEventListener("keydown", function (e) {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          const form = document.getElementById("chat-form");
          if (form) {
            form.dispatchEvent(new Event("submit"));
          }
        }
      });
    }

    // Settings: Test connection button
    const testBtn = document.getElementById("test-connection");
    if (testBtn) {
      testBtn.addEventListener("click", async function () {
        const urlInput = document.getElementById("server-url");
        const tokenInput = document.getElementById("auth-token");
        const url = urlInput ? urlInput.value.trim() : "";
        const token = tokenInput ? tokenInput.value.trim() : "";

        if (!url) {
          alert("請填寫 Server URL");
          return;
        }

        testBtn.disabled = true;
        testBtn.textContent = "測試中…";

        const dot = document.getElementById("status-dot");
        const statusText = document.getElementById("status-text");

        const testApi = new KairoAPI(url, token);
        try {
          const status = await testApi.testConnection();
          cfg.serverUrl = url;
          cfg.token = token;
          cfg.mode = "live";
          api = testApi;
          saveConfig();
          if (dot) {
            dot.classList.add("online");
            dot.classList.remove("error");
          }
          if (statusText) {
            statusText.textContent = `✅ 已連線: ${url} (v${(status && status.version) || "?"})`;
          }
        } catch (e) {
          if (dot) {
            dot.classList.add("error");
            dot.classList.remove("online");
          }
          if (statusText) {
            statusText.textContent = `❌ 連線失敗: ${e.message}`;
          }
        } finally {
          testBtn.disabled = false;
          testBtn.textContent = "測試連線";
        }
      });
    }

    // Settings: Disconnect / switch to demo mode button
    const disconnectBtn = document.getElementById("disconnect-btn");
    if (disconnectBtn) {
      disconnectBtn.addEventListener("click", function () {
        cfg.mode = "demo";
        api = null;
        saveConfig();
        renderSettings();
      });
    }

    // Settings: Save server config without testing
    const saveSettingsBtn = document.getElementById("save-settings");
    if (saveSettingsBtn) {
      saveSettingsBtn.addEventListener("click", function () {
        const urlInput = document.getElementById("server-url");
        const tokenInput = document.getElementById("auth-token");
        if (urlInput) {
          cfg.serverUrl = urlInput.value.trim();
        }
        if (tokenInput) {
          cfg.token = tokenInput.value.trim();
        }
        api = null; // reset so getAPI() rebuilds
        saveConfig();
        alert("設定已儲存");
      });
    }

    // Hash change navigation
    window.addEventListener("hashchange", function () {
      const hash = location.hash.slice(1) || "dashboard";
      navigateTo(hash);
    });

    // Resize: redraw chart when window resizes
    let resizeTimer = null;
    window.addEventListener("resize", function () {
      if (resizeTimer) {
        clearTimeout(resizeTimer);
      }
      resizeTimer = setTimeout(function () {
        if (currentPage === "dashboard") {
          drawUsageChart();
        }
      }, 150);
    });
  }

  // ─── Init ─────────────────────────────────────────────────────────────────

  function init() {
    // Inject runtime styles not covered by the stylesheet
    const style = document.createElement("style");
    style.textContent = [
      ".done-strike { text-decoration: line-through; opacity: 0.6; }",
      ".empty-state { text-align: center; color: var(--lp-muted, #71717a); font-size: 0.85rem; padding: 2rem 0; }",
      ".chat-bubble { max-width: 82%; padding: 0.6rem 0.9rem; border-radius: 1rem; margin-bottom: 0.5rem; line-height: 1.5; font-size: 0.9rem; word-break: break-word; }",
      ".bubble-user { align-self: flex-end; background: var(--lp-amber, #f59e0b); color: #1c1917; border-bottom-right-radius: 0.25rem; }",
      ".bubble-bot { align-self: flex-start; background: var(--lp-card, #27272a); color: var(--lp-text, #f4f4f5); border-bottom-left-radius: 0.25rem; }",
      ".status-dot-sm { display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #22c55e; margin: 0 2px; }",
      ".status-dot-sm.offline { background: #71717a; }",
      ".status-dot-sm.error { background: #ef4444; }",
      "#status-dot.online { background: #22c55e; }",
      "#status-dot.error { background: #ef4444; }",
      ".list-card { display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem; background: var(--lp-card, #27272a); border-radius: 0.75rem; margin-bottom: 0.5rem; }",
      ".list-card-icon { font-size: 1.2rem; flex-shrink: 0; width: 2rem; text-align: center; }",
      ".list-card-body { flex: 1; min-width: 0; }",
      ".list-card-title { font-size: 0.9rem; font-weight: 500; color: var(--lp-text, #f4f4f5); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }",
      ".list-card-sub { font-size: 0.75rem; color: var(--lp-muted, #71717a); margin-top: 0.15rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }",
      ".list-card-badge { flex-shrink: 0; font-size: 0.65rem; font-weight: 700; padding: 0.15rem 0.4rem; border-radius: 0.3rem; letter-spacing: 0.03em; }",
      ".badge-high { background: rgba(239,68,68,0.18); color: #f87171; }",
      ".badge-med { background: rgba(245,158,11,0.18); color: #fbbf24; }",
      ".badge-low { background: rgba(113,113,122,0.18); color: #a1a1aa; }",
      ".cron-stat { text-align: center; }",
      ".cron-stat-val { font-size: 1.4rem; font-weight: 700; }",
      ".cron-stat-label { font-size: 0.7rem; color: var(--lp-muted, #71717a); margin-top: 0.1rem; }",
      ".hidden { display: none !important; }",
    ].join("\n");
    document.head.appendChild(style);

    // Populate initial mock chat history into the chat container
    MOCK.chatHistory.forEach(function (msg) {
      const container = document.getElementById("chat-messages");
      if (!container) {
        return;
      }
      const bubble = document.createElement("div");
      bubble.className = `chat-bubble bubble-${msg.role === "user" ? "user" : "bot"}`;
      bubble.textContent = msg.content;
      container.appendChild(bubble);
    });

    setupEventListeners();

    // Auto-detect server URL from:
    // 1. URL query param ?server=http://...
    // 2. config.json in same origin (when hosted on GitHub Pages)
    // 3. localStorage (existing saved config)
    var urlParams = new URLSearchParams(location.search);
    var paramServer = urlParams.get("server");
    if (paramServer && !cfg.serverUrl) {
      cfg.serverUrl = paramServer;
      cfg.mode = "live";
      saveConfig();
    }

    // Try loading config.json from same origin (GitHub Pages deployment)
    function tryLoadConfigJson(callback) {
      fetch("./config.json")
        .then(function(r) { return r.json(); })
        .then(function(data) {
          if (data.serverUrl && !cfg.serverUrl) {
            cfg.serverUrl = data.serverUrl;
            cfg.mode = "live";
            saveConfig();
          }
          if (data.lanUrl && !cfg.lanUrl) {
            cfg.lanUrl = data.lanUrl;
            saveConfig();
          }
          callback();
        })
        .catch(function() { callback(); });
    }

    // Decide whether to show welcome screen or jump straight to app
    const hasVisited = localStorage.getItem("kw_visited");
    tryLoadConfigJson(function() {
      // Auto-detect serverUrl when running from same-origin server
      if (!cfg.serverUrl &&
          typeof location !== "undefined" &&
          !location.hostname.endsWith("github.io") &&
          location.hostname !== "" &&
          location.protocol !== "file:") {
        cfg.serverUrl = location.protocol + "//" + location.host;
        saveConfig();
      }
      if (!hasVisited || !cfg.mode || cfg.mode === "demo") {
        if (cfg.serverUrl) {
          // Has server URL from config.json or URL param — skip welcome, go to setup
          hideWelcome();
          navigateTo("setup");
        } else {
          showWelcome();
        }
      } else {
        hideWelcome();
        const hash = location.hash.slice(1) || "dashboard";
        navigateTo(hash);
        // Auto-detect if setup needed (when in live mode and no hash specified)
        if (cfg.mode === "live" && !location.hash) {
          fetch((cfg.serverUrl || "") + "/api/setup/status")
            .then(function(r) { return r.json(); })
            .then(function(d) { if (d.ok && d.needsSetup) { navigateTo("setup"); } })
            .catch(function() {});
        }
      }
    });

    // Mark as visited for subsequent loads
    localStorage.setItem("kw_visited", "1");
  }

  // ─── Boot ─────────────────────────────────────────────────────────────────

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
