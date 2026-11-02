/* ==========================================================================
   prediction.js — a transparent, rule-based DEMONSTRATION prediction layer.

   This is explicitly NOT a trained machine-learning model. It exists to
   show how a prediction feature could be wired into the dashboard, and is
   structured so predictRisk(features) can later be swapped for a call to
   a real trained model (e.g. served via an API) without touching the UI
   code in app.js.
   ========================================================================== */

const PredictionModule = (() => {

  /**
   * predictRisk(features) -> { score, level, factors: [{label, weight, hit}] }
   * features: {
   *   city, roadType, hour (0-23), dayOfWeek, weather, roadCondition,
   *   trafficLevel, lighting
   * }
   */
  function predictRisk(features) {
    const factors = [];
    let score = 12; // baseline

    // Traffic level
    const trafficWeights = { Low: 0, Medium: 6, High: 14, 'Very High': 22 };
    const tw = trafficWeights[features.trafficLevel] ?? 0;
    score += tw;
    if (tw >= 14) factors.push({ label: 'High traffic level', weight: tw });

    // Road condition
    const roadWeights = { Good: 0, Fair: 5, Poor: 16, 'Very Poor': 24 };
    const rw = roadWeights[features.roadCondition] ?? 0;
    score += rw;
    if (rw >= 16) factors.push({ label: 'Poor road condition', weight: rw });

    // Lighting
    const lightingWeights = { Daylight: 0, 'Street Lights': 4, Dark: 16, 'Low Visibility': 20 };
    const lw = lightingWeights[features.lighting] ?? 0;
    score += lw;
    if (lw >= 16) factors.push({ label: 'Night-time / low-visibility conditions', weight: lw });

    // Weather
    const weatherWeights = { Clear: 0, Cloudy: 2, Windy: 4, Rain: 14, Fog: 16, 'Dust Storm': 18 };
    const ww = weatherWeights[features.weather] ?? 0;
    score += ww;
    if (ww >= 12) factors.push({ label: `Adverse weather (${features.weather})`, weight: ww });

    // Hour of day: rush hour and late night bumps
    const hour = Number(features.hour);
    const rushHours = [7, 8, 9, 13, 14, 15, 16, 19, 20, 21];
    const lateNight = hour >= 0 && hour <= 4;
    let hourBump = 0;
    if (rushHours.includes(hour)) hourBump = 10;
    else if (lateNight) hourBump = 8;
    score += hourBump;
    if (hourBump > 0) factors.push({ label: rushHours.includes(hour) ? 'Rush-hour traffic window' : 'Late-night driving window', weight: hourBump });

    // Day of week: weekend (Fri/Sat in Libya) slight bump
    if (['Friday', 'Saturday'].includes(features.dayOfWeek)) {
      score += 4;
      factors.push({ label: 'Weekend travel pattern', weight: 4 });
    }

    // Road type
    const roadTypeWeights = { Highway: 6, 'Ring Road': 5, Intersection: 8, 'Urban Street': 3, 'Rural Road': 5, 'Residential Street': 1 };
    const rtw = roadTypeWeights[features.roadType] ?? 0;
    score += rtw;
    if (rtw >= 6) factors.push({ label: `${features.roadType} risk profile`, weight: rtw });

    // City historical frequency (uses actual dataset if available)
    if (features.cityHistoricalShare) {
      const bump = Math.round(features.cityHistoricalShare * 20);
      score += bump;
      if (bump >= 6) factors.push({ label: 'Previous accident frequency in this city', weight: bump });
    }

    score = Math.max(0, Math.min(100, Math.round(score)));
    const level = score >= 67 ? 'High' : score >= 34 ? 'Medium' : 'Low';

    factors.sort((a, b) => b.weight - a.weight);

    return { score, level, factors: factors.slice(0, 5) };
  }

  return { predictRisk };
})();
