import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";

/**
 * Auto-continue truncated turns.
 *
 * The core bug: when the model hits stopReason "length" (max output tokens), pi
 * checks compaction. If context is over threshold, it compacts — but
 * `_runAutoCompaction("threshold", false)` returns
 * `this.agent.hasQueuedMessages()`, which is false when no steering/follow-up
 * messages have been queued. The agent loop exits with no continuation.
 *
 * This extension fixes the gap by queuing a follow-up from `agent_end`, BEFORE
 * `_handlePostAgentRun` checks the queue. The existing loop path then works:
 *
 *   agent_end → extension queues followUp → _handlePostAgentRun
 *   → compaction (if threshold) returns hasQueuedMessages() → true
 *   → or compaction not needed → return hasQueuedMessages() → true
 *   → agent.continue() → followUp delivered → model continues
 *
 * One truncated response = one auto-continue because agent_end fires once per
 * low-level run.
 */

const SETTINGS_TYPE = "auto-continue-settings";
const DEFAULT_SETTINGS: Settings = { enabled: true };

type Settings = {
	enabled: boolean;
	/** Undefined means keep going until the model returns a non-length stop reason. */
	limit?: number;
};

type BranchEntry = {
	type?: string;
	id?: string;
	customType?: string;
	data?: unknown;
	message?: {
		role?: string;
		stopReason?: string;
	};
};

function branch(ctx: ExtensionContext): BranchEntry[] {
	return ctx.sessionManager.getBranch() as BranchEntry[];
}

function normalize(data: unknown): Settings | undefined {
	if (!data || typeof data !== "object") return undefined;
	const value = data as Record<string, unknown>;
	const enabled = typeof value.enabled === "boolean" ? value.enabled : undefined;
	const rawLimit = typeof value.limit === "number" && Number.isFinite(value.limit) ? Math.floor(value.limit) : undefined;
	if (enabled === undefined && rawLimit === undefined) return undefined;
	return {
		enabled: enabled ?? DEFAULT_SETTINGS.enabled,
		limit: rawLimit === undefined ? undefined : Math.min(100, Math.max(1, rawLimit)),
	};
}

function readSettings(ctx: ExtensionContext): Settings {
	let current = { ...DEFAULT_SETTINGS };
	for (const entry of branch(ctx)) {
		if (entry.type !== "custom" || entry.customType !== SETTINGS_TYPE) continue;
		current = normalize(entry.data) ?? current;
	}
	return current;
}

function limitText(limit: number | undefined): string {
	return limit === undefined ? "unlimited" : String(limit);
}

function continuationPrompt(attempt: number, limit: number | undefined): string {
	const counter = limit === undefined ? `${attempt}; no automatic cap` : `${attempt}/${limit}`;
	return [
		"Your previous response was cut off because it hit the model\u2019s maximum output token limit.",
		"",
		"Continue from exactly where you stopped:",
		"- Do not restart the answer and do not repeat work already done.",
		"- If you were in the middle of a tool call, reissue that tool call.",
		"- If you were mid-file or mid-code-block, resume at that point and write in smaller chunks so the next response is not truncated too.",
		"",
		`(auto-continuation ${counter}. Stop when the original task is genuinely finished.)`,
	].join("\n");
}

export default function autoContinueExtension(pi: ExtensionAPI) {
	let streak = 0;

	function showStatus(ctx: ExtensionContext, current: Settings): void {
		if (!ctx.hasUI) return;
		ctx.ui.setStatus("auto-continue", current.enabled ? undefined : "auto-continue: off");
	}

	pi.on("session_start", async (_event, ctx) => showStatus(ctx, readSettings(ctx)));

	pi.on("agent_end", async (_event, ctx) => {
		const current = readSettings(ctx);
		if (!current.enabled) return;

		// agent_end fires once per run. Walk backward through that run's
		// messages to find the final assistant stop reason.
		const messages = (_event as { messages?: Array<Record<string, unknown>> }).messages;
		if (!messages) return;

		let lastAssistant: Record<string, unknown> | undefined;
		for (let i = messages.length - 1; i >= 0; i--) {
			if (messages[i].role === "assistant") {
				lastAssistant = messages[i];
				break;
			}
		}
		if (!lastAssistant) return;

		const stopReason = lastAssistant.stopReason;
		if (stopReason !== "length") {
			streak = 0;
			return;
		}

		if (current.limit !== undefined && streak >= current.limit) {
			streak = 0;
			if (ctx.hasUI) {
				ctx.ui.notify(
					`Auto-continue stopped after ${current.limit} consecutive truncated turns. Reply to keep going, or raise the cap using /auto-continue limit <n>.`,
					"warning",
				);
			}
			return;
		}

		streak++;
		if (ctx.hasUI) ctx.ui.notify(`Output truncated - auto-continuing (${streak}/${limitText(current.limit)})`, "info");

		// Queue a followUp message. Pi's _handlePostAgentRun checks
		// agent.hasQueuedMessages() after compaction, so the agent loop
		// re-enters and delivers this message on its own.
		pi.sendUserMessage(continuationPrompt(streak, current.limit), { deliverAs: "followUp" });
	});

	pi.registerCommand("auto-continue", {
		description: "Toggle auto-continue on truncated (max output token) responses",
		handler: async (args: string, ctx: ExtensionContext) => {
			const current = readSettings(ctx);
			const parts = args.trim().toLowerCase().split(/\s+/).filter(Boolean);
			const action = parts[0] ?? "status";

			if (action === "status") {
				ctx.ui.notify(`Auto-continue: ${current.enabled ? "on" : "off"} (limit ${limitText(current.limit)})`, "info");
				return;
			}

			if (action === "limit") {
				if (parts[1] === "off" || parts[1] === "none" || parts[1] === "unlimited") {
					const next = { ...current, limit: undefined };
					pi.appendEntry(SETTINGS_TYPE, next);
					showStatus(ctx, next);
					ctx.ui.notify("Auto-continue limit disabled", "info");
					return;
				}

				const parsed = Number.parseInt(parts[1] ?? "", 10);
				if (!Number.isFinite(parsed) || parsed < 1 || parsed > 100) {
					ctx.ui.notify("Usage: /auto-continue limit <1-100|off>", "warning");
					return;
				}
				const next = { ...current, limit: parsed };
				pi.appendEntry(SETTINGS_TYPE, next);
				showStatus(ctx, next);
				ctx.ui.notify(`Auto-continue limit set to ${parsed}`, "info");
				return;
			}

			if (action !== "on" && action !== "off" && action !== "toggle") {
				ctx.ui.notify("Usage: /auto-continue [status|on|off|toggle|limit <1-100|off>]", "warning");
				return;
			}

			const next = { ...current, enabled: action === "toggle" ? !current.enabled : action === "on" };
			pi.appendEntry(SETTINGS_TYPE, next);
			showStatus(ctx, next);
			streak = 0;
			ctx.ui.notify(`Auto-continue ${next.enabled ? "on" : "off"}`, "info");
		},
	});
}
