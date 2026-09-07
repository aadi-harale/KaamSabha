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
React 19, TypeScript, Vite/Vinext App Router, Tailwind, installed Base UI/shadcn primitives. No backend required.
app/ routes; lib/ domain logic; components/ shared UI.

# Routes
/ and /demo: comparison and assignment receipts.
/customer: booking, cancellation, estimate and demo payment.
/worker: member jobs, receipts, challenges and job completion.
/governance: policy twin, voting and version activation.
/operations: coverage and open cases.

# Data
Implemented deterministic seed 26089; 12 members, 100 jobs, 5 services, 10 illustrative Pune zones. All comparison values come from simulation. Separate new-booking ledger preserves the fixed judge dataset.

# Dispatch invariants
Skills, active, availability, schedules, radius and SLA always precede opportunity preference. Emergency uses efficiency order. Stable ID final tie-break.

# Design decisions
Read user-supplied AGENTS.md in full. White #FFFFFF, register #EDF1F3, ink #172B36, teal #006B60, slate #526779, amber #F3C66B.
Segoe UI/system sans, scale 12/14/16/20/28/40. Named worker comparison is the single bold visual moment.
No generic card dashboard, gradients, decorative imagery or marketing landing page.

# Current state
All five routes implemented and browser-verified. Constitution, same-data comparison, policy twin, voting/activation, frozen receipts, Replay Court, customer booking/cancellation/payment, and member departure/completion work locally. State persists in localStorage; reset restores deterministic domain and component state.
Standard versus v2: 100/100 fulfilled in both; mean ETA 12.64 versus 14.94 minutes; lowest weekly net 573 versus 3731.8 rupees. Figures are illustrative, not field claims.
Existing Sites project registered and saved in .openai/hosting.json. Reuse it; never recreate.

# Verified commands
- npm test: 24 tests passed, including dispatch invariants, governance, appeals and booking conflicts.
- npm run typecheck passed after final implementation changes.
- npm run lint passed (unchanged generated components/ui and hooks/use-mobile excluded).
- npm run build passed for root and all five product routes.
- npm audit: zero vulnerabilities after affected dependency updates.
- All five routes checked at 320/768/1024/1440px: 20 checks, no horizontal overflow.
- Desktop/mobile screenshots saved in outputs/ and visually inspected. Keyboard focus and reduced motion verified.
- Browser tested simulate/vote/activate v3 and a subsequent frozen v3 booking receipt, receipt replay, three appeal outcomes, departure/cancellation, completion/mock payment/invoice.
- WebMCP comparison tool tested with valid and invalid inputs.
- Details: VERIFICATION.md; setup, architecture and judge path: README.md.

# Known issues
- Prototype uses synthetic data, illustrative zone distances/costs and browser-local state. Payments and seeded ballots are explicitly simulated. No authentication, shared database or production payment processing.
- Vinext build reports unknown route classification from framework static analysis; build succeeds and routes were exercised in browser.
- No field validation, measured comprehension study or automated accessibility certification claimed.

# Next actions
1. Finish private Sites publishing and record its observed outcome.
2. No outstanding core-demo implementation tasks identified by completed checks.

# Last updated
2026-09-07: final implementation and second visual pass complete; automated and browser checks pass.
