# KAAMSABHA — what we built, how it works, and why it helps

## What KAAMSABHA is

KAAMSABHA is a worker-owned household-services cooperative application with a reliable device-local demonstration mode and a committed Supabase production schema. Customers, worker-members, and cooperative operations use one shared state model while the original deterministic presentation remains isolated at `/demo`.

Its central claim is executable: workers can inspect, test, vote on, change, and challenge the rules that allocate their work. The member constitution can change dispatch priorities, but it cannot remove the Worker Protection Floor.

## What we built

### A real job lifecycle

A customer can create a persisted booking with a service, locality, time, scope, and emergency flag. The system checks skill, active membership, availability, schedule, service radius, and SLA before applying the active fair-opportunity rule.

The selected worker receives the same record and can accept or safely decline it. Accepted work progresses through a calculated road route, shared travel progress, arrival, start-code verification, work, completion-code verification, settlement, or cancellation. Each valid transition creates an event; invalid transitions are rejected by the command layer.

The customer view includes a real Leaflet map using OpenStreetMap tiles. Dispatch mode shows the service request, up to four eligible members, the selected member, distance, ETA, the SLA area, pan and zoom controls. Travel mode asks one `RouteService` for OSRM road geometry, distance, and duration, then saves that result so customer and worker see the same route and progress. If routing fails it draws a dashed direct path labelled approximate; if tiles fail it renders a deterministic accessible service-area diagram.

### The Worker Protection Floor

These protections are executable rules above the member-voted constitution:

- **Cooperative price minimums.** Each service has a customer total, worker service pay, welfare contribution, operations contribution, and minimum worker pay. A booking below the minimum or with a non-reconciling split is rejected.
- **No reverse auction or paid rank.** The policy validator rejects cheapest-bid and paid-priority proposals.
- **Scope lock and change consent.** The booked scope is visible to the worker. Added labour or material becomes payable only after the customer explicitly approves a change order. Declining the extra leaves the original job and worker record intact.
- **Safe refusal.** Unsafe, out-of-scope, schedule-conflict, and service-area declines record zero opportunity penalty. A declined offer is explicitly different from a no-show after acceptance.
- **Cancellation protection.** A customer cancellation after travel starts creates no worker penalty and posts ₹70 travel compensation to the worker wallet.
- **Rating firewall.** A one-star rating is recorded and routed to cooperative review, but it cannot automatically restrict or deactivate the worker.
- **Workability signals.** Workers can record structured scope and safety signals. Sensitive safety concerns appear only as an operations review count, not as public accusations.
- **Deterministic settlement.** Completion posts worker pay, member dividends, cooperative reserve, and welfare entries. A material-charge dispute does not remove already settled labour.
- **Workload safety.** Each member can set an available-until time, minimum rest gap, maximum jobs per day, heavy-service limit, and an unavailable period. These checks block an offer before livelihood ranking, explain the exclusion in the receipt, and never count it as a refusal or penalty.
- **Opportunity access.** The system counts an opportunity only when a real selected offer passed every hard and workload constraint. Weekly worker summaries show estimated livelihood, valid opportunities, and accepted jobs. Declines keep zero ranking and eligibility penalty. Catch-up need considers both livelihood gap and valid access without inventing earnings.

### Pay before commitment

Before accepting, a worker sees the booked scope, service pay, frozen cost estimate, estimated net contribution, and confirmation that no ranking fee, boost fee, or hidden deduction exists.

For the verified electrician job, the customer total was ₹850: ₹760 service pay, ₹40 welfare, and ₹50 operations. Ravi’s frozen estimated costs were ₹87 and his estimated net was ₹673.

### Cooperative Constitution and Policy Twin

The governance lifecycle is real application logic:

**Propose → validate protections → simulate → review personal impact → vote → activate**

The Counterfactual Policy Twin runs the same jobs and workers under the active and proposed policies. It shows the exact comparison basis and changes in lowest livelihood, average ETA, and fulfilled jobs.

A ballot starts empty. Nine members must participate and at least seven must support it. Each member must inspect their own projected impact before voting. Opposing members must state a reason, and that dissent remains attached to the policy record.

Activation expires the earlier constitution and makes the approved version the input for every later dispatch. In the verified browser session, v3 changed the fair-opportunity floor from ₹3,500 to ₹4,500 and the allowed extra ETA from 8 to 10 minutes. The next booking’s frozen receipt recorded constitution v3.

