#!/usr/bin/env node
import { execFile } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

import {
  AuthStorage,
  createAgentSession,
  DefaultResourceLoader,
  defineTool,
  ModelRegistry,
  SessionManager,
  SettingsManager,
} from "/opt/homebrew/lib/node_modules/@earendil-works/pi-coding-agent/dist/index.js";
import { Type } from "/opt/homebrew/lib/node_modules/@earendil-works/pi-coding-agent/node_modules/typebox/build/index.mjs";

const execFileAsync = promisify(execFile);

const HOME = os.homedir();
const AGENT_DIR = process.env.PI_PERSONAL_AGENT_DIR || path.join(HOME, ".pi", "agent-personal");
const ROOT = process.env.PI_IMESSAGE_AGENT_ROOT || path.join(AGENT_DIR, "imessage-agent");
const STATE_FILE = process.env.PI_IMESSAGE_AGENT_STATE || path.join(ROOT, "state.json");
const SESSION_DIR = process.env.PI_IMESSAGE_AGENT_SESSION_DIR || path.join(ROOT, "sessions");
const LOG_DIR = path.join(ROOT, "logs");
const CWD = process.env.PI_IMESSAGE_AGENT_CWD || HOME;
const CHAT_ID = process.env.PI_IMESSAGE_CHAT_ID || "1";
const RECIPIENT = process.env.PI_IMESSAGE_RECIPIENT || "";
const POLL_MS = Number(process.env.PI_IMESSAGE_POLL_MS || 3000);
const SYNC_LIMIT = Number(process.env.PI_IMESSAGE_SYNC_LIMIT || 5);
const MAX_REPLY_CHARS = Number(process.env.PI_IMESSAGE_MAX_REPLY_CHARS || 1400);
const WEBHOOK_DISABLED = process.env.PI_IMESSAGE_WEBHOOK_DISABLED === "1";
const WEBHOOK_HOST = process.env.PI_IMESSAGE_WEBHOOK_HOST || "127.0.0.1";
const WEBHOOK_PORT = Number(process.env.PI_IMESSAGE_WEBHOOK_PORT || 47761);
const WEBHOOK_TOKEN_FILE = process.env.PI_IMESSAGE_WEBHOOK_TOKEN_FILE || path.join(ROOT, "webhook-token");
const WEBHOOK_MAX_BODY_BYTES = 64 * 1024;
const WEBHOOK_HELPER_PATH = process.env.PI_IMESSAGE_WEBHOOK_HELPER_PATH || path.join(HOME, ".local", "bin", "pi-imessage-agent-message");
const AGENT_LABEL = process.env.PI_IMESSAGE_AGENT_LABEL || "persistent personal Pi agent";
const EXTRA_SYSTEM_APPEND = (process.env.PI_IMESSAGE_SYSTEM_APPEND_EXTRA || "").trim();
const ADDITIONAL_SKILL_PATHS = (process.env.PI_IMESSAGE_SKILL_PATHS || "")
  .split(path.delimiter)
  .map((entry) => entry.trim())
  .filter(Boolean);
const ENABLE_EXTENSIONS = process.env.PI_IMESSAGE_ENABLE_EXTENSIONS === "1";

fs.mkdirSync(ROOT, { recursive: true });
fs.mkdirSync(SESSION_DIR, { recursive: true });
fs.mkdirSync(LOG_DIR, { recursive: true });

function now() {
  return new Date().toISOString();
}

function log(...args) {
  console.log(`[${now()}]`, ...args);
}

function warn(...args) {
  console.warn(`[${now()}]`, ...args);
}

function readState() {
  try {
    const parsed = JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));
    return {
      initialized: Boolean(parsed.initialized),
      seenIncomingIds: Array.isArray(parsed.seenIncomingIds) ? parsed.seenIncomingIds.map(String) : [],
      seenWebhookIdempotencyKeys: Array.isArray(parsed.seenWebhookIdempotencyKeys) ? parsed.seenWebhookIdempotencyKeys.map(String) : [],
      lastProcessedAt: parsed.lastProcessedAt,
      lastWebhookAt: parsed.lastWebhookAt,
    };
  } catch {
    return { initialized: false, seenIncomingIds: [], seenWebhookIdempotencyKeys: [] };
  }
}

