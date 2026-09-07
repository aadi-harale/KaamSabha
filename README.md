# KAAMSABHA

**The cooperative belongs to workers. Now the dispatch rules do too.**

A working SIH26089 prototype for household and community service cooperatives, prepared for the VIT Pune internal Smart India Hackathon round. The problem statement is associated with the Ministry of Cooperation; this prototype is not a government partnership or deployment.

Worker ownership answers who owns the platform. KAAMSABHA demonstrates who controls the system deciding who earns: members can write, test, vote on, execute, explain and challenge a dispatch policy.

## Run

Requires Node.js 22.13+ and npm. The explicit offline demo mode needs no API keys, accounts or paid services.

```sh
npm install
npm run dev
```

Open http://localhost:3000 for User ID and password login. The normal application keeps customer, worker-member and cooperative-admin navigation separate. Open `/demo` for the unchanged deterministic judge presentation.

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
- **Accountability after activation:** each policy keeps its forecast, measures the same metrics after a deterministic 20-job window, shows the gap, and requires a new vote when lowest-livelihood delivery deviates by more than 25%.

## Architecture

React 19 + TypeScript, Vite/Vinext App Router and Tailwind. Accessible Base UI/shadcn dialogs and select controls come from the retained scaffold. One versioned application envelope is persisted atomically in localStorage behind repository interfaces for the verified offline demo. A Supabase client, server-only demo-role endpoint, reproducible PostgreSQL migrations, RLS policies, private evidence bucket policy, and Realtime publication are committed for connected mode.

- `lib/engine.ts`: seeded dataset, pure dispatch, metrics, frozen receipts, policy lifecycle and appeals.
- `lib/booking.ts`: live booking interval reservations, including out-of-order requests.
- `lib/store.tsx`: shared local state and optional browser WebMCP comparison tool.
- `lib/application/repositories.ts`: replaceable repository interfaces, atomic local adapter, revision checks and separate demo persistence.
- `lib/application/service.ts`: booking, offer, work, settlement, governance and Replay Court commands.
- `lib/application/model.ts`: jobs, events, journals and SHA-256 hash-chained `DecisionSnapshot` records.
- `lib/application/route-service.ts`: one OSRM road-route adapter with explicit direct-path fallback.
- `lib/i18n.ts`: persisted English, Hindi and Marathi resources for role entry and critical booking/worker controls.
- `app/api/ai/intake/route.ts`: schema-checked, server-only OpenRouter intake with a non-blocking local fallback.
- `supabase/migrations/`: normalized schema, indexes, RLS, private Storage, Realtime and deterministic seed.
- `components/application.tsx`: customer, worker-member and operations personas.
- `components/kaamsabha.tsx`: shared shell, comparison, metrics and receipts.
- `components/product-views.tsx`: governance, worker, customer and operations flows.
- `app/`: login at `/`, role-guarded customer, worker and operations route groups, plus isolated `/demo/*` judge routes.
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
5. **60–80:** follow the link to Our rules. Simulate before voting, open the member vote, cast the demo support vote. Nine of twelve have now voted and seven support. Activate v3. The guided routes live under `/demo/*` and retain their own deterministic state.
6. **80–90:** return to the dispatch lab. Policy v3 is active. New bookings and comparison use it; frozen receipts retain their original policy.

Demo controls reset policies, ballots, cases, bookings, rates and comparison state. The worker selector lets judges follow the member actually assigned to a customer booking. That member can record departure and completion. Customer cancellation records real interaction timestamps; completed bookings support an explicitly simulated payment and invoice.

## Application login

The visible login uses a User ID and password. Connected mode maps that ID to a private `userid@auth.kaamsabha.local` identity and delegates password hashing and sessions to Supabase Auth. A committed seed script creates deterministic judge accounts after the Supabase migrations are applied. With no Supabase environment configured, the same accounts use PBKDF2 password proofs in the explicit device-local fallback; plaintext passwords are not stored in browser state.

Judge credentials are documented separately in `JUDGE_LOGIN.md`. They are never printed in the normal application interface.

## Stateful application walkthrough

The standard routes share one device-local repository. Sign in as a customer, create a booking in `/customer`, and inspect its short assignment view. Log out and sign in with the assigned worker's account; that member alone sees the offer and can accept, travel, arrive, start and complete. Completion posts the worker's net contribution after the cooperative levy, an equal dividend to each active member and the remaining reserve as separate ledger entries.

A worker may decline an offer, which records the decline and dispatches the same job again while excluding that member. Passed-over eligible members see the local job under “Why was I skipped?” Customer or worker cancellation records frozen evidence. A member opens a challenge from that decision; Operations replays the frozen inputs, records the verdict, applies the appropriate ledger/no-change remedy, then closes the case without changing the original snapshot.

In `/governance`, propose parameters, replay the same historical and local jobs, open an empty ballot, and activate only after quorum 9 and threshold 7. Each member must first open their own current-versus-proposed livelihood projection. Opposing votes require a reason; that dissent remains attributed in policy history. New bookings freeze the new version. Worker projections show the previous and active policy outcomes side by side; settled wallet entries never change retroactively.

Activation persists the original forecast in a separate accountability record. “Run next 20-job measurement” evaluates 20 deterministic future requests on top of the frozen forecast basis, records each assignment outcome, and compares delivered lowest livelihood and average ETA with the promise. A deviation above 25% is visibly marked for mandatory re-vote. After a closed measurement window, members may open one bounded catch-up vote. The allocation is capped by 10% of the measured opportunity gap, ₹500, and the cooperative reserve available at proposal time; posting creates equal and opposite member/reserve ledger entries.

## Limits

The locally verified mode is single-browser until Supabase project credentials are supplied and the committed migrations are applied. LocalStorage can be edited. Decision snapshots have SHA-256 integrity digests and previous-hash links, but a user controlling browser storage can replace the entire chain; this is not server-grade tamper evidence. Application ballots begin empty and accept one vote per seeded member. The isolated judge demo retains its eight seeded votes. Human review is a stopping state until an operator resolves it. KYC, SMS/WhatsApp and live payment processing are not connected.

## Connected-mode configuration

Copy `.env.example` to a private environment file and fill values from the supplied Supabase project. Never commit that file. Apply `supabase/migrations` in order, then run `npm run seed:auth` with the service-role key and three demo password environment values. Set `OPENROUTER_API_KEY` and `OPENROUTER_MODEL` only on the server. The application deliberately remains labelled **Offline demo mode** until a database repository is configured and verified; it does not silently combine browser state with hosted state.

Current verified state and remaining issues are recorded in `AGENT_STATE.md`.
