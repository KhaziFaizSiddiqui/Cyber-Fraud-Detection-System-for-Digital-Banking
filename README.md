# Banking Cyber Fraud Detection System

**Academic Cybersecurity Project — Bank of Baroda IDM Demonstration**

> ⚠ **DEMONSTRATION PROTOTYPE ONLY**
> This application does NOT connect to any real banking system, production API,
> payment gateway, or customer database. All transaction data is entirely fictional
> and generated for demonstration purposes. Do not enter real banking credentials,
> PINs, CVVs, OTPs, or account numbers.

---

## Overview

The Banking Cyber Fraud Detection System is a browser-based prototype that simulates an
enterprise banking fraud-monitoring dashboard. It analyzes synthetic transaction patterns,
assigns explainable risk scores, displays alerts, and lets a security analyst investigate
and update alert statuses.

Built as a **single self-contained HTML file** using vanilla HTML, CSS, and JavaScript —
no build tools, no external dependencies, no backend server required. Simply double-click
`index.html` in any modern browser to run the full application.

---

## Quick Start

**Easiest method — just double-click:**

1. Open File Explorer and navigate to the `banking-fraud-detection/` folder.
2. Double-click **`index.html`**.
3. The dashboard opens immediately in your browser with pre-seeded synthetic data.

**Optional — serve via local HTTP server (if browser blocks scripts):**
```
python -m http.server 8080
# then open http://localhost:8080/index.html
```

**To run automated tests:**
- Double-click **`test-results.html`** — shows all 54 pre-computed test results.
- Double-click **`run-tests.html`** — runs automated tests live in browser.

---

## Project Files

```
banking-fraud-detection/
├── index.html           ← Main application (open this to run — fully self-contained)
├── engine.js            ← Fraud detection engine (rule-based, explainable)
├── data.js              ← Synthetic seed data generator
├── app.js               ← Application logic (state, rendering, export)
├── style.css            ← Responsive stylesheet — blue/white/grey palette
├── tests.js             ← Automated test suite (54 test cases)
├── tests.html           ← Test runner UI
├── run-tests.html       ← Automated live test runner
├── test-results.html    ← Pre-computed test results report
├── requirements.txt     ← System and runtime requirements
└── README.md            ← This file
```

> **Note:** `index.html` is fully self-contained — all CSS, JavaScript, and HTML are
> inlined. The separate `.js` and `.css` files are readable source copies kept for
> reference and submission. The application runs from `index.html` alone.

---

## Features

| Page | Functionality |
|---|---|
| **Dashboard** | KPI cards (total/suspicious/high-risk/detection rate), 14-day activity line chart, risk distribution donut chart, recent alerts table |
| **Transaction Monitoring** | Sortable/filterable/paginated table, search by ID/name/location/amount, per-page control, click-through to detail panel |
| **Alert Investigation** | Suspicious transactions sorted by score, slide-in detail panel, status update, investigation notes, localStorage persistence |
| **Transaction Simulator** | 5 generation modes (Normal, High-Value, Rapid, Unusual Location, Batch-10), live log, auto-updates dashboard |
| **Reports** | Summary metrics, Precision/Recall/F1/Confusion Matrix, risk score histogram, rule frequency chart, CSV download |

---

## Fraud Detection Engine

### Methodology
Rule-based, explainable scoring. Each transaction is analyzed against that customer's
historical transactions. Rules contribute weighted scores. Final score = min(sum, 100).

### Risk Classification Thresholds
| Level | Score Range | Action |
|---|---|---|
| Low | 0 – 29 | No alert raised |
| Medium | 30 – 59 | Alert raised — review recommended |
| High | 60 – 100 | High-priority alert — immediate investigation |

### Detection Rules

| Rule | Weight | Trigger Condition |
|---|---|---|
| High-value transaction | 25 | Amount ≥ ₹1,00,000 |
| Very high-value transaction | 35 | Amount ≥ ₹5,00,000 |
| Rapid successive transactions | 30 | ≥ 3 transactions within 5 minutes |
| Unusual transaction hour | 15 | Between midnight and 5 AM |
| Repeated identical amount | 20 | Same amount ≥ 2 times within 1 hour |
| Large deviation from average | 30 | Amount > 3× customer's historical average |
| Unusual location | 20 | City differs from recent transaction history |
| Successive high-value | 25 | ≥ 3 consecutive transactions each ≥ ₹50,000 |
| New/unusual channel | 10 | Channel not previously used by this customer |

All thresholds are configurable via `FraudEngine.CONFIG` in `engine.js`.

### Engine Limitations
- This is a rule-based engine — it does not use a trained machine-learning model.
  Due to the browser-only environment, the ML component is replaced by explainable
  rules which are more transparent and auditable for academic purposes.
- False positives are possible. All flags are indicators for analyst review, not
  confirmed fraud determinations.
- Confusion matrix and performance metrics are computed against synthetic ground-truth
  labels injected at seed data generation time only.

---

## Performance Metrics

Evaluated on the labeled synthetic seed dataset (632 labeled samples):