function writeState(state) {
  const tmp = `${STATE_FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(state, null, 2));
  fs.renameSync(tmp, STATE_FILE);
}

function rememberSeen(state, ids) {
  const set = new Set(state.seenIncomingIds.map(String));
  for (const id of ids) set.add(String(id));
  // Keep plenty for downtime/restarts without letting the file grow forever.
  state.seenIncomingIds = Array.from(set).slice(-1000);
  state.lastProcessedAt = now();
  writeState(state);
}

function rememberWebhookIdempotencyKey(state, key) {
  if (!key) return;
  const set = new Set((state.seenWebhookIdempotencyKeys || []).map(String));
  set.add(String(key));
  state.seenWebhookIdempotencyKeys = Array.from(set).slice(-1000);
  state.lastWebhookAt = now();
  writeState(state);
}

function parseJsonOutput(stdout) {
  const trimmed = stdout.trim();
  if (!trimmed) return [];
  try {
    const parsed = JSON.parse(trimmed);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    return trimmed
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => JSON.parse(line));
  }
}

function describeError(error) {
  const parts = [error?.message || String(error)];
  if (error?.stdout?.trim()) parts.push(`stdout: ${error.stdout.trim()}`);
  if (error?.stderr?.trim()) parts.push(`stderr: ${error.stderr.trim()}`);
  return parts.join("\n");
}

async function run(command, args, options = {}) {
  try {
    const { stdout, stderr } = await execFileAsync(command, args, {
      cwd: CWD,
      timeout: options.timeout ?? 30_000,
      maxBuffer: options.maxBuffer ?? 10 * 1024 * 1024,
      env: { ...process.env, PATH: `/opt/homebrew/bin:/usr/local/bin:${process.env.PATH || ""}` },
    });
    if (stderr?.trim() && options.logStderr) warn(stderr.trim());
    return stdout;
  } catch (error) {
    error.message = describeError(error);
    throw error;
  }
}

async function imsgJson(args) {
  const stdout = await run("/opt/homebrew/bin/imsg", [...args, "--json"], { timeout: 30_000 });
  return parseJsonOutput(stdout);
}

async function recentMessages(limit = SYNC_LIMIT) {
  return imsgJson(["history", "--chat-id", CHAT_ID, "--limit", String(limit), "--attachments", "--convert-attachments"]);
}

function isIncomingUserMessage(message) {
  if (!message || message.is_from_me) return false;
  if (!message.text && (!message.attachments || message.attachments.length === 0)) return false;
  return true;
}

function formatAttachment(a) {
  const parts = [];
  for (const key of ["filename", "transfer_name", "mime_type", "uti", "path", "cached_path"]) {
    if (a?.[key]) parts.push(`${key}=${a[key]}`);
  }
  return parts.length ? parts.join(" ") : JSON.stringify(a);
}

function formatIncomingForPrompt(messages) {
  if (messages.length === 1) {
    const m = messages[0];
    const attachments = m.attachments?.length
      ? `\nAttachments:\n${m.attachments.map((a) => `- ${formatAttachment(a)}`).join("\n")}`
      : "";
    return `New incoming iMessage from Avyay (${m.created_at || "unknown time"}, message id ${m.id}).\n\n${m.text || "[no text]"}${attachments}\n\nReply directly and concisely as a text message. Do not mention daemon internals.`;
  }

  const body = messages
    .map((m) => {
      const attachments = m.attachments?.length
        ? `\n  attachments: ${m.attachments.map(formatAttachment).join("; ")}`
        : "";
      return `- ${m.created_at || "unknown time"} id=${m.id}: ${m.text || "[no text]"}${attachments}`;
    })
    .join("\n");
  return `Avyay sent these new iMessages, in order:\n${body}\n\nRespond once, directly and concisely as a text message. Do not mention daemon internals.`;
}

function splitMessage(text, maxChars = MAX_REPLY_CHARS) {
  const clean = (text || "").trim() || "Done.";
  if (clean.length <= maxChars) return [clean];
  const chunks = [];
  let remaining = clean;
  while (remaining.length > maxChars) {
    let idx = remaining.lastIndexOf("\n\n", maxChars);
    if (idx < maxChars * 0.5) idx = remaining.lastIndexOf("\n", maxChars);
    if (idx < maxChars * 0.5) idx = remaining.lastIndexOf(" ", maxChars);
    if (idx < maxChars * 0.5) idx = maxChars;
    chunks.push(remaining.slice(0, idx).trim());
    remaining = remaining.slice(idx).trim();
  }
  if (remaining) chunks.push(remaining);
  return chunks;
}

async function sendMessage(text) {
  for (const chunk of splitMessage(text)) {
    await run("/opt/homebrew/bin/imsg", ["send", "--chat-id", CHAT_ID, "--text", chunk, "--json"], {
      timeout: 60_000,
      logStderr: true,
    });
  }
}

function summarizeImsg(messages) {
  if (!messages.length) return "No messages found.";
  return messages
    .map((m) => {
      const who = m.is_from_me ? "mac/me" : (m.sender || "them");
      const text = (m.text || "[no text]").replace(/\s+/g, " ").trim();
      const attachments = m.attachments?.length ? ` attachments=${m.attachments.length}` : "";
      return `${m.id ?? "?"} ${m.created_at || ""} ${who}: ${text}${attachments}`;
    })
    .join("\n");
}

function makeRequestId(prefix = "req") {
  return `${prefix}_${Date.now().toString(36)}_${crypto.randomBytes(6).toString("hex")}`;
}

function formatHostForUrl(host) {
  const value = String(host || "").trim();
  return value.includes(":") && !value.startsWith("[") ? `[${value}]` : value;
}

function isLocalWebhookHost(host) {
  const value = String(host || "").trim().toLowerCase();
  return value === "127.0.0.1" || value === "localhost" || value === "::1" || value === "[::1]";
}

function isValidWebhookPort(port) {
  return Number.isInteger(port) && port >= 1 && port <= 65535;
}

function webhookStatusConfig() {
  let tokenFileExists = false;
  let tokenFileMode = null;
  try {
    const stat = fs.statSync(WEBHOOK_TOKEN_FILE);
    tokenFileExists = stat.isFile();
    tokenFileMode = `0${(stat.mode & 0o777).toString(8)}`;
  } catch {}
  const hostForUrl = formatHostForUrl(WEBHOOK_HOST);
  return {
    enabled: !WEBHOOK_DISABLED,
    host: WEBHOOK_HOST,
    port: WEBHOOK_PORT,
    tokenFile: WEBHOOK_TOKEN_FILE,
    tokenFileExists,
    tokenFileMode,
    helperPath: WEBHOOK_HELPER_PATH,
    endpoints: {
      health: `http://${hostForUrl}:${WEBHOOK_PORT}/health`,
      message: `http://${hostForUrl}:${WEBHOOK_PORT}/message`,
      agentMessage: `http://${hostForUrl}:${WEBHOOK_PORT}/agent-message`,
    },
    maxBodyBytes: WEBHOOK_MAX_BODY_BYTES,
  };
}

