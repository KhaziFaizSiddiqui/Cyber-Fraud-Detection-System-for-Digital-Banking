/**
 * Banking Cyber Fraud Detection System — Application Logic
 * =========================================================
 * DEMONSTRATION PROTOTYPE — Academic / IDM showcase only.
 * No real banking data, credentials, or systems are used.
 * All data is synthetic.
 */

"use strict";

// ═══════════════════════════════════════════════════════════════════════
// Store (localStorage-backed)
// ═══════════════════════════════════════════════════════════════════════
const Store = (() => {
  const KEY = "bfds_v2_transactions";
  const NOTE_KEY = "bfds_v2_notes";

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }

  function save(txns) {
    try { localStorage.setItem(KEY, JSON.stringify(txns)); } catch {}
  }

  function loadNotes() {
    try {
      const raw = localStorage.getItem(NOTE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch { return {}; }
  }

  function saveNote(txnId, note) {
    const notes = loadNotes();
    notes[txnId] = note;
    try { localStorage.setItem(NOTE_KEY, JSON.stringify(notes)); } catch {}
  }

  function getNote(txnId) { return loadNotes()[txnId] || ""; }

  return { load, save, saveNote, getNote };
})();

// ═══════════════════════════════════════════════════════════════════════
// App State
// ═══════════════════════════════════════════════════════════════════════
let AppState = {
  transactions: [],          // analyzed transactions
  currentPage: "dashboard",
  txnPage: 1,
  txnPageSize: 20,
  txnSort: { col: "timestamp", dir: "desc" },
  txnFilter: { search: "", risk: "", channel: "", status: "", type: "" },
  alertsPage: 1,
  selectedTxnId: null,
  simLog: [],
  reportPage: 1,
};

// ═══════════════════════════════════════════════════════════════════════
// Bootstrap
// ═══════════════════════════════════════════════════════════════════════
document.addEventListener("DOMContentLoaded", () => {
  initApp();
  startClock();
  document.getElementById("overlay").addEventListener("click", closeDetail);
});

function initApp() {
  let txns = Store.load();
  if (!txns || txns.length === 0) {
    const seed = SeedData.generateSeedTransactions();
    txns = FraudEngine.analyzeBatch(seed).map(t => ({ ...t, status: t.status || "New" }));
    Store.save(txns);
  }
  // Ensure legacy data without status gets a default
  txns = txns.map(t => ({ ...t, status: t.status || "New" }));
  AppState.transactions = txns;
  navigate("dashboard");
}

// ═══════════════════════════════════════════════════════════════════════
// Navigation
// ═══════════════════════════════════════════════════════════════════════
function navigate(page) {
  AppState.currentPage = page;
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  document.querySelectorAll(".nav-item").forEach(n => n.classList.remove("active"));
  const pageEl = document.getElementById("page-" + page);
  if (pageEl) pageEl.classList.add("active");
  const navEl = document.querySelector(`.nav-item[data-page="${page}"]`);
  if (navEl) navEl.classList.add("active");

  const titles = {
    dashboard: "Dashboard",
    transactions: "Transaction Monitoring",
    alerts: "Alert Investigation",
    simulator: "Transaction Simulator",
    reports: "Reports & Analytics",
  };
  document.getElementById("topbar-title").textContent = titles[page] || page;

  switch (page) {
    case "dashboard":    renderDashboard();    break;
    case "transactions": renderTransactions(); break;
    case "alerts":       renderAlerts();       break;
    case "simulator":    renderSimulator();    break;
    case "reports":      renderReports();      break;
  }
  updateNavBadge();
}

function updateNavBadge() {
  const open = AppState.transactions.filter(t => t.riskLevel === "High" && (t.status === "New" || !t.status)).length;
  const badge = document.getElementById("alert-badge");
  if (badge) {
    badge.textContent = open > 99 ? "99+" : open;
    badge.style.display = open > 0 ? "inline" : "none";
  }
}

// ═══════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════
function fmtCurrency(n) {
  return "₹" + Number(n).toLocaleString("en-IN");
}
function fmtDate(ts) {
  return new Date(ts).toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}
function fmtDateShort(ts) {
  return new Date(ts).toLocaleString("en-IN", {
    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
  });
}
function riskBadge(level) {
  const cls = { High: "badge-high", Medium: "badge-medium", Low: "badge-low" }[level] || "badge-low";
  const dot = { High: "🔴", Medium: "🟡", Low: "🟢" }[level] || "";
  return `<span class="badge ${cls}">${dot} ${level}</span>`;
}
function statusBadge(status) {
  const map = {
    "New": "badge-status-new",
    "Under Investigation": "badge-status-investigating",
    "Reviewed": "badge-status-reviewed",
    "Confirmed Fraud": "badge-status-fraud",
    "Legitimate": "badge-status-legitimate",
  };
  return `<span class="badge ${map[status] || "badge-status-new"}">${status || "New"}</span>`;
}
function riskBarHtml(score) {
  const col = score >= 60 ? "var(--color-red)" : score >= 30 ? "#e6a817" : "var(--color-green)";
  return `<div class="risk-bar-wrap">
    <div class="risk-bar"><div class="risk-bar-fill" style="width:${score}%;background:${col}"></div></div>
    <span class="risk-num" style="color:${col}">${score}</span>
  </div>`;
}
function esc(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function startClock() {
  const el = document.getElementById("clock");
  if (!el) return;
  function tick() {
    el.textContent = new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  }
  tick(); setInterval(tick, 1000);
}

function showToast(msg, type = "") {
  const c = document.getElementById("toast-container");
  if (!c) return;
  const t = document.createElement("div");
  t.className = "toast " + type;
  t.textContent = msg;
  c.appendChild(t);
  setTimeout(() => t.remove(), 1200);
}

// ═══════════════════════════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════════════════════════
function renderDashboard() {
  const txns = AppState.transactions;
  const total     = txns.length;
  const suspicious= txns.filter(t => t.riskLevel !== "Low").length;
  const highRisk  = txns.filter(t => t.riskLevel === "High").length;
  const labeled   = txns.filter(t => t.groundTruth === "suspicious" || t.groundTruth === "legitimate");
  const tp        = labeled.filter(t => t.riskLevel !== "Low" && t.groundTruth === "suspicious").length;
  const detRate   = labeled.length > 0 ? ((tp / labeled.filter(t => t.groundTruth === "suspicious").length) * 100).toFixed(1) : "N/A";

  set("dash-total",     total);
  set("dash-suspicious",suspicious);
  set("dash-high",      highRisk);
  set("dash-detrate",   detRate !== "N/A" ? detRate + "%" : "N/A");

  renderLineChart(txns);
  renderDonutChart(txns);
  renderRecentAlerts(txns);
}

function set(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

// ── Line chart (SVG) — transactions over last 14 days ─────────────────
function renderLineChart(txns) {
  const canvas = document.getElementById("line-chart");
  if (!canvas) return;

  const days = 14;
  const now = Date.now();
  const labels = [], totalData = [], suspData = [];

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now - i * 86400000);
    const label = d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
    labels.push(label);
    const dayStart = new Date(d).setHours(0, 0, 0, 0);
    const dayEnd   = dayStart + 86400000;
    const day_txns = txns.filter(t => t.timestamp >= dayStart && t.timestamp < dayEnd);
    totalData.push(day_txns.length);
    suspData.push(day_txns.filter(t => t.riskLevel !== "Low").length);
  }

  drawSVGLineChart(canvas, labels, [
    { data: totalData, color: "#1a5bc8", label: "All Transactions" },
    { data: suspData,  color: "#c0392b", label: "Suspicious" },
  ]);
}

function drawSVGLineChart(container, labels, series) {
  const W = container.clientWidth || 700;
  const H = 260;
  const padL = 40, padR = 20, padT = 20, padB = 70; // extra bottom for legend + x-labels
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;

  const allVals = series.flatMap(s => s.data);
  const maxVal = Math.max(...allVals, 1);
  const step = chartW / Math.max(labels.length - 1, 1);

  function xOf(i) { return padL + i * step; }
  function yOf(v) { return padT + chartH - (v / maxVal) * chartH; }

  let svg = `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:${H}px">`;

  // Grid lines
  for (let g = 0; g <= 4; g++) {
    const y = padT + (g / 4) * chartH;
    const val = Math.round(maxVal * (1 - g / 4));
    svg += `<line x1="${padL}" y1="${y}" x2="${W - padR}" y2="${y}" stroke="#e5e7eb" stroke-width="1"/>`;
    svg += `<text x="${padL - 6}" y="${y + 4}" text-anchor="end" font-size="10" fill="#9ca3af">${val}</text>`;
  }

  // X axis baseline
  svg += `<line x1="${padL}" y1="${padT + chartH}" x2="${W - padR}" y2="${padT + chartH}" stroke="#e5e7eb" stroke-width="1"/>`;

  // X axis labels — positioned just below the chart area
  const step2 = Math.ceil(labels.length / 7);
  labels.forEach((lbl, i) => {
    if (i % step2 === 0 || i === labels.length - 1) {
      svg += `<text x="${xOf(i).toFixed(1)}" y="${padT + chartH + 16}" text-anchor="middle" font-size="10" fill="#9ca3af">${lbl}</text>`;
    }
  });

  // Series
  series.forEach(s => {
    const pts = s.data.map((v, i) => `${xOf(i).toFixed(1)},${yOf(v).toFixed(1)}`).join(" ");
    svg += `<polyline points="${pts}" fill="none" stroke="${s.color}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>`;
    s.data.forEach((v, i) => {
      svg += `<circle cx="${xOf(i).toFixed(1)}" cy="${yOf(v).toFixed(1)}" r="3" fill="${s.color}"/>`;
    });
  });

  // Legend — below x-axis labels
  let lx = padL;
  series.forEach(s => {
    svg += `<rect x="${lx}" y="${padT + chartH + 32}" width="12" height="3" rx="1" fill="${s.color}"/>`;
    svg += `<text x="${lx + 16}" y="${padT + chartH + 38}" font-size="10" fill="#5a6a82">${s.label}</text>`;
    lx += 150;
  });

  svg += "</svg>";
  container.innerHTML = svg;
}

// ── Donut chart ───────────────────────────────────────────────────────
function renderDonutChart(txns) {
  const container = document.getElementById("donut-chart");
  if (!container) return;
  const low    = txns.filter(t => t.riskLevel === "Low").length;
  const med    = txns.filter(t => t.riskLevel === "Medium").length;
  const high   = txns.filter(t => t.riskLevel === "High").length;
  const total  = txns.length || 1;

  const slices = [
    { label: "Low",    value: low,  color: "#1a8a4a" },
    { label: "Medium", value: med,  color: "#e6a817" },
    { label: "High",   value: high, color: "#c0392b" },
  ];

  const W = 280, H = 220, cx = 110, cy = 100, R = 80, r = 48;
  let svg = `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;max-width:${W}px">`;

  let angle = -Math.PI / 2;
  slices.forEach(s => {
    if (s.value === 0) return;
    const sweep = (s.value / total) * 2 * Math.PI;
    const x1 = cx + R * Math.cos(angle);
    const y1 = cy + R * Math.sin(angle);
    angle += sweep;
    const x2 = cx + R * Math.cos(angle);
    const y2 = cy + R * Math.sin(angle);
    const xi1 = cx + r * Math.cos(angle - sweep);
    const yi1 = cy + r * Math.sin(angle - sweep);
    const xi2 = cx + r * Math.cos(angle);
    const yi2 = cy + r * Math.sin(angle);
    const lg = sweep > Math.PI ? 1 : 0;
    svg += `<path d="M${xi1},${yi1} L${x1},${y1} A${R},${R} 0 ${lg},1 ${x2},${y2} L${xi2},${yi2} A${r},${r} 0 ${lg},0 ${xi1},${yi1} Z" fill="${s.color}" opacity=".9"/>`;
  });
  // Center text
  svg += `<text x="${cx}" y="${cy}" text-anchor="middle" font-size="22" font-weight="800" fill="#1a2332">${total}</text>`;
  svg += `<text x="${cx}" y="${cy + 16}" text-anchor="middle" font-size="10" fill="#5a6a82">Transactions</text>`;

  // Legend
  let ly = 30;
  slices.forEach(s => {
    const pct = ((s.value / total) * 100).toFixed(1);
    svg += `<rect x="200" y="${ly}" width="12" height="12" rx="2" fill="${s.color}"/>`;
    svg += `<text x="218" y="${ly + 10}" font-size="11" fill="#1a2332" font-weight="600">${s.label}</text>`;
    svg += `<text x="218" y="${ly + 22}" font-size="10" fill="#5a6a82">${s.value} (${pct}%)</text>`;
    ly += 44;
  });

  svg += "</svg>";
  container.innerHTML = svg;
}

// ── Recent Alerts Table ───────────────────────────────────────────────
function renderRecentAlerts(txns) {
  const el = document.getElementById("recent-alerts-body");
  if (!el) return;
  const alerts = [...txns]
    .filter(t => t.riskLevel !== "Low")
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 10);

  el.innerHTML = alerts.map(t => `
    <tr onclick="openDetail('${esc(t.id)}')" style="cursor:pointer">
      <td class="font-mono">${esc(t.id)}</td>
      <td>${esc(fmtDateShort(t.timestamp))}</td>
      <td>${esc(fmtCurrency(t.amount))}</td>
      <td>${riskBarHtml(t.score)}</td>
      <td>${riskBadge(t.riskLevel)}</td>
      <td>${statusBadge(t.status || "New")}</td>
    </tr>`).join("") || `<tr><td colspan="6" class="text-muted" style="text-align:center;padding:24px">No suspicious alerts yet</td></tr>`;
}

