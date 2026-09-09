/**
 * Forecast accuracy metrics.
 *
 * MAPE  = (1/n) * Σ |F_t − A_t| / |A_t|
 *         n = count of periods where A_t ≠ 0 (zero actuals are skipped)
 *
 * WAPE  = Σ |F_t − A_t| / Σ |A_t|
 *         all periods included; undefined when Σ |A_t| = 0
 *
 * bias  = (1/n) * Σ (F_t − A_t) / A_t
 *         mean signed percentage error (MPE); n same as MAPE
 *         positive ⇒ over-forecast on average
 *
 * Metrics that are undefined return null rather than Infinity/NaN.
 */
(function (global) {
  "use strict";

  function isFiniteNumber(value) {
    return typeof value === "number" && Number.isFinite(value);
  }

  function validateRecords(records) {
    if (!Array.isArray(records)) {
      throw new TypeError("records must be an array");
    }
    records.forEach(function (row, i) {
      if (!row || !isFiniteNumber(row.forecast) || !isFiniteNumber(row.actual)) {
        throw new TypeError("records[" + i + "] needs finite numeric forecast and actual");
      }
    });
  }

  function ape(forecast, actual) {
    if (actual === 0) return null;
    return Math.abs(forecast - actual) / Math.abs(actual);
  }

  function signedPctError(forecast, actual) {
    if (actual === 0) return null;
    return (forecast - actual) / actual;
  }

  function monthRows(records) {
    validateRecords(records);
    return records.map(function (row) {
      var error = row.forecast - row.actual;
      return {
        month: row.month,
        forecast: row.forecast,
        actual: row.actual,
        error: error,
        absError: Math.abs(error),
        ape: ape(row.forecast, row.actual),
        signedPctError: signedPctError(row.forecast, row.actual),
      };
    });
  }

  function mape(records) {
    validateRecords(records);
    var sum = 0;
    var n = 0;
    for (var i = 0; i < records.length; i++) {
      var value = ape(records[i].forecast, records[i].actual);
      if (value !== null) {
        sum += value;
        n += 1;
      }
    }
    return n === 0 ? null : sum / n;
  }

  function wape(records) {
    validateRecords(records);
    var sumAbsError = 0;
    var sumAbsActual = 0;
    for (var i = 0; i < records.length; i++) {
      sumAbsError += Math.abs(records[i].forecast - records[i].actual);
      sumAbsActual += Math.abs(records[i].actual);
    }
    return sumAbsActual === 0 ? null : sumAbsError / sumAbsActual;
  }

  function signedBias(records) {
    validateRecords(records);
    var sum = 0;
    var n = 0;
    for (var i = 0; i < records.length; i++) {
      var value = signedPctError(records[i].forecast, records[i].actual);
      if (value !== null) {
        sum += value;
        n += 1;
      }
    }
    return n === 0 ? null : sum / n;
  }

  function evaluate(records) {
    var rows = monthRows(records);
    var mapeN = 0;
    var sumAbsError = 0;
    var sumAbsActual = 0;
    for (var i = 0; i < rows.length; i++) {
      if (rows[i].ape !== null) mapeN += 1;
      sumAbsError += rows[i].absError;
      sumAbsActual += Math.abs(rows[i].actual);
    }
    return {
      rows: rows,
      summary: {
        count: records.length,
        mapeN: mapeN,
        mape: mape(records),
        wape: wape(records),
        bias: signedBias(records),
        sumAbsError: sumAbsError,
        sumAbsActual: sumAbsActual,
      },
    };
  }

  var api = {
    ape: ape,
    signedPctError: signedPctError,
    monthRows: monthRows,
    mape: mape,
    wape: wape,
    signedBias: signedBias,
    evaluate: evaluate,
  };

  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }
  global.ForecastAccuracy = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