function ensureWebhookToken() {
  fs.mkdirSync(path.dirname(WEBHOOK_TOKEN_FILE), { recursive: true });
  try {
    const existing = fs.readFileSync(WEBHOOK_TOKEN_FILE, "utf8").trim();
    if (existing) {
      try { fs.chmodSync(WEBHOOK_TOKEN_FILE, 0o600); } catch {}
      return existing;
    }
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }

  const token = crypto.randomBytes(32).toString("hex");
  fs.writeFileSync(WEBHOOK_TOKEN_FILE, `${token}\n`, { mode: 0o600 });
  try { fs.chmodSync(WEBHOOK_TOKEN_FILE, 0o600); } catch (error) { warn("failed to chmod webhook token file:", error?.message || String(error)); }
  return token;
}

function writeJson(res, statusCode, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  res.end(body);
}

function httpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

async function readJsonRequestBody(req) {
  const chunks = [];
  let bytes = 0;
  let tooLarge = false;
  for await (const chunk of req) {
    bytes += chunk.length;
    if (bytes > WEBHOOK_MAX_BODY_BYTES) {
      tooLarge = true;
      continue;
    }
    chunks.push(chunk);
  }
  if (tooLarge) throw httpError(413, `JSON body exceeds ${WEBHOOK_MAX_BODY_BYTES} bytes`);
  const raw = Buffer.concat(chunks).toString("utf8").trim();
  if (!raw) throw httpError(400, "JSON body is required");
  try {
    return JSON.parse(raw);
  } catch {
    throw httpError(400, "invalid JSON body");
  }
}

