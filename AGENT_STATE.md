# Product
KAAMSABHA is a SIH26089 prototype: a governance runtime for worker-owned household-service cooperatives.

# Non-negotiable thesis
Worker-members can write, test, vote on, execute, explain and challenge the rules deciding who earns.

# Core mechanisms
- Constitution: executable opportunity rules subordinate to hard dispatch constraints.
- Policy twin: identical synthetic workers/jobs replayed under two policies.
- Receipt and Replay Court: frozen inputs support reproducible decisions and remedies.
- Net livelihood: gross payout minus illustrative travel, time, consumables and cancellation costs.

# Architecture
React 19, TypeScript, Vite/Vinext App Router, Tailwind and retained Base UI/shadcn primitives. No backend or credentials required.
The real workspace persists one atomic, versioned localStorage envelope behind Job, Policy, Snapshot, Event, Ledger and Challenge repository interfaces. Commands own all mutations. SHA-256 decision snapshots form a previous-hash chain. The deterministic judge demo has separate repository storage.

# Routes
/ and /app: persona entry.
/customer: real local booking, dispatch and cancellation.
/worker: 12 persona choices, offer/work lifecycle, wallet, skipped jobs, receipts and challenges.
/governance: proposal, historical simulation, empty ballot, one-member vote and activation.
/operations: record-derived counters, event history and Replay Court.
/demo and /demo/*: isolated original deterministic judge journey.

# Data
Implemented deterministic seed 26089; 12 members, 100 jobs, 5 services, 10 illustrative Pune zones. All comparison values come from simulation. Separate new-booking ledger preserves the fixed judge dataset.

# Dispatch invariants
Skills, active, availability, schedules, radius and SLA always precede opportunity preference. Emergency uses efficiency order. Stable ID final tie-break.

# Design decisions
Read user-supplied AGENTS.md in full. White #FFFFFF, register #EDF1F3, ink #172B36, teal #006B60, slate #526779, amber #F3C66B.
Segoe UI/system sans, scale 12/14/16/20/28/40. Named worker comparison is the single bold visual moment.
No generic card dashboard, gradients, decorative imagery or marketing landing page.

# Current state
Device-local application lifecycle implemented and browser-verified. Customer booking generates real jobs and dispatch snapshots. Worker offers support accept/decline/redispatch, en route, arrival, work start, completion and cancellation. Completion atomically posts worker net, equal cooperative dividends and reserve entries. Governance uses manually cast votes and subsequent bookings consume the activated parameters. Replay Court separates opening, replay, adjudication, remedy and closure while preserving originals.
Worker projection recomputes the 100 historical jobs plus non-cancelled local jobs under the active policy and shows previous-to-current version change. Settled wallets do not change retroactively. Operations counters derive only from application records.
Standard versus v2: 100/100 fulfilled in both; mean ETA 12.64 versus 14.94 minutes; lowest weekly net 573 versus 3731.8 rupees. Figures are illustrative, not field claims.
Existing Sites project registered and saved in .openai/hosting.json. Reuse it; never recreate.
Private deployment version 1 predates this application pass. Current changes are locally verified and not republished in this run.

# Verified commands
- npm test: 38 tests passed across four files, including frozen golden vectors and the complete persisted application lifecycle.
- npm run typecheck passed after final implementation changes.
- npm run lint passed (unchanged generated components/ui and hooks/use-mobile excluded).
- npm run build passed for root, app, five application routes and four isolated demo subroutes.
- One uninterrupted browser acceptance session completed: three bookings, one completion and settlement, one cancellation challenge closed, v3 approved 7/2/3 and activated, subsequent v3 dispatch receipt inspected, and refresh persistence confirmed.
- Separate browser session verified decline and redispatch from Ravi to Asha.
- `/app`, `/customer`, `/worker`, `/governance`, `/operations`, `/demo` checked at 320/768/1024/1440px: 24 checks, no horizontal overflow.
- New desktop/mobile screenshots inspected; mobile navigation and member selector labels fixed. 3px focus and reduced motion verified. Browser console errors: none.
- Golden details and actual walkthrough values: VERIFICATION.md; setup and flows: README.md; source audit: AUDIT.md.

# Known issues
- Prototype uses synthetic data, illustrative zone distances/costs and browser-local state. The isolated judge ballot and all payments are explicitly simulated; application ballots start empty. No authentication, shared database or production payment processing.
- PostgreSQL, multi-tenancy, OTP, KYC, messaging, Marathi/Hindi localization and live payments remain explicitly deferred. Vote eligibility remains the specified 12 seeded members.
- SHA-256 hashes detect accidental/per-record changes but browser-local users can replace the whole chain; this is not server-grade tamper evidence.
- Vinext build reports unknown route classification from framework static analysis; build succeeds and routes were exercised in browser.
- No field validation, measured comprehension study or automated accessibility certification claimed.

# Next actions
No outstanding device-local acceptance-path tasks identified by completed checks. Republish only if the user requests updating the existing private Sites deployment.

# Last updated
2026-09-07: stateful application, original demo isolation, narrative walkthrough and second visual pass complete; final automated and browser checks pass.
