import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { complete } from "@earendil-works/pi-ai";
import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";

const WEBHOOK_ENV = "PI_SLACK_WEBHOOK_URL";
const WEBHOOK_FILE = join(homedir(), ".pi/agent/secrets/slack-webhook-url");
const MENTION_ENV = "PI_SLACK_MENTION";
const IMESSAGE_RECIPIENT_ENV = "PI_IMESSAGE_RECIPIENT";
const IMESSAGE_RECIPIENT_FILE = join(homedir(), ".pi/agent/secrets/imessage-recipient");
const IMESSAGE_COMMAND_ENV = "PI_IMESSAGE_COMMAND";
const SUMMARY_PROVIDER = "openai-codex";
const SUMMARY_MODEL = "gpt-5.5";
const MIN_NOTIFICATION_DURATION_MS = 30_000;
const MAX_CONVERSATION_CHARS = 16_000;
const MAX_SUMMARY_CHARS = 1_200;
const MAX_QUESTION_CHARS = 700;
const MAX_IMESSAGE_CHARS = 4_000;
const GITHUB_PR_RE = /https:\/\/github\.com\/[^\s/]+\/[^\s/]+\/pull\/\d+/g;
const NOTIFICATION_SETTINGS_CUSTOM_TYPE = "notifications-settings";
const DEFAULT_NOTIFICATION_SETTINGS = { imessage: true, slack: false };
const execFileAsync = promisify(execFile);

type ContentBlock = {
	type?: string;
	text?: string;
	thinking?: string;
	name?: string;
	arguments?: Record<string, unknown>;
};

type SessionEntry = {
	type: string;
	message?: {
		role?: string;
		content?: unknown;
		command?: string;
		output?: string;
	};
	summary?: string;
	customType?: string;
	data?: unknown;
};

type NotificationSettings = {
	imessage: boolean;
	slack: boolean;
};

function compactError(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}

function shouldNotifyForDuration(startedAt: number | undefined, endedAt: number): boolean {
	return startedAt !== undefined && endedAt - startedAt > MIN_NOTIFICATION_DURATION_MS;
}

function sessionLabel(pi: ExtensionAPI): string {
	return pi.getSessionName() ?? "unnamed session";
}

function truncate(value: string, maxChars: number): string {
	const trimmed = value.trim();
	if (trimmed.length <= maxChars) return trimmed;
	return `${trimmed.slice(0, Math.max(0, maxChars - 1)).trimEnd()}…`;
}

function textFromContent(content: unknown): string {
	if (typeof content === "string") return content;
	if (!Array.isArray(content)) return "";

	const parts: string[] = [];
	for (const part of content) {
		if (!part || typeof part !== "object") continue;
		const block = part as ContentBlock;
		if (block.type === "text" && typeof block.text === "string") {
			parts.push(block.text);
		} else if (block.type === "toolCall" && typeof block.name === "string") {
			parts.push(`Tool call: ${block.name} ${JSON.stringify(block.arguments ?? {})}`);
		}
	}

	return parts.join("\n");
}

function entryTextForSummary(entry: SessionEntry): string | undefined {
	if (entry.type === "compaction" && entry.summary) return `Compaction summary: ${entry.summary}`;
	if (entry.type !== "message" || !entry.message?.role) return undefined;

	const role = entry.message.role;
	if (role === "user" || role === "assistant") {
		const text = textFromContent(entry.message.content).trim();
		return text ? `${role}: ${text}` : undefined;
	}

	if (role === "toolResult") {
		const text = textFromContent(entry.message.content).trim();
		return text ? `tool result: ${truncate(text, 1_500)}` : undefined;
	}

	if (role === "bashExecution") {
		const command = entry.message.command ? `$ ${entry.message.command}` : "bash execution";
		const output = entry.message.output ? `\n${truncate(entry.message.output, 1_500)}` : "";
		return `${command}${output}`;
	}

	return undefined;
}

function getBranch(ctx: ExtensionContext): SessionEntry[] {
	return ctx.sessionManager.getBranch() as SessionEntry[];
}

