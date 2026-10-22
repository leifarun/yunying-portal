(() => {
  "use strict";

  const cfg = window.APP_CONFIG || {};
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
  const attr = escapeHtml;
  const num = (value) => {
    if (value === null || value === undefined || value === "") return 0;
    if (typeof value === "number") return Number.isFinite(value) ? value : 0;
    const cleaned = String(value).replace(/[,，\s%]/g, "");
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : 0;
  };
  const pctValue = (value) => {
    if (value === null || value === undefined || value === "") return 0;
    if (typeof value === "string" && value.includes("%")) return num(value) / 100;
    const n = num(value);
    return Math.abs(n) > 1 ? n / 100 : n;
  };
  const fmt = (value, digits = 0) => Number(value || 0).toLocaleString("zh-CN", { maximumFractionDigits: digits, minimumFractionDigits: 0 });
  const fmtMoney = (value) => Number(value || 0).toLocaleString("zh-CN", { maximumFractionDigits: 2 });
  const fmtPct = (value, digits = 2) => `${(Number(value || 0) * 100).toFixed(digits)}%`;
  const shortNum = (value) => {
    const n = Number(value || 0);
    if (Math.abs(n) >= 100000000) return `${(n / 100000000).toFixed(1)}亿`;
    if (Math.abs(n) >= 10000) return `${(n / 10000).toFixed(1)}万`;
    return fmt(n);
  };
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const firstChar = (name) => String(name || "?").trim().slice(0, 1) || "?";
  const dateOnly = (date) => {
    const d = date instanceof Date ? date : new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };
  const parseDateOnly = (value) => {
    const parts = String(value || "").slice(0, 10).split("-").map(Number);
    return new Date(parts[0], (parts[1] || 1) - 1, parts[2] || 1);
  };
  const formatDate = (value) => {
    if (!value) return "—";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleDateString("zh-CN", { month: "2-digit", day: "2-digit" });
  };
  const formatDateTime = (value) => {
    if (!value) return "—";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false });
  };
  const formatFullDateTime = (value) => {
    if (!value) return "—";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleString("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false });
  };
  const startOfWeek = (date = new Date()) => {
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const day = d.getDay() || 7;
    d.setDate(d.getDate() - day + 1);
    return d;
  };
  const endOfWeek = (date = new Date()) => {
    const d = startOfWeek(date);
    d.setDate(d.getDate() + 6);
    return d;
  };
  const isoWeekNo = (date) => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const day = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - day);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  };
  const weekText = (batch) => batch ? `第${batch.week_no}周 · ${formatDate(batch.week_start)}–${formatDate(batch.week_end)}` : "尚未导入";
  const todayStr = () => dateOnly(new Date());
  const isWithinDays = (value, days) => {
    if (!value) return false;
    return Date.now() - new Date(value).getTime() <= days * 86400000;
  };

  const BOARD = {
    show: { label: "展示量差", short: "曝光", icon: "◉", color: "#2f6fed", desc: "有库存且库销比偏高，但广告展示不足，优先排查预算、竞价、投放词与曝光池。", formula: "库销比 > 4 个月，且实际展示 < 需要展示量" },
    needad: { label: "需开广告", short: "开广告", icon: "＋", color: "#d47b0b", desc: "在售、有 FBA 库存，但广告花费和展示都为 0，属于有货却没被看见。", formula: "状态=在售 且 FBA可售≥1 且 广告花费≤0 且 展示≤0" },
    click: { label: "点击率差", short: "点击", icon: "↗", color: "#7955d9", desc: "展示已经达到目标但点击不足，从主图、价格、评分、标题和竞争环境入手。", formula: "展示达标，且实际点击 < 需要点击量" },
    cvr: { label: "转化率差", short: "转化", icon: "◎", color: "#df4752", desc: "展示与点击达标但广告订单不足，重点检查五点、A+、视频、价格与评论。", formula: "展示、点击达标，且实际广告单 < 需要广告单" },
    c4: { label: "自然流量偏低", short: "自然流量", icon: "⌁", color: "#139a61", desc: "广告漏斗前三步都达标，但总销量仍不足，说明自然排名与权重需要拉升。", formula: "广告展示、点击、订单均达标，且总销量 < 需要月销量" },
    slow: { label: "滞销品优化", short: "滞销", icon: "◷", color: "#a56b20", desc: "近 30 天无销量的有库存商品，按点击潜力分成低、中、高潜力三级。", formula: "FBA可售>0 且 近30天销量=0" },
    sl_low: { label: "低潜力滞销", short: "低潜", icon: "◷", color: "#9a7b48", desc: "有库存但点击少于 5 次，优先判断是否根本没有被看到。", formula: "销量=0 且 点击<5" },
    sl_mid: { label: "中潜力滞销", short: "中潜", icon: "◷", color: "#b66b22", desc: "已有少量点击但没有成交，重点看主图、价格、评价与详情页。", formula: "销量=0 且 5≤点击<10" },
    sl_high: { label: "高潜力滞销", short: "高潜", icon: "◷", color: "#8a4f16", desc: "点击达到 10 次以上仍无成交，是最值得优先抢救的一批。", formula: "销量=0 且 点击≥10" },
    ad: { label: "广告无效花费", short: "广告花费", icon: "◌", color: "#b2397c", desc: "广告已经花钱但没有产出，优先否词、降价、调预算或拆分广告活动。", formula: "广告花费>5 且（ACOS>20% 或 广告订单=0）" },
    refund: { label: "高退货率", short: "退货", icon: "↩", color: "#e05e46", desc: "退款量达到 2 次且退款率偏高，优先复核质量、尺寸、描述与包装。", formula: "退款量≥2 且 退款率>15%" },
    score: { label: "低评分优化", short: "低分", icon: "☆", color: "#d48a09", desc: "评分低于 3 分，需要检查差评原因、产品问题和 listing 预期管理。", formula: "0<评分<3" }
  };
  const BOARD_ORDER = ["show", "needad", "click", "cvr", "c4", "sl_low", "sl_mid", "sl_high", "ad", "refund", "score"];
  const isCreatorRole = (role) => role === "创作者";
  const isManagementRole = (role) => role === "主管" || role === "创作者";
  const INTERNAL_EMAIL_DOMAIN = "staff.yunying.local";
  const normalizeUsername = (value) => String(value || "").normalize("NFKC").trim().toLowerCase();
  const base64Url = (text) => {
    const bytes = new TextEncoder().encode(text);
    let binary = "";
    bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  };
  const usernameToEmail = (value) => {
    const identifier = String(value || "").trim();
    return identifier.includes("@") ? identifier : `u_${base64Url(normalizeUsername(identifier))}@${INTERNAL_EMAIL_DOMAIN}`;
  };

  const TASK_BOARDS = [
    { key: "show", label: "展示量差", boards: ["show"] },
    { key: "needad", label: "需开广告", boards: ["needad"] },
    { key: "click", label: "点击率差", boards: ["click"] },
    { key: "cvr", label: "转化率差", boards: ["cvr"] },
    { key: "c4", label: "自然流量偏低", boards: ["c4"] },
    { key: "sl_low", label: "低潜力滞销", boards: ["sl_low"] },
    { key: "sl_mid", label: "中潜力滞销", boards: ["sl_mid"] },
    { key: "slow_high", label: "高潜力滞销", boards: ["sl_high"] },
    { key: "ad", label: "广告无效花费", boards: ["ad"] },
    { key: "refund", label: "高退货率", boards: ["refund"] },
    { key: "score", label: "低评分优化", boards: ["score"] }
  ];
  const DASH_PALETTE = ["#2f6fed", "#4a86f7", "#6ea0ff", "#f0b429", "#e8863a", "#e5683e", "#e5484d", "#b23a3f", "#7c4dff", "#b06bff", "#0a9dbd", "#12a150"];
  const AGE_BUCKETS = [
    { key: "age0", label: "0-30 天", color: "#2f6fed" },
    { key: "age31", label: "31-60 天", color: "#4a86f7" },
    { key: "age61", label: "61-90 天", color: "#6ea0ff" },
    { key: "age91", label: "91-180 天", color: "#f0b429" },
    { key: "age181", label: "181-270 天", color: "#e8863a" },
    { key: "age271", label: "271-330 天", color: "#e5683e" },
    { key: "age331", label: "331-365 天", color: "#e5484d" },
    { key: "age365p", label: ">365 天", color: "#b23a3f" }
  ];
  const PRODUCT_SELECT = "id,batch_id,msku,shop,asin,fnsku,sku,country,owner,sales,revenue,refund_qty,refund_rate,score,reviews,fba_avail,fba_value,ad_spend,ad_rev,ad_orders,imp,clk,price,sale_price,status,age_0_30,age_31_60,age_61_90,age_91_180,age_181_270,age_271_330,age_331_365,age_365p,age_0_60,age_180p,acos,ctr,cvr,ad_share,cpc,roas,acoas,issue_keys,slow_type,refund_flag";
  const DEFAULT_THRESHOLD_VALUES = {
    1: "4", 2: "4", 3: "40", 4: "5", 5: "0.6", 6: "100", 7: "100", 8: "100", 9: "100",
    10: "40", 11: "0.6", 12: "5", 13: "—", 14: "—", 15: "20", 16: "—", 17: "—",
    18: "5", 19: "5 / 10", 20: "10", 21: "60 / 90 / 180 / 270", 22: "2 / 30", 23: "2 / 15",
    24: "3", 25: "0", 26: "5"
  };
  const PRODUCT_COLUMN_DEFS = [
    { key: "asin", label: "ASIN", width: 110 }, { key: "msku", label: "MSKU", width: 160 }, { key: "fnsku", label: "FNSKU", width: 120 },
    { key: "country", label: "国家", width: 70 }, { key: "shop", label: "店铺", width: 100 }, { key: "owner", label: "负责人", width: 70 },
    { key: "status", label: "状态", width: 64 }, { key: "sales", label: "销量", width: 62 }, { key: "revenue", label: "销售额", width: 78 },
    { key: "refund_qty", label: "退款量", width: 62 }, { key: "refund_rate", label: "退款率", width: 66 }, { key: "score", label: "评分", width: 54 },
    { key: "reviews", label: "评论数", width: 62 }, { key: "fba_avail", label: "FBA可售", width: 72 }, { key: "kxb", label: "库销比", width: 64 },
    { key: "ad_spend", label: "广告花费", width: 74 }, { key: "ad_orders", label: "广告订单量", width: 78 }, { key: "ad_share", label: "广告订单占比", width: 84 },
    { key: "imp", label: "展示", width: 72 }, { key: "clk", label: "点击", width: 62 }, { key: "ctr", label: "CTR", width: 62 },
    { key: "cvr", label: "广告CVR", width: 70 }, { key: "cpc", label: "CPC", width: 60 }, { key: "roas", label: "ROAS", width: 60 },
    { key: "acos", label: "ACOS", width: 64 }, { key: "acoas", label: "ACoAS", width: 66 }, { key: "price", label: "价格(原价)", width: 76 },
    { key: "sale_price", label: "优惠价", width: 72 }, { key: "age0", label: "0-30天", width: 62 }, { key: "age31", label: "31-60天", width: 62 },
    { key: "age61", label: "61-90天", width: 62 }, { key: "age91", label: "91-180天", width: 66 }, { key: "age181", label: "181-270天", width: 72 },
    { key: "age271", label: "271-330天", width: 72 }, { key: "age331", label: "331-365天", width: 72 }, { key: "age365p", label: "365天+", width: 62 },
    { key: "fba_value", label: "FBA货值", width: 76 }, { key: "issue", label: "系统判定", width: 152 }
  ];

  const NAV_SECTIONS = [
    { title: "数据视图", items: [{ view: "dashboard", label: "总表数据看板", icon: "◫" }, { view: "products", board: "all", label: "总 Listing 数据", icon: "▦" }] },
    { title: "优化板块", items: [
      { view: "board", board: "show", label: "1. 展示量差的", icon: "◉" },
      { view: "board", board: "needad", label: "└ 1.1 需开广告", icon: "＋", sub: true },
      { view: "board", board: "click", label: "2. 点击率差的", icon: "↗" },
      { view: "board", board: "cvr", label: "3. 转化率差的", icon: "◎" },
      { view: "board", board: "c4", label: "4. 自然流量偏低", icon: "⌁" },
      { view: "board", board: "slow", label: "5. 滞销品优化", icon: "◷" },
      { view: "board", board: "sl_low", label: "└ 5.1 低潜力", icon: "◷", sub: true },
      { view: "board", board: "sl_mid", label: "└ 5.2 中潜力", icon: "◷", sub: true },
      { view: "board", board: "sl_high", label: "└ 5.3 高潜力", icon: "◷", sub: true },
      { view: "board", board: "ad", label: "6. 广告无效花费", icon: "◌" },
      { view: "board", board: "refund", label: "7. 高退货率", icon: "↩" },
      { view: "board", board: "score", label: "8. 低评分优化", icon: "☆" }
    ] },
    { title: "工作与追踪", items: [{ view: "weekly", label: "每周处理进度", icon: "◴" }, { view: "logs", label: "处理记录", icon: "≡" }] },
    { title: "管理", items: [{ view: "thresholds", label: "阈值与公式", icon: "ƒ" }, { view: "import", label: "导入中心", icon: "⇧" }, { view: "settings", label: "账号与权限", icon: "⚙" }] }
  ];

  const ACTION_TYPES = ["调价", "换主图", "改五点", "广告否词", "加预算", "开广告", "报 DOTD", "清货", "翻新", "修复后台信息", "其他"];
  const IMPORT_COLUMNS = [
    { key: "asin", label: "ASIN", aliases: ["asin"] },
    { key: "msku", label: "MSKU", aliases: ["msku", "seller sku", "seller-sku"] },
    { key: "fnsku", label: "Fnsku", aliases: ["fnsku", "fn sku"] },
    { key: "country", label: "国家", aliases: ["国家"] },
    { key: "shop", label: "店铺", aliases: ["店铺"] },
    { key: "owner", label: "负责人", aliases: ["负责人"] },
    { key: "sales", label: "销量", aliases: ["销量", "近30天销量"] },
    { key: "revenue", label: "销售额", aliases: ["销售额", "近30天销售额"] },
    { key: "refund_qty", label: "退款量", aliases: ["退款量", "近30天退款量"] },
    { key: "refund_rate", label: "退款率", aliases: ["退款率"] },
    { key: "score", label: "评分", aliases: ["评分"] },
    { key: "reviews", label: "评论数", aliases: ["评论数"] },
    { key: "fba_avail", label: "FBA-可售数量", aliases: ["fba-可售数量", "fba可售数量", "fba可售"] },
    { key: "fba_value", label: "FBA货值（可售+不可售）", aliases: ["fba货值（可售+不可售）", "fba货值", "货值"] },
    { key: "ad_spend", label: "广告花费", aliases: ["广告花费"] },
    { key: "ad_orders", label: "广告订单量", aliases: ["广告订单量", "广告订单"] },
    { key: "ad_share", label: "广告订单占比", aliases: ["广告订单占比"] },
    { key: "imp", label: "展示", aliases: ["展示", "展示量", "曝光", "曝光量"] },
    { key: "clk", label: "点击", aliases: ["点击", "点击量"] },
    { key: "ctr", label: "CTR", aliases: ["ctr", "点击率"] },
    { key: "cvr", label: "广告CVR", aliases: ["广告cvr", "cvr", "转化率"] },
    { key: "cpc", label: "CPC", aliases: ["cpc"] },
    { key: "roas", label: "ROAS", aliases: ["roas"] },
    { key: "acos", label: "ACOS", aliases: ["acos"] },
    { key: "acoas", label: "ACoAS", aliases: ["acoas"] },
    { key: "status", label: "状态", aliases: ["状态", "listing状态"] },
    { key: "price", label: "价格(原价)", aliases: ["价格(原价)", "原价", "价格"] },
    { key: "sale_price", label: "优惠价(当前listing前台价格)", aliases: ["优惠价(当前listing前台价格)", "优惠价", "当前售价"] },
    { key: "age_0_30", label: "0<库龄<=30天", aliases: ["0<库龄<=30天", "0-30天", "0-30"] },
    { key: "age_31_60", label: "31<=库龄<=60天", aliases: ["31<=库龄<=60天", "31-60天", "31-60"] },
    { key: "age_61_90", label: "61<=库龄<=90天", aliases: ["61<=库龄<=90天", "61-90天", "61-90"] },
    { key: "age_91_180", label: "91<=库龄<=180天", aliases: ["91<=库龄<=180天", "91-180天", "91-180"] },
    { key: "age_181_270", label: "181<=库龄<=270天", aliases: ["181<=库龄<=270天", "181-270天", "181-270"] },
    { key: "age_271_330", label: "271<=库龄<=330天", aliases: ["271<=库龄<=330天", "271-330天", "271-330"] },
    { key: "age_331_365", label: "331<=库龄<=365天", aliases: ["331<=库龄<=365天", "331-365天", "331-365"] },
    { key: "age_365p", label: "365<=库龄", aliases: ["365<=库龄", "365+库龄", "365+", ">365"] }
  ];
  const PRODUCT_NUMERIC_KEYS = new Set(["sales", "revenue", "refund_qty", "refund_rate", "score", "reviews", "fba_avail", "kxb", "ad_spend", "ad_orders", "ad_share", "imp", "clk", "ctr", "cvr", "cpc", "roas", "acos", "acoas", "price", "sale_price", "age0", "age31", "age61", "age91", "age181", "age271", "age331", "age365p", "fba_value"]);
  const REQUIRED_IMPORT_KEYS = ["asin", "msku", "shop", "owner", "sales", "revenue", "refund_qty", "fba_avail", "ad_spend", "ad_orders", "imp", "clk", "status"];
  const VALID_STATUS = new Set(["在售", "停售", "搜索禁止显示", "无在售信息"]);
  const DEFAULT_SITE_NAME = "运营三部 · 内部运营中台";

  let sb = null;
  let toastTimer = null;
  let stickyTableFrame = 0;
  let stickyTableObserver = null;
  let fixedHeaderSource = null;
  let fixedHScrollSource = null;
  const state = {
    session: null, profile: null, profiles: [], batches: [], currentBatch: null,
    products: [], actions: [], weeklyStats: [], weeklyAssignments: [], thresholds: [], appSettings: {}, view: "dashboard", board: "all",
    page: 1, pageSize: 50, loading: false, busy: false, demo: false, filters: {}, shopAll: false, hiddenCols: new Set(),
    sortKey: null, sortDir: "desc",
    logFilters: { user: "", board: "", time: "30d" }, selectedWeekId: null, pendingImport: null
  };

  function toast(message, type = "") {
    const el = $("#toast");
    if (!el) return;
    clearTimeout(toastTimer);
    el.textContent = message;
    el.className = `toast ${type}`.trim();
    toastTimer = setTimeout(() => el.classList.add("hidden"), 3200);
  }

  function showBootError(error) {
    $("#boot")?.classList.add("hidden");
    $("#authScreen")?.classList.remove("hidden");
    const box = $("#loginError");
    if (box) box.textContent = `页面初始化失败：${error?.message || error || "未知错误"}`;
  }
  window.__showBootError = showBootError;

  function setSync(mode, text) {
    const el = $("#syncState");
    if (!el) return;
    const dot = $("i", el);
    const label = $("span", el);
    if (label) label.textContent = text;
    if (dot) dot.style.background = mode === "error" ? "#df4752" : mode === "busy" ? "#d47b0b" : "#23b26d";
  }

  function setLoading(value) {
    state.loading = value;
    const content = $("#content");
    if (value && content) content.innerHTML = `<div class="card"><div class="empty"><b>正在加载团队数据…</b><span>首次载入会读取本周产品和处理记录</span></div></div>`;
  }

  function errorMessage(error) {
    if (!error) return "未知错误";
    const message = error.message || error.error_description || String(error);
    if (message.includes("Invalid login credentials")) return "邮箱或密码不正确";
    if (message.includes("Email not confirmed")) return "邮箱尚未验证，请先完成邮箱验证";
    if (message.includes("row-level security")) return "当前账号没有这项操作权限";
    if (message.includes("JWT")) return "登录状态已失效，请重新登录";
    return message;
  }

  function setCachedSiteName(value) {
    const siteName = String(value || "").trim();
    if (!siteName) return;
    try { localStorage.setItem("portal-site-name", siteName); } catch (_) {}
    document.cookie = `portal_site_name=${encodeURIComponent(siteName)}; Path=/; Max-Age=31536000; SameSite=Lax`;
  }

  function applySiteName(value = "") {
    let cachedName = "";
    try { cachedName = localStorage.getItem("portal-site-name") || ""; } catch (_) {}
    if (!cachedName) {
      const cookieName = document.cookie.split("; ").find((item) => item.startsWith("portal_site_name="));
      if (cookieName) {
        try { cachedName = decodeURIComponent(cookieName.split("=").slice(1).join("=")); } catch (_) {}
      }
    }
    const siteName = String(value || state.appSettings?.site_name || cachedName || DEFAULT_SITE_NAME).trim() || DEFAULT_SITE_NAME;
    const parts = siteName.split("·").map((part) => part.trim()).filter(Boolean);
    const primary = parts[0] || DEFAULT_SITE_NAME;
    const secondary = parts.length > 1 ? parts.slice(1).join(" · ") : "内部运营中台";
    document.title = siteName;
    const bootName = $("#bootSiteName");
    if (bootName) bootName.textContent = siteName;
    const authPrimary = $("#authSiteNamePrimary"), authSecondary = $("#authSiteNameSecondary");
    if (authPrimary) authPrimary.textContent = primary;
    if (authSecondary) authSecondary.textContent = secondary;
    const sidePrimary = $("#sidebarSiteNamePrimary"), sideSecondary = $("#sidebarSiteNameSecondary");
    if (sidePrimary) sidePrimary.textContent = primary;
    if (sideSecondary) sideSecondary.textContent = secondary;
  }

  async function loadPublicSiteName() {
    if (!sb) return;
    try {
      const { data, error } = await sb.from("app_settings").select("value").eq("key", "site_name").maybeSingle();
      if (error) throw error;
      if (data?.value) {
        state.appSettings = { ...state.appSettings, site_name: data.value };
        setCachedSiteName(data.value);
        applySiteName(data.value);
      }
    } catch (_) {
      applySiteName();
    }
  }

  function init() {
    applySiteName();
    bindEvents();
    initStickyTableTools();
    try { const saved = JSON.parse(localStorage.getItem("portal-hidden-cols") || "[]"); if (Array.isArray(saved)) state.hiddenCols = new Set(saved); } catch (_) {}
    if (!window.supabase || !cfg.supabaseUrl || !cfg.supabaseKey) { showBootError(new Error("Supabase SDK 或配置文件未加载")); return; }
    sb = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
    if (new URLSearchParams(window.location.search).get("demo") === "1") { enterDemo(); return; }
    loadPublicSiteName();
    sb.auth.getSession().then(async ({ data, error }) => {
      if (error) throw error;
      if (data?.session) await enterWorkspace(data.session); else showAuth();
    }).catch(showBootError);
    sb.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") showAuth();
      if (event === "TOKEN_REFRESHED" && session) state.session = session;
    });
  }


  function enterDemo() {
    state.demo = true;
    state.appSettings = {};
    const names = ["雷发润", "王丹", "胡昕怡", "梁茜"];
    state.profile = { id: "demo-manager", name: "雷发润", role: "创作者", login_name: "demo", active: true };
    state.profiles = names.map((name, i) => ({ id: `demo-${i}`, name, role: i === 0 ? "主管" : "组员", login_name: `demo${i}`, active: true }));
    state.currentBatch = { id: 1, week_no: 43, week_start: "2026-10-19", week_end: "2026-10-25", file_name: "本周Listing数据.xlsx", row_count: 12, is_current: true, status: "已生效", created_at: "2026-10-21T10:20:00+08:00" };
    state.batches = [state.currentBatch];
    const base = { country: "沙特阿拉伯", reviews: 18, fba_value: 1200, ad_rev: null, age_0_30: 10, age_31_60: 8, age_61_90: 5, age_91_180: 3, age_181_270: 1, age_271_330: 0, age_331_365: 0, age_365p: 0, price: 59.9, sale_price: 54.9 };
    const raw = [
      { ...base, asin: "B0DEMO0001", msku: "DEMO-001", fnsku: "X001", shop: "lontime", owner: "王丹", status: "在售", sales: 2, revenue: 110, refund_qty: 0, score: 4.5, fba_avail: 100, ad_spend: 12, ad_orders: 1, imp: 1000, clk: 10, acos: 0.36 },
      { ...base, asin: "B0DEMO0002", msku: "DEMO-002", fnsku: "X002", shop: "lumix", owner: "胡昕怡", status: "在售", sales: 0, revenue: 0, refund_qty: 0, score: 4.2, fba_avail: 10, ad_spend: 0, ad_orders: 0, imp: 0, clk: 0, acos: 0 },
      { ...base, asin: "B0DEMO0003", msku: "DEMO-003", fnsku: "X003", shop: "peakupo", owner: "梁茜", status: "在售", sales: 1, revenue: 55, refund_qty: 0, score: 4.1, fba_avail: 50, ad_spend: 20, ad_orders: 1, imp: 20000, clk: 10, acos: 0.32 },
      { ...base, asin: "B0DEMO0004", msku: "DEMO-004", fnsku: "X004", shop: "kulsa", owner: "王丹", status: "在售", sales: 1, revenue: 65, refund_qty: 0, score: 4.4, fba_avail: 50, ad_spend: 30, ad_orders: 1, imp: 22000, clk: 110, acos: 0.22 },
      { ...base, asin: "B0DEMO0005", msku: "DEMO-005", fnsku: "X005", shop: "banbole", owner: "胡昕怡", status: "在售", sales: 0, revenue: 0, refund_qty: 0, score: 4.8, fba_avail: 8, ad_spend: 6, ad_orders: 1, imp: 5000, clk: 20, acos: 0.12 },
      { ...base, asin: "B0DEMO0006", msku: "DEMO-006", fnsku: "X006", shop: "yadidi", owner: "梁茜", status: "在售", sales: 0, revenue: 0, refund_qty: 0, score: 4.0, fba_avail: 20, ad_spend: 0, ad_orders: 0, imp: 80, clk: 2 },
      { ...base, asin: "B0DEMO0007", msku: "DEMO-007", fnsku: "X007", shop: "lontime", owner: "王丹", status: "在售", sales: 0, revenue: 0, refund_qty: 0, score: 4.3, fba_avail: 30, ad_spend: 1, ad_orders: 0, imp: 300, clk: 7 },
      { ...base, asin: "B0DEMO0008", msku: "DEMO-008", fnsku: "X008", shop: "sharpe", owner: "胡昕怡", status: "在售", sales: 5, revenue: 250, refund_qty: 0, score: 4.6, fba_avail: 40, ad_spend: 20, ad_orders: 0, imp: 9000, clk: 50, acos: 0.5 },
      { ...base, asin: "B0DEMO0009", msku: "DEMO-009", fnsku: "X009", shop: "toybest", owner: "梁茜", status: "在售", sales: 8, revenue: 320, refund_qty: 3, refund_rate: 0.375, score: 4.2, fba_avail: 16, ad_spend: 8, ad_orders: 2, imp: 4800, clk: 55, acos: 0.18 },
      { ...base, asin: "B0DEMO0010", msku: "DEMO-010", fnsku: "X010", shop: "Trastore", owner: "王丹", status: "在售", sales: 12, revenue: 600, refund_qty: 0, score: 2.4, fba_avail: 12, ad_spend: 10, ad_orders: 3, imp: 5000, clk: 80, acos: 0.15 },
      { ...base, asin: "B0DEMO0011", msku: "DEMO-011", fnsku: "X011", shop: "lontime", owner: "胡昕怡", status: "在售", sales: 10, revenue: 520, refund_qty: 0, score: 4.7, fba_avail: 8, ad_spend: 5, ad_orders: 4, imp: 10000, clk: 100, acos: 0.08 },
      { ...base, asin: "B0DEMO0012", msku: "DEMO-012", fnsku: "X012", shop: "lumix", owner: "梁茜", status: "停售", sales: 0, revenue: 0, refund_qty: 0, score: 0, fba_avail: 18, ad_spend: 0, ad_orders: 0, imp: 0, clk: 0 }
    ];
    state.products = raw.map((row) => normalizeProduct({ ...row, issue_keys: [] }));
    state.actions = [
      { id: 11, batch_id: 1, msku: "DEMO-001", shop: "lontime", board: "show", action_type: "加预算", note: "日预算 8 → 15，新增 4 个高相关词，7 天后看展示是否达到 3 万。", expected_result: null, status: "已处理", user_name: "王丹", created_at: "2026-10-21T09:20:00+08:00", snapshot: { asin: "B0DEMO0001" } },
      { id: 12, batch_id: 1, msku: "DEMO-003", shop: "peakupo", board: "click", action_type: "换主图", note: "换第一张场景图，补充尺寸对比，先观察 7 天 CTR。", expected_result: null, status: "已处理", user_name: "梁茜", created_at: "2026-10-20T16:10:00+08:00", snapshot: { asin: "B0DEMO0003" } },
      { id: 13, batch_id: 1, msku: "DEMO-005", shop: "banbole", board: "c4", action_type: "报 DOTD", note: "报名 -10% DOTD，同时把库存降到 4 个月以内。", expected_result: null, status: "已处理", user_name: "胡昕怡", created_at: "2026-10-19T11:40:00+08:00", snapshot: { asin: "B0DEMO0005" } }
    ];
    const statsMap = new Map();
    state.products.forEach((p) => {
      const owner = p.owner || "未分配";
      const key = `${owner}|__all__`; statsMap.set(key, (statsMap.get(key) || new Set()).add(p._key));
      p.issueKeys.forEach((board) => { const k = `${owner}|${board}`; if (!statsMap.has(k)) statsMap.set(k, new Set()); statsMap.get(k).add(p._key); });
    });
    state.weeklyStats = [...statsMap.entries()].map(([key, set], idx) => { const [owner, board_key] = key.split("|"); return { id: idx + 1, batch_id: 1, week_no: 43, week_start: "2026-10-19", week_end: "2026-10-25", owner, board_key, assigned_count: set.size }; });
    state.weeklyAssignments = [
      { id: 1, batch_id: 1, week_no: 43, week_start: "2026-10-19", week_end: "2026-10-25", owner: "王丹", board_key: "sl_low", target_count: 10 },
      { id: 8, batch_id: 1, week_no: 43, week_start: "2026-10-19", week_end: "2026-10-25", owner: "王丹", board_key: "sl_mid", target_count: 10 },
      { id: 2, batch_id: 1, week_no: 43, week_start: "2026-10-19", week_end: "2026-10-25", owner: "王丹", board_key: "ad", target_count: 5 },
      { id: 3, batch_id: 1, week_no: 43, week_start: "2026-10-19", week_end: "2026-10-25", owner: "王丹", board_key: "needad", target_count: 10 },
      { id: 4, batch_id: 1, week_no: 43, week_start: "2026-10-19", week_end: "2026-10-25", owner: "胡昕怡", board_key: "show", target_count: 10 },
      { id: 5, batch_id: 1, week_no: 43, week_start: "2026-10-19", week_end: "2026-10-25", owner: "胡昕怡", board_key: "cvr", target_count: 5 },
      { id: 6, batch_id: 1, week_no: 43, week_start: "2026-10-19", week_end: "2026-10-25", owner: "梁茜", board_key: "click", target_count: 8 },
      { id: 7, batch_id: 1, week_no: 43, week_start: "2026-10-19", week_end: "2026-10-25", owner: "梁茜", board_key: "score", target_count: 3 }
    ];
    state.selectedWeekId = 1;
    $("#boot")?.classList.add("hidden"); $("#authScreen")?.classList.add("hidden"); $("#portal")?.classList.remove("hidden");
    renderChrome(); renderView();
  }
  function initStickyTableTools() {
    const content = $("#content");
    stickyTableObserver?.disconnect();
    if (content) {
      stickyTableObserver = new MutationObserver(() => {
        fixedHeaderSource = null;
        fixedHScrollSource = null;
        scheduleStickyTableUi();
      });
      stickyTableObserver.observe(content, { childList: true, subtree: true });
    }
    window.addEventListener("scroll", scheduleStickyTableUi, { passive: true });
    document.addEventListener("scroll", scheduleStickyTableUi, true);
    window.addEventListener("resize", scheduleStickyTableUi);
    $("#fixedTableHScroll")?.addEventListener("scroll", () => {
      if (fixedHScrollSource) fixedHScrollSource.scrollLeft = $("#fixedTableHScroll").scrollLeft;
      scheduleStickyTableUi();
    });
    scheduleStickyTableUi();
  }

  function scheduleStickyTableUi() {
    if (stickyTableFrame) return;
    stickyTableFrame = requestAnimationFrame(() => {
      stickyTableFrame = 0;
      updateStickyTableUi();
    });
  }

  function updateStickyTableUi() {
    const headerHost = $("#fixedTableHeader");
    const hscroll = $("#fixedTableHScroll");
    const spacer = $("#fixedTableHScrollSpacer");
    if (!headerHost || !hscroll || !spacer) return;

    const modalOpen = !$("#modal")?.classList.contains("hidden");
    const topOffset = $(".topbar")?.getBoundingClientRect().bottom || 0;
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    const candidates = $$("#content .table-scroll")
      .map((container) => ({ container, table: container.querySelector(".data-table") }))
      .filter((entry) => entry.table)
      .map((entry) => ({ ...entry, rect: entry.container.getBoundingClientRect() }))
      .filter((entry) => entry.rect.height > 0 && entry.rect.bottom > 0 && entry.rect.top < viewportHeight);

    const headerEntry = modalOpen ? null : candidates
      .filter((entry) => entry.rect.top < topOffset && entry.rect.bottom > topOffset + 1)
      .sort((a, b) => a.rect.top - b.rect.top)
      .pop();

    if (headerEntry) {
      const left = Math.max(0, Math.floor(headerEntry.rect.left));
      const right = Math.min(viewportWidth, Math.ceil(headerEntry.rect.right));
      if (right > left) {
        if (fixedHeaderSource !== headerEntry.container) {
          const clone = headerEntry.table.cloneNode(true);
          clone.querySelectorAll("tbody, tfoot").forEach((node) => node.remove());
          clone.style.width = `${headerEntry.table.getBoundingClientRect().width}px`;
          headerHost.replaceChildren(clone);
          fixedHeaderSource = headerEntry.container;
        }
        headerHost.style.left = `${left}px`;
        headerHost.style.top = `${Math.ceil(topOffset)}px`;
        headerHost.style.width = `${right - left}px`;
        headerHost.style.height = `${Math.ceil(headerEntry.table.querySelector("thead")?.getBoundingClientRect().height || 38)}px`;
        headerHost.scrollLeft = headerEntry.container.scrollLeft;
        headerHost.classList.remove("hidden");
      } else {
        headerHost.classList.add("hidden");
      }
    } else {
      fixedHeaderSource = null;
      headerHost.replaceChildren();
      headerHost.classList.add("hidden");
    }

    const scrollable = modalOpen ? [] : candidates
      .filter((entry) => entry.container.scrollWidth > entry.container.clientWidth + 1)
      .filter((entry) => entry.rect.bottom > topOffset && entry.rect.top < viewportHeight);
    const visibleHeight = (entry) => Math.max(0, Math.min(entry.rect.bottom, viewportHeight) - Math.max(entry.rect.top, topOffset));
    const horizontalEntry = headerEntry && scrollable.some((entry) => entry.container === headerEntry.container)
      ? headerEntry
      : scrollable.sort((a, b) => visibleHeight(b) - visibleHeight(a))[0];

    if (horizontalEntry) {
      const left = Math.max(0, Math.floor(horizontalEntry.rect.left));
      const right = Math.min(viewportWidth, Math.ceil(horizontalEntry.rect.right));
      if (right > left) {
        fixedHScrollSource = horizontalEntry.container;
        hscroll.style.left = `${left}px`;
        hscroll.style.width = `${right - left}px`;
        spacer.style.width = `${Math.max(horizontalEntry.container.scrollWidth, horizontalEntry.container.clientWidth)}px`;
        hscroll.scrollLeft = horizontalEntry.container.scrollLeft;
        hscroll.classList.remove("hidden");
        document.body.classList.add("table-hscroll-active");
      } else {
        fixedHScrollSource = null;
        hscroll.classList.add("hidden");
        document.body.classList.remove("table-hscroll-active");
      }
    } else {
      fixedHScrollSource = null;
      hscroll.classList.add("hidden");
      document.body.classList.remove("table-hscroll-active");
    }
  }

  function bindEvents() {
    $("#loginForm")?.addEventListener("submit", handleLogin);
    $("#forgotBtn")?.addEventListener("click", handleForgotPassword);
    $("#logoutBtn")?.addEventListener("click", logout);
    $("#menuLogoutBtn")?.addEventListener("click", logout);
    $("#refreshBtn")?.addEventListener("click", () => loadWorkspace(true));
    $("#mobileMenuBtn")?.addEventListener("click", () => $("#sidebar")?.classList.toggle("open"));
    $("#userChip")?.addEventListener("click", (event) => { event.stopPropagation(); $("#userMenu")?.classList.toggle("hidden"); });
    document.addEventListener("click", handleGlobalClick);
    document.addEventListener("change", handleGlobalChange);
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") { closeModal(); closeDrawer(); }
      const search = event.target.closest?.("[data-search-input]");
      if (search && event.key === "Enter") { event.preventDefault(); state.filters[search.dataset.searchInput] = search.value.trim(); state.page = 1; renderView(); }
    });
  }

  async function handleLogin(event) {
    event.preventDefault();
    const identifier = $("#loginEmail").value.trim();
    const email = usernameToEmail(identifier);
    const password = $("#loginPassword").value;
    const btn = $("#loginBtn");
    const errorEl = $("#loginError");
    errorEl.textContent = ""; btn.disabled = true; btn.textContent = "正在登录…";
    try {
      const { data, error } = await sb.auth.signInWithPassword({ email, password });
      if (error) throw error;
      await enterWorkspace(data.session);
    } catch (error) { errorEl.textContent = errorMessage(error); }
    finally { btn.disabled = false; btn.textContent = "登录"; }
  }

  async function handleForgotPassword() {
    const identifier = $("#loginEmail").value.trim();
    if (!identifier) { toast("请先填写用户名或邮箱", "error"); return; }
    if (!identifier.includes("@")) { toast("组员账号无法自行重置密码，请联系主管重置", "error"); return; }
    const email = identifier;
    try {
      const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: window.location.href });
      if (error) throw error;
      toast("重置密码邮件已发送，请检查邮箱", "success");
    } catch (error) { toast(errorMessage(error), "error"); }
  }

  function showAuth() {
    state.session = null; state.profile = null;
    $("#boot")?.classList.add("hidden"); $("#portal")?.classList.add("hidden");
    $("#authScreen")?.classList.remove("hidden"); $("#loginPassword").value = "";
  }

  async function logout() {
    try { await sb.auth.signOut(); } finally { state.products = []; state.actions = []; state.profiles = []; showAuth(); }
  }

  async function enterWorkspace(session) {
    state.session = session;
    const { data: profile, error } = await sb.from("profiles").select("*").eq("id", session.user.id).maybeSingle();
    if (error) throw error;
    if (!profile) throw new Error("账号资料尚未建立，请联系主管");
    if (!profile.active || profile.archived_at) throw new Error("账号已停用或归档，请联系创作者");
    state.profile = profile;
    $("#boot")?.classList.add("hidden"); $("#authScreen")?.classList.add("hidden"); $("#portal")?.classList.remove("hidden");
    await loadWorkspace();
  }

  async function loadWorkspace(showToast = false) {
    if (state.loading) return;
    setLoading(true); setSync("busy", "同步中");
    try {
      const [profilesResult, batchesData, weeklyData, actionsData, thresholdsData, assignmentsData, settingsData] = await Promise.all([
        sb.from("profiles").select("*").is("archived_at", null).order("name"),
        loadAllRows("import_batches", (query) => query.order("created_at", { ascending: true }).order("id", { ascending: true })),
        loadAllRows("weekly_issue_stats", (query) => query.order("id", { ascending: true })),
        loadAllRows("actions", (query) => query.order("id", { ascending: true })),
        loadAllRows("thresholds", (query) => query.order("id", { ascending: true })),
        loadAllRows("weekly_task_assignments", (query) => query.order("id", { ascending: true })),
        loadAllRows("app_settings", (query) => query.order("key", { ascending: true })).catch((error) => { console.warn("app_settings unavailable", error); return []; })
      ]);
      if (profilesResult.error) throw profilesResult.error;
      state.profiles = profilesResult.data || []; state.batches = (batchesData || []).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      state.weeklyStats = weeklyData || []; state.actions = (actionsData || []).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      state.thresholds = thresholdsData || []; state.weeklyAssignments = assignmentsData || [];
      state.appSettings = Object.fromEntries((settingsData || []).map((row) => [row.key, row.value]));
      if (state.appSettings.site_name) setCachedSiteName(state.appSettings.site_name);
      applySiteName();
      state.currentBatch = state.batches.find((batch) => batch.is_current) || state.batches[0] || null;
      state.selectedWeekId = state.selectedWeekId || state.currentBatch?.id || null;
      state.products = state.currentBatch ? await loadProducts(state.currentBatch.id) : [];
      state.loading = false; renderChrome(); renderView(); setSync("ok", "已同步");
      if (showToast) toast("数据已刷新", "success");
    } catch (error) {
      state.loading = false; setSync("error", "同步失败"); console.error(error);
      $("#content").innerHTML = `<div class="card"><div class="empty"><b>数据加载失败</b><span>${escapeHtml(errorMessage(error))}</span><button class="btn btn-primary" style="margin-top:16px" data-action="reload">重新加载</button></div></div>`;
      toast(errorMessage(error), "error");
    }
  }

  async function loadAllRows(table, configure) {
    const pageSize = 1000, rows = [];
    let from = 0;
    while (true) {
      let query = sb.from(table).select("*");
      if (configure) query = configure(query);
      const { data, error } = await query.range(from, from + pageSize - 1);
      if (error) throw error;
      const page = data || [];
      rows.push(...page);
      if (page.length < pageSize) break;
      from += page.length;
    }
    return rows;
  }
  async function loadProducts(batchId) {
    const pageSize = 1000;
    const { count, error: countError } = await sb.from("products")
      .select("id", { count: "exact", head: true })
      .eq("batch_id", batchId);
    if (countError) throw countError;
    const total = Number(count || 0);
    if (!total) return [];
    const starts = [];
    for (let offset = 0; offset < total; offset += pageSize) starts.push(offset);
    const rows = [];
    let cursor = 0;
    const workers = Array.from({ length: Math.min(6, starts.length) }, async () => {
      while (cursor < starts.length) {
        const index = cursor++;
        const { data, error } = await sb.from("products")
          .select(PRODUCT_SELECT)
          .eq("batch_id", batchId)
          .order("owner", { ascending: true })
          .order("id", { ascending: true })
          .range(starts[index], starts[index] + pageSize - 1);
        if (error) throw error;
        rows.push(...(data || []));
        setSync("busy", `读取产品 ${fmt(rows.length)} / ${fmt(total)}…`);
      }
    });
    await Promise.all(workers);
    return rows.map(normalizeProduct);
  }

  function renderChrome() {
    const profile = state.profile; if (!profile) return;
    applySiteName();
    $("#userAvatar").textContent = firstChar(profile.name); $("#userName").textContent = profile.name;
    $("#userRole").textContent = profile.role; $("#menuName").textContent = profile.name;
    $("#menuLogin").textContent = profile.login_name || state.session?.user?.email || "";
    $("#batchTitle").textContent = state.currentBatch ? `第 ${state.currentBatch.week_no} 周` : "尚未导入";
    $("#batchDates").textContent = state.currentBatch ? `${formatDate(state.currentBatch.week_start)} – ${formatDate(state.currentBatch.week_end)}` : "请先进入导入中心";
    $("#batchStatePill").textContent = state.currentBatch?.status || "无数据"; renderNav();
  }

  function renderNav() {
    const html = NAV_SECTIONS.map((section) => {
      const items = section.items.map((item) => {
        const active = item.view === state.view && (item.view !== "board" || item.board === state.board || (item.board === "slow" && state.board.startsWith("sl_"))) ? "active" : "";
        return `<button class="nav-item ${active} ${item.sub ? "sub" : ""}" data-nav="${item.view}" data-board="${item.board || ""}"><span class="nav-icon">${item.icon}</span><span class="nav-label">${escapeHtml(item.label)}</span><span class="nav-count">${navCount(item.view, item.board)}</span></button>`;
      }).join("");
      return `<div class="nav-section">${escapeHtml(section.title)}</div>${items}`;
    }).join("");
    $("#nav").innerHTML = html;
  }

  function navCount(view, board) {
    if (view === "dashboard") return "总";
    if (view === "products") return fmt(state.products.length);
    if (view === "board") return fmt(productsForBoard(board).length);
    if (view === "weekly") return fmt(state.actions.filter((a) => a.batch_id === state.currentBatch?.id && isWithinDays(a.created_at, 7)).length);
    if (view === "logs") return fmt(state.actions.length);
    if (view === "thresholds") return `${state.thresholds.length || 26}项`;
    if (view === "import") return state.currentBatch ? "周" : "!";
    return "";
  }

  function renderView() {
    if (state.loading) return; closeUserMenu();
    const titles = { dashboard: "总表数据看板", products: "总 Listing 数据", board: BOARD[state.board]?.label || "优化板块", weekly: "每周处理进度", logs: "处理记录", thresholds: "阈值与公式", import: "导入中心", settings: "账号与权限" };
    $("#crumbRoot").textContent = state.view === "board" || state.view === "products" ? "数据与优化" : titles[state.view] || "";
    $("#crumbPage").textContent = titles[state.view] || "";
    renderNav();
    if (state.view === "dashboard") return renderDashboard();
    if (state.view === "products") return renderProductList();
    if (state.view === "board") return renderBoard(state.board);
    if (state.view === "weekly") return renderWeekly();
    if (state.view === "logs") return renderLogs();
    if (state.view === "thresholds") return renderThresholds();
    if (state.view === "import") return renderImport();
    if (state.view === "settings") return renderSettings();
  }

  function setView(view, board = "") {
    state.view = view; if (view === "board" || view === "products") state.board = board || "all";
    state.filters = {}; state.page = 1; $("#sidebar")?.classList.remove("open");
    renderView(); window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function closeUserMenu() { $("#userMenu")?.classList.add("hidden"); }

  function handleGlobalClick(event) {
    const nav = event.target.closest("[data-nav]");
    if (nav) { setView(nav.dataset.nav, nav.dataset.board); return; }
    if (!event.target.closest("#userChip") && !event.target.closest("#userMenu")) closeUserMenu();
    if (event.target.matches("#modalBackdrop")) { closeModal(); return; }
    if (event.target.matches("#drawerBackdrop")) { closeDrawer(); return; }
    const phrase = event.target.closest("[data-phrase]");
    if (phrase) { insertPhrase(phrase.dataset.phrase); return; }
    const actionEl = event.target.closest("[data-action]");
    if (!actionEl) return;
    const action = actionEl.dataset.action;
    if (action === "sort-column") {
      state.sortKey = actionEl.dataset.sortKey || null;
      state.sortDir = actionEl.dataset.sortDir === "asc" ? "asc" : "desc";
      state.page = 1;
      renderView();
      return;
    }
    if (action === "reload") loadWorkspace(true);
    if (action === "open-action") openAction(actionEl.dataset.msku, actionEl.dataset.shop, actionEl.dataset.board);
    if (action === "open-profile") openProfile(actionEl.dataset.msku, actionEl.dataset.shop);
    if (action === "close-modal") closeModal();
    if (action === "close-drawer") closeDrawer();
    if (action === "submit-action") submitAction();
    if (action === "apply-search") { const input = $("[data-search-input]"); state.filters.q = input?.value.trim() || ""; state.page = 1; renderView(); }
    if (action === "clear-filters") { state.filters = {}; state.page = 1; renderView(); }
    if (action === "prev-page") { state.page = Math.max(1, state.page - 1); renderView(); }
    if (action === "next-page") { state.page += 1; renderView(); }
    if (action === "download-template") downloadTemplate();
    if (action === "confirm-import") confirmImport();
    if (action === "cancel-import") { state.pendingImport = null; renderView(); }
    if (action === "export-board") exportBoardCsv();
    if (action === "export-logs") exportActionsCsv();
    if (action === "open-clear-history") openClearHistoryModal();
    if (action === "confirm-clear-history") clearActionHistory();
    if (action === "export-weekly") exportWeeklyCsv();
    if (action === "save-profile") saveProfile(actionEl.dataset.id);
    if (action === "save-site-name") saveSiteName();
    if (action === "save-assignments") saveWeeklyAssignments();
    if (action === "save-thresholds") saveThresholds(false);
    if (action === "reset-thresholds") saveThresholds(true);
    if (action === "open-create-account") openCreateAccount();
    if (action === "create-account-submit") submitCreateAccount();
    if (action === "open-reset-password") openResetPassword(actionEl.dataset.id);
    if (action === "reset-password-submit") submitResetPassword(actionEl.dataset.id);
    if (action === "open-rename-username") openRenameUsername(actionEl.dataset.id);
    if (action === "rename-username-submit") submitRenameUsername(actionEl.dataset.id);
    if (action === "archive-account") archiveAccount(actionEl.dataset.id);
    if (action === "toggle-shop-all") { state.shopAll = !state.shopAll; renderView(); }
    if (action === "toggle-filter") { const key = actionEl.dataset.key; state.filters[key] = !state.filters[key]; state.page = 1; renderView(); }
    if (action === "open-batch-search") openBatchSearch();
    if (action === "apply-batch-search") applyBatchSearch();
    if (action === "clear-batch-search") { state.filters.batchVals = []; closeModal(); renderView(); }
    if (action === "open-columns") openColumnConfig();
    if (action === "save-columns") saveColumnConfig();
    if (action === "reset-columns") { state.hiddenCols = new Set(); localStorage.removeItem("portal-hidden-cols"); closeModal(); renderView(); }
    if (action === "logout") logout();
  }

  function handleGlobalChange(event) {
    const filter = event.target.closest("[data-filter]");
    if (filter) { state.filters[filter.dataset.filter] = filter.value; state.page = 1; renderView(); return; }
    const logFilter = event.target.closest("[data-log-filter]");
    if (logFilter) { state.logFilters[logFilter.dataset.logFilter] = logFilter.value; renderView(); return; }
    if (event.target.id === "weekBatchSelect") { state.selectedWeekId = Number(event.target.value); renderView(); return; }
    if (event.target.id === "importFile" && event.target.files?.[0]) handleImportFile(event.target.files[0]);
  }
  function thresholdRow(no) {
    return (state.thresholds || []).find((row) => Number(row.id) === Number(no));
  }

  function thresholdNumber(no, fallback) {
    const raw = thresholdRow(no)?.value ?? DEFAULT_THRESHOLD_VALUES[no] ?? fallback;
    const match = String(raw ?? "").match(/-?\d+(?:\.\d+)?/);
    const value = match ? Number(match[0]) : Number(fallback);
    return Number.isFinite(value) ? value : Number(fallback);
  }

  function thresholdParts(no, fallbacks) {
    const raw = thresholdRow(no)?.value ?? DEFAULT_THRESHOLD_VALUES[no] ?? fallbacks.join(" / ");
    const values = String(raw).match(/-?\d+(?:\.\d+)?/g)?.map(Number) || [];
    return fallbacks.map((fallback, index) => Number.isFinite(values[index]) ? values[index] : fallback);
  }

  function thresholdDisplayValue(row) {
    const value = row?.value;
    return value === null || value === undefined || String(value).trim() === "" ? "—" : String(value);
  }

  function recomputeAllProducts() {
    state.products = state.products.map((product) => normalizeProduct({ ...product, issue_keys: [] }));
  }

  function normalizeProduct(row) {
    const p = { ...row };
    const sales = num(p.sales), revenue = num(p.revenue), refundQty = num(p.refund_qty), fbaAvail = num(p.fba_avail);
    const adSpend = num(p.ad_spend), adOrders = num(p.ad_orders), imp = num(p.imp), clk = num(p.clk);
    let age0 = num(p.age_0_30), age31 = num(p.age_31_60), age61 = num(p.age_61_90), age91 = num(p.age_91_180);
    let age181 = num(p.age_181_270), age271 = num(p.age_271_330), age331 = num(p.age_331_365), age365p = num(p.age_365p);
    const hasSplitAge = [age0, age31, age61, age91, age181, age271, age331, age365p].some((value) => value > 0);
    if (!hasSplitAge) { age0 = num(p.age_0_60); age61 = num(p.age_61_90); age91 = num(p.age_91_180); age181 = num(p.age_180p); }
    const old60 = (age61 + age91 + age181 + age271 + age331 + age365p) || (num(p.age_61_90) + num(p.age_91_180) + num(p.age_180p));
    const old90 = (age91 + age181 + age271 + age331 + age365p) || (num(p.age_91_180) + num(p.age_180p));
    const old180 = (age181 + age271 + age331 + age365p) || num(p.age_180p);
    const old270 = age271 + age331 + age365p;
    const kxbLimit = Math.max(0.01, thresholdNumber(1, 4));
    const adOrderRatio = clamp(thresholdNumber(3, 40) / 100, 0.001, 0.99);
    const targetCvr = clamp(thresholdNumber(4, 5) / 100, 0.0001, 0.99);
    const targetCtr = clamp(thresholdNumber(5, 0.6) / 100, 0.00001, 0.99);
    const toleranceShow = thresholdNumber(6, 100) / 100;
    const toleranceClick = thresholdNumber(7, 100) / 100;
    const toleranceCvr = thresholdNumber(8, 100) / 100;
    const toleranceC4 = thresholdNumber(9, 100) / 100;
    const acosLimit = Math.max(0, thresholdNumber(15, 20) / 100);
    const slowLowMax = Math.max(0, thresholdNumber(18, 5));
    const slowMidParts = thresholdParts(19, [5, 10]);
    const slowHighStart = Math.max(slowLowMax + 0.001, slowMidParts[1]);
    const refundSevere = thresholdParts(22, [2, 30]);
    const refundHigh = thresholdParts(23, [2, 15]);
    const scoreLimit = Math.max(0, thresholdNumber(24, 3));
    const adSpendMin = Math.max(0, thresholdNumber(26, 5));
    const kxb = sales > 0 ? fbaAvail / sales : (fbaAvail > 0 ? 999 : 0);
    const needMo = fbaAvail > 0 ? Math.max(1, Math.ceil(fbaAvail / kxbLimit)) : 0;
    const needOrders = Math.round(needMo * adOrderRatio * 100) / 100;
    const needClk = Math.round(needOrders / targetCvr);
    const needImp = needClk > 0 ? Math.floor(needClk / targetCtr) : 0;
    const ctr = imp > 0 ? clk / imp : num(p.ctr);
    const cvr = clk > 0 ? adOrders / clk : num(p.cvr);
    const cpc = clk > 0 ? adSpend / clk : num(p.cpc);
    const adShare = sales > 0 ? adOrders / sales : num(p.ad_share);
    const unitPrice = num(p.sale_price) || num(p.price);
    const rawAcos = p.acos !== null && p.acos !== undefined ? num(p.acos) : 0;
    const acos = rawAcos > 0 ? rawAcos : (adOrders > 0 && unitPrice > 0 ? adSpend / (adOrders * unitPrice) : 0);
    const acoas = revenue > 0 ? adSpend / revenue : num(p.acoas);
    const roas = num(p.roas);
    const refundRate = num(p.refund_rate) || (sales > 0 ? refundQty / sales : 0);
    const status = p.status || "";
    const needad = status === "在售" && fbaAvail >= 1 && adSpend <= 0 && imp <= 0;
    let cat = "";
    if (fbaAvail > 0 && kxb > kxbLimit) {
      if (needad) cat = "needad";
      else if (imp < needImp * toleranceShow) cat = "show";
      else if (clk < needClk * toleranceClick) cat = "click";
      else if (adOrders < needOrders * toleranceCvr) cat = "cvr";
      else if (sales < needMo * toleranceC4) cat = "c4";
    }
    let slowType = "";
    if (fbaAvail > 0 && sales <= 0) slowType = clk < slowLowMax ? "sl_low" : clk < slowHighStart ? "sl_mid" : "sl_high";
    let refundFlag = "";
    if (refundQty >= refundSevere[0] && refundRate > refundSevere[1] / 100) refundFlag = "severe";
    else if (refundQty >= refundHigh[0] && refundRate > refundHigh[1] / 100) refundFlag = "high";
    const issueKeys = [];
    if (needad) issueKeys.push("needad"); else if (cat) issueKeys.push(cat);
    if (slowType) issueKeys.push(slowType);
    if (adSpend > adSpendMin && (acos > acosLimit || adOrders <= 0)) issueKeys.push("ad");
    if (refundFlag) issueKeys.push("refund");
    if (num(p.score) > 0 && num(p.score) < scoreLimit) issueKeys.push("score");
    return { ...p, sales, revenue, refund_qty: refundQty, refund_rate: refundRate, score: num(p.score), reviews: num(p.reviews), fba_avail: fbaAvail, fba_value: num(p.fba_value), ad_spend: adSpend, ad_orders: adOrders, imp, clk, price: num(p.price), sale_price: num(p.sale_price), age0, age31, age61, age91, age181, age271, age331, age365p, old60, old90, old180, old270, kxb, needMo, needOrders, needClk, needImp, ctr, cvr, cpc, roas, acos, acoas, adShare, refundFlag, slowType, needad, cat, issueKeys: [...new Set(issueKeys)], _key: `${p.shop || ""}::${p.msku || ""}` };
  }

  function hasIssue(p, key) {
    if (key === "slow") return (p.issueKeys || []).some((k) => k.startsWith("sl_"));
    return (p.issueKeys || []).includes(key);
  }
  function productsForBoard(boardKey) {
    if (!boardKey || boardKey === "all") return state.products;
    return state.products.filter((product) => hasIssue(product, boardKey));
  }
  function issueTagHtml(product, limit = 2) {
    const keys = product.issueKeys.slice(0, limit);
    if (!keys.length) return `<span class="pill pill-green">达标</span>`;
    return keys.map((key) => `<span class="pill" style="background:${BOARD[key]?.color || "#647187"}14;color:${BOARD[key]?.color || "#647187"}">${escapeHtml(BOARD[key]?.label || key)}</span>`).join("");
  }

  function dashboardBoardProducts(products, key) {
    if (key === "slow_total") return products.filter((p) => p.issueKeys.some((k) => k.startsWith("sl_")));
    if (key === "refund_total") return products.filter((p) => p.issueKeys.includes("refund"));
    return products.filter((p) => p.issueKeys.includes(key));
  }

  function buildDashboardData(products) {
    const total = products.length;
    const totalStock = products.reduce((sum, p) => sum + p.fba_avail, 0);
    const totalValue = products.reduce((sum, p) => sum + p.fba_value, 0);
    const totalSales = products.reduce((sum, p) => sum + p.sales, 0);
    const totalRevenue = products.reduce((sum, p) => sum + p.revenue, 0);
    const totalRefund = products.reduce((sum, p) => sum + p.refund_qty, 0);
    const totalAdSpend = products.reduce((sum, p) => sum + p.ad_spend, 0);
    const totalAdRevenue = products.reduce((sum, p) => {
      if (num(p.ad_rev) > 0) return sum + num(p.ad_rev);
      if (p.ad_spend > 0 && p.acos > 0) return sum + p.ad_spend / p.acos;
      const unitPrice = num(p.sale_price) || num(p.price);
      if (p.ad_orders > 0 && unitPrice > 0) return sum + p.ad_orders * unitPrice;
      return sum;
    }, 0);
    const ageItems = AGE_BUCKETS.map((bucket) => ({ ...bucket, l: bucket.label, c: bucket.color, v: products.reduce((sum, p) => sum + num(p[bucket.key]), 0) }));
    const ageTotal = ageItems.reduce((sum, item) => sum + item.v, 0);
    const gt180 = ageItems.filter((item) => ["age181", "age271", "age331", "age365p"].includes(item.key)).reduce((sum, item) => sum + item.v, 0);
    const onsale = products.filter((p) => p.status === "在售").length;
    const offsale = total - onsale;
    const stockOnsale = products.filter((p) => p.status === "在售" && p.fba_avail > 0);
    const ordered = stockOnsale.filter((p) => p.sales > 0).length;
    const slowCount = products.filter((p) => p.issueKeys.some((k) => k.startsWith("sl_"))).length;
    const boxes = ["show", "needad", "click", "cvr", "c4", "slow_total", "sl_low", "sl_mid", "sl_high", "ad", "refund_total", "score"].map((key) => {
      const rows = dashboardBoardProducts(products, key);
      return { key, count: rows.length, stock: rows.reduce((sum, p) => sum + p.fba_avail, 0), value: rows.reduce((sum, p) => sum + p.fba_value, 0) };
    });
    const shops = Object.entries(products.reduce((map, p) => { const key = p.shop || "未填写"; map[key] = (map[key] || 0) + 1; return map; }, {})).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
    const owners = Object.entries(products.reduce((map, p) => { const key = p.owner || "未分配"; map[key] = (map[key] || 0) + 1; return map; }, {})).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
    const countries = Object.entries(products.reduce((map, p) => { const key = p.country || "未填写"; map[key] = (map[key] || 0) + 1; return map; }, {})).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
    return {
      total, totalStock, totalValue, totalSales, totalRevenue, totalRefund, totalAdSpend, totalAdRevenue,
      avgPrice: totalSales > 0 ? totalRevenue / totalSales : 0,
      kxb: totalSales > 0 ? totalStock / totalSales : (totalStock > 0 ? 999 : 0),
      acos: totalAdRevenue > 0 ? totalAdSpend / totalAdRevenue : 0,
      acoas: totalRevenue > 0 ? totalAdSpend / totalRevenue : 0,
      refundRate: totalSales > 0 ? totalRefund / totalSales : 0,
      rateOnsaleStock: stockOnsale.length > 0 ? ordered / stockOnsale.length : 0,
      onsale, offsale, slowCount, ageItems, ageTotal, gt180, boxes, shops, owners, countries
    };
  }

  function donutSvg(items, center, sub, size = 154) {
    const radius = 52, stroke = 19, circumference = 2 * Math.PI * radius, cx = size / 2, cy = size / 2;
    const total = items.reduce((sum, item) => sum + Number(item.v || 0), 0) || 1;
    let offset = 0;
    let segments = "";
    items.forEach((item) => {
      const length = Number(item.v || 0) / total * circumference;
      if (item.v > 0) {
        segments += `<circle cx="${cx}" cy="${cy}" r="${radius}" fill="none" stroke="${item.c}" stroke-width="${stroke}" stroke-dasharray="${length.toFixed(2)} ${(circumference - length).toFixed(2)}" stroke-dashoffset="${(-offset).toFixed(2)}" transform="rotate(-90 ${cx} ${cy})"><title>${escapeHtml(item.l)}：${fmt(item.v)}</title></circle>`;
      }
      offset += length;
    });
    return `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" style="flex:none"><circle cx="${cx}" cy="${cy}" r="${radius}" fill="none" stroke="#eef1f6" stroke-width="${stroke}"></circle>${segments}<text x="${cx}" y="${cy - 1}" text-anchor="middle" font-size="15" font-weight="700" fill="#172033">${escapeHtml(center)}</text><text x="${cx}" y="${cy + 16}" text-anchor="middle" font-size="10" fill="#7b879b">${escapeHtml(sub || "")}</text></svg>`;
  }

  function chartLegend(items, total, unit = "") {
    const safeTotal = total || 1;
    return `<div class="chart-legend">${items.map((item) => `<div class="chart-legend-row"><span class="chart-dot" style="background:${item.c}"></span><span class="chart-legend-label" title="${attr(item.l)}">${escapeHtml(item.l)}</span><span class="chart-legend-value">${fmt(item.v)}${unit}</span><span class="chart-legend-pct">${(item.v / safeTotal * 100).toFixed(1)}%</span></div>`).join("")}</div>`;
  }

  function dashboardBar(label, value, max, color, pctText, valueText) {
    return `<div class="dashboard-bar"><span class="dashboard-bar-label" title="${attr(label)}">${escapeHtml(label)}</span><div class="progress"><i style="width:${max ? (value / max * 100).toFixed(1) : 0}%;background:${color}"></i></div><span class="dashboard-bar-value">${valueText}</span><span class="dashboard-bar-pct">${pctText}</span></div>`;
  }

  function dashboardMetricCell(value, total) {
    return `<span class="${value ? "metric-present" : "muted"}">${value ? fmt(value) : "-"}</span><small>${total ? (value / total * 100).toFixed(1) + "%" : "0.0%"}</small>`;
  }

  function renderDashboard() {
    const dashboard = buildDashboardData(state.products);
    const boardRows = [
      { key: "show", label: "1. 展示量差的" }, { key: "needad", label: "1.1 需开广告" },
      { key: "click", label: "2. 点击率差的" }, { key: "cvr", label: "3. 转化率差的" },
      { key: "c4", label: "4. 自然流量偏低" }, { key: "slow_total", label: "5. 滞销品优化" },
      { key: "sl_low", label: "5.1 低潜力" }, { key: "sl_mid", label: "5.2 中潜力" }, { key: "sl_high", label: "5.3 高潜力" },
      { key: "ad", label: "6. 广告无效花费" }, { key: "refund_total", label: "7. 高退货率" }, { key: "score", label: "8. 低评分优化" }
    ];
    const boxMap = new Map(dashboard.boxes.map((item) => [item.key, item]));
    const nMax = Math.max(1, ...dashboard.boxes.map((item) => item.count));
    const valueItems = boardRows.filter((row) => row.key !== "slow_total").map((row, index) => ({ l: row.label, v: boxMap.get(row.key)?.value || 0, c: DASH_PALETTE[index % DASH_PALETTE.length] }));
    const shopShown = state.shopAll ? dashboard.shops : dashboard.shops.slice(0, 8);
    const shopMax = Math.max(1, ...dashboard.shops.map((item) => item.value));
    const countryMax = Math.max(1, ...dashboard.countries.map((item) => item.value));
    const stack = dashboard.ageItems.map((item) => {
      const pct = dashboard.ageTotal ? item.v / dashboard.ageTotal * 100 : 0;
      return `<div title="${item.label} ${fmt(item.v)} 件 ${pct.toFixed(1)}%" style="width:${pct.toFixed(2)}%;background:${item.color}">${pct >= 7 ? `<span>${pct.toFixed(0)}%</span>` : ""}</div>`;
    }).join("");
    const people = dashboard.owners.slice();
    const efficiencyRows = dashboard.owners.map((person) => {
      const ownProducts = state.products.filter((p) => (p.owner || "未分配") === person.label);
      const cells = boardRows.map((board) => `<td class="num">${dashboardMetricCell(dashboardBoardProducts(ownProducts, board.key).length, ownProducts.length)}</td>`).join("");
      return `<tr><td><b>${escapeHtml(person.label)}</b></td><td class="num"><b>${fmt(person.value)}</b></td><td class="num muted">${(person.value / Math.max(dashboard.total, 1) * 100).toFixed(1)}%</td>${cells}</tr>`;
    }).join("");
    const totalAgeText = fmt(dashboard.ageTotal);
    $("#content").innerHTML = `
      <div class="page-head"><div><h1>总表数据看板</h1><p>${state.currentBatch ? `${weekText(state.currentBatch)} · 当前批次已生效` : "等待主管导入第一份周数据"}</p></div><div class="page-actions"><span class="pill pill-blue">${escapeHtml(state.profile.role)}</span><span class="pill pill-green">数据实时同步</span></div></div>
      <section class="ksec"><div class="ksec-title">规模与销售</div><div class="kpi-grid dash-kpi-grid">
        <div class="kpi blue"><div class="kpi-label">FBA 货值合计</div><div class="kpi-value">¥${fmt(dashboard.totalValue)}</div><div class="kpi-sub">全部产品</div></div>
        <div class="kpi"><div class="kpi-label">FBA 可售库存</div><div class="kpi-value">${fmt(dashboard.totalStock)} 件</div><div class="kpi-sub">占总库存 ${dashboard.ageTotal ? (dashboard.totalStock / dashboard.ageTotal * 100).toFixed(1) : "0.0"}%</div></div>
        <div class="kpi blue"><div class="kpi-label">近30天总销量</div><div class="kpi-value">${fmt(dashboard.totalSales)} 件</div><div class="kpi-sub">客单价 ¥${dashboard.avgPrice.toFixed(0)}</div></div>
        <div class="kpi blue"><div class="kpi-label">近30天总销售额</div><div class="kpi-value">¥${fmt(Math.round(dashboard.totalRevenue))}</div><div class="kpi-sub">实际销售额</div></div>
      </div></section>
      <section class="ksec"><div class="ksec-title">效率与质量</div><div class="kpi-grid dash-kpi-grid five">
        <div class="kpi orange"><div class="kpi-label">出单率</div><div class="kpi-value">${(dashboard.rateOnsaleStock * 100).toFixed(1)}%</div><div class="kpi-sub">每 ${Math.max(2, Math.round(1 / (dashboard.rateOnsaleStock || 1)))} 款里 1 款出单</div></div>
        <div class="kpi green"><div class="kpi-label">FBA 库销比</div><div class="kpi-value">${dashboard.kxb >= 900 ? "∞" : dashboard.kxb.toFixed(2)} 个月</div><div class="kpi-sub">${dashboard.kxb <= thresholdNumber(1, 4) ? `健康（低于 ${thresholdNumber(1, 4)} 个月）` : `高于健康线 ${thresholdNumber(1, 4)} 个月`}</div></div>
        <div class="kpi red"><div class="kpi-label">总 ACOS</div><div class="kpi-value">${(dashboard.acos * 100).toFixed(2)}%</div><div class="kpi-sub">${dashboard.acos > thresholdNumber(15, 20) / 100 ? `高于警戒线 ${thresholdNumber(15, 20)}%` : `低于警戒线 ${thresholdNumber(15, 20)}%`}</div></div>
        <div class="kpi"><div class="kpi-label">总 ACoAS</div><div class="kpi-value">${(dashboard.acoas * 100).toFixed(2)}%</div><div class="kpi-sub">广告费占销售额</div></div>
        <div class="kpi orange"><div class="kpi-label">总退货率</div><div class="kpi-value">${(dashboard.refundRate * 100).toFixed(2)}%</div><div class="kpi-sub">每 ${Math.max(2, Math.round(1 / (dashboard.refundRate || 1)))} 单退 1 单</div></div>
      </div></section>
      <section class="ksec"><div class="ksec-title">状态与风险</div><div class="kpi-grid dash-kpi-grid">
        <div class="kpi green"><div class="kpi-label">在售</div><div class="kpi-value">${fmt(dashboard.onsale)} 款</div><div class="kpi-sub">占全部 ${(dashboard.onsale / Math.max(dashboard.total, 1) * 100).toFixed(1)}%</div></div>
        <div class="kpi red"><div class="kpi-label">停售</div><div class="kpi-value">${fmt(dashboard.offsale)} 款</div><div class="kpi-sub">占全部 ${(dashboard.offsale / Math.max(dashboard.total, 1) * 100).toFixed(1)}%</div></div>
        <div class="kpi orange"><div class="kpi-label">滞销品</div><div class="kpi-value">${fmt(dashboard.slowCount)} 款</div><div class="kpi-sub">占全部 ${(dashboard.slowCount / Math.max(dashboard.total, 1) * 100).toFixed(1)}%</div></div>
        <div class="kpi red"><div class="kpi-label">库龄 > 180 天</div><div class="kpi-value">${fmt(dashboard.gt180)} 件</div><div class="kpi-sub">占总库存 ${(dashboard.gt180 / Math.max(dashboard.ageTotal, 1) * 100).toFixed(1)}%</div></div>
      </div></section>
      <section class="card dashboard-section"><div class="card-head"><div><h2>FBA 库龄分布（共 ${totalAgeText} 件）</h2><p>按 8 个库龄段统计库存件数</p></div></div><div class="card-body"><div class="chart-row">${donutSvg(dashboard.ageItems, `${totalAgeText} 件`, "总库存", 150)}${chartLegend(dashboard.ageItems, dashboard.ageTotal, " 件")}</div><div class="stack-bar">${stack || `<div class="empty">暂无库龄数据</div>`}</div></div></section>
      <div class="dashboard-grid dashboard-chart-grid"><section class="card"><div class="card-head"><div><h2>各板块款数（共 ${fmt(dashboard.total)} 款）</h2><p>同一产品可能命中多个板块</p></div></div><div class="card-body">${boardRows.map((row, index) => { const item = boxMap.get(row.key); return dashboardBar(row.label, item.count, nMax, DASH_PALETTE[index % DASH_PALETTE.length], (item.count / Math.max(dashboard.total, 1) * 100).toFixed(1) + "%", `${fmt(item.count)} 款`); }).join("")}</div></section><section class="card"><div class="card-head"><div><h2>各板块 FBA 货值（共 ¥${fmt(dashboard.totalValue)}）</h2><p>按板块归集货值，产品可重复计入</p></div></div><div class="card-body"><div class="chart-row">${donutSvg(valueItems, `¥${Math.round(dashboard.totalValue / 1000)}k`, "FBA 总货值", 150)}${chartLegend(valueItems, dashboard.totalValue)}</div></div></section></div>
      <div class="dashboard-grid dashboard-chart-grid"><section class="card"><div class="card-head"><div><h2>在售 / 停售 占比</h2><p>按 Listing 状态统计</p></div></div><div class="card-body"><div class="chart-row">${donutSvg([{ l: "在售", v: dashboard.onsale, c: "#12a150" }, { l: "停售", v: dashboard.offsale, c: "#e5484d" }], fmt(dashboard.total), "产品款数", 150)}${chartLegend([{ l: "在售", v: dashboard.onsale, c: "#12a150" }, { l: "停售", v: dashboard.offsale, c: "#e5484d" }], dashboard.total, " 款")}</div><h3 class="subhead">国家 / 站点占比</h3>${dashboard.countries.map((item, index) => dashboardBar(item.label, item.value, countryMax, ["#2f6fed", "#7c4dff"][index % 2], (item.value / Math.max(dashboard.total, 1) * 100).toFixed(1) + "%", `${fmt(item.value)} 款`)).join("")}</div></section><section class="card"><div class="card-head"><div><h2>店铺分布（共 ${fmt(dashboard.total)} 款）</h2><p>按当前批次产品数统计</p></div><button class="link-btn" data-action="toggle-shop-all">${state.shopAll ? "收起" : "展开全部"}</button></div><div class="card-body">${shopShown.map((item, index) => dashboardBar(item.label, item.value, shopMax, DASH_PALETTE[index % DASH_PALETTE.length], (item.value / Math.max(dashboard.total, 1) * 100).toFixed(1) + "%", `${fmt(item.value)} 款`)).join("")}${dashboard.shops.length > 8 ? `<button class="expand-link" data-action="toggle-shop-all">${state.shopAll ? "收起 ▴" : `展开全部 ${dashboard.shops.length} 个店铺 ▾`}</button>` : ""}</div></section></div>
      <section class="card dashboard-section"><div class="card-head"><div><h2>人效（每人名下各板块数量）</h2><p>看每个人负责的产品在各优化板块的分布</p></div></div><div class="card-body table-scroll"><table class="dense dashboard-table"><thead><tr><th>负责人</th><th class="num">全部产品</th><th class="num">占比</th>${boardRows.map((row) => `<th class="num">${escapeHtml(row.label)}</th>`).join("")}</tr></thead><tbody>${efficiencyRows || `<tr><td colspan="${boardRows.length + 3}"><div class="empty">暂无负责人数据</div></td></tr>`}</tbody></table></div></section>`;
  }
  function computeTeamProgress(batchId, products) {
    if (!batchId) return [];
    const stats = state.weeklyStats.filter((s) => s.batch_id === batchId);
    const batchActions = state.actions.filter((a) => a.batch_id === batchId);
    const ownerSet = new Set();
    if (isManagementRole(state.profile?.role)) state.profiles.forEach((p) => ownerSet.add(p.name));
    stats.forEach((s) => ownerSet.add(s.owner)); products.forEach((p) => { if (p.owner) ownerSet.add(p.owner); });
    batchActions.forEach((a) => { if (a.user_name) ownerSet.add(a.user_name); });
    return [...ownerSet].filter(Boolean).map((owner) => {
      let assigned = stats.find((s) => s.owner === owner && s.board_key === "__all__")?.assigned_count || 0;
      if (state.currentBatch && Number(state.currentBatch.id) === Number(batchId)) assigned = new Set(products.filter((p) => p.owner === owner && p.issueKeys.length).map((p) => p._key)).size;
      const ownActions = batchActions.filter((a) => a.user_name === owner);
      const covered = new Set(batchActions.filter((a) => (a.snapshot?.owner || a.user_name) === owner && a.msku && a.shop).map((a) => `${a.shop}::${a.msku}`)).size;
      return { owner, assigned, covered, actions: ownActions.length, completion: assigned > 0 ? clamp(covered / assigned * 100, 0, 100) : 0, lastAction: ownActions[0]?.created_at || null };
    }).filter((x) => x.assigned > 0 || x.actions > 0).sort((a, b) => b.assigned - a.assigned || a.owner.localeCompare(b.owner, "zh-CN"));
  }

  function sortProducts(rows) {
    if (!state.sortKey) return rows;
    const direction = state.sortDir === "asc" ? 1 : -1;
    const valueFor = (product, key) => key === "issue" ? (product.issueKeys?.length || 0) : product[key];
    return rows.map((row, index) => ({ row, index })).sort((a, b) => {
      const aValue = valueFor(a.row, state.sortKey);
      const bValue = valueFor(b.row, state.sortKey);
      const aEmpty = aValue === null || aValue === undefined || aValue === "";
      const bEmpty = bValue === null || bValue === undefined || bValue === "";
      if (aEmpty !== bEmpty) return aEmpty ? 1 : -1;
      if (aEmpty && bEmpty) return a.index - b.index;
      let comparison;
      if (PRODUCT_NUMERIC_KEYS.has(state.sortKey) || (typeof aValue === "number" && typeof bValue === "number")) {
        comparison = Number(aValue || 0) - Number(bValue || 0);
      } else {
        comparison = String(aValue).localeCompare(String(bValue), "zh-CN", { numeric: true, sensitivity: "base" });
      }
      return comparison ? comparison * direction : a.index - b.index;
    }).map((entry) => entry.row);
  }

  function renderProductList() { renderBoardLike("all"); }
  function renderBoard(boardKey) { renderBoardLike(boardKey); }

  function currentFilters() {
    state.filters = state.filters || {};
    const f = state.filters;
    f.field = f.field || "MSKU";
    f.mode = f.mode || "精确";
    f.batchField = f.batchField || f.field;
    f.batchVals = Array.isArray(f.batchVals) ? f.batchVals : [];
    return f;
  }

  function filterValue(product, field) {
    if (field === "ASIN") return product.asin || "";
    if (field === "FNSKU") return product.fnsku || "";
    if (field === "SKU") return product.sku || "";
    return product.msku || "";
  }

  function filtersAreActive(f) {
    return Boolean(f.q || f.country || f.shop || f.owner || f.stock || f.onsale || f.issue || f.slowType || f.ageBand || f.refundLevel || f.batchVals?.length || f.status);
  }

  function agedUnits(product, days) {
    const ranges = [[30, product.age0], [60, product.age31], [90, product.age61], [180, product.age91], [270, product.age181], [330, product.age271], [365, product.age331], [Infinity, product.age365p]];
    return ranges.filter(([upper]) => upper > Number(days)).reduce((sum, [, value]) => sum + num(value), 0);
  }

  function filteredProducts(boardKey) {
    const f = currentFilters();
    const q = String(f.q || "").trim().toUpperCase();
    const batchVals = (f.batchVals || []).map((value) => String(value || "").trim().toUpperCase()).filter(Boolean);
    const baseRows = boardKey === "slow" && f.slowType === "none" ? state.products : productsForBoard(boardKey);
    return baseRows.filter((p) => {
      if (q) {
        const value = String(filterValue(p, f.field)).toUpperCase();
        if (f.mode === "精确" ? value !== q : !value.includes(q)) return false;
      }
      if (batchVals.length) {
        const value = String(filterValue(p, f.batchField || f.field)).toUpperCase();
        if (!batchVals.includes(value)) return false;
      }
      if (f.country && p.country !== f.country) return false;
      if (f.shop && p.shop !== f.shop) return false;
      if (f.owner && p.owner !== f.owner) return false;
      if (f.status && p.status !== f.status) return false;
      if (f.stock && p.fba_avail <= 0) return false;
      if (f.onsale && p.status !== "在售") return false;
      if (f.issue === "none" && p.cat) return false;
      if (f.issue && f.issue !== "none" && p.cat !== f.issue) return false;
      if (f.slowType === "none" && p.slowType) return false;
      if (f.slowType && f.slowType !== "none" && p.slowType !== f.slowType) return false;
      if (f.ageBand && agedUnits(p, Number(f.ageBand)) <= 0) return false;
      if (f.refundLevel && p.refundFlag !== f.refundLevel) return false;
      return true;
    });
  }

  function selectOptions(values, selected) {
    return values.map((value) => `<option value="${attr(value)}" ${String(selected || "") === String(value) ? "selected" : ""}>${escapeHtml(value)}</option>`).join("");
  }

  function searchCombo(f) {
    return `<div class="search-combo"><select data-filter="field">${selectOptions(["ASIN", "MSKU", "FNSKU"], f.field || "MSKU")}</select><select data-filter="mode">${selectOptions(["精确", "模糊"], f.mode || "精确")}</select><input data-search-input="q" value="${attr(f.q || "")}" placeholder="输入${f.mode === "精确" ? "完整" : "关键字"} ${escapeHtml(f.field || "MSKU")}"><button data-action="apply-search" title="搜索">⌕</button></div>`;
  }

  function boardFilterBar(boardKey, rows) {
    const f = currentFilters();
    const shops = [...new Set(state.products.map((p) => p.shop).filter(Boolean))].sort();
    const owners = [...new Set([...state.products.map((p) => p.owner).filter(Boolean), ...state.actions.map((a) => a.user_name).filter(Boolean)])].sort((a, b) => a.localeCompare(b, "zh-CN"));
    const countries = [...new Set(state.products.map((p) => p.country).filter(Boolean))].sort();
    const active = filtersAreActive(f);
    let specific = "";
    if (boardKey === "all") {
      specific += `<select data-filter="issue"><option value="">问题定位：全部</option><option value="show" ${f.issue === "show" ? "selected" : ""}>① 展示量差</option><option value="needad" ${f.issue === "needad" ? "selected" : ""}>1.1 需开广告</option><option value="click" ${f.issue === "click" ? "selected" : ""}>② 点击率差</option><option value="cvr" ${f.issue === "cvr" ? "selected" : ""}>③ 转化率差</option><option value="c4" ${f.issue === "c4" ? "selected" : ""}>④ 自然流量偏低</option><option value="none" ${f.issue === "none" ? "selected" : ""}>合格</option></select>`;
      specific += `<select data-filter="slowType"><option value="">滞销类型：全部</option><option value="none" ${f.slowType === "none" ? "selected" : ""}>A 非滞销</option><option value="sl_low" ${f.slowType === "sl_low" ? "selected" : ""}>B 低潜力</option><option value="sl_mid" ${f.slowType === "sl_mid" ? "selected" : ""}>C 中潜力</option><option value="sl_high" ${f.slowType === "sl_high" ? "selected" : ""}>D 高潜力</option></select>`;
    }
    if (boardKey === "slow") {
      specific += `<select data-filter="slowType"><option value="">滞销类型：全部</option><option value="none" ${f.slowType === "none" ? "selected" : ""}>A 非滞销</option><option value="sl_low" ${f.slowType === "sl_low" ? "selected" : ""}>B 低潜力</option><option value="sl_mid" ${f.slowType === "sl_mid" ? "selected" : ""}>C 中潜力</option><option value="sl_high" ${f.slowType === "sl_high" ? "selected" : ""}>D 高潜力</option></select>`;
    }
    if (boardKey === "slow" || boardKey.startsWith("sl_")) {
      const ageBands = thresholdParts(21, [60, 90, 180, 270]);
      specific += `<select data-filter="ageBand"><option value="">库龄：不限</option>${ageBands.map((days) => `<option value="${days}" ${String(f.ageBand) === String(days) ? "selected" : ""}>库龄 > ${days} 天</option>`).join("")}</select>`;
    }
    if (boardKey === "refund") {
      specific += `<select data-filter="refundLevel"><option value="">退款等级：全部</option><option value="severe" ${f.refundLevel === "severe" ? "selected" : ""}>退款率很严重 (>30%)</option><option value="high" ${f.refundLevel === "high" ? "selected" : ""}>退款率高 (15%-30%)</option></select>`;
    }
    return `<div class="filter-bar prototype-filter-bar">${searchCombo(f)}<button class="btn btn-sm" data-action="open-batch-search">批量搜索${f.batchVals.length ? ` (${f.batchVals.length})` : ""}</button><select data-filter="country"><option value="">国家：全部</option>${selectOptions(countries, f.country)}</select><select data-filter="shop"><option value="">店铺：全部</option>${selectOptions(shops, f.shop)}</select><select data-filter="owner"><option value="">负责人：全部</option>${selectOptions(owners, f.owner)}</select>${specific}<button class="chip-button ${f.stock ? "on" : ""}" data-action="toggle-filter" data-key="stock">有库存</button><button class="chip-button ${f.onsale ? "on" : ""}" data-action="toggle-filter" data-key="onsale">在售</button><button class="btn btn-sm" data-action="open-columns">列配置</button><button class="btn btn-sm" data-action="export-board">导出</button>${active ? `<button class="chip-button on" data-action="clear-filters">清除筛选 ✕</button>` : ""}<span class="filter-count">${fmt(rows.length)} 条</span></div>`;
  }

  function renderProductList() { renderBoardLike("all"); }
  function renderBoard(boardKey) { renderBoardLike(boardKey); }

  function renderBoardLike(boardKey) {
    const meta = boardKey === "all" ? { label: "总 Listing 数据", desc: "查看当前批次全部产品，按商品、店铺、负责人和问题定位筛选。", formula: "当前批次全部产品明细" } : BOARD[boardKey];
    const rows = sortProducts(filteredProducts(boardKey));
    const totalPages = Math.max(1, Math.ceil(rows.length / state.pageSize));
    if (state.page > totalPages) state.page = totalPages;
    const pageRows = rows.slice((state.page - 1) * state.pageSize, state.page * state.pageSize);
    const stockCount = rows.filter((p) => p.fba_avail > 0).length;
    const stockValue = rows.reduce((sum, p) => sum + p.fba_value, 0);
    const actionCount = state.actions.filter((a) => Number(a.batch_id) === Number(state.currentBatch?.id) && (boardKey === "all" || (boardKey === "slow" ? String(a.board || "").startsWith("sl_") : a.board === boardKey))).length;
    $("#content").innerHTML = `<div class="page-head"><div><h1>${escapeHtml(meta.label)}</h1><p>${escapeHtml(meta.desc)}</p></div><div class="page-actions"><span class="pill pill-gray">当前批次 ${state.currentBatch ? `第 ${state.currentBatch.week_no} 周` : "未导入"}</span></div></div><div class="hint"><strong>判定规则</strong><span>${escapeHtml(meta.formula)}</span></div><div class="kpi-grid list-kpi-grid"><div class="kpi"><div class="kpi-label">当前筛选商品</div><div class="kpi-value">${fmt(rows.length)}</div><div class="kpi-sub">来自 ${fmt(productsForBoard(boardKey).length)} 款板块商品</div></div><div class="kpi green"><div class="kpi-label">有库存商品</div><div class="kpi-value">${fmt(stockCount)}</div><div class="kpi-sub">货值 ¥${fmt(stockValue)}</div></div><div class="kpi purple"><div class="kpi-label">本批次处理动作</div><div class="kpi-value">${fmt(actionCount)}</div><div class="kpi-sub">处理记录永久保留</div></div></div>${boardFilterBar(boardKey, rows)}${productTable(pageRows, boardKey)}<div class="table-footer"><span>共 ${fmt(rows.length)} 条 · 第 ${state.page} / ${totalPages} 页${currentFilters().batchVals.length ? ` · 批量搜索 ${currentFilters().batchVals.length} 个 ${escapeHtml(currentFilters().batchField)}` : ""}</span><div class="pagination"><button data-action="prev-page" ${state.page <= 1 ? "disabled" : ""}>上一页</button><button data-action="next-page" ${state.page >= totalPages ? "disabled" : ""}>下一页</button></div></div>`;
  }

  function productCell(product, column, boardKey, frozenClass = "", frozenStyle = "") {
    const key = column.key;
    const numericKeys = PRODUCT_NUMERIC_KEYS;
    let content = "";
    let extraClass = "";
    if (key === "asin") content = `<span class="mono">${escapeHtml(product.asin || "—")}</span>`;
    else if (key === "msku") content = `<span class="product-name mono" title="${attr(product.msku)}">${escapeHtml(product.msku || "—")}</span>`;
    else if (key === "fnsku") content = `<span class="mono">${escapeHtml(product.fnsku || "—")}</span>`;
    else if (key === "country") content = escapeHtml(product.country || "—");
    else if (key === "shop") content = escapeHtml(product.shop || "—");
    else if (key === "owner") content = escapeHtml(product.owner || "—");
    else if (key === "status") content = `<span class="pill ${product.status === "在售" ? "pill-green" : product.status === "停售" ? "pill-gray" : "pill-orange"}">${escapeHtml(product.status || "—")}</span>`;
    else if (key === "sales") content = fmt(product.sales);
    else if (key === "revenue") content = fmtMoney(product.revenue);
    else if (key === "refund_qty") content = fmt(product.refund_qty);
    else if (key === "refund_rate") { content = fmtPct(product.refund_rate); if (product.refund_rate > thresholdParts(23, [2, 15])[1] / 100) extraClass = "bad"; }
    else if (key === "score") content = product.score || "—";
    else if (key === "reviews") content = fmt(product.reviews);
    else if (key === "fba_avail") { content = fmt(product.fba_avail); if (product.fba_avail <= 0) extraClass = "muted"; }
    else if (key === "kxb") { content = product.kxb >= 900 ? "∞" : product.kxb.toFixed(1); if (product.kxb > thresholdNumber(1, 4)) extraClass = "warn"; }
    else if (key === "ad_spend") content = fmtMoney(product.ad_spend);
    else if (key === "ad_orders") content = fmt(product.ad_orders);
    else if (key === "ad_share") { content = fmtPct(product.adShare); if (product.adShare > thresholdNumber(3, 40) / 100) extraClass = "warn"; }
    else if (key === "imp") content = fmt(product.imp);
    else if (key === "clk") content = fmt(product.clk);
    else if (key === "ctr") { content = fmtPct(product.ctr); if (product.ctr < thresholdNumber(5, 0.6) / 100) extraClass = "bad"; }
    else if (key === "cvr") { content = fmtPct(product.cvr); if (product.cvr < thresholdNumber(4, 5) / 100) extraClass = "bad"; }
    else if (key === "cpc") content = fmtMoney(product.cpc);
    else if (key === "roas") content = product.roas ? Number(product.roas).toFixed(2) : "—";
    else if (key === "acos") { content = product.acos ? fmtPct(product.acos) : "—"; if (product.acos > thresholdNumber(15, 20) / 100) extraClass = "bad"; }
    else if (key === "acoas") content = fmtPct(product.acoas);
    else if (key === "price") content = fmtMoney(product.price);
    else if (key === "sale_price") content = fmtMoney(product.sale_price);
    else if (["age0", "age31", "age61", "age91", "age181", "age271", "age331", "age365p"].includes(key)) content = fmt(product[key]);
    else if (key === "fba_value") content = fmtMoney(product.fba_value);
    else if (key === "issue") content = `<div class="tag-list">${issueTagHtml(product)}</div>`;
    else content = escapeHtml(product[key] ?? "—");
    const classes = [numericKeys.has(key) ? "num" : "", extraClass, frozenClass].filter(Boolean).join(" ");
    return `<td class="${classes}"${frozenStyle ? ` style="${frozenStyle}"` : ""}>${content}</td>`;
  }

  let productHeaderMeasureContext = null;
  function productColumnWidth(column) {
    const fallback = Number(column.width) || 64;
    productHeaderMeasureContext ||= document.createElement("canvas").getContext("2d");
    if (!productHeaderMeasureContext) return fallback;
    productHeaderMeasureContext.font = '600 10px Arial, "Microsoft YaHei", sans-serif';
    const labelWidth = productHeaderMeasureContext.measureText(String(column.label || "")).width;
    return Math.max(fallback, Math.ceil(labelWidth) + 46);
  }

  function productSortHeader(column, sortDir) {
    const label = escapeHtml(column.label);
    return `<span class="table-sort-head"><span title="${label}">${label}</span><span class="table-sort-controls"><button type="button" class="table-sort-btn ${sortDir === "asc" ? "active" : ""}" data-action="sort-column" data-sort-key="${attr(column.key)}" data-sort-dir="asc" title="按${label}升序" aria-label="按${label}升序">▲</button><button type="button" class="table-sort-btn ${sortDir === "desc" ? "active" : ""}" data-action="sort-column" data-sort-key="${attr(column.key)}" data-sort-dir="desc" title="按${label}降序" aria-label="按${label}降序">▼</button></span></span>`;
  }

  function productTable(rows, boardKey) {
    if (!rows.length) return `<div class="table-card"><div class="empty"><b>当前筛选条件没有商品</b><span>调整筛选条件或等待下一批数据</span></div></div>`;
    const frozenKeys = ["asin", "msku", "fnsku"];
    const hidden = new Set(state.hiddenCols);
    frozenKeys.forEach((key) => hidden.delete(key));
    const columns = PRODUCT_COLUMN_DEFS.filter((column) => !hidden.has(column.key));
    const columnWidths = new Map(columns.map((column) => [column.key, productColumnWidth(column)]));
    const leftMap = new Map();
    let left = 0;
    frozenKeys.forEach((key) => { leftMap.set(key, left); left += columnWidths.get(key) || 100; });
    const tableWidth = columns.reduce((sum, column) => sum + (columnWidths.get(column.key) || 64), 0) + 142;
    const numericKeys = PRODUCT_NUMERIC_KEYS;
    return `<div class="table-card"><div class="table-scroll"><table class="data-table prototype-data-table" style="width:${tableWidth}px;min-width:${tableWidth}px"><thead><tr>${columns.map((column) => { const frozen = frozenKeys.includes(column.key); const lastFrozen = column.key === "fnsku"; const width = columnWidths.get(column.key) || 64; const style = `${frozen ? `left:${leftMap.get(column.key)}px;` : ""}min-width:${width}px;width:${width}px;`; const sortDir = state.sortKey === column.key ? state.sortDir : ""; const ariaSort = sortDir === "asc" ? "ascending" : sortDir === "desc" ? "descending" : "none"; return `<th class="${numericKeys.has(column.key) ? "num" : ""} ${frozen ? "frozen-col" : ""} ${lastFrozen ? "frozen-last" : ""}" aria-sort="${ariaSort}" style="${style}">${productSortHeader(column, sortDir)}</th>`; }).join("")}<th class="action-sticky" style="min-width:142px;width:142px">操作</th></tr></thead><tbody>${rows.map((p) => `<tr>${columns.map((column) => { const frozen = frozenKeys.includes(column.key); const lastFrozen = column.key === "fnsku"; const frozenStyle = frozen ? `left:${leftMap.get(column.key)}px` : ""; return productCell(p, column, boardKey, frozen ? `frozen-col${lastFrozen ? " frozen-last" : ""}` : "", frozenStyle); }).join("")}<td class="action-sticky"><button class="btn btn-sm btn-primary" data-action="open-action" data-msku="${attr(p.msku)}" data-shop="${attr(p.shop)}" data-board="${attr(resolveActionBoard(p, boardKey))}">处理</button></td></tr>`).join("")}</tbody></table></div></div>`;
  }
  function openBatchSearch() {
    const f = currentFilters();
    $("#modal").className = "modal";
    $("#modal").innerHTML = `<div class="modal-head"><h2>批量搜索</h2><button class="icon-btn close" data-action="close-modal">×</button></div><div class="modal-body"><div class="form-grid"><label>搜索字段<select id="batchField">${selectOptions(["ASIN", "MSKU", "FNSKU"], f.batchField || f.field)}</select></label><label>每行一个值<span class="field-help">支持直接粘贴 Excel 单列。精确匹配，当前筛选会与批量值同时生效。</span><textarea id="batchText" rows="10" placeholder="CBAS630M-A-BMFY-6&#10;ZHHC1AA0001BBFYA">${escapeHtml((f.batchVals || []).join("\n"))}</textarea></label></div></div><div class="modal-foot"><button class="btn" data-action="clear-batch-search">清空</button><button class="btn" data-action="close-modal">取消</button><button class="btn btn-primary" data-action="apply-batch-search">应用批量搜索</button></div>`;
    showModal();
  }

  function openColumnConfig() {
    $("#modal").className = "modal";
    $("#modal").innerHTML = `<div class="modal-head"><h2>列配置</h2><button class="icon-btn close" data-action="close-modal">×</button></div><div class="modal-body"><div class="column-grid">${PRODUCT_COLUMN_DEFS.map((column) => `<label><input type="checkbox" data-column-key="${column.key}" ${state.hiddenCols.has(column.key) ? "" : "checked"}> ${escapeHtml(column.label)}</label>`).join("")}</div></div><div class="modal-foot"><button class="btn" data-action="reset-columns">恢复默认</button><button class="btn" data-action="close-modal">取消</button><button class="btn btn-primary" data-action="save-columns">应用</button></div>`;
    showModal();
  }
  function resolveActionBoard(product, boardKey) {
    if (boardKey && boardKey !== "all" && BOARD[boardKey]) return boardKey === "slow" ? (product.slowType || "sl_low") : boardKey;
    return product.issueKeys[0] || "show";
  }
  function applyBatchSearch() {
    const field = $("#batchField")?.value || "MSKU";
    const values = String($("#batchText")?.value || "").split(/\r?\n/).map((value) => value.trim()).filter(Boolean);
    state.filters.batchField = field;
    state.filters.batchVals = [...new Set(values)];
    state.page = 1;
    closeModal();
    renderView();
    toast(values.length ? `已加载 ${values.length} 个批量搜索值` : "已清空批量搜索", "success");
  }

  function saveColumnConfig() {
    const checked = new Set($$("#modal [data-column-key]:checked").map((input) => input.dataset.columnKey));
    checked.add("asin");
    checked.add("msku");
    checked.add("fnsku");
    state.hiddenCols = new Set(PRODUCT_COLUMN_DEFS.filter((column) => !checked.has(column.key)).map((column) => column.key));
    localStorage.setItem("portal-hidden-cols", JSON.stringify([...state.hiddenCols]));
    closeModal();
    renderView();
  }

  function judgmentChainHtml(product) {
    const kxbLimit = thresholdNumber(1, 4);
    const steps = [
      { no: "①", label: "库销比", actual: product.kxb >= 900 ? "∞" : `${product.kxb.toFixed(1)} 个月`, target: `目标 ≤ ${kxbLimit} 个月`, ratio: kxbLimit > 0 ? Math.min(1, kxbLimit / Math.max(product.kxb, 0.01)) : 1, status: product.fba_avail <= 0 ? "无库存" : product.kxb > kxbLimit ? "进入分析" : "达标", tone: product.fba_avail <= 0 ? "gray" : product.kxb > kxbLimit ? "orange" : "green" },
      { no: "②", label: "展示量", actual: fmt(product.imp), target: `需要 ${fmt(product.needImp)}`, ratio: product.needImp > 0 ? Math.min(1, product.imp / product.needImp) : 1, status: product.needImp > 0 && product.imp < product.needImp ? "卡点" : "达标", tone: product.needImp > 0 && product.imp < product.needImp ? "red" : "green" },
      { no: "③", label: "点击量", actual: fmt(product.clk), target: `需要 ${fmt(product.needClk)}`, ratio: product.needClk > 0 ? Math.min(1, product.clk / product.needClk) : 1, status: product.needClk > 0 && product.clk < product.needClk ? "卡点" : "达标", tone: product.needClk > 0 && product.clk < product.needClk ? "orange" : "green" },
      { no: "④", label: "广告单", actual: fmt(product.ad_orders), target: `需要 ${product.needOrders.toFixed(1)}`, ratio: product.needOrders > 0 ? Math.min(1, product.ad_orders / product.needOrders) : 1, status: product.needOrders > 0 && product.ad_orders < product.needOrders ? "卡点" : "达标", tone: product.needOrders > 0 && product.ad_orders < product.needOrders ? "orange" : "green" },
      { no: "⑤", label: "自然销量", actual: fmt(product.sales), target: `需要 ${fmt(product.needMo)}`, ratio: product.needMo > 0 ? Math.min(1, product.sales / product.needMo) : 1, status: product.needMo > 0 && product.sales < product.needMo ? "不足" : "达标", tone: product.needMo > 0 && product.sales < product.needMo ? "red" : "green" }
    ];
    return `<div class="judgment-chain">${steps.map((step) => `<div class="judgment-step"><div class="judgment-index tone-${step.tone}">${step.no}</div><div class="judgment-main"><div class="judgment-title"><b>${step.label}</b><span class="judgment-actual">${step.actual}</span><span class="judgment-target">${step.target}</span></div><div class="judgment-progress"><i style="width:${(step.ratio * 100).toFixed(1)}%;background:${step.tone === "red" ? "var(--red)" : step.tone === "orange" ? "var(--orange)" : step.tone === "gray" ? "var(--muted-2)" : "var(--green)"}"></i></div></div><span class="pill pill-${step.tone}">${step.status}</span></div>`).join("")}</div>`;
  }

  function snapshotHasMetrics(snapshot) {
    return Boolean(snapshot && ["sales", "fba_avail", "imp", "clk", "ad_orders"].some((key) => Object.prototype.hasOwnProperty.call(snapshot, key)));
  }

  function snapshotMetric(snapshot, key) {
    const row = snapshot || {};
    const sales = num(row.sales);
    const fbaAvail = num(row.fba_avail);
    const imp = num(row.imp);
    const clk = num(row.clk);
    const adOrders = num(row.ad_orders);
    if (key === "sales") return sales;
    if (key === "fba_avail") return fbaAvail;
    if (key === "imp") return imp;
    if (key === "clk") return clk;
    if (key === "ctr") return imp > 0 ? clk / imp : pctValue(row.ctr);
    if (key === "cvr") return clk > 0 ? adOrders / clk : pctValue(row.cvr);
    if (key === "ad_spend") return num(row.ad_spend);
    if (key === "ad_orders") return adOrders;
    if (key === "refund_qty") return num(row.refund_qty);
    if (key === "score") return num(row.score);
    if (key === "kxb") return sales > 0 ? fbaAvail / sales : fbaAvail > 0 ? 999 : 0;
    return num(row[key]);
  }

  function metricDeltaPresentation(delta, direction = "up", isPct = false) {
    const flat = Math.abs(delta) < 1e-9;
    const rising = delta > 0;
    const good = direction === "neutral" ? null : direction === "down" ? !rising : rising;
    const tone = flat ? "flat" : good === null ? "neutral" : good ? "good" : "bad";
    const amount = isPct ? `${Math.abs(delta * 100).toFixed(2)}pp` : fmt(Math.abs(delta), 2);
    return {
      tone,
      text: flat ? "持平" : `${rising ? "↑" : "↓"} ${amount}`,
      label: flat ? "无变化" : direction === "neutral" ? (rising ? "上升" : "下降") : good ? "改善" : "变差"
    };
  }

  function deltaBadgeHtml(delta, direction = "up", isPct = false) {
    const deltaInfo = metricDeltaPresentation(delta, direction, isPct);
    return `<span class="metric-delta ${deltaInfo.tone}"><b>${deltaInfo.text}</b><small>${deltaInfo.label}</small></span>`;
  }

  function compareMetricHtml(label, before, after, formatter, direction = "up", isPct = false, hasBefore = true, hasAfter = true) {
    if (!hasBefore || !hasAfter) {
      return `<div class="action-delta-row flat"><span class="delta-label">${label}</span><div class="delta-values"><b>—</b><i>→</i><b>${hasAfter ? formatter(after) : "—"}</b></div><span class="metric-delta flat"><b>无快照</b><small>无法比较</small></span></div>`;
    }
    const delta = Number(after || 0) - Number(before || 0);
    const deltaInfo = metricDeltaPresentation(delta, direction, isPct);
    return `<div class="action-delta-row ${deltaInfo.tone}"><span class="delta-label">${label}</span><div class="delta-values"><b>${formatter(before)}</b><i>→</i><b>${formatter(after)}</b></div><span class="metric-delta ${deltaInfo.tone}"><b>${deltaInfo.text}</b><small>${deltaInfo.label}</small></span></div>`;
  }

  function actionHistoryHtml(product, history) {
    if (!history.length) return `<div class="empty compact-empty"><b>还没有历史处理记录</b><span>本次提交后会生成第一条记录和指标快照</span></div>`;
    const metrics = [
      { key: "sales", label: "销量", direction: "up", formatter: (value) => fmt(value) },
      { key: "fba_avail", label: "FBA可售", direction: "neutral", formatter: (value) => fmt(value) },
      { key: "imp", label: "展示", direction: "up", formatter: (value) => fmt(value) },
      { key: "clk", label: "点击", direction: "up", formatter: (value) => fmt(value) },
      { key: "ctr", label: "CTR", direction: "up", formatter: (value) => fmtPct(value), isPct: true },
      { key: "cvr", label: "广告CVR", direction: "up", formatter: (value) => fmtPct(value), isPct: true },
      { key: "ad_spend", label: "广告花费", direction: "down", formatter: (value) => fmtMoney(value) },
      { key: "ad_orders", label: "广告单", direction: "up", formatter: (value) => fmt(value) },
      { key: "refund_qty", label: "退款量", direction: "down", formatter: (value) => fmt(value) },
      { key: "kxb", label: "库销比", direction: "down", formatter: (value) => Number(value) >= 900 ? "∞" : Number(value).toFixed(1) }
    ];
    return `<div class="action-history-list">${history.map((action, index) => {
      const snap = action.snapshot || {};
      const afterSnap = index === 0 ? product : history[index - 1]?.snapshot;
      const beforeReady = snapshotHasMetrics(snap);
      const afterReady = index === 0 || snapshotHasMetrics(afterSnap);
      const compareTitle = index === 0 ? "本次处理后 → 当前" : "本次处理后 → 下一次处理";
      return `<article class="history-card action-progress-card"><span class="history-timeline-dot"></span><div class="history-head"><div><b>${formatFullDateTime(action.created_at)}</b><span>${escapeHtml(action.user_name || "未知")} · ${escapeHtml(action.action_type || "处理")} · ${escapeHtml(BOARD[action.board]?.label || action.board || "")}</span></div><span class="pill pill-blue">${index === 0 ? "最近处理" : "历史处理"}</span></div><p>${escapeHtml(action.note || "")}</p><div class="action-compare-title"><b>${compareTitle}</b><span>${beforeReady && afterReady ? "绿色代表改善，红色代表变差，灰色代表中性变化" : "这条旧记录缺少完整指标快照，暂时无法比较"}</span></div>${beforeReady && afterReady ? `<div class="action-delta-grid">${metrics.map((metric) => compareMetricHtml(metric.label, snapshotMetric(snap, metric.key), snapshotMetric(afterSnap, metric.key), metric.formatter, metric.direction, metric.isPct, beforeReady, afterReady)).join("")}</div>` : ""}</article>`;
    }).join("")}</div>`;
  }

  function actionPeriodInfo(action) {
    const batch = !state.demo && state.batches.find((item) => Number(item.id) === Number(action.batch_id));
    if (batch) {
      return { weekNo: batch.week_no, start: batch.week_start, end: batch.week_end };
    }
    const actionDate = new Date(action.created_at || Date.now());
    return { weekNo: isoWeekNo(actionDate), start: dateOnly(startOfWeek(actionDate)), end: dateOnly(endOfWeek(actionDate)) };
  }

  function processingSnapshotTable(history) {
    const snapshotActions = history.filter((action) => snapshotHasMetrics(action.snapshot));
    if (!snapshotActions.length) {
      return `<div class="weekly-snapshot-empty"><b>还没有处理指标快照</b><span>只有实际处理过这个商品后，系统才会保存当时的销量、展示、点击、CTR、广告和库存指标。</span></div>`;
    }
    const metrics = [
      { key: "sales", label: "销量", direction: "up", formatter: (value) => fmt(value) },
      { key: "fba_avail", label: "FBA可售", direction: "neutral", formatter: (value) => fmt(value) },
      { key: "imp", label: "展示", direction: "up", formatter: (value) => fmt(value) },
      { key: "clk", label: "点击", direction: "up", formatter: (value) => fmt(value) },
      { key: "ctr", label: "CTR", direction: "up", formatter: (value) => fmtPct(value), isPct: true },
      { key: "cvr", label: "广告CVR", direction: "up", formatter: (value) => fmtPct(value), isPct: true },
      { key: "ad_spend", label: "广告花费", direction: "down", formatter: (value) => fmtMoney(value) },
      { key: "ad_orders", label: "广告单量", direction: "up", formatter: (value) => fmt(value) },
      { key: "refund_qty", label: "退款量", direction: "down", formatter: (value) => fmt(value) },
      { key: "score", label: "评分", direction: "up", formatter: (value) => Number(value) > 0 ? value : "—" }
    ];
    return `<div class="weekly-snapshot-panel"><div class="weekly-snapshot-scroll"><table class="weekly-snapshot-table processing-snapshot-table"><thead><tr><th>处理周期</th>${metrics.map((metric) => `<th class="num">${metric.label}</th>`).join("")}</tr></thead><tbody>${snapshotActions.map((action, index) => {
      const previous = snapshotActions[index + 1];
      const currentMap = action.snapshot || {};
      const previousMap = previous?.snapshot || {};
      const period = actionPeriodInfo(action);
      return `<tr><td class="week-label"><b>第${period.weekNo}周</b><span>${formatDate(period.start)}–${formatDate(period.end)}</span><small>${escapeHtml(action.action_type || "处理")}</small></td>${metrics.map((metric) => {
        const currentValue = snapshotMetric(currentMap, metric.key);
        const previousValue = previous ? snapshotMetric(previousMap, metric.key) : null;
        return `<td class="num snapshot-metric"><b>${metric.formatter(currentValue)}</b>${previous ? deltaBadgeHtml(currentValue - previousValue, metric.direction, metric.isPct) : `<span class="metric-delta base"><b>首次处理</b><small>无对比</small></span>`}</td>`;
      }).join("")}</tr>`;
    }).join("")}</tbody></table></div></div>`;
  }

  function openAction(msku, shop, boardKey) {
    const product = state.products.find((p) => p.msku === msku && p.shop === shop);
    if (!product) { toast("没有找到这个商品", "error"); return; }
    const defaultBoard = BOARD[boardKey] ? boardKey : resolveActionBoard(product, "all");
    const history = state.actions.filter((action) => action.msku === msku && action.shop === shop).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    $("#modal").className = "modal xwide";
    $("#modal").dataset.msku = product.msku;
    $("#modal").dataset.shop = product.shop;
    $("#modal").innerHTML = `<div class="modal-head"><div><h2>${escapeHtml(product.msku)}</h2><div class="modal-subline">${escapeHtml(product.shop)} · ${escapeHtml(product.country || "—")} · 负责人 ${escapeHtml(product.owner || "—")}${product.owner && state.profile?.name && product.owner !== state.profile.name ? ` · ${escapeHtml(state.profile.name)} 协助处理，完成计入 ${escapeHtml(product.owner)}` : ""}</div></div><div class="tag-list">${issueTagHtml(product, 5)}</div><button class="icon-btn close" data-action="close-modal">×</button></div><div class="modal-body action-modal-body"><div class="detail-grid"><div><span>销量</span><b>${fmt(product.sales)}</b></div><div><span>FBA可售</span><b>${fmt(product.fba_avail)}</b></div><div><span>展示</span><b>${fmt(product.imp)}</b></div><div><span>点击</span><b>${fmt(product.clk)}</b></div><div><span>CTR</span><b class="${product.ctr < thresholdNumber(5, 0.6) / 100 ? "bad" : ""}">${fmtPct(product.ctr)}</b></div><div><span>广告CVR</span><b class="${product.cvr < thresholdNumber(4, 5) / 100 ? "bad" : ""}">${fmtPct(product.cvr)}</b></div><div><span>广告花费</span><b>${fmtMoney(product.ad_spend)}</b></div><div><span>广告订单</span><b>${fmt(product.ad_orders)}</b></div><div><span>退款量</span><b>${fmt(product.refund_qty)}</b></div><div><span>库销比</span><b class="${product.kxb > thresholdNumber(1, 4) ? "warn" : ""}">${product.kxb >= 900 ? "∞" : product.kxb.toFixed(1)}</b></div></div><section class="action-section"><div class="action-section-head"><div><h3>当前判定链路</h3><p>实际值与所需目标逐级比较，红色或橙色表示当前卡点</p></div><span class="pill ${product.issueKeys.length ? "pill-red" : "pill-green"}">${product.issueKeys.length ? escapeHtml(BOARD[product.issueKeys[0]]?.label || "需优化") : "达标"}</span></div>${judgmentChainHtml(product)}</section><section class="action-section history-section"><div class="action-section-head"><div><h3>处理记录与指标快照</h3><p>只有实际处理商品时才保存指标；没有处理记录就没有历史快照</p></div><span class="pill pill-gray">${history.length} 条记录</span></div><div class="history-block-title"><div><b>历史处理记录</b><span>按时间倒序显示每次处理动作</span></div></div>${actionHistoryHtml(product, history)}<div class="history-block-title weekly-title"><div><b>处理指标周期快照</b><span>对比相邻两次实际处理时的指标变化</span></div></div>${processingSnapshotTable(history)}</section><section class="action-section action-form-section"><div class="action-section-head"><div><h3>新增本次处理</h3><p>提交后统一记为“已处理”，并自动保存当前指标快照</p></div></div><div class="form-grid two"><label>优化板块<select id="actionBoard">${BOARD_ORDER.map((key) => `<option value="${key}" ${key === defaultBoard ? "selected" : ""}>${escapeHtml(BOARD[key].label)}</option>`).join("")}</select></label><label>动作类型<select id="actionType">${ACTION_TYPES.map((type) => `<option value="${attr(type)}">${escapeHtml(type)}</option>`).join("")}</select></label><label style="grid-column:1/-1">处理动作与依据<span class="field-help">写清楚做了什么、为什么做。提交时会自动记录处理人、时间和当前指标。</span><textarea id="actionNote" placeholder="例：调价 29.90 → 27.90（-6.7%），同时换主图；7 天后观察 CTR 是否从 0.30% 提升到 0.60%"></textarea><div class="phrase-list">${["调价", "换主图", "改五点", "广告否词", "加预算", "报 DOTD", "清货", "翻新"].map((text) => `<button type="button" class="phrase" data-phrase="${attr(text)}">${escapeHtml(text)}</button>`).join("")}</div></label></div></section></div><div class="modal-foot"><button class="btn" data-action="close-modal">取消</button><button class="btn btn-primary" data-action="submit-action">提交处理记录</button></div>`;
    showModal();
    setTimeout(() => $("#actionNote")?.focus(), 80);
  }
  function insertPhrase(text) {
    const el = $("#actionNote"); if (!el) return;
    const start = el.selectionStart || 0, end = el.selectionEnd || 0, before = el.value.slice(0, start);
    const prefix = before && !before.endsWith("\n") ? " " : "";
    el.value = `${before}${prefix}${text}${el.value.slice(end)}`; el.focus();
    const pos = start + prefix.length + text.length; el.setSelectionRange(pos, pos);
  }

  async function submitAction() {
    if (state.busy) return;
    const note = $("#actionNote")?.value.trim() || "";
    if (!note) { toast("请先写处理动作", "error"); return; }
    const mskuText = $("#modal")?.dataset.msku;
    const shopText = $("#modal")?.dataset.shop;
    const target = state.products.find((p) => p.msku === mskuText && p.shop === shopText);
    if (!target) { toast("商品信息已变化，请刷新后重试", "error"); return; }
    state.busy = true;
    const btn = $("[data-action='submit-action']");
    if (btn) { btn.disabled = true; btn.textContent = "正在写入…"; }
    try {
      const payload = {
        batch_id: state.currentBatch?.id || null, msku: target.msku, shop: target.shop,
        board: $("#actionBoard").value, action_type: $("#actionType").value, note,
        expected_result: null, status: "已处理", due_date: null, user_id: state.profile.id,
        snapshot: { asin: target.asin, fnsku: target.fnsku, owner: target.owner, country: target.country, sales: target.sales, revenue: target.revenue, refund_qty: target.refund_qty, fba_avail: target.fba_avail, fba_value: target.fba_value, ad_spend: target.ad_spend, ad_orders: target.ad_orders, imp: target.imp, clk: target.clk, ctr: target.ctr, cvr: target.cvr, acos: target.acos, kxb: target.kxb, score: target.score, price: target.price, sale_price: target.sale_price, issue_keys: target.issueKeys, issue_label: BOARD[target.issueKeys[0]]?.label || "达标" }
      };
      if (state.demo) {
        const demoAction = { ...payload, id: Date.now(), user_name: state.profile.name, created_at: new Date().toISOString(), snapshot: payload.snapshot };
        state.actions.unshift(demoAction); closeModal(); renderView(); toast("演示动作已写入本地时间轴", "success"); return;
      }
      const { data, error } = await sb.from("actions").insert(payload).select("*").single();
      if (error) throw error;
      state.actions.unshift(data); closeModal(); renderView();
      toast("处理动作已写入，历史记录不会被下次导入清理", "success");
    } catch (error) { toast(errorMessage(error), "error"); }
    finally { state.busy = false; if (btn) { btn.disabled = false; btn.textContent = "提交处理记录"; } }
  }

  function openProfile(msku, shop) {
    const product = state.products.find((p) => p.msku === msku && p.shop === shop);
    if (!product) { toast("没有找到这个商品", "error"); return; }
    const actions = state.actions.filter((a) => a.msku === msku && a.shop === shop).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    $("#drawer").innerHTML = `<div class="drawer-head"><div><h2 class="mono">${escapeHtml(product.msku)}</h2><p>${escapeHtml(product.shop)} · ${escapeHtml(product.country || "—")} · 负责人 ${escapeHtml(product.owner || "—")}</p><div class="tag-list" style="margin-top:8px">${issueTagHtml(product, 5)}</div></div><button class="icon-btn close" data-action="close-drawer">×</button></div><div class="drawer-body"><div class="detail-grid"><div><span>销量</span><b>${fmt(product.sales)}</b></div><div><span>FBA可售</span><b>${fmt(product.fba_avail)}</b></div><div><span>展示</span><b>${fmt(product.imp)}</b></div><div><span>点击</span><b>${fmt(product.clk)}</b></div><div><span>CTR</span><b class="${product.ctr < 0.006 ? "bad" : ""}">${fmtPct(product.ctr)}</b></div><div><span>广告CVR</span><b class="${product.cvr < 0.05 ? "bad" : ""}">${fmtPct(product.cvr)}</b></div><div><span>广告花费</span><b>${fmtMoney(product.ad_spend)}</b></div><div><span>广告订单</span><b>${fmt(product.ad_orders)}</b></div><div><span>退款量</span><b>${fmt(product.refund_qty)}</b></div><div><span>库销比</span><b class="${product.kxb > 4 ? "warn" : ""}">${product.kxb >= 900 ? "∞" : product.kxb.toFixed(1)}</b></div></div><section class="card"><div class="card-head"><div><h2>判定链路</h2><p>系统按当前阈值实时计算</p></div></div><div class="card-body" style="display:grid;gap:9px;font-size:11px"><div>① 库销比：<b>${product.kxb >= 900 ? "∞" : product.kxb.toFixed(1)} 个月</b> <span class="muted">（目标 ≤ 4）</span></div><div>② 展示：<b>${fmt(product.imp)}</b> / 需要 ${fmt(product.needImp)}</div><div>③ 点击：<b>${fmt(product.clk)}</b> / 需要 ${fmt(product.needClk)}</div><div>④ 广告单：<b>${fmt(product.ad_orders)}</b> / 需要 ${product.needOrders.toFixed(1)}</div><div>⑤ 自然销量：<b>${fmt(product.sales)}</b> / 需要 ${fmt(product.needMo)}</div></div></section><section class="card"><div class="card-head"><div><h2>处理时间轴</h2><p>共 ${actions.length} 条历史动作</p></div><button class="link-btn" data-action="open-action" data-msku="${attr(product.msku)}" data-shop="${attr(product.shop)}" data-board="${attr(product.issueKeys[0] || "show")}">＋ 新增动作</button></div><div class="card-body">${actions.length ? `<div class="timeline">${actions.map((action) => `<div class="timeline-item"><div class="timeline-time">${formatFullDateTime(action.created_at)} · ${escapeHtml(action.user_name || "未知")} · ${escapeHtml(BOARD[action.board]?.label || action.board || "")}</div><div class="timeline-text"><b>${escapeHtml(action.action_type || "处理动作")}</b>：${escapeHtml(action.note || "")}${action.expected_result ? `<br><span class="muted">预期：${escapeHtml(action.expected_result)}</span>` : ""}</div></div>`).join("")}</div>` : `<div class="empty"><b>还没有处理记录</b><span>从表格里的“写动作”开始记录</span></div>`}</div></section></div>`;
    $("#drawer").classList.remove("hidden"); $("#drawerBackdrop").classList.remove("hidden");
  }

  function renderLogs() {
    const allActions = state.actions.slice().sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    const owners = [...new Set(allActions.map((action) => action.user_name).filter(Boolean))].sort((a, b) => a.localeCompare(b, "zh-CN"));
    const currentProductMap = new Map(state.products.map((product) => [`${product.shop || ""}::${product.msku || ""}`, product]));
    const rows = allActions.filter((action) => {
      const f = state.logFilters;
      if (f.user && action.user_name !== f.user) return false;
      if (f.board && action.board !== f.board) return false;
      if (f.time === "7d" && !isWithinDays(action.created_at, 7)) return false;
      if (f.time === "30d" && !isWithinDays(action.created_at, 30)) return false;
      if (f.time === "week" && new Date(action.created_at) < startOfWeek(new Date())) return false;
      return true;
    });
    $("#content").innerHTML = `<div class="page-head"><div><h1>处理记录</h1><p>每次导入只替换产品数据，历史处理记录和当时指标快照永久保留。</p></div><div class="page-actions"><button class="btn" data-action="export-logs">导出记录</button>${isCreatorRole(state.profile.role) ? `<button class="btn btn-danger" data-action="open-clear-history">清理历史记录</button>` : ""}</div></div><div class="filter-bar"><select data-log-filter="user"><option value="">操作人：全部</option>${owners.map((owner) => `<option value="${attr(owner)}" ${state.logFilters.user === owner ? "selected" : ""}>${escapeHtml(owner)}</option>`).join("")}</select><select data-log-filter="board"><option value="">板块：全部</option>${BOARD_ORDER.map((key) => `<option value="${key}" ${state.logFilters.board === key ? "selected" : ""}>${escapeHtml(BOARD[key].label)}</option>`).join("")}</select><select data-log-filter="time"><option value="week" ${state.logFilters.time === "week" ? "selected" : ""}>本周</option><option value="7d" ${state.logFilters.time === "7d" ? "selected" : ""}>近 7 天</option><option value="30d" ${state.logFilters.time === "30d" ? "selected" : ""}>近 30 天</option><option value="" ${!state.logFilters.time ? "selected" : ""}>全部时间</option></select><span class="filter-spacer"></span><span class="muted">${rows.length} 条</span></div><div class="table-card"><div class="table-scroll"><table class="data-table log-table"><thead><tr><th>时间</th><th>操作人</th><th>板块</th><th>ASIN</th><th>MSKU</th><th>FNSKU</th><th>店铺</th><th>处理动作</th></tr></thead><tbody>${rows.length ? rows.map((action) => { const currentProduct = currentProductMap.get(`${action.shop || ""}::${action.msku || ""}`); return `<tr><td>${formatDateTime(action.created_at)}</td><td>${escapeHtml(action.user_name || "—")}</td><td><span class="pill pill-gray">${escapeHtml(BOARD[action.board]?.label || action.board || "—")}</span></td><td><span class="mono">${escapeHtml(action.snapshot?.asin || currentProduct?.asin || "—")}</span></td><td><span class="mono">${escapeHtml(action.msku || "—")}</span></td><td><span class="mono">${escapeHtml(action.snapshot?.fnsku || currentProduct?.fnsku || "—")}</span></td><td>${escapeHtml(action.shop || currentProduct?.shop || "—")}</td><td><b>${escapeHtml(action.action_type || "处理")}</b><span class="subtle log-note" title="${attr(action.note || "")}">${escapeHtml(action.note || "")}</span></td></tr>`; }).join("") : `<tr><td colspan="8"><div class="empty"><b>当前筛选下没有处理记录</b><span>组员提交处理后会自动出现在这里</span></div></td></tr>`}</tbody></table></div></div>`;
  }

  function openClearHistoryModal() {
    if (!isCreatorRole(state.profile?.role)) { toast("只有创作者可以清理历史处理记录", "error"); return; }
    if (!state.actions.length) { toast("当前没有可清理的历史处理记录", "success"); return; }
    $("#modal").className = "modal";
    $("#modal").innerHTML = `<div class="modal-head"><div><h2>清理历史处理记录</h2><p class="modal-subline">此操作会永久删除全部批次的处理记录</p></div><button class="icon-btn close" data-action="close-modal">×</button></div><div class="modal-body"><div class="clear-history-warning"><b>不可恢复操作</b><span>将清理数据库中的 <strong>${fmt(state.actions.length)}</strong> 条处理记录，并同步影响每周任务完成进度。产品、周任务目标和账号数据不会被删除。</span></div><div class="form-grid"><label style="margin-top:14px">输入“清空全部记录”确认<input id="clearHistoryConfirm" autocomplete="off" placeholder="请输入：清空全部记录"></label></div></div><div class="modal-foot"><button class="btn" data-action="close-modal">取消</button><button class="btn btn-danger" data-action="confirm-clear-history">确认清理</button></div>`;
    showModal();
    setTimeout(() => $("#clearHistoryConfirm")?.focus(), 80);
  }

  async function clearActionHistory() {
    if (!isCreatorRole(state.profile?.role)) { toast("只有创作者可以清理历史处理记录", "error"); return; }
    const confirmation = $("#clearHistoryConfirm")?.value.trim() || "";
    if (confirmation !== "清空全部记录") { toast("请输入“清空全部记录”后再确认", "error"); return; }
    const button = $("[data-action='confirm-clear-history']");
    if (button) { button.disabled = true; button.textContent = "正在清理…"; }
    const beforeCount = state.actions.length;
    try {
      let deletedCount = beforeCount;
      if (state.demo) {
        state.actions = [];
      } else {
        let { data, error } = await sb.rpc("clear_action_history");
        if (error && (String(error.message || "").includes("clear_action_history") || String(error.message || "").includes("schema cache"))) {
          const fallback = await sb.from("actions").delete({ count: "exact" }).neq("id", -1);
          if (fallback.error) throw fallback.error;
          deletedCount = fallback.count ?? beforeCount;
        } else {
          if (error) throw error;
          deletedCount = Number(data ?? beforeCount);
        }
        state.actions = [];
      }
      closeModal();
      renderChrome();
      renderView();
      toast(`已清理 ${fmt(deletedCount)} 条历史处理记录`, "success");
    } catch (error) {
      toast(errorMessage(error), "error");
      if (button) { button.disabled = false; button.textContent = "确认清理"; }
    }
  }

  function weeklyOwnerList(batch, actions) {
    const ownerSet = new Set();
    state.profiles.filter((profile) => profile.active && profile.role === "组员").forEach((profile) => ownerSet.add(profile.name));
    state.products.forEach((product) => { if (product.owner) ownerSet.add(product.owner); });
    state.weeklyAssignments.filter((item) => Number(item.batch_id) === Number(batch?.id)).forEach((item) => ownerSet.add(item.owner));
    actions.forEach((action) => { const owner = action.snapshot?.owner || action.user_name; if (owner) ownerSet.add(owner); });
    return [...ownerSet].filter(Boolean).sort((a, b) => a.localeCompare(b, "zh-CN"));
  }

  function taskCompletedProducts(owner, task, actions) {
    const completed = new Set();
    const currentProductMap = new Map(state.products.map((product) => [`${product.shop}::${product.msku}`, product]));
    actions.forEach((action) => {
      if ((action.snapshot?.owner || action.user_name) !== owner) return;
      const key = `${action.shop || ""}::${action.msku || ""}`;
      let issueKeys = Array.isArray(action.snapshot?.issue_keys) && action.snapshot.issue_keys.length ? action.snapshot.issue_keys : null;
      if (!issueKeys) issueKeys = currentProductMap.get(key)?.issueKeys || (action.board ? [action.board] : []);
      if (issueKeys.some((board) => task.boards.includes(board))) completed.add(key);
    });
    return completed;
  }

  function buildAssignmentReport(batch, actions) {
    const assignments = state.weeklyAssignments.filter((item) => Number(item.batch_id) === Number(batch?.id));
    const owners = weeklyOwnerList(batch, actions);
    return owners.map((owner) => {
      const tasks = TASK_BOARDS.map((task) => {
        const target = Number(assignments.find((item) => item.owner === owner && item.board_key === task.key)?.target_count || 0);
        const completed = taskCompletedProducts(owner, task, actions).size;
        return { ...task, target, completed: target > 0 ? Math.min(completed, target) : 0, rawCompleted: completed, rate: target > 0 ? clamp(completed / target * 100, 0, 100) : 0 };
      });
      const target = tasks.reduce((sum, task) => sum + task.target, 0);
      const completed = tasks.reduce((sum, task) => sum + Math.min(task.completed, task.target || task.completed), 0);
      return { owner, tasks, target, completed, rate: target > 0 ? clamp(completed / target * 100, 0, 100) : 0 };
    });
  }

  function renderWeekly() {
    if (!state.batches.length) {
      $("#content").innerHTML = `<div class="page-head"><div><h1>每周处理进度</h1><p>导入数据后由主管分配每周任务。</p></div></div><div class="card"><div class="empty"><b>还没有可追踪的周批次</b><span>请先在导入中心导入一份 Listing 数据</span><button class="btn btn-primary" style="margin-top:14px" data-nav="import">前往导入</button></div></div>`;
      return;
    }
    const batch = state.batches.find((item) => Number(item.id) === Number(state.selectedWeekId)) || state.currentBatch || state.batches[0];
    state.selectedWeekId = batch.id;
    const actions = state.actions.filter((item) => Number(item.batch_id) === Number(batch.id));
    const report = buildAssignmentReport(batch, actions);
    const assignments = state.weeklyAssignments.filter((item) => Number(item.batch_id) === Number(batch.id));
    const assignedTotal = report.reduce((sum, person) => sum + person.target, 0);
    const completedTotal = report.reduce((sum, person) => sum + person.completed, 0);
    const overallRate = assignedTotal > 0 ? clamp(completedTotal / assignedTotal * 100, 0, 100) : 0;
    const isAdmin = isManagementRole(state.profile.role);
    const assignmentValue = (owner, key) => Number(assignments.find((item) => item.owner === owner && item.board_key === key)?.target_count || 0);
    const ownerTotal = (owner) => TASK_BOARDS.reduce((sum, task) => sum + assignmentValue(owner, task.key), 0);
    const taskColgroup = `<colgroup><col class="task-member-col">${TASK_BOARDS.map(() => `<col class="task-board-col">`).join("")}<col class="task-summary-col"></colgroup>`;
    $("#content").innerHTML = `<div class="page-head"><div><h1>每周处理进度</h1><p>主管按组员和板块分配任务；全员可协助处理，完成数归属商品负责人。</p></div><div class="page-actions week-selector"><select id="weekBatchSelect">${state.batches.map((item) => `<option value="${item.id}" ${Number(item.id) === Number(batch.id) ? "selected" : ""}>第${item.week_no}周 · ${formatDate(item.week_start)}–${formatDate(item.week_end)}</option>`).join("")}</select><button class="btn" data-action="export-weekly">导出周报</button>${isAdmin ? `<button class="btn btn-primary" data-action="save-assignments">保存任务分配</button>` : ""}</div></div><div class="hint"><strong>计数规则</strong><span>同一个商品属于多个板块时，处理该商品后各板块分别算完成 1；同一个板块内重复提交多次仍只算 1 个商品。任何组员协助处理，完成数都计入商品负责人。</span></div><div class="week-summary-grid"><div class="week-card"><span>本周分配任务</span><strong>${fmt(assignedTotal)}</strong><small>按各板块任务数合计</small></div><div class="week-card"><span>已完成数量</span><strong>${fmt(completedTotal)}</strong><small>按商品去重后合计</small></div><div class="week-card"><span>整体完成率</span><strong>${overallRate.toFixed(1)}%</strong><small>已完成 ÷ 已分配</small></div><div class="week-card"><span>本周处理动作</span><strong>${fmt(actions.length)}</strong><small>已提交的处理记录</small></div></div><section class="card weekly-assignment-card"><div class="card-head"><div><h2>${isAdmin ? "主管分配任务" : "全团队本周任务"}</h2><p>${weekText(batch)} · ${isAdmin ? "输入每人每个板块要完成的数量，点击右上角保存" : "可查看全团队任务，并可协助处理任何负责人的商品"}</p></div><span class="pill pill-blue">${isAdmin ? "可编辑" : "只读"}</span></div><div class="card-body table-scroll"><table class="data-table task-table">${taskColgroup}<thead><tr><th>组员</th>${TASK_BOARDS.map((task) => `<th class="num">${escapeHtml(task.label)}</th>`).join("")}<th class="num">任务合计</th></tr></thead><tbody>${report.map((person) => `<tr><td><b>${escapeHtml(person.owner)}</b></td>${TASK_BOARDS.map((task) => `<td class="num">${isAdmin ? `<input class="task-input" type="number" min="0" step="1" data-task-owner="${attr(person.owner)}" data-task-board="${task.key}" value="${assignmentValue(person.owner, task.key)}">` : `<b>${fmt(assignmentValue(person.owner, task.key))}</b>`}</td>`).join("")}<td class="num"><b>${fmt(ownerTotal(person.owner))}</b></td></tr>`).join("")}<tr class="total-row"><td>板块合计</td>${TASK_BOARDS.map((task) => `<td class="num">${fmt(report.reduce((sum, person) => sum + assignmentValue(person.owner, task.key), 0))}</td>`).join("")}<td class="num"><b>${fmt(assignedTotal)}</b></td></tr></tbody></table></div></section><section class="card weekly-progress-card"><div class="card-head"><div><h2>任务完成进度</h2><p>每格显示“已完成 / 已分配”，同商品多板块分别计数</p></div><span class="pill pill-green">${report.length} 名组员</span></div><div class="card-body table-scroll"><table class="data-table task-progress-table">${taskColgroup}<thead><tr><th>组员</th>${TASK_BOARDS.map((task) => `<th class="num">${escapeHtml(task.label)}</th>`).join("")}<th class="num">整体进度</th></tr></thead><tbody>${report.map((person) => `<tr><td><div class="team-person"><span class="mini-avatar">${escapeHtml(firstChar(person.owner))}</span><div><b>${escapeHtml(person.owner)}</b><small>${person.completed} / ${person.target}</small></div></div></td>${person.tasks.map((task) => `<td class="num"><div class="task-progress-cell ${task.target === 0 ? "empty" : task.completed >= task.target ? "done" : task.completed > 0 ? "doing" : ""}"><b>${task.completed} / ${task.target}</b><span>${task.target ? task.rate.toFixed(0) + "%" : "未分配"}</span></div></td>`).join("")}<td class="num"><div class="task-total-progress"><b>${person.rate.toFixed(1)}%</b><span>${person.completed} / ${person.target}</span><div class="progress"><i style="width:${person.rate}%;background:${person.rate >= 100 ? "var(--green)" : person.rate >= 50 ? "var(--blue)" : "var(--orange)"}"></i></div></div></td></tr>`).join("") || `<tr><td colspan="${TASK_BOARDS.length + 2}"><div class="empty"><b>暂无可分配组员</b><span>请先建立组员账号或导入带负责人的数据</span></div></td></tr>`}</tbody></table></div></section>`;
  }

  async function saveWeeklyAssignments() {
    if (!isManagementRole(state.profile.role)) return;
    const batch = state.batches.find((item) => Number(item.id) === Number(state.selectedWeekId));
    if (!batch) { toast("没有找到当前周批次", "error"); return; }
    const inputs = $$("#content [data-task-owner][data-task-board]");
    const rows = inputs.map((input) => ({
      batch_id: batch.id,
      week_no: batch.week_no,
      week_start: batch.week_start,
      week_end: batch.week_end,
      owner: input.dataset.taskOwner,
      board_key: input.dataset.taskBoard,
      target_count: Math.max(0, Math.floor(Number(input.value) || 0)),
      assigned_by: state.profile.id,
      updated_at: new Date().toISOString()
    }));
    if (state.demo) {
      const existing = state.weeklyAssignments.filter((item) => !(Number(item.batch_id) === Number(batch.id) && rows.some((row) => row.owner === item.owner && row.board_key === item.board_key)));
      state.weeklyAssignments = existing.concat(rows.map((row, index) => ({ ...row, id: Date.now() + index })));
      renderWeekly(); toast("演示任务分配已保存", "success"); return;
    }
    try {
      const { error } = await sb.from("weekly_task_assignments").upsert(rows, { onConflict: "batch_id,owner,board_key" });
      if (error) throw error;
      state.weeklyAssignments = await loadAllRows("weekly_task_assignments", (query) => query.order("id", { ascending: true }));
      renderWeekly();
      toast("本周任务分配已保存", "success");
    } catch (error) {
      toast(errorMessage(error), "error");
    }
  }
  function thresholdUsage(id) {
    if (Number(id) <= 9) return "漏斗入口与容差";
    if ([10, 11, 12, 13, 14, 16].includes(Number(id))) return "指标显示 / 预警";
    if (Number(id) === 15) return "ACOS 与无效花费";
    if ([17, 18, 19, 20, 21].includes(Number(id))) return "滞销分类";
    if ([22, 23].includes(Number(id))) return "高退货率";
    if (Number(id) === 24) return "低评分";
    if (Number(id) === 25) return "需开广告";
    if (Number(id) === 26) return "广告无效花费";
    return "指标配置";
  }

  function renderThresholds() {
    const isAdmin = isManagementRole(state.profile.role);
    const rows = state.thresholds.slice().sort((a, b) => Number(a.id) - Number(b.id));
    $("#content").innerHTML = `
      <div class="page-head"><div><h1>阈值与公式</h1><p>主管修改后，当前批次看板、总 Listing、8 个优化板块和当周人效会立即重新计算；历史周快照保持不变。</p></div><div class="page-actions">${isAdmin ? `<button class="btn" data-action="reset-thresholds">恢复原型默认</button><button class="btn btn-primary" data-action="save-thresholds">保存全部修改</button>` : `<span class="pill pill-gray">只读</span>`}</div></div>
      <div class="hint"><strong>以后怎么改</strong><span>直接修改下方“当前值”，点击右上角“保存全部修改”。锁定项是公式推导或固定定义，不参与手工修改。</span></div>
      <div class="table-card"><div class="table-scroll"><table class="data-table threshold-table"><thead><tr><th>#</th><th>指标</th><th>公式 / 判定条件</th><th>当前值</th><th>单位</th><th>用途</th><th>说明</th><th>状态</th></tr></thead><tbody>${rows.map((row) => `<tr><td class="mono">${row.id}</td><td><b>${escapeHtml(row.name)}</b></td><td class="threshold-formula">${escapeHtml(row.formula || "—")}</td><td>${row.is_locked || !isAdmin ? `<span class="threshold-readonly">${escapeHtml(thresholdDisplayValue(row))}</span>` : `<input class="threshold-input" data-threshold-id="${row.id}" value="${attr(row.value ?? "")}" aria-label="${attr(row.name)}">`}</td><td>${escapeHtml(row.unit || "—")}</td><td>${escapeHtml(thresholdUsage(row.id))}</td><td class="muted">${escapeHtml(row.note || "")}</td><td>${row.is_locked ? `<span class="pill pill-gray">自动/固定</span>` : `<span class="pill pill-green">可修改</span>`}</td></tr>`).join("")}</tbody></table></div></div>`;
  }

  async function saveThresholds(reset = false) {
    if (!isManagementRole(state.profile.role)) { toast("只有主管可以修改阈值", "error"); return; }
    if (reset && !confirm("恢复 26 项原型默认阈值？当前数据会立即按默认值重新计算。")) return;
    const inputMap = new Map($$("#content [data-threshold-id]").map((input) => [Number(input.dataset.thresholdId), input.value.trim()]));
    const updates = state.thresholds.map((row) => ({
      id: Number(row.id),
      value: reset ? DEFAULT_THRESHOLD_VALUES[row.id] ?? row.value : (inputMap.get(Number(row.id)) ?? row.value)
    })).filter((row) => row.value !== undefined && row.value !== null && row.value !== "");
    try {
      const results = await Promise.all(updates.map((row) => sb.from("thresholds").update({ value: String(row.value), updated_at: new Date().toISOString(), updated_by: state.profile.id }).eq("id", row.id)));
      const failed = results.find((result) => result.error);
      if (failed) throw failed.error;
      state.thresholds = await loadAllRows("thresholds", (query) => query.order("id", { ascending: true }));
      recomputeAllProducts();
      renderView();
      toast(reset ? "已恢复默认阈值并重新计算" : "阈值已保存，当前数据已按新规则重新计算", "success");
    } catch (error) {
      console.error(error);
      toast(errorMessage(error), "error");
    }
  }
  function renderImport() {
    if (!isManagementRole(state.profile.role)) {
      $("#content").innerHTML = `<div class="page-head"><div><h1>导入中心</h1><p>只有主管可以导入和切换数据批次。</p></div></div><div class="card"><div class="empty"><b>当前账号没有导入权限</b><span>请联系主管完成数据导入</span></div></div>`;
      return;
    }
    const batch = state.currentBatch;
    $("#content").innerHTML = `<div class="page-head"><div><h1>导入中心</h1><p>每周一次标准导入；切换成功后只清空上一批产品明细，不清理处理记录。</p></div><div class="page-actions"><span class="pill pill-blue">仅主管可用</span><button class="btn" data-action="download-template">下载标准模板</button></div></div>${batch ? `<div class="hint"><strong>当前批次</strong><span>${weekText(batch)} · ${fmt(batch.row_count || state.products.length)} 行产品 · 导入于 ${formatFullDateTime(batch.created_at)}</span></div>` : `<div class="hint"><strong>首次导入</strong><span>请使用标准模板整理数据。导入成功后，本周产品会进入所有优化板块。</span></div>`}<div class="steps"><div class="step active"><b><i>1</i>下载模板</b><p>固定 36 列，随附填写说明</p></div><div class="step"><b><i>2</i>整理数据</b><p>一行一个 MSKU + 店铺</p></div><div class="step"><b><i>3</i>上传校验</b><p>自动检查字段与负责人</p></div><div class="step"><b><i>4</i>确认切换</b><p>旧产品清理，动作记录保留</p></div></div><div class="upload-grid"><div class="card"><div class="card-head"><div><h2>上传本周文件</h2><p>支持 .xlsx 与 .csv，建议优先使用模板</p></div></div><div class="card-body"><label class="dropzone" id="dropzone"><input id="importFile" type="file" accept=".xlsx,.xls,.csv"><span class="drop-icon">⇧</span><b>拖拽文件到这里，或点击选择</b><p>文件只会在浏览器中解析校验，确认后才分批写入 Supabase。</p></label><div id="importPreview" style="margin-top:16px"></div></div></div><div class="card"><div class="card-head"><div><h2>每周批次设置</h2><p>导入前确认周期和边界</p></div></div><div class="card-body"><div class="form-grid"><label>周起始日期<input id="weekStart" type="date" value="${dateOnly(startOfWeek())}"></label><label>周结束日期<input id="weekEnd" type="date" value="${dateOnly(endOfWeek())}"></label><label>批次规则<span class="field-help">新导入成功后，旧批次的产品明细会被清理；旧处理记录、动作快照和周统计不会被清理。免费版 500MB 足够长期使用。</span></label></div><div class="template-list" style="margin-top:16px"><div class="template-item"><div class="template-icon">XLS</div><div><b>总Listing数据_导入模板.xlsx</b><small>36 列标准模板 + 填写说明</small></div><button class="btn btn-sm" data-action="download-template">下载</button></div><div class="template-item"><div class="template-icon">SQL</div><div><b>数据保留策略</b><small>产品明细按周替换；处理记录永久保留</small></div><span class="pill pill-green">已配置</span></div></div></div></div></div>`;
    if (state.pendingImport) { const placeholder = $("#importPreview"); if (placeholder) placeholder.outerHTML = renderImportPreview(); }
  }

  function renderImportPreview() {
    const job = state.pendingImport; if (!job) return "";
    const errors = job.errors || [], warnings = job.warnings || [];
    return `<div id="importPreview" class="import-summary"><div class="card"><div class="card-head"><div><h2>${escapeHtml(job.fileName)}</h2><p>${fmt(job.rows.length)} 行 · 第 ${job.weekNo} 周 · ${job.weekStart} 至 ${job.weekEnd}</p></div><span class="pill ${errors.length ? "pill-red" : "pill-green"}">${errors.length ? "需要修正" : "校验通过"}</span></div><div class="card-body"><div class="kpi-grid" style="grid-template-columns:repeat(4,minmax(0,1fr));margin-bottom:0"><div class="kpi"><div class="kpi-label">有效行</div><div class="kpi-value" style="font-size:21px">${fmt(job.rows.length)}</div></div><div class="kpi orange"><div class="kpi-label">问题商品</div><div class="kpi-value" style="font-size:21px">${fmt(job.rows.filter((p) => p.issue_keys.length).length)}</div></div><div class="kpi green"><div class="kpi-label">有库存</div><div class="kpi-value" style="font-size:21px">${fmt(job.rows.filter((p) => p.fba_avail > 0).length)}</div></div><div class="kpi purple"><div class="kpi-label">负责人</div><div class="kpi-value" style="font-size:21px">${new Set(job.rows.map((p) => p.owner).filter(Boolean)).size}</div></div></div>${errors.length ? `<div class="validation-list">${errors.slice(0, 20).map((error) => `<div class="validation-item">${escapeHtml(error)}</div>`).join("")}</div>${errors.length > 20 ? `<p class="muted">另有 ${errors.length - 20} 条错误未显示，请先修正文件。</p>` : ""}` : ""}${warnings.length ? `<div class="validation-list">${warnings.slice(0, 8).map((warning) => `<div class="validation-item warn">${escapeHtml(warning)}</div>`).join("")}</div>` : ""}<div id="importProgress" class="hidden"></div><div style="display:flex;gap:8px;margin-top:16px;flex-wrap:wrap"><button class="btn btn-primary" data-action="confirm-import" ${errors.length ? "disabled" : ""}>确认导入并切换本周数据</button><button class="btn" data-action="cancel-import">取消</button><span class="muted" style="align-self:center;font-size:10px">切换后将清理旧产品明细，处理记录保留。</span></div></div></div></div>`;
  }

  async function handleImportFile(file) {
    if (!isManagementRole(state.profile.role)) return;
    const startValue = $("#weekStart")?.value || dateOnly(startOfWeek());
    const endValue = $("#weekEnd")?.value || dateOnly(endOfWeek());
    const start = parseDateOnly(startValue), end = parseDateOnly(endValue);
    if (end < start) { toast("周结束日期不能早于起始日期", "error"); return; }
    try {
      toast("正在解析文件…", "");
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: "array", cellDates: false });
      const preferred = workbook.SheetNames.find((name) => name.includes("总Listing")) || workbook.SheetNames[0];
      const sheet = workbook.Sheets[preferred];
      if (!sheet) throw new Error("没有找到可读取的工作表");
      const rawRows = XLSX.utils.sheet_to_json(sheet, { defval: "", raw: true });
      if (!rawRows.length) throw new Error("工作表没有数据行");
      const parsed = validateAndNormalizeImport(rawRows);
      state.pendingImport = { fileName: file.name, rows: parsed.rows, errors: parsed.errors, warnings: parsed.warnings, weekNo: isoWeekNo(start), weekStart: startValue, weekEnd: endValue };
      renderImport();
      if (parsed.errors.length) toast(`校验发现 ${parsed.errors.length} 个问题`, "error"); else toast(`校验通过，共 ${parsed.rows.length} 行`, "success");
    } catch (error) { console.error(error); state.pendingImport = null; renderImport(); toast(`解析失败：${errorMessage(error)}`, "error"); }
  }
  function headerLookup(row) {
    const map = new Map(); Object.keys(row).forEach((key) => map.set(normalizeHeader(key), key)); return map;
  }
  function normalizeHeader(value) {
    return String(value || "").toLowerCase().replace(/[\s_-]/g, "").replace(/[（）()]/g, "").replace(/：/g, ":").trim();
  }
  function valueFromRow(row, headerMap, column) {
    const aliases = [column.label, ...column.aliases].map(normalizeHeader);
    for (const alias of aliases) { const original = headerMap.get(alias); if (original !== undefined && row[original] !== undefined) return row[original]; }
    return "";
  }

  function validateAndNormalizeImport(rawRows) {
    const errors = [], warnings = [], headerMap = headerLookup(rawRows[0] || {}), presentKeys = new Set();
    IMPORT_COLUMNS.forEach((column) => { if (valueFromRow(rawRows[0] || {}, headerMap, column) !== "" || headerMap.has(normalizeHeader(column.label))) presentKeys.add(column.key); });
    REQUIRED_IMPORT_KEYS.forEach((key) => { const column = IMPORT_COLUMNS.find((item) => item.key === key); if (!presentKeys.has(key)) errors.push(`缺少必需列：${column?.label || key}`); });
    const knownOwners = new Set((state.profiles || []).map((profile) => profile.name));
    const seen = new Set(), rows = [];
    rawRows.forEach((row, index) => {
      const rowNo = index + 2;
      const get = (key) => valueFromRow(row, headerMap, IMPORT_COLUMNS.find((c) => c.key === key));
      const msku = String(get("msku")).trim(), shop = String(get("shop")).trim(), owner = String(get("owner")).trim();
      if (!msku && !shop && !owner) return;
      if (!msku) errors.push(`第 ${rowNo} 行：MSKU 为空`);
      if (!shop) errors.push(`第 ${rowNo} 行：店铺为空`);
      if (!owner) errors.push(`第 ${rowNo} 行：负责人为空`); else if (!knownOwners.has(owner)) errors.push(`第 ${rowNo} 行：负责人「${owner}」不在账号名单中`);
      const key = `${shop}::${msku}`;
      if (seen.has(key)) errors.push(`第 ${rowNo} 行：MSKU+店铺重复（${key}）`); seen.add(key);
      const status = String(get("status")).trim();
      if (status && !VALID_STATUS.has(status)) errors.push(`第 ${rowNo} 行：状态「${status}」不在枚举范围`);
      const product = {
        asin: String(get("asin")).trim() || null, msku, fnsku: String(get("fnsku")).trim() || null, sku: null,
        country: String(get("country")).trim() || null, shop, owner,
        sales: num(get("sales")), revenue: num(get("revenue")), refund_qty: num(get("refund_qty")), refund_rate: pctValue(get("refund_rate")),
        score: num(get("score")), reviews: Math.round(num(get("reviews"))), fba_avail: Math.round(num(get("fba_avail"))), fba_value: num(get("fba_value")),
        ad_spend: num(get("ad_spend")), ad_rev: null, ad_orders: num(get("ad_orders")), imp: Math.round(num(get("imp"))), clk: Math.round(num(get("clk"))),
        ctr: pctValue(get("ctr")), cvr: pctValue(get("cvr")), cpc: num(get("cpc")), roas: num(get("roas")), acos: pctValue(get("acos")), acoas: pctValue(get("acoas")), ad_share: pctValue(get("ad_share")),
        status: status || "无在售信息", price: num(get("price")), sale_price: num(get("sale_price")),
        age_0_30: Math.round(num(get("age_0_30"))), age_31_60: Math.round(num(get("age_31_60"))), age_61_90: Math.round(num(get("age_61_90"))), age_91_180: Math.round(num(get("age_91_180"))), age_181_270: Math.round(num(get("age_181_270"))), age_271_330: Math.round(num(get("age_271_330"))), age_331_365: Math.round(num(get("age_331_365"))), age_365p: Math.round(num(get("age_365p"))), raw: null
      };
      const normalized = normalizeProduct(product);
      rows.push({ ...product, age_0_60: product.age_0_30 + product.age_31_60, age_61_90: product.age_61_90, age_91_180: product.age_91_180, age_180p: product.age_181_270 + product.age_271_330 + product.age_331_365 + product.age_365p, refund_flag: normalized.refundFlag || null, slow_type: normalized.slowType || null, issue_keys: normalized.issueKeys, acos: normalized.acos, ctr: normalized.ctr, cvr: normalized.cvr, ad_share: normalized.adShare, cpc: normalized.cpc, roas: normalized.roas, acoas: normalized.acoas });
    });
    if (!rows.length) errors.push("文件中没有有效数据行");
    if (errors.length > 80) warnings.push("错误超过 80 条，仅展示前 20 条；请先按提示修正模板。");
    return { rows, errors, warnings };
  }

  async function confirmImport() {
    const job = state.pendingImport;
    if (!job || job.errors.length || state.busy) return;
    if (!confirm(`确认导入 ${job.rows.length} 行并切换为当前周数据？\n\n切换后会清理旧产品明细，但处理记录会永久保留。`)) return;
    state.busy = true;
    const btn = $("[data-action='confirm-import']"); if (btn) { btn.disabled = true; btn.textContent = "正在导入…"; }
    const progress = $("#importProgress"); if (progress) { progress.classList.remove("hidden"); progress.innerHTML = `<div class="import-progress-head"><span>准备写入批次</span><span>0%</span></div><div class="progress"><i style="width:0%"></i></div><p>正在创建临时批次…</p>`; }
    let batchId = null;
    try {
      const { data: batch, error: batchError } = await sb.from("import_batches").insert({ week_no: job.weekNo, week_start: job.weekStart, week_end: job.weekEnd, file_name: job.fileName, row_count: job.rows.length, is_current: false, imported_by: state.profile.id, status: "导入中" }).select("*").single();
      if (batchError) throw batchError; batchId = batch.id;
      const chunkSize = 450;
      for (let offset = 0; offset < job.rows.length; offset += chunkSize) {
        const chunk = job.rows.slice(offset, offset + chunkSize).map((row) => ({ ...row, batch_id: batchId }));
        const { error } = await sb.from("products").insert(chunk); if (error) throw error;
        const done = Math.min(offset + chunk.length, job.rows.length); updateImportProgress(done / job.rows.length * 92, `已写入 ${fmt(done)} / ${fmt(job.rows.length)} 行`);
      }
      updateImportProgress(95, "正在生成周统计并切换当前批次…");
      const { error: activateError } = await sb.rpc("activate_import_batch", { p_batch_id: batchId }); if (activateError) throw activateError;
      updateImportProgress(100, "导入完成，正在刷新工作台…");
      state.pendingImport = null; toast("本周数据已切换，旧处理记录已保留", "success");
      await loadWorkspace(); setView("dashboard");
    } catch (error) {
      console.error(error);
      if (batchId) { try { await sb.rpc("discard_import_batch", { p_batch_id: batchId }); } catch (discardError) { console.warn("清理失败", discardError); } }
      updateImportProgress(0, `导入失败：${errorMessage(error)}`); toast(errorMessage(error), "error"); state.busy = false;
      if (btn) { btn.disabled = false; btn.textContent = "确认导入并切换本周数据"; } return;
    }
    state.busy = false;
  }

  function updateImportProgress(percent, text) {
    const box = $("#importProgress"); if (!box) return;
    box.classList.remove("hidden"); const head = $(".import-progress-head", box);
    if (head) { head.children[0].textContent = "导入进度"; head.children[1].textContent = `${Math.round(percent)}%`; }
    const bar = $(".progress i", box); if (bar) bar.style.width = `${clamp(percent, 0, 100)}%`;
    const p = $("p", box); if (p) p.textContent = text;
    const button = $("[data-action='confirm-import']"); if (button) { button.disabled = percent < 100; button.textContent = percent >= 100 ? "正在刷新…" : "正在导入…"; }
  }

  function downloadTemplate() {
    const headers = IMPORT_COLUMNS.map((column) => column.label);
    const sample = { "ASIN": "B0XXXXXXXX", "MSKU": "DEMO-001", "Fnsku": "X000000000", "国家": "沙特阿拉伯", "店铺": "lontime", "负责人": state.profile?.name || "王丹", "销量": 12, "销售额": 720.5, "退款量": 0, "退款率": 0, "评分": 4.6, "评论数": 38, "FBA-可售数量": 25, "FBA货值（可售+不可售）": 800, "广告花费": 24.5, "广告订单量": 3, "展示": 5200, "点击": 45, "状态": "在售", "价格(原价)": 59.9, "优惠价(当前listing前台价格)": 54.9 };
    const dataSheet = XLSX.utils.json_to_sheet([sample], { header: headers });
    dataSheet["!cols"] = headers.map((header) => ({ wch: Math.max(12, Math.min(28, header.length + 4)) }));
    const noteRows = [["运营三部 · 总 Listing 数据导入模板"], ["字段", "说明"], ["一行主键", "MSKU + 店铺，同一文件内不可重复"], ["负责人", "必须与系统账号姓名完全一致"], ["百分比", "可填 0.2 或 20%，系统统一存为小数"], ["库龄", "按件数填写 8 个库龄段"], ["导入规则", "确认后清空旧产品明细，保留处理记录与历史周统计"]];
    const noteSheet = XLSX.utils.aoa_to_sheet(noteRows); noteSheet["!cols"] = [{ wch: 20 }, { wch: 72 }];
    const workbook = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(workbook, dataSheet, "总Listing数据"); XLSX.utils.book_append_sheet(workbook, noteSheet, "填写说明"); XLSX.writeFile(workbook, "总Listing数据_导入模板.xlsx");
  }
  function renderSettings() {
    const profile = state.profile;
    const isCreator = isCreatorRole(profile.role);
    const isSupervisor = profile.role === "主管";
    const canViewTeam = isCreator || isSupervisor;
    const canEditPerson = (person) => isCreator || (isSupervisor && person.role === "组员" && !person.archived_at);
    const roleOptions = (person) => isCreator
      ? ["组员", "主管", "创作者"].map((role) => `<option ${person.role === role ? "selected" : ""}>${role}</option>`).join("")
      : `<option selected>${escapeHtml(person.role)}</option>`;
    $("#content").innerHTML = `<div class="page-head"><div><h1>账号与权限</h1><p>${isCreator ? "创作者可以管理所有账号、创建账号和归档账号。" : isSupervisor ? "主管可以维护组员信息，但不能创建、归档或修改主管/创作者。" : "你只能查看自己的账号信息。"}</p></div><div class="page-actions"><span class="pill ${isCreator ? "pill-purple" : "pill-green"}">${escapeHtml(profile.role)}</span></div></div>${isCreator ? `<section class="card site-name-setting"><div class="card-head"><div><h2>网站名称</h2><p>自定义浏览器标签、登录页和侧边栏显示的名称，保存后全团队刷新可见</p></div><span class="pill pill-purple">仅创作者</span></div><div class="card-body"><div class="site-name-form"><label>名称<span class="field-help">建议格式：主名称 · 副名称，最多 60 个字符</span><input id="siteNameInput" maxlength="60" value="${attr(state.appSettings?.site_name || DEFAULT_SITE_NAME)}" placeholder="例如：运营三部 · 内部运营中台"></label><button class="btn btn-primary" data-action="save-site-name">保存名称</button></div></div></section>` : ""}<div class="settings-grid"><section class="card profile-card"><div class="profile-avatar">${escapeHtml(firstChar(profile.name))}</div><h2>${escapeHtml(profile.name)}</h2><p>${escapeHtml(profile.role)} · ${escapeHtml(profile.login_name || state.session?.user?.email || "")}</p><div class="profile-meta"><div><span>登录用户名</span><b>${escapeHtml(profile.login_name || state.session?.user?.email || "—")}</b></div><div><span>账号状态</span><b class="good">在职</b></div><div><span>当前批次</span><b>${state.currentBatch ? `第 ${state.currentBatch.week_no} 周` : "未导入"}</b></div><div><span>登录方式</span><b>用户名 + 密码</b></div></div><button class="btn btn-danger btn-wide" style="margin-top:16px" data-action="logout">退出登录</button></section><section class="card"><div class="card-head"><div><h2>团队成员</h2><p>${isCreator ? "创作者可编辑、改名、重置密码和归档所有账号" : isSupervisor ? "主管只能编辑组员，不能创建或归档账号" : "仅显示本人账号"}</p></div>${isCreator ? `<button class="btn btn-sm btn-primary" data-action="open-create-account">＋ 新建账号</button>` : ""}</div><div class="card-body" style="padding:0">${canViewTeam ? `<div style="overflow:auto"><table class="account-table"><thead><tr><th>姓名</th><th>用户名</th><th>角色</th><th>状态</th><th>操作</th></tr></thead><tbody>${state.profiles.map((person) => { const editable = canEditPerson(person); const self = person.id === profile.id; const resetAllowed = isCreator || (isSupervisor && person.role === "组员"); return `<tr><td><input id="profileName-${person.id}" value="${attr(person.name)}" ${editable ? "" : "disabled"}></td><td class="mono">${escapeHtml(person.login_name || "—")}${self ? ` <span class="pill pill-purple">当前账号</span>` : ""}</td><td><select id="profileRole-${person.id}" ${isCreator && !self ? "" : "disabled"}>${roleOptions(person)}</select></td><td><select id="profileActive-${person.id}" ${editable && !self ? "" : "disabled"}><option value="true" ${person.active ? "selected" : ""}>在职</option><option value="false" ${!person.active ? "selected" : ""}>离职</option></select></td><td><div class="account-actions">${editable ? `<button class="link-btn" data-action="save-profile" data-id="${person.id}">保存资料</button>` : ""}${resetAllowed ? `<button class="link-btn" data-action="open-reset-password" data-id="${person.id}">重置密码</button>` : ""}${isCreator ? `<button class="link-btn" data-action="open-rename-username" data-id="${person.id}">改用户名</button>` : ""}${isCreator && !self ? `<button class="link-btn danger-text" data-action="archive-account" data-id="${person.id}">归档账号</button>` : ""}</div></td></tr>`; }).join("")}</tbody></table></div>` : `<div class="empty"><b>${escapeHtml(profile.name)}</b><span>组员可查看全团队运营数据，并协助处理其他负责人的商品；账号与任务分配仍由管理角色维护</span></div>`}</div></section></div><section class="card" style="margin-top:16px"><div class="card-head"><div><h2>角色权限</h2><p>账号操作由数据库权限和 Edge Function 双重校验</p></div></div><div class="card-body setting-note"><b>创作者：</b>可修改所有人的信息、创建账号、修改用户名、重置密码、归档账号，并可使用全部数据管理功能。<br><b>主管：</b>只能维护组员姓名、在职/离职状态和密码；不能修改创作者/其他主管，也不能创建或归档账号。<br><b>组员：</b>可查看全团队产品、处理记录和周任务，也可协助处理其他负责人的商品；不能管理账号或任务分配。<br><b>登录：</b>组员输入用户名 + 密码，不需要真实邮箱。<br><b>归档：</b>归档后账号无法登录，历史处理记录仍然保留。Service Role Key 只存在 Edge Function 中，不会进入网页。</div></section>`;
  }
  async function saveSiteName() {
    if (!isCreatorRole(state.profile?.role)) { toast("只有创作者可以修改网站名称", "error"); return; }
    const siteName = $("#siteNameInput")?.value.trim() || "";
    if (siteName.length < 2) { toast("网站名称至少需要 2 个字符", "error"); return; }
    if (siteName.length > 60) { toast("网站名称不能超过 60 个字符", "error"); return; }
    if (state.demo) {
      state.appSettings = { ...state.appSettings, site_name: siteName };
      setCachedSiteName(siteName);
      applySiteName(); renderSettings(); toast("演示网站名称已保存", "success"); return;
    }
    try {
      const { error } = await sb.from("app_settings").upsert({
        key: "site_name",
        value: siteName,
        updated_by: state.profile.id,
        updated_at: new Date().toISOString()
      }, { onConflict: "key" });
      if (error) throw error;
      state.appSettings = { ...state.appSettings, site_name: siteName };
      setCachedSiteName(siteName);
      applySiteName(); renderSettings();
      toast("网站名称已保存，团队成员刷新后即可看到", "success");
    } catch (error) {
      const message = errorMessage(error);
      if (message.includes("app_settings") || message.includes("schema cache")) {
        state.appSettings = { ...state.appSettings, site_name: siteName };
        setCachedSiteName(siteName);
        applySiteName(); renderSettings();
        toast("名称已保存到本机；团队同步配置表尚未应用，请执行迁移 008_app_settings.sql", "error");
      } else {
        toast(message, "error");
      }
    }
  }

  async function saveProfile(id) {
    try {
      const name = $(`#profileName-${CSS.escape(id)}`)?.value.trim(), role = $(`#profileRole-${CSS.escape(id)}`)?.value, active = $(`#profileActive-${CSS.escape(id)}`)?.value === "true";
      if (!name) throw new Error("姓名不能为空");
      const oldProfile = state.profiles.find((p) => p.id === id);
      if (active === false && oldProfile) {
        const confirmed = confirm(`确认将 ${oldProfile.name} 设为离职？离职后该账号将无法登录和查看数据。`);
        if (!confirmed) return;
      }
      const { error } = await sb.from("profiles").update({ name, role, active }).eq("id", id);
      if (error) throw error;
      if (oldProfile) Object.assign(oldProfile, { name, role, active });
      toast("账号资料已保存", "success");
      renderView();
    } catch (error) { toast(errorMessage(error), "error"); }
  }

  async function callAdminUsers(payload) {
    const { data: sessionData, error: sessionError } = await sb.auth.getSession();
    if (sessionError) throw sessionError;
    if (!sessionData?.session?.access_token) throw new Error("登录状态已失效，请重新登录");
    const response = await fetch(`${cfg.supabaseUrl}/functions/v1/admin-users`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": cfg.supabaseKey,
        "Authorization": `Bearer ${sessionData.session.access_token}`
      },
      body: JSON.stringify(payload)
    });
    let result = {};
    try { result = await response.json(); } catch (_) {}
    if (!response.ok) throw new Error(result.error || `账号操作失败（${response.status}）`);
    return result;
  }

  async function refreshProfiles() {
    const { data, error } = await sb.from("profiles").select("*").is("archived_at", null).order("name");
    if (error) throw error;
    state.profiles = data || [];
  }

  function openCreateAccount() {
    $("#modal").className = "modal";
    $("#modal").innerHTML = `<div class="modal-head"><h2>新建团队账号</h2><button class="icon-btn close" data-action="close-modal">×</button></div><div class="modal-body"><div class="form-grid two"><label>姓名<span class="field-help">必须与导入表的「负责人」完全一致</span><input id="newAccountName" placeholder="例如：王丹"></label><label>用户名<span class="field-help">登录时使用，可使用中文、字母、数字、点、下划线或短横线</span><input id="newAccountUsername" autocomplete="off" placeholder="例如：wangdan 或 王丹"></label><label>初始密码<span class="field-help">至少 8 位</span><input id="newAccountPassword" type="password" autocomplete="new-password" placeholder="设置初始密码"></label><label>确认密码<input id="newAccountPassword2" type="password" autocomplete="new-password" placeholder="再次输入密码"></label><label>角色<select id="newAccountRole"><option>组员</option><option>主管</option><option>创作者</option></select></label></div></div><div class="modal-foot"><button class="btn" data-action="close-modal">取消</button><button class="btn btn-primary" data-action="create-account-submit">创建账号</button></div>`;
    showModal();
  }

  async function submitCreateAccount() {
    const name = $("#newAccountName")?.value.trim();
    const username = $("#newAccountUsername")?.value.trim();
    const password = $("#newAccountPassword")?.value || "";
    const password2 = $("#newAccountPassword2")?.value || "";
    const role = $("#newAccountRole")?.value || "组员";
    if (!name) { toast("请填写姓名", "error"); return; }
    if (!username) { toast("请填写用户名", "error"); return; }
    if (password.length < 8) { toast("密码至少需要 8 位", "error"); return; }
    if (password !== password2) { toast("两次输入的密码不一致", "error"); return; }
    const button = $("[data-action='create-account-submit']");
    if (button) { button.disabled = true; button.textContent = "正在创建…"; }
    try {
      await callAdminUsers({ action: "create", name, username, password, role });
      await refreshProfiles();
      closeModal();
      renderSettings();
      toast(`账号 ${username} 已创建，可直接登录`, "success");
    } catch (error) {
      toast(errorMessage(error), "error");
    } finally {
      if (button) { button.disabled = false; button.textContent = "创建账号"; }
    }
  }

  function openResetPassword(userId) {
    const person = state.profiles.find((item) => item.id === userId);
    if (!person) { toast("没有找到这个账号", "error"); return; }
    $("#modal").className = "modal";
    $("#modal").innerHTML = `<div class="modal-head"><h2>重置密码</h2><span class="pill pill-blue">${escapeHtml(person.name)}</span><button class="icon-btn close" data-action="close-modal">×</button></div><div class="modal-body"><div class="hint" style="margin-bottom:16px"><strong>用户名 ${escapeHtml(person.login_name || "")}</strong><span>设置新密码后，组员可立即使用用户名和新密码登录。</span></div><div class="form-grid"><label>新密码<span class="field-help">至少 8 位</span><input id="resetAccountPassword" type="password" autocomplete="new-password" placeholder="输入新密码"></label><label>确认新密码<input id="resetAccountPassword2" type="password" autocomplete="new-password" placeholder="再次输入新密码"></label></div></div><div class="modal-foot"><button class="btn" data-action="close-modal">取消</button><button class="btn btn-primary" data-action="reset-password-submit" data-id="${userId}">确认重置</button></div>`;
    showModal();
  }

  async function submitResetPassword(userId) {
    const password = $("#resetAccountPassword")?.value || "";
    const password2 = $("#resetAccountPassword2")?.value || "";
    if (password.length < 8) { toast("密码至少需要 8 位", "error"); return; }
    if (password !== password2) { toast("两次输入的密码不一致", "error"); return; }
    const button = $("[data-action='reset-password-submit']");
    if (button) { button.disabled = true; button.textContent = "正在重置…"; }
    try {
      await callAdminUsers({ action: "reset_password", user_id: userId, password });
      closeModal();
      toast("密码已重置，组员可立即使用新密码登录", "success");
    } catch (error) {
      toast(errorMessage(error), "error");
    } finally {
      if (button) { button.disabled = false; button.textContent = "确认重置"; }
    }
  }

  function openRenameUsername(userId) {
    if (!isCreatorRole(state.profile.role)) return;
    const person = state.profiles.find((item) => item.id === userId);
    if (!person) { toast("没有找到这个账号", "error"); return; }
    $("#modal").className = "modal";
    $("#modal").innerHTML = `<div class="modal-head"><h2>修改用户名</h2><span class="pill pill-blue">${escapeHtml(person.name)}</span><button class="icon-btn close" data-action="close-modal">×</button></div><div class="modal-body"><div class="hint" style="margin-bottom:16px"><strong>当前用户名：${escapeHtml(person.login_name || "—")}</strong><span>修改后立即生效，组员下次登录必须使用新用户名。</span></div><div class="form-grid"><label>新用户名<span class="field-help">可使用中文、字母、数字、点、下划线或短横线，2–32 位</span><input id="renameUsernameValue" value="${attr(person.login_name || "")}" autocomplete="off"></label></div></div><div class="modal-foot"><button class="btn" data-action="close-modal">取消</button><button class="btn btn-primary" data-action="rename-username-submit" data-id="${userId}">保存用户名</button></div>`;
    showModal();
  }

  async function submitRenameUsername(userId) {
    if (!isCreatorRole(state.profile.role)) return;
    const username = $("#renameUsernameValue")?.value.trim();
    if (!username) { toast("请填写新用户名", "error"); return; }
    const button = $("[data-action='rename-username-submit']");
    if (button) { button.disabled = true; button.textContent = "正在保存…"; }
    try {
      await callAdminUsers({ action: "rename_username", user_id: userId, username });
      await refreshProfiles();
      const updated = state.profiles.find((item) => item.id === userId);
      if (userId === state.profile.id && updated) state.profile.login_name = updated.login_name;
      closeModal();
      renderChrome();
      renderSettings();
      toast("用户名已修改，新用户名已可登录", "success");
    } catch (error) {
      toast(errorMessage(error), "error");
    } finally {
      if (button) { button.disabled = false; button.textContent = "保存用户名"; }
    }
  }

  async function archiveAccount(userId) {
    if (!isCreatorRole(state.profile.role)) return;
    const person = state.profiles.find((item) => item.id === userId);
    if (!person) { toast("没有找到这个账号", "error"); return; }
    if (userId === state.profile.id) { toast("不能归档当前登录账号", "error"); return; }
    if (!confirm(`确认归档 ${person.name}（${person.login_name || ""}）？\n\n归档后该账号无法登录，但历史处理记录会保留。`)) return;
    try {
      await callAdminUsers({ action: "archive_account", user_id: userId });
      await refreshProfiles();
      renderSettings();
      toast("账号已归档，历史处理记录已保留", "success");
    } catch (error) {
      toast(errorMessage(error), "error");
    }
  }
  function exportActionsCsv() {
    const rows = state.actions.map((action) => ({ "时间": formatFullDateTime(action.created_at), "操作人": action.user_name || "", "板块": BOARD[action.board]?.label || action.board || "", "ASIN": action.snapshot?.asin || "", "MSKU": action.msku || "", "FNSKU": action.snapshot?.fnsku || "", "店铺": action.shop || "", "动作类型": action.action_type || "", "处理动作": action.note || "" }));
    downloadCsv(`处理记录_${todayStr()}.csv`, rows);
  }
  function exportBoardCsv() {
    const rows = filteredProducts(state.view === "board" ? state.board : "all").map((p) => ({ ASIN: p.asin, MSKU: p.msku, FNSKU: p.fnsku, 国家: p.country, 店铺: p.shop, 负责人: p.owner, 状态: p.status, 销量: p.sales, 销售额: p.revenue, 退款量: p.refund_qty, 退款率: p.refund_rate, 评分: p.score, FBA可售: p.fba_avail, FBA货值: p.fba_value, 广告花费: p.ad_spend, 广告订单: p.ad_orders, 展示: p.imp, 点击: p.clk, CTR: p.ctr, 广告CVR: p.cvr, 库销比: p.kxb, 问题板块: p.issueKeys.map((key) => BOARD[key]?.label).join(" / ") }));
    downloadCsv(`${BOARD[state.board]?.label || "总Listing数据"}_${todayStr()}.csv`, rows);
  }
  function exportWeeklyCsv() {
    const batch = state.batches.find((item) => Number(item.id) === Number(state.selectedWeekId)) || state.currentBatch;
    const actions = state.actions.filter((item) => Number(item.batch_id) === Number(batch?.id));
    const report = buildAssignmentReport(batch, actions);
    const rows = report.flatMap((person) => person.tasks.map((task) => ({ 周次: `第${batch?.week_no || ""}周`, 周期: `${batch?.week_start || ""} 至 ${batch?.week_end || ""}`, 组员: person.owner, 任务板块: task.label, 分配数量: task.target, 完成数量: task.completed, 完成率: `${task.rate.toFixed(1)}%`, 组员整体完成率: `${person.rate.toFixed(1)}%` })));
    downloadCsv(`每周处理进度_第${batch?.week_no || ""}周.csv`, rows);
  }
  function downloadCsv(filename, rows) {
    if (!rows.length) { toast("当前没有可导出的数据", "error"); return; }
    const headers = Object.keys(rows[0]), escapeCsv = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;
    const csv = "\ufeff" + [headers.map(escapeCsv).join(","), ...rows.map((row) => headers.map((header) => escapeCsv(row[header])).join(","))].join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" }), url = URL.createObjectURL(blob), a = document.createElement("a");
    a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  function showModal() { $("#modal").classList.remove("hidden"); $("#modalBackdrop").classList.remove("hidden"); }
  function closeModal() { $("#modal").classList.add("hidden"); $("#modalBackdrop").classList.add("hidden"); }
  function closeDrawer() { $("#drawer").classList.add("hidden"); $("#drawerBackdrop").classList.add("hidden"); }

  document.addEventListener("DOMContentLoaded", init);
})();