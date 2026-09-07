# Verification record

Verified locally on Windows, 7 September 2026.

## Automated

- 41 Vitest tests pass: skill/activity/availability/shift/radius/SLA filters, opportunity limits, emergency dispatch, net calculation, stable ties, reproducibility, snapshots, governance lifecycle, consent gating, preserved dissent, accountability measurement, bounded catch-up accounting, no-change proposal rejection, schema migration, duplicate votes, booking interval conflicts, cancellation attribution, remedies and contradictory evidence.
- TypeScript check passes.
- Application lint passes. Unchanged generated UI primitives and their mobile hook are excluded; see README.
- Production build passes for all six entry points (root plus five product routes).
- `npm audit`: zero vulnerabilities after updating the retained scaffold's affected dependencies.

## Browser walkthrough

- Reset restores v2, the original 100-job comparison, empty new-booking ledger and seeded appeals.
- Standard vs constitution comparison displays calculated ETA +2.3 minutes and lowest weekly livelihood ₹573 → ₹3,732; 100 jobs fulfilled in both runs.
- Meena's KMS-1043 receipt shows seven additional ETA minutes within the eight-minute rule. Frozen replay matches.
- Seeded penalty → challenge → replay → violation → penalty removed and customer attribution confirmed.
- Correct customer cancellation returns Decision confirmed; missing evidence returns Human review required.
- Proposal → same-data simulation → seeded member ballot → support vote → 9-vote quorum and 7 supporters → activation of v3 confirmed in browser.
- A subsequent customer booking produced R-KMS-B003-v3; inspected its frozen v3 rule and worker inputs.
- Customer booking → assigned member selected in worker view → departure → customer cancellation records attribution without a worker penalty.
- A second booking → worker completion → mock payment → invoice shows ₹635 visit + ₹45 consumables = ₹680, with no real payment.
- Dialog Escape dismissal passes. Keyboard tab focus reports a solid 3px outline.
- Reduced-motion emulation reports `prefers-reduced-motion: reduce` and 0s transitions.
- WebMCP `run_dispatch_comparison`: registered schema inspected, valid empty input updates the visible result and returns engine metrics; unexpected input rejected without corrupting state.

## Responsive and visual review

All five product routes checked at 320, 768, 1024 and 1440px. No horizontal page overflow in 20 checks. Results saved in `outputs/responsive-checks.jsonl`.

Screenshots saved in `outputs/`, including initial demo, comparison, receipt, Replay Court, governance simulation, worker mobile and customer mobile. Key screenshots and representative intermediate breakpoints were visually inspected.

Second-pass corrections: fixed mobile navigation overlap; reduced the initial comparison to three featured members with all twelve expandable; put jobs ahead of earnings on mobile; surfaced a receipt with a real seven-minute tradeoff; collapsed detailed governance metrics to bring voting closer; removed the redundant decorative story icon and simulation toast; distinguished current/proposed chart labels.

These checks establish prototype behavior, not field validation or production readiness. No automated accessibility certification is claimed. Human comprehension timing is a design target, not a measured user study.

## Stateful application walkthrough

Verified in one uninterrupted browser session on 7 September 2026, followed by a full page reload:

