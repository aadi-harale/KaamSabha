# KAAMSABHA implementation report

## What we built

KAAMSABHA began as a guided, mostly seeded Smart India Hackathon presentation. We turned it into a coherent, stateful, device-local application while preserving the original deterministic judge demo under `/demo`.

The application now demonstrates the complete thesis:

> Worker-members can write, test, vote on, execute, explain and challenge the rules that decide who earns.

The finished prototype includes three connected personas:

- **Customer:** creates a real local service booking, receives a deterministic worker assignment, inspects the decision receipt and can cancel the job.
- **Worker-member:** receives the same booking, accepts or declines it, progresses through the work lifecycle, sees earnings and dividends, checks why another member was selected, and challenges decisions.
- **Cooperative Operations:** monitors record-derived counters, reviews the event history, governs dispatch policy and resolves challenges through Replay Court.

The original `/demo` experience remains isolated and deterministic. Its seeded state cannot overwrite or distort the stateful application.

## Why we built it this way

A static prototype can describe cooperative governance, but it cannot prove that workers actually control the dispatch rules. The implementation therefore focuses on cause and effect:

1. A customer creates a booking.
2. The active constitution assigns a worker.
3. Members vote to change the constitution.
4. Later bookings use the newly approved parameters.
5. Every consequential decision retains the inputs needed to explain or replay it.

This makes the product's central claim visible and testable. Judges can see that governance changes executable behavior instead of merely changing labels on a dashboard.

The scope remains intentionally device-local for the hackathon demonstration. Authentication, cross-device synchronization, KYC, messaging, production payments and shared databases would add deployment complexity without improving the core proof for this demo.

## How the application state works

All application data is stored in one versioned `localStorage` envelope. The envelope contains:

- jobs and their lifecycle stages;
- policies, proposals, consultations and votes;
- frozen decision snapshots;
- append-only events;
- worker, dividend, reserve, penalty and remedy ledger entries;
- Replay Court cases;
- policy accountability measurements; and
- catch-up allocations.

Storage access is hidden behind repository interfaces such as `JobRepository`, `PolicyRepository`, `SnapshotRepository`, `LedgerRepository`, `ChallengeRepository`, `AccountabilityRepository` and `CatchUpRepository`.

This separation matters because application commands do not depend directly on browser storage. A future PostgreSQL or API-backed adapter can implement the same interfaces without rewriting dispatch, governance or court logic.

Each command runs as an atomic unit of work. A completion cannot save the job while failing to save its earnings or events. Transactions are serialized, revisions detect concurrent changes, and duplicate settlement attempts are rejected.

Older schema 1 and schema 2 envelopes migrate to schema 3. Migration adds the newer governance records without rewriting frozen decision snapshots or invalidating their hashes.

## How deterministic dispatch works

Dispatch first applies hard eligibility rules:

- required skill;
- active membership;
- current availability;
- shift and schedule fit;
- service radius; and
- customer SLA.

Emergency jobs always prioritize the fastest eligible worker. For other jobs, the active constitution may prefer an eligible member below the approved weekly net-livelihood floor, provided the extra ETA stays inside the member-approved limit.

The final deterministic order is:

1. lowest weekly net livelihood;
2. optional highest net contribution from the offered job;
3. ETA;
4. rating, descending; and
5. stable member ID.

There are no random choices. Identical workers, jobs, policy and cost assumptions always produce the same result.

When a worker declines, the same job is dispatched again with that member excluded. The decline, second dispatch and new receipt are all retained.

## How the real job lifecycle works

The implemented lifecycle is:

**Booking → eligibility → dispatch → offer → accept or decline → redispatch when needed → en route → arrival → work start → completion or cancellation → settlement → event history**

Every transition validates the current stage and assigned worker. Invalid jumps, such as completing an unaccepted job, are rejected.

Completion reads the frozen dispatch costs and posts separate ledger entries. The current illustrative settlement rule uses:

