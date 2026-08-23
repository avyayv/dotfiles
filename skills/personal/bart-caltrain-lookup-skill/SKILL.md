---
name: bart-caltrain-lookup-skill
description: Find BART or Caltrain routes, next departures, delays, and arrival estimates from official GTFS feeds and agency realtime APIs. Use when the user asks for BART/Caltrain transit help right now or asks where transit schedule/realtime data came from.
---

# BART / Caltrain Lookup Skill

Use official agency data first. Search snippets and generic map answers are weaker than GTFS + realtime ETD/alerts.

## Fast Workflow

1. Clarify only if needed: origin, destination, and whether `rn` means current local time.
2. Identify likely agencies for the geography.
   - Bay Area examples: BART, Caltrain, SFMTA/Muni, AC Transit, VTA.
3. Prefer realtime for departures/delays, static GTFS for schedules/stop ordering.
4. Use the agency timezone, not UTC. For Bay Area, use Pacific time.
5. Give the user the next best route, one backup, and say whether it is live or scheduled.

## Finding Data Sources

Try in this order:

1. Agency developer docs or GTFS page.
   - Search/query terms: `<agency> GTFS`, `<agency> realtime API`, `<agency> developer departures API`.
2. Probe common GTFS/static feed locations with `curl -I` or `curl -L -I`.
3. If an agency uses a vendor, check Transitland/MobilityData/Trillium references, then prefer the canonical agency-hosted URL if available.
4. Verify the response is a real GTFS zip by downloading and checking for `stops.txt`, `trips.txt`, `stop_times.txt`, `calendar.txt`, and `calendar_dates.txt`.

Useful Bay Area starting points:

```text
BART static GTFS: https://www.bart.gov/dev/schedules/google_transit.zip
BART realtime ETD: https://api.bart.gov/api/etd.aspx?cmd=etd&orig=<STATION>&json=y&key=$BART_API_KEY
BART advisories: https://api.bart.gov/api/bsa.aspx?cmd=bsa&json=y&key=$BART_API_KEY
Caltrain static GTFS: https://data.trilliumtransit.com/gtfs/caltrain-ca-us/caltrain-ca-us.zip
511 SF Bay transit docs/token: https://511.org/open-data/transit and https://511.org/open-data/token
Caltrain live GTFS-RT via 511: https://api.511.org/transit/tripupdates?api_key=$SFBAY_511_API_KEY&agency=CT
Caltrain live vehicle positions via 511: https://api.511.org/transit/vehiclepositions?api_key=$SFBAY_511_API_KEY&agency=CT
Caltrain live alerts via 511: https://api.511.org/transit/servicealerts?api_key=$SFBAY_511_API_KEY&agency=CT
Caltrain live stop ETAs via 511 SIRI: https://api.511.org/transit/StopMonitoring?api_key=$SFBAY_511_API_KEY&agency=CT&stopcode=<STOP_CODE>&format=json
SFMTA static GTFS: https://gtfs.sfmta.com/transitdata/google_transit.zip
```

Do not hardcode private API keys in notes, prompts, or replies. If an API key is needed, use an env var or the agency's documented public/demo key.

511 SF Bay live transit data is official and free but token-gated. Start at `https://511.org/open-data`; the current token form is `https://511.org/open-data/token`, but it is a JS/session-gated Drupal antibot + reCAPTCHA v3 form, so use a normal browser. If the deep link fails, click **511 Open Data → Request a Token** from the site navigation. Use `$SFBAY_511_API_KEY`; never store or paste the token in notes. The Caltrain operator/agency code is `CT` (511 lists Caltrain as `agency_code: CT` with realtime enabled).

## GTFS Routing Checklist

Download and inspect:

```bash
curl -L -o feed.zip '<gtfs-url>'
unzip -q feed.zip -d feed
ls feed
```

Core files:

- `stops.txt`: station/stop ids and names.
- `routes.txt`: line names/colors.
- `trips.txt`: trips and headsigns.
- `stop_times.txt`: ordered stops per trip.
- `calendar.txt`: regular service days.
- `calendar_dates.txt`: exceptions/holidays.
- `transfers.txt`: transfer rules, when present.

Algorithm for a quick answer:

1. Resolve origin/destination to stop ids. For cities without stations, choose nearby major stations and say so.
2. Determine active `service_id`s for today:
   - weekday column in `calendar.txt` must be `1` and date within range.
   - apply `calendar_dates.txt`: exception `1` adds service, exception `2` removes it.
3. Parse `stop_times.txt`; GTFS times can exceed `24:00:00` after midnight.
4. Direct trip: find an active trip where origin appears before destination and departure is after now.
5. Transfer trip: build an earliest-arrival search over stop events, with 2-5 minutes transfer slack unless `transfers.txt` says otherwise.
6. For realtime APIs, use live ETD/delay for departure truth, then static GTFS for downstream arrival if realtime arrivals are unavailable.

## Reply Style

Be concise and confidence-calibrated:

```text
best rn: Fremont BART 9:09am direct Green line to Daly City/SF.
Embarcadero ~9:54, Montgomery ~9:56.

live BART ETD says delay 0. backup is 9:29am.
```

If using schedule-only data:

```text
schedule-only, not live: next Caltrain from Lawrence northbound is 9:37pm, arrives SF 10:46pm.
```

## Gotchas

- `direction` labels in GTFS can be weird; trust stop order, not direction text alone.
- Platform stop ids may differ from parent station ids. Use child stop ids for `stop_times.txt`.
- Some agencies publish static GTFS but realtime separately as GTFS-RT protobufs or custom XML/JSON. In the Bay Area, 511.org is often the canonical realtime layer.
- PDFs are last resort. They are often stale and harder to validate.
- Always distinguish live ETD, static schedule, and inferred arrival.