function parseBearerToken(header) {
  const match = /^Bearer\s+(.+)$/i.exec(String(header || ""));
  return match ? match[1].trim() : null;
}

function tokenMatches(expected, supplied) {
  if (!expected || !supplied) return false;
  const expectedBuffer = Buffer.from(expected);
  const suppliedBuffer = Buffer.from(supplied);
  if (expectedBuffer.length !== suppliedBuffer.length) return false;
  return crypto.timingSafeEqual(expectedBuffer, suppliedBuffer);
}

function normalizeWebhookBody(body, requestId) {
  if (!body || typeof body !== "object" || Array.isArray(body)) throw httpError(400, "JSON object body is required");

  const rawText = body.text ?? body.message;
  if (typeof rawText !== "string" || !rawText.trim()) throw httpError(400, "text or message string is required");

  const metadata = body.metadata === undefined ? {} : body.metadata;
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) throw httpError(400, "metadata must be an object when provided");

  const replyMode = body.replyMode === undefined ? "imessage" : String(body.replyMode);
  if (replyMode !== "imessage" && replyMode !== "none") throw httpError(400, "replyMode must be imessage or none");

  const rawSource = body.from ?? body.source ?? "local-subagent";
  const source = String(rawSource || "local-subagent").slice(0, 200);
  const idempotencyKey = body.idempotencyKey === undefined || body.idempotencyKey === null || body.idempotencyKey === ""
    ? null
    : String(body.idempotencyKey);
  if (idempotencyKey && idempotencyKey.length > 512) throw httpError(400, "idempotencyKey is too long");

  return {
    type: "webhook",
    requestId,
    source,
    text: rawText,
    metadata,
    idempotencyKey,
    replyMode,
    receivedAt: now(),
  };
}

function formatWebhookForPrompt(job) {
  const metadataText = Object.keys(job.metadata || {}).length
    ? `\nMetadata JSON:\n${JSON.stringify(job.metadata, null, 2)}`
    : "";
  const idempotencyText = job.idempotencyKey ? `\nIdempotency key: ${job.idempotencyKey}` : "";
  const replyInstruction = job.replyMode === "imessage"
    ? "Reply mode is imessage: produce one concise text-message update for Avyay. The daemon will send your final answer via normal sendMessage; do not call imsg yourself. Avoid spam and mention only what matters."
    : "Reply mode is none: process this local update for context/logging only. Your final answer will not be texted to Avyay, so keep it brief and do not ask to send a message.";

  return `Local subagent message received via the local-only Pi iMessage webhook.\n\nSource/from: ${job.source}\nRequest id: ${job.requestId}\nReceived at: ${job.receivedAt}\nReply mode: ${job.replyMode}${idempotencyText}${metadataText}\n\nMessage:\n${job.text}\n\n${replyInstruction}`;
}

