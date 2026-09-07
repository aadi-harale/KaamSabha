# State and interaction audit

Source audit before implementation, 7 September 2026. Classification is relative to the requested real local application, not the original guided demo.

| Surface / interaction                                         | Classification  | Finding                                                                              |
| ------------------------------------------------------------- | --------------- | ------------------------------------------------------------------------------------ |
| `/`, `/demo`: run comparison, expand register/metrics         | Working         | Deterministic engine; timeout only animates presentation.                            |
| Candidate receipts, frozen assignment replay                  | Working         | Copies inputs and reproduces selection; no integrity digest yet.                     |
| Demo reset, cost controls, WebMCP comparison                  | Working         | Updates shared demo state.                                                           |
| `/customer`: submit booking                                   | Working         | Actual dispatch and overlap checks; fixed date and prices.                           |
| Cancellation, payment, invoice                                | Partial         | Persists direct UI mutations, mock payment only, no event ledger.                    |
| `/worker`: member selector, sample history/receipts           | Static/working  | Selection works, earnings come from the seeded simulation.                           |
| Departure and completion                                      | Partial         | Completion can bypass departure; no accept/arrival/work-start states or settlement.  |
| Accept, decline, redispatch, wallet/dividends                 | Missing         | No executable lifecycle or financial journal.                                        |
| `/governance`: edit, simulate, vote, activate                 | Partial         | Engine consumes parameters, but ballot inserts eight votes and history is synthetic. |
| `/worker`: challenge and replay                               | Partial         | Frozen cancellation evidence works; replay also remedies/closes immediately.         |
| `/operations`: coverage, cases, federation                    | Static/partial  | Seeded coverage, interactive case inspection, conceptual federation.                 |
| Persistence                                                   | Partial         | Direct localStorage in `lib/store.tsx`; shallow validation and silent fallback.      |
| Persona entry, strict repositories, event history, hash chain | Missing         | Required for this pass.                                                              |
| Broken runtime / navigation                                   | Not established | Source audit found no definite runtime failure. Browser testing required.            |

## File coverage

- All six route entries and root layout: thin wrappers around the shared demo provider and views.
- `lib/engine.ts`: dispatch, seed, costs, metrics, policies and appeal rules inspected.
- `lib/booking.ts`: real overlap handling; incorrectly counts uncompleted offers toward earned income for the new requested semantics.
- `lib/store.tsx`: state initialization, persistence, reset and WebMCP inspected.
- `components/kaamsabha.tsx`: shell/navigation, controls, comparison, receipt and chart interactions inspected.
- `components/product-views.tsx`: all customer, worker, governance and operations handlers inspected.
- `app/globals.css`, `app/product.css`: existing responsive design retained for judge routes.
- Tests: 24 original engine/booking tests; no complete local application lifecycle test.
- Configuration, scripts, metadata, README, verification/state docs and favicon: inspected/inventoried; no application transitions.
- `components/ui/*`, `hooks/use-mobile.ts`, `lib/utils.ts`: retained generated presentation primitives/utilities, no application-domain persistence or workflows; no replacement planned.
- `outputs/`, `work/`, build/dependency folders: generated evidence/artifacts, not source interactions.

The real workspace will use separate storage and domain services. The guided views remain under `/demo` and `/demo/*` to preserve their complete judge path.

## Verified classification after this run

| Surface / interaction | Final classification | Evidence |
|---|---|---|
| `/demo` and `/demo/*` judge journey | Working | Isolated seed/repository; comparison, receipt, challenge, governance and reset retained. |
| Customer booking, algorithmic dispatch and cancellation | Working | Atomic job/event/snapshot transaction; v2 and v3 receipts observed. |
| Worker offer, decline/redispatch, accept, travel, arrival, work and completion | Working | Full sequence and separate decline path exercised in browser. |
| Worker wallet and cooperative dividends | Working | Completion posts reconstructable work/dividend/reserve ledger rows. |
| Governance proposal, simulation, voting and activation | Working | Empty ballot; distinct 7/2/3 votes; subsequent v3 dispatch proven. |
| DecisionSnapshot and Replay Court | Working | SHA-256 chain, frozen inputs, staged replay/verdict/remedy/close; reload retained result. |
| Persona switching and passed-over explanation | Working | All 12 members selectable; live job appeared for selected and eligible passed-over members. |
| Operations counters and event history | Working | Counts derive from local jobs, settlements, cases and receipt candidates. |
| Refresh persistence | Working | Jobs, wallet, policy v3 and closed case survived full navigation reload. |
| Preserved dissent and informed voting | Working | Per-member impact review gates voting; opposing reasons remain attributed in version history. |
| Promise-vs-delivered ledger | Working | Activation freezes forecast; a persisted 20-job outcome record computes actual change, gap and the 25% re-vote flag. |
| Customer fairness disclosure | Working | Text reads the active policy's maximum extra wait and changed from 8 to 12 minutes during browser verification. |
| Retroactive catch-up allocation | Working | Separate 9-member vote; amount bounded by opportunity gap, ₹500 cap and available reserve; balanced ledger posting verified. |

No static placeholder counter or dead acceptance-path control remained after verification. Production-only requirements remain deferred below.

## Explicit implementation decisions within the confirmed scope

The briefs did not specify dividend arithmetic. This build uses an illustrative 5% cooperative levy on payout, makes 50% of that levy distributable, divides it equally across the 12 active members and posts the rounding remainder to the cooperative reserve. The percentages are frozen in each policy and receipt path but require cooperative ratification before real use.

“Numbers changing under the new policy” is presented as a recalculated allocation projection over the 100 seed requests plus non-cancelled local requests. Settled wallet entries remain immutable; policy activation never rewrites earned money. This separates the counterfactual thesis from accounting history.

Operations “member coverage” means unique members present in candidate evidence for local dispatch decisions, divided by 12. It therefore starts at zero and becomes traceable to bookings rather than repeating a static roster count.

A correctly recorded customer-after-departure cancellation produces a confirmed replay. Its appropriate remedy is a recorded no-financial-change action followed by closure. Violation remedies post compensating ledger rows; original snapshots remain unchanged.

The original judge journey is isolated under `/demo/*`; the standard route names point to the shared stateful application. The receipt exports rename `requested` to `requestedAtMinutesSince2026_08_31_IST`, matching the engine's minute-offset model without changing dispatch arithmetic.

Policy activation accountability uses a 20-job deterministic measurement window for this one-session prototype. It is clearly labelled as simulated and stored separately from customer bookings and settled work. The same metric calculation is used for forecast and delivered comparison. A one-time catch-up can be proposed only after that window closes and only when the reserve can fund a positive, bounded amount.

## Deferred production flags

PostgreSQL, multi-tenancy, phone/OTP and phone-recovery, KYC vendor selection, SMS/WhatsApp, Marathi/Hindi localization and live payments remain outside this device-local run. Vote eligibility remains the existing 12-member rule; active-member or tenure refinements require a future cooperative decision. The local repository interfaces are intended replacement seams, not a claim of server durability or access control.