// ═══════════════════════════════════════════════════════════════════════
// TRANSACTION MONITORING
// ═══════════════════════════════════════════════════════════════════════
function renderTransactions() {
  const filtered  = getFilteredTxns();
  const total     = filtered.length;
  const pageSize  = AppState.txnPageSize;
  const page      = AppState.txnPage;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  AppState.txnPage = Math.min(page, pageCount);

  const pageTxns = filtered.slice((AppState.txnPage - 1) * pageSize, AppState.txnPage * pageSize);

  const body = document.getElementById("txn-table-body");
  if (!body) return;

  body.innerHTML = pageTxns.map(t => `
    <tr onclick="openDetail('${esc(t.id)}')" style="cursor:pointer">
      <td class="font-mono" style="font-size:11px">${esc(t.id)}</td>
      <td style="white-space:nowrap;font-size:12px">${esc(fmtDateShort(t.timestamp))}</td>
      <td style="max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(t.customerName)}</td>
      <td class="text-right font-mono">${esc(fmtCurrency(t.amount))}</td>
      <td>${esc(t.type)}</td>
      <td><span class="badge badge-status-new" style="background:#eef2ff;color:#3730a3">${esc(t.channel)}</span></td>
      <td>${esc(t.location)}</td>
      <td>${riskBarHtml(t.score)}</td>
      <td>${riskBadge(t.riskLevel)}</td>
      <td>${statusBadge(t.status || "New")}</td>
    </tr>`).join("") || `<tr><td colspan="10" class="text-muted" style="text-align:center;padding:24px">No transactions match the filter</td></tr>`;

  document.getElementById("txn-count").textContent = `${total} transactions`;
  renderPagination("txn-pagination", AppState.txnPage, pageCount, p => { AppState.txnPage = p; renderTransactions(); });
  highlightSort();
}

