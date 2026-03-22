const test = require("node:test");
const assert = require("node:assert/strict");

const {
  extractStackTraceInfo,
  detectRootCause,
  buildSmartDebugContext
} = require("../smart-debug");

test("extractStackTraceInfo parses JS/Java style stack traces", () => {
  const input = [
    "NullPointerException: Attempt to invoke virtual method",
    "    at com.example.AuthService.login(AuthService.java:42)",
    "    at com.example.MainActivity.onCreate(MainActivity.java:21)"
  ].join("\n");

  const result = extractStackTraceInfo(input);
  assert.equal(result.detected, true);
  assert.equal(result.exceptionType, "NullPointerException");
  assert.equal(result.focusLine, 42);
  assert.match(result.frame, /AuthService\.login/);
});

test("extractStackTraceInfo parses Python traceback", () => {
  const input = [
    "Traceback (most recent call last):",
    "  File \"app.py\", line 18, in <module>",
    "    run()",
    "TypeError: unsupported operand type(s)"
  ].join("\n");

  const result = extractStackTraceInfo(input);
  assert.equal(result.detected, true);
  assert.equal(result.exceptionType, "TypeError");
  assert.equal(result.focusLine, 18);
  assert.equal(result.frame, "app.py");
});

test("detectRootCause returns Firebase initialization hint for null pointer", () => {
  const diagnosis = detectRootCause({
    combined: "NullPointerException FirebaseAuth.getInstance() used before init",
    exceptionType: "NullPointerException",
    focusLine: 42,
    frame: "AuthService.login"
  });

  assert.match(diagnosis.rootCause, /FirebaseAuth likely not initialized/i);
  assert.ok(diagnosis.confidence >= 90);
  assert.equal(Array.isArray(diagnosis.suggestions), true);
  assert.ok(diagnosis.suggestions.length >= 3);
});

test("detectRootCause provides fallback for unknown issues", () => {
  const diagnosis = detectRootCause({
    combined: "Some uncommon failure signature",
    exceptionType: "CustomError",
    focusLine: 77,
    frame: "CustomWorker.run"
  });

  assert.equal(diagnosis.confidence, 72);
  assert.match(diagnosis.rootCause, /line 77/);
});

test("buildSmartDebugContext returns structured debug section", () => {
  const userText = "Please debug this stack trace";
  const codeContext = [
    "NullPointerException: x was null",
    "  at com.sample.App.main(App.java:42)"
  ].join("\n");

  const out = buildSmartDebugContext(userText, codeContext);
  assert.match(out, /Smart Debug Signals:/);
  assert.match(out, /Stack Trace Analyzer:/);
  assert.match(out, /Auto Root Cause Detection:/);
  assert.match(out, /Confidence Level:/);
});

test("buildSmartDebugContext stays empty when no debug intent and no trace", () => {
  const out = buildSmartDebugContext("optimize this code", "const x = 1;");
  assert.equal(out, "");
});
