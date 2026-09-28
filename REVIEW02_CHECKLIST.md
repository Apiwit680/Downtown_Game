# Review 02 — Implementation Acceptance Checklist

Prepared: 2026-09-27; verified: 2026-09-28. Source: `Draft/รีวิว02.txt` and [Review 02 requirements](../../Phase_3_Pre_Production/REVIEW02_REQUIREMENTS.md).

**Current status: 55 technical acceptance items Pass, with 57/57 server tests and both browser suites passing.** See [QA_REVIEW02.md](./QA_REVIEW02.md). Human fun/balance approval is separate and pending.

Executed evidence and limits are recorded below and in the QA report. Pass denotes technical behavior under the stated fixtures/coverage; it does not denote human playtest approval.

## A. Board, AP and Turn Flow

- [x] **R01** Deck is visibly left beside the map at desktop and mobile sizes; counts match server state; keyboard/mouse inspection works; animation starts at its actual rendered position.
- [x] **R02** Normal sleep is offered/accepted only at Apartment; remote/forged requests are rejected; emergency rest and sleep-themed cards have no roadside bypass; recovery remains possible.
- [x] **R03** Workday and Weekend both start at Apartment, including next player, next global Turn and forced transitions; resets charge no travel fare/AP and trigger no travel event.
- [x] **R04** An ordinary phase exposes exactly 24 AP with no automatic basic-food charge; a carried penalty/effect adjusts it once; no duplicate meal charge or stale food-complete label remains.
- [x] **R05** HUD displays global `Turn N` and `Phase 1/2` or `2/2`; Turn advances after all players finish Weekend, including solo; monthly systems keep correct four-Turn cadence.
- [x] **R06** Server-confirmed end-of-turn and next-player-start animations play once, in order with refill; Workday → Weekend stays a phase change; reduced motion/reconnect/full-rest/final-round paths behave correctly.
- [x] **R07** Exactly the active character appears on the map during play; other portraits still work; opening deals reach recipient docks without exposing other hands.

## B. Food and Home Inventory

- [x] **R08** Market has all **16** requested entries in the five specified categories: snacks 2, dishes 3, desserts 3, drinks 3, raw ingredients 5.
- [x] **R09** Convenience store/7-11 has all **18** requested entries in four categories: snacks 4, boxed/frozen meals 4, cold drinks 6, prepared drinks 4.
- [x] **R10a** Ready-to-eat purchases support immediate consumption where configured; ordinary eating costs >1 AP (normal meal baseline 3); category/item effects differ and apply once.
- [x] **R10b** Raw purchasing costs 0 < AP < 1, grants inventory and no immediate stats; fractional AP is precise; player copy/manual do not explicitly explain this fractional raw-purchase rule.
- [x] **R10c** Wrong venue, insufficient cash/AP, invalid quantities, repeated/stale requests and double consumption are rejected without partial charges or rewards.
- [x] **R25a** Mall has usable Appliances and Clothing categories, separate from paid card draws; refrigerator, microwave and kitchen-equipment purchases work and obey unique ownership rules.
- [x] **R25b** Appliances appear graphically at Apartment and persist through both phase resets, turn changes and reconnects.
- [x] **R26a** Kitchen lists all recipes; unavailable ones are visibly grey/disabled with missing ingredient/equipment reasons; server independently enforces the same prerequisites.
- [x] **R26b** Cooking consumes exact ingredient quantities once and produces stored meal portions; eating consumes a portion once at exactly 1 AP; raw ingredients grant no immediate food stats.
- [x] **R26c** Full purchase/travel/cook/eat AP budget documents an actual time benefit; refrigeration/equipment rules have defined utility; no stale inventory, negative quantities or free duplicate meals.

## C. Employment and Education