function getFilteredTxns() {
  const f = AppState.txnFilter;
  let txns = [...AppState.transactions];

  if (f.search) {
    const q = f.search.toLowerCase();
    txns = txns.filter(t =>
      t.id.toLowerCase().includes(q) ||
      t.customerName.toLowerCase().includes(q) ||
      t.location.toLowerCase().includes(q) ||
      String(t.amount).includes(q)
    );
  }
  if (f.risk)    txns = txns.filter(t => t.riskLevel === f.risk);
  if (f.channel) txns = txns.filter(t => t.channel === f.channel);
  if (f.status)  txns = txns.filter(t => (t.status || "New") === f.status);
  if (f.type)    txns = txns.filter(t => t.type === f.type);

  const { col, dir } = AppState.txnSort;
  txns.sort((a, b) => {
    let av = a[col], bv = b[col];
    if (typeof av === "string") av = av.toLowerCase(), bv = bv.toLowerCase();
    if (av < bv) return dir === "asc" ? -1 : 1;
    if (av > bv) return dir === "asc" ? 1 : -1;
    return 0;
  });
  return txns;
}

function setSort(col) {
  if (AppState.txnSort.col === col) {
    AppState.txnSort.dir = AppState.txnSort.dir === "asc" ? "desc" : "asc";
  } else {
    AppState.txnSort = { col, dir: "desc" };
  }
  AppState.txnPage = 1;
  renderTransactions();
}

