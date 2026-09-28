# Downtown — Phase 5 local prototype v0.2.1

Updated 2026-09-28. Multiplayer 2–6 or human-only Single player; Season/Marathon. Downtown is a working title. Game values are proposed balance, not real wages.

Latest verification: **74/74 server tests and data validation pass**; new Phase 5 browser 11 groups, Review 02 regression 12 groups and original browser regression 17 groups pass, zero page errors. [Evidence](./QA_PHASE5.md)

## Launch (PowerShell, from this directory)

```powershell
& '..\..\node.exe' .\server\index.js
```

Open http://localhost:3000. No pnpm or dependency reinstall is needed in this workspace. Choose Single player to start alone; Multiplayer requires 2–6 people. Share the room code/LAN host address for others. Rooms are in memory. Ctrl+C and restarting clears every room.

## Play and controls

Map-first interface with one active token, left shared deck, grouped food/job/shop panels, faculty paths, Working button, Apartment appliances/Kitchen and Black Market. Click a venue, choose transport, then use available actions. Every phase resets home and normally starts with 24 AP. Shared opening hand is five; only Weekend completion refills to five. Sleep is home-only. Go to lobby is available after results; pre-game Exit is unchanged.

[Gameplay/system reference](./GAMEPLAY_CURRENT.md) · [How to Play](./GAME_MANUAL.md) · [QA evidence](./QA_REVIEW02.md) · [Acceptance checklist](./REVIEW02_CHECKLIST.md) · [Balance calculations](../../Phase_3_Pre_Production/data_schema/REVIEW02_BALANCE.md)

## Verify

```powershell
& '..\..\node.exe' .\server\validate-data.js
& '..\..\node.exe' --test server/*.test.js
$env:PLAYWRIGHT_MODULE='file:///E:/Apiwit_folder/Workspace/My_App/Antigravity%20IDE/resources/app/node_modules/playwright/index.mjs'
$env:PLAYWRIGHT_BROWSER_CHANNEL='chrome'
& '..\..\node.exe' .\scripts\ui-smoke.mjs
& '..\..\node.exe' .\scripts\ui-review02.mjs
```

The browser commands use this machine's available Playwright runtime and installed Chrome. A portable checkout needs its own Playwright/browser setup. Edge failed to launch in the current environment; Chrome works. QA creates an isolated server and synthetic setup; it does not modify live rooms. Technical results and human playtest approval are separate. The documented offline-active-player wait and in-memory lifetime remain limitations; bots are not implemented.


## Phase 5 update — all 14 changes

| Item | Current behavior |
| --- | --- |
| 1 School | Persistent track/Study, book burst, Step X of Y |
| 2 Vocational | Diploma → Engineering only; Bachelor 12 versus Academic 24 clicks |
| 3 Work | Persistent repeat work, tools/papers/coins burst |
| 4 Activity tabs | Bounded rectangle, × close only; no action/outside/Escape auto-close |
| 5 Used Car | Proposed 8,000 cost, 250 each own Workday; unpaid fee revokes ownership |
| 6 Job acceptance | Workday/Weekend pay below name, per 1 AP |
| 7 Condominium | Center (20,13), connected road |
| 8 Meals | Three distinct-price/AP single dishes moved to Restaurant |
| 9 Popups | Enlarged elongated rectangles within responsive bounds |
| 10 Money loss | Center animation for personal/seasonal/travel losses |
| 11 Fridge/store | Fridge unlocks convenience buy/store alongside eat now |
| 12 Hunger | No meal → random 3–5 AP off next own phase; reason shown |
| 13 Resignation | Actual workplace, both job slots, 30% Workday shift severance once |
| 14 Debt | Any integer 1..debt, cash/AP checked; 1000 + 717 or full debt |

[Latest QA/evidence](./QA_PHASE5.md) · [Full rules](./GAMEPLAY_CURRENT.md) · [Manual](./GAME_MANUAL.md) · [Playtest](../../Phase_5_Playtest/README.md). Balance proposals await human review.

New browser verification (with the Playwright environment above):

```powershell
& '..\..\node.exe' .\scripts\ui-phase5.mjs
```
