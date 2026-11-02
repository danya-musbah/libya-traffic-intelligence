/* ==========================================================================
   analytics.js — all derived statistics computed from a record list.
   Every function takes a `records` array so it works identically on the
   full dataset or a filtered subset.
   ========================================================================== */

const Analytics = (() => {

  function calculateKPIs(records) {
    const total = records.length;
    const severeCritical = records.filter(r => r.severity === 'Severe' || r.severity === 'Critical').length;
    const injuries = records.reduce((s, r) => s + r.number_of_injuries, 0);
    const fatalities = records.reduce((s, r) => s + r.number_of_fatalities, 0);
    const closures = records.filter(r => r.road_closed === 1).length;
    const responseTimes = records.map(r => r.emergency_response_minutes).filter(v => v > 0);
    const avgResponse = responseTimes.length
      ? (responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
      : 0;
    return {
      total, severeCritical, injuries, fatalities, closures,
      avgResponse: Math.round(avgResponse * 10) / 10,
    };
  }

  function countBy(records, field) {
    const map = Object.create(null);
    records.forEach(r => { map[r[field]] = (map[r[field]] || 0) + 1; });
    return map;
  }

  function sortedEntries(map) {
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }

  function severityDistribution(records) {
    const order = ['Minor', 'Moderate', 'Severe', 'Critical'];
    const map = countBy(records, 'severity');
    return order.map(k => ({ label: k, value: map[k] || 0 }));
  }

  function riskDistribution(records) {
    const order = ['Low', 'Medium', 'High'];
    const map = countBy(records, 'risk_level');
    return order.map(k => ({ label: k, value: map[k] || 0 }));
  }

  function accidentTypeDistribution(records) {
    return sortedEntries(countBy(records, 'accident_type')).map(([label, value]) => ({ label, value }));
  }

  function cityDistribution(records) {
    return sortedEntries(countBy(records, 'city')).map(([label, value]) => ({ label, value }));
  }

  function causeDistribution(records) {
    return sortedEntries(countBy(records, 'possible_cause')).map(([label, value]) => ({ label, value }));
  }

  function weatherDistribution(records) {
    return sortedEntries(countBy(records, 'weather')).map(([label, value]) => ({ label, value }));
  }

  function roadConditionDistribution(records) {
    const order = ['Good', 'Fair', 'Poor', 'Very Poor'];
    const map = countBy(records, 'road_condition');
    return order.map(k => ({ label: k, value: map[k] || 0 }));
  }

  function hourlyDistribution(records) {
    const buckets = new Array(24).fill(0);
    records.forEach(r => { buckets[r.hour] = (buckets[r.hour] || 0) + 1; });
    return buckets.map((value, hour) => ({ label: hour, value }));
  }

  function monthlyTrend(records) {
    // group by year-month for a real chronological trend line
    const map = Object.create(null);
    records.forEach(r => {
      const key = `${r.year}-${String(Utils.monthIndex(r.month) + 1).padStart(2, '0')}`;
      map[key] = (map[key] || 0) + 1;
    });
    return Object.entries(map)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([key, value]) => ({ label: key, value }));
  }

  function dayOfWeekDistribution(records) {
    const order = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
    const map = countBy(records, 'day_of_week');
    return order.map(k => ({ label: k.slice(0, 3), value: map[k] || 0 }));
  }

  function topRoads(records, n = 10) {
    return sortedEntries(countBy(records, 'road_name')).slice(0, n).map(([label, value]) => ({ label, value }));
  }

  // ---- Hotspots -------------------------------------------------------------

  function calculateHotspots(records, n = 10) {
    const byCity = Object.create(null);
    records.forEach(r => {
      if (!byCity[r.city]) byCity[r.city] = { city: r.city, count: 0, severe: 0, fatalities: 0, injuries: 0 };
      const c = byCity[r.city];
      c.count++;
      if (r.severity === 'Severe' || r.severity === 'Critical') c.severe++;
      c.fatalities += r.number_of_fatalities;
      c.injuries += r.number_of_injuries;
    });
    const list = Object.values(byCity).map(c => ({
      ...c,
      density: c.count,
      severityShare: c.count ? c.severe / c.count : 0,
    }));
    list.sort((a, b) => b.count - a.count);
    return list.slice(0, n);
  }

  function roadHotspots(records, n = 10) {
    const byRoad = Object.create(null);
    records.forEach(r => {
      const key = `${r.road_name} (${r.city})`;
      if (!byRoad[key]) byRoad[key] = { road: key, count: 0, severe: 0 };
      byRoad[key].count++;
      if (r.severity === 'Severe' || r.severity === 'Critical') byRoad[key].severe++;
    });
    return Object.values(byRoad).sort((a, b) => b.count - a.count).slice(0, n);
  }

  // ---- Risk scoring (transparent, rule-based) --------------------------------

  /**
   * Computes a transparent 0-100 risk score for a set of records using
   * weighted factors. This mirrors the logic used in prediction.js so the
   * whole app expresses risk consistently. NOT a validated safety model —
   * a clearly-labelled demonstration heuristic.
   */
  function calculateRiskScore(records) {
    if (!records.length) return { score: null, level: null, factors: [] };

    const total = records.length;
    const severeCriticalShare = records.filter(r => r.severity === 'Severe' || r.severity === 'Critical').length / total;
    const fatalitiesPer100 = (records.reduce((s, r) => s + r.number_of_fatalities, 0) / total) * 100;
    const poorRoadShare = records.filter(r => r.road_condition === 'Poor' || r.road_condition === 'Very Poor').length / total;
    const heavyTrafficShare = records.filter(r => r.traffic_level === 'High' || r.traffic_level === 'Very High').length / total;
    const nightShare = records.filter(r => r.lighting_condition === 'Dark' || r.lighting_condition === 'Low Visibility').length / total;
    const badWeatherShare = records.filter(r => ['Rain', 'Dust Storm', 'Fog'].includes(r.weather)).length / total;
    const rushShare = records.filter(r => r.is_rush_hour === 1).length / total;

    const factors = [
      { label: 'Severe & critical share', weight: 28, value: severeCriticalShare },
      { label: 'Fatalities per 100 accidents', weight: 18, value: Math.min(fatalitiesPer100 / 15, 1) },
      { label: 'Poor road conditions', weight: 16, value: poorRoadShare },
      { label: 'Heavy traffic concentration', weight: 14, value: heavyTrafficShare },
      { label: 'Night-time / low-visibility', weight: 12, value: nightShare },
      { label: 'Adverse weather', weight: 7, value: badWeatherShare },
      { label: 'Rush-hour concentration', weight: 5, value: rushShare },
    ];

    const rawScore = factors.reduce((s, f) => s + f.weight * f.value, 0);
    const score = Math.round(Math.max(0, Math.min(100, rawScore)));
    const level = score >= 67 ? 'High' : score >= 34 ? 'Medium' : 'Low';

    return { score, level, factors };
  }

  // ---- Automated insight generation -----------------------------------------

  function generateInsights(records) {
    if (!records.length) return ['No records match the current filters — try widening your filter selection.'];
    const insights = [];
    const total = records.length;

    const hourly = hourlyDistribution(records);
    const peakHour = hourly.reduce((max, cur) => (cur.value > max.value ? cur : max), hourly[0]);
    const eveningShare = records.filter(r => r.hour >= 17 && r.hour <= 21).length / total;
    if (peakHour.value > 0) {
      insights.push(`Accidents peak around <strong>${peakHour.label}:00</strong>, accounting for ${Utils.pct(peakHour.value, total)} of records in the current selection.`);
    }
    if (eveningShare > 0.28) {
      insights.push(`Evening hours (17:00–21:00) concentrate <strong>${Utils.pct(eveningShare * total, total)}</strong> of accidents, well above an even hourly spread.`);
    }

    const cities = cityDistribution(records);
    if (cities.length) {
      insights.push(`<strong>${Utils.escapeHTML(cities[0].label)}</strong> has the highest number of recorded synthetic accidents in the current dataset, with ${Utils.numberFormat(cities[0].value)} records (${Utils.pct(cities[0].value, total)}).`);
    }

    const causes = causeDistribution(records);
    if (causes.length) {
      insights.push(`<strong>${Utils.escapeHTML(causes[0].label)}</strong> is the most frequently reported synthetic cause, linked to ${Utils.pct(causes[0].value, total)} of accidents in view.`);
    }

    const sevDist = severityDistribution(records);
    const severeCritical = sevDist.find(s => s.label === 'Severe').value + sevDist.find(s => s.label === 'Critical').value;
    const fatalitiesInSC = records.filter(r => (r.severity === 'Severe' || r.severity === 'Critical')).reduce((s, r) => s + r.number_of_fatalities, 0);
    const fatalitiesTotal = records.reduce((s, r) => s + r.number_of_fatalities, 0);
    if (fatalitiesTotal > 0) {
      insights.push(`Severe and Critical accidents make up <strong>${Utils.pct(severeCritical, total)}</strong> of all incidents but account for ${Utils.pct(fatalitiesInSC, fatalitiesTotal)} of recorded fatalities.`);
    }

    const weekendShare = records.filter(r => r.is_weekend === 1).length / total;
    insights.push(`Weekend days (Fri–Sat) represent <strong>${Utils.pct(weekendShare * total, total)}</strong> of accidents in the current selection.`);

    const poorRoad = records.filter(r => r.road_condition === 'Poor' || r.road_condition === 'Very Poor').length;
    if (poorRoad / total > 0.2) {
      insights.push(`<strong>${Utils.pct(poorRoad, total)}</strong> of accidents in view occurred on roads rated Poor or Very Poor condition.`);
    }

    const closures = records.filter(r => r.road_closed === 1).length;
    if (closures > 0) {
      const severeCriticalClosures = records.filter(r =>
        r.road_closed === 1 && (r.severity === 'Severe' || r.severity === 'Critical')).length;
      insights.push(
        `Road closures followed <strong>${Utils.pct(closures, total)}</strong> of accidents. ` +
        `${Utils.pct(severeCriticalClosures, closures)} of closed-road records involved Severe or Critical accidents.`
      );
    }

    return insights;
  }

  return {
    calculateKPIs, severityDistribution, riskDistribution, accidentTypeDistribution,
    cityDistribution, causeDistribution, weatherDistribution, roadConditionDistribution,
    hourlyDistribution, monthlyTrend, dayOfWeekDistribution, topRoads,
    calculateHotspots, roadHotspots, calculateRiskScore, generateInsights, countBy, sortedEntries,
  };
})();
