---
name: dari
description: Use when the user wants to deploy an agent to Dari, publish an agent as a hosted API, work with dari.yml, or run any dari CLI command. Triggers on "dari.yml", "deploy an agent", "publish this agent", "dari deploy", "dari init", "hosted agent API", "agent host".
---

# Dari

Dari turns a local agent project into a hosted API. You describe the agent in a `dari.yml` manifest, run `dari deploy`, and get back a stable `agent_id` backed by sandboxed execution, durable sessions, and replayable history. Full docs: https://docs.dari.dev.

Walk the user through the steps below in order when they're starting fresh. Skip steps they've already completed. Run non-secret commands on their behalf; for commands that accept a secret (step 3), hand control back so they paste the key themselves.

## When you need more context than this skill has

Dari publishes its full docs site as concatenated plain text for LLMs:

- https://docs.dari.dev/llms.txt — index of every page, with one-line descriptions.
- https://docs.dari.dev/llms-full.txt — full content of every page concatenated.

Fetch either before guessing at fields, flags, or endpoints the skill doesn't cover inline. `llms-full.txt` is the authoritative source for the manifest schema, tool authoring, API endpoints, and harness details.

## 1. Install the CLI

```bash
brew install mupt-ai/tap/dari
```

No Homebrew? Download a release archive from https://github.com/mupt-ai/dari-cli/releases.

Verify: `dari --version`.

## 2. Authenticate

Interactive (most cases):

```bash
dari auth login
```

Opens a browser, bootstraps a personal org on first login, and caches an org API key locally.

Headless / CI:

```bash
export DARI_API_KEY=dari_...
```

Create a key from a logged-in shell with `dari api-keys create --name ci`. A subset of commands (`auth`, `org`, `api-keys`, `credentials`) still requires interactive login even with `DARI_API_KEY` set — if one of those returns a Supabase-JWT error, run `dari auth login` once.

## 3. Store runtime credentials

Dari never accepts raw API keys in `dari.yml`. The manifest references **stored credential names**; values are injected at runtime.

**Ask the user to run these themselves** so their keys stay out of your shell history and this conversation:

```bash
dari credentials add E2B_API_KEY          # paste from https://e2b.dev
dari credentials add OPENROUTER_API_KEY   # paste from https://openrouter.ai/keys
```

Every Pi-harness agent needs both: E2B runs the sandbox, OpenRouter routes LLM calls.

Piping a value is also supported: `echo "$KEY" | dari credentials add NAME --value-stdin`.

Confirm with `dari credentials list`.

## 4. Create `dari.yml`

Scaffold a new project:

```bash
dari init my-agent
cd my-agent
```

Or author by hand. Minimal manifest at the project root:

```yaml
name: my-agent
harness: pi

instructions:
  system: prompts/system.md

sandbox:
  provider: e2b
  provider_api_key_secret: E2B_API_KEY

llm:
  model: anthropic/claude-sonnet-4.6
  base_url: https://openrouter.ai/api/v1
  api_key_secret: OPENROUTER_API_KEY
```

`prompts/system.md` is the system prompt — plain markdown, no frontmatter.

The `*_secret` fields reference the credential names from step 3. Never put raw keys here.

Full manifest reference (tools, custom runtimes, per-agent skills, env vars): https://docs.dari.dev/manifest. Runnable example to copy: https://github.com/mupt-ai/dari-dev-examples/tree/main/hello-pi.

## 5. Deploy

```bash
dari deploy .
```

Returns an `agent_id` like `agt_abc123`. Each deploy publishes a new version behind that stable ID; old versions stay addressable so live sessions keep working.

Validate without uploading: `dari deploy . --dry-run`.

## 6. Send a first message

```bash
SESSION=$(dari session create --agent agt_abc123 | jq -r .id)
dari session send "$SESSION" "hello"
dari session events "$SESSION"
```

Or drive the agent over HTTP — see https://docs.dari.dev/api-reference/overview.

## Common mistakes

- **Raw API keys in `dari.yml`.** Use a stored-credential reference (step 3). The manifest only accepts names.
- **Listing `llm.api_key_secret` or `sandbox.provider_api_key_secret` under `secrets:`.** Those live in their own fields and must *not* also appear in `secrets:`.
- **Invented built-in tool names.** Valid set: `read`, `bash`, `edit`, `write`, `grep`, `find`, `ls`. Anything else fails publish.
- **Omitting `sandbox`.** Required, not optional.
- **Secret / env name doesn't match `^[A-Z_][A-Z0-9_]*$`.** Rename before publish.
- **Custom `runtime.dockerfile` set to anything other than the literal string `Dockerfile`.** Only `Dockerfile` is accepted, and the file must exist at the project root.

## Heads-up: two different things called "skills"

Dari has its own in-agent **skills** concept — markdown playbooks bundled *inside* a deployed agent, declared under `skills:` in `dari.yml` (see https://docs.dari.dev/skills/overview). That is different from the editor-tool skill you're running right now. If the user asks you to "add a skill," ask whether they mean the in-agent kind (ships with the deployed agent) or an editor-tool kind (runs in their local coding assistant).

## Going deeper

- Full manifest reference: https://docs.dari.dev/manifest
- Custom tools (TypeScript/Python handlers bundled with the agent): https://docs.dari.dev/tools/custom
- Built-in tools available in the sandbox: https://docs.dari.dev/tools/built-in
- Per-agent skills: https://docs.dari.dev/skills/overview
- HTTP API: https://docs.dari.dev/api-reference/overview
- Harnesses: https://docs.dari.dev/harnesses
- Sandbox providers: https://docs.dari.dev/sandbox/e2b
- CI-driven publishing: https://docs.dari.dev/ci-publishing