function highlightSort() {
  document.querySelectorAll("#txn-table th").forEach(th => {
    th.classList.remove("sorted-asc", "sorted-desc");
    if (th.dataset.col === AppState.txnSort.col) {
      th.classList.add("sorted-" + AppState.txnSort.dir);
    }
  });
}

function applyTxnFilter() {
  AppState.txnFilter = {
    search:  document.getElementById("f-search")?.value  || "",
    risk:    document.getElementById("f-risk")?.value    || "",
    channel: document.getElementById("f-channel")?.value || "",
    status:  document.getElementById("f-status")?.value  || "",
    type:    document.getElementById("f-type")?.value    || "",
  };
  AppState.txnPage = 1;
  renderTransactions();
}

function clearTxnFilter() {
  ["f-search", "f-risk", "f-channel", "f-status", "f-type"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });
  AppState.txnFilter = { search: "", risk: "", channel: "", status: "", type: "" };
  AppState.txnPage = 1;
  renderTransactions();
}

// ═══════════════════════════════════════════════════════════════════════
// ALERTS
// ═══════════════════════════════════════════════════════════════════════
function renderAlerts() {
  const suspicious = AppState.transactions
    .filter(t => t.riskLevel !== "Low")
    .sort((a, b) => b.score - a.score);

  const pageSize = 15;
  const page     = AppState.alertsPage;
  const total    = suspicious.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  AppState.alertsPage = Math.min(page, pageCount);
  const paged    = suspicious.slice((AppState.alertsPage - 1) * pageSize, AppState.alertsPage * pageSize);

  const body = document.getElementById("alerts-table-body");
  if (!body) return;

  body.innerHTML = paged.map(t => `
    <tr onclick="openDetail('${esc(t.id)}')" style="cursor:pointer">
      <td class="font-mono" style="font-size:11px">${esc(t.id)}</td>
      <td style="font-size:12px">${esc(fmtDateShort(t.timestamp))}</td>
      <td style="max-width:120px;overflow:hidden;text-overflow:ellipsis">${esc(t.customerName)}</td>
      <td class="text-right font-mono">${esc(fmtCurrency(t.amount))}</td>
      <td>${riskBarHtml(t.score)}</td>
      <td>${riskBadge(t.riskLevel)}</td>
      <td style="max-width:180px;font-size:12px">${esc((t.reasons || []).slice(0, 1).join("; "))}</td>
      <td>${statusBadge(t.status || "New")}</td>
      <td>
        <button class="btn btn-sm btn-primary" onclick="event.stopPropagation();openDetail('${esc(t.id)}')">Investigate</button>
      </td>
    </tr>`).join("") || `<tr><td colspan="9" class="text-muted" style="text-align:center;padding:24px">No alerts found</td></tr>`;

  set("alert-count-label", `${total} alerts`);
  renderPagination("alerts-pagination", AppState.alertsPage, pageCount, p => { AppState.alertsPage = p; renderAlerts(); });
}