- [x] **R11** Persistent `Working` icon appears after hiring; every valid click costs exactly 1 AP; more than one click works per phase; workplace/start-date/AP rules block invalid work.
- [x] **R12a** Every job has documented Workday/Weekend pay per AP; Weekend rate is lower for the same eligible job; cash/experience/stat changes match configured values and rounding.
- [x] **R12b** Work lowers both Health and Happiness; stats stay bounded; attendance and loss rules still work; reasonable work/rest/food play can reach existing mode goals.
- [x] **R13a** Graphical Business, Engineering, Medical and Liberal Arts branches each show Bachelor → Master → Doctorate, progress, cost and prerequisites.
- [x] **R13b** Master/Doctorate eligibility uses the same faculty; a different faculty Bachelor cannot bypass it; multiple Bachelors unlock only their matching higher degrees.
- [x] **R14** Study repeats at exactly 1 AP/click; tuition/progress are charged once; Knowledge growth is gradual; Bachelor no longer sets Knowledge to 100; school/vocational entry routes remain coherent.
- [x] **R15** Learning-to-experience card mapping is documented; card titles/descriptions/effects/art agree; experience helps job rules; obsolete references do not break deck validation.
- [x] **R16** Job Center is Workplace → Part time / Full time → Positions; education/faculty/experience requirements and unmet conditions match server eligibility.
- [x] **R17a** Multiple full-time Resume submissions persist with configurable uncertain acceptance affected by experience; same-phase Weekend and another player's turn do not resolve them early.
- [x] **R17b** Results resolve once at applicant's next own Workday start; animated accepted offers show workplace/position and honest phase-income estimate/per-AP rate; rejections are visible; multiple offers/main-job replacement are consistent.
- [x] **R17c** Reconnect/stale applications cannot repeat fees/offers; part-time timing is documented and preserved unless explicitly revised; pending applications remain correct in solo and jail flows.

## D. Cards, Events and Black Market

- [x] **DECK-1** Season 52 / Marathon 104 exact configured physical cards; all IDs/distributions valid; increased action/hand-card probability is quantified without changing totals.
- [x] **DECK-2** Random starter; 5 top cards dealt to starter first then everyone in order; opening animations show exactly those deals; starter has 5 with no phantom sixth card.
- [x] **DECK-3** No automatic card at Workday start or Workday → Weekend; Weekend ending refills hands of 0/2/4 to 5 when cards exist; hands of 5/6/9 receive zero.
- [x] **DECK-4** Refill works through explicit End Phase, Full Rest and any forced completion; outgoing animation is preserved; empty draw pile reshuffles discards; both empty produces only available cards.
- [x] **DECK-5** Hands remain private in socket payloads/animations; hand-limit, chosen discards and paid mall/card-effect draws remain valid; physical card count is conserved across all zones.
- [x] **R18** Varied transport events demonstrably affect cash, Health and Happiness; event probabilities/scopes match configuration; only traveler is affected; trip/outcome cannot replay.
- [x] **R19** Market-share card pays once per global Turn boundary; new four-Turn total is below old 1,800 monthly baseline; no duplicate monthly income; other monthly assets/fees still work.
- [x] **R20** Humorous hand/action cards exist with clear effects/timing/counterplay; target/privacy/solo rules work; deck composition increases their actual frequency; no unbounded AP/draw/money loop.
- [x] **R21a** Black Market venue is reachable and has distinct graphics; 1 selected card grants 0.5 AP; 3 selected cards grant **0.5 AP total plus a small cash reward**, as clarified by the developer; selected duplicate card instances are handled distinctly.
- [x] **R21b** Arrest chance is server-selected; one-Turn custody/release semantics are documented and tested; Apartment starts, sleep, applications, attendance, dividends and refill do not softlock or double-charge.
- [x] **R21c** Invalid salvage quantities/selections are rejected; AP/cash rewards and discarded cards occur once; repeated salvage/draw/refill/reshuffle combinations demonstrably terminate or meet explicit bounded rules.
- [x] **R21d** Actual Black Market arrival immediately deducts separately randomized **10–30 Health and 10–30 Happiness**, inclusive, even when no activity is performed or the player immediately leaves; both losses are shown and are separate from travel events/arrest.
- [x] **R21e** Entry penalty applies once per visit; further venue actions, remote inspection, panel updates, reconnect and duplicate/stale requests do not repeat it; leaving and returning triggers a fresh pair of rolls.
- [x] **R21f** Seeded/controlled RNG tests demonstrate both 10 and 30 endpoints and separate stat rolls; low starting stats clamp at existing bounds; Gameplay and How to Play explain the unavoidable entry losses even without service use.