- a 5% cooperative levy on payout;
- 50% of that levy as distributable surplus;
- an equal dividend across the 12 active members; and
- the remainder as cooperative reserve.

These percentages are prototype assumptions, not official wage or payment rules. They are explicit so every displayed amount can be reconstructed.

Settled wallet entries never change retroactively when a policy changes. Worker pages separately show a counterfactual projection under the new constitution.

## How the Cooperative Constitution works

The governance lifecycle is:

**Propose → simulate → review member impact → vote → activate**

A proposal edits executable dispatch parameters, including the weekly livelihood floor and maximum additional ETA. A no-change proposal is rejected.

The Counterfactual Policy Twin replays the same jobs and the same 12 workers under the current and proposed policies. It compares:

- lowest member livelihood;
- average ETA;
- fulfilled jobs; and
- related customer and worker outcomes.

The comparison basis is displayed explicitly so a judge knows which policy versions and how many jobs produced the figures.

The ballot begins empty. It requires nine participating members and at least seven supporting votes. Each member can vote once.

Activation expires the prior policy, makes the approved version active, and causes every subsequent booking to freeze the new version and parameters in its receipt.

## Informed voting and preserved dissent

Before a member can vote, they must open their own current-versus-proposed livelihood comparison. Both vote buttons remain disabled until that consultation is recorded. The service layer also rejects attempts to bypass the interface.

An opposing vote requires a written reason. The reason is stored with that member's vote and remains visible in policy history after activation.

This improves the cooperative model in two ways:

- members make decisions after seeing their own likely outcome; and
- majority approval does not erase minority concerns.

During verification, constitution v4 was approved 7 support, 2 oppose and 3 not voted. The preserved dissent included concerns about the 12-minute customer wait allowance.

## Promise-versus-delivered accountability

Policy simulation is a forecast, not proof that the policy will deliver the same result after activation. We therefore added a separate accountability record.

At activation, the system freezes:

- the comparison policy version;
- the activated policy version;
- the original job basis;
- current and proposed metrics; and
- the forecasted changes.

The prototype then supports a deterministic 20-job measurement window. It adds 20 future synthetic jobs to the frozen basis, records their assignment outcomes, recalculates the same metrics and compares actual change with the original forecast.

For verified v3:

| Metric | Forecast | Actual | Gap |
| --- | ---: | ---: | ---: |
| Lowest livelihood change | +₹814.20 | +₹724.60 | −₹89.60 |
| Average ETA change | +0.85 min | +0.71 min | −0.14 min |

The lowest-livelihood deviation was 11%. The defined threshold is 25%; exceeding it marks the policy for mandatory re-vote.

This helps members hold a policy accountable to what was promised during the campaign for approval.

## Customer fairness disclosure

The customer booking page states how much additional wait the cooperative's fair-opportunity rule may permit. The value comes directly from the active constitution rather than hardcoded copy.

During the verified session, it changed from 8 minutes under v2, to 10 minutes under v3, and then to 12 minutes under v4.

This gives customers a concise, factual explanation of the trade-off between fastest possible dispatch and fairer access to work.

## Bounded catch-up allocation

After a measurement window closes, members may propose one compensatory allocation for the member who gained the most opportunity under the new rule relative to the old rule.

The amount is the smallest of:

- 10% of the measured opportunity gap;
- ₹500; and
- the cooperative reserve available when proposed.

The allocation has its own ballot with the same nine-member quorum and seven-vote approval requirement. Once approved, posting creates equal and opposite ledger rows: a member credit and a cooperative reserve debit.

In the verified run:

- Priya Gaikwad's measured opportunity gap was ₹1,327.60;
- the available reserve was ₹16.96;
- members approved the allocation 7–2–3;
- Priya received ₹16.96; and
- the reserve received a matching −₹16.96 entry.

The two entries total zero, so the system does not invent money.

