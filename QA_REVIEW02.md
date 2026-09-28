# Review 02 — Implementation and QA Report

Date: 2026-09-28. Downtown working title; local prototype v0.2.0. **R01–R26 implemented; technical acceptance passes. Human fun/balance approval remains pending.** Raw feedback/original sources were not edited. Human-only Single player is the explicitly documented provisional choice; no bots are claimed.

## Executed verification

| Gate | Result | Evidence |
| --- | --- | --- |
| Data validation | Pass: 18 venues, 30 careers, 27 card designs, 26 events | [validation log](./qa-review02/data-validation.log) |
| All unit/game/socket tests | **57/57 Pass; 0 failed/skipped** | [complete test log](./qa-review02/server-tests.log) |
| Existing browser regression | Pass: 17 scenario groups, zero page errors | [browser regression result](./qa-review02/browser-regression.json) |
| Review 02 browser flow | Pass: 12 scenario groups, zero page errors | [browser result](./qa-review02/browser-review02.json) |
| Acceptance checklist | 55 technical items Pass | [checklist and item evidence register](./REVIEW02_CHECKLIST.md) |

Commands from notime-game, using the bundled root node.exe:

```powershell
& '..\..\node.exe' .\server\validate-data.js
& '..\..\node.exe' --test .\server\game.test.js .\server\life.test.js .\server\rooms.test.js
$env:PLAYWRIGHT_MODULE='file:///E:/Apiwit_folder/Workspace/My_App/Antigravity%20IDE/resources/app/node_modules/playwright/index.mjs'
$env:PLAYWRIGHT_BROWSER_CHANNEL='chrome'
& '..\..\node.exe' .\scripts\ui-smoke.mjs
& '..\..\node.exe' .\scripts\ui-review02.mjs
```

Each browser suite used an isolated port-zero server. No QA server is kept running. Edge headless launch failed in this environment; installed Chrome completed both suites. This is an environment verification limit, not evidence of a gameplay defect in Edge.

## Requirement implementation references

All paths below are exact current workspace files with one-based line references. Larger systems span the adjacent functions and their catalogs.