The Worker Protection Floor rejected a paid-priority proposal in the interface before it could reach simulation or voting.

### Decision receipts and Replay Court

Dispatch, cancellation, and penalty decisions create frozen `DecisionSnapshot` records. A dispatch receipt retains all candidates, eligibility failures, ETA and net calculations, selected member, tie-break explanation, policy version, and cost assumptions.

The customer sees a deliberately shorter assignment receipt: the assigned member, one expected-arrival value, and confirmation that skill, availability, and the service promise were checked. Candidate rankings, rejected-member details, livelihood estimates, hash metadata, and raw JSON stay in the worker and audit experience.

Snapshots use SHA-256 over canonical payload data and link to the preceding snapshot hash. This makes local records reproducible and detects record changes. It is described as prototype integrity, not server-grade tamper proofing.

Replay Court follows distinct states:

**Open → replayed → confirmed / violation / human review → remedied → closed**

Replay uses the inputs frozen at decision time rather than today’s worker state or constitution. Confirmed decisions record a no-change remedy; violations can add a compensating ledger entry while preserving the original snapshot.

The verified cancellation receipt recorded: customer cancelled while en route, worker charge ₹0, worker compensation ₹70. Replay reproduced the consequence and the case was closed.

### Settlement, welfare, and operations

The payment settlement ledger uses deterministic journal entries and makes no escrow claim. The verified completed job included an approved ₹200 change order and settled ₹873 to Ravi. When the customer questioned the approved ₹80 material portion, the settlement moved to `partially-disputed` while Ravi’s ₹873 stayed posted.

Operations shows live counters, event history, Replay Court, twelve verified member records, welfare representation, an illustrative demand outlook, welfare totals, private review counts, invoices, and settlement status. The demand display is derived from 100 synthetic historical jobs and explicitly makes no real-world accuracy claim.

## How it works technically

The application uses React 19, TypeScript, Vite/Vinext, Leaflet, OpenStreetMap, OSRM routing, and Supabase's JavaScript client. Local fallback needs no credentials. Connected mode has server-only demo-role claiming, anonymous-session support, normalized migrations, RLS, private Storage policy, and scoped Realtime publication; hosted configuration cannot be activated until project keys are provided through environment variables.

The verified demonstration state lives in one versioned `localStorage` envelope behind strict repository interfaces. Jobs, policies, snapshots, events, ledgers, challenges, accountability records, member profiles, change orders, feedback, workability signals, settlements, opportunities, OTP records, evidence metadata, notifications, routes, locale, and onboarding state are accessed inside atomic units of work.

Commands own state changes. Components call commands; they do not manufacture successful states. Transactions serialize concurrent work, compare revisions before commit, and prevent duplicate settlement.

Schema 1–5 workspaces migrate to schema 6. Migration adds verification, route, evidence, notification, locale, and onboarding fields without modifying nested frozen snapshot payloads, so existing decision hashes remain valid.

The Supabase contract is reproducible under `supabase/migrations`. It defines cooperatives, profiles, customers, workers, services, workload limits, jobs, append-only events, hashed OTPs, evidence, change orders, notifications, opportunities, policies, votes, simulations, immutable snapshots, challenges, replay results, settlements, ratings, forecasts, indexes, RLS helpers, a private `job-evidence` bucket, Realtime publication, twelve stable workers, and 100 deterministic historical jobs. Secrets are represented only by names in `.env.example`.

The customer intake assistant calls a server route that requests schema-checked JSON from a configured AI provider. It cannot dispatch, price, penalize, or decide an appeal. When the key or provider is unavailable, the interface shows that failure and supplies an editable deterministic draft so booking continues.

The deterministic seed remains `26089`, with 12 workers, 100 historical jobs, 5 services, and 10 illustrative Pune localities. The original `/demo` uses separate storage while sharing the dispatch engine, so application actions cannot weaken the judge presentation.

## Why we built it this way

A static dashboard could claim that a cooperative is fair, but it could not prove who controls dispatch or what happens when rules change. This implementation makes the claim visible through cause and effect:

1. A customer creates a real job.
2. The active constitution assigns an eligible member.
3. The worker sees scope and money before accepting.
4. Protection rules constrain cancellation, ratings, scope changes, and settlement.
5. Members simulate and approve a different allocation rule.
6. A later booking freezes the new policy version.
7. Workers see their projected livelihood change under that version.
8. Any consequential decision can be inspected and replayed from frozen evidence.

