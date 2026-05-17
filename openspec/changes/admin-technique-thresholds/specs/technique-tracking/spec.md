# Delta for technique-tracking

## ADDED Requirements

### Requirement: Admin Technique Threshold UI (REQ-TT-A1)

The system MUST provide an admin interface at `/admin/technique-thresholds` that allows coaches to view and update the practice threshold for each BJJ technique.

The admin page MUST display all techniques in a table sorted by category then name, showing the technique name, category, and a numeric input for the current threshold value. Each row MUST have a Save button that persists the threshold via an upsert to the `technique_learning_thresholds` table.

#### Scenario: Page loads with techniques and thresholds

- GIVEN an authenticated admin user navigates to `/admin/technique-thresholds`
- WHEN the page loads
- THEN the system fetches all `bjj_techniques` rows joined with `technique_learning_thresholds`
- AND displays each technique as a table row with name, category, and threshold input
- AND techniques without an existing threshold row show the default value of 10 in the input

#### Scenario: Admin saves updated threshold for existing row

- GIVEN an admin is on `/admin/technique-thresholds` viewing a technique that already has a threshold row
- WHEN the admin changes the numeric input and clicks Save
- THEN the system performs an UPSERT to `technique_learning_thresholds` with `technique_id` and `required_practices`
- AND shows a loading state during the request
- AND invalidates the `['technique-learning-status']` query cache on success
- AND the input returns to its saved value

#### Scenario: Admin saves threshold for technique with no existing row

- GIVEN an admin is on `/admin/technique-thresholds` viewing a technique with no threshold row
- WHEN the admin sets a value and clicks Save
- THEN the system performs an UPSERT (not INSERT) so the row is created if absent
- AND the threshold input reflects the new value

#### Scenario: Threshold validation rejects values below 1

- GIVEN an admin enters a value of 0 or negative in a threshold input
- WHEN the admin clicks Save
- THEN the system SHOULD show an inline validation error
- AND NOT submit the form (input has `min={1}` HTML attribute as baseline protection)

#### Scenario: Page follows loading skeleton pattern

- GIVEN the data is still loading
- THEN the page displays skeleton rows matching the table layout (shadcn `animate-pulse`)
- AND aria-label identifies the loading state for accessibility

---

## MODIFIED Requirements

### Requirement: Learning Status Threshold Fallback (REQ-TT2)

The system MUST treat a technique as learned when the athlete's practice count meets or exceeds the threshold defined in `technique_learning_thresholds`. If no threshold row exists for a technique, the system MUST use a default value of 10 required practices.
(Previously: Threshold config existed but had no admin UI for management)

#### Scenario: Athlete view reads threshold with fallback

- GIVEN an athlete views their technique learning status
- WHEN the view queries `technique_learning_status`
- THEN techniques with a threshold row use `required_practices` from that row
- AND techniques without a threshold row use the default of 10
- AND the learning status computation reflects the effective threshold

#### Scenario: Admin threshold change propagates to athlete views

- GIVEN an admin updates a threshold at `/admin/technique-thresholds`
- WHEN the upsert completes
- THEN the `['technique-learning-status']` query cache is invalidated
- AND subsequent athlete views reflect the new threshold value