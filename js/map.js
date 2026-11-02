/* ==========================================================================
   map.js — stylized SVG map of Libya. No external mapping library.
   Projects lat/lon into SVG coordinates, plots accident points, and
   supports pan/zoom, tooltips, severity color-coding, and a hotspot
   density mode. This is an illustrative, not surveyed-accurate, outline.
   ========================================================================== */

const MapModule = (() => {

  const NS = 'http://www.w3.org/2000/svg';
  const VIEW_W = 640, VIEW_H = 640;

  // Approximate bounding box for Libya (lat/lon) used for linear projection.
  const BOUNDS = { latMin: 19.0, latMax: 33.6, lonMin: 9.0, lonMax: 25.5 };

  // Simplified, stylized outline of Libya (illustrative — not survey-grade).
  const LIBYA_OUTLINE = "M 120,90 L 210,72 L 300,66 L 390,74 L 430,90 L 470,86 " +
    "L 505,102 L 520,128 L 500,150 L 520,170 L 505,196 L 520,224 L 500,250 " +
    "L 512,290 L 490,330 L 500,370 L 480,410 L 490,450 L 465,490 L 470,530 " +
    "L 440,560 L 400,566 L 360,560 L 320,566 L 280,558 L 240,566 L 200,556 " +
    "L 165,566 L 130,548 L 110,510 L 130,480 L 108,445 L 128,410 L 104,375 " +
    "L 122,338 L 100,300 L 118,260 L 96,222 L 116,184 L 98,146 L 120,110 Z";

  let state = {
    scale: 1, tx: 0, ty: 0,
    dragging: false, lastX: 0, lastY: 0,
    mode: 'points', // 'points' | 'heatmap'
    onFilterClick: null,
  };

  function project(lat, lon) {
    const x = ((lon - BOUNDS.lonMin) / (BOUNDS.lonMax - BOUNDS.lonMin)) * VIEW_W;
    const y = VIEW_H - ((lat - BOUNDS.latMin) / (BOUNDS.latMax - BOUNDS.latMin)) * VIEW_H;
    return [x, y];
  }

  function svgEl(tag, attrs = {}) {
    const node = document.createElementNS(NS, tag);
    Object.entries(attrs).forEach(([k, v]) => node.setAttribute(k, v));
    return node;
  }

  function severityRadius(sev) {
    return { Minor: 3.2, Moderate: 4.2, Severe: 5.4, Critical: 6.8 }[sev] || 3.2;
  }

  function init(containerEl, options = {}) {
    state.onFilterClick = options.onCityClick || null;
    render(containerEl, [], 'points');
  }

  function render(containerEl, records, mode = 'points') {
    state.mode = mode;
    containerEl.innerHTML = '';

    const svg = svgEl('svg', {
      viewBox: `0 0 ${VIEW_W} ${VIEW_H}`,
      id: 'libya-map-svg',
      role: 'img',
      'aria-label': 'Map of accident locations across Libya',
    });

    const world = svgEl('g', { id: 'map-world', transform: `translate(${state.tx},${state.ty}) scale(${state.scale})` });

    // background sea gradient
    const defs = svgEl('defs');
    const grad = svgEl('radialGradient', { id: 'seaGrad', cx: '30%', cy: '20%' });
    grad.appendChild(svgEl('stop', { offset: '0%', 'stop-color': '#3a4235' }));
    grad.appendChild(svgEl('stop', { offset: '100%', 'stop-color': '#23261f' }));
    defs.appendChild(grad);
    const glow = svgEl('filter', { id: 'heatBlur', x: '-50%', y: '-50%', width: '200%', height: '200%' });
    glow.appendChild(svgEl('feGaussianBlur', { stdDeviation: 14 }));
    defs.appendChild(glow);
    svg.appendChild(defs);

    svg.appendChild(svgEl('rect', { x: 0, y: 0, width: VIEW_W, height: VIEW_H, fill: 'url(#seaGrad)' }));

    // country outline
    world.appendChild(svgEl('path', {
      d: LIBYA_OUTLINE,
      fill: '#40473c',
      stroke: '#A59132',
      'stroke-width': 1.4,
      'stroke-opacity': 0.55,
    }));

    // subtle graticule
    for (let i = 1; i < 6; i++) {
      world.appendChild(svgEl('line', { x1: 0, x2: VIEW_W, y1: (VIEW_H / 6) * i, y2: (VIEW_H / 6) * i, stroke: 'rgba(255,251,215,0.04)', 'stroke-width': 1 }));
      world.appendChild(svgEl('line', { y1: 0, y2: VIEW_H, x1: (VIEW_W / 6) * i, x2: (VIEW_W / 6) * i, stroke: 'rgba(255,251,215,0.04)', 'stroke-width': 1 }));
    }

    if (mode === 'heatmap') {
      renderHeatmap(world, records);
    } else {
      renderPoints(world, records);
    }

    svg.appendChild(world);
    containerEl.appendChild(svg);

    attachInteractions(svg, world);
  }

  function renderPoints(world, records) {
    const group = svgEl('g', { id: 'points-layer' });
    // cap rendered points for performance while remaining representative
    const sample = records.length > 1200 ? sampleEvenly(records, 1200) : records;

    sample.forEach(r => {
      const [x, y] = project(r.latitude, r.longitude);
      const circle = svgEl('circle', {
        cx: x, cy: y, r: severityRadius(r.severity),
        fill: Utils.severityColor(r.severity),
        opacity: 0.82,
        stroke: '#20231d',
        'stroke-width': 0.6,
        class: 'map-point',
      });
      circle.addEventListener('mousemove', (e) => {
        Utils.showTooltip(e.clientX, e.clientY,
          `<strong>${Utils.escapeHTML(r.accident_id)}</strong><br>${Utils.escapeHTML(r.city)} — ${Utils.escapeHTML(r.road_name)}<br>${Utils.escapeHTML(r.severity)} · ${Utils.escapeHTML(r.accident_type)}<br>${Utils.escapeHTML(r.date)} ${Utils.escapeHTML(r.time)}`);
      });
      circle.addEventListener('mouseleave', Utils.hideTooltip);
      group.appendChild(circle);
    });

    world.appendChild(group);
  }

  function renderHeatmap(world, records) {
    const group = svgEl('g', { id: 'heat-layer', filter: 'url(#heatBlur)' });
    // bucket into a coarse grid to build density blobs
    const cellSize = 26;
    const grid = Object.create(null);
    records.forEach(r => {
      const [x, y] = project(r.latitude, r.longitude);
      const key = `${Math.round(x / cellSize)}_${Math.round(y / cellSize)}`;
      grid[key] = grid[key] || { x: 0, y: 0, count: 0 };
      grid[key].x += x; grid[key].y += y; grid[key].count++;
    });
    const cells = Object.values(grid);
    const maxCount = Math.max(...cells.map(c => c.count), 1);

    cells.forEach(c => {
      const cx = c.x / c.count, cy = c.y / c.count;
      const intensity = c.count / maxCount;
      const r = 14 + intensity * 34;
      const circle = svgEl('circle', {
        cx, cy, r,
        fill: intensity > 0.6 ? '#A3500C' : intensity > 0.3 ? '#A59132' : '#7f8a5c',
        opacity: 0.35 + intensity * 0.4,
      });
      group.appendChild(circle);
    });
    world.appendChild(group);

    // crisp centroid dots on top (unblurred) for readability
    const dotsGroup = svgEl('g');
    cells.filter(c => c.count / maxCount > 0.5).forEach(c => {
      const cx = c.x / c.count, cy = c.y / c.count;
      const dot = svgEl('circle', { cx, cy, r: 2.4, fill: '#FFFBD7' });
      dotsGroup.appendChild(dot);
    });
    world.appendChild(dotsGroup);
  }

  function sampleEvenly(arr, n) {
    const step = arr.length / n;
    const out = [];
    for (let i = 0; i < n; i++) out.push(arr[Math.floor(i * step)]);
    return out;
  }

  // ---- Pan & zoom -----------------------------------------------------------

  function attachInteractions(svg, world) {
    function applyTransform() {
      world.setAttribute('transform', `translate(${state.tx},${state.ty}) scale(${state.scale})`);
    }

    svg.addEventListener('wheel', (e) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      state.scale = Math.min(4, Math.max(1, state.scale + delta));
      applyTransform();
    }, { passive: false });

    svg.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      e.preventDefault();
      state.dragging = true;
      state.lastX = e.clientX; state.lastY = e.clientY;
      svg.setPointerCapture(e.pointerId);
    });
    svg.addEventListener('pointermove', (e) => {
      if (!state.dragging) return;
      const dx = e.clientX - state.lastX, dy = e.clientY - state.lastY;
      state.tx += dx; state.ty += dy;
      state.lastX = e.clientX; state.lastY = e.clientY;
      applyTransform();
    });
    const stopDragging = () => { state.dragging = false; };
    svg.addEventListener('pointerup', stopDragging);
    svg.addEventListener('pointercancel', stopDragging);
  }

  function zoomIn() {
    state.scale = Math.min(4, state.scale + 0.35);
    const world = document.getElementById('map-world');
    if (world) world.setAttribute('transform', `translate(${state.tx},${state.ty}) scale(${state.scale})`);
  }
  function zoomOut() {
    state.scale = Math.max(1, state.scale - 0.35);
    const world = document.getElementById('map-world');
    if (world) world.setAttribute('transform', `translate(${state.tx},${state.ty}) scale(${state.scale})`);
  }
  function resetView() {
    state.scale = 1; state.tx = 0; state.ty = 0;
    const world = document.getElementById('map-world');
    if (world) world.setAttribute('transform', `translate(0,0) scale(1)`);
  }

  return { init, render, zoomIn, zoomOut, resetView };
})();
