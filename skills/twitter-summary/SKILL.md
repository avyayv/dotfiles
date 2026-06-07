---
name: twitter-summary
description: Use when the user asks for a Twitter/X summary, Twitter digest, or scheduled Twitter digest. Summarize relevant Twitter/X items with a single compact twitter CLI feed call, adapting topic focus by local time of day.
---

# Twitter Summary

Use the `twitter` CLI to produce a concise Twitter/X digest for Avyay.

## Core behavior

1. Check local hour first:

   ```bash
   hour=$(date +%H)
   ```

2. If local time is **09:00-18:59**, prioritize work-relevant items:
   - AI/LLM/agents news
   - infrastructure, reliability, distributed systems, databases, Kubernetes, cloud, GPUs, data centers
   - developer tools, evals, model releases, AI product launches
   - startup/founder/YC-relevant tech if genuinely useful
   - **Exception:** include genuinely big NBA/basketball news or major general world news even during work hours. Keep it brief and only include it if it is important enough that Avyay would plausibly want to know immediately.

3. Otherwise, include a broader mix:
   - still include important AI/tech items
   - basketball/NBA/Lakers/interesting sports items are allowed
   - major general world news is allowed
   - funny, culturally relevant, or high-signal weird internet items are allowed
   - avoid pure low-signal gossip unless unusually funny or relevant

4. Output format must be:
   - `Brief summary` first: 3-6 bullets with the main takeaways.
   - `Tweets` second: the actual tweets, numbered, with author, time, URL, tweet text, and a short note on why it matters.

## Scheduled iMessage delivery

If the prompt says this is Avyay's scheduled hourly Twitter digest and includes standing authorization to send to iMessage chat id 1, you may send the digest without asking for another confirmation. This exception applies only to the scheduled Twitter summary job.

The scheduled job should still produce the same content shape: brief summary first, then actual tweets with links. Keep the iMessage concise and phone-readable, targeting under ~1800 characters.

## CLI rules

- Scheduled digests are stateless/fresh runs. Do not rely on prior conversation history.
- Use exactly one main Twitter collection call per digest, capped at 50 tweets:

  ```bash
  twitter -c feed -t following -n 50 --json
  ```

- Do not run broad searches for the scheduled digest. Rank from that one feed result.
- If checking the sent-tweet log for dedupe, read only the last 40 lines.
- Keep tool output small. Avoid follow-up detail fetches unless a candidate is clearly top-tier and the feed text is unusably truncated; if needed, fetch at most one tweet detail:

  ```bash
  twitter tweet <tweet_id> -n 5 --json
  ```

- Check auth only if the feed command fails:

  ```bash
  twitter status
  ```

- Do not post, reply, retweet, like, bookmark, follow, or unfollow unless the user explicitly asks and confirms.
- For summaries, read-only commands only: `feed`, `tweet`, `show`, `user`, `user-posts`, `likes`, `list`.

## Suggested collection workflow

For both work hours and off hours, gather candidates with one call:

```bash
twitter -c feed -t following -n 50 --json
```

Then dedupe and rank from those results only.

### Work hours: 09:00-18:59

Prefer tweets with concrete news, links, numbers, technical detail, credible authors, or useful operator lessons. Prioritize AI, agents, infra, devtools, startups, product, and technical research. Avoid generic hype.

During work hours, include non-work items only if they appear in the feed result and are genuinely big: major NBA/basketball news, Lakers/Spurs/Wemby items Avyay would care about immediately, or major world news.

### Off hours: 19:00-08:59

Still include important AI/tech. Basketball/NBA/Lakers/Spurs/Wemby, funny, culture, or weird-internet items are allowed if they appear in the feed result and are genuinely interesting or entertaining.

## Ranking criteria

Prefer tweets that are:

- timely and non-obvious
- actionable for a founder/building AI products
- technically specific rather than vague
- from credible sources or getting meaningful engagement
- useful context for Avyay/Dari
- genuinely major NBA/basketball or world news that clears a high importance bar, even during work hours

Deprioritize:

- engagement bait
- repeated takes with no new information
- pure dunking, outrage, or politics unless directly tech/business relevant
- stale tweets unless they explain an ongoing story

## URL format

For a tweet from `@author` with id `123`, render:

```text
https://x.com/author/status/123
```

Remove the leading `@` from the author in the URL.

## Final response template

```markdown
## Brief summary

- ...
- ...
- ...

## Tweets

1. **@author** · time
   https://x.com/author/status/id
   > tweet text

   Why it matters: ...

2. **@author** · time
   https://x.com/author/status/id
   > tweet text

   Why it matters: ...
```
