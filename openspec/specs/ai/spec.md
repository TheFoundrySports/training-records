# AI Workout Generation — Spec

## Overview

The AI feature provides a chat-style interface at `/ai` where authenticated users describe a workout in natural language. The description is sent to the `ai-generate` Edge Function, which calls OpenAI's API (or returns a deterministic mock if no API key is configured) and returns a structured `WorkoutProposal`. The user can then save the proposal directly to their workout log or discard it and try a different prompt.

## Requirements

### REQ-AI-01: Prompt Input

The system MUST render a multi-line textarea at `/ai` with `aria-label="Workout prompt"` and a "Generate" button. The "Generate" button MUST be disabled when the prompt is empty (only whitespace). The textarea MUST be disabled while generation is in flight.

#### Scenarios

- GIVEN the user navigates to `/ai` / WHEN the page renders / THEN a textarea and a "Generate" button are visible
- GIVEN the prompt textarea is empty / WHEN the button is evaluated / THEN the "Generate" button is disabled
- GIVEN the user types at least one non-whitespace character / WHEN the button is re-evaluated / THEN the "Generate" button is enabled
- GIVEN generation is in progress / WHEN `isPending` is `true` / THEN the textarea is disabled and the button shows "Generating…" and is disabled
- GIVEN the user submits a prompt containing only spaces / WHEN the handler checks `prompt.trim()` / THEN `generateMutation.mutateAsync` is NOT called

### REQ-AI-02: Workout Generation via Edge Function

The system MUST call the `ai-generate` Edge Function via `supabase.functions.invoke('ai-generate', { body: { prompt } })`. The function MUST accept a POST request with `{ prompt: string }` and return a `WorkoutProposal` JSON object. The function MUST validate the JWT before calling OpenAI.

#### Scenarios

- GIVEN the user clicks "Generate" with a valid prompt / WHEN `useGenerateWorkout` fires / THEN `supabase.functions.invoke('ai-generate', { body: { prompt } })` is called with the exact prompt text
- GIVEN `OPENAI_API_KEY` is not set / WHEN the Edge Function processes the request / THEN it returns a deterministic mock `WorkoutProposal` with title "AI Generated WOD", type "crossfit", durationMinutes 45, rpe 7
- GIVEN `OPENAI_API_KEY` is set / WHEN the Edge Function calls OpenAI / THEN it uses model `gpt-4o-mini`, `temperature: 0.7`, and `response_format: { type: 'json_object' }`
- GIVEN the Edge Function receives a request with no `Authorization` header / WHEN auth check runs / THEN it returns `401 UNAUTHORIZED`
- GIVEN the Edge Function receives an invalid or expired JWT / WHEN `supabase.auth.getUser()` returns an error / THEN it returns `401 UNAUTHORIZED`
- GIVEN the prompt body is missing or empty / WHEN the Edge Function validates input / THEN it returns `400 BAD_REQUEST` with message "prompt is required"
- GIVEN OpenAI returns a non-200 status / WHEN the Edge Function handles the response / THEN it returns `502` with code `AI_ERROR`

### REQ-AI-03: Proposal Display

The system MUST display the returned `WorkoutProposal` in a card after successful generation. The card MUST show: title, type badge, duration, optional RPE, optional notes/description, and two action buttons: "Save workout" and "Try again".

#### Scenarios

- GIVEN generation succeeds / WHEN the proposal is returned / THEN a card appears with the proposal's title, type badge, "X minutes", and notes text
- GIVEN the proposal includes `rpe: 7` / WHEN the card renders / THEN "Expected RPE: 7 / 10" is displayed
- GIVEN the proposal has no `rpe` / WHEN the card renders / THEN no RPE line is shown
- GIVEN the proposal card is visible / WHEN the user inspects it / THEN a "Save workout" button and a "Try again" button are present
- GIVEN saving is in progress / WHEN `createMutation.isPending` is `true` / THEN both "Save workout" (shows "Saving…") and "Try again" buttons are disabled

### REQ-AI-04: Save Proposal

The system MUST allow the user to save the generated workout to their log. Clicking "Save workout" MUST call `useCreateWorkout` with the proposal (which satisfies `WorkoutFormValues`). On success the user MUST be navigated to `/workouts`.

