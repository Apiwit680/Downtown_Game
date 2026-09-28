# Downtown — Current Gameplay (Phase 5, v0.2.1)

Updated: 2026-09-28. Implemented local prototype; balance values remain proposals for human playtesting. This is a developer/system reference. The player-facing guide is [GAME_MANUAL.md](./GAME_MANUAL.md).

## Modes and win condition

Season: 16 global Turns, net-savings goal ฿150,000, shared deck 52 cards. Marathon: 96 Turns, goal ฿1,000,000, shared deck 104 cards. Multiplayer has 2–6 players. Single player is one human without bots (documented provisional interpretation). Net savings = cash − debt; loans do not win. Reaching the goal ends the game automatically. At the time limit, rank by Knowledge + normalized net wealth + Happiness + Health, then net savings, Health and original lobby order. A goal winner takes first place.

## Setup and Turn flow

Start: ฿3,000, no debt, Knowledge 12, Happiness 65, Health 72, M.3, Apartment. Choose a random starter and rotate existing lobby order from that seat. Deal five top cards to the starter, then five to each following player. Hands are private, maximum nine cards.

Turn equals a global week. Each player completes Workday (Phase 1/2), then Weekend (Phase 2/2), before the next player. Advance Turn after all players finish both phases. HUD shows Turn N and Phase x/2 with the active name separately. Only the active player's token is drawn. Turn-end/start and application outcomes have animations; reconnect does not replay completed events.

Every phase resets location to Apartment for free and starts with 24 AP, adjusted only by carried penalties/events. There is no automatic food charge. Sleep costs 4 AP and is home-only; it adds Health 3 and Happiness 2. Missing four sleep AP loses Health 4 and Happiness 5 and removes 12–18 AP from the player's next phase. An Apartment emergency-rest option exists with a low starting budget. Full Rest is available before any action with at least 20 initial AP: consume the phase, sleep 20 AP, gain Health 16/Happiness 10, pay ฿180 for its explicit meal; insufficient money instead loses two Health. Full Rest also follows normal transition/refill rules.

## Shared deck and cards

The inspectable shared deck is left beside the map. No automatic Workday/start-of-turn card is drawn. End of each player's Weekend refills only max(0,5−handCount). Hands of five or more draw nothing. If draw pile empties, shuffle the discard pile; if both are empty, draw only available cards. Paid mall draw costs ฿600 + 1 AP once per global Turn, separate from refill. All draws use the same finite pile. Played active cards and chosen discards enter shared discard; passive cards stay outside it until expiry. Investment cards create asset metadata while their physical card goes to discard.

Card play costs 1 AP plus configured cash. Discard/redraw skills block other actions until the choice completes. Each AP-gaining card ID may be used once per phase; this prevents repeated reshuffle/AP loops. Apartment nap card is home-only. In solo, partner-token cards cannot be played; other self/hand cards remain usable.

There are 27 designs; exact counts are in balance.json. Season has 43/52 active cards (82.69%), versus the prior 34/52 (65.38%: 15 active designs ×2 plus four active bonus copies); Marathon doubles each Season count. Learning cards skill_notes, skill_exam_luck and skill_network now grant work experience. New humorous cards include discard/redraw “ล้างมือแบบไม่ล้างจาน”, “กระเป๋าพังแต่แผนปัง”, and experience/mood “ประชุมที่น่าจะเป็นอีเมล”.

## Food and shopping

Market has 13 products, Restaurant three single dishes, and convenience store 18 products. Prepared purchase: 0.25 AP. Default eating: 3 AP, except Restaurant dishes with individual eatAp (2.5/3/3.5); buy-and-eat adds purchase AP. Convenience prepared food can be stored only with a fridge; eat-now remains available. Raw purchase remains an internal 0.5 AP action with no immediate stats, omitted from player copy/manual. Purchased inventory capacity counts all stored units: six without a fridge, 40 with one. No spoilage timer.

