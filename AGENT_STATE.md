# Product

KAAMSABHA is a SIH26089 cooperative service marketplace and governance runtime for household and community work. The verified judge path uses synthetic Pune data and an explicit device-local fallback.

# Locked thesis and mechanisms

The cooperative belongs to workers, and members govern the rules that decide who earns. The Worker Protection Floor, Cooperative Dispatch Constitution, Counterfactual Policy Twin, Decision Receipts, Replay Court, Opportunity Access Normalization, Protected Payout, Scope Lock, cancellation protection, Rating Firewall and Workload Safety Guard remain active.

The Federation Opportunity Exchange adds a second protected decision layer: the federation chooses an eligible cooperative by capacity, covenant compatibility and SLA; that receiving cooperative then uses its own constitution to choose a worker. Cooperatives cannot compete by lowering worker pay or protection.

# Routes and roles

- `/` and `/app`: User ID/password login. Role choice appears only here.
- `/customer`, `/customer/bookings`, `/customer/past`, `/customer/profile`: service-first home, five-step booking, active work, persisted history, customer issues and profile.
- `/worker`, `/worker/current`, `/worker/fair-work`, `/worker/issues`, `/worker/more`: identity-bound dashboard, task view, plain-language receipts, challenges, member voting, issues, earnings and workload limits.
- `/operations` with `/jobs`, `/workers`, `/issues`, `/settlements`, `/demand`: cooperative-admin registers with grouped responsive navigation.
- `/operations/federation`: capacity map, overflow request, cooperative candidates, two-level receipt, replay, settlement and Local-only versus Federation Mesh Policy Twin.
- `/governance`: protection validation, Policy Twin, voting, activation, accountability and bounded catch-up.
- `/demo` and `/demo/*`: isolated deterministic judge presentation using the same engine.
- `/api/ai/intake` and compatibility `/api/intake`: server-key-only structured OpenRouter intake.

Normal headers expose no cross-role switch. Logout is the only role-change path. Client guards block rendering and redirect direct cross-role URLs. The Supabase schema provides the data boundary with profile roles and RLS.

# Data architecture

React 19, TypeScript, Vinext/Vite, Leaflet, OpenStreetMap, OSRM and Supabase JS. Schema-8 offline state persists atomically in localStorage behind repository interfaces. Jobs, policies, frozen snapshots, events, ledgers, cases, issues, settlements, opportunities, OTPs, evidence metadata, notifications, routes, auth session, locale and onboarding share one envelope. Schema 1–6 migration preserves frozen snapshot payloads and hashes. Commands own mutations and reject invalid transitions. Decision snapshots use canonical SHA-256 hashes and previous-hash links. Deterministic seed 26089 contains 12 members, 100 historical jobs, five services and ten Pune locality anchors.

# Authentication and Supabase state

Configured mode maps a visible User ID to a private `userid@auth.kaamsabha.local` identity, uses Supabase Auth for password hashing/session management, then binds the trusted profile role and worker record. Offline judge mode validates deterministic accounts against PBKDF2 proofs; plaintext passwords are not stored in application state.

`supabase/migrations/001..011` defines the normalized schema, constraints, indexes, role helpers, RLS, private evidence storage and Realtime publications. Migration 011 adds immutable profile identity fields, shared issues/comments, past-order indexing and role-field protection. `scripts/seed-auth.mjs` creates customer01, all 12 worker accounts and admin01 using server-only environment passwords.

No Supabase URL, publishable key, service key or database credential is present. Migrations were not applied to a hosted project and connected repository behavior is not verified. The app therefore labels the verified workspace `Demo mode`; the sign-in screen identifies the device-local fallback.

# Core invariants

Hard skill, active status, availability, schedule, radius, SLA and workload safety precede livelihood preference. Emergency dispatch uses efficiency order and stable worker ID is the final tie-break. Policy activation affects only later bookings; frozen receipts and settled wallets never change retroactively. Simulation precedes voting; quorum is 9 and approval requires 7 support votes. Replay uses frozen inputs. Refusal carries zero opportunity/rating penalty. Start and completion OTPs are job-specific, distinct, expiring, attempt-limited and single-use. AI cannot select workers, calculate pay, impose penalties, decide replay or activate policy.

# Design state

AGENTS.md is authoritative. The application canvas is #F6F8FA with #17212B ink, #0F6B5C cooperative action, #5B6672 secondary text and #DDE3E8 borders. Segoe UI/system sans uses Devanagari-capable fallbacks. Same jobs, same workers, different rule remains the one bold visual moment. Customer is service-first, worker is task-first, operations is record-first and governance is consequence-first. Borders encode records and state; gradients, glass, fake maps and repeated decorative cards remain excluded. English, Hindi and Marathi navigation and critical role controls use centralized resources.

# Verified functionality