#### Scenarios

- GIVEN the user clicks "Save workout" / WHEN `handleSave` executes / THEN `createMutation.mutateAsync(proposal)` is called with the full proposal object
- GIVEN the save succeeds / WHEN the mutation resolves / THEN the user is navigated to `/workouts`
- GIVEN the save fails / WHEN `createMutation.error` is set / THEN an error alert with `role="alert"` is displayed above the prompt area
- GIVEN no proposal is displayed / WHEN `handleSave` is called (e.g., programmatically) / THEN it returns early without calling `createMutation`

### REQ-AI-05: Discard / Try Again

The system MUST allow the user to discard the current proposal and return to the empty prompt state. Clicking "Try again" MUST clear the proposal, reset both mutations, and clear the prompt textarea.

#### Scenarios

- GIVEN a proposal is displayed / WHEN the user clicks "Try again" / THEN the proposal card disappears
- GIVEN the user clicks "Try again" / WHEN `handleDiscard` runs / THEN the prompt textarea is cleared
- GIVEN the user clicks "Try again" / WHEN `handleDiscard` runs / THEN `generateMutation.reset()` and `createMutation.reset()` are both called
- GIVEN the user clicks "Try again" and then types a new prompt / WHEN they click "Generate" / THEN a fresh generation request is sent

### REQ-AI-06: Error Handling

The system MUST display an error alert when either the generation or save operation fails. The error MUST be extracted from `error.error.message` and shown in an element with `role="alert"`.

#### Scenarios

- GIVEN `generateMutation.error` is `{ error: { message: 'OpenAI API error' } }` / WHEN the page renders / THEN a `role="alert"` element contains "OpenAI API error"
- GIVEN `createMutation.error` is set / WHEN the page renders / THEN the save error message is shown in the same alert area
- GIVEN both errors are set / WHEN the page renders / THEN `generateError` takes precedence (nullish coalescing order)
- GIVEN no error is set / WHEN the page renders / THEN no alert element is visible

## Implementation Reference

| Concern         | Location                                                                             |
| --------------- | ------------------------------------------------------------------------------------ |
| Page            | `src/features/ai/AIChatPage.tsx`                                                     |
| Page tests      | `src/features/ai/AIChatPage.test.tsx`                                                |
| Generation hook | `src/features/ai/useGenerateWorkout.ts`                                              |
| Public index    | `src/features/ai/index.ts`                                                           |
| Edge Function   | `supabase/functions/ai-generate/index.ts`                                            |
| Save workout    | Re-uses `useCreateWorkout` from `src/features/workouts/hooks/useWorkoutMutations.ts` |
| Route           | `/ai` in `src/app/router.tsx`                                                        |

## Configuration

| Variable                    | Source           | Purpose                                                          |
| --------------------------- | ---------------- | ---------------------------------------------------------------- |
| `OPENAI_API_KEY`            | Supabase secrets | LLM API key; if absent the Edge Function returns a mock response |
| `SUPABASE_URL`              | Supabase secrets | Used by Edge Function's Supabase client                          |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase secrets | Used by Edge Function to validate JWT                            |

## Design Decisions

- **Server-side OpenAI key:** The `OPENAI_API_KEY` is stored only in Supabase Edge Function secrets, never exposed to the browser. This prevents key leakage.
- **Mock fallback for local development:** When `OPENAI_API_KEY` is absent, the Edge Function returns a hardcoded `WorkoutProposal`. This keeps local dev working without a real API key.
- **`WorkoutProposal` = `WorkoutFormValues`:** The proposal type is aliased to `WorkoutFormValues`. This guarantees the proposal can be directly passed to `useCreateWorkout` without any mapping step.
- **No streaming:** The generation is a single request/response. The Edge Function waits for OpenAI to return the full JSON object before responding. Streaming is a potential future enhancement.
- **`gpt-4o-mini` with `json_object` format:** The system prompt instructs the model to return JSON only. `response_format: { type: 'json_object' }` enforces this at the API level.
- **Single-page chat flow:** There is no message history or multi-turn conversation. Each "Generate" click is an independent stateless request. The "chat" metaphor is used only for UX familiarity.

## Changelog

- **2026-04-12** — Initial spec written from implemented code (reverse-engineered)