async function startWebhookServer({ state, enqueueWebhookMessage, getStatus }) {
  if (WEBHOOK_DISABLED) {
    log("local webhook disabled by PI_IMESSAGE_WEBHOOK_DISABLED=1");
    return null;
  }
  if (!isLocalWebhookHost(WEBHOOK_HOST)) {
    warn(`local webhook disabled: refusing to bind non-loopback host ${WEBHOOK_HOST}`);
    return null;
  }
  if (!isValidWebhookPort(WEBHOOK_PORT)) {
    warn(`local webhook disabled: invalid port ${WEBHOOK_PORT}`);
    return null;
  }

  let token;
  try {
    token = ensureWebhookToken();
  } catch (error) {
    warn("local webhook disabled: failed to initialize bearer token:", error?.message || String(error));
    return null;
  }

  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url || "/", "http://pi-imessage-agent.local");
      if (req.method === "GET" && url.pathname === "/health") {
        writeJson(res, 200, {
          ok: true,
          time: now(),
          webhook: webhookStatusConfig(),
          status: getStatus(),
        });
        return;
      }

      if ((url.pathname === "/message" || url.pathname === "/agent-message") && req.method !== "POST") {
        writeJson(res, 405, { ok: false, error: "method not allowed" });
        return;
      }

      if (req.method === "POST" && (url.pathname === "/message" || url.pathname === "/agent-message")) {
        const suppliedToken = parseBearerToken(req.headers.authorization);
        if (!tokenMatches(token, suppliedToken)) {
          writeJson(res, 401, { ok: false, error: "unauthorized" });
          return;
        }

        const body = await readJsonRequestBody(req);
        const requestId = makeRequestId("wh");
        const job = normalizeWebhookBody(body, requestId);
        if (job.idempotencyKey) {
          const seen = new Set((state.seenWebhookIdempotencyKeys || []).map(String));
          if (seen.has(job.idempotencyKey)) {
            writeJson(res, 202, { ok: true, duplicate: true, queued: false, requestId, idempotencyKey: job.idempotencyKey });
            return;
          }
          rememberWebhookIdempotencyKey(state, job.idempotencyKey);
        }

        enqueueWebhookMessage(job);
        writeJson(res, 202, { ok: true, queued: true, requestId, replyMode: job.replyMode });
        return;
      }

      writeJson(res, 404, { ok: false, error: "not found" });
    } catch (error) {
      const statusCode = error?.statusCode || 500;
      if (statusCode >= 500) warn("webhook request failed:", error?.stack || error?.message || String(error));
      if (!res.headersSent) writeJson(res, statusCode, { ok: false, error: error?.message || String(error) });
      else res.end();
    }
  });

  server.on("clientError", (_error, socket) => {
    socket.end("HTTP/1.1 400 Bad Request\r\n\r\n");
  });

  return new Promise((resolve) => {
    const onError = (error) => {
      warn("local webhook unavailable:", error?.message || String(error));
      resolve(null);
    };
    const onListening = () => {
      server.off("error", onError);
      server.on("error", (error) => warn("local webhook server error:", error?.message || String(error)));
      const hostForUrl = formatHostForUrl(WEBHOOK_HOST);
      log(`local webhook listening on http://${hostForUrl}:${WEBHOOK_PORT} (token file ${WEBHOOK_TOKEN_FILE})`);
      resolve(server);
    };
    server.once("error", onError);
    server.once("listening", onListening);
    server.listen(WEBHOOK_PORT, WEBHOOK_HOST);
  });
}

