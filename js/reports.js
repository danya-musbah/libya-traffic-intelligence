/* ==========================================================================
   reports.js — builds a report summary from a chosen sub-selection of the
   dataset and supports CSV export + browser print (no PDF library).
   ========================================================================== */

const ReportsModule = (() => {

  function filterForReport(records, opts) {
    if (opts.dateFrom && !isValidDate(opts.dateFrom)) {
      throw new RangeError('The report start date is invalid.');
    }
    if (opts.dateTo && !isValidDate(opts.dateTo)) {
      throw new RangeError('The report end date is invalid.');
    }
    if (opts.dateFrom && opts.dateTo && opts.dateFrom > opts.dateTo) {
      throw new RangeError('The report end date must be on or after the start date.');
    }
    return records.filter(r => {
      if (opts.dateFrom && r.date < opts.dateFrom) return false;
      if (opts.dateTo && r.date > opts.dateTo) return false;
      if (opts.city && r.city !== opts.city) return false;
      if (opts.severity && r.severity !== opts.severity) return false;
      if (opts.accidentType && r.accident_type !== opts.accidentType) return false;
      return true;
    });
  }

  function buildReport(records, opts) {
    const scoped = filterForReport(records, opts);
    const kpis = Analytics.calculateKPIs(scoped);
    const causes = Analytics.causeDistribution(scoped).slice(0, 5);
    const roads = Analytics.topRoads(scoped, 5);
    const cities = Analytics.cityDistribution(scoped).slice(0, 5);
    const riskDist = Analytics.riskDistribution(scoped);
    const insights = Analytics.generateInsights(scoped);
    return { scoped, kpis, causes, roads, cities, riskDist, insights, opts };
  }

  function toCSV(records) {
    if (!records.length) return '';
    const header = Object.keys(records[0]).filter(k => k !== 'hour');
    const lines = [header.join(',')];
    records.forEach(r => {
      lines.push(header.map(h => {
        const v = r[h] === undefined || r[h] === null ? '' : String(r[h]);
        const isNegativeNumber = /^-\d+(?:\.\d+)?$/.test(v);
        const safeValue = /^[\t\r ]*[=+\-@]/.test(v) && !isNegativeNumber ? "'" + v : v;
        return /[",\r\n]/.test(safeValue) ? `"${safeValue.replace(/"/g, '""')}"` : safeValue;
      }).join(','));
    });
    return lines.join('\n');
  }

  function downloadCSV(records, filename = 'libya-traffic-report.csv') {
    const csv = toCSV(records);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function isValidDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(`${value}T00:00:00Z`);
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }

  function printReport() {
    window.print();
  }

  return { buildReport, toCSV, downloadCSV, printReport, filterForReport };
})();
