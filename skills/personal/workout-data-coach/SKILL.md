---
name: workout-data-coach
description: Use when Avyay asks what workout to do, asks for push/pull/legs programming, asks for gym exercise weights, asks dumbbell-only substitutions, or references his previous lift data. Always inspect the local workout SQLite data before prescribing weights.
---

# Workout Data Coach

Use this skill for Avyay's workout planning, especially short iMessage-style requests like:

- "what do i do pull day today"
- "weights pls"
- "assume dumbbells only"
- "you have my data"
- "what am I on, push pull or legs?"

## Hard rule

Before giving exercise weights, inspect Avyay's local workout data. Do not guess from memory when the DB is available.

## Data source

Primary SQLite DB:

```sh
/Users/avyay/.context-drop/managed/workouts.sqlite3
```

Relevant tables:

```sql
workouts(
  id, workout_date, name, notes, source, created_at, updated_at
)

workout_movements(
  id, workout_id, sequence, movement, weight, weight_unit,
  sets, reps, rep_scheme, assistance, assistance_value,
  assistance_unit, bodyweight_value, bodyweight_unit, notes,
  source_text, created_at
)
```

Useful read-only query:

```sh
sqlite3 -header -column /Users/avyay/.context-drop/managed/workouts.sqlite3 "
SELECT
  w.workout_date,
  w.name,
  m.sequence,
  m.movement,
  m.weight,
  m.weight_unit,
  m.sets,
  m.reps,
  m.rep_scheme,
  m.notes
FROM workouts w
JOIN workout_movements m ON m.workout_id = w.id
ORDER BY w.workout_date DESC, w.id DESC, m.sequence
LIMIT 120;
"
```

For a specific day/movement family:

```sh
sqlite3 -header -column /Users/avyay/.context-drop/managed/workouts.sqlite3 "
SELECT
  w.workout_date,
  w.name,
  m.sequence,
  m.movement,
  m.weight,
  m.weight_unit,
  m.sets,
  m.reps,
  m.rep_scheme,
  m.notes
FROM workouts w
JOIN workout_movements m ON m.workout_id = w.id
WHERE lower(w.name) LIKE '%pull%'
   OR lower(w.name) LIKE '%push%'
   OR lower(w.name) LIKE '%leg%'
   OR lower(m.movement) LIKE '%row%'
   OR lower(m.movement) LIKE '%curl%'
   OR lower(m.movement) LIKE '%pulldown%'
   OR lower(m.movement) LIKE '%bench%'
   OR lower(m.movement) LIKE '%squat%'
   OR lower(m.movement) LIKE '%press%'
ORDER BY w.workout_date DESC, w.id DESC, m.sequence
LIMIT 120;
"
```

Fallback exported JSON, if SQLite is temporarily unavailable:

```sh
/Users/avyay/.context-drop/managed/state/health-dashboard/raw/local-workouts.json
```

SQLite is the source of truth.

## Determine which PPL day he is on

1. If Avyay explicitly says the day (`push`, `pull`, `legs`), use that day.
2. Otherwise inspect recent `workouts.name` values and infer the next PPL slot:
   - last clear Push -> next Pull
   - last clear Pull -> next Legs
   - last clear Legs or Legs + Pull -> next Push
3. If the history is ambiguous, say the assumption in one short phrase, then prescribe.

## Prescribing weights

Use the latest matching movement weight as the anchor. Progress conservatively:

- If notes say it was easy/no problem and all sets/reps were completed, add the smallest normal jump: usually +5 lb total or +2.5-5 lb per dumbbell.
- If notes say tough/fried/weird/form broke, repeat the weight or drop slightly.
- For dumbbell-only requests, use the latest dumbbell movement weights when possible and substitute intelligently.
- Never give a random-looking load without tying it to the last logged load.

Useful known recent anchors as of 2026-07-15, but still query DB first:

- Pull/rows: low row 77 lb x 3x10 on 2026-06-30; seated cable row 77->88 lb x 4x10 on 2026-07-12.
- Dumbbell row: 30 lb per DB x 4x10 on 2026-06-11.
- Lat pulldown: 80 lb x 3x10 on 2026-06-11; 70->85 lb x 4x10 on 2026-07-12, notes say 85 lb fried him, cap around 80-85.
- Curls: DB curls 20 lb per DB x 3x10 tough on 2026-06-30; 22.5s then 20s on 2026-07-12, 20s felt hard after fatigue.
- Push: flat DB bench 30 lb per DB x 3x10 on 2026-06-16; 30s x11, 35s x10, x10, x5 on 2026-07-13.
- Legs: back squat 95 lb total x 4x10 on 2026-07-12; DB RDL 37.5 lb per DB x 3x10 felt weird; leg press 160 lb x 3x10; leg curl 60 lb x 4x10.

## Output format

Keep iMessage replies short. Give exactly 4 exercises unless Avyay asks otherwise.

Preferred format:

```text
checked your log. assuming <day> today:

1. <exercise>: <weight>, <sets>x<reps>
2. <exercise>: <weight>, <sets>x<reps>
3. <exercise>: <weight>, <sets>x<reps>
4. <exercise>: <weight>, <sets>x<reps>

<one short adjustment rule>
```

If only dumbbells are available, say `dumbbell-only` and avoid cable/barbell exercises.

## Tone

Be concise, direct, and lightly blunt. If you forgot to check the DB, own it immediately and correct the prescription after querying.