// ═══════════════════════════════════════════════════════════════════════
// DETAIL PANEL
// ═══════════════════════════════════════════════════════════════════════
function openDetail(txnId) {
  const txn = AppState.transactions.find(t => t.id === txnId);
  if (!txn) return;
  AppState.selectedTxnId = txnId;

  const panel = document.getElementById("detail-panel");
  const overlay = document.getElementById("overlay");

  set("detail-txn-id",       txn.id);
  set("detail-customer",     txn.customerName + " (" + txn.customerId + ")");
  set("detail-timestamp",    fmtDate(txn.timestamp));
  set("detail-amount",       fmtCurrency(txn.amount));
  set("detail-type",         txn.type);
  set("detail-channel",      txn.channel);
  set("detail-location",     txn.location);

  const scoreEl = document.getElementById("detail-score");
  if (scoreEl) scoreEl.innerHTML = riskBarHtml(txn.score);
  const lvlEl = document.getElementById("detail-risk-level");
  if (lvlEl) lvlEl.innerHTML = riskBadge(txn.riskLevel);
  const stEl = document.getElementById("detail-status");
  if (stEl) stEl.innerHTML = statusBadge(txn.status || "New");

  const reasonsEl = document.getElementById("detail-reasons");
  if (reasonsEl) {
    reasonsEl.innerHTML = (txn.reasons || []).map((r, i) => {
      const isOk = r.includes("No suspicious");
      return `<li class="${isOk ? "ok" : ""}">${esc(r)}</li>`;
    }).join("");
  }

  const noteEl = document.getElementById("detail-note");
  if (noteEl) noteEl.value = Store.getNote(txnId);

  const statusSel = document.getElementById("detail-status-select");
  if (statusSel) statusSel.value = txn.status || "New";

  panel.classList.add("open");
  overlay.classList.add("show");
}

function closeDetail() {
  document.getElementById("detail-panel").classList.remove("open");
  document.getElementById("overlay").classList.remove("show");
  AppState.selectedTxnId = null;
}

