# KAAMSABHA design and build standards

Repository copy of the user-supplied design requirements. Read before frontend edits. This application is a cooperative work-allocation register and governance runtime, not a landing page.

## Ground design in the subject

Before layout or color, identify the concrete product, who is using it and their mood, and the page's single primary job. Judges need the ownership-versus-control idea in 15 seconds; workers need dignity and understandable livelihood decisions; customers need reliable service. Use work tickets, schedules, policy clauses, receipts and member ballots as structural language.

## Required process

Plan → review against brief → build → screenshot → critique → fix → verify.

Before code, provide 4–6 named hex colors with roles/reasons; one or two type families and a real scale; a layout concept, alignment and ASCII wireframe; and 2–4 product-specific principles. Ask whether the plan could be reused for unrelated fintech, logistics or AI analytics with only copy changes. Revise default choices before building.

## Avoid unexamined template defaults

- Cream `#F4F1EA`, high-contrast serif and terracotta `#D97757`.
- Near-black with an acid-green or vermilion accent.
- Newspaper/broadsheet pastiche unrelated to editorial content.
- Identical rounded cards, radii and soft shadows everywhere.
- Decorative gradients, frosted glass, glowing orbs or fake maps.
- Tracked uppercase eyebrows, unnecessary headings or labels.
- Middle-dot metadata, `WORD — fragment` labels and decorative monospace.
- A single italic/bold/colored word in every headline.
- Uppercase all labels, arrows on all links, or fake numbered features.
- Uniform fade-up sections and hover-lift cards.

Explicit brief choices override these anti-default rules. Number only actual sequences. Borders and labels must encode information rather than decorate empty layouts.

## One memorable element

Spend boldness on the same-jobs/same-workers dispatch comparison. Everything else stays quiet. The judge should enter a working product, not a marketing splash page. Motion communicates dispatch, replay, vote or activation state and respects reduced-motion preferences.

## Typography and copy

Use no more than two font families. Keep body copy around 80 characters per line, with intentional size, weight and spacing. Check CSS specificity before adding overrides.

Write from the user's perspective, in active voice and sentence case. Keep vocabulary consistent through an action and its result. Errors explain what happened and what to do next. Avoid corporate filler, vague errors and implementation jargon in product flows.

## Quality floor

- Test 320, 768, 1024 and 1440px widths; no horizontal page scrolling.
- Worker and customer flows are mobile-first; demo and governance remain usable on mobile.
- Keyboard-operable controls and visible focus on every interactive element.
- Semantic HTML, accessible dialog names, chart descriptions, and no color-only meaning.
- Contrast that passes for body text and controls.
- Honor `prefers-reduced-motion`.
- Take and inspect screenshots before claiming completion.
- Apply the Chanel rule: remove the least useful decorative accessory.

## Before finishing

Check that the plan references this brief, the anti-template review happened, one visual decision dominates, numbering and labels earn their place, copy sounds product-specific, screenshots were inspected, and the responsive/accessibility floor passes. Fix any failed item before finishing.

## Durable working context

Read `AGENT_STATE.md` and targeted source files rather than repeatedly reading the repository. Inspect Git status before changes. Preserve working code. Update the state file after verified milestones; list only commands actually run successfully. Keep it concise and avoid development-diary entries.

## Engineering invariants

Use deterministic seed 26089. Preserve hard skill, activity, availability, schedule, radius, SLA and emergency constraints. All comparison metrics come from the engine. Freeze decision inputs and policy versions; preserve originals when applying remedies. Simulate before voting, enforce one member/one vote, quorum and approval before activation. Clearly label synthetic data and mock payments. No required external credentials, chatbot, blockchain, SHAP/LIME or fairness score.

Run `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`; manually verify the full judge path and responsive screenshots. Never claim a check passed without evidence.
