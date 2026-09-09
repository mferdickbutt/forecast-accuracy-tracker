(function () {
  "use strict";

  var DATA_URL = "./data/forecast.json";

  function $(id) {
    return document.getElementById(id);
  }

  function formatPct(value) {
    if (value === null || value === undefined) return "n/a";
    var sign = value > 0 ? "+" : "";
    return sign + (value * 100).toFixed(2) + "%";
  }

  function formatUnsignedPct(value) {
    if (value === null || value === undefined) return "n/a";
    return (value * 100).toFixed(2) + "%";
  }

  function formatNum(value) {
    return Number(value).toLocaleString("en-US");
  }

  function errorClass(error) {
    if (error > 0) return "over";
    if (error < 0) return "under";
    return "";
  }

  function cellPct(value, signed) {
    if (value === null) return '<td class="na">n/a</td>';
    var text = signed ? formatPct(value) : formatUnsignedPct(value);
    return "<td>" + text + "</td>";
  }

  function render(records) {
    var result = ForecastAccuracy.evaluate(records);
    var summary = result.summary;

    $("mape").textContent = formatUnsignedPct(summary.mape);
    $("wape").textContent = formatUnsignedPct(summary.wape);
    $("bias").textContent = formatPct(summary.bias);
    $("n-months").textContent = String(summary.count);

    $("status").textContent =
      summary.count +
      " months loaded · MAPE uses " +
      summary.mapeN +
      " non-zero actuals";

    var body = result.rows
      .map(function (row) {
        return (
          "<tr>" +
          "<td>" +
          row.month +
          "</td>" +
          "<td>" +
          formatNum(row.forecast) +
          "</td>" +
          "<td>" +
          formatNum(row.actual) +
          "</td>" +
          '<td class="' +
          errorClass(row.error) +
          '">' +
          (row.error > 0 ? "+" : "") +
          formatNum(row.error) +
          "</td>" +
          cellPct(row.ape, false) +
          cellPct(row.signedPctError, true) +
          "</tr>"
        );
      })
      .join("");

    $("rows").innerHTML = body;
  }

  function fail(message) {
    var el = $("status");
    el.className = "status error";
    el.textContent = message;
  }

  fetch(DATA_URL)
    .then(function (res) {
      if (!res.ok) throw new Error("Could not load " + DATA_URL + " (" + res.status + ")");
      return res.json();
    })
    .then(render)
    .catch(function (err) {
      fail(
        err.message +
          ". Serve this folder over HTTP (for example: python3 -m http.server) rather than opening the file directly."
      );
    });
})();