function saveDetailStatus() {
  const id = AppState.selectedTxnId;
  if (!id) return;
  const txn = AppState.transactions.find(t => t.id === id);
  if (!txn) return;

  const newStatus = document.getElementById("detail-status-select")?.value;
  const note      = document.getElementById("detail-note")?.value || "";

  txn.status = newStatus;
  Store.save(AppState.transactions);
  Store.saveNote(id, note);

  const stEl = document.getElementById("detail-status");
  if (stEl) stEl.innerHTML = statusBadge(newStatus);

  showToast("Status updated successfully", "success");
  updateNavBadge();

  // Refresh current page table
  if (AppState.currentPage === "transactions") renderTransactions();
  if (AppState.currentPage === "alerts")       renderAlerts();
  if (AppState.currentPage === "dashboard")    renderDashboard();
}

// ═══════════════════════════════════════════════════════════════════════
// SIMULATOR
// ═══════════════════════════════════════════════════════════════════════
function renderSimulator() {
  const logEl = document.getElementById("sim-log");
  if (logEl && AppState.simLog.length === 0) {
    logEl.innerHTML = `<div class="log-info">Simulator ready. Click a button above to generate synthetic transactions.</div>`;
  }
}

function simulateTransaction(type) {
  const customers = SeedData.getCustomers();
  const c = SeedData.pick(customers);
  const cities  = SeedData.getCities();
  const channels = SeedData.getChannels();
  let txnsToAdd = [];

  switch (type) {
    case "normal":
      txnsToAdd.push(SeedData.makeTransaction({
        customerId: c.id,
        amount: SeedData.rand(500, 12000),
        type: SeedData.pick(SeedData.getTypes()),
        channel: SeedData.pick(["UPI", "Debit Card"]),
        location: c.city,
        groundTruth: "synthetic",
      }));
      break;

    case "high-value":
      txnsToAdd.push(SeedData.makeTransaction({
        customerId: c.id,
        amount: SeedData.rand(200000, 800000),
        type: "Transfer",
        channel: SeedData.pick(["RTGS", "NEFT"]),
        location: c.city,
        groundTruth: "synthetic",
      }));
      break;

    case "rapid": {
      const base = Date.now();
      for (let i = 0; i < 5; i++) {
        const raw = SeedData.makeTransaction({
          customerId: c.id,
          amount: SeedData.rand(2000, 8000),
          type: "Purchase",
          channel: "Credit Card",
          location: c.city,
          groundTruth: "synthetic",
        });
        raw.timestamp = base + i * 50000;
        txnsToAdd.push(raw);
      }
      break;
    }

    case "unusual-location":
      txnsToAdd.push(SeedData.makeTransaction({
        customerId: c.id,
        amount: SeedData.rand(15000, 80000),
        type: "Withdrawal",
        channel: "Debit Card",
        location: SeedData.pick(cities.filter(city => city !== c.city)),
        groundTruth: "synthetic",
      }));
      break;

    case "batch": {
      for (let i = 0; i < 10; i++) {
        const rc = SeedData.pick(customers);
        txnsToAdd.push(SeedData.makeTransaction({
          customerId: rc.id,
          amount: SeedData.rand(1000, 500000),
          type: SeedData.pick(SeedData.getTypes()),
          channel: SeedData.pick(channels),
          location: SeedData.pick(cities),
          groundTruth: "synthetic",
        }));
      }
      break;
    }
  }

  // Analyze each new transaction against existing history
  const now = Date.now();
  txnsToAdd.forEach((rawTxn, i) => {
    const history = [...AppState.transactions, ...txnsToAdd.slice(0, i)];
    const result = FraudEngine.analyze(rawTxn, history);
    const analyzed = { ...rawTxn, ...result, status: "New" };
    AppState.transactions.push(analyzed);

    const col = result.riskLevel === "High" ? "log-high" : result.riskLevel === "Medium" ? "log-medium" : "log-low";
    AppState.simLog.unshift(
      `<div class="log-entry ${col}">[${new Date().toLocaleTimeString()}] [SYNTHETIC] ${rawTxn.id} | ${rawTxn.customerName} | ₹${Number(rawTxn.amount).toLocaleString("en-IN")} | Score: ${result.score} | ${result.riskLevel} | ${result.reasons[0] || "-"}</div>`
    );
  });

  Store.save(AppState.transactions);
  updateNavBadge();

  const logEl = document.getElementById("sim-log");
  if (logEl) logEl.innerHTML = AppState.simLog.slice(0, 100).join("");

  showToast(`Generated ${txnsToAdd.length} synthetic transaction(s)`, "success");
}