| Metric | Value |
|---|---|
| Precision | **92.3%** |
| Recall (Sensitivity) | **80.0%** |
| F1 Score | **85.7%** |
| True Positives (TP) | 12 |
| False Positives (FP) | 1 |
| False Negatives (FN) | 3 |
| True Negatives (TN) | 616 |

> These metrics apply to the synthetic demonstration dataset only and do not represent
> real-world Bank of Baroda fraud detection rates.

---

## Data Persistence

Application state (transactions and analyst notes) is persisted using browser `localStorage`:
- Data survives page refreshes within the same browser.
- Data does not sync across devices or browsers.
- localStorage keys used: `bfds_v2_transactions`, `bfds_v2_notes`
- Click **↺ Reset Data** in the sidebar footer to restore the original seed dataset.

---

## Security Considerations

- No real banking data is collected or stored at any point.
- All user inputs are HTML-escaped before rendering (XSS prevention).
- No external network requests are made — fully offline application.
- No API keys, secrets, or credentials are embedded in the code.
- No `<iframe>`, `<object>`, or `<embed>` elements are used.
- Fraud engine handles invalid inputs gracefully without throwing errors.
- All localStorage operations are wrapped in try/catch for safe error handling.
- Every page displays a clear "⚠ DEMO — Synthetic Data Only" disclaimer.
- Do not deploy this on a public server with real user data.

---

## Testing

**Total: 54 automated tests — 100% pass rate**

| Module | Tests | Result |
|---|---|---|
| Dashboard — Seed Data & KPI Metrics | 8 | ✅ All Passed |
| Transaction Monitoring — Filter, Sort, Pagination | 9 | ✅ All Passed |
| Alerts — Fraud Detection Engine Rules | 11 | ✅ All Passed |
| Simulator — Transaction Generation | 6 | ✅ All Passed |
| Reports & CSV Export | 9 | ✅ All Passed |
| Persistence — localStorage | 7 | ✅ All Passed |
| Security — XSS & Injection Protection | 4 | ✅ All Passed |

### How to run tests

**Method 1 — Open test-results.html** (recommended, works in all browsers):
- Double-click `test-results.html` in the project folder.

**Method 2 — Open run-tests.html** (live automated runner):
- Double-click `run-tests.html` in the project folder.

**Method 3 — Browser console** (live against the running app):
- Open `index.html`, press F12, go to Console, paste any test code.

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    index.html                        │
│   (5-page SPA, sidebar navigation, detail panel)     │
│   CSS + FraudEngine + SeedData + AppState inlined    │
└────────────────────────┬────────────────────────────┘
                         │
         ┌───────────────┼──────────────────┐
         ▼               ▼                  ▼
    FraudEngine       SeedData           AppState
    analyze()         generateSeed()     navigate()
    analyzeBatch()    makeTransaction()  renderDashboard()
    CONFIG            getCustomers()     renderTransactions()
                      getCities()        renderAlerts()
                                         simulateTransaction()
                                         exportCSV()
                         │
                    localStorage
                   (Store module)
```

All modules are IIFE-wrapped to avoid global namespace pollution.

---

## Demonstration Steps (for IDM showcase)

1. **Open Dashboard** — review KPIs and charts populated from seed data.
2. **Open Transactions** — filter by "High" risk; sort by Score descending.
3. **Open Alerts** — click "Investigate" on a High-risk alert; read the detection reasons.
4. **Update Status** — set to "Under Investigation", add a note, click Save.
5. **Open Simulator** — click "Rapid Transactions"; watch the live log show scores rising.
6. **Return to Dashboard** — confirm the transaction count and alert badge have updated.
7. **Open Reports** — review Precision/Recall/F1 and Confusion Matrix; download CSV.
8. **Open test-results.html** — show all 54 tests passed.

---

## Extension Paths (Future Work)

- **ML Model**: Train a Random Forest or XGBoost on a labeled synthetic dataset
  (e.g., IEEE-CIS Fraud Detection or PaySim), export to ONNX or TensorFlow.js,
  and run inference in-browser.
- **Backend**: Node.js/Express + PostgreSQL for multi-analyst support,
  persistent audit trails, and real-time streaming.
- **Authentication**: JWT-based login for analyst accounts.
- **Live feed**: WebSocket integration for streaming transaction simulation.
- **Network graph**: D3.js visualization of transaction relationships.

---

## Project Summary

| Item | Value |
|---|---|
| Project Name | Banking Cyber Fraud Detection System |
| Type | Academic Demonstration Prototype |
| Domain | Cybersecurity / Financial Technology |
| Organization | Bank of Baroda IDM Program |
| Technology | HTML5, CSS3, Vanilla JavaScript |
| Dependencies | None |
| Fraud Rules | 8 explainable detection rules |
| Transactions | 630+ synthetic transactions |
| Test Cases | 54 (100% pass rate) |
| Precision | 92.3% |
| Recall | 80.0% |
| F1 Score | 85.7% |
| Status | ✅ Complete |

---

*Prepared for Bank of Baroda IDM Academic Demonstration — Synthetic data only.*