- Deterministic dispatch, golden vectors, workload exclusions and all six safeguards pass tests.
- Booking creates a job, opportunity, event, frozen receipt and worker notification. Decline is zero-penalty and redispatches deterministically.
- OSRM road geometry feeds one saved route shared by customer and worker; routing/tile failures have explicit accessible fallbacks.
- OTP start/completion, evidence, change orders, settlement, rating firewall, cancellation, governance, accountability, catch-up and Replay Court remain present.
- Customer sees one assigned member, one ETA/service promise and the real map. Candidate livelihood and rejection details remain in worker/audit advanced details.
- Past Orders is derived from completed/cancelled jobs. Customer and worker issues use one persisted model; operations can respond and update status without an automatic penalty.
- Worker login binds one member. Worker Fair Work shows simple eligibility checks first, with candidate map, calculations, hashes and JSON under Advanced decision details. Workers can review personal policy impact and vote from their own account.
- AI intake uses a fixed server prompt, validates structured output, times out and returns non-blocking error responses. The customer confirms or ignores every suggestion.
- `/demo` remains isolated.
- A local unassigned dispatch automatically opens the Federation Opportunity Exchange. The golden Kharadi electrician case selects Yerawada at 24 minutes, rejects Hadapsar at 39 minutes, blocks Viman Nagar by workload safety, then runs constitution v2 to select Meena/W01.
- Federation capacity, opportunities, linked receipts, chained SHA-256 snapshots, replay, events, notifications, illustrative settlements and Policy Twin results survive repository reload.
- The ₹900 illustrative settlement reconciles as ₹760 worker + ₹40 welfare + ₹100 fulfilling cooperative; no unconfigured federation fee is invented.
- Migration 012 adds normalized federation tables, participant/admin RLS and Realtime publication for opportunity requests. Hosted execution still requires credentials.

# Production browser evidence

The final interface correction was inspected at 1440×900 and 390×844. Operations uses a 252 px desktop navigation rail, one content navigation system, a restrained demo-status strip and stable register grids. Worker home leads with the next job, availability and compact livelihood metrics; worker issues stays within the mobile viewport and gives enabled actions clear emphasis. Operations, Jobs, Workers, Issues, Worker Home, Current Job, Fair Work and Worker Issues rendered with no error overlay. Internal event, issue and status codes are presented as human-readable labels.

A production-browser authentication walkthrough at `http://127.0.0.1:8787` created `KMS-LIVE-00001` through all five booking steps. Active constitution v2 assigned Ravi Shinde with ₹760 service pay, ₹87 estimated costs and ₹673 estimated net. The customer map showed Ravi, 1 km, 10 minutes and the service promise. After logout, `ravi01` alone showed that offer, its workload summary and the simplified receipt. Customer→worker and admin→customer direct URL attempts redirected to the signed-in role home. Customer, worker and admin headers contained no cross-role selector. Login, customer home/map, worker home/current/Fair Work/receipt and admin overview/governance were visually inspected at the available wide and narrow app-panel sizes.

The earlier complete lifecycle verification remains valid: OSRM returned a 1.7 km/3-minute route for a separate illustrative booking; explicit travel, start OTP, completion OTP, settlement and refresh persistence passed. Marathi customer/worker views at 390×844 had no page overflow.

The production browser ran the federation scenario, rendered the Leaflet capacity map, selected Yerawada, displayed both linked receipts, replayed the frozen cooperative decision as confirmed and calculated Local-only 0/12 served versus Federation Mesh 11/12 served with 22.5-minute average ETA, 25-minute p90 and zero protection violations. Customer view showed only Meena, 17 minutes, 3.2 km and a subtle federation note. Meena's worker view showed ₹760 pay, ₹134 estimated costs and ₹626 estimated net with unchanged protections.

# Known limitations

- Hosted Supabase Auth, database RLS, Realtime, private Storage and two-window synchronization require project credentials and remain unverified.
- Main commands still use the device-local repository; the normalized Supabase ApplicationRepository is not implemented as the connected source of truth.
- No OpenRouter key is configured, so successful live provider output, invalid-key behavior and provider timeout were not network-tested. Missing-key, valid mocked response, malformed output, rate-limit and network-failure branches pass tests.
- Some detailed booking, issue, receipt, governance and admin copy remains English.
- Offline OTP hashing is not server-secret. Use the migrated server data/functions in connected mode.
- OSRM is a public demo route provider and may differ from deterministic dispatch ETA; labels distinguish the values.
- No hosting target or deployment credential was supplied. The public deployment was not republished.
- Vinext reports unknown static classification for API routes; the production build succeeds.

# Verified commands

- `npm test -- --reporter=dot`: 80 tests passed across 10 files.
- `npm run typecheck`: passed.
- `npm run lint`: passed.
- `npm run build`: passed; the existing routes plus /operations/federation emitted.
- Production browser: customer, assigned worker and admin login; cross-role redirects; five-step booking; real map; member-bound job; simplified receipt; responsive role navigation; no application error overlay observed.

# Next actions

1. Supply Supabase and hosting environment values, apply migrations and run `npm run seed:auth`.
2. Implement and verify a normalized Supabase ApplicationRepository as the connected source of truth.
3. Run hosted RLS, private Storage, Realtime and two-window tests.
4. Configure OpenRouter, test the real provider, finish remaining Hindi/Marathi detail copy, deploy and verify the public URL.
