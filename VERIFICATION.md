# Verification record

Verified locally on Windows, 7 September 2026.

## Automated

- 24 Vitest tests pass: skill/activity/availability/shift/radius/SLA filters, opportunity limits, emergency dispatch, net calculation, stable ties, reproducibility, snapshots, governance lifecycle, duplicate votes, booking interval conflicts, cancellation attribution, remedies and contradictory evidence.
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
