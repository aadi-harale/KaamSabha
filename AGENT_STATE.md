# Product

KAAMSABHA is a SIH26089 cooperative service marketplace and governance runtime for household and community work.
The current judge path is a production-built, explicit device-local fallback using synthetic Pune data.

# Locked thesis

The cooperative belongs to workers. The dispatch rules do too.
Worker protections are constitutional limits; member votes govern opportunity allocation above those limits.

# Four mechanisms

- Worker Protection Floor: immutable safety, payout, refusal, rating, scope and settlement limits.
- Cooperative Dispatch Constitution: member-approved parameters execute in every new dispatch.
- Counterfactual Policy Twin: the same jobs and workers run under current and proposed rules.
- Decision Receipt and Replay Court: frozen inputs explain decisions and support challenges/remedies.

# Six safeguards

- Opportunity Access Normalization counts only selected offers passing every hard and workload check.
- Protected Payout blocks reverse bidding, paid rank and service pay below the cooperative minimum.
- Scope Lock excludes extra labour/material until an explicit customer-approved change order.
- Cancellation and Settlement Protection preserves undisputed labour and protects travel after customer cancellation.
- Rating and Deactivation Firewall prevents one rating from automatically restricting work access.
- Workload Safety Guard enforces availability, rest, job-count, heavy-service and unavailable-period boundaries before ranking.

# Routes

- `/` and `/app`: application entry, language choice and demo role selection.
- `/customer`: assisted intake, booking, dispatch, customer-safe map, tracking, OTP display, evidence, scope approval, invoice and feedback.
- `/worker`: worker selector, pay-before-accept, jobs, route progress, OTP entry, proof, scope change, Fair Work, earnings and workload limits.
- `/operations`: record-derived counters, events, workers, settlements and Replay Court.
- `/governance`: protection validation, Policy Twin, impact review, voting, activation, accountability and bounded catch-up.
- `/demo` and `/demo/*`: isolated deterministic judge presentation using the same engine.
- `/api/intake`: server-key-only structured AI intake with schema validation.
- `/api/demo/claim-role`: server-only anonymous demo-role binding, disabled unless configured.

# Data architecture

React 19, TypeScript, Vinext/Vite, Leaflet, OpenStreetMap, OSRM and Supabase JS.
Schema-6 offline state persists atomically in localStorage behind strict repository interfaces.
Jobs, policies, snapshots, events, ledgers, cases, settlements, opportunities, OTPs, evidence metadata, notifications, routes, locale and onboarding share one envelope.
Schema 1–5 migration preserves frozen snapshot payloads and hashes.
Commands own mutations and reject invalid state transitions.
Decision snapshots use SHA-256 canonical hashes and previous-hash links.
The deterministic seed is 26089 with 12 members, 100 historical jobs, 5 services and 10 Pune locality anchors.

# Supabase state

`supabase/migrations/001..010` defines normalized production tables, constraints and indexes.
Committed schema includes cooperatives, profiles, customers, workers, skills, workload limits, jobs, append-only events, OTPs, evidence, change orders, notifications, opportunities, policies, votes, simulations, decisions, challenges, replay, settlements, ratings and forecasts.
RLS is enabled on exposed tables with customer/worker/admin helper functions and role-scoped core policies.
`job-evidence` is declared private with image-only MIME and size limits plus authenticated access policies.
Realtime publication is declared for jobs, events, notifications and change orders.
Seed SQL creates one cooperative, five localized services, 12 stable workers, workload limits, verified skills, active v2 and 100 deterministic historical jobs.
Anonymous browser auth and server-only role claim code are implemented.
No Supabase URL/key/database credential exists in the workspace or process environment.
Migrations have not been applied to the hosted project and connected repository operation is not verified.
The application therefore labels its verified mode `Offline demo mode` and does not claim hosted persistence.

# Core invariants

Hard skill, active status, availability, schedule, radius, SLA and workload safety precede livelihood preference.
Emergency dispatch uses efficiency order.
Stable worker ID is the final tie-break.
Policy activation affects only later bookings; frozen receipts and settled wallets never change retroactively.
Simulation precedes voting; quorum is 9 and approval requires 7 support votes.
Replay uses frozen historical inputs rather than current state.
Worker refusal carries zero opportunity/rating penalty.
Start and completion codes are job-specific, type-specific, six-digit, expiring, attempt-limited and single-use.
Start and completion codes are always distinct for a job.
The offline demo stores customer-visible codes locally and does not claim server-grade OTP secrecy.
AI cannot select workers, calculate pay, impose penalties, decide replay or activate policy.

# Design decisions