## DecisionSnapshot receipts

Every consequential dispatch, cancellation and penalty creates a frozen `DecisionSnapshot` containing:

- the job and policy version;
- candidate workers and eligibility failures;
- selected worker;
- ETA and cost calculation;
- tie-break explanation;
- cancellation evidence when applicable;
- recorded outcome; and
- the preceding snapshot hash.

Each snapshot has a SHA-256 digest over a canonical representation of its payload. Snapshots form a previous-hash chain beginning at `GENESIS`.

This provides useful prototype integrity and reproducibility. Because the complete chain remains in editable browser storage, it is not presented as production-grade tamper evidence.

## Replay Court

The challenge lifecycle is:

**Open → replay frozen inputs → record verdict → apply remedy → close**

Replay uses the inputs stored at decision time rather than current workers or the latest constitution. It can produce:

- **Confirmed:** the recorded decision is reproduced;
- **Violation:** replay produces a different consequence; or
- **Human review:** the frozen evidence is incomplete or its integrity check fails.

A violation adds a compensating ledger entry while preserving the original decision. A confirmed result records a no-change remedy. Human-review cases remain explicit instead of being silently guessed.

## Operations and traceability

Operations counters are calculated from application records rather than static seed values. They include local bookings, completed services, open challenges, members represented in dispatch evidence and stored events.

Every counter therefore changes as the judge performs the walkthrough. The event register connects booking, dispatch, work, governance, consultation, voting, measurement, challenge and remedy actions in one continuous history.

## Design approach

The interface follows the repository's `AGENTS.md` standards and uses a cooperative register metaphor rather than a generic card dashboard.

The visual system uses:

- white record surfaces;
- a cool register background;
- dark ink for primary text;
- teal for cooperative actions and verified state;
- slate for secondary explanations; and
- amber only for warnings and mandatory review.

The named worker comparison remains the main visual emphasis. Policy records, ballots and ledgers use borders and divisions because they communicate real record structure, not as decoration.

The application was inspected at desktop and mobile widths. Navigation, forms, policy records, receipts and long accountability sections remain usable without horizontal overflow. Keyboard focus is visible, reduced-motion preferences are respected, and copy uses plain, action-oriented language.

## How this helps the hackathon submission

The build gives judges several forms of proof in one continuous session:

- **Technical proof:** deterministic rules, repository boundaries, atomic persistence, schema migration and executable state transitions.
- **Product proof:** customer, worker and operator actions share the same records.
- **Governance proof:** approved parameters directly alter later dispatches.
- **Fairness proof:** every selected and rejected worker can be explained from frozen inputs.
- **Accountability proof:** the cooperative compares policy promises with delivered results.
- **Democratic proof:** individual impact must be viewed and dissent remains visible.
- **Financial proof:** settlements, remedies and catch-up allocations reconcile through ledger entries.
- **Demo reliability:** refresh preserves the application while `/demo` remains a separate deterministic fallback.

This moves KAAMSABHA from a presentation about cooperative algorithms to a working governance runtime that demonstrates who controls the rules, how those rules affect livelihoods, and how members can contest failures.

## Verified results

The final repository passed:

- 41 Vitest tests across four test files;
- TypeScript type checking;
- application lint;
- the Vinext production build for all application and isolated demo routes;
- a continuous browser walkthrough;
- desktop and mobile visual inspection;
- 320px and 390px horizontal-overflow checks; and
- browser console inspection with no errors.

Evidence and exact walkthrough values are also recorded in `VERIFICATION.md`. Current implementation boundaries are recorded in `AGENT_STATE.md`, and the before/after route classification is recorded in `AUDIT.md`.

## Run locally

```sh
npm install
npm run dev
```

Open `http://localhost:3000/app` for the stateful application or `http://localhost:3000/demo` for the isolated judge presentation.

Run the verification commands with:

```sh
npm test
npm run typecheck
npm run lint
npm run build
```