function normalizeNotificationSettings(data: unknown): NotificationSettings | undefined {
	if (!data || typeof data !== "object") return undefined;
	const value = data as Partial<Record<keyof NotificationSettings, unknown>>;
	const settings = { ...DEFAULT_NOTIFICATION_SETTINGS };
	let hasSetting = false;

	if (typeof value.imessage === "boolean") {
		settings.imessage = value.imessage;
		hasSetting = true;
	}
	if (typeof value.slack === "boolean") {
		settings.slack = value.slack;
		hasSetting = true;
	}

	return hasSetting ? settings : undefined;
}

function getNotificationSettings(ctx: ExtensionContext): NotificationSettings {
	let settings = { ...DEFAULT_NOTIFICATION_SETTINGS };
	for (const entry of getBranch(ctx)) {
		if (entry.type !== "custom" || entry.customType !== NOTIFICATION_SETTINGS_CUSTOM_TYPE) continue;
		settings = normalizeNotificationSettings(entry.data) ?? settings;
	}
	return settings;
}

function isAbortedAssistantMessage(message: unknown): boolean {
	if (!message || typeof message !== "object") return false;
	const value = message as { role?: unknown; stopReason?: unknown };
	return value.role === "assistant" && value.stopReason === "aborted";
}

function agentEndWasAborted(event: { messages?: unknown[] }): boolean {
	return event.messages?.some(isAbortedAssistantMessage) ?? false;
}

function notificationSettingsText(settings: NotificationSettings): string {
	return `iMessage ${settings.imessage ? "on" : "off"}, Slack ${settings.slack ? "on" : "off"}`;
}

function updateNotificationStatus(ctx: ExtensionContext, settings: NotificationSettings): void {
	if (!ctx.hasUI) return;
	ctx.ui.setStatus("notifications", `notify: ${settings.imessage ? "iMsg ✓" : "iMsg ×"} ${settings.slack ? "Slack ✓" : "Slack ×"}`);
}

function parseNotificationToggleArgs(
	args: string,
	current: NotificationSettings,
): { settings?: NotificationSettings; message: string } {
	const normalized = args.trim().toLowerCase();
	if (!normalized || normalized === "status") {
		return { message: `Notifications: ${notificationSettingsText(current)}` };
	}

	if (normalized === "default" || normalized === "reset") {
		return { settings: { ...DEFAULT_NOTIFICATION_SETTINGS }, message: "Reset notifications to defaults" };
	}

	const parts = normalized.split(/\s+/);
	const target = parts[0];
	const action = parts[1] ?? "toggle";
	const next = { ...current };
	const apply = (key: keyof NotificationSettings) => {
		if (action === "on") next[key] = true;
		else if (action === "off") next[key] = false;
		else if (action === "toggle") next[key] = !next[key];
		else return false;
		return true;
	};

	if ((target === "imessage" || target === "imsg") && apply("imessage")) {
		return { settings: next, message: `Set iMessage notifications ${next.imessage ? "on" : "off"}` };
	}
	if (target === "slack" && apply("slack")) {
		return { settings: next, message: `Set Slack notifications ${next.slack ? "on" : "off"}` };
	}
	if ((target === "all" || target === "both") && (action === "on" || action === "off" || action === "toggle")) {
		if (action === "toggle") {
			next.imessage = !next.imessage;
			next.slack = !next.slack;
		} else {
			const enabled = action === "on";
			next.imessage = enabled;
			next.slack = enabled;
		}
		return { settings: next, message: `Set all notifications ${action === "toggle" ? notificationSettingsText(next) : action}` };
	}
	if ((target === "on" || target === "off" || target === "toggle") && parts.length === 1) {
		return parseNotificationToggleArgs(`all ${target}`, current);
	}

	return {
		message: "Usage: /notifications [status|default|imessage on/off/toggle|slack on/off/toggle|all on/off/toggle]",
	};
}

function buildConversationText(entries: SessionEntry[]): string {
	const sections = entries.map(entryTextForSummary).filter((text): text is string => Boolean(text));
	const fullText = sections.join("\n\n");
	if (fullText.length <= MAX_CONVERSATION_CHARS) return fullText;
	return `[Earlier conversation omitted]\n${fullText.slice(-MAX_CONVERSATION_CHARS)}`;
}

function latestMessageText(entries: SessionEntry[], role: string): string | undefined {
	for (let i = entries.length - 1; i >= 0; i--) {
		const entry = entries[i];
		if (entry.type !== "message" || entry.message?.role !== role) continue;
		const text = textFromContent(entry.message.content).trim();
		if (text) return text;
	}
	return undefined;
}