1. Customer created `KMS-LIVE-00001`; deterministic v2 dispatch offered it to Ravi Shinde and generated SHA-256 snapshot `DEC-00004` with all 12 candidates.
2. Ravi accepted, travelled, arrived, started and completed the job. His device-local wallet posted ₹559 completed-work net plus ₹1 cooperative dividend, total ₹560. Every active member received the same rounded ₹1 dividend and the remaining levy went to the reserve journal.
3. Meena's persona showed the same live job under “Why was I skipped?” and her ₹1 dividend. Its receipt named Ravi, eligible passed-over members, rejected members, tie-break chain and frozen costs.
4. A second v2 booking, `KMS-LIVE-00025`, went to Asha Mane. After acceptance and departure the customer cancelled with ₹0 worker penalty. Asha challenged the cancellation. Replay reproduced it as confirmed; Operations recorded a no-change remedy and closed `CASE-00034` while retaining the frozen snapshot.
5. Governance replayed the same 102 jobs under v2 and proposed v3. Lowest weekly livelihood changed ₹3,732 → ₹4,546; mean ETA 14.84 → 15.69 minutes; 102 jobs remained fulfilled. The UI labels the basis as proposed v3 versus active v2.
6. The ballot opened with zero votes. Seven distinct members recorded support and two recorded opposition, leaving three not voted. Quorum 9 and approval threshold 7 were met; v3 activated.
7. With the same completed local job included, projections changed live: Meena v2 ₹5,693 / 8 jobs → v3 ₹5,413 / 8; Ravi ₹12,346 / 17 → ₹9,874 / 13; Asha ₹7,317 / 10 → ₹6,132 / 9. Wallet entries remained unchanged. A new `KMS-LIVE-00053` dispatch selected Asha under frozen v3 values: ₹4,500 floor, +10-minute limit, +4-minute actual tradeoff and ₹565 net contribution.
8. Operations showed 3 local bookings, 1 completed service, 0 open decisions, 12/12 members represented in local dispatch evidence and 32 stored events. Those counters derive from the three bookings, one completion, closed challenge and candidate snapshots created in steps 1–7; none includes the 100 seed jobs.

Reload verification returned constitution v3, all three jobs, the ₹560 Ravi wallet, the closed case and the same counters. A separate browser session verified decline and redispatch: Ravi declined `KMS-LIVE-00001`, the event was retained and the same job was offered to Asha under v2. Browser console errors: none.

Application and judge routes were checked for horizontal overflow at 320, 768, 1024 and 1440px: 24 checks, zero failures. New customer, worker and operations screenshots were inspected. A 320px navigation clipping issue and member-ID-only selector label were observed and fixed. Focus remained a solid 3px teal outline; reduced-motion media emulation matched.

## Stretch-goal walkthrough

Verified in one continuous browser session after the core walkthrough passed:

1. A v3 ballot began with disabled vote buttons. Opening Meena Jadhav's own v2/v3 livelihood comparison enabled her vote; the service layer also rejects a vote without a stored consultation record.
2. Seven support and two oppose votes activated v3. Priya Gaikwad's and Rahul Chavan's opposing reasons remained attributed under v3 after activation and navigation.
3. The v3 activation forecast over 101 jobs promised +₹814 lowest livelihood and +0.85 minute average ETA. The next 20 deterministic jobs delivered +₹725 and +0.71 minute; gaps were ₹−90 and −0.14 minute. Lowest-livelihood deviation was 11%, below the 25% mandatory re-vote threshold. All 20 outcome rows were persisted.
4. The customer fairness disclosure read 8 extra minutes under v2, 10 under v3, then 12 under v4, each directly from the active policy.
5. After the v3 measurement closed, a separate catch-up record identified Priya Gaikwad's ₹1,327.60 opportunity gap. The amount resolved to ₹16.96 (shown as ₹17): the least of 10% of the gap, the ₹500 cap and ₹16.96 available reserve. A distinct 7/2/3 vote approved it. Posting added ₹16.96 to Priya's wallet and −₹16.96 to reserve, net zero across the two ledger rows; her displayed wallet became ₹18 including the prior ₹1 dividend.
6. v4 changed the floor from ₹4,500 to ₹5,500 and maximum extra wait from 10 to 12 minutes. Before Asha Mane viewed her own projection, both vote buttons were disabled with an explicit instruction. Seven support and two oppose votes activated v4. Version history retained Suresh More's “Twelve extra minutes is too much for time-sensitive customers” and Priya Gaikwad's “Keep the ten-minute limit until delivered results justify more.” The persisted v4 forecast is +₹179 lowest livelihood and +0.84 minute average ETA.

Full-page desktop and 390px mobile governance screenshots were inspected after the final fixes. Mobile width equalled its client width (390px), so there was no horizontal overflow. Browser console errors: none. Screenshots: `outputs/stretch-governance-desktop-final.png`, `outputs/stretch-governance-mobile-final.png`, and `outputs/stretch-customer-desktop.png`.