## E. Casino, Solo and Lifecycle

- [x] **R22** `Go to lobby` after results returns to start, clears saved session/overlays/queues and permits a new match; refresh cannot resume old match; other players retain their results.
- [x] **R23a** Single-player option exists and matches developer answer or documented assumption; both Season and Marathon start with one human if human-only solo is chosen; no bot promise without implementation.
- [x] **R23b** Solo Turn advancement, opening/refill, hiring, jail, scoring and lobby return work; opponent-only effects/partnerships have clear safe behavior; existing 2–6 player matches still work.
- [x] **R24** Casino loss lowers Happiness; repeated betting exceeds old two-bet cap while affordable; positive AP/bet is <2; insufficient resources and duplicate/stale wagers cause no repeated payout/loss.
- [x] **REGRESSION** Host/guest pre-match Exit, cancellation, join/resume/replacement, transport routes, sleep penalties, Full Rest, goal/net-debt scoring and final ranking remain coherent after rule changes.

## F. Documentation and Verification Gates

- [x] **DOC-1** `GAMEPLAY_CURRENT.md` describes only implemented rules and precise Turn/card/food/work/study/application/economy/home/solo/jail flow.
- [x] **DOC-2** `GAME_MANUAL.md` explains actual controls, includes one complete Turn and cooking example, and omits the requested raw-cost explanation; no old 21 AP / roadside sleep / 7 AP study / instant Bachelor / instant full-time hiring claims remain.
- [x] **DOC-3** Root/prototype READMEs, Phase 2 GDD, Phase 3 kickoff/contracts/schemas/layout/motion/architecture and maintained central/root planning copies align; original feedback and historical QA are preserved.
- [x] **DOC-4** Balance tables show per-career rates, education pacing, food/cooking costs, event/application/jail probabilities, card distributions and old/new dividends; research sources and proposed values are labeled separately.
- [x] **QA-1** Data validation and all game/unit/socket suites pass; new relevant test files are included; superseded-rule tests are updated meaningfully; actual commands/counts/output are recorded.
- [x] **QA-2** Browser tests exercise the changed UI and genuine action-driven Weekend refill; both modes, solo/2/6 players, reduced motion, reconnect and desktop/mobile coverage have evidence or clearly stated verification limits.
- [x] **QA-3** Long-run/seeded checks cover repeated 1 AP work/study, economy goal reachability, jail progression and Black Market/card loops; no non-finite numbers, negative inventory or unlimited cycles.
- [x] **HANDOFF** Final report maps all R01–R26 to changes and evidence; lists exact paths/line references, launch instructions, assumptions and outstanding Fail/Partial/Blocked items; does not equate passing tests with human fun approval.

## Completed Evidence Register

All technical items below are supported by the executed suite/scenario coverage in the QA report. Exact source locations identify implementation; test logs and browser evidence identify verification.

