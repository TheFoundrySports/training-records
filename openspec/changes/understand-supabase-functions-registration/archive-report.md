# Archive Report — understand-supabase-functions-registration

**Change:** understand-supabase-functions-registration
**Date:** 2026-06-01
**Status:** ARCHIVED

## Final state

- **Implementation commits:** 5 (SHAs: f9b9470, 11eb9fa, e6e0960, f6b1e04, 5bc6fb1)
- **Lines changed:** 315
- **Verify verdict:** PASS WITH WARNINGS
- **Last commit SHA:** 5bc6fb1

## Specs synced

| Delta spec | Main spec path | Action |
|---|---|---|
| admin-create-user/spec.md | openspec/specs/admin-create-user/spec.md | created |
| use-create-user-error-parsing/spec.md | openspec/specs/use-create-user-error-parsing/spec.md | created |
| accept-invite-warning/spec.md | openspec/specs/accept-invite-warning/spec.md | created |
| create-invite-app-url-required/spec.md | openspec/specs/create-invite-app-url-required/spec.md | created |
| dev-workflow-docs/spec.md | openspec/specs/dev-workflow-docs/spec.md | created |

All 5 specs are new capabilities — no existing main specs existed to merge against. Each delta spec was copied directly as the new main spec for its capability. No conflict resolution was required.

## Open follow-ups (from verify warnings)

- [ ] Refactor EF handlers to export the handler function separately from `Deno.serve()` so Deno tests can import them directly. (suggestion in verify report — architectural improvement)
- [ ] Decide whether to migrate `useAcceptInvite` to the new `invokeFunction` helper. (warning, intentional — out of scope per proposal; confirm with user)
- [ ] Consider making the notification email text-only instead of using `generateLink(type: 'magiclink')`. (warning, design deviation — magic link email is sent instead of text-only; confirm with user if this matters)

## Notes

- Change is closed. Future changes should reference the main specs at `openspec/specs/<capability>/spec.md`.
- Apply-progress topic key retained for one more cycle in case of re-open.
- The 5 implementation commits (f9b9470 → 5bc6fb1) form the audited implementation of this change.
- Archive work (spec copy + this report) is NOT committed — left for user to review and commit separately.
- No `openspec/config.yaml` `rules.archive` constraints to apply.
- No `state.yaml` found in this project; no CLI-based archive command detected (`openspec` not in project package.json scripts).