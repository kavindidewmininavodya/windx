function extractStackTraceInfo(text) {
  const result = {
    detected: false,
    exceptionType: "",
    focusLine: null,
    frame: ""
  };

  const patterns = [
    /([A-Za-z0-9_.]*Exception|Error):?\s.*?\n\s*at\s+([\w$.<>]+)\(([^:()]+):(\d+)\)/m,
    /(TypeError|ReferenceError|RangeError|SyntaxError|NullPointerException):?\s.*?\n\s*at\s+.*?\(([^:()]+):(\d+):(\d+)\)/m,
    /Traceback \(most recent call last\):[\s\S]*?File\s+"([^"]+)",\s+line\s+(\d+)[\s\S]*?([A-Za-z_]+Error):\s*(.*)/m
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (!match) continue;

    result.detected = true;

    if (/Traceback/.test(match[0])) {
      result.frame = match[1] || "";
      result.focusLine = Number(match[2]) || null;
      result.exceptionType = match[3] || "RuntimeError";
    } else if (match.length >= 5 && Number.isFinite(Number(match[4]))) {
      result.exceptionType = match[1] || "Exception";
      result.frame = `${match[2]} (${match[3]})`;
      result.focusLine = Number(match[4]);
    } else {
      result.exceptionType = match[1] || "Error";
      result.frame = match[2] || "";
      result.focusLine = Number(match[3]) || null;
    }
    break;
  }

  return result;
}

function detectRootCause({ combined, exceptionType, focusLine, frame }) {
  const source = `${combined || ""}\n${exceptionType || ""}\n${frame || ""}`.toLowerCase();
  const hasFirebaseAuth = /firebaseauth|firebase\s*auth|firebase\.auth|getinstance\(\)/i.test(source);

  const cases = [
    {
      test: /nullpointerexception|cannot read properties of undefined|nullreference|undefined is not an object/.test(source),
      rootCause: hasFirebaseAuth
        ? `Object was used before initialization at/near line ${focusLine || "?"}: FirebaseAuth likely not initialized before access.`
        : `Object reference is null/undefined at/near line ${focusLine || "?"}, likely due to missing initialization or failed lookup.`,
      confidence: hasFirebaseAuth ? 93 : 89,
      suggestions: hasFirebaseAuth
        ? [
            "Initialize FirebaseAuth before any access and guard against null on startup.",
            "Move auth-dependent calls after app initialization callback completes.",
            "Add explicit null checks and fallback flow before using current user/session."
          ]
        : [
            "Initialize the object before first use and verify constructor path runs.",
            "Add a guard clause (`if (!obj)`) before property/method access.",
            "Trace assignment path to ensure async data has resolved before use."
          ]
    },
    {
      test: /indexoutofboundsexception|arrayindexoutofboundsexception|rangeerror|out of range/.test(source),
      rootCause: `Index exceeds collection bounds near line ${focusLine || "?"}; loop limit or input validation is missing.`,
      confidence: 88,
      suggestions: [
        "Validate index boundaries before access.",
        "Adjust loop condition to strict bounds (e.g., `i < length`).",
        "Add test cases for empty and single-item collections."
      ]
    },
    {
      test: /syntaxerror|unexpected token|invalid syntax/.test(source),
      rootCause: `Invalid syntax near line ${focusLine || "?"}; parser failed before runtime execution.`,
      confidence: 95,
      suggestions: [
        "Inspect the reported line and preceding line for missing commas/brackets/quotes.",
        "Run formatter/linter to auto-fix malformed syntax.",
        "Validate transpilation target and language level settings."
      ]
    },
    {
      test: /timeout|timed out|networkerror|failed to fetch|connectexception|econnrefused/.test(source),
      rootCause: "Upstream call failed due to network timeout/refusal, likely endpoint availability or connectivity issue.",
      confidence: 84,
      suggestions: [
        "Verify endpoint host/port and service health before retrying.",
        "Add retry with exponential backoff for transient failures.",
        "Increase timeout threshold and add circuit-breaker style fallback."
      ]
    }
  ];

  const hit = cases.find((entry) => entry.test);
  if (hit) {
    return {
      rootCause: hit.rootCause,
      confidence: hit.confidence,
      suggestions: hit.suggestions
    };
  }

  return {
    rootCause: `Most likely runtime-state mismatch near ${focusLine ? `line ${focusLine}` : "the reported frame"}; data flow or initialization order should be validated.`,
    confidence: 72,
    suggestions: [
      "Inspect variable state just before the failing frame using logs or debugger.",
      "Validate initialization order for dependencies and async calls.",
      "Add narrow unit tests around the failing branch with representative inputs."
    ]
  };
}

function buildSmartDebugContext(userText, codeContext) {
  const combined = `${userText || ""}\n${codeContext || ""}`.trim();
  if (!combined) return "";

  const stack = extractStackTraceInfo(combined);
  const debugIntent = /debug|stack\s*trace|exception|error|crash|fix|root\s*cause|nullpointer|typeerror/i.test(userText || "");
  if (!stack.detected && !debugIntent) return "";

  const diagnosis = detectRootCause({
    combined,
    exceptionType: stack.exceptionType,
    focusLine: stack.focusLine,
    frame: stack.frame
  });

  const traceLine = stack.detected
    ? `Detected ${stack.exceptionType || "exception"}${stack.focusLine ? ` at line ${stack.focusLine}` : ""}${stack.frame ? ` in ${stack.frame}` : ""}.`
    : "No strict stack trace pattern detected; infer from available error signals.";

  return [
    "Smart Debug Signals:",
    `- Stack Trace Analyzer: ${traceLine}`,
    `- Auto Root Cause Detection: ${diagnosis.rootCause}`,
    `- Confidence Level: ${diagnosis.confidence}%`,
    "- Fix Suggestions:",
    ...diagnosis.suggestions.map((s, i) => `  ${i + 1}. ${s}`),
    "",
    "When replying, keep this structure:",
    "1) Stack Trace Analysis",
    "2) Most Likely Root Cause",
    "3) Fix Suggestions with confidence percentages"
  ].join("\n");
}

const SmartDebug = {
  extractStackTraceInfo,
  detectRootCause,
  buildSmartDebugContext
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = SmartDebug;
}

if (typeof window !== "undefined") {
  window.SmartDebug = SmartDebug;
}