// ═══════════════════════════════════════════════════════════════════════
// REPORTS
// ═══════════════════════════════════════════════════════════════════════
function renderReports() {
  const txns = AppState.transactions;
  const total   = txns.length;
  const low     = txns.filter(t => t.riskLevel === "Low").length;
  const med     = txns.filter(t => t.riskLevel === "Medium").length;
  const high    = txns.filter(t => t.riskLevel === "High").length;
  const susp    = med + high;
  const normal  = low;

  set("rep-total",  total);
  set("rep-normal", normal);
  set("rep-susp",   susp);
  set("rep-low",    low);
  set("rep-med",    med);
  set("rep-high",   high);

  // Precision / Recall on labeled data
  const labeled  = txns.filter(t => t.groundTruth === "suspicious" || t.groundTruth === "legitimate");
  if (labeled.length > 0) {
    const tp = labeled.filter(t => t.riskLevel !== "Low" && t.groundTruth === "suspicious").length;
    const fp = labeled.filter(t => t.riskLevel !== "Low" && t.groundTruth === "legitimate").length;
    const fn = labeled.filter(t => t.riskLevel === "Low"  && t.groundTruth === "suspicious").length;
    const tn = labeled.filter(t => t.riskLevel === "Low"  && t.groundTruth === "legitimate").length;
    const precision = tp + fp > 0 ? ((tp / (tp + fp)) * 100).toFixed(1) + "%" : "N/A";
    const recall    = tp + fn > 0 ? ((tp / (tp + fn)) * 100).toFixed(1) + "%" : "N/A";
    const f1 = (tp + fp > 0 && tp + fn > 0) ?
      ((2 * tp / (2 * tp + fp + fn)) * 100).toFixed(1) + "%" : "N/A";
    set("rep-precision", precision);
    set("rep-recall",    recall);
    set("rep-f1",        f1);
    set("rep-tp", tp); set("rep-fp", fp);
    set("rep-fn", fn); set("rep-tn", tn);
    set("rep-labeled", labeled.length);
  }

  // Most triggered rules
  renderRuleFrequency(txns);
  renderRiskBarChart(txns);
}

function renderRuleFrequency(txns) {
  const ruleCount = {};
  txns.forEach(t => {
    (t.reasons || []).forEach(r => {
      if (r.includes("No suspicious")) return;
      // Bucket rule name
      const key = r.length > 60 ? r.slice(0, 57) + "…" : r;
      // Normalize to rule category
      let cat = "Other";
      if (r.includes("high-value") || r.includes("High-value"))  cat = "High-value transaction";
      else if (r.includes("unusual hour"))  cat = "Unusual transaction hour";
      else if (r.includes("rapid") || r.includes("within 5 min")) cat = "Rapid successive transactions";
      else if (r.includes("Repeated identical amount")) cat = "Repeated identical amount";
      else if (r.includes("customer's average")) cat = "Large deviation from average";
      else if (r.includes("location") && r.includes("differs")) cat = "Unusual transaction location";
      else if (r.includes("successive high-value")) cat = "Successive high-value transactions";
      else if (r.includes("channel") && r.includes("not been used")) cat = "New/unusual channel";
      ruleCount[cat] = (ruleCount[cat] || 0) + 1;
    });
  });

  const sorted = Object.entries(ruleCount).sort((a, b) => b[1] - a[1]);
  const maxC = sorted[0]?.[1] || 1;
  const el = document.getElementById("rule-freq");
  if (!el) return;
  el.innerHTML = sorted.map(([rule, count]) => `
    <div class="rule-bar-row">
      <div class="rule-bar-label">${esc(rule)}</div>
      <div class="rule-bar-outer"><div class="rule-bar-inner" style="width:${(count/maxC*100).toFixed(0)}%"></div></div>
      <div class="rule-bar-count">${count}</div>
    </div>`).join("") || "<p class='text-muted'>No triggered rules yet.</p>";
}

