# Phase 5 — v0.2.1 implementation and QA

Date: 2026-09-28. All 14 requested changes implemented. Proposed cash/AP balance values await human playtesting; automated results do not establish fun or balance approval.

## Verification

- `node --test server/*.test.js`: **74/74 pass**, zero failures/skips. [Complete log](qa-phase5/server-tests.log)
- `node server/validate-data.js`: pass, 18 venues / 30 careers / 27 card designs / 26 events. [Log](qa-phase5/data-validation.log)
- New browser flow: 11 scenario groups, real button/input actions, normal and reduced motion, desktop/mobile, reconnect; zero page errors. [Result](qa-phase5/browser-phase5.json)
- Review 02 browser regression: 12 scenario groups including actual card play/refill, cooking, applications, arrest/release, results/lobby and six-player Marathon. [Result](qa-phase5/review02-regression/result.json)
- Original browser regression: 17 scenario groups, two browser contexts, manual popup/panel closure, mobile/reduced-motion travel and winning scene; zero page errors. [Executed log](qa-phase5/browser-regression.log)

Browser tests use isolated servers and explicitly prepared location/credential/cash/inventory fixtures. Socket commands and gameplay actions still run through the real server. No live rooms are modified. Historical Review 02 logs are preserved in qa-review02.

## Requirement checklist and implementation

| # | Status | Implementation / verification |
| --- | --- | --- |
| 1 School window | ✅ | [client](client/js/client.js), [catalog UI](client/js/life-ui.js): persistent Study/track panel, book scatter and Step progress; tested through graduation |
| 2 Vocational path | ✅ | [life systems](server/life.js), [balance](data/balance.json), [tests](server/phase5.test.js): Engineering-only entry identity persists; 12 vs 24 Bachelor clicks |
| 3 Work window | ✅ | [client](client/js/client.js): repeat Working stays open, tools/papers/coins scatter; browser verifies particles and repeated clicks |
| 4 Activity tab sizing/lifetime | ✅ | [client](client/js/client.js), [styles](client/css/main.css): bounded rectangular panels, explicit close, no action/outside/Escape dismissal |
| 5 Used Car | ✅ | [card](data/cards.json), [rules](server/life.js), [game](server/game.js): existing Used Car card revised to 8,000, maintenance 250/own Workday, breakdown clears ownership; deck totals unchanged |
| 6 Offer pay | ✅ | [catalog UI](client/js/life-ui.js): both Workday/Weekend rates directly below job name before acceptance, clearly per 1 AP |
| 7 Condominium | ✅ | [map](data/map.json): center (20,13), business zone, connected road; validator and travel reachability pass |
| 8 Single dishes | ✅ | [food catalog](data/life.json), [life systems](server/life.js): three Restaurant-only dishes, distinct prices/eat AP; UI and server charge correct amounts |
| 9 Center popup sizing | ✅ | [styles](client/css/main.css): elongated info/activity/scene rectangles, bounded mobile sizing and no overflow |
| 10 Money-loss animation | ✅ | [game](server/game.js), [life systems](server/life.js), [client](client/js/client.js), [art](client/js/art.js): personal/seasonal/travel loss metadata and money scene above open panels |
| 11 Fridge/store choice | ✅ | [life systems](server/life.js), [catalog UI](client/js/life-ui.js): fridge-gated convenience storage alongside immediate eating; stats apply only on eating |
| 12 Missed meal | ✅ | [game](server/game.js), [life systems](server/life.js): inclusive 3–5 next-own-phase AP, once, stacks with sleep, explanation in scene/HUD; custody/Full Rest supply meals |
| 13 Resignation | ✅ | [life systems](server/life.js): workplace-only main/part-time action and one 30% Workday shift payment; cleared job no longer works or pays again |
| 14 Debt repayment | ✅ | [game](server/game.js), [bank UI](client/js/life-ui.js), [socket tests](server/rooms.test.js): whole-number 1..debt input, cash/AP/turn/location validation; 1000+717, full 2501 and replay protection verified |

## Recorded balance decisions

- Used Car: 8,000 upfront versus regular car 25,000 (32%); 250 maintenance each own Turn. Difference 17,000 equals 68 maintenance payments. Payment starts at the next own Workday after acquisition, including custody; no fee on Weekend/reconnect. This is a proposal, not human-validated balance.
- Single dishes: Krapao 60 / eat 2.5 AP, Chicken Salad 70 / eat 3 AP, Somtam 80 / eat 3.5 AP; purchase 0.25 AP, so buy/eat 2.75/3.25/3.75 AP.
- Resignation: 0 AP; severance rounded to whole baht from 30% × Workday pay/AP × originalShift.apCost. Uses the job's own baseline shift length, without work-passive bonuses. Main mall sales example: 413 × 8 × 30% = 991.2 → 991.
- Hunger: random integer 3/4/5, expected 4 AP, additive to missed sleep. Buying or storing alone never satisfies a meal.
- Buying inventory checks all stored units against bag 6 / fridge 40. Immediate eating requires no storage slot; existing cooking still creates two portions.

## Screenshots

[Work panel](qa-phase5/01-work-panel.png) · [Bank](qa-phase5/02-bank.png) · [Restaurant](qa-phase5/03-restaurant.png) · [Fridge choices](qa-phase5/04-fridge-choice.png) · [Money loss](qa-phase5/05-money-loss.png) · [Mobile panel](qa-phase5/06-mobile-panel.png)

## Reproduce

From this prototype directory:

```powershell
& '..\..\node.exe' --test server/*.test.js
& '..\..\node.exe' server/validate-data.js
$env:PLAYWRIGHT_MODULE='file:///E:/Apiwit_folder/Workspace/My_App/Antigravity%20IDE/resources/app/node_modules/playwright/index.mjs'
$env:PLAYWRIGHT_BROWSER_CHANNEL='chrome'
& '..\..\node.exe' scripts/ui-phase5.mjs
& '..\..\node.exe' scripts/ui-review02.mjs
& '..\..\node.exe' scripts/ui-smoke.mjs
```

New server coverage is in [phase5.test.js](server/phase5.test.js). Existing tests and browser helpers were updated for intentional hunger/menu/window changes. Game/manual/README describe all 14 changes. Rooms remain in memory; bots, persistent accounts and active-player timeout remain unimplemented. Human feedback for v0.2.1 belongs in [Phase 5 playtest log](../../Phase_5_Playtest/PLAYTEST_LOG.md).