| Venue/category | Food | Price ฿ | Eat AP / buy-and-eat AP | Effects |
| --- | --- | --- | --- | --- |
| market / อาหารพร้อมทาน | ลูกชิ้นปิ้ง | 40 | 3 / 3.25 | health +3, happiness +2 |
| market / อาหารพร้อมทาน | หมูปิ้ง | 40 | 3 / 3.25 | health +3, happiness +2 |
| restaurant / อาหารจานเดียว | ผัดกะเพรา | 60 | 2.5 / 2.75 | health +7, happiness +3 |
| restaurant / อาหารจานเดียว | ข้าวยำไก่แซ่บ | 70 | 3 / 3.25 | health +7, happiness +3 |
| restaurant / อาหารจานเดียว | ส้มตำ | 80 | 3.5 / 3.75 | health +7, happiness +3 |
| market / ขนมและของหวาน | เฉาก๊วยนมสด | 35 | 3 / 3.25 | health +1, happiness +6 |
| market / ขนมและของหวาน | ขนมชั้น | 35 | 3 / 3.25 | health +1, happiness +6 |
| market / ขนมและของหวาน | ฝอยทอง | 35 | 3 / 3.25 | health +1, happiness +6 |
| market / เครื่องดื่ม | น้ำผลไม้ | 35 | 3 / 3.25 | health +2, happiness +3 |
| market / เครื่องดื่ม | ชานม | 35 | 3 / 3.25 | health +2, happiness +3 |
| market / เครื่องดื่ม | กาแฟ | 35 | 3 / 3.25 | health +2, happiness +3 |
| market / วัตถุดิบ | หมูสด | 30 | Ingredient | Ingredient; no immediate stats |
| market / วัตถุดิบ | ไก่สด | 30 | Ingredient | Ingredient; no immediate stats |
| market / วัตถุดิบ | ปลา | 30 | Ingredient | Ingredient; no immediate stats |
| market / วัตถุดิบ | ชุดผักสวนครัว | 30 | Ingredient | Ingredient; no immediate stats |
| market / วัตถุดิบ | ผลไม้ตามฤดูกาล | 30 | Ingredient | Ingredient; no immediate stats |
| convenience / ของกินเล่นและฟาสต์ฟู้ด | แซนวิชอบร้อน | 45 | 3 / 3.25 | health +3, happiness +3 |
| convenience / ของกินเล่นและฟาสต์ฟู้ด | เบอร์เกอร์ | 45 | 3 / 3.25 | health +3, happiness +3 |
| convenience / ของกินเล่นและฟาสต์ฟู้ด | ไส้กรอก | 45 | 3 / 3.25 | health +3, happiness +3 |
| convenience / ของกินเล่นและฟาสต์ฟู้ด | ซาลาเปา | 45 | 3 / 3.25 | health +3, happiness +3 |
| convenience / ข้าวกล่องและอาหารแช่แข็ง | ข้าวผัดกะเพรา | 55 | 3 / 3.25 | health +6, happiness +2 |
| convenience / ข้าวกล่องและอาหารแช่แข็ง | ข้าวผัด | 55 | 3 / 3.25 | health +6, happiness +2 |
| convenience / ข้าวกล่องและอาหารแช่แข็ง | ข้าวมันไก่ | 55 | 3 / 3.25 | health +6, happiness +2 |
| convenience / ข้าวกล่องและอาหารแช่แข็ง | บะหมี่สำเร็จรูป | 55 | 3 / 3.25 | health +6, happiness +2 |
| convenience / เครื่องดื่มแช่เย็น | นม | 25 | 3 / 3.25 | health +2, happiness +2 |
| convenience / เครื่องดื่มแช่เย็น | น้ำเปล่า | 25 | 3 / 3.25 | health +2, happiness +2 |
| convenience / เครื่องดื่มแช่เย็น | น้ำอัดลม | 25 | 3 / 3.25 | health +2, happiness +2 |
| convenience / เครื่องดื่มแช่เย็น | ชาเขียว | 25 | 3 / 3.25 | health +2, happiness +2 |
| convenience / เครื่องดื่มแช่เย็น | ชานม | 25 | 3 / 3.25 | health +2, happiness +2 |
| convenience / เครื่องดื่มแช่เย็น | กาแฟพร้อมดื่ม | 25 | 3 / 3.25 | health +2, happiness +2 |
| convenience / เครื่องดื่มชงสด | กาแฟสด | 50 | 3 / 3.25 | health +3, happiness +5 |
| convenience / เครื่องดื่มชงสด | ชาเย็น | 50 | 3 / 3.25 | health +3, happiness +5 |
| convenience / เครื่องดื่มชงสด | ช็อกโกแลต | 50 | 3 / 3.25 | health +3, happiness +5 |
| convenience / เครื่องดื่มชงสด | สมูทตี้ | 50 | 3 / 3.25 | health +3, happiness +5 |

