(function () {
  "use strict";

  // ─── Config & State ───────────────────────────────────────────────────────

  const cfg = {
    serverUrl: localStorage.getItem("kw_server") || "",
    token: localStorage.getItem("kw_token") || "",
    mode: localStorage.getItem("kw_mode") || "demo", // 'demo' | 'live'
  };

  function saveConfig() {
    localStorage.setItem("kw_server", cfg.serverUrl);
    localStorage.setItem("kw_token", cfg.token);
    localStorage.setItem("kw_mode", cfg.mode);
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

    chatHistory: [
      {
        role: "assistant",
        content:
          "早上好！今日 7:10 晨報已發送。你有 2 個高優先任務需要跟進，日曆上下午有投資人電話。有什麼我可以幫你的嗎？",
      },
    ],
  };

  // ─── Hash Router ──────────────────────────────────────────────────────────

  const pages = new Set(["dashboard", "chat", "tasks", "calendar", "capture", "settings"]);
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
    }
  }

  // ─── Dashboard Renderer ───────────────────────────────────────────────────

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

  function deleteLocalCalendarEvent(id) {
    var events = getLocalCalendarEvents().filter(function (e) {
      return e.id !== id;
    });
    try {
      localStorage.setItem("kw_calendar_events", JSON.stringify(events));
    } catch {}
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

  var calendarView = "today";
  var calendarViewMode = "grid"; // "grid" | "timeline" | "tasks"
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
    // show/hide add strip based on mode
    var strip = document.getElementById("cal-add-strip");
    if (strip) {
      strip.style.display = calendarViewMode === "tasks" ? "none" : "";
    }

    if (calendarViewMode === "grid") {
      var events = await fetchCalendarData();
      renderCalendarGridView(events);
    } else if (calendarViewMode === "timeline") {
      var events2 = await fetchCalendarData();
      renderCalendarTimelineView(events2);
    } else {
      renderTaskDrivenView();
    }
  }

  function renderCalendarHero(events) {
    var container = document.getElementById("cal-hero");
    if (!container) {
      return;
    }

    var now = new Date();
    var todayStr = now.toISOString().slice(0, 10);
    var nowTime = now.getHours() * 60 + now.getMinutes();

    // Find next upcoming event
    var next = null;
    for (var i = 0; i < events.length; i++) {
      var ev = events[i];
      if (ev.allDay) {
        continue;
      }
      if (ev.date > todayStr) {
        next = ev;
        break;
      }
      if (ev.date === todayStr) {
        var parts = (ev.time || "00:00").split(":");
        var evMin = parseInt(parts[0] || "0") * 60 + parseInt(parts[1] || "0");
        if (evMin > nowTime) {
          next = ev;
          break;
        }
      }
    }

    if (!next) {
      container.innerHTML = `
        <div class="cal-hero-card fade-in">
          <div class="cal-hero-label">NEXT UP</div>
          <div class="cal-hero-title" style="color:var(--lp-muted)">今日行程已全部完成 ✨</div>
          <div class="cal-hero-meta">明日繼續加油</div>
        </div>`;
      return;
    }

    // Countdown
    var evDate = new Date(next.date + "T" + next.time + ":00");
    var diffMs = evDate - now;
    var diffMin = Math.round(diffMs / 60000);
    var countdownStr;
    if (diffMin < 60) {
      countdownStr = diffMin + " 分後";
    } else if (diffMin < 1440) {
      countdownStr = Math.floor(diffMin / 60) + " 小時後";
    } else {
      countdownStr = Math.floor(diffMin / 1440) + " 天後";
    }

    var typeColors = {
      meeting: "#3b82f6",
      important: "#f59e0b",
      study: "#a78bfa",
      health: "#14b8a6",
      personal: "#f472b6",
      work: "#3b82f6",
    };
    var borderColor = typeColors[next.type] || "var(--lp-amber)";

    container.innerHTML = `
      <div class="cal-hero-card fade-in" style="border-left-color:${borderColor}">
        <div class="cal-hero-label">NEXT UP</div>
        <div class="cal-hero-time">${escapeHtml(next.time)}</div>
        <div class="cal-hero-title">${escapeHtml(next.summary)}</div>
        <div class="cal-hero-meta">
          ${next.location ? "📍 " + escapeHtml(next.location) + "&ensp;" : ""}
          <span class="cal-countdown">${countdownStr}</span>
        </div>
      </div>`;
  }

  function renderCalendarTimeline(events, view) {
    var container = document.getElementById("cal-timeline");
    if (!container) {
      return;
    }

    var now = new Date();
    var todayStr = now.toISOString().slice(0, 10);
    var nowTime = now.getHours() * 60 + now.getMinutes();

    // Filter by view
    var filtered;
    if (view === "today") {
      filtered = events.filter(function (ev) {
        return ev.date === todayStr;
      });
    } else if (view === "week") {
      var weekEnd = new Date(now);
      weekEnd.setDate(weekEnd.getDate() + 7);
      var weekEndStr = weekEnd.toISOString().slice(0, 10);
      filtered = events.filter(function (ev) {
        return ev.date >= todayStr && ev.date <= weekEndStr;
      });
    } else {
      filtered = events.slice();
    }

    if (filtered.length === 0) {
      container.innerHTML =
        '<div class="empty-state"><div class="empty-state-icon">📅</div>暫無行程</div>';
      return;
    }

    // Group by date
    var groups = {};
    var groupOrder = [];
    filtered.forEach(function (ev) {
      if (!groups[ev.date]) {
        groups[ev.date] = [];
        groupOrder.push(ev.date);
      }
      groups[ev.date].push(ev);
    });

    var html = "";
    var delay = 0;

    groupOrder.forEach(function (dateStr) {
      var dayEvents = groups[dateStr];
      var isToday = dateStr === todayStr;

      // Day header
      var dateObj = new Date(dateStr + "T12:00:00");
      var dateLabel = dateObj.toLocaleDateString("zh-TW", {
        month: "numeric",
        day: "numeric",
        weekday: "short",
      });
      html += `<div class="cal-day-header">
        ${escapeHtml(dateLabel)}
        ${isToday ? '<span class="cal-day-today-pill">TODAY</span>' : ""}
      </div>`;

      var nowLineInserted = false;

      dayEvents.forEach(function (ev) {
        // Insert NOW indicator before first future event today
        if (isToday && !nowLineInserted && !ev.allDay) {
          var pts = (ev.time || "00:00").split(":");
          var evMin = parseInt(pts[0] || "0") * 60 + parseInt(pts[1] || "0");
          if (evMin > nowTime) {
            nowLineInserted = true;
            var nowLabel = now.toLocaleTimeString("zh-TW", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
            });
            html += `<div class="cal-now-line">
              <div class="cal-now-dot"></div>
              <div class="cal-now-bar"></div>
              <div class="cal-now-label">${escapeHtml(nowLabel)}</div>
            </div>`;
          }
        }

        // Is past?
        var isPast = false;
        if (!ev.allDay) {
          if (ev.date < todayStr) {
            isPast = true;
          } else if (ev.date === todayStr) {
            var pts2 = (ev.time || "00:00").split(":");
            var evMin2 = parseInt(pts2[0] || "0") * 60 + parseInt(pts2[1] || "0");
            isPast = evMin2 < nowTime;
          }
        }

        // Source badge
        var badgeClass =
          ev.source === "feishu"
            ? "cal-badge-feishu"
            : ev.source === "local"
              ? "cal-badge-local"
              : ev.source === "queue"
                ? "cal-badge-queue"
                : "cal-badge-mock";
        var badgeLabel =
          ev.source === "feishu"
            ? "飛書"
            : ev.source === "local"
              ? "本地"
              : ev.source === "queue"
                ? "Queue"
                : "Demo";

        var deleteBtn =
          ev.source === "local"
            ? `<button class="cal-delete-btn" data-del-id="${ev.id}" aria-label="刪除事件" title="刪除">✕</button>`
            : "";

        var sub = "";
        if (ev.location) {
          sub += "📍 " + escapeHtml(ev.location);
        }
        if (ev.attendees) {
          sub += (sub ? " · " : "") + escapeHtml(ev.attendees);
        }

        var animDelay = Math.min(delay * 0.06, 0.8);

        html += `<div class="cal-event fade-in ${isPast ? "cal-event-past" : ""}" data-type="${escapeHtml(ev.type || "personal")}" style="animation-delay:${animDelay}s" role="listitem">
          <div class="cal-event-time">${escapeHtml(ev.allDay ? "全天" : ev.time)}</div>
          <div class="cal-event-body">
            <div class="cal-event-title">${escapeHtml(ev.summary)}</div>
            ${sub ? `<div class="cal-event-sub">${sub}</div>` : ""}
          </div>
          <div class="cal-event-meta">
            <span class="cal-badge ${badgeClass}">${badgeLabel}</span>
            ${deleteBtn}
          </div>
        </div>`;

        delay++;
      });
    });

    container.innerHTML = html;

    // Bind delete buttons
    container.querySelectorAll(".cal-delete-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var id = parseInt(btn.dataset.delId);
        if (id) {
          deleteLocalCalendarEvent(id);
          calendarCache = null;
          void renderCalendar();
        }
      });
    });
  }

  // ─── Calendar Grid View ───────────────────────────────────────────────────

  function renderCalendarGridView(events) {
    var content = document.getElementById("cal-content");
    if (!content) {
      return;
    }

    var now = new Date();
    var todayStr = now.toISOString().slice(0, 10);
    var year = calendarNavYear;
    var month = calendarNavMonth; // 0-based

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

    var typeColors = {
      meeting: "#3b82f6",
      important: "#f59e0b",
      study: "#a78bfa",
      health: "#14b8a6",
      personal: "#f472b6",
      work: "#3b82f6",
      local: "#f59e0b",
    };

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
    if (calendarSelectedDate && eventMap[calendarSelectedDate] !== undefined) {
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
              var color = typeColors[ev.type] || "var(--lp-amber)";
              return `<div class="cal-day-event-row">
              <div class="cal-day-event-dot" style="background:${color}"></div>
              <div class="cal-day-event-time">${escapeHtml(ev.allDay ? "全天" : ev.time)}</div>
              <div class="cal-day-event-title">${escapeHtml(ev.summary)}</div>
            </div>`;
            })
            .join("")
        : `<div style="font-size:0.8rem;color:var(--lp-muted);padding:0.25rem 0">無行程</div>`;
      dayPanelHtml = `<div id="cal-day-panel"><div class="cal-day-panel-header">${escapeHtml(selLabel)}</div>${evRowsHtml}</div>`;
    } else if (calendarSelectedDate) {
      var selObj2 = new Date(calendarSelectedDate + "T12:00:00");
      var selLabel2 = selObj2.toLocaleDateString("zh-TW", {
        month: "long",
        day: "numeric",
        weekday: "long",
      });
      dayPanelHtml = `<div id="cal-day-panel"><div class="cal-day-panel-header">${escapeHtml(selLabel2)}</div><div style="font-size:0.8rem;color:var(--lp-muted);padding:0.25rem 0">無行程</div></div>`;
    }

    content.innerHTML = `<div id="cal-grid-view">
      <div class="cal-month-nav">
        <button class="cal-month-nav-btn" id="cal-prev-month" aria-label="上月">‹</button>
        <div class="cal-month-title">
          <span class="cal-month-name">${monthNames[month]}</span>
          <span class="cal-month-year">${year}</span>
        </div>
        <button class="cal-month-nav-btn" id="cal-next-month" aria-label="下月">›</button>
      </div>
      <div class="cal-grid-wrap">
        <div class="cal-grid">${dowHtml}${cellsHtml}</div>
        ${dayPanelHtml}
      </div>
    </div>`;

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

  // ─── Calendar Timeline View (wrapper) ─────────────────────────────────────

  function renderCalendarTimelineView(events) {
    var content = document.getElementById("cal-content");
    if (!content) {
      return;
    }

    var viewTabs = ["today", "week", "all"]
      .map(function (v) {
        var labels = { today: "今天", week: "本週", all: "全部" };
        var isActive = calendarView === v;
        return `<button class="filter-tab${isActive ? " active" : ""}" data-cal-view="${v}" role="tab" ${isActive ? 'aria-selected="true"' : 'aria-selected="false"'}>${labels[v]}</button>`;
      })
      .join("");

    content.innerHTML = `<div id="cal-timeline-view">
      <div id="cal-hero"></div>
      <div class="filter-tabs" role="tablist" aria-label="日曆檢視">${viewTabs}</div>
      <div id="cal-timeline" class="card-list" role="list" aria-label="事件列表"></div>
    </div>`;

    renderCalendarHero(events);
    renderCalendarTimeline(events, calendarView);

    content.querySelectorAll("[data-cal-view]").forEach(function (tab) {
      tab.addEventListener("click", function () {
        content.querySelectorAll("[data-cal-view]").forEach(function (t) {
          t.classList.remove("active");
          t.setAttribute("aria-selected", "false");
        });
        tab.classList.add("active");
        tab.setAttribute("aria-selected", "true");
        calendarView = tab.dataset.calView || "today";
        renderCalendarTimeline(events, calendarView);
      });
    });
  }

  // ─── Task-Driven View ─────────────────────────────────────────────────────

  function renderTaskDrivenView() {
    var content = document.getElementById("cal-content");
    if (!content) {
      return;
    }

    var tasks = MOCK.tasks;
    var now = new Date();
    var todayStr = now.toISOString().slice(0, 10);
    var weekEnd = new Date(now);
    weekEnd.setDate(weekEnd.getDate() + 7);
    var weekEndStr = weekEnd.toISOString().slice(0, 10);
    var nextWeekEnd = new Date(now);
    nextWeekEnd.setDate(nextWeekEnd.getDate() + 14);
    var nextWeekEndStr = nextWeekEnd.toISOString().slice(0, 10);

    var groups = { overdue: [], today: [], week: [], nextWeek: [], later: [], noDue: [] };
    tasks.forEach(function (t) {
      if (t.status === "done") {
        return;
      }
      if (!t.due) {
        groups.noDue.push(t);
        return;
      }
      if (t.due < todayStr) {
        groups.overdue.push(t);
      } else if (t.due === todayStr) {
        groups.today.push(t);
      } else if (t.due <= weekEndStr) {
        groups.week.push(t);
      } else if (t.due <= nextWeekEndStr) {
        groups.nextWeek.push(t);
      } else {
        groups.later.push(t);
      }
    });

    function dueTxt(due) {
      if (!due) {
        return "";
      }
      if (due < todayStr) {
        var daysLate = Math.round((now - new Date(due + "T12:00:00")) / 86400000);
        return "逾期 " + daysLate + "天";
      }
      if (due === todayStr) {
        return "今天";
      }
      var diff = Math.round((new Date(due + "T12:00:00") - now) / 86400000);
      if (diff === 1) {
        return "明天";
      }
      if (diff < 7) {
        return diff + " 天後";
      }
      if (diff < 14) {
        return "下週";
      }
      return due;
    }

    var agentEmoji = { main: "🧠", executor: "⚡", reviewer: "👁" };

    function renderGroup(list, horizonCls, chipLabel) {
      if (!list.length) {
        return "";
      }
      var cards = list
        .map(function (task, idx) {
          var delay = Math.min(idx * 0.055, 0.55);
          var emo = agentEmoji[task.agent] || "🤖";
          var statusCls = task.status === "active" ? "status-active" : "status-pending";
          var due = dueTxt(task.due);
          return `<div class="task-mission-card priority-${task.priority} fade-in" style="animation-delay:${delay}s">
            <div class="task-mission-band"></div>
            <div class="task-mission-body">
              <div class="task-mission-title">${escapeHtml(task.title)}</div>
              <div class="task-mission-meta">
                <div class="task-status-dot ${statusCls}"></div>
                ${due ? `<span class="task-due-badge">${escapeHtml(due)}</span>` : ""}
                <span class="task-agent-label">${emo} ${escapeHtml(task.agent)}</span>
              </div>
            </div>
          </div>`;
        })
        .join("");
      return `<div class="task-horizon-group ${horizonCls}">
        <div class="task-horizon-chip">${chipLabel}</div>
        ${cards}
      </div>`;
    }

    var html =
      renderGroup(groups.overdue, "horizon-overdue", "⚠ 逾期") +
      renderGroup(groups.today, "horizon-today", "▶ 今日") +
      renderGroup(groups.week, "horizon-week", "本週") +
      renderGroup(groups.nextWeek, "horizon-next-week", "下週") +
      renderGroup(groups.later, "horizon-later", "之後") +
      renderGroup(groups.noDue, "horizon-no-due", "無截止");

    content.innerHTML = html
      ? `<div id="cal-task-view">${html}</div>`
      : '<div class="empty-state"><div class="empty-state-icon">🎯</div>所有任務已完成！</div>';
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

    // Decide whether to show welcome screen or jump straight to app
    const hasVisited = localStorage.getItem("kw_visited");
    if (!hasVisited || !cfg.mode) {
      showWelcome();
    } else {
      hideWelcome();
      const hash = location.hash.slice(1) || "dashboard";
      navigateTo(hash);
    }

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
