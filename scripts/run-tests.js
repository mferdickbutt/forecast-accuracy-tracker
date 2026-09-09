"use strict";

var fs = require("fs");
var path = require("path");
var accuracy = require("../js/accuracy.js");

var passed = 0;
var failed = 0;
var EPS = 1e-12;

function nearlyEqual(a, b) {
  if (a === b) return true;
  if (a === null || b === null) return a === b;
  return Math.abs(a - b) <= EPS * Math.max(1, Math.abs(a), Math.abs(b));
}

function assert(name, condition, detail) {
  if (condition) {
    passed += 1;
    console.log("PASS  " + name);
  } else {
    failed += 1;
    console.log("FAIL  " + name + (detail ? " — " + detail : ""));
  }
}

function assertEq(name, actual, expected) {
  assert(
    name,
    nearlyEqual(actual, expected),
    "expected " + expected + ", got " + actual
  );
}

var perfect = [
  { month: "2024-01", forecast: 100, actual: 100 },
  { month: "2024-02", forecast: 250.5, actual: 250.5 },
  { month: "2024-03", forecast: 0, actual: 0 },
];

assertEq("perfect forecast MAPE is 0 (zero actual skipped)", accuracy.mape(perfect), 0);
assertEq("perfect forecast WAPE is 0", accuracy.wape(perfect), 0);
assertEq("perfect forecast bias is 0", accuracy.signedBias(perfect), 0);

var known = [
  { month: "2024-01", forecast: 110, actual: 100 },
  { month: "2024-02", forecast: 180, actual: 200 },
  { month: "2024-03", forecast: 330, actual: 300 },
];
// APE: 0.10, 0.10, 0.10 → MAPE = 0.10
// |err| sum = 10+20+30 = 60; |actual| sum = 600 → WAPE = 0.10
// signed %: 0.10, -0.10, 0.10 → bias = 0.10/3
assertEq("known fixture MAPE is 0.10", accuracy.mape(known), 0.1);
assertEq("known fixture WAPE is 0.10", accuracy.wape(known), 0.1);
assertEq("known fixture bias is 1/30", accuracy.signedBias(known), 0.1 / 3);

var withZero = [
  { month: "2024-01", forecast: 40, actual: 0 },
  { month: "2024-02", forecast: 110, actual: 100 },
];
assertEq("zero actual is skipped in MAPE", accuracy.mape(withZero), 0.1);
assertEq("zero actual still counts in WAPE numerator", accuracy.wape(withZero), 50 / 100);
assertEq("zero actual is skipped in bias", accuracy.signedBias(withZero), 0.1);
assert(
  "ape() returns null when actual is 0 (no throw)",
  accuracy.ape(40, 0) === null
);
assert(
  "signedPctError() returns null when actual is 0 (no throw)",
  accuracy.signedPctError(40, 0) === null
);

var allZero = [
  { month: "2024-01", forecast: 5, actual: 0 },
  { month: "2024-02", forecast: 0, actual: 0 },
];
assertEq("all-zero actuals: MAPE is null", accuracy.mape(allZero), null);
assertEq("all-zero actuals: WAPE is null", accuracy.wape(allZero), null);
assertEq("all-zero actuals: bias is null", accuracy.signedBias(allZero), null);

assertEq("empty series: MAPE is null", accuracy.mape([]), null);
assertEq("empty series: WAPE is null", accuracy.wape([]), null);
assertEq("empty series: bias is null", accuracy.signedBias([]), null);

var over = [
  { month: "2024-01", forecast: 120, actual: 100 },
  { month: "2024-02", forecast: 240, actual: 200 },
];
assertEq("20% over-forecast MAPE is 0.20", accuracy.mape(over), 0.2);
assertEq("20% over-forecast WAPE is 0.20", accuracy.wape(over), 0.2);
assertEq("20% over-forecast bias is +0.20", accuracy.signedBias(over), 0.2);

var under = [
  { month: "2024-01", forecast: 80, actual: 100 },
  { month: "2024-02", forecast: 160, actual: 200 },
];
assertEq("20% under-forecast bias is -0.20", accuracy.signedBias(under), -0.2);

var mixedScale = [
  { month: "2024-01", forecast: 150, actual: 100 },
  { month: "2024-02", forecast: 1000, actual: 1000 },
];
// MAPE = (0.5 + 0) / 2 = 0.25
// WAPE = 50 / 1100
assertEq("unweighted MAPE treats periods equally", accuracy.mape(mixedScale), 0.25);
assertEq("WAPE weights by |actual|", accuracy.wape(mixedScale), 50 / 1100);

var rows = accuracy.monthRows(withZero);
assertEq("monthRows length matches input", rows.length, 2);
assert(
  "monthRows marks APE n/a on zero actual",
  rows[0].ape === null && rows[0].signedPctError === null
);
assertEq("monthRows absError for zero actual is |forecast|", rows[0].absError, 40);

var dataPath = path.join(__dirname, "..", "data", "forecast.json");
var sample = JSON.parse(fs.readFileSync(dataPath, "utf8"));
assert("sample data has at least 12 months", sample.length >= 12, "got " + sample.length);
assert(
  "sample months are ISO YYYY-MM",
  sample.every(function (row) {
    return typeof row.month === "string" && /^\d{4}-\d{2}$/.test(row.month);
  })
);

var evaluated = accuracy.evaluate(sample);
assert(
  "sample evaluate yields finite MAPE/WAPE/bias",
  evaluated.summary.mape > 0 &&
    evaluated.summary.wape > 0 &&
    Number.isFinite(evaluated.summary.bias)
);
assertEq("evaluate.rows matches sample length", evaluated.rows.length, sample.length);

console.log("");
console.log("Summary: " + passed + " passed, " + failed + " failed");
if (failed > 0 || passed < 12) {
  process.exit(1);
}