The explicit local fallback keeps the complete hackathon story reliable without hiding network failure. The committed database and security contract shows how the same product moves to shared deployment once its credentials are supplied and migrations are applied.

## How it helps

- **Workers** can understand offers before accepting, decline unsafe work without hidden ranking harm, keep undisputed pay, and challenge decisions with evidence.
- **Customers** see a clear price split, approve added scope, understand the fair-wait rule, and receive a traceable invoice and assignment receipt.
- **The cooperative** can prove that member votes alter executable dispatch, preserve dissent, review sensitive concerns privately, track welfare contributions, and audit every action.
- **Judges** can follow one continuous narrative instead of visiting disconnected mock screens. Every important value carries forward and survives refresh.
- **Future engineers** can replace browser storage with an API or database by implementing the repository contracts while retaining the tested domain commands.

## Verified walkthrough results

| Step                   | Verified result                                                                                                        |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| First booking          | `KMS-LIVE-00001`, electrician in Kharadi, assigned Ravi under v2                                                       |
| Price                  | ₹850 total = ₹760 worker service pay + ₹40 welfare + ₹50 operations                                                    |
| Worker offer           | ₹87 frozen estimated costs; ₹673 estimated net                                                                         |
| Scope change           | ₹120 labour + ₹80 material approved by customer                                                                        |
| Completion             | ₹673 completed-work net; ₹2 dividend shown; ₹675 wallet total                                                          |
| Opportunity access     | Ravi showed 1 valid opportunity and 1 accepted job; the offer survived every eligibility and workload check            |
| Cancellation           | `KMS-LIVE-00029` assigned Asha; customer cancelled en route; ₹0 penalty and ₹70 compensation                           |
| Replay Court           | Frozen decision replayed, confirmed, remedied with no financial change, and closed                                     |
| Policy simulation      | Same 102 jobs and 12 workers; lowest livelihood ₹3,732 → ₹4,546; ETA 14.88 → 15.73 minutes; 102 jobs fulfilled in both |
| Vote and activation    | Nine support votes met quorum; constitution v3 activated                                                               |
| Subsequent dispatch    | `KMS-LIVE-00069` / receipt `DEC-00072` selected Asha and froze constitution v3                                         |
| Live worker projection | Ravi: v2 ₹12,426 / 17 jobs → v3 ₹9,954 / 13; Asha: v2 ₹7,317 / 10 → v3 ₹6,132 / 9                                    |
| Operations counters    | 3 local bookings, 1 completed service, 0 open decisions, 12/12 member coverage, 41 traceable events                   |
| Refresh                | v3, three jobs, ₹675 Ravi wallet, closed challenge, opportunity records, and workload settings persisted               |
| Expanded live booking  | `KMS-LIVE-00075` assigned Ravi under v3 with ₹673 frozen estimated net                                                  |
| Road travel            | OSRM returned one saved 1.7 km route with a 3-minute road ETA; customer and worker used the same progress record       |
| Work verification      | Start code `475153` unlocked work; a separate completion code unlocked settlement; reuse was rejected by the domain    |
| Expanded settlement    | Ravi's wallet moved from ₹675 to ₹1,350: ₹1,346 completed-work net and ₹4 dividends                                    |
| Expanded refresh       | The completed job, route, used codes, v3 receipt, wallet and Fair Work totals remained after reload                    |

## Verification completed

- 65 Vitest tests passed across seven files, including frozen golden vectors, OTP lifecycle checks, route fallback checks, customer/audit map visibility checks, workload checks, and opportunity checks.
- TypeScript type checking, Oxlint, and the production build passed.
- The production customer view showed no horizontal overflow at 320, 768, 1024, or 1440 pixels. The comparison map also passed 375, 390, and 430 pixels; the worker workload form passed at 375 pixels.
- Desktop and mobile map screenshots were captured and visually inspected. Map height is 300 pixels on mobile and 330 pixels on desktop.
- Browser console errors: none.

## Run it

```sh
npm install
npm run dev
```

Open `http://localhost:3000/app` for the stateful application and `http://localhost:3000/demo` for the isolated judge journey.

```sh
npm test
npm run typecheck
npm run lint
npm run build
```

Production authentication, KYC, cross-device synchronization, messaging, production payments, live GPS, and field-trained demand forecasting remain outside this device-local build. Road routing is implemented through OSRM with an explicit approximate fallback.