Mall: Appliances and Clothing, separately from paid cards. Refrigerator ฿1,500; microwave ฿900; kitchen set ฿600; comfortable shirt ฿300, Happiness +3. Each purchase costs 1 AP; each unique item can be owned once. Installed items have Apartment graphics and persist through phases/reconnects. Raw ingredients and prepared meal quantities are player-private inventory.

## Kitchen

At Apartment, all recipes are visible; unavailable recipes are grey/disabled with missing ingredient/equipment reasons. Cooking costs 0.25 AP, consumes inputs once and creates two meal portions. Each cooked portion costs 1 AP to eat. A complete two-ingredient recipe uses 1 AP buying raw inputs + 0.25 AP cooking + 2 AP eating two portions = 3.25 AP, excluding transport/equipment purchase, versus 6.5 AP buying/eating two normal meals. A fruit recipe uses one ingredient. Appliances have distinct utility through storage or recipe prerequisites.

| Recipe (2 portions) | Ingredients | Equipment |
| --- | --- | --- |
| หมูผัดผัก | หมูสด ×1, ชุดผักสวนครัว ×1 | kitchen_set |
| ไก่อบไมโครเวฟ | ไก่สด ×1, ชุดผักสวนครัว ×1 | microwave |
| ปลานึ่ง | ปลา ×1, ชุดผักสวนครัว ×1 | kitchen_set |
| สลัดผลไม้เย็น | ผลไม้ตามฤดูกาล ×1 | fridge |

## Education and jobs

Choose vocational or general at School. Highschool/vocational need eight repeated study clicks; Diploma needs 12 after vocational. Each click costs 1 AP + ฿50 and adds Knowledge 0.35 (plus study passive bonus). At University, four independent faculties: Business, Engineering, Medical, Liberal Arts. Academic Bachelor 24 clicks at ฿100 each; Vocational Diploma (ปวส.) → Engineering only, Bachelor 12 clicks at ฿100 each; Master 32 at ฿160; Doctorate 40 at ฿250. Each click is 1 AP and base Knowledge +0.35. Master requires the same faculty's Bachelor; Doctorate its Master. Multiple faculty Bachelors are allowed for academic entrants. Vocational entry identity persists after graduation and restricts enrollment to Engineering; Master/Doctorate time is unchanged. Completing degrees never fills Knowledge instantly: one Bachelor contributes 8.4 base Knowledge over 24 clicks.

Job Center groups workplace → Part time / Full time. Position requirements show degree/faculty and experience. A player holds one main job plus one part-time job. Existing part-time start timing is next global Turn. Full-time Resume costs 1 AP per submission, permits multiple pending positions/workplaces, and resolves at the player's next own Workday start. Chance = min(0.95, 0.55 + 0.015 × max(0, experience−requiredExperience)), conditional on eligibility. Accepted offers persist until chosen; choosing one replaces main employment and clears alternative offers. An accepted offer is not instant employment. Work at the named location once the position is ready and the phase is eligible. The persistent Working button works locally or guides travel to the workplace.

Each work click: 1 AP, configured cash/experience, Health −0.6, Happiness −0.45. No once-per-phase restriction. Workday pay = round(old shift pay / old AP ×0.6). Weekend = round(old baseline ×0.6×0.55). This is game normalization, not factual wage research. Main job loss: miss two consecutive or four total weeks; part-time: two consecutive available weeks. Custody weeks are excused. Offer notifications show an eight-click Workday income estimate and actual per-AP rate, not guaranteed phase wages.