AGENTS.md is authoritative and was reviewed before frontend changes.
Palette: white canvas, #EDF1F3 register, #172B36 ink, #006B60 cooperative action, #526779 slate, #F3C66B warning.
Segoe UI/system sans plus Devanagari-capable system fallbacks; scale is 12/14/16/20/28/40.
Same jobs, same workers, different rule remains the one bold visual moment.
Customer is service-first, worker is task-first, operations is record-first and governance is consequence-first.
Borders encode registers and state; gradients, glass, fake maps and repeated decorative cards remain excluded.
The worker mobile bottom navigation gives Fair Work the central position.
English, Hindi and Marathi use centralized resources; locale persists and sets the document language.

# Verified functionality

Deterministic dispatch, golden vectors, workload exclusions and all six safeguards pass tests.
Booking creates a real job, opportunity record, event, frozen receipt and worker notification.
Offers support accept, zero-penalty decline and deterministic redispatch.
Road routing uses one RouteService; OSRM result feeds saved geometry, distance, duration and the shared travel map.
Routing failure returns an explicit dashed approximate connector; tile failure uses the service-area fallback.
Travel progress changes only through user actions and is shared between customer and worker views.
Worker arrival now requires a start code; work completion requires a separate completion code.
Wrong-code attempts persist, used codes fail, codes expire and regeneration invalidates earlier codes.
Customer reference and worker before/during/after/variance image controls validate and compress image input.
Evidence records carry job, type, caption, uploader and timestamp and survive refresh in local fallback.
Customer assignment views expose only the assigned member, one expected-arrival value and a plain-language service-promise explanation.
Candidate eligibility, rejection reasons, livelihood inputs, tie-break details, hashes and frozen JSON remain in the worker/audit receipt.
AI intake sends only customer-entered description to a server endpoint, validates structured output and requires customer confirmation.
Missing AI key visibly falls back to an editable deterministic draft without blocking booking.
Worker onboarding is persisted per member and can be reopened from More.
Fair Work exposes opportunities, assignment reasons, current rule, challenges and votes.
Governance, accountability, catch-up, Replay Court, cancellation, rating, scope and settlement flows remain working.
`/demo` remains isolated and visually uses the same receipt-backed map.

Production browser walkthrough added booking `KMS-LIVE-00075` under active constitution v3.
Ravi was assigned with frozen estimated net ₹673.
OSRM returned a 1.7 km road route and 3-minute travel duration for the illustrative endpoints.
Three explicit progress updates reached arrival.
Start code 475153 moved the job into work; a separate completion code completed it.
Settlement changed Ravi's displayed wallet from ₹675 to ₹1,350: ₹1,346 completed-work net and ₹4 dividends.
Refresh preserved the completed job, route, OTP usage, v3 receipt, wallet and Fair Work totals.
Marathi customer and worker views were inspected at 390×844; document language was `mr`, bottom navigation was present and no horizontal overflow occurred.

# Known issues

- Hosted Supabase database, RLS behavior, Realtime, private Storage and two-window synchronization cannot be verified without project credentials.
- Main application commands still execute through the explicit local repository; Supabase is a committed contract and auth seam, not yet the verified source of truth.
- AI endpoint fallback was verified because no AI key is configured; live provider output and image input were not verified.
- Offline OTP hashes have no server-only pepper and the customer-visible code is local; use the migrated server table/function in connected mode.
- Critical role/booking/worker controls are localized, but some detailed receipts, governance copy, service zones and admin tables remain English.
- Evidence compression and repository validation are implemented; private Supabase Storage upload/authorization is not verified.
- OSRM is a public demo route provider and returns route-time values that may differ from the earlier deterministic dispatch estimate; labels identify route mode.
- Current production deployment was not republished; the locally built URL is the verified result.
- Vinext reports unknown route classification during static analysis; build succeeds and both API routes are emitted.

# Verified commands

- `npm test`: 65 tests passed across 7 files.
- `npm run typecheck`: passed.
- `npm run lint`: passed.
- `npm run build`: passed; root, five app routes, five demo routes and two API routes emitted.
- Production browser: full new booking, OSRM route, shared travel, start OTP, completion OTP, settlement and refresh persistence passed.
- Production browser: AI missing-key fallback returned editable structured intake and booking continued.
- Production browser: 390×844 Marathi customer/worker views inspected with no horizontal page overflow.
- Production browser console: no application errors observed in the walkthrough.

# Next actions

1. Supply Supabase publishable/service/database environment values and apply migrations.
2. Implement and verify the normalized Supabase ApplicationRepository as connected source of truth.
3. Run RLS, Storage and scoped Realtime tests in two browser windows.
4. Complete Hindi/Marathi coverage for receipts, governance and operations details.
5. Configure the AI provider, verify schema/error cases, then deploy and test the hosted URL.
