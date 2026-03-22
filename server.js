require("dotenv").config();

const express = require("express");
const path = require("path");
const cors = require("cors");

const app = express();
const port = Number(process.env.PORT || 3000);

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const PRIMARY_MODEL = process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini";
const FALLBACK_MODEL = process.env.OPENROUTER_FALLBACK_MODEL || "openai/gpt-4o-mini";
const APP_URL = process.env.APP_URL || "http://localhost:3000";
const APP_NAME = process.env.APP_NAME || "WINDX";

const MAX_PROMPT_CHARS = Number(process.env.MAX_PROMPT_CHARS || 6000);
const MAX_OUTPUT_TOKENS = Number(process.env.MAX_OUTPUT_TOKENS || 800);
const REQUEST_TIMEOUT_MS = Number(process.env.REQUEST_TIMEOUT_MS || 40000);

app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname)));

function validatePrompt(prompt) {
  if (typeof prompt !== "string") {
    return "Prompt must be a string.";
  }

  const trimmed = prompt.trim();
  if (!trimmed) {
    return "Prompt cannot be empty.";
  }

  if (trimmed.length > MAX_PROMPT_CHARS) {
    return `Prompt exceeds limit (${MAX_PROMPT_CHARS} chars).`;
  }

  return null;
}

function createHeaders() {
  return {
    Authorization: `Bearer ${OPENROUTER_API_KEY}`,
    "Content-Type": "application/json",
    "HTTP-Referer": APP_URL,
    "X-Title": APP_NAME,
  };
}

async function openRouterRequest({ model, prompt, stream }) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: createHeaders(),
      signal: controller.signal,
      body: JSON.stringify({
        model,
        stream,
        max_tokens: MAX_OUTPUT_TOKENS,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    return response;
  } finally {
    clearTimeout(timeout);
  }
}

async function requestWithFallback({ prompt, stream }) {
  const firstTry = await openRouterRequest({ model: PRIMARY_MODEL, prompt, stream });
  if (firstTry.ok || ![429, 500, 502, 503, 504].includes(firstTry.status)) {
    return firstTry;
  }

  const secondTry = await openRouterRequest({ model: FALLBACK_MODEL, prompt, stream });
  return secondTry;
}

app.get("/api/health", (_req, res) => {
  const hasKey = Boolean(OPENROUTER_API_KEY);
  res.json({ status: "ok", hasKey, model: PRIMARY_MODEL });
});

app.post("/api/chat", async (req, res) => {
  if (!OPENROUTER_API_KEY) {
    return res.status(500).json({ error: "Missing OPENROUTER_API_KEY in environment." });
  }

  const prompt = req.body?.prompt;
  const validationError = validatePrompt(prompt);
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  try {
    const upstream = await requestWithFallback({ prompt: prompt.trim(), stream: false });
    if (!upstream.ok) {
      const detail = await upstream.text();
      return res.status(upstream.status).json({ error: "OpenRouter request failed", detail });
    }

    const data = await upstream.json();
    const content = data?.choices?.[0]?.message?.content || "";
    return res.json({ content });
  } catch (error) {
    const message = error?.name === "AbortError" ? "Request timed out" : "Unexpected error";
    return res.status(500).json({ error: message });
  }
});

app.post("/api/chat/stream", async (req, res) => {
  if (!OPENROUTER_API_KEY) {
    return res.status(500).json({ error: "Missing OPENROUTER_API_KEY in environment." });
  }

  const prompt = req.body?.prompt;
  const validationError = validatePrompt(prompt);
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  try {
    const upstream = await requestWithFallback({ prompt: prompt.trim(), stream: true });

    if (!upstream.ok || !upstream.body) {
      const detail = await upstream.text();
      res.write(`event: error\ndata: ${JSON.stringify({ error: "OpenRouter stream failed", detail })}\n\n`);
      res.end();
      return;
    }

    const reader = upstream.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();

        if (payload === "[DONE]") {
          res.write("event: done\ndata: {}\n\n");
          res.end();
          return;
        }

        try {
          const json = JSON.parse(payload);
          const delta = json?.choices?.[0]?.delta?.content;
          if (delta) {
            res.write(`event: token\ndata: ${JSON.stringify({ token: delta })}\n\n`);
          }
        } catch {
          // Ignore malformed chunks; continue streaming valid tokens.
        }
      }
    }

    res.write("event: done\ndata: {}\n\n");
    res.end();
  } catch (error) {
    const err = error?.name === "AbortError" ? "Request timed out" : "Unexpected stream error";
    res.write(`event: error\ndata: ${JSON.stringify({ error: err })}\n\n`);
    res.end();
  }
});

app.listen(port, () => {
  console.log(`WINDX server running on http://localhost:${port}`);
});