## Table `tournaments`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `name` | `text` |  |
| `game_type` | `text` |  |
| `stat_template` | `jsonb` |  |
| `status` | `text` |  |
| `created_by` | `uuid` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `teams`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `tournament_id` | `uuid` |  |
| `name` | `text` |  |
| `seed` | `int4` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `players`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `team_id` | `uuid` |  |
| `name` | `text` |  |
| `role` | `text` |  Nullable |
| `jersey_number` | `text` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `stages`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `tournament_id` | `uuid` |  |
| `name` | `text` |  |
| `format` | `text` |  |
| `sequence_order` | `int4` |  |
| `created_at` | `timestamptz` |  Nullable |

## Table `matches`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `stage_id` | `uuid` |  |
| `team_a_id` | `uuid` |  Nullable |
| `team_b_id` | `uuid` |  Nullable |
| `team_a_score` | `int4` |  Nullable |
| `team_b_score` | `int4` |  Nullable |
| `status` | `text` |  |
| `winner_id` | `uuid` |  Nullable |
| `scheduled_at` | `timestamptz` |  Nullable |
| `completed_at` | `timestamptz` |  Nullable |
| `match_number` | `int4` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `bracket_nodes`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `stage_id` | `uuid` |  |
| `match_id` | `uuid` |  Nullable |
| `slot_number` | `int4` |  |
| `winner_advances_to` | `uuid` |  Nullable |
| `loser_drops_to` | `uuid` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `match_stats`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `match_id` | `uuid` |  |
| `player_id` | `uuid` |  |
| `stat_key` | `text` |  |
| `value` | `numeric` |  |
| `updated_at` | `timestamptz` |  Nullable |

## Table `event_log`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `tournament_id` | `uuid` |  Nullable |
| `user_id` | `uuid` |  Nullable |
| `action` | `text` |  |
| `payload` | `jsonb` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `user_roles`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `user_id` | `uuid` |  |
| `role` | `text` |  |
| `created_at` | `timestamptz` |  Nullable |

