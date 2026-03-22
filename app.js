// Mini WindyX - Core Logic & Professional Utilities
const editor = document.getElementById("mini-editor");
const chat = document.getElementById("mini-chat");
const input = document.getElementById("mini-input");
const sendBtn = document.getElementById("mini-send");
const statusTag = document.getElementById("status-bar");
const langTag = document.getElementById("lang-tag");
const clearEditorBtn = document.getElementById("clear-editor");
const clearChatBtn = document.getElementById("clear-chat");
const editorActionsToggleBtn = document.getElementById("editor-actions-toggle");
const editorActionsPanel = document.getElementById("editor-actions-panel");

let isProcessing = false;
let lastPrompt = "";

function setEditorActionsOpen(isOpen) {
  if (!editorActionsPanel || !editorActionsToggleBtn) return;
  editorActionsPanel.classList.toggle("is-open", isOpen);
  editorActionsToggleBtn.classList.toggle("is-open", isOpen);
  editorActionsToggleBtn.setAttribute("aria-expanded", String(isOpen));
}

editorActionsToggleBtn?.addEventListener("click", () => {
  const isOpen = !editorActionsPanel?.classList.contains("is-open");
  setEditorActionsOpen(isOpen);
});

setEditorActionsOpen(false);

// Initialize Markdown (Marked.js)
if (typeof marked !== 'undefined') {
  marked.setOptions({
    breaks: true,
    gfm: true,
    highlight: (code, lang) => {
      if (typeof hljs !== 'undefined' && lang && hljs.getLanguage(lang)) {
        return hljs.highlight(code, { language: lang }).value;
      }
      return code;
    }
  });
}

if (typeof mermaid !== "undefined") {
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: "loose",
    theme: "dark"
  });
}

// Local Storage Keys
const STORAGE_KEY_CODE = "mini_anti_code";
const STORAGE_KEY_CHAT = "mini_anti_chat";

// Editor: Sync & Detection
function updateEditor() {
  const code = editor.innerText;
  localStorage.setItem(STORAGE_KEY_CODE, code);

  if (typeof hljs !== 'undefined' && code.trim()) {
    // We still run detection for internal use if needed, 
    // but the UI elements are removed.
    hljs.highlightAuto(code);
  }
}

editor.addEventListener("input", updateEditor);

// Persistence: Restore State
function restoreState() {
  const savedCode = localStorage.getItem(STORAGE_KEY_CODE);
  const savedChat = localStorage.getItem(STORAGE_KEY_CHAT);

  if (savedCode) {
    editor.innerText = savedCode;
    updateEditor();
  }

  if (savedChat) {
    chat.innerHTML = savedChat;
    // Re-attach listeners for any restored AI action buttons if they existed
    // Since we store innerHTML, we need to re-enhance code blocks
    chat.querySelectorAll('.msg.assistant').forEach(msg => {
      renderMermaidInMessage(msg);
      enhanceCodeBlocks(msg);
    });
  }
}

// Workspace Utilities
async function showCenteredClearDialog(title, text) {
  if (typeof Swal === "undefined") {
    return { isConfirmed: confirm(title) };
  }

  return Swal.fire({
    toast: true,
    position: "center",
    title,
    text,
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Yes, clear it",
    cancelButtonText: "Cancel",
    reverseButtons: true,
    width: 370,
    timer: 7000,
    timerProgressBar: true,
    showCloseButton: true,
    background: "#12171f",
    color: "#e9f1ff",
    confirmButtonColor: "#ff5a5f",
    cancelButtonColor: "#2a3546"
  });
}

function showCenteredSuccess(title, text) {
  if (typeof Swal === "undefined") return;

  Swal.fire({
    toast: true,
    position: "center",
    title,
    text,
    icon: "success",
    width: 300,
    timer: 1500,
    timerProgressBar: true,
    showConfirmButton: false,
    background: "#12171f",
    color: "#e9f1ff"
  });
}

