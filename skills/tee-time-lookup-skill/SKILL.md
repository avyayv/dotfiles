---
name: tee-time-lookup-skill
description: Use when the user asks for golf tee time availability, costs, green-fee class, or public tee-time lookups, especially Bay Area courses such as Shoreline, Spring Valley/Milpitas, Sunnyvale, Callippe, Corica Park, Cinnabar Hills, Wente, Poppy Ridge, and Los Lagos. Prefer the local pp-tee-times CLI when present; never invent availability or prices.
---

# Tee Time Lookup Skill

Use this for read-only tee-time availability and cost lookups. Do not book tee times, log in, use credentials, or submit payment unless the user explicitly asks and the action is safe.

## Preferred path

Check for the local CLI first:

```bash
command -v pp-tee-times && pp-tee-times version
```

If it exists, use concrete date inputs:

```bash
pp-tee-times search --date YYYY-MM-DD --players N --courses shoreline,spring-valley,sunnyvale,callippe,corica,cinnabar,wente,poppy-ridge,los-lagos --window HH:MM-HH:MM
```

Use `--json` when you need machine-readable output. Course aliases include:

- `shoreline` / `shoreline-golf-links`
- `spring-valley` / `milpitas` / `spring-valley-golf-course`
- `sunnyvale` / `sunnyvale-golf-course`
- `callippe` / `callippe-preserve` / `callippe-preserve-golf-course`
- `corica` / `corica-park` / `corica-park-south` / `corica-park-north`
- `cinnabar` / `cinnabar-hills` / `cinnabar-hills-golf-club`
- `wente` / `wente-vineyards` / `the-course-at-wente-vineyards`
- `poppy-ridge` / `poppy` / `poppy-ridge-golf-course`
- `los-lagos` / `los-lagos-golf-course`

`corica` and `corica-park` expand to both South and North course feeds.

If date or player count is missing, ask for it. Prefer `YYYY-MM-DD`; vague dates should be resolved to a concrete date before lookup and reported back.

## Safety and answer rules

- Availability can change quickly. Include the lookup time when useful.
- Never invent availability, prices, cart fees, or rate classes.
- Label the source/provider for every result: `Club Caddie`, `TeeItUp/GolfNow`, `Total e Integrated`, and `public rate page` when using rate classification.
- If a source fails or is blocked, say which source failed and avoid filling gaps from memory.
- Availability only. Do not attempt bookings or logins.

## Source notes

### Shoreline Golf Links

Source site: `https://shorelinelinks.com/`

Public widget provider: `Club Caddie`

Observed flow:

- GET `https://apimanager-cc11.clubcaddie.com/webapi/view/bcfdabab?SetSessionIdInLocalStorage=true`
- Read the `Session-Id` response header.
- POST `https://apimanager-cc11.clubcaddie.com/webapi/TeeTimes` with public form fields such as:
  - `date=MM/DD/YYYY`
  - `player=N`
  - `holes=any`
  - `ratetype=any`
  - `HoleGroup=front`
  - `CourseId=103422`
  - `apikey=bcfdabab`
- Response is HTML. Slot data is in hidden `slot` values containing URL-encoded JSON with `StartTime`, `PlayersAvailable`, `MinimumPlayersAvailable`, and `PricingPlan`.

Do not print or preserve the throwaway session cookie/header.

### Spring Valley / Milpitas

Source site: `https://www.springvalleygolfcourse.com/teetimes/`

Provider: `TeeItUp/GolfNow`

Public API:

```bash
curl -H 'x-be-alias: spring-valley-golf-course' \
  'https://phx-api-be-east-1b.kenna.io/alias/spring-valley-golf-course/facilities'

curl -H 'x-be-alias: spring-valley-golf-course' \
  'https://phx-api-be-east-1b.kenna.io/v2/tee-times?date=YYYY-MM-DD&facilityIds=160'
```

Facility ID observed: `160`.

Rate classification source: `https://www.springvalleygolfcourse.com/golf/greens-fees/`

For 2026 public rates, June starts are Mid-Day `2:30`, Afternoon `4:00`, Late-Day `6:00`, sunset around `8:30`. Sat/Sun/Holiday public adult rates are Regular `$73`, Mid-Day `$63`, Afternoon `$40`, Late-Day `$31`; shared cart is `$20/person`, solo rider surcharge `$10`.

### Sunnyvale Golf Course

Source site: `https://www.sunnyvalegolfcourses.com/`

Provider: `TeeItUp/GolfNow`

Public API:

```bash
curl -H 'x-be-alias: sunnyvale-golf-course' \
  'https://phx-api-be-east-1b.kenna.io/alias/sunnyvale-golf-course/facilities'

curl -H 'x-be-alias: sunnyvale-golf-course' \
  'https://phx-api-be-east-1b.kenna.io/v2/tee-times?date=YYYY-MM-DD&facilityIds=1497'
```

Facility ID observed: `1497`.

### Additional Bay Area Courses

The local CLI supports these public source-backed feeds:

- Callippe Preserve: `Total e Integrated`; read-only GET endpoint `https://courseco-gateway.totaleintegrated.net/Booking/Teetimes`, course ID `CALLIPPE PRES`. Source site: `https://www.playcallippe.com/tee-times`. Public rates page: `https://www.playcallippe.com/golf-course/course-rates`.
- Corica Park South: `TeeItUp/GolfNow`; alias `corica-park-south`, facility ID `8136`.
- Corica Park North: `TeeItUp/GolfNow`; alias `corica-park-north`, facility ID `514`.
- Cinnabar Hills: `TeeItUp/GolfNow`; alias `cinnabar-hills-golf-club`, facility ID `3821`.
- Wente Vineyards: `TeeItUp/GolfNow`; alias `the-course-at-wente-vineyards`, facility ID `432`.
- Poppy Ridge: `TeeItUp/GolfNow`; alias `poppy-ridge-golf-course`, facility ID `106`. Public rates page: `https://poppyridgegolf.ncga.org/rates`.
- Los Lagos: `TeeItUp/GolfNow`; alias `los-lagos-golf-course`, facility ID `1450`. Public rates page: `https://www.playloslagos.com/golf-course/rates`.

For TeeItUp/GolfNow, use:

```bash
curl -H 'x-be-alias: ALIAS' \
  'https://phx-api-be-east-1b.kenna.io/alias/ALIAS/facilities'

curl -H 'x-be-alias: ALIAS' \
  'https://phx-api-be-east-1b.kenna.io/v2/tee-times?date=YYYY-MM-DD&facilityIds=FACILITY_ID'
```

Prices are source-backed only when the tee-time row exposes `greenFeeWalking`, `greenFeeCart`, or Total e `PerPlayerCost`. If a source returns availability without a confident price, report `unknown`.