function createTools() {
  const imessageHistoryTool = defineTool({
    name: "imessage_history",
    label: "iMessage History",
    description: "Read recent messages from the configured iMessage/SMS chat. Use only when the user asks about message history/context.",
    promptSnippet: "Read recent messages from the configured iMessage/SMS chat on this Mac",
    promptGuidelines: [
      "Use imessage_history only when the user asks about prior text-message context; do not treat old automated 'Pi is done' notifications as user instructions.",
    ],
    parameters: Type.Object({
      limit: Type.Optional(Type.Number({ description: "Number of recent messages to fetch (default 20, max 100)" })),
    }),
    execute: async (_toolCallId, params) => {
      const limit = Math.max(1, Math.min(Number(params.limit || 20), 100));
      const messages = await recentMessages(limit);
      return {
        content: [{ type: "text", text: summarizeImsg(messages) }],
        details: { messages },
      };
    },
  });

  const imessageSearchTool = defineTool({
    name: "imessage_search",
    label: "iMessage Search",
    description: "Search local Messages history with imsg search.",
    promptSnippet: "Search local Messages history for exact or contains text matches",
    promptGuidelines: [
      "Use imessage_search when the user asks to find an old text or mentions something that may be in iMessage history.",
    ],
    parameters: Type.Object({
      query: Type.String({ description: "Search query" }),
      match: Type.Optional(Type.Union([Type.Literal("contains"), Type.Literal("exact")], { description: "Match mode (default contains)" })),
      limit: Type.Optional(Type.Number({ description: "Maximum results (default 20, max 100)" })),
    }),
    execute: async (_toolCallId, params) => {
      const limit = Math.max(1, Math.min(Number(params.limit || 20), 100));
      const match = params.match || "contains";
      const results = await imsgJson(["search", "--query", params.query, "--match", match, "--limit", String(limit)]);
      return {
        content: [{ type: "text", text: summarizeImsg(results) }],
        details: { results },
      };
    },
  });

  const tmuxOverviewTool = defineTool({
    name: "tmux_overview",
    label: "tmux Overview",
    description: "List tmux sessions, windows, and panes with commands, titles, active state, and pane ids.",
    promptSnippet: "Observe all tmux sessions/windows/panes on this Mac",
    promptGuidelines: ["Use tmux_overview to inspect what is currently running in tmux before claiming terminal state."],
    parameters: Type.Object({}),
    execute: async () => {
      let text = "";
      try {
        text += "# sessions\n" + await run("/opt/homebrew/bin/tmux", ["list-sessions", "-F", "#{session_id}\t#{session_name}\twindows=#{session_windows}\tattached=#{session_attached}\tcreated=#{session_created_string}"]);
        text += "\n# windows\n" + await run("/opt/homebrew/bin/tmux", ["list-windows", "-a", "-F", "#{session_name}:#{window_index}\tactive=#{window_active}\tname=#{window_name}\tpanes=#{window_panes}\tlayout=#{window_layout}"]);
        text += "\n# panes\n" + await run("/opt/homebrew/bin/tmux", ["list-panes", "-a", "-F", "#{session_name}:#{window_index}.#{pane_index}\tpane_id=#{pane_id}\tactive=#{pane_active}\tpid=#{pane_pid}\tcmd=#{pane_current_command}\ttitle=#{pane_title}\tpath=#{pane_current_path}"]);
      } catch (error) {
        text += `tmux not available or no server running: ${error.message}`;
      }
      return { content: [{ type: "text", text: text.trim() || "No tmux state." }], details: {} };
    },
  });

  const tmuxCaptureTool = defineTool({
    name: "tmux_capture_pane",
    label: "tmux Capture Pane",
    description: "Capture visible/recent text from a tmux pane by target (e.g. %1 or session:0.0).",
    promptSnippet: "Capture recent output from a tmux pane",
    promptGuidelines: ["Use tmux_capture_pane for detailed terminal output after tmux_overview identifies the pane."],
    parameters: Type.Object({
      target: Type.Optional(Type.String({ description: "tmux target pane, e.g. %1 or session:0.0. Defaults to active pane." })),
      lines: Type.Optional(Type.Number({ description: "Number of recent lines to capture (default 200, max 2000)" })),
    }),
    execute: async (_toolCallId, params) => {
      const lines = Math.max(1, Math.min(Number(params.lines || 200), 2000));
      const args = ["capture-pane", "-p", "-J", "-S", `-${lines}`];
      if (params.target) args.push("-t", params.target);
      try {
        const output = await run("/opt/homebrew/bin/tmux", args, { maxBuffer: 20 * 1024 * 1024 });
        return { content: [{ type: "text", text: output.trim() || "[empty pane]" }], details: { target: params.target, lines } };
      } catch (error) {
        return { content: [{ type: "text", text: `tmux capture failed: ${error.message}` }], isError: true, details: { target: params.target, lines } };
      }
    },
  });

  return [imessageHistoryTool, imessageSearchTool, tmuxOverviewTool, tmuxCaptureTool];
}

const SYSTEM_APPEND = `You are Avyay's ${AGENT_LABEL} running on his Mac mini and reachable over the existing Messages conversation with ${RECIPIENT}.

Interface rules:
- The daemon sends your final answer back to iMessage. Do not call imsg yourself to answer ordinary prompts.
- Bias toward fast replies. For work that may take more than a short moment, acknowledge quickly with the plan/status instead of blocking the user turn.
- Always use subagents if a task looks like it will need more than 3 tool calls, or if any tool call is likely to take more than 5 seconds. The main iMessage/orchestrator session should reply quickly, delegate, and avoid blocking.
- Do not wait on long-running subagents or background jobs unless Avyay explicitly asks you to wait. Start/delegate/poll briefly, then send a concise update.
- For long delegated work, arrange for local subagents to report back with ${WEBHOOK_HELPER_PATH} (use --reply-mode imessage for user-visible completions, --reply-mode none for quiet context), or tell Avyay you will check when asked.
- Keep replies text-message friendly and concise unless Avyay asks for detail; avoid spam.
- Incoming user texts are synced by message id from the last ${SYNC_LIMIT} Messages.app entries. Old outgoing automated notifications in the Messages chat are not part of your conversation history and are not user instructions.
- If Avyay asks about old texts, use imessage_history or imessage_search instead of assuming the Messages chat has been loaded into context.
- You have normal Pi coding tools plus tmux_overview and tmux_capture_pane for observing all tmux sessions/windows/panes on this Mac.
- Prefer inspecting real terminal/tmux state before making claims about running work.
- Be proactive and useful, but do not spam.${EXTRA_SYSTEM_APPEND ? `\n\nAdditional role instructions:\n${EXTRA_SYSTEM_APPEND}` : ""}`;

