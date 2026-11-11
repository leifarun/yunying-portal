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
      { key: "revenue", label: "销售额", unit: "¥", format: "currency", goodWhen: "up" },
      { key: "revenueWow", label: "销售额环比", unit: "%", format: "percent", goodWhen: "up", compareMode: "pp" },
      { key: "netSales", label: "净销售额", unit: "¥", format: "currency", goodWhen: "up" },
      { key: "aov", label: "平均客单价", unit: "¥", format: "currency2", goodWhen: "up", hint: "净销售额 ÷ 销量" },
      { key: "fbaAvail", label: "FBA可售总量", unit: "件", format: "integer", goodWhen: null },
      { key: "fbaUnavail", label: "FBA不可售", unit: "件", format: "integer", goodWhen: "down" },
      { key: "refundQty", label: "退款量", unit: "件", format: "integer", goodWhen: "down" },
      { key: "refundRate", label: "退款率", unit: "%", format: "percent", goodWhen: "down", hint: "退款量 ÷ 销量" },
      { key: "orderGrossProfit", label: "订单毛利润额", unit: "¥", format: "currency", goodWhen: "up" },
      { key: "grossMargin", label: "订单毛利率", unit: "%", format: "percent", goodWhen: "up", hint: "订单毛利额 ÷ 净销售额" }
    ],
    ads: [
      { key: "impressions", label: "展示量", unit: "次", format: "integer", goodWhen: "up" },
      { key: "clicks", label: "点击量", unit: "次", format: "integer", goodWhen: "up" },
      { key: "adSpend", label: "广告花费", unit: "¥", format: "currency", goodWhen: "down" },
      { key: "adSales", label: "广告销售额", unit: "¥", format: "currency", goodWhen: "up" },
      { key: "adOrders", label: "广告订单量", unit: "单", format: "integer", goodWhen: "up" },
      { key: "adOrderShare", label: "广告订单占比", unit: "%", format: "percent", goodWhen: "up", hint: "广告订单 ÷ 销量" },
      { key: "ctr", label: "CTR（点击率）", unit: "%", format: "percent", goodWhen: "up", hint: "点击 ÷ 展示" },
      { key: "adCvr", label: "广告CVR（转化率）", unit: "%", format: "percent", goodWhen: "up", hint: "广告订单 ÷ 点击" },
      { key: "cpc", label: "CPC", unit: "¥", format: "currency2", goodWhen: "down", hint: "广告花费 ÷ 点击" },
      { key: "roas", label: "ROAS", unit: "×", format: "multiple", goodWhen: "up", hint: "广告销售额 ÷ 广告花费" },
      { key: "acos", label: "ACOS", unit: "%", format: "percent", goodWhen: "down", hint: "广告花费 ÷ 广告销售额" },
      { key: "acoas", label: "ACoAS", unit: "%", format: "percent", goodWhen: "down", hint: "广告花费 ÷ 净销售额" }
    ],
    efficiency: [
      { key: "inventoryDepth", label: "FBA库存深度", unit: "件/款", format: "decimal", goodWhen: null, hint: "FBA可售 ÷ Listing款数" },
      { key: "avgProfit", label: "平均单个利润", unit: "¥", format: "currency2", goodWhen: "up", hint: "订单毛利额 ÷ 销量 × 1.7" },
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
      { key: "showValue", label: "展示量不够的货值", unit: "¥", format: "currency", goodWhen: "down" },
      { key: "needAdValue", label: "需要开广告的货值", unit: "¥", format: "currency", goodWhen: "down" },
      { key: "clickValue", label: "点击率偏低的货值", unit: "¥", format: "currency", goodWhen: "down" },
      { key: "cvrValue", label: "转化率偏低的货值", unit: "¥", format: "currency", goodWhen: "down" },
      { key: "invalidAdValue", label: "广告无效花费的货值", unit: "¥", format: "currency", goodWhen: "down" },
      { key: "midLowSlowValue", label: "总中低潜力滞销品货值", unit: "¥", format: "currency", goodWhen: "down", hint: "中潜力 + 低潜力" },
      { key: "lowSlowValue", label: "低潜力滞销品货值", unit: "¥", format: "currency", goodWhen: "down" },
      { key: "midSlowValue", label: "中潜力滞销品货值", unit: "¥", format: "currency", goodWhen: "down" },
      { key: "highSlowValue", label: "高潜力滞销品货值", unit: "¥", format: "currency", goodWhen: null },
      { key: "totalSlowValue", label: "总滞销品货值", unit: "¥", format: "currency", goodWhen: "down" },
      { key: "age90Value", label: "库龄 > 90 天货值", unit: "¥", format: "currency", goodWhen: "down", hint: "含 180 天及以上" },
      { key: "age180Value", label: "库龄 > 180 天货值", unit: "¥", format: "currency", goodWhen: "down", hint: "含 270 天及以上" },
      { key: "age270Value", label: "库龄 > 270 天货值", unit: "¥", format: "currency", goodWhen: "down" }
    ]
  };

  const CATEGORIES = [
    { id: "sales", number: "01", title: "销售指标", short: "销售", tone: "blue", defaults: ["sales", "netSales"], desc: "规模、客单、库存与利润结果指标" },
    { id: "ads", number: "02", title: "广告表现", short: "广告", tone: "cyan", defaults: ["impressions", "clicks"], desc: "流量、花费、订单与广告效率指标" },
    { id: "efficiency", number: "03", title: "商品效率", short: "效率", tone: "green", defaults: ["classA", "classB"], desc: "库存深度、出单效率与销量分层" },
    { id: "inventory", number: "04", title: "库存周转指标", short: "库存", tone: "orange", defaults: ["totalSlowValue", "midLowSlowValue"], desc: "问题货值与滞销、长库龄风险敞口" }
  ];

  const SERIES_COLORS = ["#2e6ce6", "#0d9fb8", "#7656d8"];
  const SUMMARY_FIELDS = [
    "listingCount", "sales", "revenue", "netSales", "fbaAvail", "fbaUnavail", "refundQty", "orderGrossProfit",
    "impressions", "clicks", "adSpend", "adSales", "adOrders", "orderedListingCount", "fbaListingCount",
    "fbaUnavailListingCount", "classA", "classB", "classC", "classD", "classE", "fbaValue",
    "showValue", "needAdValue", "clickValue", "cvrValue", "invalidAdValue", "lowSlowValue", "midSlowValue",
    "highSlowValue", "age90Value", "age180Value", "age270Value"
  ];

  function metricText(metric, value, compact = false) {
    if (value === null || value === undefined || Number.isNaN(Number(value))) return "—";
    switch (metric.format) {
      case "currency": return `¥${fmt(value)}`;
      case "currency2": return `¥${fmt(value, Math.abs(Number(value)) < 100 ? 2 : 0)}`;
      case "percent": return `${(Number(value) * 100).toFixed(compact ? 1 : 2)}%`;
      case "decimal": return fmt(value, 2);
      case "multiple": return `${fmt(value, 2)}×`;
      default: return fmt(value);
    }
  }

  function metricUnit(metric) {
    return ["currency", "currency2", "percent", "multiple"].includes(metric.format) ? "" : metric.unit || "";
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
      listingCount: num(row.listing_count), sales: num(row.sales), revenue: num(row.revenue), netSales: num(row.net_sales),
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
      { category: "sales", key: "sales", label: "销量" },
      { category: "sales", key: "netSales", label: "净销售额" },
      { category: "ads", key: "adSpend", label: "广告花费" },
      { category: "ads", key: "adSales", label: "广告销售额" },
      { category: "ads", key: "acoas", label: "ACoAS" },
      { category: "sales", key: "refundRate", label: "退款率" },
      { category: "efficiency", key: "orderRate", label: "出单率" },
      { category: "sales", key: "fbaAvail", label: "FBA可售" },
      { category: "inventory", key: "totalSlowValue", label: "总滞销货值" },
      { category: "inventory", key: "age90Value", label: "库龄>90天货值" }
    ];
  }

  function metricFor(column) {
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

  function renderMetricCard(category, metric, current, previous) {
    const value = current?.[metric.key] ?? null;
    const prior = previous?.[metric.key] ?? null;
    const comparison = comparisonInfo(metric, value, prior);
    const unit = metricUnit(metric);
    return `
      <article class="sd-metric" data-sd-metric="${metric.key}" data-sd-category="${category.id}" tabindex="0" aria-label="${escapeHtml(metric.label)}，查看历史趋势">
        <div class="sd-metric-label-row">
          <span class="sd-metric-label" title="${escapeHtml(metric.hint || metric.label)}">${escapeHtml(metric.label)}</span>
          <span class="sd-metric-badge-wrap"><span class="sd-zoom-mark" aria-hidden="true">↗</span></span>
        </div>
        <div class="sd-metric-value ${value === null ? "empty" : ""}">${escapeHtml(metricText(metric, value))}${unit && value !== null ? `<span class="unit">${escapeHtml(unit)}</span>` : ""}</div>
        <div class="sd-metric-meta">${comparison.arrow ? `<span class="${comparison.className}">${comparison.arrow} ${escapeHtml(comparison.text)}</span>` : `<span class="${comparison.className}">${escapeHtml(comparison.text)}</span>`}<span>较上期</span></div>
      </article>`;
  }

  function renderLegend(category, metrics, current, runtime) {
    return metrics.map((metric, index) => `
      <span class="sd-legend-chip" style="--series-color:${SERIES_COLORS[index % SERIES_COLORS.length]}">
        <i></i><b>${escapeHtml(metric.label)}</b><span>${escapeHtml(metricText(metric, current?.[metric.key], true))}</span>
        <button type="button" data-sd-remove-metric="${metric.key}" data-sd-category="${category.id}" aria-label="移除 ${escapeHtml(metric.label)}">×</button>
      </span>`).join("");
  }

  function renderChart(category, series, dataset, runtime) {
    const visible = series.map((snapshot, index) => ({ snapshot, batch: dataset.batches[index] })).filter((item) => item.snapshot && item.batch);
    if (!visible.length) return `<div class="sd-chart-empty">当前批次暂无趋势数据</div>`;
    const metrics = (METRICS[category.id] || []).filter((metric) => (runtime.selections[category.id] || []).includes(metric.key));
    const datasets = metrics.map((metric, index) => ({
      metric,
      color: SERIES_COLORS[index % SERIES_COLORS.length],
      values: visible.map((item) => item.snapshot[metric.key] === null || item.snapshot[metric.key] === undefined ? null : Number(item.snapshot[metric.key]))
    })).filter((item) => item.values.some((value) => value !== null && Number.isFinite(value)));
    if (!datasets.length) return `<div class="sd-chart-empty">请选择至少一个可通过趋势图展示的指标</div>`;
    const normalized = new Set(datasets.map((dataset) => dataset.metric.unit || dataset.metric.format)).size > 1;
    const width = 920, height = 275;
    const padding = { left: 68, right: 42, top: 18, bottom: 37 };
    const plotWidth = width - padding.left - padding.right, plotHeight = height - padding.top - padding.bottom;
    const xFor = (index) => padding.left + (visible.length === 1 ? plotWidth / 2 : index / (visible.length - 1) * plotWidth);
    let domainMin = 0, domainMax = 100;
    if (!normalized) {
      const values = datasets.flatMap((dataset) => dataset.values).filter((value) => value !== null && Number.isFinite(value));
      const min = Math.min(...values), max = Math.max(...values), pad = Math.max((max - min) * .12, Math.abs(max) * .04, 1);
      domainMin = Math.max(0, min - pad); domainMax = max + pad;
    }
    const yFor = (value, dataset) => {
      if (value === null || !Number.isFinite(value)) return null;
      let ratio;
      if (normalized) {
        const values = dataset.values.filter((item) => item !== null && Number.isFinite(item));
        const min = Math.min(...values), max = Math.max(...values);
        ratio = max === min ? .5 : (value - min) / (max - min);
      } else ratio = (value - domainMin) / Math.max(domainMax - domainMin, 1);
      return padding.top + (1 - ratio) * plotHeight;
    };
    let grid = "";
    for (let tick = 0; tick < 5; tick += 1) {
      const ratio = tick / 4, y = padding.top + ratio * plotHeight;
      const value = domainMax - ratio * (domainMax - domainMin);
      const label = normalized ? `${Math.round(100 - ratio * 100)}` : metricText(metrics[0], value, true).replace("¥", "");
      grid += `<line class="sd-grid-line" x1="${padding.left}" y1="${y.toFixed(1)}" x2="${width - padding.right}" y2="${y.toFixed(1)}"></line><text class="sd-axis-label" x="${padding.left - 11}" y="${(y + 3).toFixed(1)}" text-anchor="end">${escapeHtml(label)}</text>`;
    }
    const xLabels = visible.map((item, index) => `<text class="sd-axis-label" x="${xFor(index).toFixed(1)}" y="${height - 11}" text-anchor="middle">W${item.batch.week_no}</text>`).join("");
    const lines = datasets.map((dataset) => {
      let path = "", started = false;
      const points = dataset.values.map((value, index) => {
        const y = yFor(value, dataset);
        if (y === null) { started = false; return ""; }
        path += `${started ? " L" : " M"}${xFor(index).toFixed(2)},${y.toFixed(2)}`; started = true;
        return `<circle class="sd-point" cx="${xFor(index).toFixed(1)}" cy="${y.toFixed(1)}" r="${index === dataset.values.length - 1 ? 4 : 3}" fill="${dataset.color}"></circle>`;
      }).join("");
      return `<path class="sd-line" d="${path.trim()}" stroke="${dataset.color}"></path>${points}`;
    }).join("");
    const hitAreas = visible.map((_, index) => {
      const previousX = index === 0 ? padding.left : (xFor(index - 1) + xFor(index)) / 2;
      const nextX = index === visible.length - 1 ? width - padding.right : (xFor(index) + xFor(index + 1)) / 2;
      return `<rect data-sd-point-index="${index}" x="${previousX.toFixed(1)}" y="${padding.top}" width="${Math.max(1, nextX - previousX).toFixed(1)}" height="${plotHeight}" fill="transparent"></rect>`;
    }).join("");
    runtime.chartModels[category.id] = { width, height, padding, plotWidth, plotHeight, visible, datasets, normalized, domainMin, domainMax };
    return `
      <div class="sd-chart-wrap" data-sd-chart="${category.id}">
        <svg class="sd-chart-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeHtml(category.title)}周批次趋势图">
          <title>${escapeHtml(category.title)}周批次趋势图</title>
          <desc>${normalized ? "不同单位的指标按自身区间归一化展示" : "按周批次汇总值绘制"}</desc>
          ${grid}${lines}${xLabels}<text class="sd-axis-title" x="${padding.left}" y="12">${escapeHtml(normalized ? "相对指数" : metrics[0]?.unit || "")}</text>${hitAreas}
        </svg>
        <div class="sd-chart-tooltip hidden"></div>
      </div>`;
  }

  function renderSection(category, series, current, previous, dataset, runtime) {
    const metrics = METRICS[category.id] || [];
    const selected = metrics.filter((metric) => (runtime.selections[category.id] || []).includes(metric.key));
    return `
      <section class="sd-section" id="sd-section-${category.id}" data-sd-section="${category.id}">
        <div class="sd-section-card tone-${category.tone}">
          <header class="sd-section-head">
            <div class="sd-section-title"><span class="sd-section-no">${category.number}</span><div><h2>${escapeHtml(category.title)}</h2><p>${escapeHtml(category.desc)} · ${metrics.length} 项指标</p></div></div>
            <div class="sd-section-tools"><span class="pill pill-blue">第 ${dataset.selectedBatch?.week_no || "—"} 周</span><button class="btn btn-sm" type="button" data-sd-open-metrics="${category.id}">配置趋势指标</button></div>
          </header>
          <div class="sd-metric-grid">${metrics.map((metric) => renderMetricCard(category, metric, current, previous)).join("")}</div>
          <div class="sd-chart-block">
            <div class="sd-chart-head"><div class="sd-chart-title"><h3>${escapeHtml(category.title)}趋势</h3><p>${dataset.batches.filter((_, index) => series[index]).map((batch) => `W${batch.week_no}`).join(" · ")}</p></div><button class="sd-small-btn" type="button" data-sd-open-metrics="${category.id}">＋ 选择指标</button></div>
            <div class="sd-chart-legend">${renderLegend(category, selected, current, runtime)}</div>
            ${renderChart(category, series, dataset, runtime)}
          </div>
        </div>
      </section>`;
  }
  function renderComparison(dataset, batch) {
    const rawRows = dataset.byBatch.get(Number(batch?.id)) || [];
    if (!rawRows.length) return "";
    const columns = comparisonColumns();
    const ownerOrder = dataset.owners;
    const byOwner = new Map(rawRows.map((row) => [row.owner, deriveSnapshot(row, null)]));
    const rows = ownerOrder.filter((owner) => byOwner.has(owner)).map((owner) => ({ owner, snapshot: byOwner.get(owner) }));
    return `
      <section class="sd-comparison-card">
        <div class="sd-comparison-head"><div><h2>团队指标对比</h2><p>第 ${batch.week_no} 周 · 点击负责人行可切换到个人数据</p></div><div class="sd-head-actions"><span class="pill pill-blue">${rows.length} 人</span><span class="pill pill-gray">当前批次汇总</span></div></div>
        <div class="sd-comparison-scroll"><table class="sd-comparison-table" aria-label="团队指标对比"><thead><tr><th>负责人</th>${columns.map((column) => `<th>${escapeHtml(column.label)}</th>`).join("")}</tr></thead><tbody>
          ${rows.map(({ owner, snapshot }) => `<tr data-sd-person="${escapeHtml(owner)}" title="查看 ${escapeHtml(owner)} 的数据"><td><b>${escapeHtml(owner)}</b><small>成员</small></td>${columns.map((column) => { const metric = metricFor(column); const unit = metricUnit(metric); const value = snapshot[column.key]; return `<td title="${escapeHtml(column.label)}">${escapeHtml(metricText(metric, value, true))}${unit && value !== null ? `<small>${escapeHtml(unit)}</small>` : ""}</td>`; }).join("")}</tr>`).join("")}
        </tbody></table></div><div class="sd-comparison-foot"><span>共 ${rows.length} 人</span><span>数据口径：每人 × 每周 1 条汇总快照</span></div>
      </section>`;
  }

  function renderSnapshot(current, previous, scope, batch, isCurrent) {
    const netDelta = current && previous?.netSales ? (current.netSales - previous.netSales) / previous.netSales : null;
    return `
      <section class="sd-snapshot-strip">
        <div class="sd-snapshot-lead"><b>${escapeHtml(scopeLabel(scope))} · 第 ${batch?.week_no || "—"} 周</b><p>每人 × 每批 1 条汇总快照。当前周按最新产品实时汇总，历史周使用已保存快照。</p></div>
        <div class="sd-snapshot-stat"><span>Listing 款数</span><b>${fmt(current?.listingCount)}</b><small>本周汇总口径</small></div>
        <div class="sd-snapshot-stat"><span>销量</span><b>${fmt(current?.sales)}</b><small>${batchDateText(batch)}</small></div>
        <div class="sd-snapshot-stat"><span>净销售额</span><b>¥${fmt(current?.netSales)}</b><small>${netDelta === null ? "首次记录" : `${netDelta >= 0 ? "↑" : "↓"} ${Math.abs(netDelta * 100).toFixed(1)}%`}</small></div>
        <div class="sd-snapshot-stat"><span>广告花费</span><b>¥${fmt(current?.adSpend)}</b><small>ACOS ${current?.acos === null || current?.acos === undefined ? "—" : `${(current.acos * 100).toFixed(2)}%`}</small></div>
      </section>`;
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
    rt.lastView = { dataset, series, selectedIndex, batch, scope };
    const isCurrent = Number(batch.id) === Number(dataset.currentBatchId);
    const weekOptions = dataset.batches.map((item) => `<option value="${item.id}" ${Number(item.id) === Number(batch.id) ? "selected" : ""}>第 ${item.week_no} 周 · ${batchDateText(item)}${dataset.availableIds.has(Number(item.id)) ? "" : "（无汇总）"}</option>`).join("");
    const ownerOptions = [`<option value="all" ${scope === "all" ? "selected" : ""}>所有人</option>`, ...dataset.owners.map((owner) => `<option value="${escapeHtml(owner)}" ${scope === owner ? "selected" : ""}>${escapeHtml(owner)}</option>`)].join("");
    return `
      <div class="sd-page-head"><div class="sd-page-title"><span class="sd-eyebrow">WEEKLY PERFORMANCE SNAPSHOT</span><h1>总数据看板</h1><p>${batchDateText(batch)} · ${isCurrent ? "当前周实时汇总" : "历史批次快照"} · ${scope === "all" ? "所有成员合计" : `当前查看 ${escapeHtml(scope)}`}</p></div><div class="sd-page-actions"><label class="sd-control"><span>周批次</span><select data-sd-week>${weekOptions}</select></label><label class="sd-control"><span>查看范围</span><select data-sd-scope>${ownerOptions}</select></label><span class="pill ${isCurrent ? "pill-green" : "pill-gray"}">${isCurrent ? "实时数据" : "历史快照"}</span><span class="pill pill-blue">汇总粒度：人 × 周</span></div></div>
      ${renderSnapshot(current, previous, scope, batch, isCurrent)}
      ${scope === "all" ? renderComparison(dataset, batch) : ""}
      <div class="sd-category-nav">${CATEGORIES.map((category, index) => `<button class="sd-category-link ${index === 0 ? "active" : ""}" type="button" data-sd-scroll="${category.id}"><span>${category.number}</span>${escapeHtml(category.short)}</button>`).join("")}<span class="sd-nav-spacer"></span><button class="sd-small-btn" type="button" data-sd-open-metrics="sales">⚙ 自定义图表</button></div>
      <div>${CATEGORIES.map((category) => renderSection(category, series, current, previous, dataset, rt)).join("")}</div>
      <div class="sd-modal-mask hidden" data-sd-modal-mask></div>
      <section class="sd-modal hidden" data-sd-modal role="dialog" aria-modal="true"></section>
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

  function renderZoomChart(metric, visible) {
    const width = 820, height = 310;
    const padding = { left: 66, right: 30, top: 30, bottom: 40 };
    const plotWidth = width - padding.left - padding.right, plotHeight = height - padding.top - padding.bottom;
    const values = visible.map((item) => item.snapshot[metric.key] === null || item.snapshot[metric.key] === undefined ? null : Number(item.snapshot[metric.key]));
    const available = values.filter((value) => value !== null);
    if (!available.length) return `<div class="sd-chart-empty">该指标暂无可展示数据</div>`;
    const min = Math.min(...available), max = Math.max(...available), pad = Math.max((max - min) * .13, Math.abs(max) * .045, 1);
    const domainMin = Math.max(0, min - pad), domainMax = max + pad;
    const xFor = (index) => padding.left + (visible.length === 1 ? plotWidth / 2 : index / (visible.length - 1) * plotWidth);
    const yFor = (value) => padding.top + (1 - (value - domainMin) / Math.max(domainMax - domainMin, 1)) * plotHeight;
    let grid = "";
    for (let tick = 0; tick < 5; tick += 1) { const ratio = tick / 4, y = padding.top + ratio * plotHeight, value = domainMax - ratio * (domainMax - domainMin); grid += `<line class="sd-grid-line" x1="${padding.left}" y1="${y.toFixed(1)}" x2="${width - padding.right}" y2="${y.toFixed(1)}"></line><text class="sd-axis-label" x="${padding.left - 10}" y="${(y + 3).toFixed(1)}" text-anchor="end">${escapeHtml(metricText(metric, value, true).replace("¥", ""))}</text>`; }
    let path = "", started = false;
    values.forEach((value, index) => { if (value === null) { started = false; return; } path += `${started ? " L" : " M"}${xFor(index).toFixed(2)},${yFor(value).toFixed(2)}`; started = true; });
    const indexes = values.map((value, index) => value === null ? null : index).filter((index) => index !== null);
    const area = indexes.length > 1 ? `${path} L${xFor(indexes.at(-1)).toFixed(2)},${padding.top + plotHeight} L${xFor(indexes[0]).toFixed(2)},${padding.top + plotHeight} Z` : "";
    const points = values.map((value, index) => value === null ? "" : `<circle class="${index === visible.length - 1 ? "sd-zoom-current" : "sd-zoom-point"}" cx="${xFor(index).toFixed(1)}" cy="${yFor(value).toFixed(1)}" r="${index === visible.length - 1 ? 4.5 : 3.5}"></circle><text class="sd-zoom-label" x="${xFor(index).toFixed(1)}" y="${(yFor(value) - 10).toFixed(1)}" text-anchor="middle">${escapeHtml(metricText(metric, value, true))}</text>`).join("");
    const labels = visible.map((item, index) => `<text class="sd-axis-label" x="${xFor(index).toFixed(1)}" y="${height - 13}" text-anchor="middle">W${item.batch.week_no}</text>`).join("");
    return `<div class="sd-zoom-chart"><svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeHtml(metric.label)}历史趋势"><title>${escapeHtml(metric.label)}历史趋势</title><defs><linearGradient id="sdZoomArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#2e6ce6" stop-opacity=".24"></stop><stop offset="100%" stop-color="#2e6ce6" stop-opacity=".01"></stop></linearGradient></defs>${grid}${area ? `<path class="sd-zoom-area" d="${area}" fill="url(#sdZoomArea)"></path>` : ""}<path class="sd-zoom-line" d="${path.trim()}"></path>${points}${labels}</svg></div>`;
  }

  function renderZoomPanel(categoryId, metricKey, runtime) {
    const category = CATEGORIES.find((item) => item.id === categoryId);
    const metric = (METRICS[categoryId] || []).find((item) => item.key === metricKey);
    const view = runtime.lastView;
    if (!category || !metric || !view) return "";
    const visible = view.series.map((snapshot, index) => ({ snapshot, batch: view.dataset.batches[index] })).filter((item) => item.snapshot && item.batch).slice(-12);
    const current = visible.at(-1)?.snapshot || null;
    const previous = visible.at(-2)?.snapshot || null;
    const values = visible.map((item) => item.snapshot[metric.key]).filter((value) => value !== null && value !== undefined);
    const high = values.length ? Math.max(...values) : null, low = values.length ? Math.min(...values) : null;
    const comparison = comparisonInfo(metric, current?.[metric.key], previous?.[metric.key]);
    return `<div class="sd-zoom-head"><div><span class="eyebrow">QUICK TREND · ${escapeHtml(category.title)}</span><h2>${escapeHtml(metric.label)} · 历史趋势</h2><p>${escapeHtml(scopeLabel(view.scope))} · ${visible.map((item) => `W${item.batch.week_no}`).join("–")}</p></div><div class="sd-head-actions"><span class="pill pill-blue">当前 ${escapeHtml(metricText(metric, current?.[metric.key], true))}</span><button class="sd-icon-btn" type="button" data-sd-close-zoom>×</button></div></div><div class="sd-zoom-body"><div class="sd-zoom-summary"><div><span>当前值</span><b>${escapeHtml(metricText(metric, current?.[metric.key]))}${metricUnit(metric) ? ` ${escapeHtml(metricUnit(metric))}` : ""}</b><small>第 ${visible.at(-1)?.batch.week_no || "—"} 周</small></div><div><span>较前一周</span><b class="${comparison.className}">${escapeHtml(comparison.text)}</b><small>${metric.compareMode === "pp" ? "百分点变化" : "环比变化"}</small></div><div><span>区间最高</span><b>${escapeHtml(metricText(metric, high))}</b><small>当前已加载批次</small></div><div><span>区间最低</span><b>${escapeHtml(metricText(metric, low))}</b><small>当前已加载批次</small></div></div>${renderZoomChart(metric, visible)}<div class="sd-history"><div class="sd-history-title"><h3>完整历史数据</h3><span>每个批次一条汇总快照</span></div><div class="sd-history-scroll"><div class="sd-history-grid">${visible.map((item, index) => { const value = item.snapshot[metric.key]; const prior = index > 0 ? visible[index - 1].snapshot[metric.key] : null; const delta = comparisonInfo(metric, value, prior); return `<div class="sd-history-cell ${index === visible.length - 1 ? "current" : ""}"><span>W${item.batch.week_no} · ${batchDateText(item.batch)}</span><b>${escapeHtml(metricText(metric, value, true))}</b><small>${index === 0 ? "起始周" : escapeHtml(delta.text)}</small></div>`; }).join("")}</div></div></div></div>`;
  }
  function defaultSelections() {
    return Object.fromEntries(CATEGORIES.map((category) => [category.id, [...category.defaults]]));
  }

  function closeModal(runtime) {
    runtime.container.querySelector("[data-sd-modal-mask]")?.classList.add("hidden");
    runtime.container.querySelector("[data-sd-modal]")?.classList.add("hidden");
  }

  function openMetricModal(categoryId, runtime) {
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
  }

  function openZoom(categoryId, metricKey, runtime) {
    const panel = runtime.container.querySelector("[data-sd-zoom]");
    if (!panel) return;
    panel.innerHTML = renderZoomPanel(categoryId, metricKey, runtime);
    panel.classList.remove("hidden");
  }

  function render(runtime, keepScroll = false) {
    const scrollY = window.scrollY;
    runtime.chartModels = {};
    runtime.container.innerHTML = renderPage(runtime);
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

  function handlePointerMove(event, runtime) {
    const wrap = event.target.closest?.("[data-sd-chart]");
    if (!wrap) return;
    const model = runtime.chartModels[wrap.dataset.sdChart];
    const tooltip = wrap.querySelector(".sd-chart-tooltip");
    const svg = wrap.querySelector("svg");
    if (!model || !tooltip || !svg || !model.visible.length) return;
    const rect = svg.getBoundingClientRect();
    const chartX = (event.clientX - rect.left) / rect.width * model.width;
    const ratio = clamp((chartX - model.padding.left) / model.plotWidth, 0, 1);
    const index = Math.round(ratio * Math.max(0, model.visible.length - 1));
    const x = model.padding.left + (model.visible.length === 1 ? model.plotWidth / 2 : index / (model.visible.length - 1) * model.plotWidth);
    const rows = model.datasets.map((dataset) => `<div class="sd-tip-row"><span>${escapeHtml(dataset.metric.label)}</span><strong>${escapeHtml(metricText(dataset.metric, dataset.values[index], true))}</strong></div>`).join("");
    tooltip.innerHTML = `<b>第 ${model.visible[index].batch.week_no} 周 · ${batchDateText(model.visible[index].batch)}</b>${rows}`;
    tooltip.style.left = `${x / model.width * 100}%`;
    tooltip.style.top = "72px";
    tooltip.classList.remove("hidden");
  }

  function handlePointerLeave(event) {
    const wrap = event.target.closest?.("[data-sd-chart]");
    wrap?.querySelector(".sd-chart-tooltip")?.classList.add("hidden");
  }

  function mount(container, data) {
    if (!container) return;
    const runtime = container.__summaryDashboard || {
      container,
      data,
      scope: "all",
      batchId: Number(data.currentBatchId) || null,
      selections: defaultSelections(),
      editCategory: null,
      editSelection: [],
      chartModels: {},
      lastView: null,
      observer: null
    };
    runtime.container = container;
    runtime.data = data;
    if (!runtime.batchId) runtime.batchId = Number(data.currentBatchId) || null;
    runtime.selections = runtime.selections || defaultSelections();
    container.__summaryDashboard = runtime;
    container.onclick = (event) => handleClick(event, runtime);
    container.onchange = (event) => handleChange(event, runtime);
    container.onkeydown = (event) => handleKeydown(event, runtime);
    container.onpointermove = (event) => handlePointerMove(event, runtime);
    container.onpointerleave = (event) => handlePointerLeave(event);
    render(runtime);
  }

  window.SummaryDashboard = { mount };
})();
