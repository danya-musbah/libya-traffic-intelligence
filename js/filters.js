/* ==========================================================================
   filters.js — builds and wires the filter panel, chips, and global search.
   ========================================================================== */

const FiltersModule = (() => {

  const FILTER_FIELDS = [
    { key: 'city', field: 'city', label: 'City' },
    { key: 'district', field: 'district', label: 'District' },
    { key: 'road', field: 'road_name', label: 'Road' },
    { key: 'accidentType', field: 'accident_type', label: 'Accident Type' },
    { key: 'severity', field: 'severity', label: 'Severity' },
    { key: 'cause', field: 'possible_cause', label: 'Cause' },
    { key: 'weather', field: 'weather', label: 'Weather' },
    { key: 'roadCondition', field: 'road_condition', label: 'Road Condition' },
    { key: 'trafficLevel', field: 'traffic_level', label: 'Traffic Level' },
    { key: 'year', field: 'year', label: 'Year' },
    { key: 'month', field: 'month', label: 'Month' },
    { key: 'dayOfWeek', field: 'day_of_week', label: 'Day of Week' },
  ];

  function buildPanel(container) {
    container.innerHTML = '';

    FILTER_FIELDS.forEach(f => {
      const select = Utils.el('select', { id: 'filter-' + f.key, 'aria-label': f.label });
      select.appendChild(Utils.el('option', { value: '' }, `All ${f.label}s`));
      DataModule.uniqueValues(f.field).forEach(v => {
        select.appendChild(Utils.el('option', { value: v }, String(v)));
      });
      select.value = AppState.filters[f.key] || '';
      select.addEventListener('change', () => {
        AppState.filters[f.key] = select.value;
        if (f.key === 'city') refreshRoadOptions();
      });
      const field = Utils.el('div', { class: 'field' }, [
        Utils.el('label', { for: 'filter-' + f.key }, f.label),
        select,
      ]);
      container.appendChild(field);
    });

    // Time range
    const timeStart = Utils.el('input', { type: 'time', id: 'filter-time-start' });
    const timeEnd = Utils.el('input', { type: 'time', id: 'filter-time-end' });
    timeStart.addEventListener('change', () => { AppState.filters.timeStart = timeStart.value; });
    timeEnd.addEventListener('change', () => { AppState.filters.timeEnd = timeEnd.value; });

    container.appendChild(Utils.el('div', { class: 'field' }, [
      Utils.el('label', {}, 'Time From'), timeStart,
    ]));
    container.appendChild(Utils.el('div', { class: 'field' }, [
      Utils.el('label', {}, 'Time To'), timeEnd,
    ]));
  }

  function refreshRoadOptions() {
    const roadSelect = document.getElementById('filter-road');
    if (!roadSelect) return;
    const currentCity = AppState.filters.city;
    const current = roadSelect.value;
    roadSelect.innerHTML = '';
    roadSelect.appendChild(Utils.el('option', { value: '' }, 'All Roads'));
    DataModule.roadsForCity(currentCity).forEach(v => {
      roadSelect.appendChild(Utils.el('option', { value: v }, v));
    });
    if (DataModule.roadsForCity(currentCity).includes(current)) roadSelect.value = current;
    else { roadSelect.value = ''; AppState.filters.road = ''; }
  }

  function renderChips(container, onRemove) {
    container.innerHTML = '';
    const labels = {
      city: 'City', district: 'District', road: 'Road', accidentType: 'Type',
      severity: 'Severity', cause: 'Cause', weather: 'Weather',
      roadCondition: 'Road Cond.', trafficLevel: 'Traffic', year: 'Year',
      month: 'Month', dayOfWeek: 'Day', timeStart: 'From', timeEnd: 'To',
    };
    let any = false;
    Object.entries(AppState.filters).forEach(([key, val]) => {
      if (!val) return;
      any = true;
      const chip = Utils.el('span', { class: 'filter-chip' }, [
        `${labels[key] || key}: ${val}`,
        Utils.el('button', {
          'aria-label': `Remove ${labels[key]} filter`,
          onclick: () => onRemove(key),
        }, '✕'),
      ]);
      container.appendChild(chip);
    });
    if (AppState.searchQuery) {
      any = true;
      const chip = Utils.el('span', { class: 'filter-chip' }, [
        `Search: "${AppState.searchQuery}"`,
        Utils.el('button', { 'aria-label': 'Clear search', onclick: () => onRemove('__search') }, Utils.icon('x', 14)),
      ]);
      container.appendChild(chip);
    }
    container.style.display = any ? 'flex' : 'none';
  }

  return { buildPanel, refreshRoadOptions, renderChips, FILTER_FIELDS };
})();
