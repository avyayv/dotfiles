---
name: google-workspace-skill
description: Use when the user asks to find, read, or manage Google Drive, Google Docs, Gmail, or Dari company/internal workspace information. Primary access is via the local gog CLI; use the mounted/rclone Shared Drive only as a fallback.
---

# Google Workspace Skill

When the user asks about Google Workspace content, including Drive, Docs, Gmail, or Dari company/internal information, use `gog`/gogcli as the primary source of truth.

Because this agent's shell is often non-login `bash` while the gog file-keyring password is loaded from zsh startup files, run gog commands through zsh unless the environment already has the keyring password:

```bash
zsh -lc 'gog --account avyay@mupt.ai --json --no-input drive search "query" --max 20'
```

## Access rules

- Treat contents as private company/internal information.
- Prefer `gog` for all Drive reads/writes, metadata lookups, downloads, uploads, Docs exports, and sharing checks.
- Use stable output flags for agent work: `--json` or `--plain`, plus `--no-input`.
- For read-only inspection, prefer `--json` and avoid downloading large files unless needed.
- Be careful with destructive operations. Do not delete, move, rename, overwrite, or share Drive files unless the user explicitly asks for that specific change.
- Do not expose tokens, OAuth client secrets, keyring passwords, access tokens, or private Drive URLs in chat/logs.

## Common gog Drive commands

List shared drives:

```bash
zsh -lc 'gog --account avyay@mupt.ai --json --no-input drive drives'
```

Search Drive:

```bash
zsh -lc 'gog --account avyay@mupt.ai --json --no-input drive search "Investor Updates" --max 20'
```

List a folder by ID:

```bash
zsh -lc 'gog --account avyay@mupt.ai --json --no-input drive ls --parent <folderId> --max 100'
```

Get file metadata:

```bash
zsh -lc 'gog --account avyay@mupt.ai --json --no-input drive get <fileId>'
```

Download/export a file:

```bash
zsh -lc 'gog --account avyay@mupt.ai --json --no-input drive download <fileId> --format md --out /tmp/file.md'
```

Upload a file to a folder:

```bash
zsh -lc 'gog --account avyay@mupt.ai --json --no-input drive upload /path/to/file.md --parent <folderId>'
```

Replace an existing Drive file's contents, only when explicitly requested:

```bash
zsh -lc 'gog --account avyay@mupt.ai --json --no-input drive upload /path/to/file.md --replace <fileId>'
```

Create a folder:

```bash
zsh -lc 'gog --account avyay@mupt.ai --json --no-input drive mkdir "Folder Name" --parent <folderId>'
```

Print a web URL from a file/folder ID:

```bash
zsh -lc 'gog --account avyay@mupt.ai --plain --no-input drive url <fileId>'
```

## Common gog Gmail commands

Use Gmail access for customer/investor/outreach context only when the user asks. For read-only Gmail commands, include `--gmail-no-send` by default as an agent safety guard. Do not send, reply, forward, archive, trash, mark read/unread, or mutate labels unless the user explicitly asks for that exact action.

Search Gmail threads:

```bash
zsh -lc 'gog --account avyay@mupt.ai --gmail-no-send --json --no-input gmail search "from:someone@example.com newer_than:30d" --max 10'
```

Get one message, sanitized for agent reading:

```bash
zsh -lc 'gog --account avyay@mupt.ai --gmail-no-send --json --no-input gmail get <messageId> --sanitize-content'
```

Get a whole thread, sanitized:

```bash
zsh -lc 'gog --account avyay@mupt.ai --gmail-no-send --json --no-input gmail thread get <threadId> --sanitize-content'
```

Get a whole thread with full bodies when needed:

```bash
zsh -lc 'gog --account avyay@mupt.ai --gmail-no-send --json --no-input gmail thread get <threadId> --full --sanitize-content'
```

Print Gmail web URLs for thread IDs:

```bash
zsh -lc 'gog --account avyay@mupt.ai --gmail-no-send --plain --no-input gmail url <threadId>'
```

Download an attachment only when needed:

```bash
zsh -lc 'gog --account avyay@mupt.ai --gmail-no-send --json --no-input gmail attachment <messageId> <attachmentId> --out /tmp/attachment'
```

Draft/send safety:

- Prefer drafting text in chat or a local temp file first.
- Use `--dry-run` before any send/reply.
- Remove `--gmail-no-send` only after the user explicitly confirms sending.

Send example, only after explicit confirmation:

```bash
zsh -lc 'gog --account avyay@mupt.ai --json --no-input gmail send --to=person@example.com --subject="Subject" --body-file=/tmp/email.txt'
```

Reply example, only after explicit confirmation:

```bash
zsh -lc 'gog --account avyay@mupt.ai --json --no-input gmail send --reply-to-message-id=<messageId> --body-file=/tmp/reply.txt'
```

## Google Drive Folders

Known top-level Drive folders include:

- `Agent Managed Markdown` — agent-managed Markdown-only workspace; keep contents as `.md` files unless the user explicitly changes this convention.
- `Experiments`
- `Investor Updates`
- `Logos`
- `Meeting Recordings`
- `Pivot Hell Ideas`
- `SAFEs`
- `Scripts`
- `YC Documents`
- `[Active] dari.dev - Deployment`
- `[Active] dari.dev - Router`
- old-pivot folders such as `[Old Pivot] AI Sports Podcast`, `[Old Pivot] General Dari Browser Agents`, and `[Old Pivot] Insurance Dari Browser Agents`