| Job / workplace | Entry | Old shift pay/AP | Workday/AP | Weekend/AP | XP/AP |
| --- | --- | --- | --- | --- | --- |
| ผู้ช่วยงานโรงพยาบาล / hospital | vocational; XP 0 | 5800/8 | 435 | 239 | 0.38 |
| พยาบาลประจำแผนก / hospital | bachelor medical; XP 9 | 10200/8 | 765 | 421 | 0.38 |
| พนักงานขายห้าง / mall | vocational; XP 0 | 5500/8 | 413 | 227 | 0.38 |
| ผู้จัดการแผนกห้าง / mall | bachelor business; XP 12 | 10500/8 | 788 | 433 | 0.38 |
| เจ้าหน้าที่ต้อนรับฟิตเนส / fitness | vocational; XP 0 | 5400/8 | 405 | 223 | 0.38 |
| ผู้ฝึกสอนฟิตเนส / fitness | diploma; XP 6 | 7800/8 | 585 | 322 | 0.38 |
| เจ้าหน้าที่บริการธนาคาร / bank | diploma; XP 0 | 7700/8 | 578 | 318 | 0.38 |
| นักวิเคราะห์การเงิน / bank | bachelor business; XP 12 | 11400/8 | 855 | 470 | 0.38 |
| เจ้าหน้าที่ธุรการโรงเรียน / school | vocational; XP 0 | 5600/8 | 420 | 231 | 0.38 |
| ครูประจำวิชา / school | bachelor liberal_arts; XP 6 | 10600/8 | 795 | 437 | 0.38 |
| ผู้ประสานงานมหาวิทยาลัย / university | bachelor liberal_arts; XP 6 | 10500/8 | 788 | 433 | 0.38 |
| ช่างเทคนิคยานยนต์ / automotive | vocational; XP 0 | 6600/8 | 495 | 272 | 0.38 |
| ช่างเทคนิคอาวุโส / automotive | diploma; XP 9 | 8700/8 | 653 | 359 | 0.38 |
| วิศวกรยานยนต์ / automotive | bachelor engineering; XP 12 | 11400/8 | 855 | 470 | 0.38 |
| ผู้จัดการร้านอาหาร / restaurant | vocational; XP 6 | 6000/8 | 450 | 248 | 0.38 |
| ผู้ดูแลสต็อกตลาด / market | vocational; XP 0 | 5800/8 | 435 | 239 | 0.38 |
| เจ้าหน้าที่การเงินกาสิโน / casino | diploma; XP 6 | 8200/8 | 615 | 338 | 0.38 |
| ผู้ช่วยขนเวชภัณฑ์ / hospital | m3; XP 0 | 1600/5 | 192 | 106 | 0.2 |
| ผู้จัดเรียงสินค้า / mall | m3; XP 0 | 1600/5 | 192 | 106 | 0.2 |
| ผู้ดูแลอุปกรณ์ฟิตเนส / fitness | m3; XP 0 | 1400/5 | 168 | 92 | 0.2 |
| ผู้ช่วยประชาสัมพันธ์ธนาคาร / bank | m3; XP 0 | 1600/5 | 192 | 106 | 0.2 |
| ผู้ช่วยงานโรงเรียน / school | m3; XP 0 | 1500/5 | 180 | 99 | 0.2 |
| ผู้ช่วยกิจกรรมมหาวิทยาลัย / university | m3; XP 0 | 1600/5 | 192 | 106 | 0.2 |
| ผู้ช่วยล้างและตรวจรถ / automotive | m3; XP 0 | 1700/5 | 204 | 112 | 0.2 |
| ผู้ช่วยร้านค้าตลาด / market | m3; XP 0 | 1500/5 | 180 | 99 | 0.2 |
| แคชเชียร์เซเว่น / convenience | m3; XP 0 | 1400/5 | 168 | 92 | 0.2 |
| ผู้ช่วยล้างจาน / restaurant | m3; XP 0 | 1400/5 | 168 | 92 | 0.2 |
| ผู้ช่วยกิจกรรมพักผ่อน / ticket_venue | m3; XP 0 | 1500/5 | 180 | 99 | 0.2 |
| พนักงานร้าน Hang out / hangout | m3; XP 0 | 1800/5 | 216 | 119 | 0.2 |
| ผู้ช่วยดูแลพื้นที่กาสิโน / casino | m3; XP 0 | 1600/5 | 192 | 106 | 0.2 |

## Travel, casino, income and Black Market

Connected map: 18 venues, roads/bus stops, walking/bus/motorcycle/taxi/owned car. Server calculates route, AP, fare, effects and target. Travel-event chances: walk 8%, bus/taxi 25%, motorcycle 18%, car 15%; event lists differ by mode. Events can affect money, Health and Happiness, only for the traveler. Configured shields apply to events, not mandatory Black Market entry loss.

Casino: 0.5 AP per bet, repeat while affordable. Stakes ฿200/500/1,000/5,000 within configured min/max, win chance 12%, gross win multiplier six. Loss costs three Happiness. It is a risky negative expected-value activity, not a reliable income strategy.

Market-stall shares cost ฿12,000 and pay ฿300 once per global Turn end: ฿1,200 over four Turns, reduced from ฿1,800 monthly. Cash payback is 40 Turns; this investment is not short-horizon income. Other asset/passive/rent/debt systems stay monthly (four Turns); rent ฿3,000, debt interest 4% monthly.

**Black Market entry:** Every actual arrival immediately subtracts separately randomized integer 10–30 Health and 10–30 Happiness, even without service use. Once per entry; leaving/returning rolls again. Inspection, reconnect and duplicate requests never deduct again. Stats clamp at zero. These losses are independent of travel events and unavoidable by event shields.