clearEditorBtn?.addEventListener("click", async () => {
  const result = await showCenteredClearDialog(
    "Clear editor content?",
    "This will remove your current code from the editor."
  );
  if (!result.isConfirmed) return;

  editor.innerText = "";
  localStorage.removeItem(STORAGE_KEY_CODE);
  updateEditor();
  showCenteredSuccess("Cleared", "Editor content has been removed.");
});

document.getElementById("copy-editor")?.addEventListener("click", () => {
  navigator.clipboard.writeText(editor.innerText);
  const btn = document.getElementById("copy-editor");
  const oldText = btn.textContent;
  btn.textContent = "COPIED!";
  btn.style.color = "#00ff88";
  setTimeout(() => {
    btn.textContent = oldText;
    btn.style.color = "";
  }, 2000);
});

document.getElementById("export-chat")?.addEventListener("click", () => {
  let markdown = "# WINDYX ANALYSIS DEBRIEF\n\n";
  const messages = chat.querySelectorAll('.msg');
  if (messages.length === 0) return alert("No messages to export.");

  messages.forEach(msg => {
    const role = msg.classList.contains('user') ? "USER" : "ASSISTANT";
    const contentEl = msg.querySelector('.msg-content');
    if (contentEl) {
      const content = contentEl.innerText.trim();
      markdown += `### ${role}\n${content}\n\n---\n\n`;
    }
  });

  try {
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `antigravity_report_${new Date().toISOString().slice(0, 10)}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (err) {
    alert("Export failed.");
  }
});

// AI Power Actions Logic
const triggerAction = (actionPrompt, actionName) => {
  if (isProcessing) return;
  input.value = actionName;
  handleSend(actionPrompt);
};

document.getElementById("ai-analyze")?.addEventListener("click", () => {
  triggerAction("Perform a deep technical analysis of this code. Explain the execution flow, identify potential edge cases, and list any possible security or performance risks.", "Deep Analysis ⚡");
});

document.getElementById("ai-debug")?.addEventListener("click", () => {
  triggerAction("Run smart debugging on this code and trace. Analyze stack trace, detect the most likely root cause, and provide fix suggestions with confidence level.", "Smart Debugging 🛠️");
});

document.getElementById("ai-test")?.addEventListener("click", () => {
  triggerAction("Generate a comprehensive unit test suite for this code using standard testing practices (like Jest). Include edge cases and mock data where necessary.", "Test Generation 🧪");
});

document.getElementById("ai-optimize")?.addEventListener("click", () => {
  triggerAction("Optimize this code for maximum performance, readability, and clean-coding standards. Provide the refactored version and explain the improvements made.", "Code Optimization 🚀");
});

document.getElementById("ai-flow")?.addEventListener("click", () => {
  triggerAction(
    "Visual Architecture Generator: Create a clear flow diagram from this code. Return ONE valid Mermaid flowchart inside a ```mermaid``` block first, then a short explanation. Keep labels simple and quoted when needed.",
    "Flow Diagram"
  );
});

document.getElementById("ai-architecture")?.addEventListener("click", () => {
  triggerAction(
    "Visual Architecture Generator: Create a system architecture diagram from this code/services. Return ONE valid Mermaid diagram in a ```mermaid``` block first, then key components and data paths. Use simple IDs and quoted labels.",
    "System Architecture"
  );
});

clearChatBtn?.addEventListener("click", async () => {
  const result = await showCenteredClearDialog(
    "Clear all chat history?",
    "This will remove the current conversation."
  );

  if (!result.isConfirmed) return;

  chat.innerHTML = `<div class="msg assistant"><div class="msg-content">Workspace cleared. Ready for your next request.</div></div>`;
  localStorage.removeItem(STORAGE_KEY_CHAT);
  showCenteredSuccess("Cleared", "Chat history has been removed.");
});

// Assistant Message Component
function appendMessage(role, text) {
  const msg = document.createElement("div");
  msg.className = `msg ${role}`;

  const content = document.createElement("div");
  content.className = "msg-content";

  if (role === "assistant" && typeof marked !== 'undefined' && text) {
    content.innerHTML = marked.parse(text);
  } else {
    content.textContent = text;
  }

  msg.appendChild(content);

  // Assistant-only Actions (Copy Message, Share, Rewrite)
  if (role === "assistant") {
    const actions = document.createElement("div");
    actions.className = "msg-actions";

    actions.innerHTML = `
      <button class="action-icon" data-action="copy">Copy</button>
      <button class="action-icon" data-action="share">Share</button>
      <button class="action-icon" data-action="rewrite">Rewrite</button>
    `;

    actions.querySelector('[data-action="copy"]').onclick = (e) => {
      navigator.clipboard.writeText(text);
      e.target.textContent = "Copied!";
      setTimeout(() => e.target.textContent = "Copy", 2000);
    };

    actions.querySelector('[data-action="share"]').onclick = () => {
      const blob = new Blob([text], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'antigravity-analysis.txt';
      a.click();
    };

    actions.querySelector('[data-action="rewrite"]').onclick = () => {
      if (lastPrompt) {
        input.value = lastPrompt;
        handleSend();
      }
    };

    msg.appendChild(actions);
  }

  chat.appendChild(msg);
  chat.scrollTop = chat.scrollHeight;
  localStorage.setItem(STORAGE_KEY_CHAT, chat.innerHTML);
  // Persist chat
  localStorage.setItem(STORAGE_KEY_CHAT, chat.innerHTML);

  // Enhance Code Blocks (Headers & Highlighting)
  if (role === "assistant") {
    enhanceCodeBlocks(msg);
  }

  return content;
}

// Re-runnable function to add Headers & Copy Buttons to any message
function enhanceCodeBlocks(msgElement) {
  if (typeof hljs === 'undefined') return;

  msgElement.querySelectorAll('pre').forEach(pre => {
    const code = pre.querySelector('code');
    if (code?.className?.includes("language-mermaid")) {
      return;
    }

    // Only wrap if not already wrapped
    if (code && !pre.parentElement.classList.contains('it-code-block')) {
      const lang = (code.className.replace('language-', '') || 'code').toUpperCase();
      hljs.highlightElement(code);

      const wrapper = document.createElement("div");
      wrapper.className = "it-code-block";

      wrapper.innerHTML = `
        <div class="it-code-header">
          <div class="it-code-info">
            <span class="it-code-icon"></span>
            <span class="it-code-lang">${lang}</span>
          </div>
          <button class="it-copy-btn" title="Copy Snippet"></button>
        </div>
      `;

      const copyBtn = wrapper.querySelector(".it-copy-btn");
      copyBtn.onclick = () => {
        navigator.clipboard.writeText(code.innerText);
        copyBtn.classList.add("copied");
        setTimeout(() => copyBtn.classList.remove("copied"), 2000);
      };

      pre.parentNode.insertBefore(wrapper, pre);
      wrapper.appendChild(pre);
    }
  });
}

function normalizeMermaidSource(raw) {
  return String(raw || "")
    .replace(/\r/g, "")
    .replace(/^\s*```\s*mermaid\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .replace(/^\s*mermaid\s*\n/i, "")
    .trim();
}

function looksLikeMermaid(text) {
  return /^(flowchart|graph|sequenceDiagram|classDiagram|erDiagram|stateDiagram|journey|gantt|pie|mindmap|timeline)\b/m.test(text.trim());
}

async function renderMermaidInMessage(msgElement) {
  if (typeof mermaid === "undefined") return;

  const strictBlocks = Array.from(msgElement.querySelectorAll("pre > code.language-mermaid, pre > code.lang-mermaid"));
  const inferredBlocks = Array.from(msgElement.querySelectorAll("pre > code")).filter((code) => {
    if (code.className?.includes("language-mermaid") || code.className?.includes("lang-mermaid")) return false;
    return looksLikeMermaid(code.textContent || "");
  });

  const mermaidBlocks = [...strictBlocks, ...inferredBlocks];
  if (!mermaidBlocks.length) return;

  for (const codeBlock of mermaidBlocks) {
    const pre = codeBlock.parentElement;
    if (!pre || pre.dataset.mermaidRendered === "true") continue;

    const source = normalizeMermaidSource(codeBlock.textContent);
    if (!source || !looksLikeMermaid(source)) continue;

    try {
      const diagramId = `mmd-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const { svg, bindFunctions } = await mermaid.render(diagramId, source);

      const wrapper = document.createElement("div");
      wrapper.className = "it-mermaid-block";

      const toolbar = document.createElement("div");
      toolbar.className = "it-mermaid-toolbar";

      const title = document.createElement("span");
      title.className = "it-mermaid-title";
      title.textContent = "Diagram";

      const downloadBtn = document.createElement("button");
      downloadBtn.className = "it-mermaid-download";
      downloadBtn.type = "button";
      downloadBtn.textContent = "⬇";
      downloadBtn.setAttribute("aria-label", "Download SVG");

      const svgHolder = document.createElement("div");
      svgHolder.className = "it-mermaid-svg";
      svgHolder.innerHTML = svg;

      downloadBtn.addEventListener("click", () => {
        const svgNode = svgHolder.querySelector("svg");
        if (!svgNode) return;

        const serializer = new XMLSerializer();
        const svgText = serializer.serializeToString(svgNode);
        const blob = new Blob([svgText], { type: "image/svg+xml;charset=utf-8" });
        const url = URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.href = url;
        a.download = `${diagramId}.svg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      });

      toolbar.appendChild(title);
      toolbar.appendChild(downloadBtn);
      wrapper.appendChild(toolbar);
      wrapper.appendChild(svgHolder);

      pre.parentNode.replaceChild(wrapper, pre);
      if (typeof bindFunctions === "function") {
        bindFunctions(wrapper);
      }
    } catch {
      // Keep the original code block visible if render fails.
      pre.dataset.mermaidRendered = "true";
      if (!pre.querySelector(".mermaid-error-note")) {
        const note = document.createElement("div");
        note.className = "mermaid-error-note";
        note.textContent = "Mermaid render skipped: syntax looks invalid. Keeping source for manual fix.";
        pre.appendChild(note);
      }
    }
  }
}

