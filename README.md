# KAAMSABHA

**The cooperative belongs to workers. Now the dispatch rules do too.**

A working SIH26089 prototype for household and community service cooperatives, prepared for the VIT Pune internal Smart India Hackathon round. The problem statement is associated with the Ministry of Cooperation; this prototype is not a government partnership or deployment.

Worker ownership answers who owns the platform. KAAMSABHA demonstrates who controls the system deciding who earns: members can write, test, vote on, execute, explain and challenge a dispatch policy.

## Run

Requires Node.js 22.13+ and npm. No API keys, accounts or paid services.

```sh
npm install
npm run dev
```

Open http://localhost:3000/demo. `/` opens the same experience; `?demo=true` is also usable because every route is a credential-free local demo.

```sh
npm test
npm run typecheck
npm run lint
npm run build
```

## Four mechanisms, one system

- **Dispatch constitution:** member-approved parameters become executable selection rules, after hard service constraints.
- **Counterfactual policy twin:** replays identical workers and jobs under current and proposed policies, calculating both customer costs and worker outcomes.
- **Decision receipt and Replay Court:** snapshots preserve policy, candidate state, costs and event evidence. Replay confirms compliant decisions, corrects a seeded cancellation violation or routes incomplete evidence to a committee.
- **Net livelihood:** payout minus round-trip travel, consumables, unpaid travel time and applicable cancellation loss. Default assumptions are ₹6/km and ₹1.50/minute, editable under Demo controls. These are illustrative operating assumptions, not official wage rates or cash-pay deductions.

## Architecture

React 19 + TypeScript, Vite/Vinext App Router and Tailwind. Accessible Base UI/shadcn dialogs and select controls come from the retained scaffold. No application backend or external authentication. Context state is persisted in versioned localStorage; browser storage is a convenience, not an audit-security boundary.

- `lib/engine.ts`: seeded dataset, pure dispatch, metrics, frozen receipts, policy lifecycle and appeals.
- `lib/booking.ts`: live booking interval reservations, including out-of-order requests.
- `lib/store.tsx`: shared local state and optional browser WebMCP comparison tool.
- `components/kaamsabha.tsx`: shared shell, comparison, metrics and receipts.
- `components/product-views.tsx`: governance, worker, customer and operations flows.
- `app/`: `/demo`, `/worker`, `/customer`, `/governance`, `/operations`.
- `tests/`: domain and workflow integration tests.

Lint covers application code and configuration; unchanged generated `components/ui` and `hooks/use-mobile.ts` are excluded because the scaffold itself fails its strict lint profile.

## Exact dispatch rules

1. Sort jobs by requested time; emergencies win at identical times, followed by stable job ID.
2. Remove workers without the skill, active/available status, a fitting shift, a free schedule, radius coverage or acceptable ETA. ETA must satisfy both job and policy SLA.
3. Standard order: ETA ascending, rating descending, worker ID ascending. Emergency jobs always use this order.
4. For non-emergency constitution dispatch, consider eligible workers below the weekly net floor whose ETA is within the maximum extra wait relative to the fastest eligible worker. Prefer lowest weekly net. If enabled, higher job net breaks equal-weekly-net ties; then use the standard order.
5. Reserve outbound travel, service and return travel. Accumulate gross, illustrative net and assignments. No random choices occur in dispatch.

The floor is an opportunity preference, **not a guaranteed wage**. Skills and geography can prevent a worker reaching it. Higher fairness may reduce aggregate net through additional travel; the simulator exposes that tradeoff. Bottom-decile income is the mean of the lowest `ceil(12 × 0.1) = 2` members, explicitly labelled.

## Synthetic data

Seed **26089**, 12 worker-members, 100 service requests, five service categories and ten illustrative Pune zones across 31 August–4 September 2026. All simulation results originate from these inputs. Zone distances are deterministic estimates, not actual Pune road routing or live traffic. New bookings use 7 September and a separate new-week booking ledger.

Cancellation cases have separate `KMS-C…` IDs and are excluded from the 100-job comparison. One deliberately incorrect recorded penalty is repaired using frozen customer/departure evidence. A correct zero-penalty case is confirmed, and missing or contradictory evidence requires human review. Frozen original records remain unchanged after remedies.

There are no real worker interviews, field validation, wage guarantees, legal certifications, live cooperative memberships or actual payments represented here. All people, histories, votes and money values are synthetic illustrative data.

## 90-second judge demo

1. **0–15 seconds:** open `/demo`. Ravi and Meena’s job counts are calculated from standard dispatch.
2. **15–30:** Run comparison. Read the customer ETA cost, lowest weekly livelihood change and service result. Expand the register for all members.
3. **30–45:** click Meena. Inspect the exact constitution, before-decision weekly net, ETA, eligibility and net calculation. Verify assignment replay.
4. **45–60:** close the receipt; choose Challenge a decision. Challenge the seeded penalty, then Replay decision. See the violation, removed penalty and corrected attribution.
5. **60–80:** follow the link to Our rules. Simulate before voting, open the member vote, cast the demo support vote. Nine of twelve have now voted and seven support. Activate v3.
6. **80–90:** return to the dispatch lab. Policy v3 is active. New bookings and comparison use it; frozen receipts retain their original policy.

Demo controls reset policies, ballots, cases, bookings, rates and comparison state. The worker selector lets judges follow the member actually assigned to a customer booking. That member can record departure and completion. Customer cancellation records real interaction timestamps; completed bookings support an explicitly simulated payment and invoice.

## Limits

This is a local, single-browser prototype, not a multi-user production system. LocalStorage can be edited; snapshots are reproducible but not cryptographically tamper-evident. The ballot contains eight seeded votes and one user-controlled member vote. Committee review is a stopping state, not an automated factual judgment. No federated exchange is connected. Verification, service ratings and estimates are seeded; payment and invoices are mocks. The scaffold uses a beta framework and its dependency audit must be reviewed before any real deployment.

Current verified state and remaining issues are recorded in `AGENT_STATE.md`.
