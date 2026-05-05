---
name: nba-cli
description: Guidance for AI agents working on this repository's Go-based NBA CLI and Python MCP server. Use when adding commands, testing live NBA/DARKO functionality, installing the CLI, or documenting behavior.
---

# NBA CLI / MCP Agent Skill

This repository exposes NBA data in two ways:

- `cli/` — Go CLI binary named `nba`. No Python dependency.
- `mcp/` — Python MCP server using `nba-api`.

## Non-negotiables

- CLI output is always JSON.
- Do not add table, pretty-table, or non-JSON output modes.
- Do not reintroduce Python into `cli/`.
- Run `gofmt` before committing Go changes.
- Update `README.md` and `cli/README.md` when commands change.

## CLI build / install

From repo root:

```bash
cd cli
gofmt -w main.go
go test ./...
go build -o nba .
```

Install globally for this user:

```bash
cd cli
gofmt -w main.go
go build -o /Users/avyay/.local/bin/nba .
chmod +x /Users/avyay/.local/bin/nba
```

Verify:

```bash
which nba
nba live-game-summary
```

## CLI commands

### Live NBA

```bash
nba live-scores
nba live-game-summary
nba live-boxscore <game_id>
nba live-play-by-play <game_id>
```

Live feeds use:

```text
https://cdn.nba.com/static/json/liveData/scoreboard/todaysScoreboard_00.json
https://cdn.nba.com/static/json/liveData/boxscore/boxscore_<game_id>.json
https://cdn.nba.com/static/json/liveData/playbyplay/playbyplay_<game_id>.json
```

### DARKO

```bash
nba darko-leaderboard [limit]
nba darko-player <name|nba_id>
```

DARKO is parsed from the embedded Svelte payload at `https://www.darko.app/`. This is unofficial and may break if DARKO changes the frontend payload. Update both:

- `cli/main.go`
- `mcp/endpoints/darko.py`

### NBA Stats

```bash
nba get-team-id <team name>
nba get-player-id <player name>
nba player-career-stats <player_id>
nba player-game-log <player_id>
nba league-dash-player-stats <team_id> [Advanced|Basic]
nba team-standings
nba team-game-log <team_id>
nba team-roster <team_id>
nba league-dash-team-stats [Advanced|Basic]
nba league-schedule <team_id>
nba game-win-probability <game_id>
nba game-boxscore <game_id>
nba league-dash-lineups <team_id> [Advanced|Basic] [2-5]
```

Stats feeds use `https://stats.nba.com/stats`. These endpoints require browser-like headers and often return `500`, `EOF`, or timeouts when required default parameters are missing.

## MCP server notes

MCP tools are registered in `mcp/server.py` and exported from `mcp/endpoints/__init__.py`.

Live tools:

- `live_scores`
- `live_game_summary`
- `live_boxscore`
- `live_play_by_play`

DARKO tools:

- `darko_leaderboard`
- `darko_player`

When adding a new MCP endpoint:

1. Add implementation under `mcp/endpoints/`.
2. Export it from `mcp/endpoints/__init__.py`.
3. Register it in `mcp/server.py`.
4. Add docs to `README.md`.

## Testing checklist

From `cli/`:

```bash
gofmt -w main.go
go test ./...
```

Smoke-test CLI commands:

```bash
nba live-game-summary
nba live-boxscore 0022400123
nba live-play-by-play 0022400123
nba darko-leaderboard 2
nba darko-player Jokic
nba get-team-id "Los Angeles Lakers"
nba get-player-id "LeBron James"
nba player-career-stats 2544
nba league-dash-team-stats Advanced
nba league-schedule 1610612747
nba game-boxscore 0022400123
nba league-dash-lineups 1610612747 Advanced 2
```

If not globally installed, use `go run . <command>` from `cli/`.

Test MCP imports/compile from `mcp/`:

```bash
uv run python -m compileall server.py endpoints
```

## Known edge case

`game-win-probability` relies on an NBA Stats feed that is not available for every game. The CLI/MCP should return JSON with an error field instead of crashing, for example:

```json
{
  "gameId": "0022400123",
  "error": "Win probability feed unavailable for this game",
  "detail": "..."
}
```