// AI Analysis Loop
async function handleSend(forcedPrompt = null) {
  const userText = forcedPrompt || input.value.trim();
  const codeContext = editor.innerText.trim();

  if (isProcessing || (!userText && !codeContext)) return;

  lastPrompt = userText;
  if (!forcedPrompt) input.value = "";
  isProcessing = true;
  sendBtn.disabled = true;
  statusTag.textContent = "DEEP_SCAN // ANALYZING";
  statusTag.className = "status-active";

  appendMessage("user", userText || "Analyzing provided code...");

  const assistantMsg = appendMessage("assistant", "");
  let fullResponse = "";

  try {
    const response = await fetch("/api/chat/stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: buildPrompt(userText, codeContext) })
    });

    if (!response.ok) throw new Error("Connection failed");

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const updates = buffer.split("\n\n");
      buffer = updates.pop() || "";

      for (const update of updates) {
        if (!update.trim()) continue;
        if (update.includes("event: done")) { isProcessing = false; continue; }

        const lines = update.split("\n");
        const dataLine = lines.find(l => l.startsWith("data:"));
        if (dataLine) {
          try {
            const payload = dataLine.replace("data:", "").trim();
            if (payload === "{}" || payload === "[DONE]") continue;

            const data = JSON.parse(payload);
            if (data.token) {
              fullResponse += data.token;
              assistantMsg.innerHTML = marked.parse(fullResponse);
              chat.scrollTop = chat.scrollHeight;
            }
          } catch (e) { }
        }
      }
    }
    await renderMermaidInMessage(assistantMsg.parentElement);
    enhanceCodeBlocks(assistantMsg.parentElement);
    localStorage.setItem(STORAGE_KEY_CHAT, chat.innerHTML);
  } catch (err) {
    assistantMsg.textContent = "System Error: " + err.message;
    statusTag.className = "status-error";
  } finally {
    isProcessing = false;
    sendBtn.disabled = false;
    statusTag.textContent = "RELIABLE // READY";
    statusTag.className = "status-neutral";
    input.focus();
  }
}

