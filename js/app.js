/* ==========================================================================
   app.js — application bootstrap and page orchestration.
   Ties data.js / analytics.js / charts.js / map.js / filters.js /
   prediction.js / reports.js together and drives the DOM.
   ========================================================================== */

(() => {
  let interactionsWired = false;

  const TABLE_COLUMNS = [
    { key: 'accident_id', label: 'ID', sort: true, cls: 'id-cell' },
    { key: 'date', label: 'Date', sort: true },
    { key: 'time', label: 'Time', sort: true },
    { key: 'city', label: 'City', sort: true, cls: 'primary' },
    { key: 'road_name', label: 'Road', sort: true },
    { key: 'accident_type', label: 'Type', sort: true },
    { key: 'severity', label: 'Severity', sort: true, badge: 'sev' },
    { key: 'number_of_injuries', label: 'Injuries', sort: true },
    { key: 'number_of_fatalities', label: 'Fatalities', sort: true },
    { key: 'weather', label: 'Weather', sort: true },
    { key: 'possible_cause', label: 'Cause', sort: true },
    { key: 'risk_level', label: 'Risk', sort: true, badge: 'risk' },
  ];

  // ---- Navigation -----------------------------------------------------------

  function goToPage(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    const page = document.getElementById('page-' + pageId);
    const nav = document.querySelector(`.nav-item[data-page="${pageId}"]`);
    if (page) page.classList.add('active');
    if (nav) nav.classList.add('active');
    closeMobileSidebar();
    window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
    renderPage(pageId);
  }

  function initNav() {
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        goToPage(item.dataset.page);
      });
    });
    document.querySelectorAll('[data-goto]').forEach(btn => {
      btn.addEventListener('click', () => goToPage(btn.dataset.goto));
    });

    document.getElementById('sidebar-collapse-btn').addEventListener('click', () => {
      document.getElementById('app-shell').classList.toggle('sidebar-collapsed');
    });
    document.getElementById('mobile-menu-btn').addEventListener('click', () => {
      document.getElementById('sidebar').classList.add('open');
      document.getElementById('sidebar-scrim').classList.add('open');
    });
    document.getElementById('sidebar-scrim').addEventListener('click', closeMobileSidebar);
  }

  function closeMobileSidebar() {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('sidebar-scrim').classList.remove('open');
  }

  // ---- Clock ------------------------------------------------------------

  function startClock() {
    const clockEl = document.getElementById('header-clock');
    function tick() {
      const now = new Date();
      clockEl.textContent = now.toLocaleString('en-GB', {
        weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
      });
    }
    tick();
    setInterval(tick, 30000);
  }

  // ---- Data loading & fallback -------------------------------------------

  async function bootstrapData() {
    const loadingEl = document.getElementById('dashboard-loading');
    const errorEl = document.getElementById('dashboard-error');
    const contentEl = document.getElementById('dashboard-content');

    const result = await DataModule.init();
    if (result.ok) {
      loadingEl.style.display = 'none';
      errorEl.style.display = 'none';
      contentEl.style.display = 'flex';
      onDataReady();
    } else {
      if (AppState.loaded) {
        loadingEl.style.display = 'none';
        errorEl.style.display = 'none';
        contentEl.style.display = 'flex';
        Utils.toast('Dataset reload failed: ' + result.error, 'error');
        return;
      }
      loadingEl.style.display = 'none';
      errorEl.style.display = 'flex';
      document.getElementById('dashboard-error-msg').textContent =
        'Local browser security prevented automatic CSV loading (' + result.error + '). ' +
        'Please run this project with a simple local server such as VS Code Live Server, or use the "Load CSV File" option below.';
    }
  }

  function wireFileFallback() {
    document.getElementById('csv-file-input').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        await DataModule.loadFromFile(file);
        document.getElementById('dashboard-error').style.display = 'none';
        document.getElementById('dashboard-content').style.display = 'flex';
        Utils.toast('CSV loaded successfully — ' + Utils.numberFormat(AppState.raw.length) + ' records.');
        onDataReady();
      } catch (err) {
        Utils.toast('Failed to parse the selected file: ' + err.message, 'error');
      } finally {
        e.target.value = '';
      }
    });
    document.getElementById('header-refresh-btn').addEventListener('click', async () => {
      Utils.toast('Reloading dataset…');
      await bootstrapData();
    });
  }

  function onDataReady() {
    FiltersModule.buildPanel(document.getElementById('filters-panel'));
    populateReportSelects();
    populatePredictionCitySelect();
    document.getElementById('report-output').style.display = 'none';
    if (!interactionsWired) {
      wireFilterActions();
      wireSearch();
      wireMap();
      wirePrediction();
      wireReports();
      wireModal();
      wireTableToolbar();
      interactionsWired = true;
    }
    DataModule.applyFilters();
    updateFilterCount();
    renderPage('dashboard');
  }

  // ---- Central re-render dispatcher --------------------------------------

  function renderPage(pageId) {
    if (!AppState.loaded) return;
    const records = AppState.filtered;
    if (pageId === 'dashboard') renderDashboard(records);
    else if (pageId === 'accidents') renderAccidentsPage(records);
    else if (pageId === 'analytics') renderAnalyticsPage(records);
    else if (pageId === 'hotspots') renderHotspotsPage(records);
    else if (pageId === 'risk') renderRiskPage(records);
    // reports and about are self-contained / already rendered on demand
  }

  function refreshAll() {
    DataModule.applyFilters();
    FiltersModule.renderChips(document.getElementById('filter-chips'), removeFilter);
    const activePage = document.querySelector('.page.active').id.replace('page-', '');
    renderPage(activePage);
    updateFilterCount();
  }

  function updateFilterCount() {
    const countEl = document.getElementById('filter-result-count');
    if (countEl) countEl.textContent = `${Utils.numberFormat(AppState.filtered.length)} of ${Utils.numberFormat(AppState.raw.length)} records match`;
  }

  function removeFilter(key) {
    if (key === '__search') {
      AppState.searchQuery = '';
      document.getElementById('global-search').value = '';
    } else {
      AppState.filters[key] = '';
      const select = document.getElementById('filter-' + key);
      if (select) select.value = '';
      if (key === 'timeStart') document.getElementById('filter-time-start').value = '';
      if (key === 'timeEnd') document.getElementById('filter-time-end').value = '';
    }
    AppState.table.page = 1;
    refreshAll();
  }

  function wireFilterActions() {
    document.getElementById('apply-filters-btn').addEventListener('click', () => {
      AppState.table.page = 1;
      refreshAll();
      Utils.toast('Filters applied.');
    });
    document.getElementById('reset-filters-btn').addEventListener('click', () => {
      DataModule.resetFilters();
      FiltersModule.buildPanel(document.getElementById('filters-panel'));
      document.getElementById('global-search').value = '';
      refreshAll();
      Utils.toast('Filters reset.');
    });
  }

  // ---- Search -------------------------------------------------------------

  function wireSearch() {
    const input = document.getElementById('global-search');
    const resultsBox = document.getElementById('global-search-results');

    const doSearch = Utils.debounce(() => {
      const q = input.value.trim();
      AppState.searchQuery = q;
      DataModule.applyFilters();
      FiltersModule.renderChips(document.getElementById('filter-chips'), removeFilter);
      updateFilterCount();

      if (!q) { resultsBox.classList.remove('open'); return; }
      const matches = AppState.filtered.slice(0, 8);
      resultsBox.innerHTML = '';
      if (!matches.length) {
        resultsBox.appendChild(Utils.el('div', { class: 'search-result-item' }, 'No matching records.'));
      } else {
        matches.forEach(r => {
          const item = Utils.el('div', { class: 'search-result-item' }, [
            Utils.el('span', { class: 'id' }, r.accident_id),
            Utils.el('span', {}, `${r.city} · ${r.accident_type}`),
          ]);
          item.addEventListener('click', () => {
            resultsBox.classList.remove('open');
            goToPage('accidents');
            openAccidentModal(r);
          });
          resultsBox.appendChild(item);
        });
      }
      resultsBox.classList.add('open');

      const activePage = document.querySelector('.page.active').id.replace('page-', '');
      renderPage(activePage);
    }, 250);

    input.addEventListener('input', doSearch);
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.header-search')) resultsBox.classList.remove('open');
    });
  }

  // ==========================================================================
  // DASHBOARD
  // ==========================================================================

  function renderDashboard(records) {
    const kpis = Analytics.calculateKPIs(records);
    renderKPIGrid(kpis);

    Charts.renderLineChart(document.getElementById('chart-trend'), Analytics.monthlyTrend(records));
    Charts.renderDonutChart(document.getElementById('chart-severity-donut'), Analytics.severityDistribution(records), {
      colorFn: Charts.severityColorFn, centerLabel: 'accidents',
    });
    Charts.renderBarChart(document.getElementById('chart-types-bar'), Analytics.accidentTypeDistribution(records), { color: '#A59132' });
    Charts.renderHBarChart(document.getElementById('chart-cities-hbar'), Analytics.cityDistribution(records).slice(0, 8), { color: '#A3500C' });
    Charts.renderHourChart(document.getElementById('chart-hour'), Analytics.hourlyDistribution(records));

    renderRecentTable(records);

    const risk = Analytics.calculateRiskScore(records);
    const score = document.getElementById('overview-risk-score');
    score.textContent = risk.score === null ? '—' : risk.score;
    score.style.color = risk.level ? Utils.riskColor(risk.level) : 'var(--text-muted)';
    const badge = document.getElementById('overview-risk-badge');
    badge.textContent = risk.level ? risk.level + ' Risk' : 'No data';
    badge.className = risk.level ? 'badge ' + Utils.riskBadgeClass(risk.level) : 'badge';

    renderInsightsList(document.getElementById('overview-insights'), Analytics.generateInsights(records).slice(0, 4));
  }

  function renderKPIGrid(kpis) {
    const grid = document.getElementById('kpi-grid');
    grid.innerHTML = '';
    const items = [
      { label: 'Total Accidents', value: Utils.numberFormat(kpis.total), icon: 'car-front' },
      { label: 'Severe & Critical', value: Utils.numberFormat(kpis.severeCritical), icon: 'triangle-alert', accent: true },
      { label: 'Total Injuries', value: Utils.numberFormat(kpis.injuries), icon: 'heart-pulse' },
      { label: 'Total Fatalities', value: Utils.numberFormat(kpis.fatalities), icon: 'skull', accent: true },
      { label: 'Road Closures', value: Utils.numberFormat(kpis.closures), icon: 'construction' },
      { label: 'Avg. Response Time', value: kpis.avgResponse + ' min', icon: 'clock' },
    ];
    items.forEach(item => {
      grid.appendChild(Utils.el('div', { class: 'surface kpi-card' + (item.accent ? ' accent' : '') }, [
        Utils.el('div', { class: 'kpi-icon' }, Utils.icon(item.icon, 18)),
        Utils.el('div', { class: 'kpi-label' }, item.label),
        Utils.el('div', { class: 'kpi-value' }, item.value),
      ]));
    });
  }

  function renderRecentTable(records) {
    const table = document.getElementById('recent-table');
    const recent = records.slice().sort((a, b) => (a.date + a.time < b.date + b.time ? 1 : -1)).slice(0, 6);
    table.innerHTML = '';
    const thead = Utils.el('thead', {}, Utils.el('tr', {}, ['ID', 'City', 'Type', 'Severity'].map(h => Utils.el('th', {}, h))));
    const tbody = Utils.el('tbody');
    recent.forEach(r => {
      const tr = Utils.el('tr', {
        onclick: () => openAccidentModal(r),
        onkeydown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openAccidentModal(r); } },
        tabindex: '0',
        role: 'button',
      }, [
        Utils.el('td', { class: 'id-cell' }, r.accident_id),
        Utils.el('td', { class: 'primary' }, r.city),
        Utils.el('td', {}, r.accident_type),
        Utils.el('td', {}, Utils.el('span', { class: 'badge ' + Utils.severityBadgeClass(r.severity) }, r.severity)),
      ]);
      tbody.appendChild(tr);
    });
    table.appendChild(thead);
    table.appendChild(tbody);
    if (!recent.length) {
      table.appendChild(Utils.el('tbody', {}, Utils.el('tr', {}, Utils.el('td', { colspan: 4 }, 'No records match the current filters.'))));
    }
  }

  function renderInsightsList(container, insights) {
    container.innerHTML = '';
    insights.forEach(text => {
      container.appendChild(Utils.el('div', { class: 'insight-item' }, [
        Utils.el('span', { class: 'dot' }),
        Utils.el('p', { html: text }),
      ]));
    });
  }

  // ==========================================================================
  // ACCIDENTS PAGE (table + pagination + sorting)
  // ==========================================================================

  function wireTableToolbar() {
    document.getElementById('export-table-csv-btn').addEventListener('click', () => {
      ReportsModule.downloadCSV(AppState.filtered, 'libya-traffic-filtered-records.csv');
      Utils.toast('Exported ' + Utils.numberFormat(AppState.filtered.length) + ' records to CSV.');
    });
  }

  function renderAccidentsPage(records) {
    updateFilterCount();
    renderDataTable(records);
  }

  function sortRecords(records, key, dir) {
    const sorted = records.slice().sort((a, b) => {
      let av = a[key], bv = b[key];
      if (key === 'date') { av = a.date + a.time; bv = b.date + b.time; }
      if (typeof av === 'number' && typeof bv === 'number') return dir === 'asc' ? av - bv : bv - av;
      av = String(av).toLowerCase(); bv = String(bv).toLowerCase();
      if (av < bv) return dir === 'asc' ? -1 : 1;
      if (av > bv) return dir === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }

  function renderDataTable(records) {
    const table = document.getElementById('accidents-table');
    const emptyEl = document.getElementById('accidents-table-empty');
    const paginationEl = document.getElementById('accidents-pagination');
    const t = AppState.table;

    table.innerHTML = '';

    if (!records.length) {
      table.style.display = 'none';
      paginationEl.innerHTML = '';
      emptyEl.style.display = 'block';
      emptyEl.innerHTML = '';
      emptyEl.appendChild(Utils.el('div', { class: 'state-block' }, [
        Utils.el('h4', {}, 'No accidents match your filters'),
        Utils.el('p', {}, 'Try widening your date range, clearing a filter, or resetting all filters.'),
        Utils.el('button', { class: 'btn btn-secondary btn-sm', onclick: () => document.getElementById('reset-filters-btn').click() }, 'Reset Filters'),
      ]));
      return;
    }
    table.style.display = 'table';
    emptyEl.style.display = 'none';

    const sorted = sortRecords(records, t.sortKey, t.sortDir);
    const totalPages = Math.max(1, Math.ceil(sorted.length / t.pageSize));
    if (t.page > totalPages) t.page = totalPages;
    const start = (t.page - 1) * t.pageSize;
    const pageRecords = sorted.slice(start, start + t.pageSize);

    // header
    const thead = Utils.el('thead');
    const headRow = Utils.el('tr');
    TABLE_COLUMNS.forEach(col => {
      const sortDirection = t.sortKey === col.key ? t.sortDir : null;
      const sortIcon = sortDirection ? Utils.icon(sortDirection === 'asc' ? 'arrow-up' : 'arrow-down', 14) : null;
      const th = Utils.el('th', {
        onclick: () => {
          if (t.sortKey === col.key) t.sortDir = t.sortDir === 'asc' ? 'desc' : 'asc';
          else { t.sortKey = col.key; t.sortDir = 'asc'; }
          renderDataTable(AppState.filtered);
        },
        tabindex: '0',
        'aria-label': 'Sort by ' + col.label,
        'aria-sort': sortDirection === 'asc' ? 'ascending' : sortDirection === 'desc' ? 'descending' : 'none',
        onkeydown: (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            th.click();
          }
        },
      }, [col.label, sortIcon ? Utils.el('span', { class: 'sort-arrow' }, sortIcon) : null]);
      headRow.appendChild(th);
    });
    thead.appendChild(headRow);
    table.appendChild(thead);

    const tbody = Utils.el('tbody');
    pageRecords.forEach(r => {
      const tr = Utils.el('tr', {
        onclick: () => openAccidentModal(r),
        tabindex: '0',
        onkeydown: (e) => { if (e.key === 'Enter') openAccidentModal(r); },
      });
      TABLE_COLUMNS.forEach(col => {
        let content;
        if (col.badge === 'sev') content = Utils.el('span', { class: 'badge ' + Utils.severityBadgeClass(r[col.key]) }, r[col.key]);
        else if (col.badge === 'risk') content = Utils.el('span', { class: 'badge ' + Utils.riskBadgeClass(r[col.key]) }, r[col.key]);
        else content = String(r[col.key]);
        tr.appendChild(Utils.el('td', { class: col.cls || '' }, content));
      });
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);

    // pagination
    paginationEl.innerHTML = '';
    paginationEl.appendChild(Utils.el('span', {}, `Showing ${start + 1}–${Math.min(start + t.pageSize, sorted.length)} of ${Utils.numberFormat(sorted.length)}`));
    const controls = Utils.el('div', { class: 'pagination-controls' });
    controls.appendChild(pageBtn('chevrons-left', 'First page', () => { t.page = 1; renderDataTable(AppState.filtered); }, t.page === 1));
    controls.appendChild(pageBtn('chevron-left', 'Previous page', () => { t.page = Math.max(1, t.page - 1); renderDataTable(AppState.filtered); }, t.page === 1));

    const pagesToShow = pageRange(t.page, totalPages);
    pagesToShow.forEach(p => {
      if (p === '…') { controls.appendChild(Utils.el('span', { class: 'page-btn', style: 'cursor:default;' }, '…')); return; }
      const btn = Utils.el('button', {
        class: 'page-btn' + (p === t.page ? ' active' : ''),
        onclick: () => { t.page = p; renderDataTable(AppState.filtered); },
      }, String(p));
      controls.appendChild(btn);
    });

    controls.appendChild(pageBtn('chevron-right', 'Next page', () => { t.page = Math.min(totalPages, t.page + 1); renderDataTable(AppState.filtered); }, t.page === totalPages));
    controls.appendChild(pageBtn('chevrons-right', 'Last page', () => { t.page = totalPages; renderDataTable(AppState.filtered); }, t.page === totalPages));
    paginationEl.appendChild(controls);
  }

  function pageBtn(icon, label, onClick, disabled) {
    const btn = Utils.el('button', {
      class: 'page-btn',
      'aria-label': label,
      title: label,
      onclick: disabled ? null : onClick,
    }, Utils.icon(icon, 16));
    if (disabled) { btn.disabled = true; btn.style.opacity = '0.35'; btn.style.cursor = 'default'; }
    return btn;
  }

  function pageRange(current, total) {
    const range = [];
    const delta = 1;
    for (let i = 1; i <= total; i++) {
      if (i === 1 || i === total || (i >= current - delta && i <= current + delta)) range.push(i);
      else if (range[range.length - 1] !== '…') range.push('…');
    }
    return range;
  }

  // ---- Modal ----------------------------------------------------------------

  function wireModal() {
    document.getElementById('modal-close-btn').addEventListener('click', closeModal);
    document.getElementById('accident-modal-overlay').addEventListener('click', (e) => {
      if (e.target.id === 'accident-modal-overlay') closeModal();
    });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });
  }

  function closeModal() {
    document.getElementById('accident-modal-overlay').classList.remove('open');
    document.body.classList.remove('no-scroll');
  }

  function openAccidentModal(r) {
    const overlay = document.getElementById('accident-modal-overlay');
    const body = document.getElementById('modal-body');
    document.getElementById('modal-title').textContent = `Accident ${r.accident_id}`;

    const rows = [
      ['Date', `${r.date} · ${r.time} (${r.day_of_week})`],
      ['Location', `${r.city} — ${r.district}`],
      ['Road', `${r.road_name} (${r.road_type})`],
      ['Coordinates', `${r.latitude.toFixed(4)}, ${r.longitude.toFixed(4)}`],
      ['Accident Type', r.accident_type],
      ['Severity', null],
      ['Vehicles Involved', r.number_of_vehicles],
      ['Injuries', r.number_of_injuries],
      ['Fatalities', r.number_of_fatalities],
      ['Estimated Damage', Utils.currencyFormat(r.estimated_damage)],
      ['Weather', r.weather],
      ['Road Condition', r.road_condition],
      ['Traffic Level', r.traffic_level],
      ['Lighting', r.lighting_condition],
      ['Possible Cause', r.possible_cause],
      ['Road Closed', r.road_closed ? `Yes (${r.closure_duration_minutes} min)` : 'No'],
      ['Emergency Response', `${r.emergency_response_minutes} min`],
      ['Risk Level', null],
    ];

    body.innerHTML = '';
    const grid = Utils.el('div', { style: 'display:grid; grid-template-columns:1fr 1fr; gap:14px 20px;' });
    rows.forEach(([label, value]) => {
      let valNode;
      if (label === 'Severity') valNode = Utils.el('span', { class: 'badge ' + Utils.severityBadgeClass(r.severity) }, r.severity);
      else if (label === 'Risk Level') valNode = Utils.el('span', { class: 'badge ' + Utils.riskBadgeClass(r.risk_level) }, r.risk_level);
      else valNode = Utils.el('span', { class: 'primary', style: 'color:var(--text-primary); font-size:13.5px;' }, String(value));
      grid.appendChild(Utils.el('div', {}, [
        Utils.el('div', { class: 'text-muted', style: 'font-size:11px; text-transform:uppercase; letter-spacing:0.04em; margin-bottom:4px;' }, label),
        valNode,
      ]));
    });
    body.appendChild(grid);

    body.appendChild(Utils.el('div', { class: 'divider' }));
    const mapMini = Utils.el('div', { style: 'height:200px; border-radius:10px; overflow:hidden; background:var(--bg-app);' });
    body.appendChild(mapMini);
    MapModule.render(mapMini, [r], 'points');

    overlay.classList.add('open');
    document.body.classList.add('no-scroll');
  }

  // ==========================================================================
  // ANALYTICS PAGE
  // ==========================================================================

  function renderAnalyticsPage(records) {
    renderInsightsList(document.getElementById('analytics-insights'), Analytics.generateInsights(records));
    Charts.renderBarChart(document.getElementById('chart-dow'), Analytics.dayOfWeekDistribution(records), { color: '#A59132', height: 220 });
    Charts.renderLineChart(document.getElementById('chart-analytics-trend'), Analytics.monthlyTrend(records), { height: 220 });
    Charts.renderHBarChart(document.getElementById('chart-roads-hbar'), Analytics.topRoads(records, 10), { color: '#A3500C', labelWidth: 150 });
    Charts.renderDonutChart(document.getElementById('chart-analytics-severity'), Analytics.severityDistribution(records), { colorFn: Charts.severityColorFn, centerLabel: 'accidents' });
    Charts.renderBarChart(document.getElementById('chart-causes-bar'), Analytics.causeDistribution(records), { color: '#A59132', height: 260 });
    Charts.renderDonutChart(document.getElementById('chart-weather'), Analytics.weatherDistribution(records), { size: 170, legend: true, centerLabel: 'weather' });
    Charts.renderDonutChart(document.getElementById('chart-road-condition'), Analytics.roadConditionDistribution(records), { size: 170, legend: true, centerLabel: 'condition' });
  }

  // ==========================================================================
  // HOTSPOTS PAGE
  // ==========================================================================

  let currentMapMode = 'points';

  function wireMap() {
    MapModule.init(document.getElementById('map-container'));
    document.getElementById('map-zoom-in').addEventListener('click', () => MapModule.zoomIn());
    document.getElementById('map-zoom-out').addEventListener('click', () => MapModule.zoomOut());
    document.getElementById('map-reset').addEventListener('click', () => MapModule.resetView());
    document.querySelectorAll('#map-mode-toggle button').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#map-mode-toggle button').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentMapMode = btn.dataset.mode;
        MapModule.render(document.getElementById('map-container'), AppState.filtered, currentMapMode);
      });
    });
  }

  function renderHotspotsPage(records) {
    MapModule.render(document.getElementById('map-container'), records, currentMapMode);

    const cityHotspots = Analytics.calculateHotspots(records, 10);
    const maxCityCount = Math.max(...cityHotspots.map(c => c.count), 1);
    renderRankList(document.getElementById('hotspot-city-list'), cityHotspots.map(c => ({
      title: c.city, sub: `${Utils.numberFormat(c.severe)} severe/critical · ${Utils.numberFormat(c.fatalities)} fatalities`,
      value: Utils.numberFormat(c.count), fraction: c.count / maxCityCount,
    })));

    const roadHotspots = Analytics.roadHotspots(records, 10);
    const maxRoadCount = Math.max(...roadHotspots.map(r => r.count), 1);
    renderRankList(document.getElementById('hotspot-road-list'), roadHotspots.map(r => ({
      title: r.road, sub: `${Utils.numberFormat(r.severe)} severe/critical accidents`,
      value: Utils.numberFormat(r.count), fraction: r.count / maxRoadCount,
    })));

    const severityShareData = cityHotspots.slice(0, 8).map(c => ({ label: c.city, value: Math.round(c.severityShare * 100) }));
    Charts.renderHBarChart(document.getElementById('hotspot-severity-chart'), severityShareData, { color: '#A3500C', labelWidth: 120 });

    // time concentration for top 3 hotspot cities: total accidents by hour
    const topCities = cityHotspots.slice(0, 3).map(c => c.city);
    const hourData = Analytics.hourlyDistribution(records.filter(r => topCities.includes(r.city)));
    Charts.renderHourChart(document.getElementById('hotspot-time-chart'), hourData);
  }

  function renderRankList(container, items) {
    container.innerHTML = '';
    if (!items.length) { Charts.renderEmpty(container, 'No data for the current filters.'); return; }
    items.forEach((item, i) => {
      container.appendChild(Utils.el('div', { class: 'rank-item' }, [
        Utils.el('div', { class: 'rank-num' }, String(i + 1)),
        Utils.el('div', { class: 'rank-body' }, [
          Utils.el('div', { class: 'rank-title' }, item.title),
          Utils.el('div', { class: 'rank-sub' }, item.sub),
          Utils.el('div', { class: 'rank-bar-track' }, Utils.el('div', { class: 'rank-bar-fill', style: `width:${Math.max(item.fraction * 100, 4)}%` })),
        ]),
        Utils.el('div', { class: 'rank-value' }, item.value),
      ]));
    });
  }

  // ==========================================================================
  // RISK ANALYSIS PAGE
  // ==========================================================================

  function renderRiskPage(records) {
    const risk = Analytics.calculateRiskScore(records);
    const score = document.getElementById('risk-page-score');
    score.textContent = risk.score === null ? '—' : risk.score;
    score.style.color = risk.level ? Utils.riskColor(risk.level) : 'var(--text-muted)';
    const badge = document.getElementById('risk-page-badge');
    badge.textContent = risk.level ? risk.level + ' Risk' : 'No data';
    badge.className = risk.level ? 'badge ' + Utils.riskBadgeClass(risk.level) : 'badge';
    if (risk.level) renderGaugeChart(document.getElementById('risk-gauge-chart'), risk.score, risk.level);
    else Charts.renderEmpty(document.getElementById('risk-gauge-chart'), 'A risk score is not available without matching records.');

    const factorsList = document.getElementById('risk-factors-list');
    factorsList.innerHTML = '';
    risk.factors.forEach(f => {
      factorsList.appendChild(Utils.el('div', { class: 'risk-factor' }, [
        Utils.el('span', { html: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6 9 17l-5-5"/></svg>' }),
        `${f.label} — weight ${f.weight}`,
      ]));
    });

    Charts.renderDonutChart(document.getElementById('chart-risk-donut'), Analytics.riskDistribution(records), { colorFn: Charts.riskColorFn, centerLabel: 'accidents' });
  }

  function renderGaugeChart(container, score, level) {
    container.innerHTML = '';
    const size = 160, cx = size / 2, cy = size / 2, r = 62;
    const circumference = Math.PI * r; // half circle
    const offset = circumference * (1 - score / 100);
    const color = Utils.riskColor(level).includes('var') ? getComputedColor(level) : '#A59132';

    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('viewBox', `0 0 ${size} ${size / 2 + 10}`);
    svg.setAttribute('width', size);
    svg.setAttribute('height', size / 2 + 10);

    const bgPath = document.createElementNS(svgNS, 'path');
    bgPath.setAttribute('d', `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`);
    bgPath.setAttribute('fill', 'none');
    bgPath.setAttribute('stroke', 'var(--bg-app)');
    bgPath.setAttribute('stroke-width', 14);
    bgPath.setAttribute('stroke-linecap', 'round');
    svg.appendChild(bgPath);

    const fgPath = document.createElementNS(svgNS, 'path');
    fgPath.setAttribute('d', `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`);
    fgPath.setAttribute('fill', 'none');
    fgPath.setAttribute('stroke', color);
    fgPath.setAttribute('stroke-width', 14);
    fgPath.setAttribute('stroke-linecap', 'round');
    fgPath.setAttribute('stroke-dasharray', circumference);
    fgPath.setAttribute('stroke-dashoffset', offset);
    svg.appendChild(fgPath);

    container.appendChild(svg);
  }

  function getComputedColor(level) {
    const map = { Low: '#7f8a5c', Medium: '#A59132', High: '#A3500C' };
    return map[level] || '#A59132';
  }

  // ==========================================================================
  // PREDICTION
  // ==========================================================================

  function populatePredictionCitySelect() {
    const select = document.getElementById('pred-city');
    select.innerHTML = '';
    DataModule.uniqueValues('city').forEach(c => select.appendChild(Utils.el('option', {}, c)));
  }

  function wirePrediction() {
    document.getElementById('prediction-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const city = document.getElementById('pred-city').value;
      const time = document.getElementById('pred-time').value || '18:00';
      const hour = parseInt(time.split(':')[0], 10);

      const cityRecords = AppState.raw.filter(r => r.city === city);
      const cityShare = AppState.raw.length ? cityRecords.length / AppState.raw.length : 0;

      const features = {
        city,
        roadType: document.getElementById('pred-road-type').value,
        hour,
        dayOfWeek: document.getElementById('pred-day').value,
        weather: document.getElementById('pred-weather').value,
        roadCondition: document.getElementById('pred-road-condition').value,
        trafficLevel: document.getElementById('pred-traffic').value,
        lighting: document.getElementById('pred-lighting').value,
        cityHistoricalShare: cityShare,
      };

      const result = PredictionModule.predictRisk(features);
      renderPredictionResult(result);
    });
  }

  function renderPredictionResult(result) {
    const box = document.getElementById('prediction-result');
    box.innerHTML = '';
    const badge = Utils.el('div', {
      class: 'prediction-badge-big ' + Utils.riskBadgeClass(result.level),
      style: `background:${bgForLevel(result.level)}; color:${Utils.riskColor(result.level)};`,
    }, `${result.level.toUpperCase()} RISK`);

    box.appendChild(Utils.el('div', { class: 'eyebrow' }, 'Predicted Risk'));
    box.appendChild(badge);
    box.appendChild(Utils.el('div', { class: 'risk-score-big', style: `color:${Utils.riskColor(result.level)}` }, `${result.score}/100`));

    const factorsWrap = Utils.el('div', { style: 'text-align:left; width:100%; margin-top:8px;' });
    factorsWrap.appendChild(Utils.el('div', { class: 'text-muted', style: 'font-size:11.5px; text-transform:uppercase; letter-spacing:0.05em; margin-bottom:8px;' }, 'Main contributing factors'));
    const list = Utils.el('div', { class: 'risk-factors' });
    if (result.factors.length) {
      result.factors.forEach(f => {
        list.appendChild(Utils.el('div', { class: 'risk-factor' }, [
          Utils.el('span', { html: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6 9 17l-5-5"/></svg>' }),
          `${f.label}`,
        ]));
      });
    } else {
      list.appendChild(Utils.el('div', { class: 'risk-factor' }, 'No single factor dominates — conditions are broadly favorable.'));
    }
    factorsWrap.appendChild(list);
    box.appendChild(factorsWrap);

    box.appendChild(Utils.el('p', { class: 'text-muted', style: 'font-size:11.5px; margin-top:10px;' },
      'Demo statistical/rule-based prediction layer — not a trained production ML model.'));
  }

  function bgForLevel(level) {
    const map = { Low: 'rgba(127,138,92,0.16)', Medium: 'rgba(165,145,50,0.18)', High: 'rgba(163,80,12,0.2)' };
    return map[level] || map.Low;
  }

  // ==========================================================================
  // REPORTS
  // ==========================================================================

  function populateReportSelects() {
    const citySelect = document.getElementById('report-city');
    citySelect.innerHTML = '';
    citySelect.appendChild(Utils.el('option', { value: '' }, 'All Cities'));
    DataModule.uniqueValues('city').forEach(c => citySelect.appendChild(Utils.el('option', {}, c)));
    const typeSelect = document.getElementById('report-type');
    typeSelect.innerHTML = '';
    typeSelect.appendChild(Utils.el('option', { value: '' }, 'All Types'));
    DataModule.uniqueValues('accident_type').forEach(t => typeSelect.appendChild(Utils.el('option', {}, t)));
  }

  function wireReports() {
    document.getElementById('generate-report-btn').addEventListener('click', () => {
      const opts = {
        dateFrom: document.getElementById('report-date-from').value,
        dateTo: document.getElementById('report-date-to').value,
        city: document.getElementById('report-city').value,
        severity: document.getElementById('report-severity').value,
        accidentType: document.getElementById('report-type').value,
      };
      try {
        document.getElementById('report-date-from').setCustomValidity('');
        document.getElementById('report-date-to').setCustomValidity('');
        if (opts.dateFrom && opts.dateTo && opts.dateFrom > opts.dateTo) {
          document.getElementById('report-date-to').setCustomValidity('End date must be on or after the start date.');
          document.getElementById('report-date-to').reportValidity();
          return;
        }
        const report = ReportsModule.buildReport(AppState.raw, opts);
        renderReportOutput(report);
      } catch (err) {
        Utils.toast(err.message, 'error');
      }
    });
  }

  function renderReportOutput(report) {
    const output = document.getElementById('report-output');
    output.style.display = 'flex';

    const scopeParts = [];
    if (report.opts.dateFrom) scopeParts.push(`from ${report.opts.dateFrom}`);
    if (report.opts.dateTo) scopeParts.push(`to ${report.opts.dateTo}`);
    if (report.opts.city) scopeParts.push(`city: ${report.opts.city}`);
    if (report.opts.severity) scopeParts.push(`severity: ${report.opts.severity}`);
    if (report.opts.accidentType) scopeParts.push(`type: ${report.opts.accidentType}`);
    document.getElementById('report-scope-desc').textContent = scopeParts.length
      ? `Scope: ${scopeParts.join(' · ')} — ${Utils.numberFormat(report.scoped.length)} records`
      : `All records — ${Utils.numberFormat(report.scoped.length)} records`;

    const statsGrid = document.getElementById('report-stats-grid');
    statsGrid.innerHTML = '';
    const stats = [
      ['Total Accidents', Utils.numberFormat(report.kpis.total)],
      ['Injuries', Utils.numberFormat(report.kpis.injuries)],
      ['Fatalities', Utils.numberFormat(report.kpis.fatalities)],
      ['Road Closures', Utils.numberFormat(report.kpis.closures)],
    ];
    stats.forEach(([label, value]) => {
      statsGrid.appendChild(Utils.el('div', { class: 'report-stat' }, [
        Utils.el('div', { class: 'label' }, label),
        Utils.el('div', { class: 'value' }, value),
      ]));
    });

    renderRankList(document.getElementById('report-top-causes'), report.causes.map(c => ({
      title: c.label, sub: '', value: Utils.numberFormat(c.value), fraction: c.value / (report.causes[0]?.value || 1),
    })));
    renderRankList(document.getElementById('report-top-roads'), report.roads.map(r => ({
      title: r.label, sub: '', value: Utils.numberFormat(r.value), fraction: r.value / (report.roads[0]?.value || 1),
    })));
    renderRankList(document.getElementById('report-top-cities'), report.cities.map(c => ({
      title: c.label, sub: '', value: Utils.numberFormat(c.value), fraction: c.value / (report.cities[0]?.value || 1),
    })));

    renderInsightsList(document.getElementById('report-insights'), report.insights);

    document.getElementById('report-export-csv-btn').onclick = () => {
      ReportsModule.downloadCSV(report.scoped, 'libya-traffic-report.csv');
      Utils.toast('Report exported to CSV.');
    };
    document.getElementById('report-print-btn').onclick = () => ReportsModule.printReport();

    output.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // ==========================================================================
  // BOOTSTRAP
  // ==========================================================================

  document.addEventListener('DOMContentLoaded', () => {
    initNav();
    startClock();
    wireFileFallback();
    bootstrapData();
  });

})();