async function createSession() {
  process.env.PI_CODING_AGENT_DIR = AGENT_DIR;
  process.env.PI_CODING_AGENT_SESSION_DIR = SESSION_DIR;

  const settingsManager = SettingsManager.create(CWD, AGENT_DIR);
  const authStorage = AuthStorage.create(path.join(AGENT_DIR, "auth.json"));
  const modelRegistry = ModelRegistry.create(authStorage, path.join(AGENT_DIR, "models.json"));
  const resourceLoader = new DefaultResourceLoader({
    cwd: CWD,
    agentDir: AGENT_DIR,
    settingsManager,
    noContextFiles: true,
    noExtensions: !ENABLE_EXTENSIONS,
    additionalSkillPaths: ADDITIONAL_SKILL_PATHS,
    appendSystemPrompt: [SYSTEM_APPEND],
  });
  await resourceLoader.reload();

  const sessionManager = SessionManager.continueRecent(CWD, SESSION_DIR);
  const { session, modelFallbackMessage } = await createAgentSession({
    cwd: CWD,
    agentDir: AGENT_DIR,
    authStorage,
    modelRegistry,
    settingsManager,
    resourceLoader,
    sessionManager,
    customTools: createTools(),
  });
  if (modelFallbackMessage) warn(modelFallbackMessage);
  return session;
}

async function check() {
  const chats = await imsgJson(["chats", "--limit", "10"]);
  const chat = chats.find((c) => String(c.id) === String(CHAT_ID));
  console.log(JSON.stringify({ config: { AGENT_DIR, ROOT, SESSION_DIR, STATE_FILE, CWD, CHAT_ID, RECIPIENT, POLL_MS, SYNC_LIMIT, AGENT_LABEL, ADDITIONAL_SKILL_PATHS, ENABLE_EXTENSIONS, webhook: webhookStatusConfig() }, chat }, null, 2));
  const recent = await recentMessages(SYNC_LIMIT);
  console.log("\nRecent messages:");
  console.log(summarizeImsg(recent));
}

