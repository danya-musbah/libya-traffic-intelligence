/* Lucide 28-icon subset (ISC); see assets/lucide-LICENSE.txt. */
const Icons = (() => {
  const definitions = {
  "arrow-down": "<path d=\"M12 5v14\" />\n  <path d=\"m19 12-7 7-7-7\" />",
  "arrow-right": "<path d=\"M5 12h14\" />\n  <path d=\"m12 5 7 7-7 7\" />",
  "arrow-up": "<path d=\"m5 12 7-7 7 7\" />\n  <path d=\"M12 19V5\" />",
  "car-front": "<path d=\"m21 8-2 2-1.5-3.7A2 2 0 0 0 15.646 5H8.4a2 2 0 0 0-1.903 1.257L5 10 3 8\" />\n  <path d=\"M7 14h.01\" />\n  <path d=\"M17 14h.01\" />\n  <rect width=\"18\" height=\"8\" x=\"3\" y=\"10\" rx=\"2\" />\n  <path d=\"M5 18v2\" />\n  <path d=\"M19 18v2\" />",
  "chart-no-axes-column": "<line x1=\"18\" x2=\"18\" y1=\"20\" y2=\"10\" />\n  <line x1=\"12\" x2=\"12\" y1=\"20\" y2=\"4\" />\n  <line x1=\"6\" x2=\"6\" y1=\"20\" y2=\"14\" />",
  "check": "<path d=\"M20 6 9 17l-5-5\" />",
  "chevron-left": "<path d=\"m15 18-6-6 6-6\" />",
  "chevron-right": "<path d=\"m9 18 6-6-6-6\" />",
  "chevrons-left": "<path d=\"m11 17-5-5 5-5\" />\n  <path d=\"m18 17-5-5 5-5\" />",
  "chevrons-right": "<path d=\"m6 17 5-5-5-5\" />\n  <path d=\"m13 17 5-5-5-5\" />",
  "circle-alert": "<circle cx=\"12\" cy=\"12\" r=\"10\" />\n  <line x1=\"12\" x2=\"12\" y1=\"8\" y2=\"12\" />\n  <line x1=\"12\" x2=\"12.01\" y1=\"16\" y2=\"16\" />",
  "clock": "<circle cx=\"12\" cy=\"12\" r=\"10\" />\n  <polyline points=\"12 6 12 12 16 14\" />",
  "construction": "<rect x=\"2\" y=\"6\" width=\"20\" height=\"8\" rx=\"1\" />\n  <path d=\"M17 14v7\" />\n  <path d=\"M7 14v7\" />\n  <path d=\"M17 3v3\" />\n  <path d=\"M7 3v3\" />\n  <path d=\"M10 14 2.3 6.3\" />\n  <path d=\"m14 6 7.7 7.7\" />\n  <path d=\"m8 6 8 8\" />",
  "file-text": "<path d=\"M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z\" />\n  <path d=\"M14 2v4a2 2 0 0 0 2 2h4\" />\n  <path d=\"M10 9H8\" />\n  <path d=\"M16 13H8\" />\n  <path d=\"M16 17H8\" />",
  "heart-pulse": "<path d=\"M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z\" />\n  <path d=\"M3.22 12H9.5l.5-1 2 4.5 2-7 1.5 3.5h5.27\" />",
  "info": "<circle cx=\"12\" cy=\"12\" r=\"10\" />\n  <path d=\"M12 16v-4\" />\n  <path d=\"M12 8h.01\" />",
  "layout-dashboard": "<rect width=\"7\" height=\"9\" x=\"3\" y=\"3\" rx=\"1\" />\n  <rect width=\"7\" height=\"5\" x=\"14\" y=\"3\" rx=\"1\" />\n  <rect width=\"7\" height=\"9\" x=\"14\" y=\"12\" rx=\"1\" />\n  <rect width=\"7\" height=\"5\" x=\"3\" y=\"16\" rx=\"1\" />",
  "map-pin": "<path d=\"M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0\" />\n  <circle cx=\"12\" cy=\"10\" r=\"3\" />",
  "menu": "<line x1=\"4\" x2=\"20\" y1=\"12\" y2=\"12\" />\n  <line x1=\"4\" x2=\"20\" y1=\"6\" y2=\"6\" />\n  <line x1=\"4\" x2=\"20\" y1=\"18\" y2=\"18\" />",
  "minus": "<path d=\"M5 12h14\" />",
  "panel-left-close": "<rect width=\"18\" height=\"18\" x=\"3\" y=\"3\" rx=\"2\" />\n  <path d=\"M9 3v18\" />\n  <path d=\"m16 15-3-3 3-3\" />",
  "plus": "<path d=\"M5 12h14\" />\n  <path d=\"M12 5v14\" />",
  "rotate-ccw": "<path d=\"M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8\" />\n  <path d=\"M3 3v5h5\" />",
  "rotate-cw": "<path d=\"M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8\" />\n  <path d=\"M21 3v5h-5\" />",
  "search": "<circle cx=\"11\" cy=\"11\" r=\"8\" />\n  <path d=\"m21 21-4.3-4.3\" />",
  "skull": "<path d=\"m12.5 17-.5-1-.5 1h1z\" />\n  <path d=\"M15 22a1 1 0 0 0 1-1v-1a2 2 0 0 0 1.56-3.25 8 8 0 1 0-11.12 0A2 2 0 0 0 8 20v1a1 1 0 0 0 1 1z\" />\n  <circle cx=\"15\" cy=\"12\" r=\"1\" />\n  <circle cx=\"9\" cy=\"12\" r=\"1\" />",
  "triangle-alert": "<path d=\"m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3\" />\n  <path d=\"M12 9v4\" />\n  <path d=\"M12 17h.01\" />",
  "x": "<path d=\"M18 6 6 18\" />\n  <path d=\"m6 6 12 12\" />"
};
  const NS = 'http://www.w3.org/2000/svg';

  function installSprite() {
    if (document.getElementById('lucide-icon-library')) return;
    const sprite = document.createElementNS(NS, 'svg');
    sprite.id = 'lucide-icon-library';
    sprite.setAttribute('aria-hidden', 'true');
    sprite.setAttribute('class', 'icon-library');

    Object.entries(definitions).forEach(([name, markup]) => {
      const symbol = document.createElementNS(NS, 'symbol');
      symbol.id = 'lucide-' + name;
      symbol.setAttribute('viewBox', '0 0 24 24');
      symbol.setAttribute('fill', 'none');
      symbol.setAttribute('stroke', 'currentColor');
      symbol.setAttribute('stroke-width', '2');
      symbol.setAttribute('stroke-linecap', 'round');
      symbol.setAttribute('stroke-linejoin', 'round');
      symbol.innerHTML = markup;
      sprite.appendChild(symbol);
    });

    document.body.prepend(sprite);
  }

  function create(name, size = 18) {
    if (!Object.prototype.hasOwnProperty.call(definitions, name)) {
      throw new Error('Unknown Lucide icon: ' + name);
    }
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('class', 'icon');
    svg.setAttribute('width', String(size));
    svg.setAttribute('height', String(size));
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    const use = document.createElementNS(NS, 'use');
    use.setAttribute('href', '#lucide-' + name);
    svg.appendChild(use);
    return svg;
  }

  installSprite();
  return { create };
})();
