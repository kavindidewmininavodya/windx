// Mini Antigravity - Core Logic & Professional Utilities
const editor = document.getElementById("mini-editor");
const chat = document.getElementById("mini-chat");
const input = document.getElementById("mini-input");
const sendBtn = document.getElementById("mini-send");
const statusTag = document.getElementById("status-bar");
const langTag = document.getElementById("lang-tag");
const clearEditorBtn = document.getElementById("clear-editor");
const clearChatBtn = document.getElementById("clear-chat");

let isProcessing = false;
let lastPrompt = "";

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

// Editor: Sync & Language Detection
function updateEditor() {
  const code = editor.innerText;
  if (typeof hljs !== 'undefined' && code.trim()) {
    const result = hljs.highlightAuto(code);
    const lang = (result.language || "text").toUpperCase();
    langTag.textContent = lang;
  } else {
    langTag.textContent = "PLAIN";
  }
}

editor.addEventListener("input", updateEditor);

// Workspace Utilities
clearEditorBtn?.addEventListener("click", () => {
  editor.innerText = "";
  updateEditor();
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

clearChatBtn?.addEventListener("click", () => {
  chat.innerHTML = `<div class="msg assistant"><div class="msg-content">Workspace cleared. Ready for your next request.</div></div>`;
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

// AI Analysis Loop
async function handleSend() {
  const userText = input.value.trim();
  const codeContext = editor.innerText.trim();
  
  if (isProcessing || (!userText && !codeContext)) return;
  
  lastPrompt = userText;
  input.value = "";
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
          } catch (e) {}
        }
      }
    }
    enhanceCodeBlocks(assistantMsg.parentElement);
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
  if (!codeContext) return userText;
  return `Code Context:\n\`\`\`\n${codeContext}\n\`\`\`\n\nRequest: ${userText || "Analyze this code."}`;
}

sendBtn.addEventListener("click", handleSend);
input.addEventListener("keydown", (e) => { if (e.key === "Enter") handleSend(); });

// Initialization
updateEditor();
