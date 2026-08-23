---
name: twitter-scroller-skill
description: >-
  Use when the user asks to scroll or summarize Twitter/X, produce a Twitter
  digest, or run the scheduled Twitter digest. Use xurl conservatively because
  X API reads cost money: one small timeline call per digest, no broad searches
  or extra detail calls by default.
---

# Twitter Scroller Skill

Use the `xurl` CLI to produce a concise Twitter/X digest for Avyay.

Important: `xurl` talks to the paid X API. Treat every timeline/search/read/user/raw `/2/*` request as billable. Minimize calls and never probe the API casually.

## Core behavior

1. Check local hour first:

   ```bash
   hour=$(date +%H)
   ```

2. Avyay likes AI / software / infra content that's good. Personally, he likes golf and basketball content. He's also interested in the world cup at the moment. Focus on tweets in these verticals, but feel free to include other really interesting stuff like world news if the'res anything significant. 


## Cost and API-call rules

- Scheduled digests are stateless/fresh runs. Do not rely on prior conversation history.
- Use **exactly one API-backed collection call** per digest by default:

  ```bash
  xurl timeline -n 25
  ```

- If Avyay explicitly asks for a deeper scroll, you may raise the same single call to at most 50 posts:

  ```bash
  xurl timeline -n 50
  ```

- Do not make a second collection call if the timeline is boring, sparse, or misses a topic. Summarize fewer tweets instead.
- Do not run broad searches for the scheduled digest. Avoid `xurl search` unless Avyay explicitly asks for search on a specific query/topic; if allowed, run one search only and use `-n 10` unless he asks for more.
- Do not fetch tweet detail by default. Avoid `xurl read`, raw `/2/tweets/...`, `xurl user`, `xurl likes`, `xurl bookmarks`, `xurl mentions`, `xurl following`, etc. unless Avyay explicitly asks or a single candidate is clearly top-tier and the timeline text is unusably truncated. If absolutely needed, fetch at most one detail:

  ```bash
  xurl read <tweet_id_or_url>
  ```

- If the timeline command fails, do not retry repeatedly. Check local auth/config only:

  ```bash
  xurl auth status
  ```

  Do **not** use `xurl whoami` as an auth check; it hits the X API.
- Keep tool output small. Do not use `--verbose` or raw expanded API endpoints unless explicitly debugging xurl itself.
- `xurl` supports write/mutation commands. Do not post, reply, quote, repost, like, bookmark, follow, unfollow, block, mute, DM, delete, or otherwise mutate Twitter/X.

## Suggested collection workflow

For normal digests, gather candidates with one call:

```bash
xurl timeline -n 25
```

Then dedupe and rank from those results only. If there are fewer than 3 good items, produce a shorter digest; do not spend another API call to improve it.