function extractGitHubPrUrl(text: string): string | undefined {
	const matches = Array.from(text.matchAll(GITHUB_PR_RE), (match) => match[0].replace(/[)>.,;]+$/, ""));
	return matches.at(-1);
}

function extractQuestion(text: string | undefined): string | undefined {
	if (!text) return undefined;
	const candidates = text
		.split(/\n{2,}|(?<=[?])\s+/)
		.map((part) => part.replace(/^[-*]\s*/, "").trim())
		.filter((part) => part.includes("?"));
	const question = candidates.at(-1);
	return question ? truncate(question, MAX_QUESTION_CHARS) : undefined;
}

function fallbackSummary(entries: SessionEntry[]): string {
	const user = latestMessageText(entries, "user");
	const assistant = latestMessageText(entries, "assistant");
	const lines = [
		user ? `User asked: ${truncate(user, 350)}` : undefined,
		assistant ? `Pi replied: ${truncate(assistant, 650)}` : undefined,
	].filter((line): line is string => Boolean(line));
	return lines.join("\n") || "No user/assistant messages found in the current session.";
}

async function completeWithSummaryModel(ctx: ExtensionContext, prompt: string): Promise<string | undefined> {
	const model = ctx.modelRegistry.find(SUMMARY_PROVIDER, SUMMARY_MODEL);
	if (!model) {
		throw new Error(`Summary model ${SUMMARY_PROVIDER}/${SUMMARY_MODEL} was not found`);
	}

	const auth = await ctx.modelRegistry.getApiKeyAndHeaders(model);
	if (!auth.ok) {
		throw new Error(`Summary auth failed: ${auth.error}`);
	}

	const response = await complete(
		model,
		{
			messages: [
				{
					role: "user" as const,
					content: [{ type: "text" as const, text: prompt }],
					timestamp: Date.now(),
				},
			],
		},
		{
			apiKey: auth.apiKey,
			headers: auth.headers,
			maxTokens: 300,
			signal: ctx.signal,
		},
	);

	const content = response.content
		.filter((part): part is { type: "text"; text: string } => part.type === "text")
		.map((part) => part.text)
		.join("\n")
		.trim();
	return content || undefined;
}

function buildSummaryPrompt(conversationText: string, cwd: string): string {
	return [
		"Create the notification summary for this Pi coding-agent session.",
		"Keep it short: 2-4 bullets max. Mention what changed, what was tested/run, and current status.",
		"If the agent is asking the user for input, include that as an explicit open question.",
		"Do not invent GitHub PR URLs; those are detected separately.",
		`Project: ${cwd}`,
		"",
		"<session>",
		conversationText,
		"</session>",
	].join("\n");
}

async function summarizeSession(ctx: ExtensionContext, entries: SessionEntry[], cwd: string): Promise<string> {
	const conversationText = buildConversationText(entries);
	if (!conversationText.trim()) return fallbackSummary(entries);

	try {
		const summary = await completeWithSummaryModel(ctx, buildSummaryPrompt(conversationText, cwd));
		return summary ? truncate(summary, MAX_SUMMARY_CHARS) : fallbackSummary(entries);
	} catch (error) {
		console.error(`[notifications] Summary failed: ${compactError(error)}`);
		return fallbackSummary(entries);
	}
}

async function runQuiet(command: string, args: string[], options: { cwd?: string; timeout?: number } = {}) {
	try {
		const result = await execFileAsync(command, args, {
			cwd: options.cwd,
			timeout: options.timeout ?? 5_000,
			maxBuffer: 1024 * 1024,
		});
		return { stdout: String(result.stdout ?? ""), stderr: String(result.stderr ?? ""), code: 0 };
	} catch (error) {
		const err = error as { stdout?: unknown; stderr?: unknown; code?: unknown };
		return {
			stdout: String(err.stdout ?? ""),
			stderr: String(err.stderr ?? ""),
			code: typeof err.code === "number" ? err.code : 1,
		};
	}
}