| Requirement | Status | Primary implementation | Verification |
| --- | --- | --- | --- |
| R01 | Pass | [client/index.html:13](E:/Apiwit_folder/Workspace/Project/My_first_Game/Phase_4_Prototype/notime-game/client/index.html:13) | life/game/socket tests and browser scenario register; see coverage below |
| R02 | Pass | [server/game.js:290](E:/Apiwit_folder/Workspace/Project/My_first_Game/Phase_4_Prototype/notime-game/server/game.js:290) | life/game/socket tests and browser scenario register; see coverage below |
| R03 | Pass | [server/life.js:16](E:/Apiwit_folder/Workspace/Project/My_first_Game/Phase_4_Prototype/notime-game/server/life.js:16) | life/game/socket tests and browser scenario register; see coverage below |
| R04 | Pass | [server/life.js:21](E:/Apiwit_folder/Workspace/Project/My_first_Game/Phase_4_Prototype/notime-game/server/life.js:21) | life/game/socket tests and browser scenario register; see coverage below |
| R05 | Pass | [server/game.js:577](E:/Apiwit_folder/Workspace/Project/My_first_Game/Phase_4_Prototype/notime-game/server/game.js:577) | life/game/socket tests and browser scenario register; see coverage below |
| R06 | Pass | [client/js/client.js:139](E:/Apiwit_folder/Workspace/Project/My_first_Game/Phase_4_Prototype/notime-game/client/js/client.js:139) | life/game/socket tests and browser scenario register; see coverage below |
| R07 | Pass | [client/js/client.js:109](E:/Apiwit_folder/Workspace/Project/My_first_Game/Phase_4_Prototype/notime-game/client/js/client.js:109) | life/game/socket tests and browser scenario register; see coverage below |
| R08 | Pass | [data/life.json:9](E:/Apiwit_folder/Workspace/Project/My_first_Game/Phase_4_Prototype/notime-game/data/life.json:9) | life/game/socket tests and browser scenario register; see coverage below |
| R09 | Pass | [client/js/life-ui.js:27](E:/Apiwit_folder/Workspace/Project/My_first_Game/Phase_4_Prototype/notime-game/client/js/life-ui.js:27) | life/game/socket tests and browser scenario register; see coverage below |
| R10 | Pass | [server/life.js:183](E:/Apiwit_folder/Workspace/Project/My_first_Game/Phase_4_Prototype/notime-game/server/life.js:183) | life/game/socket tests and browser scenario register; see coverage below |
| R11 | Pass | [server/life.js:100](E:/Apiwit_folder/Workspace/Project/My_first_Game/Phase_4_Prototype/notime-game/server/life.js:100) | life/game/socket tests and browser scenario register; see coverage below |
| R12 | Pass | [data/careers.json:21](E:/Apiwit_folder/Workspace/Project/My_first_Game/Phase_4_Prototype/notime-game/data/careers.json:21) | life/game/socket tests and browser scenario register; see coverage below |
| R13 | Pass | [client/js/life-ui.js:20](E:/Apiwit_folder/Workspace/Project/My_first_Game/Phase_4_Prototype/notime-game/client/js/life-ui.js:20) | life/game/socket tests and browser scenario register; see coverage below |
| R14 | Pass | [server/life.js:70](E:/Apiwit_folder/Workspace/Project/My_first_Game/Phase_4_Prototype/notime-game/server/life.js:70) | life/game/socket tests and browser scenario register; see coverage below |
| R15 | Pass | [data/cards.json:23](E:/Apiwit_folder/Workspace/Project/My_first_Game/Phase_4_Prototype/notime-game/data/cards.json:23) | life/game/socket tests and browser scenario register; see coverage below |
| R16 | Pass | [client/js/life-ui.js:9](E:/Apiwit_folder/Workspace/Project/My_first_Game/Phase_4_Prototype/notime-game/client/js/life-ui.js:9) | life/game/socket tests and browser scenario register; see coverage below |
| R17 | Pass | [server/life.js:86](E:/Apiwit_folder/Workspace/Project/My_first_Game/Phase_4_Prototype/notime-game/server/life.js:86) | life/game/socket tests and browser scenario register; see coverage below |
| R18 | Pass | [server/game.js:510](E:/Apiwit_folder/Workspace/Project/My_first_Game/Phase_4_Prototype/notime-game/server/game.js:510) | life/game/socket tests and browser scenario register; see coverage below |
| R19 | Pass | [server/game.js:617](E:/Apiwit_folder/Workspace/Project/My_first_Game/Phase_4_Prototype/notime-game/server/game.js:617) | life/game/socket tests and browser scenario register; see coverage below |
| R20 | Pass | [data/balance.json:126](E:/Apiwit_folder/Workspace/Project/My_first_Game/Phase_4_Prototype/notime-game/data/balance.json:126) | life/game/socket tests and browser scenario register; see coverage below |
| R21 | Pass | [server/life.js:222](E:/Apiwit_folder/Workspace/Project/My_first_Game/Phase_4_Prototype/notime-game/server/life.js:222) | life/game/socket tests and browser scenario register; see coverage below |
| R22 | Pass | [server/index.js:139](E:/Apiwit_folder/Workspace/Project/My_first_Game/Phase_4_Prototype/notime-game/server/index.js:139) | life/game/socket tests and browser scenario register; see coverage below |
| R23 | Pass | [server/game.js:20](E:/Apiwit_folder/Workspace/Project/My_first_Game/Phase_4_Prototype/notime-game/server/game.js:20) | life/game/socket tests and browser scenario register; see coverage below |
| R24 | Pass | [server/game.js:454](E:/Apiwit_folder/Workspace/Project/My_first_Game/Phase_4_Prototype/notime-game/server/game.js:454) | life/game/socket tests and browser scenario register; see coverage below |
| R25 | Pass | [client/js/art.js:43](E:/Apiwit_folder/Workspace/Project/My_first_Game/Phase_4_Prototype/notime-game/client/js/art.js:43) | life/game/socket tests and browser scenario register; see coverage below |
| R26 | Pass | [server/life.js:113](E:/Apiwit_folder/Workspace/Project/My_first_Game/Phase_4_Prototype/notime-game/server/life.js:113) | life/game/socket tests and browser scenario register; see coverage below |

Additional critical references: [server/game.js:126](E:/Apiwit_folder/Workspace/Project/My_first_Game/Phase_4_Prototype/notime-game/server/game.js:126) for fixed physical counts; [server/game.js:148](E:/Apiwit_folder/Workspace/Project/My_first_Game/Phase_4_Prototype/notime-game/server/game.js:148) for refill; [server/index.js:179](E:/Apiwit_folder/Workspace/Project/My_first_Game/Phase_4_Prototype/notime-game/server/index.js:179) for stale-version rejection; [server/life.js:119](E:/Apiwit_folder/Workspace/Project/My_first_Game/Phase_4_Prototype/notime-game/server/life.js:119) for eligibility/cost/quantity/quota gating; [server/life.js:160](E:/Apiwit_folder/Workspace/Project/My_first_Game/Phase_4_Prototype/notime-game/server/life.js:160) for atomic life actions; [client/js/client.js:146](E:/Apiwit_folder/Workspace/Project/My_first_Game/Phase_4_Prototype/notime-game/client/js/client.js:146) for real deck-to-hand animation origin.

## Coverage and evidence limits

