(() => {
  "use strict";

  const num = (value) => {
    const parsed = Number(String(value ?? "").replace(/[,%¥$\s]/g, ""));
    return Number.isFinite(parsed) ? parsed : 0;
  };
  const safeDiv = (numerator, denominator) => denominator > 0 ? numerator / denominator : null;
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const fmt = (value, digits = 0) => {
    if (value === null || value === undefined || Number.isNaN(Number(value))) return "—";
    return Number(value).toLocaleString("zh-CN", { minimumFractionDigits: digits, maximumFractionDigits: digits });
  };
  const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
  const cloneSelections = (source) => Object.fromEntries(Object.entries(source).map(([key, values]) => [key, [...values]]));

  const METRICS = {
    sales: [
      { key: "sales", label: "销量", unit: "件", format: "integer", goodWhen: "up" },
      { key: "salesWow", label: "销量环比", unit: "%", format: "percent", goodWhen: "up", compareMode: "pp" },
      { key: "revenue", label: "销售额", unit: "", format: "currency", goodWhen: "up" },
      { key: "revenueWow", label: "销售额环比", unit: "%", format: "percent", goodWhen: "up", compareMode: "pp" },
      { key: "netSales", label: "净销售额", unit: "", format: "currency", goodWhen: "up" },
      { key: "aov", label: "平均客单价", unit: "", format: "currency2", goodWhen: "up", hint: "净销售额 ÷ 销量" },
      { key: "fbaAvail", label: "FBA可售总量", unit: "件", format: "integer", goodWhen: null },
      { key: "fbaUnavail", label: "FBA不可售", unit: "件", format: "integer", goodWhen: "down" },
      { key: "refundQty", label: "退款量", unit: "件", format: "integer", goodWhen: "down" },
      { key: "refundRate", label: "退款率", unit: "%", format: "percent", goodWhen: "down", hint: "退款量 ÷ 销量" },
      { key: "orderGrossProfit", label: "订单毛利润额", unit: "", format: "currency", goodWhen: "up" },
      { key: "grossMargin", label: "订单毛利率", unit: "%", format: "percent", goodWhen: "up", hint: "订单毛利额 ÷ 净销售额" }
    ],
    ads: [
      { key: "impressions", label: "展示量", unit: "次", format: "integer", goodWhen: "up" },
      { key: "clicks", label: "点击量", unit: "次", format: "integer", goodWhen: "up" },
      { key: "adSpend", label: "广告花费", unit: "", format: "currency", goodWhen: "down" },
      { key: "adSales", label: "广告销售额", unit: "", format: "currency", goodWhen: "up" },
      { key: "adOrders", label: "广告订单量", unit: "单", format: "integer", goodWhen: "up" },
      { key: "adOrderShare", label: "广告订单占比", unit: "%", format: "percent", goodWhen: "up", hint: "广告订单 ÷ 销量" },
      { key: "ctr", label: "CTR（点击率）", unit: "%", format: "percent", goodWhen: "up", hint: "点击 ÷ 展示" },
      { key: "adCvr", label: "广告CVR（转化率）", unit: "%", format: "percent", goodWhen: "up", hint: "广告订单 ÷ 点击" },
      { key: "cpc", label: "CPC", unit: "", format: "currency2", goodWhen: "down", hint: "广告花费 ÷ 点击" },
      { key: "roas", label: "ROAS", unit: "×", format: "multiple", goodWhen: "up", hint: "广告销售额 ÷ 广告花费" },
      { key: "acos", label: "ACOS", unit: "%", format: "percent", goodWhen: "down", hint: "广告花费 ÷ 广告销售额" },
      { key: "acoas", label: "ACoAS", unit: "%", format: "percent", goodWhen: "down", hint: "广告花费 ÷ 净销售额" }
    ],
    efficiency: [
      { key: "inventoryDepth", label: "FBA库存深度", unit: "件/款", format: "decimal", goodWhen: null, hint: "FBA可售 ÷ Listing款数" },
      { key: "avgProfit", label: "平均单个利润", unit: "", format: "currency2", goodWhen: "up", hint: "订单毛利额 ÷ 销量 × 1.7" },
      { key: "orderRate", label: "出单率", unit: "%", format: "percent", goodWhen: "up", hint: "出单链接款数 ÷ Listing款数" },
      { key: "avgOrderSales", label: "平均每单销量", unit: "件/款", format: "decimal", goodWhen: "up", hint: "总销量 ÷ 出单链接款数" },
      { key: "classA", label: "A类款数", unit: "款", format: "integer", goodWhen: "up", hint: "销量 ≥ 10" },
      { key: "classB", label: "B类款数", unit: "款", format: "integer", goodWhen: "up", hint: "5 ≤ 销量 < 10" },
      { key: "classC", label: "C类款数", unit: "款", format: "integer", goodWhen: "up", hint: "2 ≤ 销量 < 5" },
      { key: "classD", label: "D类款数", unit: "款", format: "integer", goodWhen: null, hint: "1 ≤ 销量 < 2" },
      { key: "classE", label: "E类款数", unit: "款", format: "integer", goodWhen: "down", hint: "销量 ≤ 0" },
      { key: "fbaListings", label: "FBA可售款数", unit: "款", format: "integer", goodWhen: "up", hint: "FBA可售 > 0" },
      { key: "fbaListingsWow", label: "FBA可售款数环比", unit: "%", format: "percent", goodWhen: "up", compareMode: "pp" },
      { key: "fbaUnavailListings", label: "FBA不可售款数", unit: "款", format: "integer", goodWhen: "down", hint: "FBA不可售 > 0" }
    ],
    inventory: [
      { key: "showValue", label: "展示量不够的货值", unit: "", format: "currency", goodWhen: "down" },
      { key: "needAdValue", label: "需要开广告的货值", unit: "", format: "currency", goodWhen: "down" },
      { key: "clickValue", label: "点击率偏低的货值", unit: "", format: "currency", goodWhen: "down" },
      { key: "cvrValue", label: "转化率偏低的货值", unit: "", format: "currency", goodWhen: "down" },
      { key: "invalidAdValue", label: "广告无效花费的货值", unit: "", format: "currency", goodWhen: "down" },
      { key: "midLowSlowValue", label: "总中低潜力滞销品货值", unit: "", format: "currency", goodWhen: "down", hint: "中潜力 + 低潜力" },
      { key: "lowSlowValue", label: "低潜力滞销品货值", unit: "", format: "currency", goodWhen: "down" },
      { key: "midSlowValue", label: "中潜力滞销品货值", unit: "", format: "currency", goodWhen: "down" },
      { key: "highSlowValue", label: "高潜力滞销品货值", unit: "", format: "currency", goodWhen: null },
      { key: "totalSlowValue", label: "总滞销品货值", unit: "", format: "currency", goodWhen: "down" },
      { key: "age90Value", label: "库龄 > 90 天货值", unit: "", format: "currency", goodWhen: "down", hint: "含 180 天及以上" },
      { key: "age180Value", label: "库龄 > 180 天货值", unit: "", format: "currency", goodWhen: "down", hint: "含 270 天及以上" },
      { key: "age270Value", label: "库龄 > 270 天货值", unit: "", format: "currency", goodWhen: "down" }
    ]
  };

  const CATEGORIES = [
    { id: "sales", number: "01", title: "销售指标", short: "销售", tone: "blue", defaults: ["sales", "netSales"], desc: "规模、客单、库存与利润结果指标" },
    { id: "ads", number: "02", title: "广告表现", short: "广告", tone: "cyan", defaults: ["impressions", "clicks"], desc: "流量、花费、订单与广告效率指标" },
    { id: "efficiency", number: "03", title: "商品效率", short: "效率", tone: "green", defaults: ["classA", "classB"], desc: "库存深度、出单效率与销量分层" },
    { id: "inventory", number: "04", title: "库存周转指标", short: "库存", tone: "orange", defaults: ["totalSlowValue", "midLowSlowValue"], desc: "问题货值与滞销、长库龄风险敞口" }
  ];

  const SERIES_COLORS = ["#2e6ce6", "#0d9fb8", "#7656d8"];
  const METRIC_ACCENTS = ["#2e6ce6", "#0b93ad", "#139a61", "#d47b0b", "#7656d8", "#dd4b57"];
  const RANGE_OPTIONS = [["4", "近4周"], ["12", "近12周"], ["24", "近24周"], ["48", "近48周"], ["all", "全部"]];
  const EXTRA_METRICS = {
    orderCount: { key: "orderCount", label: "订单量", unit: "单", format: "integer", goodWhen: "up" }
  };
  const SUMMARY_FIELDS = [
    "listingCount", "sales", "orderCount", "revenue", "netSales", "fbaAvail", "fbaUnavail", "refundQty", "orderGrossProfit",
    "impressions", "clicks", "adSpend", "adSales", "adOrders", "orderedListingCount", "fbaListingCount",
    "fbaUnavailListingCount", "classA", "classB", "classC", "classD", "classE", "fbaValue",
    "showValue", "needAdValue", "clickValue", "cvrValue", "invalidAdValue", "lowSlowValue", "midSlowValue",
    "highSlowValue", "age90Value", "age180Value", "age270Value"
  ];

  function metricText(metric, value, compact = false) {
    if (value === null || value === undefined || Number.isNaN(Number(value))) return "—";
    switch (metric.format) {
      case "currency": return fmt(value);
      case "currency2": return fmt(value, Math.abs(Number(value)) < 100 ? 2 : 0);
      case "percent": return `${(Number(value) * 100).toFixed(compact ? 1 : 2)}%`;
      case "decimal": return fmt(value, 2);
      case "multiple": return `${fmt(value, 2)}×`;
      default: return fmt(value);
    }
  }

  function metricUnit(metric) {
    return ["currency", "currency2", "percent", "multiple"].includes(metric.format) ? "" : metric.unit || "";
  }

  // Short axis labels: 12,500 -> 1.25万
  function axisText(metric, value) {
    if (!metric || value === null || value === undefined) return "";
    if (metric.format === "percent") return `${(Number(value) * 100).toFixed(Math.abs(value) < 0.1 ? 1 : 0)}%`;
    if (metric.format === "multiple") return `${fmt(value, 1)}×`;
    const abs = Math.abs(Number(value));
    if (abs >= 10000) return `${(Number(value) / 10000).toFixed(abs >= 100000 ? 0 : 1)}万`;
    return fmt(value, abs < 10 && metric.format !== "integer" ? 1 : 0);
  }

  function batchWeekText(batch) {
    return `第 ${batch?.week_no || "—"} 周`;
  }

  function batchDateText(batch) {
    if (!batch) return "—";
    return `${String(batch.week_start || "").slice(5).replace("-", "/")}–${String(batch.week_end || "").slice(5).replace("-", "/")}`;
  }

  function normalizeSnapshotRow(row) {
    return {
      owner: row.owner || "未分配",
      batchId: Number(row.batch_id),
      weekNo: Number(row.week_no || 0),
      weekStart: row.week_start,
      weekEnd: row.week_end,
      listingCount: num(row.listing_count), sales: num(row.sales), orderCount: num(row.order_count), revenue: num(row.revenue), netSales: num(row.net_sales),
      fbaAvail: num(row.fba_avail), fbaUnavail: num(row.fba_unavail), refundQty: num(row.refund_qty), orderGrossProfit: num(row.order_gross_profit),
      impressions: num(row.impressions), clicks: num(row.clicks), adSpend: num(row.ad_spend), adSales: num(row.ad_sales), adOrders: num(row.ad_orders),
      orderedListingCount: num(row.ordered_listing_count), fbaListingCount: num(row.fba_listing_count), fbaUnavailListingCount: num(row.fba_unavail_listing_count),
      classA: num(row.class_a_count), classB: num(row.class_b_count), classC: num(row.class_c_count), classD: num(row.class_d_count), classE: num(row.class_e_count),
      fbaValue: num(row.fba_value), showValue: num(row.show_value), needAdValue: num(row.needad_value), clickValue: num(row.click_value),
      cvrValue: num(row.cvr_value), invalidAdValue: num(row.ad_invalid_value), lowSlowValue: num(row.low_slow_value), midSlowValue: num(row.mid_slow_value),
      highSlowValue: num(row.high_slow_value), age90Value: num(row.age90_value), age180Value: num(row.age180_value), age270Value: num(row.age270_value)
    };
  }

  function deriveSnapshot(raw, previous) {
    if (!raw) return null;
    const sales = num(raw.sales), netSales = num(raw.netSales), clicks = num(raw.clicks), impressions = num(raw.impressions);
    const adSpend = num(raw.adSpend), adSales = num(raw.adSales), adOrders = num(raw.adOrders), refundQty = num(raw.refundQty);
    const ordered = num(raw.orderedListingCount), listings = num(raw.listingCount);
    return {
      ...raw,
      aov: safeDiv(netSales, sales),
      refundRate: safeDiv(refundQty, sales),
      grossMargin: safeDiv(raw.orderGrossProfit, netSales),
      adOrderShare: safeDiv(adOrders, sales),
      ctr: safeDiv(clicks, impressions),
      adCvr: safeDiv(adOrders, clicks),
      cpc: safeDiv(adSpend, clicks),
      roas: safeDiv(adSales, adSpend),
      acos: safeDiv(adSpend, adSales),
      acoas: safeDiv(adSpend, netSales),
      inventoryDepth: safeDiv(raw.fbaAvail, listings),
      avgProfit: sales > 0 ? raw.orderGrossProfit / sales * 1.7 : null,
      orderRate: safeDiv(ordered, listings),
      avgOrderSales: safeDiv(sales, ordered),
      midLowSlowValue: num(raw.lowSlowValue) + num(raw.midSlowValue),
      totalSlowValue: num(raw.lowSlowValue) + num(raw.midSlowValue) + num(raw.highSlowValue),
      salesWow: previous?.sales ? (sales - previous.sales) / previous.sales : null,
      revenueWow: previous?.revenue ? (raw.revenue - previous.revenue) / previous.revenue : null,
      fbaListingsWow: previous?.fbaListings ? (raw.fbaListingCount - previous.fbaListings) / previous.fbaListings : null,
      fbaListings: num(raw.fbaListingCount),
      fbaUnavailListings: num(raw.fbaUnavailListingCount)
    };
  }

  function aggregateRaw(rows) {
    const aggregate = Object.fromEntries(SUMMARY_FIELDS.map((key) => [key, 0]));
    rows.forEach((row) => SUMMARY_FIELDS.forEach((key) => { aggregate[key] += num(row[key]); }));
    return aggregate;
  }
  function productAgeValue(product, cutoff) {
    const value = num(product.fba_value);
    const ages = ["age0", "age31", "age61", "age91", "age181", "age271", "age331", "age365p"].map((key) => num(product[key]));
    const total = ages.reduce((sum, item) => sum + item, 0);
    if (!total) return 0;
    const older = cutoff === 90 ? ages.slice(3).reduce((sum, item) => sum + item, 0)
      : cutoff === 180 ? ages.slice(4).reduce((sum, item) => sum + item, 0)
        : ages.slice(5).reduce((sum, item) => sum + item, 0);
    return value * older / total;
  }

  function issueValue(products, key) {
    return products.filter((product) => (product.issueKeys || []).includes(key)).reduce((sum, product) => sum + num(product.fba_value), 0);
  }

  function productsToOwnerRows(products, batch) {
    const groups = new Map();
    products.forEach((product) => {
      const owner = product.owner || "未分配";
      if (!groups.has(owner)) groups.set(owner, []);
      groups.get(owner).push(product);
    });
    return [...groups.entries()].map(([owner, rows]) => {
      const raw = aggregateRaw([]);
      raw.owner = owner;
      raw.batchId = Number(batch.id);
      raw.weekNo = Number(batch.week_no || 0);
      raw.weekStart = batch.week_start;
      raw.weekEnd = batch.week_end;
      raw.listingCount = rows.length;
      raw.sales = rows.reduce((sum, p) => sum + num(p.sales), 0);
      raw.orderCount = rows.reduce((sum, p) => sum + num(p.order_qty), 0);
      raw.revenue = rows.reduce((sum, p) => sum + num(p.revenue), 0);
      raw.netSales = rows.reduce((sum, p) => sum + num(p.net_sales), 0);
      raw.fbaAvail = rows.reduce((sum, p) => sum + num(p.fba_avail), 0);
      raw.fbaUnavail = rows.reduce((sum, p) => sum + num(p.fba_unavail), 0);
      raw.refundQty = rows.reduce((sum, p) => sum + num(p.refund_qty), 0);
      raw.orderGrossProfit = rows.reduce((sum, p) => sum + num(p.order_gross_profit), 0);
      raw.impressions = rows.reduce((sum, p) => sum + num(p.imp), 0);
      raw.clicks = rows.reduce((sum, p) => sum + num(p.clk), 0);
      raw.adSpend = rows.reduce((sum, p) => sum + num(p.ad_spend), 0);
      raw.adSales = rows.reduce((sum, p) => sum + num(p.ad_rev), 0);
      raw.adOrders = rows.reduce((sum, p) => sum + num(p.ad_orders), 0);
      raw.orderedListingCount = rows.filter((p) => num(p.sales) > 0).length;
      raw.fbaListingCount = rows.filter((p) => num(p.fba_avail) > 0).length;
      raw.fbaUnavailListingCount = rows.filter((p) => num(p.fba_unavail) > 0).length;
      raw.classA = rows.filter((p) => num(p.sales) >= 10).length;
      raw.classB = rows.filter((p) => num(p.sales) >= 5 && num(p.sales) < 10).length;
      raw.classC = rows.filter((p) => num(p.sales) >= 2 && num(p.sales) < 5).length;
      raw.classD = rows.filter((p) => num(p.sales) >= 1 && num(p.sales) < 2).length;
      raw.classE = rows.filter((p) => num(p.sales) <= 0).length;
      raw.fbaValue = rows.reduce((sum, p) => sum + num(p.fba_value), 0);
      raw.showValue = issueValue(rows, "show");
      raw.needAdValue = issueValue(rows, "needad");
      raw.clickValue = issueValue(rows, "click");
      raw.cvrValue = issueValue(rows, "cvr");
      raw.invalidAdValue = issueValue(rows, "ad");
      raw.lowSlowValue = issueValue(rows, "sl_low");
      raw.midSlowValue = issueValue(rows, "sl_mid");
      raw.highSlowValue = issueValue(rows, "sl_high");
      raw.age90Value = rows.reduce((sum, p) => sum + productAgeValue(p, 90), 0);
      raw.age180Value = rows.reduce((sum, p) => sum + productAgeValue(p, 180), 0);
      raw.age270Value = rows.reduce((sum, p) => sum + productAgeValue(p, 270), 0);
      return raw;
    });
  }

  function sortedBatches(data) {
    return [...(data.batches || [])].sort((a, b) => {
      const dateA = new Date(a.week_start || a.created_at || 0).getTime();
      const dateB = new Date(b.week_start || b.created_at || 0).getTime();
      return dateA - dateB || Number(a.week_no || 0) - Number(b.week_no || 0);
    });
  }

  function prepareDataset(rt) {
    const batches = sortedBatches(rt.data);
    const summaries = (rt.data.summaries || []).map(normalizeSnapshotRow);
    const byBatch = new Map();
    summaries.forEach((row) => {
      if (!byBatch.has(row.batchId)) byBatch.set(row.batchId, []);
      byBatch.get(row.batchId).push(row);
    });
    const currentBatchId = Number(rt.data.currentBatchId);
    const currentBatch = batches.find((batch) => Number(batch.id) === currentBatchId);
    if (currentBatch && (rt.data.products || []).length) byBatch.set(currentBatchId, productsToOwnerRows(rt.data.products || [], currentBatch));
    const ownerSet = new Set();
    summaries.forEach((row) => { if (row.owner) ownerSet.add(row.owner); });
    byBatch.forEach((rows) => rows.forEach((row) => { if (row.owner) ownerSet.add(row.owner); }));
    const owners = [...ownerSet].sort((a, b) => a.localeCompare(b, "zh-CN"));
    const availableIds = new Set([...byBatch.entries()].filter(([, rows]) => rows.length).map(([id]) => Number(id)));
    if (!rt.batchId || !batches.some((batch) => Number(batch.id) === Number(rt.batchId))) {
      rt.batchId = availableIds.has(currentBatchId) ? currentBatchId : [...availableIds].pop() || null;
    }
    return { batches, byBatch, owners, availableIds, currentBatchId, currentBatch };
  }

  function rowsForScope(dataset, batchId, scope) {
    const rows = dataset.byBatch.get(Number(batchId)) || [];
    return scope === "all" ? rows : rows.filter((row) => row.owner === scope);
  }

  function buildSeries(dataset, scope) {
    const raws = dataset.batches.map((batch) => {
      const rows = rowsForScope(dataset, batch.id, scope);
      return rows.length ? aggregateRaw(rows) : null;
    });
    const series = [];
    raws.forEach((raw, index) => {
      const snapshot = deriveSnapshot(raw, series[index - 1] || null);
      series.push(snapshot);
    });
    return series;
  }

  function scopeLabel(scope) {
    return scope === "all" ? "所有人" : scope;
  }

  function selectedBatch(dataset, batchId) {
    return dataset.batches.find((batch) => Number(batch.id) === Number(batchId)) || dataset.currentBatch || dataset.batches.at(-1) || null;
  }

  function comparisonColumns() {
    return [
      { category: "sales", key: "sales", label: "销量", defaultVisible: true },
      { category: "extra", key: "orderCount", label: "订单量", defaultVisible: true },
      { category: "sales", key: "revenue", label: "销售额", defaultVisible: true },
      { category: "sales", key: "netSales", label: "净销售额", defaultVisible: true },
      { category: "efficiency", key: "fbaListings", label: "FBA可售款数", defaultVisible: true },
      { category: "sales", key: "fbaAvail", label: "FBA可售总数", defaultVisible: true },
      { category: "ads", key: "adSpend", label: "广告花费", defaultVisible: true },
      { category: "ads", key: "adOrders", label: "广告订单量", defaultVisible: true },
      { category: "ads", key: "acos", label: "ACOS", defaultVisible: true },
      { category: "ads", key: "acoas", label: "ACoAS", defaultVisible: true },
      { category: "ads", key: "ctr", label: "CTR", defaultVisible: true },
      { category: "ads", key: "adCvr", label: "CVR", defaultVisible: true },
      { category: "ads", key: "cpc", label: "CPC", defaultVisible: true }
    ];
  }

  function metricFor(column) {
    if (column.category === "extra") return EXTRA_METRICS[column.key];
    return METRICS[column.category]?.find((metric) => metric.key === column.key);
  }
  function comparisonInfo(metric, current, previous) {
    if (current === null || current === undefined) return { text: "暂无数据", className: "sd-delta-flat", arrow: "" };
    if (previous === null || previous === undefined) return { text: "首次记录", className: "sd-delta-flat", arrow: "" };
    const rawDelta = Number(current) - Number(previous);
    const delta = metric.compareMode === "pp" ? rawDelta : previous ? (Number(current) - Number(previous)) / Math.abs(Number(previous)) : null;
    if (delta === null) return { text: "上期为 0", className: "sd-delta-flat", arrow: "" };
    const text = metric.compareMode === "pp" ? `${Math.abs(delta * 100).toFixed(1)}pp` : `${Math.abs(delta * 100).toFixed(1)}%`;
    const arrow = rawDelta > 0 ? "↑" : rawDelta < 0 ? "↓" : "→";
    let className = "sd-delta-flat";
    if (metric.goodWhen && rawDelta !== 0) {
      const favorable = metric.goodWhen === "down" ? rawDelta < 0 : rawDelta > 0;
      className = favorable ? "sd-delta-up" : "sd-delta-down";
    }
    return { text, className, arrow };
  }

  const toNum = (value) => value === null || value === undefined || !Number.isFinite(Number(value)) ? null : Number(value);

  function renderSpark(metric, visible, selectedBatchId, color) {
    const values = visible.map((item) => toNum(item.snapshot[metric.key]));
    const valid = values.map((value, index) => [value, index]).filter(([value]) => value !== null);
    if (valid.length < 2) return `<div class="sd-spark sd-spark-empty" aria-hidden="true">${valid.length ? "1 个批次" : "暂无趋势"}</div>`;
    const width = 104, height = 40, pad = 4;
    const nums = valid.map(([value]) => value);
    const min = Math.min(...nums), max = Math.max(...nums);
    const x = (index) => pad + index / Math.max(1, values.length - 1) * (width - pad * 2);
    const y = (value) => max === min ? height / 2 : pad + (1 - (value - min) / (max - min)) * (height - pad * 2);
    const points = valid.map(([value, index]) => `${x(index).toFixed(1)},${y(value).toFixed(1)}`);
    const area = `M${x(valid[0][1]).toFixed(1)},${height} L${points.join(" L")} L${x(valid.at(-1)[1]).toFixed(1)},${height} Z`;
    const markIndex = Math.max(0, visible.findIndex((item) => Number(item.batch.id) === Number(selectedBatchId)));
    const markValue = values[markIndex] ?? valid.at(-1)[0];
    return `<svg class="sd-spark" viewBox="0 0 ${width} ${height}" aria-hidden="true"><path d="${area}" fill="${color}" opacity=".09"></path><polyline points="${points.join(" ")}" fill="none" stroke="${color}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"></polyline><circle cx="${x(values[markIndex] === null ? valid.at(-1)[1] : markIndex).toFixed(1)}" cy="${y(markValue).toFixed(1)}" r="2.6" fill="#fff" stroke="${color}" stroke-width="1.6"></circle></svg>`;
  }

  function renderMetricCard(category, metric, current, previous, accent, visible, selectedBatchId) {
    const value = current?.[metric.key] ?? null;
    const prior = previous?.[metric.key] ?? null;
    const comparison = comparisonInfo(metric, value, prior);
    const unit = metricUnit(metric);
    return `
      <article class="sd-metric" style="--metric-accent:${accent}" data-sd-metric="${metric.key}" data-sd-category="${category.id}" tabindex="0" aria-label="${escapeHtml(metric.label)}，查看历史趋势">
        <div class="sd-metric-main">
          <div class="sd-metric-label-row">
            <span class="sd-metric-label" title="${escapeHtml(metric.hint || metric.label)}">${escapeHtml(metric.label)}</span>
          </div>
          <div class="sd-metric-value ${value === null ? "empty" : ""}">${escapeHtml(metricText(metric, value))}${unit && value !== null ? `<span class="unit">${escapeHtml(unit)}</span>` : ""}</div>
          <div class="sd-metric-meta">${comparison.arrow ? `<span class="${comparison.className}">${comparison.arrow} ${escapeHtml(comparison.text)}</span>` : `<span class="${comparison.className}">${escapeHtml(comparison.text)}</span>`}<span>较上期</span></div>
        </div>
        ${renderSpark(metric, visible, selectedBatchId, accent)}
      </article>`;
  }

  function renderLegend(category, metrics, current, runtime) {
    return metrics.map((metric, index) => `
      <span class="sd-legend-chip" style="--series-color:${SERIES_COLORS[index % SERIES_COLORS.length]}">
        <i></i><b>${escapeHtml(metric.label)}</b><span>${escapeHtml(metricText(metric, current?.[metric.key], true))}</span>
        <button type="button" data-sd-remove-metric="${metric.key}" data-sd-category="${category.id}" aria-label="移除 ${escapeHtml(metric.label)}">×</button>
      </span>`).join("");
  }

  function chartModel(id, metrics, visible, options = {}) {
    const datasets = metrics.map((metric, index) => ({
      metric,
      color: options.colors?.[index] || SERIES_COLORS[index % SERIES_COLORS.length],
      values: visible.map((item) => toNum(item.snapshot[metric.key]))
    })).filter((item) => item.values.some((value) => value !== null));
    const normalized = new Set(datasets.map((item) => item.metric.unit || item.metric.format)).size > 1;
    return { id, visible, datasets, normalized, height: options.height || 240, area: Boolean(options.area), labels: Boolean(options.labels), selectedBatchId: options.selectedBatchId, title: options.title || "" };
  }

  function chartShell(model, emptyText) {
    if (!model.visible.length || !model.datasets.length) return `<div class="sd-chart-empty">${escapeHtml(emptyText)}</div>`;
    return `<div class="sd-chart-wrap" data-sd-chart="${model.id}" style="height:${model.height}px"><div class="sd-chart-canvas"></div><div class="sd-chart-tooltip hidden" role="status"></div></div>`;
  }

  // Draws at the container's real pixel width so long ranges use the full row.
  function drawChart(wrap, model) {
    const canvas = wrap.querySelector(".sd-chart-canvas");
    if (!canvas) return;
    const width = Math.max(300, Math.round(wrap.clientWidth));
    const height = model.height;
    const padding = { left: 56, right: 22, top: model.labels ? 30 : 20, bottom: 30 };
    const plotWidth = width - padding.left - padding.right, plotHeight = height - padding.top - padding.bottom;
    const count = model.visible.length;
    const xs = model.visible.map((_, index) => padding.left + (count === 1 ? plotWidth / 2 : index / (count - 1) * plotWidth));
    const all = model.datasets.flatMap((item) => item.values).filter((value) => value !== null);
    let domainMin = 0, domainMax = 1;
    if (!model.normalized && all.length) {
      const min = Math.min(...all), max = Math.max(...all), span = max - min;
      const pad = span > 0 ? span * .14 : (Math.abs(max) * .12 || 1);
      domainMin = min >= 0 ? Math.max(0, min - pad) : min - pad;
      domainMax = max + pad;
    }
    const ratioFor = (value, item) => {
      if (!model.normalized) return (value - domainMin) / Math.max(domainMax - domainMin, Number.EPSILON);
      const values = item.values.filter((entry) => entry !== null);
      const min = Math.min(...values), max = Math.max(...values);
      return max === min ? .5 : .06 + (value - min) / (max - min) * .88;
    };
    const ys = model.datasets.map((item) => item.values.map((value) => value === null ? null : padding.top + (1 - ratioFor(value, item)) * plotHeight));
    let grid = "";
    for (let tick = 0; tick < 5; tick += 1) {
      const ratio = tick / 4, y = padding.top + ratio * plotHeight;
      const label = model.normalized ? "" : axisText(model.datasets[0].metric, domainMax - ratio * (domainMax - domainMin));
      grid += `<line class="sd-grid-line" x1="${padding.left}" y1="${y.toFixed(1)}" x2="${width - padding.right}" y2="${y.toFixed(1)}"></line>${label ? `<text class="sd-axis-label" x="${padding.left - 9}" y="${(y + 3).toFixed(1)}" text-anchor="end">${escapeHtml(label)}</text>` : ""}`;
    }
    const step = Math.max(1, Math.ceil(count * 64 / Math.max(plotWidth, 1)));
    const xLabels = model.visible.map((item, index) => (count - 1 - index) % step === 0 ? `<text class="sd-axis-label${Number(item.batch.id) === Number(model.selectedBatchId) ? " current" : ""}" x="${xs[index].toFixed(1)}" y="${height - 9}" text-anchor="middle">${batchDateText(item.batch)}</text>` : "").join("");
    const showLabels = model.labels && plotWidth / Math.max(count, 1) >= 54;
    const series = model.datasets.map((item, k) => {
      let path = "", started = false, first = null, last = null;
      const points = item.values.map((value, index) => {
        const y = ys[k][index];
        if (y === null) { started = false; return ""; }
        path += `${started ? " L" : " M"}${xs[index].toFixed(1)},${y.toFixed(1)}`; started = true;
        if (first === null) first = index; last = index;
        const isSelected = Number(model.visible[index].batch.id) === Number(model.selectedBatchId);
        const label = showLabels ? `<text class="sd-value-label" x="${xs[index].toFixed(1)}" y="${(y - 10).toFixed(1)}" text-anchor="middle">${escapeHtml(metricText(item.metric, value, true))}</text>` : "";
        return `<circle class="sd-point" cx="${xs[index].toFixed(1)}" cy="${y.toFixed(1)}" r="${isSelected ? 4 : count > 24 ? 2 : 3}" fill="${isSelected ? item.color : "#fff"}" stroke="${item.color}"></circle>${label}`;
      }).join("");
      const area = model.area && first !== null && last > first ? `<path d="${path.trim()} L${xs[last].toFixed(1)},${padding.top + plotHeight} L${xs[first].toFixed(1)},${padding.top + plotHeight} Z" fill="${item.color}" opacity=".08"></path>` : "";
      return `${area}<path class="sd-line" d="${path.trim()}" stroke="${item.color}"></path>${points}`;
    }).join("");
    const hover = `<line class="sd-hover-line" x1="0" x2="0" y1="${padding.top}" y2="${padding.top + plotHeight}" visibility="hidden"></line>${model.datasets.map((item, k) => `<circle class="sd-hover-dot" data-sd-hover-dot="${k}" r="5" fill="${item.color}" visibility="hidden"></circle>`).join("")}`;
    canvas.innerHTML = `<svg class="sd-chart-svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeHtml(model.title)}"><title>${escapeHtml(model.title)}</title>${grid}${series}${xLabels}${model.normalized ? `<text class="sd-axis-title" x="${padding.left}" y="12">多指标按各自区间缩放</text>` : ""}${hover}</svg>`;
    model.geom = { xs, ys, padding, width, height };
  }

  function drawCharts(runtime, root = runtime.container) {
    root.querySelectorAll("[data-sd-chart]").forEach((wrap) => {
      const model = runtime.chartModels[wrap.dataset.sdChart];
      if (model) drawChart(wrap, model);
    });
  }

  function renderChart(category, visible, runtime, selectedBatchId) {
    const metrics = (METRICS[category.id] || []).filter((metric) => (runtime.selections[category.id] || []).includes(metric.key));
    const model = chartModel(category.id, metrics, visible, { height: 236, selectedBatchId, title: `${category.title}周批次趋势图` });
    runtime.chartModels[category.id] = model;
    return chartShell(model, visible.length ? "所选指标在该范围内暂无数据" : "所选日期范围内暂无批次数据");
  }

  function rangeText(visible) {
    if (!visible.length) return "无批次";
    return `${batchDateText(visible[0].batch)} 至 ${batchDateText(visible.at(-1).batch)} · ${visible.length} 个批次`;
  }

  function renderSection(category, visible, current, previous, dataset, runtime) {
    const metrics = METRICS[category.id] || [];
    const selected = metrics.filter((metric) => (runtime.selections[category.id] || []).includes(metric.key));
    const selectedBatchId = dataset.selectedBatch?.id;
    return `
      <section class="sd-section" id="sd-section-${category.id}" data-sd-section="${category.id}">
        <div class="sd-section-card tone-${category.tone}">
          <header class="sd-section-head">
            <div class="sd-section-title"><span class="sd-section-no">${category.number}</span><div><h2>${escapeHtml(category.title)}</h2><p>${escapeHtml(category.desc)} · ${metrics.length} 项指标</p></div></div>
            <div class="sd-section-tools"><span class="pill pill-blue">${batchDateText(dataset.selectedBatch)}</span></div>
          </header>
          <div class="sd-metric-grid">${metrics.map((metric, index) => renderMetricCard(category, metric, current, previous, METRIC_ACCENTS[index % METRIC_ACCENTS.length], visible, selectedBatchId)).join("")}</div>
          <div class="sd-chart-block">
            <div class="sd-chart-head"><div class="sd-chart-title"><h3>${escapeHtml(category.title)}趋势</h3><p>${escapeHtml(rangeText(visible))}</p></div><div class="sd-chart-legend">${renderLegend(category, selected, current, runtime)}<button class="sd-small-btn" type="button" data-sd-open-metrics="${category.id}">＋ 选择指标</button></div></div>
            ${renderChart(category, visible, runtime, selectedBatchId)}
          </div>
        </div>
      </section>`;
  }
  const TEAM_TEMPLATE_KEY = "yunying-team-column-templates-v1";

  function readTeamTemplates() {
    try {
      const parsed = JSON.parse(window.localStorage.getItem(TEAM_TEMPLATE_KEY) || "{}");
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
    } catch (_) { return {}; }
  }

  function writeTeamTemplates(templates) {
    try { window.localStorage.setItem(TEAM_TEMPLATE_KEY, JSON.stringify(templates)); } catch (_) {}
  }

  function visibleTeamColumns(runtime) {
    return comparisonColumns().filter((column) => runtime.teamColumns.has(column.key));
  }

  function sortedComparisonRows(dataset, batch, runtime) {
    const rawRows = dataset.byBatch.get(Number(batch?.id)) || [];
    const byOwner = new Map(rawRows.map((row) => [row.owner, deriveSnapshot(row, null)]));
    return dataset.owners.filter((owner) => byOwner.has(owner)).map((owner) => ({ owner, snapshot: byOwner.get(owner) })).sort((a, b) => {
      const av = a.snapshot[runtime.teamSortKey], bv = b.snapshot[runtime.teamSortKey];
      const aEmpty = av === null || av === undefined || Number.isNaN(Number(av));
      const bEmpty = bv === null || bv === undefined || Number.isNaN(Number(bv));
      if (aEmpty !== bEmpty) return aEmpty ? 1 : -1;
      const delta = Number(av || 0) - Number(bv || 0);
      return (runtime.teamSortDir === "asc" ? delta : -delta) || a.owner.localeCompare(b.owner, "zh-CN");
    });
  }

  function renderComparison(dataset, batch, runtime, total) {
    const rows = sortedComparisonRows(dataset, batch, runtime);
    if (!rows.length) return "";
    const columns = visibleTeamColumns(runtime);
    const sortMark = (key) => runtime.teamSortKey === key ? (runtime.teamSortDir === "desc" ? " ↓" : " ↑") : "";
    return `
      <section class="sd-comparison-card">
        <div class="sd-comparison-head"><div><h2>团队指标对比</h2><p>${batchDateText(batch)} · 点击负责人行可切换到个人数据</p></div><div class="sd-head-actions"><button class="sd-small-btn" type="button" data-sd-open-team-columns>列配置 / 模板</button><span class="pill pill-blue">${rows.length} 人</span><span class="pill pill-gray">当前批次汇总</span></div></div>
        <div class="sd-comparison-scroll"><table class="sd-comparison-table" aria-label="团队指标对比"><thead><tr><th>负责人</th>${columns.map((column) => `<th><button type="button" class="sd-sort-btn" data-sd-sort-team="${column.key}" title="点击按${escapeHtml(column.label)}排序">${escapeHtml(column.label)}${sortMark(column.key)}</button></th>`).join("")}</tr></thead><tbody>
          ${rows.map(({ owner, snapshot }) => `<tr data-sd-person="${escapeHtml(owner)}" title="查看 ${escapeHtml(owner)} 的数据"><td><b>${escapeHtml(owner)}</b><small>成员</small></td>${columns.map((column) => { const metric = metricFor(column); const unit = metricUnit(metric); const value = snapshot[column.key]; return `<td title="${escapeHtml(column.label)}">${escapeHtml(metricText(metric, value, true))}${unit && value !== null ? `<small>${escapeHtml(unit)}</small>` : ""}</td>`; }).join("")}</tr>`).join("")}
        </tbody>${total ? `<tfoot><tr><td><b>团队合计</b></td>${columns.map((column) => { const metric = metricFor(column); const unit = metricUnit(metric); const value = total[column.key]; return `<td>${escapeHtml(metricText(metric, value, true))}${unit && value !== null ? `<small>${escapeHtml(unit)}</small>` : ""}</td>`; }).join("")}</tr></tfoot>` : ""}</table></div><div class="sd-comparison-foot"><span>共 ${rows.length} 人</span><span>列配置保存在当前浏览器</span></div>
      </section>`;
  }

  function renderTeamColumnModal(runtime) {
    const columns = comparisonColumns();
    const draft = runtime.teamConfigDraft || new Set();
    const templates = readTeamTemplates();
    const templateChips = Object.keys(templates).length ? Object.entries(templates).map(([name, keys]) => `<span class="sd-template-chip"><button type="button" data-sd-load-team-template="${escapeHtml(name)}">${escapeHtml(name)}</button><button type="button" class="sd-template-remove" data-sd-delete-team-template="${escapeHtml(name)}" aria-label="删除模板 ${escapeHtml(name)}">×</button></span>`).join("") : `<span class="muted">暂无自定义模板</span>`;
    return `
      <div class="sd-modal-head"><div><span class="eyebrow">COLUMN SETTINGS</span><h2>团队指标列配置</h2><p>选择要显示的列，并可保存为可复用模板。</p></div><button class="sd-icon-btn" type="button" data-sd-close-modal>×</button></div>
      <div class="sd-modal-body">
        <div class="sd-preset-row"><span>快速模板</span><button type="button" class="sd-preset-btn" data-sd-team-preset="all">完整指标</button><button type="button" class="sd-preset-btn" data-sd-team-preset="sales">销售重点</button><button type="button" class="sd-preset-btn" data-sd-team-preset="ads">广告重点</button></div>
        <div class="sd-column-options">${columns.map((column) => `<label class="sd-column-option ${draft.has(column.key) ? "selected" : ""}"><input type="checkbox" value="${column.key}" ${draft.has(column.key) ? "checked" : ""}><span>${escapeHtml(column.label)}</span></label>`).join("")}</div>
        <div class="sd-template-save"><input type="text" maxlength="30" placeholder="输入自定义模板名称" data-sd-team-template-name><button type="button" class="sd-small-btn" data-sd-save-team-template>保存当前列为模板</button></div>
        <div class="sd-template-list"><span>已保存模板</span><div>${templateChips}</div></div>
        <p class="sd-modal-hint">默认按销量降序。点击表头可切换排序；表格宽度超出时使用下方横向滚动条。</p>
      </div>
      <div class="sd-modal-foot"><button class="btn" type="button" data-sd-close-modal>取消</button><button class="btn btn-primary" type="button" data-sd-apply-team-columns>应用列配置</button></div>`;
  }

  function openTeamColumnModal(runtime) {
    runtime.modalMode = "team-columns";
    runtime.teamConfigDraft = new Set(runtime.teamColumns);
    const modal = runtime.container.querySelector("[data-sd-modal]");
    const mask = runtime.container.querySelector("[data-sd-modal-mask]");
    if (!modal || !mask) return;
    modal.innerHTML = renderTeamColumnModal(runtime);
    mask.classList.remove("hidden");
    modal.classList.remove("hidden");
  }

  function refreshTeamColumnModal(runtime) {
    const modal = runtime.container.querySelector("[data-sd-modal]");
    if (modal && runtime.modalMode === "team-columns") modal.innerHTML = renderTeamColumnModal(runtime);
  }

  function allHistoryMetrics() {
    const rows = [];
    CATEGORIES.forEach((category) => METRICS[category.id].forEach((metric, index) => rows.push({ metric, category, index })));
    const salesCategory = CATEGORIES.find((category) => category.id === "sales");
    rows.splice(METRICS.sales.length, 0, { metric: EXTRA_METRICS.orderCount, category: salesCategory, index: METRICS.sales.length });
    return rows;
  }

  function renderHistorySection(view, runtime) {
    if (!view) return "";
    const { series, visible, scope } = view;
    const metrics = allHistoryMetrics().filter((item) => runtime.historyMetrics.has(item.metric.key));
    const name = scopeLabel(scope);
    const headCells = metrics.map(({ metric, category, index }) => `<th class="sd-hb-metric-th" title="${escapeHtml(metric.hint || metric.label)}"><i style="background:${METRIC_ACCENTS[index % METRIC_ACCENTS.length]}"></i>${escapeHtml(metric.label)}<small>${escapeHtml(category.title)}</small></th>`).join("");
    const bodyRows = visible.map((item) => {
      const cells = metrics.map(({ metric }) => {
        const value = toNum(item.snapshot[metric.key]);
        const prior = item.seriesIndex > 0 ? toNum(series[item.seriesIndex - 1]?.[metric.key]) : null;
        const delta = item.seriesIndex > 0 ? comparisonInfo(metric, value, prior) : null;
        const unit = metricUnit(metric);
        const deltaText = delta ? (item.seriesIndex === 0 ? "起始" : `${delta.arrow || ""} ${delta.text}`) : "—";
        return `<td class="sd-hb-week"><b>${escapeHtml(metricText(metric, value, true))}${unit && value !== null ? `<small>${escapeHtml(unit)}</small>` : ""}</b><em class="${delta ? delta.className : "sd-delta-flat"}">${deltaText}</em></td>`;
      }).join("");
      return `<tr><td class="sd-hb-date"><b>${escapeHtml(batchDateText(item.batch))}</b><small>第 ${escapeHtml(item.batch.week_no || "—")} 周</small></td><td class="sd-hb-name">${escapeHtml(name)}</td>${cells}</tr>`;
    }).join("");
    const empty = !metrics.length
      ? `<div class="sd-chart-empty">未选择任何指标，点击右上角“列配置”选择要对比的指标。</div>`
      : !visible.length
        ? `<div class="sd-chart-empty">所选日期范围内暂无批次数据。</div>`
        : `<div class="sd-hb-scroll"><table class="sd-hb-table" aria-label="全指标历史对比"><thead><tr><th class="sd-hb-date-fix">周期</th><th class="sd-hb-name-fix">人名</th>${headCells}</tr></thead><tbody>${bodyRows}</tbody></table></div>`;
    return `
      <section class="sd-section" id="sd-section-history" data-sd-section="history">
        <div class="sd-section-card">
          <header class="sd-section-head">
            <div class="sd-section-title"><span class="sd-section-no">05</span><div><h2>全指标历史对比</h2><p>每行一个周批次 · 每列一个指标，单元格显示数值与较上期变化</p></div></div>
            <div class="sd-section-tools"><button class="sd-small-btn" type="button" data-sd-open-history-columns>列配置</button><span class="pill pill-blue">${escapeHtml(rangeText(visible))}</span></div>
          </header>
          ${empty}
        </div>
      </section>`;
  }

  function renderHistoryColumnModal(runtime) {
    const draft = runtime.historyDraft || new Set();
    const groups = CATEGORIES.map((category) => {
      const metrics = [...METRICS[category.id]];
      if (category.id === "sales") metrics.splice(METRICS.sales.length, 0, EXTRA_METRICS.orderCount);
      return `<div class="sd-hb-modal-group"><b>${escapeHtml(category.title)}</b><div class="sd-column-options">${metrics.map((metric) => `<label class="sd-column-option ${draft.has(metric.key) ? "selected" : ""}"><input type="checkbox" value="${metric.key}" ${draft.has(metric.key) ? "checked" : ""}><span>${escapeHtml(metric.label)}</span></label>`).join("")}</div></div>`;
    }).join("");
    return `
      <div class="sd-modal-head"><div><span class="eyebrow">HISTORY COLUMNS</span><h2>全指标历史对比 · 列配置</h2><p>选择要在历史对比表中展示的指标列。</p></div><button class="sd-icon-btn" type="button" data-sd-close-modal>×</button></div>
      <div class="sd-modal-body">
        <div class="sd-preset-row"><span>快速选择</span><button type="button" class="sd-preset-btn" data-sd-history-preset="all">全部指标</button><button type="button" class="sd-preset-btn" data-sd-history-preset="sales">销售指标</button><button type="button" class="sd-preset-btn" data-sd-history-preset="ads">广告表现</button><button type="button" class="sd-preset-btn" data-sd-history-preset="efficiency">商品效率</button><button type="button" class="sd-preset-btn" data-sd-history-preset="inventory">库存周转</button></div>
        <div class="sd-hb-modal-groups">${groups}</div>
        <p class="sd-modal-hint">已选择 <b>${draft.size}</b> 项。表格前两列固定为周期与人名，右侧指标列横向滚动。</p>
      </div>
      <div class="sd-modal-foot"><button class="btn" type="button" data-sd-close-modal>取消</button><button class="btn btn-primary" type="button" data-sd-apply-history-columns>应用列配置</button></div>`;
  }

  function openHistoryColumnModal(runtime) {
    runtime.modalMode = "history-columns";
    runtime.historyDraft = new Set(runtime.historyMetrics);
    const modal = runtime.container.querySelector("[data-sd-modal]");
    const mask = runtime.container.querySelector("[data-sd-modal-mask]");
    if (!modal || !mask) return;
    modal.innerHTML = renderHistoryColumnModal(runtime);
    mask.classList.remove("hidden");
    modal.classList.remove("hidden");
  }

  function refreshHistoryColumnModal(runtime) {
    const modal = runtime.container.querySelector("[data-sd-modal]");
    if (modal && runtime.modalMode === "history-columns") modal.innerHTML = renderHistoryColumnModal(runtime);
  }

  function renderSnapshot(current, previous, scope, batch, isCurrent, visible) {
    const netDelta = current && previous?.netSales ? (current.netSales - previous.netSales) / previous.netSales : null;
    return `
      <section class="sd-snapshot-strip">
        <div class="sd-snapshot-lead"><span class="pill ${isCurrent ? "pill-green" : "pill-gray"}">${isCurrent ? "实时数据" : "历史快照"}</span><b>${escapeHtml(scopeLabel(scope))} · ${batchDateText(batch)}</b><p>趋势范围：${escapeHtml(rangeText(visible))}</p></div>
        <div class="sd-snapshot-stat"><span>Listing 款数</span><b>${fmt(current?.listingCount)}</b><small>本周汇总口径</small></div>
        <div class="sd-snapshot-stat"><span>销量</span><b>${fmt(current?.sales)}</b><small>${batchDateText(batch)}</small></div>
        <div class="sd-snapshot-stat"><span>净销售额</span><b>${fmt(current?.netSales)}</b><small>${netDelta === null ? "首次记录" : `${netDelta >= 0 ? "↑" : "↓"} ${Math.abs(netDelta * 100).toFixed(1)}%`}</small></div>
        <div class="sd-snapshot-stat"><span>广告花费</span><b>${fmt(current?.adSpend)}</b><small>ACOS ${current?.acos === null || current?.acos === undefined ? "—" : `${(current.acos * 100).toFixed(2)}%`}</small></div>
      </section>`;
  }

  // Batch indexes shown in trend charts. Presets end at the selected batch.
  function rangeWindow(dataset, runtime, selectedIndex) {
    const indexes = dataset.batches.map((batch, index) => dataset.availableIds.has(Number(batch.id)) ? index : -1).filter((index) => index >= 0);
    const upto = indexes.filter((index) => index <= selectedIndex);
    return runtime.range === "all" ? upto : upto.slice(-Number(runtime.range || 4));
  }

  function renderRangeControl(runtime) {
    return `<div class="sd-range"><span class="sd-range-label">趋势范围</span><div class="sd-segmented" role="group" aria-label="趋势日期范围">${RANGE_OPTIONS.map(([value, label]) => `<button type="button" class="${runtime.range === value ? "active" : ""}" data-sd-range="${value}" aria-pressed="${runtime.range === value}">${label}</button>`).join("")}</div></div>`;
  }

  function renderPage(rt) {
    const dataset = prepareDataset(rt);
    if (!dataset.batches.length) return `<div class="card"><div class="sd-empty"><b>尚未导入周数据</b><span>请先在导入中心完成本周 Listing 数据导入。</span></div></div>`;
    const batch = selectedBatch(dataset, rt.batchId) || dataset.batches.at(-1);
    dataset.selectedBatch = batch;
    const scope = rt.scope === "all" || dataset.owners.includes(rt.scope) ? rt.scope : "all";
    rt.scope = scope;
    const series = buildSeries(dataset, scope);
    const selectedIndex = Math.max(0, dataset.batches.findIndex((item) => Number(item.id) === Number(batch.id)));
    const current = series[selectedIndex] || null;
    const previous = selectedIndex > 0 ? series[selectedIndex - 1] : null;
    const visible = rangeWindow(dataset, rt, selectedIndex).map((index) => ({ snapshot: series[index], batch: dataset.batches[index], seriesIndex: index })).filter((item) => item.snapshot);
    rt.lastView = { dataset, series, selectedIndex, batch, scope, visible, current, previous };
    const isCurrent = Number(batch.id) === Number(dataset.currentBatchId);
    const available = dataset.batches.filter((item) => dataset.availableIds.has(Number(item.id)));
    const weekOptions = [...available].reverse().map((item) => `<option value="${item.id}" ${Number(item.id) === Number(batch.id) ? "selected" : ""}>${batchDateText(item)}${Number(item.id) === Number(dataset.currentBatchId) ? "（当前）" : ""}</option>`).join("");
    const ownerOptions = [`<option value="all" ${scope === "all" ? "selected" : ""}>所有人</option>`, ...dataset.owners.map((owner) => `<option value="${escapeHtml(owner)}" ${scope === owner ? "selected" : ""}>${escapeHtml(owner)}</option>`)].join("");
    return `
      <div class="sd-page-head"><div class="sd-page-title"><h1>总数据看板</h1><p>${batchDateText(batch)} · ${isCurrent ? "当前周实时汇总" : "历史批次快照"} · ${scope === "all" ? "所有成员合计" : `当前查看 ${escapeHtml(scope)}`}</p></div><div class="sd-page-actions"><label class="sd-control"><span>周批次</span><select data-sd-week>${weekOptions}</select></label><label class="sd-control"><span>查看范围</span><select data-sd-scope>${ownerOptions}</select></label>${scope !== "all" ? `<button class="sd-small-btn" type="button" data-sd-scope-all>返回所有人</button>` : ""}</div></div>
      ${renderSnapshot(current, previous, scope, batch, isCurrent, visible)}
      ${scope === "all" ? renderComparison(dataset, batch, rt, current) : ""}
      <div class="sd-category-nav">${CATEGORIES.map((category, index) => `<button class="sd-category-link ${index === 0 ? "active" : ""}" type="button" data-sd-scroll="${category.id}"><span>${category.number}</span>${escapeHtml(category.short)}</button>`).join("")}<button class="sd-category-link" type="button" data-sd-scroll="history"><span>05</span>看板</button><span class="sd-nav-spacer"></span>${renderRangeControl(rt)}</div>
      <div>${CATEGORIES.map((category) => renderSection(category, visible, current, previous, dataset, rt)).join("")}</div>
      ${renderHistorySection(rt.lastView, rt)}
      <div class="sd-modal-mask hidden" data-sd-modal-mask></div>
      <section class="sd-modal hidden" data-sd-modal role="dialog" aria-modal="true"></section>
      <div class="sd-zoom-mask hidden" data-sd-zoom-mask></div>
      <section class="sd-zoom-panel hidden" data-sd-zoom role="dialog" aria-label="指标历史趋势"></section>`;
  }

  function renderMetricModal(categoryId, runtime) {
    const category = CATEGORIES.find((item) => item.id === categoryId);
    if (!category) return "";
    const selected = runtime.editSelection || [];
    return `
      <div class="sd-modal-head"><div><span class="eyebrow">CHART SETTINGS</span><h2>${escapeHtml(category.title)} · 趋势指标</h2><p>最多选择 3 个指标；单位不同时自动转换为相对指数。</p></div><button class="sd-icon-btn" type="button" data-sd-close-modal>×</button></div>
      <div class="sd-modal-body"><div class="sd-metric-options">${(METRICS[category.id] || []).map((metric) => { const checked = selected.includes(metric.key); const disabled = !checked && selected.length >= 3; return `<label class="sd-metric-option ${checked ? "selected" : ""} ${disabled ? "disabled" : ""}"><input type="checkbox" value="${metric.key}" ${checked ? "checked" : ""} ${disabled ? "disabled" : ""}><span><b>${escapeHtml(metric.label)}</b><span>${escapeHtml(metric.hint || metric.unit || "")}</span></span></label>`; }).join("")}</div><p class="sd-modal-hint">已选择 <b>${selected.length}</b> / 3 项。</p></div>
      <div class="sd-modal-foot"><button class="btn" type="button" data-sd-close-modal>取消</button><button class="btn btn-primary" type="button" data-sd-apply-metrics>应用指标</button></div>`;
  }

  function renderZoomChart(metric, visible, runtime, selectedBatchId) {
    const model = chartModel("zoom", [metric], visible, { height: 300, area: true, labels: true, selectedBatchId, title: `${metric.label}历史趋势` });
    runtime.chartModels.zoom = model;
    return `<div class="sd-zoom-chart">${chartShell(model, "该指标在所选范围内暂无数据")}</div>`;
  }

  function renderZoomPanel(categoryId, metricKey, runtime) {
    const category = CATEGORIES.find((item) => item.id === categoryId);
    const metric = (METRICS[categoryId] || []).find((item) => item.key === metricKey);
    const view = runtime.lastView;
    if (!category || !metric || !view) return "";
    const visible = view.visible;
    const current = view.current, previous = view.previous;
    const values = visible.map((item) => toNum(item.snapshot[metric.key])).filter((value) => value !== null);
    const high = values.length ? Math.max(...values) : null, low = values.length ? Math.min(...values) : null;
    const comparison = comparisonInfo(metric, current?.[metric.key], previous?.[metric.key]);
    const highItem = visible.find((item) => toNum(item.snapshot[metric.key]) === high);
    const lowItem = visible.find((item) => toNum(item.snapshot[metric.key]) === low);
    const selectedId = Number(view.batch?.id);
    return `<div class="sd-zoom-head"><div><span class="eyebrow">${escapeHtml(category.title)}</span><h2>${escapeHtml(metric.label)} · 历史趋势</h2><p>${escapeHtml(scopeLabel(view.scope))} · ${escapeHtml(rangeText(visible))}${metric.hint ? ` · ${escapeHtml(metric.hint)}` : ""}</p></div><div class="sd-head-actions"><button class="sd-icon-btn" type="button" data-sd-close-zoom aria-label="关闭">×</button></div></div><div class="sd-zoom-body"><div class="sd-zoom-summary"><div><span>当前值</span><b>${escapeHtml(metricText(metric, current?.[metric.key]))}${metricUnit(metric) ? ` ${escapeHtml(metricUnit(metric))}` : ""}</b><small>${batchDateText(view.batch)}</small></div><div><span>较上期</span><b class="${comparison.className}">${comparison.arrow ? `${comparison.arrow} ` : ""}${escapeHtml(comparison.text)}</b><small>${metric.compareMode === "pp" ? "百分点变化" : "环比变化"}</small></div><div><span>区间最高</span><b>${escapeHtml(metricText(metric, high))}</b><small>${batchDateText(highItem?.batch)}</small></div><div><span>区间最低</span><b>${escapeHtml(metricText(metric, low))}</b><small>${batchDateText(lowItem?.batch)}</small></div></div>${renderZoomChart(metric, visible, runtime, selectedId)}<div class="sd-history"><div class="sd-history-title"><h3>批次明细</h3><span>${visible.length} 个批次</span></div><div class="sd-history-scroll"><div class="sd-history-grid">${visible.map((item, index) => { const value = item.snapshot[metric.key]; const prior = index > 0 ? visible[index - 1].snapshot[metric.key] : null; const delta = comparisonInfo(metric, value, prior); return `<div class="sd-history-cell ${Number(item.batch.id) === selectedId ? "current" : ""}"><span>${batchDateText(item.batch)}</span><b>${escapeHtml(metricText(metric, value, true))}</b><small class="${index === 0 ? "" : delta.className}">${index === 0 ? "起始批次" : `${delta.arrow} ${escapeHtml(delta.text)}`}</small></div>`; }).join("")}</div></div></div></div>`;
  }
  function defaultSelections() {
    return Object.fromEntries(CATEGORIES.map((category) => [category.id, [...category.defaults]]));
  }

  function closeModal(runtime) {
    runtime.container.querySelector("[data-sd-modal-mask]")?.classList.add("hidden");
    runtime.container.querySelector("[data-sd-modal]")?.classList.add("hidden");
    runtime.modalMode = null;
  }

  function openMetricModal(categoryId, runtime) {
    runtime.modalMode = "metric";
    runtime.editCategory = categoryId;
    runtime.editSelection = [...(runtime.selections[categoryId] || [])];
    const modal = runtime.container.querySelector("[data-sd-modal]");
    const mask = runtime.container.querySelector("[data-sd-modal-mask]");
    if (!modal || !mask) return;
    modal.innerHTML = renderMetricModal(categoryId, runtime);
    mask.classList.remove("hidden");
    modal.classList.remove("hidden");
  }

  function refreshMetricModal(runtime) {
    const modal = runtime.container.querySelector("[data-sd-modal]");
    if (modal && runtime.editCategory) modal.innerHTML = renderMetricModal(runtime.editCategory, runtime);
  }

  function closeZoom(runtime) {
    runtime.container.querySelector("[data-sd-zoom]")?.classList.add("hidden");
    runtime.container.querySelector("[data-sd-zoom-mask]")?.classList.add("hidden");
  }

  function openZoom(categoryId, metricKey, runtime) {
    const panel = runtime.container.querySelector("[data-sd-zoom]");
    const mask = runtime.container.querySelector("[data-sd-zoom-mask]");
    if (!panel) return;
    panel.innerHTML = renderZoomPanel(categoryId, metricKey, runtime);
    mask?.classList.remove("hidden");
    panel.classList.remove("hidden");
    drawCharts(runtime, panel);
  }

  function render(runtime, keepScroll = false) {
    const scrollY = window.scrollY;
    runtime.chartModels = {};
    runtime.container.innerHTML = renderPage(runtime);
    drawCharts(runtime);
    runtime.observer?.disconnect();
    const sections = [...runtime.container.querySelectorAll("[data-sd-section]")];
    const links = [...runtime.container.querySelectorAll("[data-sd-scroll]")];
    if (sections.length) {
      runtime.observer = new IntersectionObserver((entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) links.forEach((link) => link.classList.toggle("active", link.dataset.sdScroll === visible.target.dataset.sdSection));
      }, { rootMargin: "-130px 0px -60% 0px", threshold: [0.05, .25, .5] });
      sections.forEach((section) => runtime.observer.observe(section));
    }
    if (keepScroll) requestAnimationFrame(() => window.scrollTo({ top: scrollY, behavior: "instant" }));
  }

  function handleClick(event, runtime) {
    if (event.target.matches("[data-sd-modal-mask]")) { closeModal(runtime); return; }
    if (event.target.matches("[data-sd-zoom-mask]")) { closeZoom(runtime); return; }
    const closeModalButton = event.target.closest("[data-sd-close-modal]");
    if (closeModalButton) { closeModal(runtime); return; }
    const applyButton = event.target.closest("[data-sd-apply-metrics]");
    if (applyButton) {
      if (!runtime.editSelection.length) return;
      runtime.selections[runtime.editCategory] = [...runtime.editSelection];
      closeModal(runtime);
      render(runtime, true);
      return;
    }
    const openTeamColumns = event.target.closest("[data-sd-open-team-columns]");
    if (openTeamColumns) { openTeamColumnModal(runtime); return; }
    const applyTeamColumns = event.target.closest("[data-sd-apply-team-columns]");
    if (applyTeamColumns) {
      if (!runtime.teamConfigDraft?.size) return;
      runtime.teamColumns = new Set(runtime.teamConfigDraft);
      closeModal(runtime);
      render(runtime, true);
      return;
    }
    const teamPreset = event.target.closest("[data-sd-team-preset]");
    if (teamPreset) {
      const all = comparisonColumns().map((column) => column.key);
      const presets = {
        all,
        sales: ["sales", "orderCount", "revenue", "netSales", "fbaListings", "fbaAvail"],
        ads: ["adSpend", "adOrders", "acos", "acoas", "ctr", "adCvr", "cpc"]
      };
      runtime.teamConfigDraft = new Set(presets[teamPreset.dataset.sdTeamPreset] || all);
      refreshTeamColumnModal(runtime);
      return;
    }
    const saveTemplate = event.target.closest("[data-sd-save-team-template]");
    if (saveTemplate) {
      const input = runtime.container.querySelector("[data-sd-team-template-name]");
      const name = input?.value.trim();
      if (!name) { input?.focus(); return; }
      const templates = readTeamTemplates();
      templates[name] = [...runtime.teamConfigDraft];
      writeTeamTemplates(templates);
      refreshTeamColumnModal(runtime);
      return;
    }
    const loadTemplate = event.target.closest("[data-sd-load-team-template]");
    if (loadTemplate) {
      const keys = readTeamTemplates()[loadTemplate.dataset.sdLoadTeamTemplate];
      if (Array.isArray(keys)) {
        const valid = new Set(comparisonColumns().map((column) => column.key));
        runtime.teamConfigDraft = new Set(keys.filter((key) => valid.has(key)));
        refreshTeamColumnModal(runtime);
      }
      return;
    }
    const deleteTemplate = event.target.closest("[data-sd-delete-team-template]");
    if (deleteTemplate) {
      const templates = readTeamTemplates();
      delete templates[deleteTemplate.dataset.sdDeleteTeamTemplate];
      writeTeamTemplates(templates);
      refreshTeamColumnModal(runtime);
      return;
    }
    const openHistoryColumns = event.target.closest("[data-sd-open-history-columns]");
    if (openHistoryColumns) { openHistoryColumnModal(runtime); return; }
    const applyHistoryColumns = event.target.closest("[data-sd-apply-history-columns]");
    if (applyHistoryColumns) {
      if (!runtime.historyDraft?.size) return;
      runtime.historyMetrics = new Set(runtime.historyDraft);
      closeModal(runtime);
      render(runtime, true);
      return;
    }
    const historyPreset = event.target.closest("[data-sd-history-preset]");
    if (historyPreset) {
      const key = historyPreset.dataset.sdHistoryPreset;
      const presets = {
        all: allHistoryMetrics().map((item) => item.metric.key),
        sales: [...METRICS.sales.map((metric) => metric.key), "orderCount"],
        ads: METRICS.ads.map((metric) => metric.key),
        efficiency: METRICS.efficiency.map((metric) => metric.key),
        inventory: METRICS.inventory.map((metric) => metric.key)
      };
      runtime.historyDraft = new Set(presets[key] || presets.all);
      refreshHistoryColumnModal(runtime);
      return;
    }
    const sortButton = event.target.closest("[data-sd-sort-team]");
    if (sortButton) {
      const key = sortButton.dataset.sdSortTeam;
      if (runtime.teamSortKey === key) runtime.teamSortDir = runtime.teamSortDir === "desc" ? "asc" : "desc";
      else { runtime.teamSortKey = key; runtime.teamSortDir = "desc"; }
      render(runtime, true);
      return;
    }
    const openModalButton = event.target.closest("[data-sd-open-metrics]");
    if (openModalButton) { openMetricModal(openModalButton.dataset.sdOpenMetrics, runtime); return; }
    const removeButton = event.target.closest("[data-sd-remove-metric]");
    if (removeButton) {
      const categoryId = removeButton.dataset.sdCategory;
      const current = runtime.selections[categoryId] || [];
      if (current.length <= 1) return;
      runtime.selections[categoryId] = current.filter((key) => key !== removeButton.dataset.sdRemoveMetric);
      render(runtime, true);
      return;
    }
    const scrollButton = event.target.closest("[data-sd-scroll]");
    if (scrollButton) {
      runtime.container.querySelector(`#sd-section-${scrollButton.dataset.sdScroll}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
      runtime.container.querySelectorAll("[data-sd-scroll]").forEach((button) => button.classList.toggle("active", button === scrollButton));
      return;
    }
    const personRow = event.target.closest("[data-sd-person]");
    if (personRow) { runtime.scope = personRow.dataset.sdPerson; render(runtime, true); return; }
    if (event.target.closest("[data-sd-scope-all]")) { runtime.scope = "all"; render(runtime, true); return; }
    const rangeButton = event.target.closest("[data-sd-range]");
    if (rangeButton) { runtime.range = rangeButton.dataset.sdRange; render(runtime, true); return; }
    const metricCard = event.target.closest("[data-sd-metric]");
    if (metricCard) { openZoom(metricCard.dataset.sdCategory, metricCard.dataset.sdMetric, runtime); return; }
    if (event.target.closest("[data-sd-close-zoom]")) { closeZoom(runtime); return; }
    if (!event.target.closest("[data-sd-zoom]")) closeZoom(runtime);
  }

  function handleChange(event, runtime) {
    if (event.target.matches("[data-sd-week]")) { runtime.batchId = Number(event.target.value); render(runtime, true); return; }
    if (event.target.matches("[data-sd-scope]")) { runtime.scope = event.target.value; render(runtime, true); return; }
    if (event.target.closest("[data-sd-modal]") && event.target.matches("input[type=checkbox]")) {
      const value = event.target.value;
      if (runtime.modalMode === "team-columns") {
        if (event.target.checked) runtime.teamConfigDraft.add(value); else runtime.teamConfigDraft.delete(value);
        refreshTeamColumnModal(runtime);
        return;
      }
      if (runtime.modalMode === "history-columns") {
        if (event.target.checked) runtime.historyDraft.add(value); else runtime.historyDraft.delete(value);
        refreshHistoryColumnModal(runtime);
        return;
      }
      if (event.target.checked) {
        if (runtime.editSelection.length >= 3) { event.target.checked = false; return; }
        if (!runtime.editSelection.includes(value)) runtime.editSelection.push(value);
      } else runtime.editSelection = runtime.editSelection.filter((item) => item !== value);
      refreshMetricModal(runtime);
    }
  }

  function handleKeydown(event, runtime) {
    if (event.key === "Escape") { closeModal(runtime); closeZoom(runtime); return; }
    const card = event.target.closest?.("[data-sd-metric]");
    if (card && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); openZoom(card.dataset.sdCategory, card.dataset.sdMetric, runtime); }
  }

  function hideHover(wrap) {
    if (!wrap) return;
    wrap.querySelector(".sd-chart-tooltip")?.classList.add("hidden");
    wrap.querySelectorAll(".sd-hover-line, .sd-hover-dot").forEach((node) => node.setAttribute("visibility", "hidden"));
  }

  function handlePointerMove(event, runtime) {
    const wrap = event.target.closest?.("[data-sd-chart]");
    if (runtime.hoverWrap && runtime.hoverWrap !== wrap) { hideHover(runtime.hoverWrap); runtime.hoverWrap = null; }
    if (!wrap) return;
    const model = runtime.chartModels[wrap.dataset.sdChart];
    const tooltip = wrap.querySelector(".sd-chart-tooltip");
    if (!model?.geom || !tooltip || !model.visible.length) return;
    runtime.hoverWrap = wrap;
    const rect = wrap.getBoundingClientRect();
    const pointerX = event.clientX - rect.left;
    const { xs, ys, padding } = model.geom;
    let index = 0;
    xs.forEach((x, i) => { if (Math.abs(x - pointerX) < Math.abs(xs[index] - pointerX)) index = i; });
    const line = wrap.querySelector(".sd-hover-line");
    line?.setAttribute("x1", xs[index].toFixed(1));
    line?.setAttribute("x2", xs[index].toFixed(1));
    line?.setAttribute("visibility", "visible");
    wrap.querySelectorAll("[data-sd-hover-dot]").forEach((dot) => {
      const y = ys[Number(dot.dataset.sdHoverDot)]?.[index];
      if (y === null || y === undefined) { dot.setAttribute("visibility", "hidden"); return; }
      dot.setAttribute("cx", xs[index].toFixed(1));
      dot.setAttribute("cy", y.toFixed(1));
      dot.setAttribute("visibility", "visible");
    });
    const batch = model.visible[index].batch;
    const rows = model.datasets.map((item) => {
      const value = item.values[index];
      const prior = index > 0 ? item.values[index - 1] : null;
      const delta = index > 0 ? comparisonInfo(item.metric, value, prior) : null;
      const unit = metricUnit(item.metric);
      return `<div class="sd-tip-row"><span><i style="background:${item.color}"></i>${escapeHtml(item.metric.label)}</span><strong>${escapeHtml(metricText(item.metric, value))}${unit && value !== null ? ` ${escapeHtml(unit)}` : ""}</strong>${delta ? `<em class="${delta.className}">${delta.arrow} ${escapeHtml(delta.text)}</em>` : "<em></em>"}</div>`;
    }).join("");
    tooltip.innerHTML = `<b>${batchDateText(batch)}<span>第 ${escapeHtml(batch.week_no || "—")} 周</span></b>${rows}`;
    tooltip.classList.remove("hidden");
    const tipWidth = tooltip.offsetWidth;
    let left = xs[index] + 14;
    if (left + tipWidth > rect.width - 4) left = xs[index] - 14 - tipWidth;
    tooltip.style.left = `${clamp(left, 4, Math.max(4, rect.width - tipWidth - 4))}px`;
    tooltip.style.top = `${padding.top}px`;
  }

  function mount(container, data) {
    if (!container) return;
    const runtime = container.__summaryDashboard || {
      container,
      data,
      scope: "all",
      batchId: Number(data.currentBatchId) || null,
      range: "4",
      historyMetrics: new Set(allHistoryMetrics().map((item) => item.metric.key)),
      historyDraft: new Set(),
      selections: defaultSelections(),
      editCategory: null,
      editSelection: [],
      teamColumns: new Set(comparisonColumns().filter((column) => column.defaultVisible).map((column) => column.key)),
      teamSortKey: "sales",
      teamSortDir: "desc",
      teamConfigDraft: new Set(),
      modalMode: null,
      chartModels: {},
      lastView: null,
      observer: null
    };
    runtime.container = container;
    runtime.data = data;
    if (!runtime.batchId) runtime.batchId = Number(data.currentBatchId) || null;
    runtime.selections = runtime.selections || defaultSelections();
    runtime.historyMetrics = runtime.historyMetrics instanceof Set ? runtime.historyMetrics : new Set(allHistoryMetrics().map((item) => item.metric.key));
    runtime.historyDraft = runtime.historyDraft instanceof Set ? runtime.historyDraft : new Set();
    runtime.teamColumns = runtime.teamColumns || new Set(comparisonColumns().filter((column) => column.defaultVisible).map((column) => column.key));
    runtime.teamSortKey = runtime.teamSortKey || "sales";
    runtime.teamSortDir = runtime.teamSortDir || "desc";
    container.__summaryDashboard = runtime;
    container.onclick = (event) => handleClick(event, runtime);
    container.onchange = (event) => handleChange(event, runtime);
    container.onkeydown = (event) => handleKeydown(event, runtime);
    container.onpointermove = (event) => handlePointerMove(event, runtime);
    container.onpointerleave = () => { hideHover(runtime.hoverWrap); runtime.hoverWrap = null; };
    if (!runtime.resizeObserver && window.ResizeObserver) {
      runtime.lastWidth = container.clientWidth;
      runtime.resizeObserver = new ResizeObserver(() => {
        if (container.clientWidth === runtime.lastWidth) return;
        runtime.lastWidth = container.clientWidth;
        cancelAnimationFrame(runtime.resizeFrame);
        runtime.resizeFrame = requestAnimationFrame(() => drawCharts(runtime));
      });
      runtime.resizeObserver.observe(container);
    }
    render(runtime);
  }

  window.SummaryDashboard = { mount };
})();