function renderRiskBarChart(txns) {
  const el = document.getElementById("risk-dist-chart");
  if (!el) return;
  const buckets = Array(10).fill(0);
  txns.forEach(t => { buckets[Math.min(Math.floor(t.score / 10), 9)]++; });
  const labels = ["0-9","10-19","20-29","30-39","40-49","50-59","60-69","70-79","80-89","90-100"];
  const colors = buckets.map((_, i) => i < 3 ? "#1a8a4a" : i < 6 ? "#e6a817" : "#c0392b");

  const W = el.clientWidth || 500, H = 200;
  const padL = 36, padR = 16, padT = 16, padB = 40;
  const chartW = W - padL - padR, chartH = H - padT - padB;
  const maxVal = Math.max(...buckets, 1);
  const bw = chartW / buckets.length;

  let svg = `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:${H}px">`;
  for (let g = 0; g <= 4; g++) {
    const y = padT + (g / 4) * chartH;
    const v = Math.round(maxVal * (1 - g / 4));
    svg += `<line x1="${padL}" y1="${y}" x2="${W - padR}" y2="${y}" stroke="#e5e7eb"/>`;
    svg += `<text x="${padL - 4}" y="${y + 4}" text-anchor="end" font-size="9" fill="#9ca3af">${v}</text>`;
  }
  buckets.forEach((v, i) => {
    const bh = (v / maxVal) * chartH;
    const x = padL + i * bw + bw * .1;
    const y = padT + chartH - bh;
    svg += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${(bw * .8).toFixed(1)}" height="${bh.toFixed(1)}" rx="3" fill="${colors[i]}" opacity=".85"/>`;
    svg += `<text x="${(x + bw * .4).toFixed(1)}" y="${H - padB + 14}" text-anchor="middle" font-size="9" fill="#9ca3af">${labels[i]}</text>`;
    if (v > 0) svg += `<text x="${(x + bw * .4).toFixed(1)}" y="${(y - 4).toFixed(1)}" text-anchor="middle" font-size="9" font-weight="700" fill="${colors[i]}">${v}</text>`;
  });
  svg += "</svg>";
  el.innerHTML = svg;
}

// ── CSV Export ────────────────────────────────────────────────────────
function exportCSV() {
  const cols = ["id","timestamp","customerName","customerId","amount","type","channel","location","score","riskLevel","status","groundTruth","reasons"];
  const header = cols.join(",");
  const rows = AppState.transactions.map(t => {
    return cols.map(c => {
      let val = c === "timestamp" ? fmtDate(t[c]) : c === "reasons" ? (t[c] || []).join("; ") : (t[c] ?? "");
      val = String(val).replace(/"/g, '""');
      return `"${val}"`;
    }).join(",");
  });

  const csv = [header, ...rows].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href = url;
  a.download = `fraud_detection_report_${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showToast("CSV report downloaded", "success");
}

// ═══════════════════════════════════════════════════════════════════════
// PAGINATION
// ═══════════════════════════════════════════════════════════════════════

// Global registry of pagination callbacks (avoids serializing closures)
const _pageCbs = {};

function renderPagination(containerId, currentPage, pageCount, onNav) {
  const el = document.getElementById(containerId);
  if (!el) return;
  if (pageCount <= 1) { el.innerHTML = ""; return; }

  // Store the callback for this container
  _pageCbs[containerId] = onNav;

  function btn(page, label, disabled, active) {
    const dis = disabled ? " disabled" : "";
    const cls = active ? " active" : "";
    return `<button class="page-btn${cls}" onclick="_pageCbs['${containerId}'](${page})"${dis}>${label}</button>`;
  }

  let html = btn(currentPage - 1, "‹", currentPage === 1, false);

  const pages = [];
  for (let p = 1; p <= pageCount; p++) {
    if (p === 1 || p === pageCount || Math.abs(p - currentPage) <= 2) pages.push(p);
    else if (pages[pages.length - 1] !== "…") pages.push("…");
  }
  pages.forEach(p => {
    if (p === "…") html += `<span class="page-info">…</span>`;
    else html += btn(p, p, false, p === currentPage);
  });

  html += btn(currentPage + 1, "›", currentPage === pageCount, false);
  el.innerHTML = html;
}

// ═══════════════════════════════════════════════════════════════════════
// RESET (for demo purposes)
// ═══════════════════════════════════════════════════════════════════════
function resetData() {
  if (!confirm("Reset all data to seed defaults? This will remove all simulator-generated transactions and status updates.")) return;
  localStorage.removeItem("bfds_v2_transactions");
  localStorage.removeItem("bfds_v2_notes");
  AppState.simLog = [];
  AppState.txnPage = 1;
  AppState.alertsPage = 1;
  initApp();
  showToast("Data reset to seed defaults", "warn");
}