Salvage one hand card → 0.5 AP. Three selected card instances → 0.5 AP total + ฿100. Up to three salvage actions per phase; require at least 0.5 AP space below the 24 AP ceiling. Selected cards go to shared discard. Each salvage has 15% arrest chance: custody occupies the player's next own global-Turn slot, both phases at Apartment. Only serve-custody actions are permitted; travel/work/cards are blocked. Rest/food are supplied, no additional sleep penalty, no job-absence loss; applications still resolve and income continues. Complete both custody phases, refill at Weekend end, then release next Turn. These quota/cash/risk/custody details are designer proposals; the two 0.5 AP rewards and 10–30 entry losses are developer-confirmed.

## Lifecycle and verification

Pre-match Exit behavior is preserved. Go to lobby after results clears this browser's room session, releases its socket membership and permits a new room. Other participants retain results. Last departure removes the completed room. Refresh cannot restore a departed player. The server still uses in-memory rooms; restarting clears all matches. An offline active player still blocks the room until reconnect; persistent accounts/bots/automatic timeout are not implemented.

Mutating socket actions require the current state version; stale/replayed requests are rejected without another charge/reward. Server independently validates turn, location and offered actions. Repayment accepts arbitrary safe integers checked against AP, cash and debt. See [Review 02 QA](./QA_REVIEW02.md) and [acceptance checklist](./REVIEW02_CHECKLIST.md). Technical checks do not establish human fun/balance approval.


## Phase 5 updates — v0.2.1

1. School: track selection/Study keep the panel open, including graduation. Step X of Y shows completed clicks; books scatter from the clicked button with reduced-motion support.

2. Vocational Diploma → Engineering only; Bachelor 12 × 1 AP versus Academic 24 × 1 AP. Tuition 100/click; Master 32 and Doctorate 40 unchanged. Entry track persists.

3. Work: repeatable 1 AP in the open panel; tools, papers and coins scatter from the clicked button.

4. Activity tabs: bounded rectangles with explicit × close. Actions, outside clicks and Escape do not close them; a player can explicitly select another venue.

5. Existing vehicle_used_car is now Used Car: proposed 8,000 + 1 AP; maintenance 250 each own Workday (also during custody). No fee on Weekend, inspection or reconnect. Unaffordable fee is not charged; ownsCar and usedCar become false, with notice and car travel disabled. Regular automotive car remains 25,000 without this fee. Deck counts remain 52/104.

6. Offer acceptance: Workday pay and Weekend pay below job name, per 1 AP click, not automatic shift income.

7. Condominium: (12,23) → (20,13), central business zone and connected road spur. Phase reset/sleep still use Apartment.

8. Single dishes: Restaurant only. Krapao 60 / eat 2.5 AP, Chicken Salad 70 / eat 3 AP, Somtam 80 / eat 3.5 AP; buy-and-eat 2.75 / 3.25 / 3.75 AP. Other foods unchanged.

9. Popups: prominent elongated rectangles, responsive desktop widths up to 820px (info), 620px (activity), 760px (animated notices); bounded height avoids fullscreen.

10. Money-loss events: personal, seasonal and travel show center money animation above panels, with shield-adjusted loss. Seasonal notifications queue once for each affected player’s next phase.

11. Fridge: unlocks convenience-store eat-now or buy/store choices. Storing adds inventory only; later eating applies stats and satisfies a meal. Purchase checks storage capacity.

12. Hunger: no meal queues an independent random integer 3–5 AP off next own phase; Weekend carries to next own Workday. Stack with sleep, consume once, explain in scene/HUD. Buying/storing does not count; Full Rest and custody supply meals.

13. Resignation: only actual open workplace, main or part-time slot. Proposed 0 AP cost; severance = round(0.30 × Workday pay/AP × job.originalShift.apCost). Use each job’s baseline shift length, even on Weekend, without passive bonuses. Clear slot/readiness/absence counters; no repeat payment from resigned job.

14. Bank: repay any whole amount 1..debt, capped only by debt and available cash, 1 AP/payment. 1,717 can be paid as 1,000 then 717 or once. Reject zero/fractions/strings/excess/wrong location/turn; stale replay cannot debit twice. Borrow presets stay 1,000/5,000 within limit.

[Latest QA](./QA_PHASE5.md). Review 02 QA remains historical evidence. Human balance approval pending.
