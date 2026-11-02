/* ==========================================================================
   data.js — CSV loading (with local-file fallback), normalization,
   and the single shared application state object
   ========================================================================== */

const AppState = {
  raw: [],          // all records, normalized
  filtered: [],      // records after current filters applied
  loaded: false,
  loadError: null,
  filters: {
    city: '', district: '', road: '', accidentType: '', severity: '',
    cause: '', weather: '', roadCondition: '', trafficLevel: '',
    year: '', month: '', dayOfWeek: '', timeStart: '', timeEnd: '',
  },
  searchQuery: '',
  table: { page: 1, pageSize: 12, sortKey: 'date', sortDir: 'desc' },
};

const DataModule = (() => {

  const NUMERIC_FIELDS = [
    'latitude', 'longitude', 'number_of_vehicles', 'number_of_injuries',
    'number_of_fatalities', 'estimated_damage', 'road_closed',
    'closure_duration_minutes', 'emergency_response_minutes',
    'is_weekend', 'is_rush_hour', 'year',
  ];
  const REQUIRED_FIELDS = [
    'accident_id', 'date', 'time', 'day_of_week', 'month', 'year', 'city',
    'district', 'road_name', 'road_type', 'latitude', 'longitude',
    'accident_type', 'severity', 'number_of_vehicles', 'number_of_injuries',
    'number_of_fatalities', 'estimated_damage', 'weather', 'road_condition',
    'traffic_level', 'lighting_condition', 'possible_cause', 'road_closed',
    'closure_duration_minutes', 'emergency_response_minutes', 'is_weekend',
    'is_rush_hour', 'risk_level',
  ];
  const REQUIRED_TEXT_FIELDS = [
    'accident_id', 'date', 'time', 'day_of_week', 'month', 'city', 'district',
    'road_name', 'road_type', 'accident_type', 'severity', 'weather',
    'road_condition', 'traffic_level', 'lighting_condition', 'possible_cause',
    'risk_level',
  ];
  const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const SEVERITIES = ['Minor', 'Moderate', 'Severe', 'Critical'];
  const RISK_LEVELS = ['Low', 'Medium', 'High'];

  function normalizeRecord(rec, rowNumber) {
    const out = { ...rec };
    REQUIRED_TEXT_FIELDS.forEach(field => {
      if (!String(rec[field] || '').trim()) {
        throw new Error(`CSV row ${rowNumber} is missing a value for "${field}".`);
      }
    });

    NUMERIC_FIELDS.forEach(f => {
      const value = String(rec[f] || '').trim();
      const number = Number(value);
      if (!value || !Number.isFinite(number)) {
        throw new Error(`CSV row ${rowNumber} has an invalid numeric value for "${f}".`);
      }
      out[f] = number;
    });

    if (!/^\d{4}-\d{2}-\d{2}$/.test(rec.date)) {
      throw new Error(`CSV row ${rowNumber} has an invalid date; expected YYYY-MM-DD.`);
    }
    const date = new Date(`${rec.date}T00:00:00Z`);
    if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== rec.date) {
      throw new Error(`CSV row ${rowNumber} has an invalid calendar date.`);
    }
    if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(rec.time)) {
      throw new Error(`CSV row ${rowNumber} has an invalid time; expected HH:MM.`);
    }
    if (out.year !== date.getUTCFullYear() || rec.month !== MONTHS[date.getUTCMonth()] ||
        rec.day_of_week !== DAYS[date.getUTCDay()]) {
      throw new Error(`CSV row ${rowNumber} has date, year, month, or weekday values that do not agree.`);
    }
    if (!SEVERITIES.includes(rec.severity) || !RISK_LEVELS.includes(rec.risk_level)) {
      throw new Error(`CSV row ${rowNumber} has an unsupported severity or risk level.`);
    }
    if (![0, 1].includes(out.road_closed) || ![0, 1].includes(out.is_weekend) ||
        ![0, 1].includes(out.is_rush_hour)) {
      throw new Error(`CSV row ${rowNumber} has an invalid 0/1 flag.`);
    }
    if (out.latitude < -90 || out.latitude > 90 || out.longitude < -180 || out.longitude > 180) {
      throw new Error(`CSV row ${rowNumber} has coordinates outside the valid latitude/longitude ranges.`);
    }
    if (['number_of_vehicles', 'number_of_injuries', 'number_of_fatalities',
      'estimated_damage', 'closure_duration_minutes', 'emergency_response_minutes']
      .some(field => out[field] < 0)) {
      throw new Error(`CSV row ${rowNumber} contains a negative count, duration, or damage value.`);
    }
    out.hour = Number(rec.time.slice(0, 2));
    return out;
  }

  async function loadFromServer() {
    const res = await fetch('data/accidents.csv', { cache: 'no-store' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const text = await res.text();
    if (!text || text.trim().length === 0) throw new Error('Empty CSV response');
    return text;
  }

  function parseAndStore(text) {
    const rows = Utils.parseCSV(text);
    if (rows.length < 2) throw new Error('CSV must include a header and at least one record.');
    const headers = rows[0].map(value => value.trim().replace(/^\uFEFF/, ''));
    const missing = REQUIRED_FIELDS.filter(field => !headers.includes(field));
    if (missing.length) {
      throw new Error('CSV is missing required columns: ' + missing.join(', ') + '.');
    }
    const objs = Utils.rowsToObjects(rows);
    const normalized = objs.map((record, index) => normalizeRecord(record, index + 2));
    if (!normalized.length) throw new Error('CSV contains no accident records.');

    AppState.raw = normalized;
    AppState.filtered = normalized.slice();
    AppState.loaded = true;
    AppState.loadError = null;
    Object.keys(AppState.filters).forEach(key => { AppState.filters[key] = ''; });
    AppState.searchQuery = '';
    AppState.table.page = 1;
    return normalized;
  }

  async function init() {
    try {
      const text = await loadFromServer();
      parseAndStore(text);
      return { ok: true, count: AppState.raw.length };
    } catch (err) {
      AppState.loadError = err.message || 'Unknown error';
      AppState.loaded = AppState.raw.length > 0;
      return { ok: false, error: AppState.loadError };
    }
  }

  function loadFromFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const normalized = parseAndStore(reader.result);
          resolve(normalized);
        } catch (e) { reject(e); }
      };
      reader.onerror = () => reject(new Error('File read failed'));
      reader.readAsText(file);
    });
  }

  // ---- Filtering -----------------------------------------------------------

  function timeToMinutes(hhmm) {
    if (!hhmm) return null;
    const [h, m] = hhmm.split(':').map(Number);
    return h * 60 + (m || 0);
  }

  function applyFilters() {
    const f = AppState.filters;
    const q = AppState.searchQuery.trim().toLowerCase();

    let list = AppState.raw.filter(r => {
      if (f.city && r.city !== f.city) return false;
      if (f.district && r.district !== f.district) return false;
      if (f.road && r.road_name !== f.road) return false;
      if (f.accidentType && r.accident_type !== f.accidentType) return false;
      if (f.severity && r.severity !== f.severity) return false;
      if (f.cause && r.possible_cause !== f.cause) return false;
      if (f.weather && r.weather !== f.weather) return false;
      if (f.roadCondition && r.road_condition !== f.roadCondition) return false;
      if (f.trafficLevel && r.traffic_level !== f.trafficLevel) return false;
      if (f.year && String(r.year) !== String(f.year)) return false;
      if (f.month && r.month !== f.month) return false;
      if (f.dayOfWeek && r.day_of_week !== f.dayOfWeek) return false;
      if (f.timeStart || f.timeEnd) {
        const mins = timeToMinutes(r.time);
        if (f.timeStart && mins < timeToMinutes(f.timeStart)) return false;
        if (f.timeEnd && mins > timeToMinutes(f.timeEnd)) return false;
      }
      return true;
    });

    if (q) {
      list = list.filter(r => {
        return (
          r.accident_id.toLowerCase().includes(q) ||
          r.city.toLowerCase().includes(q) ||
          r.district.toLowerCase().includes(q) ||
          r.road_name.toLowerCase().includes(q) ||
          r.accident_type.toLowerCase().includes(q) ||
          r.possible_cause.toLowerCase().includes(q)
        );
      });
    }

    AppState.filtered = list;
    return list;
  }

  function resetFilters() {
    Object.keys(AppState.filters).forEach(k => AppState.filters[k] = '');
    AppState.searchQuery = '';
    AppState.table.page = 1;
    return applyFilters();
  }

  function uniqueValues(field) {
    return Array.from(new Set(AppState.raw.map(r => r[field]).filter(Boolean))).sort();
  }

  function roadsForCity(city) {
    const src = city ? AppState.raw.filter(r => r.city === city) : AppState.raw;
    return Array.from(new Set(src.map(r => r.road_name))).sort();
  }

  return {
    init, loadFromFile, applyFilters, resetFilters, uniqueValues, roadsForCity,
  };
})();