function buildPrompt(userText, codeContext) {
  const debugContext = buildSmartDebugContext(userText || "", codeContext || "");
  const requestText = userText || "Analyze this code.";

  if (!codeContext) {
    return [
      debugContext,
      `Request: ${requestText}`
    ].filter(Boolean).join("\n\n");
  }

  return [
    `Code Context:\n\`\`\`\n${codeContext}\n\`\`\``,
    debugContext,
    `Request: ${requestText}`
  ].filter(Boolean).join("\n\n");
}

function buildSmartDebugContext(userText, codeContext) {
  if (typeof window !== "undefined" && window.SmartDebug?.buildSmartDebugContext) {
    return window.SmartDebug.buildSmartDebugContext(userText, codeContext);
  }

  const combined = `${userText}\n${codeContext}`.trim();
  if (!combined) return "";

  const stack = extractStackTraceInfo(combined);
  const debugIntent = /debug|stack\s*trace|exception|error|crash|fix|root\s*cause|nullpointer|typeerror/i.test(userText);
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

function extractStackTraceInfo(text) {
  if (typeof window !== "undefined" && window.SmartDebug?.extractStackTraceInfo) {
    return window.SmartDebug.extractStackTraceInfo(text);
  }

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
  if (typeof window !== "undefined" && window.SmartDebug?.detectRootCause) {
    return window.SmartDebug.detectRootCause({ combined, exceptionType, focusLine, frame });
  }

  const source = `${combined}\n${exceptionType}\n${frame}`.toLowerCase();
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

  const hit = cases.find(c => c.test);
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

sendBtn.addEventListener("click", handleSend);
input.addEventListener("keydown", (e) => { if (e.key === "Enter") handleSend(); });

// API Pro Suite Logic
const apiTabs = document.querySelectorAll(".tab-btn");
const apiPanes = document.querySelectorAll(".tab-pane");

apiTabs.forEach(tab => {
  tab.addEventListener("click", () => {
    apiTabs.forEach(t => t.classList.remove("active"));
    apiPanes.forEach(p => p.classList.remove("active"));
    tab.classList.add("active");
    document.getElementById(`tab-${tab.dataset.tab}`).classList.add("active");
  });
});

// KV Editor Logic (Generic)
function addKvRow(containerId, keyPlaceholder, valPlaceholder) {
  const container = document.getElementById(containerId);
  const row = document.createElement("div");
  row.className = "kv-row";
  row.innerHTML = `
    <input type="text" placeholder="${keyPlaceholder}" class="kv-key">
    <input type="text" placeholder="${valPlaceholder}" class="kv-val">
    <button class="btn-icon">×</button>
  `;
  row.querySelector(".btn-icon").onclick = () => row.remove();
  container.appendChild(row);
}

document.getElementById("add-param")?.addEventListener("click", () => addKvRow("params-kv", "Parameter key", "Value"));
document.getElementById("add-header")?.addEventListener("click", () => addKvRow("headers-kv", "Header key", "Value"));

// Request Execution Pro
const runApiBtnPro = document.getElementById("run-api-pro");
const apiHistory = [];

runApiBtnPro?.addEventListener("click", async () => {
  const method = document.getElementById("api-method").value;
  let url = document.getElementById("api-url").value;
  const body = document.getElementById("api-body-pro").value;
  const authType = document.getElementById("auth-type").value;
  const authToken = document.getElementById("auth-token").value;
  const responseView = document.getElementById("api-response-pro");
  const metaBar = document.getElementById("response-meta");

  // 1. Compile Params
  const paramsRows = document.querySelectorAll("#params-kv .kv-row");
  const searchParams = new URLSearchParams();
  paramsRows.forEach(row => {
    const k = row.querySelector(".kv-key").value;
    const v = row.querySelector(".kv-val").value;
    if (k) searchParams.append(k, v);
  });
  const paramStr = searchParams.toString();
  if (paramStr) url += (url.includes("?") ? "&" : "?") + paramStr;

  // 2. Compile Headers
  const headersObj = {};
  const headerRows = document.querySelectorAll("#headers-kv .kv-row");
  headerRows.forEach(row => {
    const k = row.querySelector(".kv-key").value;
    const v = row.querySelector(".kv-val").value;
    if (k) headersObj[k] = v;
  });

  // 3. Auth
  if (authType === "bearer" && authToken) headersObj["Authorization"] = `Bearer ${authToken}`;
  if (authType === "basic" && authToken) headersObj["Authorization"] = `Basic ${btoa(authToken)}`;

  responseView.textContent = "Connecting to " + url + "...";
  metaBar.innerHTML = "";
  
  try {
    const options = { method, headers: headersObj };
    if (method !== 'GET' && body) options.body = body;

    const start = performance.now();
    const res = await fetch(url, options);
    const end = performance.now();
    const duration = (end - start).toFixed(0);

    const data = await res.json();
    const jsonStr = JSON.stringify(data, null, 2);
    
    metaBar.innerHTML = `
      <span>STATUS: <b style="color:#00ff88">${res.status}</b></span>
      <span>TIME: <b style="color:#00f2ff">${duration}ms</b></span>
      <span>SIZE: <b style="color:#94a3b8">${(jsonStr.length / 1024).toFixed(2)}KB</b></span>
    `;

    responseView.innerHTML = jsonStr;
    if (typeof hljs !== 'undefined') hljs.highlightElement(responseView);

    // Save to History
    saveToApiHistory(method, url, res.status);
  } catch (err) {
    responseView.innerHTML = `<div style="color:#ff3264">Diagnostic Failure: ${err.message}</div>`;
  }
});

function saveToApiHistory(method, url, status) {
  const historyList = document.getElementById("api-history-list");
  if (apiHistory.length === 0) historyList.innerHTML = "";
  
  const statusColor = status >= 200 && status < 300 ? "#00ff88" : "#ff3264";
  const item = { method, url: url.substring(0, 40) + "...", status, time: new Date().toLocaleTimeString() };
  apiHistory.unshift(item);
  
  const div = document.createElement("div");
  div.className = "history-item";
  div.style.cssText = "padding:12px; border-bottom:1px solid rgba(255,255,255,0.02); display:flex; justify-content:space-between; align-items:center; cursor:pointer; background:rgba(255,255,255,0.01); margin-bottom:4px; border-radius:8px;";
  div.innerHTML = `
    <div style="display:flex; flex-direction:column; gap:2px;">
      <span style="color:${statusColor}; font-weight:900; font-size:0.55rem;">${method}</span>
      <span style="color:#666; font-size:0.6rem; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; width:180px;">${item.url}</span>
    </div>
    <span style="color:${statusColor}; font-size:0.55rem; font-weight:800; border:1px solid ${statusColor}44; padding:2px 6px; border-radius:4px;">${status}</span>
  `;
  historyList.prepend(div);
}

// cURL Export
document.getElementById("copy-curl")?.addEventListener("click", () => {
  const url = document.getElementById("api-url").value;
  const method = document.getElementById("api-method").value;
  const curl = `curl -X ${method} "${url}" \\
  -H "Content-Type: application/json"`;
  navigator.clipboard.writeText(curl);
  const btn = document.getElementById("copy-curl");
  btn.textContent = "COPIED!";
  setTimeout(() => btn.textContent = "COPY AS cURL", 2000);
});

// Initialization
restoreState();
updateEditor();

// Update Time Diagnostic
setInterval(() => {
  document.getElementById("current-time-diag").textContent = `SYSTEM // ONLINE // ${new Date().toLocaleTimeString()}`;
}, 1000);