async function getTmuxLocation(): Promise<string | undefined> {
	if (!process.env.TMUX) return undefined;

	const targetPane = process.env.TMUX_PANE;
	const args = ["display-message", "-p"];
	if (targetPane) args.push("-t", targetPane);
	args.push("#S:#I.#P #{window_name}");

	const { stdout, code } = await runQuiet("tmux", args, { timeout: 5_000 });
	if (code !== 0) return undefined;

	const location = stdout.trim();
	return location.length > 0 ? location : undefined;
}

async function getCurrentGitHubPrUrl(cwd: string): Promise<string | undefined> {
	const inside = await runQuiet("git", ["rev-parse", "--is-inside-work-tree"], { cwd, timeout: 5_000 });
	if (inside.code !== 0 || inside.stdout.trim() !== "true") return undefined;

	const pr = await runQuiet("gh", ["pr", "view", "--json", "url", "--jq", ".url"], { cwd, timeout: 8_000 });
	if (pr.code === 0) {
		const url = pr.stdout.trim();
		if (url) return url;
	}

	return undefined;
}

async function buildMessage(pi: ExtensionAPI, ctx: ExtensionContext, options: { test?: boolean } = {}): Promise<string> {
	// Snapshot ctx/pi synchronously. In print mode pi can start teardown while async notification work is still running.
	const mention = process.env[MENTION_ENV]?.trim();
	const cwd = ctx.cwd;
	const currentModel = ctx.model;
	const model = currentModel ? `${currentModel.provider}/${currentModel.id}` : "unknown model";
	const entries = getBranch(ctx);
	const label = sessionLabel(pi);
	const conversationText = buildConversationText(entries);
	const question = extractQuestion(latestMessageText(entries, "assistant"));

	const [tmuxLocation, generatedSummary, detectedPrUrl] = await Promise.all([
		getTmuxLocation(),
		summarizeSession(ctx, entries, cwd),
		getCurrentGitHubPrUrl(cwd),
	]);
	const summary = generatedSummary;
	const prUrl = detectedPrUrl ?? extractGitHubPrUrl(conversationText);
	const icon = question && !prUrl ? "❓" : options.test ? "🧪" : "✅";
	const status = question && !prUrl ? "Pi has a question" : options.test ? "Pi notification test" : "Pi is done";

	const lines = [
		`${mention ? `${mention} ` : ""}${icon} ${status}: ${label}`,
		`Project: ${cwd}`,
		...(tmuxLocation ? [`tmux: ${tmuxLocation}`] : []),
		`Model: ${model}`,
		"",
		"Summary:",
		summary,
		...(prUrl ? ["", `PR: ${prUrl}`] : []),
		...(!prUrl && question ? ["", `Question: ${question}`] : []),
	];
	return lines.join("\n");
}

async function getWebhookUrl(): Promise<string | undefined> {
	const fromEnv = process.env[WEBHOOK_ENV]?.trim();
	if (fromEnv) return fromEnv;

	try {
		const fromFile = (await readFile(WEBHOOK_FILE, "utf8")).trim();
		return fromFile || undefined;
	} catch {
		return undefined;
	}
}

async function postToSlack(text: string): Promise<void> {
	const webhookUrl = await getWebhookUrl();
	if (!webhookUrl) return;

	const response = await fetch(webhookUrl, {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({ text }),
	});

	if (!response.ok) {
		throw new Error(`Slack webhook failed: ${response.status} ${response.statusText}`);
	}
}

async function getIMessageRecipient(): Promise<string | undefined> {
	const fromEnv = process.env[IMESSAGE_RECIPIENT_ENV]?.trim();
	if (fromEnv) return fromEnv;

	try {
		const fromFile = (await readFile(IMESSAGE_RECIPIENT_FILE, "utf8")).trim();
		return fromFile || undefined;
	} catch {
		return undefined;
	}
}

async function postToIMessage(text: string): Promise<void> {
	const recipient = await getIMessageRecipient();
	if (!recipient) return;

	const command = process.env[IMESSAGE_COMMAND_ENV]?.trim() || "imsg";
	const { stderr, code } = await runQuiet(
		command,
		["send", "--to", recipient, "--text", truncate(text, MAX_IMESSAGE_CHARS)],
		{ timeout: 30_000 },
	);
	if (code !== 0) {
		throw new Error(`iMessage notification failed: ${stderr.trim() || `exit code ${code}`}`);
	}
}