async function main() {
  if (process.argv.includes("--check")) {
    await check();
    return;
  }

  log("starting pi-personal iMessage agent", JSON.stringify({ CHAT_ID, RECIPIENT, CWD, AGENT_DIR, ROOT, SESSION_DIR, SYNC_LIMIT, AGENT_LABEL }));
  const state = readState();

  if (!state.initialized) {
    const recent = await recentMessages(SYNC_LIMIT);
    const initialIds = recent.filter(isIncomingUserMessage).map((m) => String(m.id));
    state.initialized = true;
    rememberSeen(state, initialIds);
    log(`initialized; marked ${initialIds.length} existing incoming message(s) as seen`);
  }

  const session = await createSession();
  log(`session ready: ${session.sessionFile || session.sessionId}; model=${session.model ? `${session.model.provider}/${session.model.id}` : "unknown"}`);

  let currentAssistantText = "";
  session.subscribe((event) => {
    if (event.type === "message_update" && event.assistantMessageEvent?.type === "text_delta") {
      currentAssistantText += event.assistantMessageEvent.delta;
    }
    if (event.type === "tool_execution_start") log(`tool start: ${event.toolName}`);
    if (event.type === "tool_execution_end") log(`tool end: ${event.toolName} ${event.isError ? "error" : "ok"}`);
    if (event.type === "agent_end") log("agent turn complete");
  });

  const queuedIncomingIds = new Set();
  const queue = [];
  let processing = false;
  let processScheduled = false;
  let webhookServer = null;

  function queueStatus() {
    return {
      queueLength: queue.length,
      processing,
      processScheduled,
      queuedIncomingIds: queuedIncomingIds.size,
    };
  }

  function scheduleProcessQueue() {
    if (processScheduled || processing) return;
    processScheduled = true;
    setImmediate(() => {
      processScheduled = false;
      processQueue().catch((error) => warn("queue processor failed:", error?.stack || error?.message || String(error)));
    });
  }

  function enqueueIncomingMessages(fresh) {
    const ids = fresh.map((m) => String(m.id));
    for (const id of ids) queuedIncomingIds.add(id);
    const requestId = makeRequestId("imsg");
    queue.push({ type: "imessage", requestId, messages: fresh, ids, enqueuedAt: now() });
    log(`queued incoming iMessage job ${requestId}: ${ids.join(",")}`);
    scheduleProcessQueue();
  }

  function enqueueWebhookMessage(job) {
    queue.push(job);
    log(`queued webhook job ${job.requestId} from ${job.source}; replyMode=${job.replyMode}; queueLength=${queue.length}`);
    scheduleProcessQueue();
  }

  async function processIncomingJob(job) {
    currentAssistantText = "";
    const { ids, messages } = job;
    log(`processing incoming message(s): ${ids.join(",")}`);
    try {
      await session.prompt(formatIncomingForPrompt(messages), { source: "extension" });
      const reply = currentAssistantText.trim() || "Done.";
      await sendMessage(reply);
      rememberSeen(state, ids);
      log(`replied to ${ids.join(",")}`);
    } catch (error) {
      warn(`failed processing ${ids.join(",")}:`, error?.stack || error?.message || String(error));
      try {
        await sendMessage(`Pi agent hit an error: ${error?.message || String(error)}`);
      } catch (sendError) {
        warn("also failed to send error message:", sendError?.message || String(sendError));
      }
      // Mark it seen after surfacing the error so one bad prompt does not loop forever.
      rememberSeen(state, ids);
    } finally {
      for (const id of ids) queuedIncomingIds.delete(id);
    }
  }

  async function processWebhookJob(job) {
    currentAssistantText = "";
    log(`processing webhook job ${job.requestId} from ${job.source}; replyMode=${job.replyMode}`);
    try {
      await session.prompt(formatWebhookForPrompt(job), { source: "extension" });
      const reply = currentAssistantText.trim() || "Done.";
      if (job.replyMode === "imessage") await sendMessage(reply);
      log(`processed webhook job ${job.requestId}${job.replyMode === "imessage" ? " and sent iMessage reply" : " without iMessage reply"}`);
    } catch (error) {
      warn(`failed processing webhook job ${job.requestId}:`, error?.stack || error?.message || String(error));
      if (job.replyMode === "imessage") {
        try {
          await sendMessage(`Pi agent hit an error processing a local subagent update from ${job.source}: ${error?.message || String(error)}`);
        } catch (sendError) {
          warn("also failed to send webhook error message:", sendError?.message || String(sendError));
        }
      }
    }
  }

  async function processQueue() {
    if (processing) return;
    processing = true;
    try {
      while (queue.length > 0) {
        const job = queue.shift();
        if (job.type === "imessage") await processIncomingJob(job);
        else if (job.type === "webhook") await processWebhookJob(job);
        else warn("dropping unknown queue job:", JSON.stringify(job));
      }
    } finally {
      processing = false;
      if (queue.length > 0) scheduleProcessQueue();
    }
  }

  async function pollOnce() {
    if (processing || queue.length > 0) return;
    const recent = await recentMessages(SYNC_LIMIT);
    const seen = new Set(state.seenIncomingIds.map(String));
    const fresh = recent
      .filter(isIncomingUserMessage)
      .filter((m) => !seen.has(String(m.id)) && !queuedIncomingIds.has(String(m.id)))
      .sort((a, b) => Number(a.id || 0) - Number(b.id || 0));
    if (fresh.length > 0) enqueueIncomingMessages(fresh);
  }

  webhookServer = await startWebhookServer({
    state,
    enqueueWebhookMessage,
    getStatus: queueStatus,
  });

  const interval = setInterval(() => {
    pollOnce().catch((error) => warn("poll failed:", error?.stack || error?.message || String(error)));
  }, POLL_MS);

  await pollOnce().catch((error) => warn("initial poll failed:", describeError(error)));

  async function shutdown(signal) {
    log(`shutting down (${signal})`);
    clearInterval(interval);
    if (webhookServer) {
      await new Promise((resolve) => webhookServer.close((error) => {
        if (error) warn("failed closing webhook server:", error?.message || String(error));
        resolve();
      }));
    }
    try { await session.dispose?.(); } catch {}
    process.exit(0);
  }
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

main().catch((error) => {
  console.error(`[${now()}] fatal`, describeError(error));
  if (error?.stack) console.error(error.stack);
  process.exit(1);
});
