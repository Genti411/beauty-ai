# Beauty AI — Skin Analysis App: Design Spec

**Date:** 2026-05-25
**Status:** Approved (pending user review of this document)

## Summary

Beauty AI is a mobile app (iOS + Android) that analyzes a user's skin from a
selfie and returns a readable report, tracks progress over time, and suggests a
skincare routine. It is intended as a real product. Because the input is a face
photo (biometric data), privacy, consent, and legal compliance are first-class
concerns from day one.

## Decisions (locked)

| # | Decision | Choice |
|---|----------|--------|
| 1 | Core function | Skin/face analysis from a selfie |
| 2 | Purpose | Real product |
| 3 | Platform | Mobile app (iOS + Android) |
| 4 | Analysis engine | LLM vision for v1, behind a swappable `analyzeSkin` interface |
| 5 | Rollout | LLM-first MVP; specialized skin API added post-MVP without client changes |
| 6 | MVP scope | Scan + report, progress tracking, user accounts, routine recommendations |
| 7 | Photo data | Store the selfie encrypted at rest (for visual before/after) |
| 8 | Stack | Expo (React Native) + Supabase |

## Architecture

Three tiers:

- **Mobile client (Expo/React Native):** camera capture, consent UI, auth,
  report/history/recommendation/settings screens.
- **Supabase backend:** Auth, Postgres (data), Storage (encrypted photos),
  Edge Functions (analysis + recommendation logic, holds all secret keys).
- **Analysis provider (behind an interface):** v1 is an LLM vision call. The
  interface `analyzeSkin(image) -> metrics` is defined so a specialized skin API
  can replace it later with no client changes.

### Primary flow

1. App captures or uploads a selfie.
2. Image uploaded directly to a private Storage bucket (not through app logs).
3. App calls an Edge Function with the image reference.
4. Function runs `analyzeSkin` (LLM v1) -> structured metrics.
5. A second step turns metrics + user profile into a readable report and routine.
6. Results saved to Postgres; image reference linked.
7. App displays the report and adds the scan to history.

### Provider abstraction

```
interface SkinAnalysisProvider {
  analyzeSkin(image, context): Promise<SkinMetrics>
}
```

- v1 implementation: `LlmVisionProvider`
- future: `SpecializedApiProvider` (e.g. clinical-grade vendor)

Swapping providers must require no mobile-client changes. Vendor selection and
per-scan pricing to be verified against real docs before adoption (drives unit
economics).

## Data model (Postgres)

- **`profiles`** — one per user (extends Supabase Auth): display name, skin type,
  age range, goals/concerns, consent flags + timestamps, consent version.
- **`scans`** — one per analysis: `user_id`, `created_at`, storage path to the
  encrypted photo, status (`pending` | `complete` | `failed`).
- **`scan_metrics`** — structured numbers per scan (one row per scan): redness,
  pores, wrinkles, pigmentation, acne, hydration, evenness, etc.
- **`reports`** — LLM-generated narrative + recommended routine for a scan.
- **`recommendations`** — routine steps / product types & ingredients tied to a scan.

Progress tracking = querying `scan_metrics` over time for charts. Visual
before/after = short-lived signed URLs to photos in Storage.

### Scope cut (YAGNI)

Recommendations suggest a **routine + product types/ingredients** (e.g. "a gentle
BHA exfoliant 2x/week"), NOT a live shoppable product catalog. A real product
database + affiliate links is a separate subsystem, deferred to post-MVP.

## Components (mobile)

- **Auth** — email magic-link/OTP + Apple Sign-In (App Store requires it
  alongside any social login).
- **Onboarding** — capture skin type/goals + explicit biometric-storage consent.
- **Capture** — camera with framing/lighting guidance; library upload fallback.
- **Analysis (loading)** — progress state while the Edge Function works.
- **Report** — metrics visualized + narrative + routine.
- **History** — timeline of past scans, metric trend charts, before/after compare.
- **Settings** — profile, consent management, export data, delete my data.

## Security & privacy

- **Consent first:** explicit, logged opt-in before any photo is stored; record
  what was consented to and when (version + timestamp).
- **Storage:** private bucket, encrypted at rest, no public URLs; access only via
  short-lived signed URLs gated by auth.
- **Isolation:** Row-Level Security on every table — a user can only read/write
  their own rows. Edge Functions use the service key server-side only.
- **Secrets:** all API keys in Edge Function env, never in the app bundle.
- **Data rights:** in-app export and hard-delete (photos + rows).
- **Transport:** HTTPS everywhere; image uploaded directly to Storage.
- **Minimization:** store only what progress tracking needs; no third-party
  analytics on images.

## Legal & privacy compliance

- **Privacy Policy + Terms of Service** — hosted at a URL, surfaced in-app before
  account creation. Both app stores require a privacy policy URL.
- **Biometric-specific consent** — face data is "special category" under GDPR and
  a "biometric identifier" under Illinois BIPA. Explicit, informed opt-in stating
  what is collected, why, retention period, who processes it, and how to delete.
  Consent version + timestamp logged.
- **Written retention & destruction policy** — required to be publicly posted by
  BIPA. Default: retained until user deletes, plus auto-purge after a defined
  inactivity period. Documented in the policy.
- **Data-subject rights in-app** — export, hard-delete, withdraw consent, edit profile.
- **Processor disclosure + DPA** — the vision provider is a data processor:
  disclose it, prefer one that contractually does not retain/train on the image,
  verify terms before committing.
- **App-store disclosures** — Apple Privacy Nutrition Label + Google Play Data
  Safety form, filled accurately.
- **18+ age gate** for MVP — exclude minors to limit legal risk.

**Caveat:** This spec builds the mechanisms (consent flow, retention policy,
deletion, disclosures, policy-text scaffold) so the app is structured to comply.
It is not legal advice. A qualified privacy attorney must review policy text for
the target jurisdictions before collecting real users' faces.

## Error handling

- **Bad input:** no face / poor lighting / multiple faces -> friendly retake
  prompt; no scan recorded.
- **Provider failure/timeout:** retry once, then fail gracefully; scan marked
  `failed`, not silently lost.
- **Upload failure:** retry/resumable upload; do not create a scan row until the
  image lands.
- **Partial results:** if metrics succeed but narrative fails, save metrics and
  regenerate the report on demand.

## Testing

- **Unit:** `analyzeSkin` interface with a mock provider; metric parsing/validation;
  recommendation generation.
- **Integration:** Edge Function end-to-end against a Supabase test project
  (upload -> analyze -> persist); RLS policy tests (a user cannot read another
  user's scan).
- **Client:** component tests for capture/report/history; e2e happy path
  (sign in -> scan -> report -> appears in history).
- **Manual:** real-device camera testing on iOS + Android before each store submission.

## Out of scope (MVP)

- Live shoppable product catalog + affiliate links.
- Specialized clinical-grade skin API (interface ready; integration is post-MVP).
- Custom/in-house ML model.
- Monetization mechanics (free during validation; revisit post-MVP).
- Minors / parental-consent flows (18+ only for now).

## Open items to verify before/during build

- Specific vision provider and its data-retention/training terms.
- Specialized skin-API vendor + per-scan pricing (for the post-MVP swap).
- Target launch jurisdictions (drives which privacy laws govern).
- Hosted location for Privacy Policy / ToS URLs.