- Opening five/top-deck order, fixed duplicate counts in both modes, no Workday draw, refill cases (empty/2/4/5/6/9), shared reshuffle, unavailable draws, private hands, chosen discard and paid mall draw regression: game.test.js. Socket test completes actual Weekend/refill and excludes card identities from public views.
- Home-only sleep, 24 AP without automatic meal, phase resets, work/study repetition and stats, faculty prerequisites/multiple Bachelors, application acceptance/rejection/next-own-turn timing, cash/food/inventory/recipes, weekly dividends, casino and jail: life.test.js. Tests are assertions against actions, not mirrored UI strings.
- Black Market entry independent 10 and 30 endpoint rolls, low-stat clamping, no-action loss, no-repeat inspection/same-destination request, reentry and shields: life.test.js. Selected duplicate instances, exact one/three-card 0.5 AP reward, quota, AP-ceiling space and jail progression are tested. Both-mode repeated salvage/refill/reshuffle preserves every physical card. Existing 100-seed AP/skill stress coverage remains.
- Qualification/goal simulation uses actual travel, purchases, work, two meals and home sleep in both modes. Credentials/employment are setup fixtures: this proves the qualified strategy's reachability, not every starting-M.3 strategy or human enjoyment.
- Browser: normal and reduced motion; two real browser contexts in existing regression; human-only Season solo; Marathon six participants represented by one browser and five socket clients. Six simultaneous browser displays were not individually inspected. Global round advancement and 104-card setup were exercised with real full-rest actions.
- Browser fixtures prepare position/cash/credentials/progress and conserve cards when swapping specific designs into hand. The asserted cooking, eating, study, Resume, offer acceptance, work, entry, salvage, arrest/serve/release, card spending, Weekend refill and goal exit all use real UI actions. A fixture is never substituted for the claimed action.
- Responsive sizes include 1600×1000, 1280×720 and 390×844. Native deck button works by keyboard Enter and mouse. Inventory/equipment survives reconnect; departed finished sessions do not resume. Multiple live-room restart/persistence, bots, offline timeouts and human fun testing are not claimed.

## Screenshots

[Board/deck](./qa-review02/01-board.png) · [Actual refill](./qa-review02/02-refill.png) · [Market](./qa-review02/03-market.png) · [Mall](./qa-review02/04-mall.png) · [Kitchen/appliances](./qa-review02/05-kitchen.png) · [Faculty paths](./qa-review02/06-education.png) · [Resume categories](./qa-review02/07-resumes.png) · [Black Market](./qa-review02/08-black-market.png) · [Custody](./qa-review02/08-jail.png) · [Mobile](./qa-review02/09-layout-390.png) · [Results](./qa-review02/10-results.png) · [Six-player Marathon](./qa-review02/11-marathon-six.png).

## Balance decisions

See [complete balance calculations and career table](../../Phase_3_Pre_Production/data_schema/REVIEW02_BALANCE.md). Game pay is derived from old shift data, not real-wage research. Active cards increased from 34/52 to 43/52; hand-discard/redraw cards from 4/52 to 15/52. Market dividends are ฿300/Turn (฿1,200 per four Turns versus prior ฿1,800), with a 40-Turn cash payback at ฿12,000 cost. These figures remain subject to playtesting.

Confirmed: every entry costs separately randomized 10–30 Health/Happiness, one card gives 0.5 AP, three cards give 0.5 AP total plus a little cash. Proposed: ฿100 triple reward, three salvages/phase, 15% arrest, next-own-Turn custody, 24 AP ceiling requiring space, food/equipment costs, work normalization, study pacing and application chances. They are in editable validated data.

## Changed files

- Rules/data: server/game.js, server/life.js (new), server/index.js, server/data.js; data/balance.json, careers.json, cards.json, events.json, map.json, life.json (new).
- Client: client/index.html, client/js/client.js, art.js, life-ui.js (new), client/css/main.css.
- Verification/config: package.json; server/game.test.js, rooms.test.js, life.test.js (new); scripts/ui-smoke.mjs, ui-review02.mjs (new); qa-review02 logs, result JSON and screenshots.
- Current prototype docs: README.md, GAMEPLAY_CURRENT.md, GAME_MANUAL.md, REVIEW02_CHECKLIST.md, this QA_REVIEW02.md.
- Project docs: root README.md, AI_GUIDELINE.md, ROADMAP.md, CHANGELOG.md, GDD_NoTime_Summary.md; maintained _project_docs copies; Phase_2_Concept_Design/GDD_NoTime_Summary.md.
- Phase 3: PHASE3_KICKOFF.md, PROTOTYPE_CONTRACT.md, REVIEW02_REQUIREMENTS.md; data_schema/CONTRACT_DATA_SHAPES.md, PROPOSED_DATA_PACK.md, REVIEW02_BALANCE.md (new); wireframe/LOCAL_DEMO_LAYOUT.md, REFERENCE_AND_MOTION.md; tech_stack/LOCAL_DEMO_ARCHITECTURE.md.
- Handoff: Draft/REVIEW02_IMPLEMENTATION_PROMPT_EN.md execution status. Earlier planning is retained in explicitly superseded historical sections; prior QA reports remain intact. One-time migration/generation scripts were removed after use.

## Remaining review / operational limits

No failed or blocked technical acceptance items remain. Human fun and numerical balance approval are pending. Single player means one human, with bots still an optional unresolved preference. Rooms/inventory persist only for the life of the server; restart clears all matches, and an offline active participant still blocks until reconnect. There is no spoilage timer, automatic turn timeout, or in-match Reset button. Use Go to lobby after results; see [launch guide](./README.md) and [player manual](./GAME_MANUAL.md).