| Item | Status | Code / test path and line | Executed evidence / artifact | Remaining issue / owner |
| --- | --- | --- | --- | --- |
| R01 | Pass | [client/index.html:13](E:/Apiwit_folder/Workspace/Project/My_first_Game/Phase_4_Prototype/notime-game/client/index.html:13) | [QA coverage and artifacts](./QA_REVIEW02.md) | Human balance review remains separate |
| R02 | Pass | [server/game.js:290](E:/Apiwit_folder/Workspace/Project/My_first_Game/Phase_4_Prototype/notime-game/server/game.js:290) | [QA coverage and artifacts](./QA_REVIEW02.md) | Human balance review remains separate |
| R03 | Pass | [server/life.js:16](E:/Apiwit_folder/Workspace/Project/My_first_Game/Phase_4_Prototype/notime-game/server/life.js:16) | [QA coverage and artifacts](./QA_REVIEW02.md) | Human balance review remains separate |
| R04 | Pass | [server/life.js:21](E:/Apiwit_folder/Workspace/Project/My_first_Game/Phase_4_Prototype/notime-game/server/life.js:21) | [QA coverage and artifacts](./QA_REVIEW02.md) | Human balance review remains separate |
| R05 | Pass | [server/game.js:577](E:/Apiwit_folder/Workspace/Project/My_first_Game/Phase_4_Prototype/notime-game/server/game.js:577) | [QA coverage and artifacts](./QA_REVIEW02.md) | Human balance review remains separate |
| R06 | Pass | [client/js/client.js:139](E:/Apiwit_folder/Workspace/Project/My_first_Game/Phase_4_Prototype/notime-game/client/js/client.js:139) | [QA coverage and artifacts](./QA_REVIEW02.md) | Human balance review remains separate |
| R07 | Pass | [client/js/client.js:109](E:/Apiwit_folder/Workspace/Project/My_first_Game/Phase_4_Prototype/notime-game/client/js/client.js:109) | [QA coverage and artifacts](./QA_REVIEW02.md) | Human balance review remains separate |
| R08 | Pass | [data/life.json:9](E:/Apiwit_folder/Workspace/Project/My_first_Game/Phase_4_Prototype/notime-game/data/life.json:9) | [QA coverage and artifacts](./QA_REVIEW02.md) | Human balance review remains separate |
| R09 | Pass | [client/js/life-ui.js:27](E:/Apiwit_folder/Workspace/Project/My_first_Game/Phase_4_Prototype/notime-game/client/js/life-ui.js:27) | [QA coverage and artifacts](./QA_REVIEW02.md) | Human balance review remains separate |
| R10a | Pass | [server/life.js:183](E:/Apiwit_folder/Workspace/Project/My_first_Game/Phase_4_Prototype/notime-game/server/life.js:183) | [QA coverage and artifacts](./QA_REVIEW02.md) | Human balance review remains separate |
| R10b | Pass | [server/life.js:183](E:/Apiwit_folder/Workspace/Project/My_first_Game/Phase_4_Prototype/notime-game/server/life.js:183) | [QA coverage and artifacts](./QA_REVIEW02.md) | Human balance review remains separate |
| R10c | Pass | [server/life.js:183](E:/Apiwit_folder/Workspace/Project/My_first_Game/Phase_4_Prototype/notime-game/server/life.js:183) | [QA coverage and artifacts](./QA_REVIEW02.md) | Human balance review remains separate |
| R25a | Pass | [client/js/art.js:43](E:/Apiwit_folder/Workspace/Project/My_first_Game/Phase_4_Prototype/notime-game/client/js/art.js:43) | [QA coverage and artifacts](./QA_REVIEW02.md) | Human balance review remains separate |
| R25b | Pass | [client/js/art.js:43](E:/Apiwit_folder/Workspace/Project/My_first_Game/Phase_4_Prototype/notime-game/client/js/art.js:43) | [QA coverage and artifacts](./QA_REVIEW02.md) | Human balance review remains separate |
| R26a | Pass | [server/life.js:113](E:/Apiwit_folder/Workspace/Project/My_first_Game/Phase_4_Prototype/notime-game/server/life.js:113) | [QA coverage and artifacts](./QA_REVIEW02.md) | Human balance review remains separate |
| R26b | Pass | [server/life.js:113](E:/Apiwit_folder/Workspace/Project/My_first_Game/Phase_4_Prototype/notime-game/server/life.js:113) | [QA coverage and artifacts](./QA_REVIEW02.md) | Human balance review remains separate |
| R26c | Pass | [server/life.js:113](E:/Apiwit_folder/Workspace/Project/My_first_Game/Phase_4_Prototype/notime-game/server/life.js:113) | [QA coverage and artifacts](./QA_REVIEW02.md) | Human balance review remains separate |
| R11 | Pass | [server/life.js:100](E:/Apiwit_folder/Workspace/Project/My_first_Game/Phase_4_Prototype/notime-game/server/life.js:100) | [QA coverage and artifacts](./QA_REVIEW02.md) | Human balance review remains separate |
| R12a | Pass | [data/careers.json:21](E:/Apiwit_folder/Workspace/Project/My_first_Game/Phase_4_Prototype/notime-game/data/careers.json:21) | [QA coverage and artifacts](./QA_REVIEW02.md) | Human balance review remains separate |
| R12b | Pass | [data/careers.json:21](E:/Apiwit_folder/Workspace/Project/My_first_Game/Phase_4_Prototype/notime-game/data/careers.json:21) | [QA coverage and artifacts](./QA_REVIEW02.md) | Human balance review remains separate |
| R13a | Pass | [client/js/life-ui.js:20](E:/Apiwit_folder/Workspace/Project/My_first_Game/Phase_4_Prototype/notime-game/client/js/life-ui.js:20) | [QA coverage and artifacts](./QA_REVIEW02.md) | Human balance review remains separate |
| R13b | Pass | [client/js/life-ui.js:20](E:/Apiwit_folder/Workspace/Project/My_first_Game/Phase_4_Prototype/notime-game/client/js/life-ui.js:20) | [QA coverage and artifacts](./QA_REVIEW02.md) | Human balance review remains separate |
| R14 | Pass | [server/life.js:70](E:/Apiwit_folder/Workspace/Project/My_first_Game/Phase_4_Prototype/notime-game/server/life.js:70) | [QA coverage and artifacts](./QA_REVIEW02.md) | Human balance review remains separate |
| R15 | Pass | [data/cards.json:23](E:/Apiwit_folder/Workspace/Project/My_first_Game/Phase_4_Prototype/notime-game/data/cards.json:23) | [QA coverage and artifacts](./QA_REVIEW02.md) | Human balance review remains separate |
| R16 | Pass | [client/js/life-ui.js:9](E:/Apiwit_folder/Workspace/Project/My_first_Game/Phase_4_Prototype/notime-game/client/js/life-ui.js:9) | [QA coverage and artifacts](./QA_REVIEW02.md) | Human balance review remains separate |
| R17a | Pass | [server/life.js:86](E:/Apiwit_folder/Workspace/Project/My_first_Game/Phase_4_Prototype/notime-game/server/life.js:86) | [QA coverage and artifacts](./QA_REVIEW02.md) | Human balance review remains separate |
| R17b | Pass | [server/life.js:86](E:/Apiwit_folder/Workspace/Project/My_first_Game/Phase_4_Prototype/notime-game/server/life.js:86) | [QA coverage and artifacts](./QA_REVIEW02.md) | Human balance review remains separate |
| R17c | Pass | [server/life.js:86](E:/Apiwit_folder/Workspace/Project/My_first_Game/Phase_4_Prototype/notime-game/server/life.js:86) | [QA coverage and artifacts](./QA_REVIEW02.md) | Human balance review remains separate |
| DECK-1 | Pass | [server/game.js:148](E:/Apiwit_folder/Workspace/Project/My_first_Game/Phase_4_Prototype/notime-game/server/game.js:148) | [QA coverage and artifacts](./QA_REVIEW02.md) | Human balance review remains separate |
| DECK-2 | Pass | [server/game.js:148](E:/Apiwit_folder/Workspace/Project/My_first_Game/Phase_4_Prototype/notime-game/server/game.js:148) | [QA coverage and artifacts](./QA_REVIEW02.md) | Human balance review remains separate |
| DECK-3 | Pass | [server/game.js:148](E:/Apiwit_folder/Workspace/Project/My_first_Game/Phase_4_Prototype/notime-game/server/game.js:148) | [QA coverage and artifacts](./QA_REVIEW02.md) | Human balance review remains separate |
| DECK-4 | Pass | [server/game.js:148](E:/Apiwit_folder/Workspace/Project/My_first_Game/Phase_4_Prototype/notime-game/server/game.js:148) | [QA coverage and artifacts](./QA_REVIEW02.md) | Human balance review remains separate |
| DECK-5 | Pass | [server/game.js:148](E:/Apiwit_folder/Workspace/Project/My_first_Game/Phase_4_Prototype/notime-game/server/game.js:148) | [QA coverage and artifacts](./QA_REVIEW02.md) | Human balance review remains separate |
| R18 | Pass | [server/game.js:510](E:/Apiwit_folder/Workspace/Project/My_first_Game/Phase_4_Prototype/notime-game/server/game.js:510) | [QA coverage and artifacts](./QA_REVIEW02.md) | Human balance review remains separate |
| R19 | Pass | [server/game.js:617](E:/Apiwit_folder/Workspace/Project/My_first_Game/Phase_4_Prototype/notime-game/server/game.js:617) | [QA coverage and artifacts](./QA_REVIEW02.md) | Human balance review remains separate |
| R20 | Pass | [data/balance.json:126](E:/Apiwit_folder/Workspace/Project/My_first_Game/Phase_4_Prototype/notime-game/data/balance.json:126) | [QA coverage and artifacts](./QA_REVIEW02.md) | Human balance review remains separate |
| R21a | Pass | [server/life.js:222](E:/Apiwit_folder/Workspace/Project/My_first_Game/Phase_4_Prototype/notime-game/server/life.js:222) | [QA coverage and artifacts](./QA_REVIEW02.md) | Human balance review remains separate |
| R21b | Pass | [server/life.js:222](E:/Apiwit_folder/Workspace/Project/My_first_Game/Phase_4_Prototype/notime-game/server/life.js:222) | [QA coverage and artifacts](./QA_REVIEW02.md) | Human balance review remains separate |
| R21c | Pass | [server/life.js:222](E:/Apiwit_folder/Workspace/Project/My_first_Game/Phase_4_Prototype/notime-game/server/life.js:222) | [QA coverage and artifacts](./QA_REVIEW02.md) | Human balance review remains separate |
| R21d | Pass | [server/life.js:222](E:/Apiwit_folder/Workspace/Project/My_first_Game/Phase_4_Prototype/notime-game/server/life.js:222) | [QA coverage and artifacts](./QA_REVIEW02.md) | Human balance review remains separate |
| R21e | Pass | [server/life.js:222](E:/Apiwit_folder/Workspace/Project/My_first_Game/Phase_4_Prototype/notime-game/server/life.js:222) | [QA coverage and artifacts](./QA_REVIEW02.md) | Human balance review remains separate |
| R21f | Pass | [server/life.js:222](E:/Apiwit_folder/Workspace/Project/My_first_Game/Phase_4_Prototype/notime-game/server/life.js:222) | [QA coverage and artifacts](./QA_REVIEW02.md) | Human balance review remains separate |
| R22 | Pass | [server/index.js:139](E:/Apiwit_folder/Workspace/Project/My_first_Game/Phase_4_Prototype/notime-game/server/index.js:139) | [QA coverage and artifacts](./QA_REVIEW02.md) | Human balance review remains separate |
| R23a | Pass | [server/game.js:20](E:/Apiwit_folder/Workspace/Project/My_first_Game/Phase_4_Prototype/notime-game/server/game.js:20) | [QA coverage and artifacts](./QA_REVIEW02.md) | Human balance review remains separate |
| R23b | Pass | [server/game.js:20](E:/Apiwit_folder/Workspace/Project/My_first_Game/Phase_4_Prototype/notime-game/server/game.js:20) | [QA coverage and artifacts](./QA_REVIEW02.md) | Human balance review remains separate |
| R24 | Pass | [server/game.js:454](E:/Apiwit_folder/Workspace/Project/My_first_Game/Phase_4_Prototype/notime-game/server/game.js:454) | [QA coverage and artifacts](./QA_REVIEW02.md) | Human balance review remains separate |
| REGRESSION | Pass | [Executed logs/browser evidence](./QA_REVIEW02.md) | [QA coverage and artifacts](./QA_REVIEW02.md) | Human balance review remains separate |
| DOC-1 | Pass | [Current Gameplay](./GAMEPLAY_CURRENT.md), [manual](./GAME_MANUAL.md), [balance](../../Phase_3_Pre_Production/data_schema/REVIEW02_BALANCE.md) | [QA coverage and artifacts](./QA_REVIEW02.md) | Human balance review remains separate |
| DOC-2 | Pass | [Current Gameplay](./GAMEPLAY_CURRENT.md), [manual](./GAME_MANUAL.md), [balance](../../Phase_3_Pre_Production/data_schema/REVIEW02_BALANCE.md) | [QA coverage and artifacts](./QA_REVIEW02.md) | Human balance review remains separate |
| DOC-3 | Pass | [Current Gameplay](./GAMEPLAY_CURRENT.md), [manual](./GAME_MANUAL.md), [balance](../../Phase_3_Pre_Production/data_schema/REVIEW02_BALANCE.md) | [QA coverage and artifacts](./QA_REVIEW02.md) | Human balance review remains separate |
| DOC-4 | Pass | [Current Gameplay](./GAMEPLAY_CURRENT.md), [manual](./GAME_MANUAL.md), [balance](../../Phase_3_Pre_Production/data_schema/REVIEW02_BALANCE.md) | [QA coverage and artifacts](./QA_REVIEW02.md) | Human balance review remains separate |
| QA-1 | Pass | [Executed logs/browser evidence](./QA_REVIEW02.md) | [QA coverage and artifacts](./QA_REVIEW02.md) | Human balance review remains separate |
| QA-2 | Pass | [Executed logs/browser evidence](./QA_REVIEW02.md) | [QA coverage and artifacts](./QA_REVIEW02.md) | Human balance review remains separate |
| QA-3 | Pass | [Executed logs/browser evidence](./QA_REVIEW02.md) | [QA coverage and artifacts](./QA_REVIEW02.md) | Human balance review remains separate |
| HANDOFF | Pass | [Executed logs/browser evidence](./QA_REVIEW02.md) | [QA coverage and artifacts](./QA_REVIEW02.md) | Human balance review remains separate |

## Decision Register

| Question | Current state | Required follow-up |
| --- | --- | --- |
| Three-card salvage | Implemented: 3 cards → 0.5 AP total + proposed cash 100; 1 card → 0.5 AP. Proposed limits: 3 salvage actions per phase and 15% arrest chance. | Human playtesting of the proposed cash, limit and arrest probability. |
| Black Market entry stat losses | Implemented and tested: every actual visit costs independently randomized 10–30 Health and 10–30 Happiness, even with no action. Server-owned once-per-entry deduction, reentry, stale requests and feedback are covered. | Human playtesting of the confirmed entry penalty. |
| Single player: human-only solo or computer opponents? | Developer answer pending; human-only solo is provisional. | Implemented/tested human-only solo in both modes; optional computer-opponent preference remains unconfirmed. |
| Numeric balance and jail/equipment details | Implemented proposals, configuration, calculations and technical evidence are recorded in REVIEW02_BALANCE.md and QA_REVIEW02.md. | Human review of pacing, enjoyment and proposed balance values. |
