/* ==========================================================================
   charts.js — dependency-free SVG chart renderers.
   Every function returns/injects raw SVG markup into a container element.
   ========================================================================== */

const Charts = (() => {

  const NS = 'http://www.w3.org/2000/svg';
  const PALETTE = ['#A59132', '#A3500C', '#7f8a5c', '#d97a3d', '#625834', '#c9b464', '#8c5a2b', '#4f5b42'];

  function svgEl(tag, attrs = {}) {
    const node = document.createElementNS(NS, tag);
    Object.entries(attrs).forEach(([k, v]) => node.setAttribute(k, v));
    return node;
  }

  function clear(container) { container.innerHTML = ''; }

  function attachTooltip(node, htmlFn) {
    node.addEventListener('mousemove', (e) => Utils.showTooltip(e.clientX, e.clientY, htmlFn()));
    node.addEventListener('mouseleave', Utils.hideTooltip);
  }

  /** Line chart for monthly accident trend. data = [{label, value}] */
  function renderLineChart(container, data, opts = {}) {
    clear(container);
    if (!data.length) { renderEmpty(container, 'No trend data for the current filters.'); return; }

    const width = opts.width || 900, height = opts.height || 280;
    const padding = { top: 20, right: 20, bottom: 34, left: 44 };
    const innerW = width - padding.left - padding.right;
    const innerH = height - padding.top - padding.bottom;

    const maxVal = Math.max(...data.map(d => d.value), 1);
    const stepX = innerW / Math.max(data.length - 1, 1);

    const svg = svgEl('svg', { viewBox: `0 0 ${width} ${height}`, preserveAspectRatio: 'xMidYMid meet' });

    // gridlines
    const gridCount = 4;
    for (let i = 0; i <= gridCount; i++) {
      const y = padding.top + (innerH / gridCount) * i;
      svg.appendChild(svgEl('line', { x1: padding.left, x2: width - padding.right, y1: y, y2: y, class: 'chart-gridline' }));
      const val = Math.round(maxVal - (maxVal / gridCount) * i);
      const t = svgEl('text', { x: padding.left - 10, y: y + 4, 'text-anchor': 'end', class: 'chart-axis' });
      t.textContent = val;
      svg.appendChild(t);
    }

    const points = data.map((d, i) => {
      const x = padding.left + stepX * i;
      const y = padding.top + innerH - (d.value / maxVal) * innerH;
      return [x, y];
    });

    // area fill
    const areaPath = `M ${points[0][0]},${padding.top + innerH} ` +
      points.map(p => `L ${p[0]},${p[1]}`).join(' ') +
      ` L ${points[points.length - 1][0]},${padding.top + innerH} Z`;
    const gradId = 'trendGrad-' + Utils.uid();
    const defs = svgEl('defs');
    const grad = svgEl('linearGradient', { id: gradId, x1: 0, y1: 0, x2: 0, y2: 1 });
    grad.appendChild(svgEl('stop', { offset: '0%', 'stop-color': '#A59132', 'stop-opacity': 0.35 }));
    grad.appendChild(svgEl('stop', { offset: '100%', 'stop-color': '#A59132', 'stop-opacity': 0 }));
    defs.appendChild(grad);
    svg.appendChild(defs);
    svg.appendChild(svgEl('path', { d: areaPath, fill: `url(#${gradId})`, stroke: 'none' }));

    // line
    const linePath = 'M ' + points.map(p => p.join(',')).join(' L ');
    svg.appendChild(svgEl('path', { d: linePath, fill: 'none', stroke: '#A3500C', 'stroke-width': 2.5, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }));

    // points
    points.forEach((p, i) => {
      const c = svgEl('circle', { cx: p[0], cy: p[1], r: 4, fill: '#30362F', stroke: '#A59132', 'stroke-width': 2, class: 'chart-bar' });
      attachTooltip(c, () => `<strong>${Utils.escapeHTML(data[i].label)}</strong><br>${Utils.numberFormat(data[i].value)} accidents`);
      svg.appendChild(c);
    });

    // x labels (sparse to avoid crowding)
    const labelEvery = Math.max(1, Math.ceil(data.length / 12));
    data.forEach((d, i) => {
      if (i % labelEvery !== 0 && i !== data.length - 1) return;
      const t = svgEl('text', { x: points[i][0], y: height - 10, 'text-anchor': 'middle', class: 'chart-axis' });
      t.textContent = d.label.length > 7 ? d.label.slice(2) : d.label;
      svg.appendChild(t);
    });

    const wrap = Utils.el('div', { class: 'chart-wrap' }, svg);
    container.appendChild(wrap);
  }

  /** Donut chart. data = [{label, value}] */
  function renderDonutChart(container, data, opts = {}) {
    clear(container);
    const total = data.reduce((s, d) => s + d.value, 0);
    if (!total) { renderEmpty(container, 'No data for the current filters.'); return; }

    const size = opts.size || 220;
    const cx = size / 2, cy = size / 2, r = size / 2 - 14, strokeW = opts.strokeWidth || 26;
    const colors = opts.colors || PALETTE;

    const svg = svgEl('svg', { viewBox: `0 0 ${size} ${size}` });
    let angleStart = -90;

    data.forEach((d, i) => {
      const fraction = d.value / total;
      const angle = fraction * 360;
      const largeArc = angle > 180 ? 1 : 0;
      const startRad = (angleStart * Math.PI) / 180;
      const endRad = ((angleStart + angle) * Math.PI) / 180;
      const x1 = cx + r * Math.cos(startRad), y1 = cy + r * Math.sin(startRad);
      const x2 = cx + r * Math.cos(endRad), y2 = cy + r * Math.sin(endRad);
      const path = svgEl('path', {
        d: `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`,
        fill: 'none',
        stroke: opts.colorFn ? opts.colorFn(d.label) : colors[i % colors.length],
        'stroke-width': strokeW,
        class: 'chart-bar',
      });
      attachTooltip(path, () => `<strong>${Utils.escapeHTML(d.label)}</strong><br>${Utils.numberFormat(d.value)} (${Utils.pct(d.value, total)})`);
      svg.appendChild(path);
      angleStart += angle;
    });

    const centerVal = svgEl('text', { x: cx, y: cy - 2, 'text-anchor': 'middle', class: 'donut-center-label' });
    centerVal.textContent = Utils.numberFormat(total);
    const centerSub = svgEl('text', { x: cx, y: cy + 18, 'text-anchor': 'middle', class: 'donut-center-sub' });
    centerSub.textContent = opts.centerLabel || 'total';
    svg.appendChild(centerVal);
    svg.appendChild(centerSub);

    const wrap = Utils.el('div', { class: 'chart-wrap', style: 'max-width:240px;margin:0 auto;' }, svg);
    container.appendChild(wrap);

    if (opts.legend !== false) {
      const legend = Utils.el('div', { class: 'chart-legend' });
      data.forEach((d, i) => {
        const swatch = Utils.el('span', { class: 'chart-legend-swatch', style: `background:${opts.colorFn ? opts.colorFn(d.label) : colors[i % colors.length]}` });
        legend.appendChild(Utils.el('span', { class: 'chart-legend-item' }, [swatch, `${d.label} · ${Utils.pct(d.value, total)}`]));
      });
      container.appendChild(legend);
    }
  }

  /** Vertical bar chart. data = [{label, value}] */
  function renderBarChart(container, data, opts = {}) {
    clear(container);
    if (!data.length) { renderEmpty(container, 'No data for the current filters.'); return; }

    const width = opts.width || 700, height = opts.height || 260;
    const padding = { top: 16, right: 16, bottom: 56, left: 40 };
    const innerW = width - padding.left - padding.right;
    const innerH = height - padding.top - padding.bottom;
    const maxVal = Math.max(...data.map(d => d.value), 1);
    const gap = 10;
    const barW = Math.max(6, innerW / data.length - gap);

    const svg = svgEl('svg', { viewBox: `0 0 ${width} ${height}` });

    for (let i = 0; i <= 3; i++) {
      const y = padding.top + (innerH / 3) * i;
      svg.appendChild(svgEl('line', { x1: padding.left, x2: width - padding.right, y1: y, y2: y, class: 'chart-gridline' }));
    }

    data.forEach((d, i) => {
      const barH = (d.value / maxVal) * innerH;
      const x = padding.left + i * (barW + gap);
      const y = padding.top + innerH - barH;
      const rect = svgEl('rect', {
        x, y, width: barW, height: Math.max(barH, 1), rx: 3,
        fill: opts.colorFn ? opts.colorFn(d.label, i) : (opts.color || '#A59132'),
        class: 'chart-bar',
      });
      attachTooltip(rect, () => `<strong>${Utils.escapeHTML(d.label)}</strong><br>${Utils.numberFormat(d.value)} accidents`);
      svg.appendChild(rect);

      if (opts.showLabels !== false) {
        const t = svgEl('text', {
          x: x + barW / 2, y: height - padding.bottom + 16, 'text-anchor': 'end', class: 'chart-axis',
          transform: `rotate(-40 ${x + barW / 2} ${height - padding.bottom + 16})`,
        });
        const label = String(d.label);
        t.textContent = label.length > 14 ? label.slice(0, 13) + '…' : label;
        svg.appendChild(t);
      }
    });

    const wrap = Utils.el('div', { class: 'chart-wrap' }, svg);
    container.appendChild(wrap);
  }

  /** Horizontal bar chart. data = [{label, value}] sorted desc expected */
  function renderHBarChart(container, data, opts = {}) {
    clear(container);
    if (!data.length) { renderEmpty(container, 'No data for the current filters.'); return; }

    const rowH = 30;
    const width = opts.width || 500;
    const height = data.length * rowH + 20;
    const padding = { left: opts.labelWidth || 130, right: 50 };
    const innerW = width - padding.left - padding.right;
    const maxVal = Math.max(...data.map(d => d.value), 1);

    const svg = svgEl('svg', { viewBox: `0 0 ${width} ${height}` });

    data.forEach((d, i) => {
      const y = 10 + i * rowH;
      const barW = (d.value / maxVal) * innerW;
      const label = svgEl('text', { x: padding.left - 10, y: y + rowH / 2 + 4, 'text-anchor': 'end', class: 'chart-axis' });
      label.textContent = String(d.label).length > 18 ? String(d.label).slice(0, 17) + '…' : d.label;
      svg.appendChild(label);

      const track = svgEl('rect', { x: padding.left, y: y + 5, width: innerW, height: rowH - 14, rx: 4, fill: 'var(--bg-app)' });
      svg.appendChild(track);

      const bar = svgEl('rect', {
        x: padding.left, y: y + 5, width: Math.max(barW, 3), height: rowH - 14, rx: 4,
        fill: opts.colorFn ? opts.colorFn(d.label, i) : (opts.color || '#A3500C'),
        class: 'chart-bar',
      });
      attachTooltip(bar, () => `<strong>${Utils.escapeHTML(d.label)}</strong><br>${Utils.numberFormat(d.value)} accidents`);
      svg.appendChild(bar);

      const val = svgEl('text', { x: padding.left + Math.max(barW, 3) + 8, y: y + rowH / 2 + 4, class: 'chart-axis' });
      val.textContent = Utils.numberFormat(d.value);
      svg.appendChild(val);
    });

    const wrap = Utils.el('div', { class: 'chart-wrap' }, svg);
    container.appendChild(wrap);
  }

  /** 24-hour distribution chart (bar) */
  function renderHourChart(container, data, opts = {}) {
    clear(container);
    const width = opts.width || 900, height = opts.height || 220;
    const padding = { top: 14, right: 10, bottom: 30, left: 36 };
    const innerW = width - padding.left - padding.right;
    const innerH = height - padding.top - padding.bottom;
    const maxVal = Math.max(...data.map(d => d.value), 1);
    const barW = innerW / 24 - 4;

    const svg = svgEl('svg', { viewBox: `0 0 ${width} ${height}` });
    for (let i = 0; i <= 3; i++) {
      const y = padding.top + (innerH / 3) * i;
      svg.appendChild(svgEl('line', { x1: padding.left, x2: width - padding.right, y1: y, y2: y, class: 'chart-gridline' }));
    }

    data.forEach((d, i) => {
      const barH = (d.value / maxVal) * innerH;
      const x = padding.left + i * (innerW / 24) + 2;
      const y = padding.top + innerH - barH;
      const rushHour = [7,8,9,13,14,15,16,19,20,21].includes(d.label);
      const rect = svgEl('rect', {
        x, y, width: barW, height: Math.max(barH, 1), rx: 2,
        fill: rushHour ? '#A3500C' : '#A59132',
        opacity: rushHour ? 1 : 0.75,
        class: 'chart-bar',
      });
      attachTooltip(rect, () => `<strong>${String(d.label).padStart(2, '0')}:00</strong><br>${Utils.numberFormat(d.value)} accidents${rushHour ? ' · rush hour' : ''}`);
      svg.appendChild(rect);
      if (i % 3 === 0) {
        const t = svgEl('text', { x: x + barW / 2, y: height - 8, 'text-anchor': 'middle', class: 'chart-axis' });
        t.textContent = String(d.label).padStart(2, '0');
        svg.appendChild(t);
      }
    });

    const wrap = Utils.el('div', { class: 'chart-wrap' }, svg);
    container.appendChild(wrap);
  }

  function renderEmpty(container, message) {
    clear(container);
    container.appendChild(Utils.el('div', { class: 'state-block' }, [
      Utils.el('h4', {}, 'No data to display'),
      Utils.el('p', {}, message),
    ]));
  }

  function severityColorFn(label) { return Utils.severityColor(label); }
  function riskColorFn(label) { return Utils.riskColor(label); }

  return {
    renderLineChart, renderDonutChart, renderBarChart, renderHBarChart, renderHourChart,
    renderEmpty, severityColorFn, riskColorFn, PALETTE,
  };
})();