async function postConfiguredNotifications(text: string, settings: NotificationSettings): Promise<void> {
	const enabledPosts = [
		...(settings.slack ? [postToSlack(text)] : []),
		...(settings.imessage ? [postToIMessage(text)] : []),
	];
	if (enabledPosts.length === 0) return;

	const errors: string[] = [];
	const results = await Promise.allSettled(enabledPosts);
	for (const result of results) {
		if (result.status === "rejected") errors.push(compactError(result.reason));
	}
	if (errors.length > 0) throw new Error(errors.join("; "));
}

export default function notificationsExtension(pi: ExtensionAPI) {
	let agentStartedAt: number | undefined;

	pi.on("session_start", async (_event, ctx) => {
		updateNotificationStatus(ctx, getNotificationSettings(ctx));
	});

	pi.on("session_tree", async (_event, ctx) => {
		updateNotificationStatus(ctx, getNotificationSettings(ctx));
	});

	pi.on("agent_start", async () => {
		agentStartedAt = Date.now();
	});

	pi.on("agent_end", async (event, ctx) => {
		const startedAt = agentStartedAt;
		agentStartedAt = undefined;

		// Only notify for longer agent turns; quick turns are intentionally silent.
		if (!shouldNotifyForDuration(startedAt, Date.now())) return;

		// Esc aborts the in-flight turn with assistant stopReason="aborted". Do not send
		// a "Pi is done" notification for user-interrupted runs.
		if (agentEndWasAborted(event)) return;

		// If steering/follow-up messages are queued, wait for the later agent run to finish.
		if (ctx.hasPendingMessages()) return;

		const settings = getNotificationSettings(ctx);
		updateNotificationStatus(ctx, settings);
		if (!settings.imessage && !settings.slack) return;

		void (async () => {
			try {
				await postConfiguredNotifications(await buildMessage(pi, ctx), settings);
			} catch (error) {
				console.error(`[notifications] Delivery failed: ${compactError(error)}`);
				if (ctx.hasUI) {
					ctx.ui.notify(`Notification failed: ${compactError(error)}`, "error");
				}
			}
		})();
	});

	const notificationCommand = {
		description: "Show or change per-conversation notification settings",
		handler: async (args: string, ctx: ExtensionContext) => {
			const current = getNotificationSettings(ctx);
			const result = parseNotificationToggleArgs(args, current);
			if (result.settings) {
				pi.appendEntry(NOTIFICATION_SETTINGS_CUSTOM_TYPE, result.settings);
				updateNotificationStatus(ctx, result.settings);
				ctx.ui.notify(`${result.message}: ${notificationSettingsText(result.settings)}`, "info");
				return;
			}

			updateNotificationStatus(ctx, current);
			ctx.ui.notify(result.message, "info");
		},
	};

	pi.registerCommand("notifications", notificationCommand);
	pi.registerCommand("notify", notificationCommand);

	pi.registerCommand("slack-notify-test", {
		description: "Send a test Slack notification using the same summary/PR/question format",
		handler: async (_args, ctx) => {
			if (!(await getWebhookUrl())) {
				ctx.ui.notify(`Set ${WEBHOOK_ENV} or ${WEBHOOK_FILE} before testing Slack notifications`, "error");
				return;
			}

			try {
				await postToSlack(await buildMessage(pi, ctx, { test: true }));
				ctx.ui.notify("Sent Slack test notification", "info");
			} catch (error) {
				ctx.ui.notify(`Slack notification failed: ${compactError(error)}`, "error");
			}
		},
	});

	pi.registerCommand("imessage-notify-test", {
		description: "Send a test iMessage notification using the same summary/PR/question format",
		handler: async (_args, ctx) => {
			if (!(await getIMessageRecipient())) {
				ctx.ui.notify(
					`Set ${IMESSAGE_RECIPIENT_ENV} or ${IMESSAGE_RECIPIENT_FILE} before testing iMessage notifications`,
					"error",
				);
				return;
			}

			try {
				await postToIMessage(await buildMessage(pi, ctx, { test: true }));
				ctx.ui.notify("Sent iMessage test notification", "info");
			} catch (error) {
				ctx.ui.notify(`iMessage notification failed: ${compactError(error)}`, "error");
			}
		},
	});
}
