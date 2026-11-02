/* ==========================================================================
   utils.js — shared helpers: CSV parsing, formatting, DOM utilities,
   toast notifications, tooltips
   ========================================================================== */

const Utils = (() => {

  /**
   * Robust CSV parser that respects quoted fields (including embedded
   * commas, quotes, and newlines). Returns an array of row-arrays.
   */
  function parseCSV(text) {
    const rows = [];
    let row = [];
    let field = '';
    let inQuotes = false;
    let quoteClosed = false;
    // Normalize line endings first so \r\n and \r do not break quote logic
    const src = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    for (let i = 0; i < src.length; i++) {
      const char = src[i];

      if (inQuotes) {
        if (char === '"') {
          if (src[i + 1] === '"') { field += '"'; i++; }
          else { inQuotes = false; quoteClosed = true; }
        } else {
          field += char;
        }
        continue;
      }

      if (quoteClosed) {
        if (char === ',') { row.push(field); field = ''; quoteClosed = false; continue; }
        if (char === '\n') {
          row.push(field);
          rows.push(row);
          row = [];
          field = '';
          quoteClosed = false;
          continue;
        }
        if (char === ' ' || char === '\t') continue;
        throw new Error('CSV contains unexpected text after a quoted field.');
      }

      if (char === '"' && field.length > 0) {
        throw new Error('CSV contains a quote inside an unquoted field.');
      }
      if (char === '"') { inQuotes = true; continue; }
      if (char === ',') { row.push(field); field = ''; continue; }
      if (char === '\n') {
        row.push(field);
        rows.push(row);
        row = [];
        field = '';
        continue;
      }
      field += char;
    }
    if (inQuotes) throw new Error('CSV contains an unterminated quoted field.');
    // flush trailing field/row
    if (field.length > 0 || row.length > 0) {
      row.push(field);
      rows.push(row);
    }
    // drop trailing empty row (common with trailing newline)
    while (rows.length && rows[rows.length - 1].length === 1 && rows[rows.length - 1][0] === '') {
      rows.pop();
    }
    return rows;
  }

  /** Convert parsed CSV rows (with header row) into array of objects. */
  function rowsToObjects(rows) {
    if (!rows.length) return [];
    const header = rows[0].map(h => h.trim().replace(/^\uFEFF/, ''));
    if (new Set(header).size !== header.length) {
      throw new Error('CSV contains duplicate column names.');
    }
    const out = [];
    for (let i = 1; i < rows.length; i++) {
      const r = rows[i];
      if (r.length === 1 && r[0] === '') continue;
      if (r.length !== header.length) {
        throw new Error(`CSV row ${i + 1} has ${r.length} fields; expected ${header.length}.`);
      }
      const obj = {};
      header.forEach((key, idx) => { obj[key] = r[idx]; });
      out.push(obj);
    }
    return out;
  }

  function numberFormat(n) {
    if (n === undefined || n === null || isNaN(n)) return '0';
    return Number(n).toLocaleString('en-US');
  }

  function currencyFormat(n) {
    if (n === undefined || n === null || isNaN(n)) return 'LYD 0';
    return 'LYD ' + Number(n).toLocaleString('en-US', { maximumFractionDigits: 0 });
  }

  function pct(part, whole) {
    if (!whole) return '0%';
    return Math.round((part / whole) * 100) + '%';
  }

  function debounce(fn, wait = 200) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(null, args), wait);
    };
  }

  function el(tag, attrs = {}, children = []) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (v === null || v === undefined) continue;
      if (k === 'class') node.className = v;
      else if (k === 'html') node.innerHTML = v;
      else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
      else node.setAttribute(k, v);
    }
    (Array.isArray(children) ? children : [children]).forEach(c => {
      if (c === null || c === undefined) return;
      node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return node;
  }

  function escapeHTML(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function icon(name, size = 18) {
    return Icons.create(name, size);
  }

  function severityBadgeClass(sev) {
    return 'badge-' + String(sev).toLowerCase();
  }

  function riskBadgeClass(risk) {
    return 'badge-' + String(risk).toLowerCase();
  }

  function severityColor(sev) {
    const map = {
      Minor: 'var(--sev-minor)',
      Moderate: 'var(--sev-moderate)',
      Severe: 'var(--sev-severe)',
      Critical: 'var(--sev-critical-glow)',
    };
    return map[sev] || 'var(--sev-minor)';
  }

  function riskColor(risk) {
    const map = { Low: 'var(--risk-low)', Medium: 'var(--risk-medium)', High: 'var(--risk-high)' };
    return map[risk] || 'var(--risk-low)';
  }

  // ---- Toasts -------------------------------------------------------------

  function ensureToastStack() {
    let stack = document.querySelector('.toast-stack');
    if (!stack) {
      stack = el('div', { class: 'toast-stack', 'aria-live': 'polite' });
      document.body.appendChild(stack);
    }
    return stack;
  }

  function toast(message, type = 'default', timeout = 3800) {
    const stack = ensureToastStack();
    const node = el('div', { class: 'toast' + (type === 'error' ? ' toast-error' : '') }, message);
    stack.appendChild(node);
    setTimeout(() => {
      node.style.opacity = '0';
      node.style.transform = 'translateX(20px)';
      node.style.transition = 'all 0.2s ease';
      setTimeout(() => node.remove(), 220);
    }, timeout);
  }

  // ---- Tooltip (single shared instance) -----------------------------------

  let tooltipEl = null;
  function getTooltip() {
    if (!tooltipEl) {
      tooltipEl = el('div', { class: 'tooltip', role: 'tooltip' });
      document.body.appendChild(tooltipEl);
    }
    return tooltipEl;
  }

  function showTooltip(x, y, html) {
    const t = getTooltip();
    t.innerHTML = html;
    const pad = 14;
    let left = x + pad;
    let top = y + pad;
    t.style.left = left + 'px';
    t.style.top = top + 'px';
    t.classList.add('visible');
    // Reposition if overflowing viewport
    requestAnimationFrame(() => {
      const rect = t.getBoundingClientRect();
      if (rect.right > window.innerWidth) t.style.left = (x - rect.width - pad) + 'px';
      if (rect.bottom > window.innerHeight) t.style.top = (y - rect.height - pad) + 'px';
    });
  }

  function hideTooltip() {
    if (tooltipEl) tooltipEl.classList.remove('visible');
  }

  function formatDate(iso) {
    const d = new Date(iso + 'T00:00:00');
    if (isNaN(d)) return iso;
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  function monthIndex(monthName) {
    const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
    return months.indexOf(monthName);
  }

  function uid() {
    return 'id-' + Math.random().toString(36).slice(2, 10);
  }

  return {
    parseCSV, rowsToObjects, numberFormat, currencyFormat, pct, debounce, el,
    escapeHTML, icon, severityBadgeClass, riskBadgeClass, severityColor, riskColor,
    toast, showTooltip, hideTooltip, formatDate, monthIndex, uid,
  };
})();
