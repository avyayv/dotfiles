# Personal agent instructions

## Dumbass projects

When Avyay asks for a quick throwaway game, meme app, clone-ish toy, or other "dumbass project," create it under `/Users/avyay/code/dumbass-projects` by default unless he gives another path.

## Workout requests

When Avyay asks for a workout, lift weights, push/pull/legs day, or dumbbell-only substitutions, use the `workout-data-coach` skill and inspect `/Users/avyay/.context-drop/managed/workouts.sqlite3` before prescribing weights. Give exactly four exercises with weights by default unless he asks otherwise.

## Personal Context Drop jobs

Personal digest Context Drop/tmux tabs are disposable, but only the digest subagent should close its own current tmux window after notifying or reporting a blocker. A coordinating agent must not clean up digest tabs using numeric tmux targets because reindex races can kill unrelated tabs.

If Avyay asks to clean up “dead tabs,” first list exact candidate tab names and ask for confirmation. Do not infer broadly or bulk-close tabs.

## Local links from this VM

When giving Avyay clickable links for services running on this machine, replace `localhost` or `127.0.0.1` with `avyays-mac-mini.tailf3cee5.ts.net`, preserving the scheme and port. Keep loopback hostnames only in commands or configuration that execute inside the VM.

When creating or surfacing something for Avyay to open on his phone, include the direct clickable URL in the response. Prefer browser-accessible tailnet links for generated reports and artifacts.

For Vite servers exposed through the tailnet, either use a plain static server or allow `avyays-mac-mini.tailf3cee5.ts.net` in both `server.allowedHosts` and `preview.allowedHosts`.

## Hetzner deployment target

Default production box for apps Avyay tells you to deploy. When he says “deploy X” or “put X on the server,” put it on the Hetzner instance below unless he says otherwise.

- Server: `77.42.79.72` (ubuntu-8gb-hel1-1, Ubuntu 24.04, 8GB RAM, 75GB disk, Helsinki)
- SSH user: `root` (password auth and key auth both enabled)
- Main SSH key on this Mac: `~/.ssh/id_ed25519` (passphrase-protected; load via `eval $(ssh-agent -s)` + `ssh-add ~/.ssh/id_ed25519` in the user's shell first)
- Automation/deploy key (no passphrase, for scripts/launchd/CI): `~/.ssh/health-deploy-ed25519`
- SSH access pattern: `ssh root@77.42.79.72`, `rsync -e "ssh -i ~/.ssh/<deploy-key> -o BatchMode=yes" ...`

Deployment pattern on the box (follow it for new apps):

- Reverse proxy: Traefik v3 in Docker, listens on 80/443, auto Let's Encrypt TLS (`letsencrypt` cert resolver), config at `/home/avyay/traefik/` (`docker-compose.yml` + `traefik.yml`)
- Every app is a Docker container on the shared `traefik-network`, deployed via docker-compose under `/home/avyay/<domain>/` with Traefik labels (`Host(...)` rule, entrypoints web/websecure, `tls.certresolver=letsencrypt`)
- Existing apps: `avyayv.com` (main personal site, SvelteKit static build), `blog.avyayv.com`, `health.avyayv.com`, `tinder.vishvesha.com`, `person.vishvesha.com` (each is `/home/avyay/<domain>/`)
- GitHub Pages retired: `avyayv.com` used to be on GH Pages (repo `avyayv/avyayv.github.io`); the deploy workflow is disabled (`.github/workflows/main.yml.disabled`) and DNS points at the Hetzner box now. Default deploy target is Hetzner.
- DNS: all A records for `avyayv.com` + `www` point to `77.42.79.72`; Traefik provisions TLS certs automatically. After a rename of a subdomain add/repoint the A record (GoDaddy API token in api-keys env file), then `cd /home/avyay/traefik && docker compose restart traefik` if the cert doesn't self-issue within a few minutes.

Deploy a static site: rsync files into `/home/avyay/<domain>/public/` (nginx serves that dir via a volume mount into the container), then `cd /home/avyay/<domain> && docker compose up -d --build` if the image or compose file changed.

DNS for `avyayv.com` is managed at GoDaddy (API token in `/Users/avyay/.config/api-keys/env.zsh` as `GODADDY_API_TOKEN`; use `Authorization: Bearer <token>`). When deploying a new subdomain, add the A record via `PUT https://api.godaddy.com/v1/domains/avyayv.com/records/A/<sub>` with `[{"data":"77.42.79.72","ttl":600}]`, then restart traefik (`cd /home/avyay/traefik && docker compose restart traefik`) if the Let's Encrypt cert doesn't self-issue within a few minutes.
