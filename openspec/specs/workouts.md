# Workouts — Spec

> **Domain**: `workouts`
> **Status**: Active

---

## Purpose

Defines requirements for the workout entity — creation, logging, and associations.

---

## Data Model

### Workout

| Field                | Type      | Notes                                                       |
| -------------------- | --------- | ----------------------------------------------------------- |
| `id`                 | uuid      | Primary key                                                 |
| `user_id`            | uuid      | Owner (FK → auth.users)                                     |
| `performed_at`       | timestamp | When the workout occurred                                   |
| `garmin_activity_id` | uuid      | Optional FK → `garmin_activities`; null if no Garmin import |

> **Added by**: `garmin-import-training-intelligence` (2026-04-12)
> `garmin_activity_id` is a nullable FK linking a workout to its Garmin FIT import. A workout can have at most one linked Garmin activity. See `openspec/specs/garmin.md` for full import requirements.

---

## Requirements

### REQ-W1: Garmin Activity Association

A workout MAY be linked to one `garmin_activities` row via `garmin_activity_id`.
The FK MUST be nullable — most workouts will not have a Garmin import.
A workout MUST NOT have more than one linked `garmin_activities` row (enforced by the FK column + re-import guard).
The association MUST be set by the `garmin-import` Edge Function, not directly by the client.
