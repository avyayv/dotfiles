# Agent profiles

- The work `AGENTS.md` is the baseline used by Pi, Claude Code, Codex, and OpenCode.
- `skills/` contains only user-managed skills, shared by those runtimes.
- Claude-provided skills and its sync metadata belong in `~/.claude/skills/`, outside this repo. Never symlink that whole directory to `skills/`: Claude's sync would write vendor skills into the checkout.
- Link individual user-managed skills into `~/.claude/skills/` instead. Run `python3 agents/separate-claude-skills.py` to install those links. For a legacy checkout, run it before removing vendor skills; it preserves their files (including local additions) and metadata in Claude's directory without modifying the source checkout.
- OpenClaw is not wired to this skills directory.

The Pi shell launchers live in `zsh/functions.zsh`.
