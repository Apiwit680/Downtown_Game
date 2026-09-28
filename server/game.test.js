import test from 'node:test';
import assert from 'node:assert/strict';
import { loadData } from './data.js';
import { GameRoom } from './game.js';
import { planTrip, shortestRoadDistance, roadTiles } from './path.js';

const sourceData = loadData();
const cloneData = () => structuredClone(sourceData);
const roomWithTwoPlayers = (options = {}) => {
  const data = options.data ?? cloneData();
  data.balance.seasonalChanceSeason = options.seasonalChance ?? 0;
  data.balance.personalEventChance = options.personalChance ?? 0;
  const gameplayRng = options.rng ?? (() => 0.5);
  let choosingStarter = true;
  const rng = () => { if (choosingStarter) { choosingStarter = false; return 0; } return gameplayRng(); };
  const room = new GameRoom({ code: 'TEST01', mode: options.mode ?? 'season', hostId: 'one', hostName: 'หนึ่ง', data, rng });
  room.addPlayer('สอง', 'two');
  room.start('one');
  return room;
};

test('every venue is reachable and a trip rounds only the whole route', () => {
  const home = sourceData.map.locations.find((item) => item.id === 'home');
  for (const venue of sourceData.map.locations) {
    assert.ok(Number.isFinite(shortestRoadDistance(sourceData.map, home, venue)), venue.id);
  }
  const school = sourceData.map.locations.find((item) => item.id === 'school');
  const trip = planTrip(sourceData.map, sourceData.balance, home, school, 'bus');
  assert.equal(trip.ap, Math.ceil((trip.rawAp - 1e-9) * 100) / 100);
  assert.ok(trip.fare > 0);
});

test('rooms support six seats and keep each hand private', () => {
  const data = cloneData();
  data.balance.seasonalChanceSeason = 0;
  data.balance.personalEventChance = 0;
  const room = new GameRoom({ code: 'SIX123', mode: 'season', hostId: 'p0', hostName: 'เจ้าบ้าน', data, rng: () => 0.5 });
  for (let index = 1; index < 6; index += 1) room.addPlayer(`คนที่ ${index}`, `p${index}`);
  assert.throws(() => room.addPlayer('เกิน', 'p6'), /full/);
  room.start('p0');
  room.players[0].hand.push('skill_notes');
  assert.equal(room.viewFor('p0').hand.length, data.balance.startingHandSize + 1);
  assert.equal(room.viewFor('p1').hand.length, data.balance.startingHandSize);
  assert.ok(room.viewFor('p0').players.every((player) => !('hand' in player) && !('deck' in player)));
  assert.equal(room.viewFor('p5').players.length, 6);
});

test('Season and Marathon use one shared deck, randomize the starter, then deal five cards to each player', () => {
  for (const [mode, deckSize] of [['season', 52], ['marathon', 104]]) {
    const data = cloneData();
    data.balance.seasonalChanceSeason = 0;
    data.balance.seasonalChanceMarathon = 0;
    data.balance.personalEventChance = 0;
    const room = new GameRoom({ code: 'DECK01', mode, hostId: 'one', hostName: 'หนึ่ง', data, rng: () => 0.75 });
    room.addPlayer('สอง', 'two');
    room.addPlayer('สาม', 'three');
    room.start('one');
    assert.equal(room.deckSize, deckSize);
    assert.equal(room.startingPlayerId, 'three');
    assert.deepEqual(room.turnOrder, ['three', 'one', 'two']);
    // All players receive exactly 5 cards on opening deal — no automatic first-turn card anymore.
    assert.equal(room.players.find((player) => player.id === 'three').hand.length, 5);
    assert.equal(room.players.find((player) => player.id === 'one').hand.length, 5);
    assert.equal(room.players.find((player) => player.id === 'two').hand.length, 5);
    assert.equal(room.deck.length, deckSize - 15); // 3 players × 5 cards
    assert.deepEqual(room.openingDeal.order, room.turnOrder);
  }
});

test('shared decks use the exact predefined duplicate distribution for each mode', () => {
  for (const [mode, expectedSize] of [['season', 52], ['marathon', 104]]) {
    const data = cloneData();
    data.balance.seasonalChanceSeason = 0;
    data.balance.seasonalChanceMarathon = 0;
    data.balance.personalEventChance = 0;
    const room = new GameRoom({ code: 'MIX001', mode, hostId: 'one', hostName: 'หนึ่ง', data, rng: () => 0 });
    room.addPlayer('สอง', 'two');
    room.start('one');
    const allCards = [...room.deck, ...room.players.flatMap((player) => player.hand)];
    const composition = data.balance.deckComposition[mode];
    assert.equal(allCards.length, expectedSize);
    for (const card of data.cards) {
      const expected = composition.counts[card.id];
      assert.equal(allCards.filter((id) => id === card.id).length, expected, `${mode}:${card.id}`);
    }
  }
});

test('the server checks turn ownership, job eligibility and next-week part-time start', () => {
  const room = roomWithTwoPlayers();
  assert.throws(() => room.act('two', 'end_phase'), /not your turn/);
  assert.throws(() => room.act('one', 'bank', { operation: 'borrow', amount: 5000 }), /unavailable/);
  room.travel('one', 'job_center', 'walk');
  const actions = room.actionsFor('one');
  assert.ok(actions.some((action) => action.type === 'apply_job' && action.payload.jobId === 'mall_stock'));
  assert.ok(!actions.some((action) => action.type === 'apply_job' && action.payload.jobId === 'mall_sales'));
  room.act('one', 'apply_job', { jobId: 'mall_stock' });
  assert.equal(room.activePlayer.parttimeReadyWeek, 2);
  assert.throws(() => room.act('one', 'apply_job', { jobId: 'mall_sales' }), /unavailable/);
});

test('sleep is required per representative phase and missed sleep costs 12–18 AP next phase', () => {
  const room = roomWithTwoPlayers({ rng: () => 0 });
  const first = room.activePlayer;
  assert.equal(first.ap, 24);
  first.hasEaten = true; // isolate sleep penalty; hunger is covered separately
  room.act('one', 'end_phase');
  assert.equal(room.phase, 'weekend');
  assert.equal(first.ap, 12);
  assert.equal(first.stats.health, 0); // no automatic meals; missed sleep loses 4
  room.act('one', 'sleep');
  room.act('one', 'end_phase');
  assert.equal(room.activePlayerId, 'two');
  assert.equal(first.pendingSleepPenalty, 0);
});

test('a venue meal explicitly charges food AP and cash once', () => {
  const room = roomWithTwoPlayers();
  const first = room.activePlayer;
  const startingAp = first.ap;
  room.travel('one', 'market', 'walk');
  const afterTravelAp = first.ap;
  assert.ok(afterTravelAp < startingAp);
  room.act('one', 'activity', { activityId: 'market_fresh_meal' });
  assert.equal(first.ap, afterTravelAp - 3);
  assert.equal(first.cash, 3000 - 220);
  assert.equal(first.stats.health, 5);
  room.act('one', 'activity', { activityId: 'market_fresh_meal' });
  assert.equal(first.ap, afterTravelAp - 6);
  assert.equal(first.cash, 3000 - 440);
});

test('the maximum sleep penalty still leaves a recovery path', () => {
  const room = roomWithTwoPlayers({ rng: () => 0.999 });
  room.act('one', 'end_phase');
  assert.equal(room.activePlayer.ap, 1); // 24 - 18 sleep - 5 hunger; recovery at Apartment
  assert.ok(room.actionsFor('one').some((action) => action.type === 'emergency_rest'));
  room.act('one', 'emergency_rest');
  room.act('one', 'end_phase');
  assert.equal(room.players[0].pendingSleepPenalty, 0);
  assert.equal(room.activePlayerId, 'two');
});

test('repeatable 1 AP study earns credentials without instantly filling Knowledge', () => {
  const room=roomWithTwoPlayers(),p=room.activePlayer;
  room.travel('one','school','bus'); room.act('one','choose_track',{track:'vocational'});
  for(let i=0;i<8;i++)room.act('one','study');
  assert.equal(p.education.level,'vocational'); assert.ok(p.stats.knowledge<20);
  room.travel('one','job_center','walk'); assert.ok(room.actionsFor('one').some(a=>a.type==='apply_job'&&a.payload.jobId==='mall_sales'));
  p.education.level='diploma';p.locationId='university';p.cash=5000;p.ap=2;
  p.education.progress['engineering:bachelor']=11;
  room.act('one','study_degree',{facultyId:'engineering',degree:'bachelor'});
  assert.equal(p.education.degrees.engineering,'bachelor');assert.ok(p.stats.knowledge<100);assert.equal(p.ap,1);
});

test('passive cards renew monthly while paid and expire when fees cannot be paid', () => {
  const room = roomWithTwoPlayers();
  const first = room.activePlayer;
  first.hand.push('microbusiness');
  first.cash = 10000;
  room.act('one', 'play_card', { index: first.hand.indexOf('microbusiness') });
  assert.deepEqual(first.passives, ['microbusiness']);
  first.cash = 10000;
  room.week = 4;
  room.endGlobalWeek();
  assert.equal(first.cash, 7800); // 10,000 - 3,000 rent - 400 fee + 1,200 income
  first.cash = 0;
  room.week = 8;
  room.endGlobalWeek();
  assert.deepEqual(first.passives, []);
  assert.ok(first.debt >= 3000);
});

test('Marathon receives a seasonal event by its guarantee week without exceeding the match cap', () => {
  const room = roomWithTwoPlayers({ mode: 'marathon', rng: () => 0.99 });
  assert.equal(room.seasonalWeeksUsed, 0);
  room.week = room.data.balance.marathonSeasonalGuaranteeWeek;
  room.startGlobalWeek();
  assert.ok(room.seasonalWeeksUsed >= 1);
  assert.ok(room.seasonalWeeksUsed <= 6);
});

test('event on one taxi ride affects only that traveler, including the fare', () => {
  const data = cloneData();
  data.events = data.events.filter((event) => event.id === 'taxi_roundabout');
  data.balance.transportEventChanceByMode.taxi = 1;
  const room = roomWithTwoPlayers({ data, rng: () => 0 });
  const first = room.activePlayer;
  const second = room.players[1];
  const secondCash = second.cash;
  const destination = data.map.locations.find((item) => item.id === 'bank');
  const base = planTrip(data.map, data.balance, first.position, destination, 'taxi');
  const before = first.cash;
  const result = room.travel('one', 'bank', 'taxi');
  assert.equal(result.event, 'taxi_roundabout');
  assert.equal(result.fare, base.fare * 3);
  assert.equal(first.cash, before - result.fare);
  assert.equal(second.cash, secondCash);
});

test('loan proceeds do not trigger the savings goal, but earned net savings do', () => {
  const room = roomWithTwoPlayers();
  const first = room.activePlayer;
  first.cash = 152000;
  first.debt = 10000;
  room.applyEffect(first, { cash: 10000 });
  assert.equal(first.cash - first.debt - 3000, 149000);
  assert.equal(room.status, 'playing');
  room.applyEffect(first, { cash: 1000 });
  assert.equal(room.status, 'finished');
  assert.equal(room.scoreboard[0].playerId, 'one');
  assert.equal(room.scoreboard[0].netSavings, 150000);
});

test('turn limit produces four stat scores and a stable ranking', () => {
  const room = roomWithTwoPlayers();
  room.maxWeeks = 1;
  for (const playerId of ['one', 'one', 'two', 'two']) {
    room.act(playerId, 'end_phase');
  }
  assert.equal(room.status, 'finished');
  assert.equal(room.scoreboard.length, 2);
  for (const row of room.scoreboard) {
    assert.equal(row.total, Math.round((row.knowledge + row.wealth + row.happiness + row.health) * 100) / 100);
    assert.ok(row.rank === 1 || row.rank === 2);
  }
});

test('qualified work with real travel, food and sleep can reach both savings goals', () => {
  for(const mode of ['season','marathon']){
    const room=roomWithTwoPlayers({mode}),worker=room.players[0];
    worker.education.level='bachelor';worker.education.degrees.business='bachelor';worker.mainJobId='bank_analyst';
    let phases=0;
    while(room.status==='playing'&&phases++<room.maxWeeks*4){
      const actor=room.activePlayerId;
      if(actor==='one'){
        room.travel(actor,'market','taxi');
        room.act(actor,'buy_food',{foodId:'pork_skewer'});
        room.act(actor,'buy_food',{foodId:'grass_jelly'});
        room.travel(actor,'bank','taxi');
        const home=room.travelOptionsFor(worker).home.find(t=>t.transport==='taxi');
        while(worker.ap>=home.ap+4+6+1&&room.status==='playing')room.act(actor,'work',{kind:'main'});
        if(room.status==='finished')break;
        room.travel(actor,'home','taxi');room.act(actor,'sleep');
        room.act(actor,'eat_food',{foodId:'pork_skewer'});
        room.act(actor,'eat_food',{foodId:'grass_jelly'});
      }else room.act(actor,'sleep');
      room.act(actor,'end_phase');
    }
    assert.equal(room.status,'finished',mode);assert.equal(room.scoreboard[0].playerId,'one');
    assert.ok(worker.cash-worker.debt>=room.goal,mode);assert.ok(worker.stats.health>0&&worker.stats.happiness>0);
  }
});

test('the shared deck refills the hand to 5 at end of Weekend and the paid mall draw stays separate', () => {
  const room = roomWithTwoPlayers();
  const player = room.activePlayer;
  // Opening deal: 5 cards each, no auto turn draw
  assert.equal(player.hand.length, 5);
  assert.equal(room.deck.length, room.deckSize - 10); // 2 players × 5 cards
  const before = { cash: player.cash, ap: player.ap, deck: room.deck.length };
  // No lastTurnDrawWeek tracking in the new system
  assert.equal(player.cash, before.cash);
  assert.equal(player.ap, before.ap);
  assert.ok(room.actionsFor('one').some((action) => action.type === 'full_rest'));
  assert.throws(() => room.act('one', 'draw_turn'), /unavailable/);
  // Mall draw still works as a paid extra during any phase
  room.travel('one', 'mall', 'walk');
  assert.ok(room.actionsFor('one').some((action) => action.type === 'draw_card'));
  room.act('one', 'draw_card');
  assert.equal(player.hand.length, 6); // 5 + 1 mall draw
  assert.equal(room.deck.length, before.deck - 1);
  assert.equal(player.cash, before.cash - room.data.balance.cardDrawCost);
  assert.throws(() => room.act('one', 'draw_card'), /unavailable/); // only once per phase
  // Advance through Phase 1 and Phase 2 for player one (weekend ends → refill triggers)
  room.travel('one', 'home', 'walk');
  room.act('one', 'sleep');
  room.act('one', 'end_phase'); // end workday — no refill
  room.act('one', 'sleep');
  room.act('one', 'end_phase'); // end weekend → refillHand runs here
  // After refill player one should have 5 cards again (had 5 - 0 used = 5, then mall +1 = 6, then plays nothing, refill to 5 no-ops)
  // Actual: hand was 6 when weekend ended → refill needs max(0, 5-6)=0 cards → hand stays 6
  assert.equal(player.hand.length, 6);
  // Player two's weekend ends → they had 5 and used none → refill = 0
  room.act('two', 'sleep');
  room.act('two', 'end_phase');
  room.act('two', 'sleep');
  room.act('two', 'end_phase');
  assert.equal(room.week, 2);
  assert.equal(room.activePlayerId, 'one');
});

test('refillHand tops up to 5 after the player uses cards during Weekend', () => {
  const room = roomWithTwoPlayers();
  const player = room.activePlayer;
  // Use a card during workday so hand drops to 4
  player.hand = ['skill_notes', 'skill_notes', 'skill_notes', 'skill_notes'];
  const deckBeforeWorkday = room.deck.length;
  room.act('one', 'sleep');
  room.act('one', 'end_phase'); // end workday: never refill here
  assert.equal(player.hand.length, 4);
  assert.equal(room.deck.length, deckBeforeWorkday);
  // Now in Weekend, the player has three cards remaining.
  player.hand = ['skill_notes', 'skill_notes', 'skill_notes'];
  const deckBefore = room.deck.length;
  room.act('one', 'sleep');
  room.act('one', 'end_phase'); // end weekend → refill from 3 to 5 = draw 2
  assert.equal(player.hand.length, 5);
  assert.equal(room.deck.length, deckBefore - 2);
});

test('a Weekend refill reshuffles the shared discard and does not expose drawn card identities', () => {
  const room = roomWithTwoPlayers();
  const player = room.activePlayer;
  player.hand = ['skill_notes', 'skill_notes'];
  room.deck = [];
  room.discard = ['skill_network', 'skill_overtime', 'skill_home_cooking'];
  room.act('one', 'sleep');
  room.act('one', 'end_phase');
  room.act('one', 'sleep');
  room.act('one', 'end_phase');
  assert.equal(player.hand.length, 5);
  assert.equal(room.deck.length, 0);
  assert.equal(room.discard.length, 0);
  const opponentView = room.viewFor('two');
  assert.equal(opponentView.lastPresentation.refillCount, 3);
  assert.ok(!('refillCards' in opponentView.lastPresentation));
  assert.ok(!JSON.stringify(opponentView.lastPresentation).includes('skill_network'));
});

test('Weekend refill does not draw when the hand already exceeds its target', () => {
  const room = roomWithTwoPlayers();
  const player = room.activePlayer;
  room.act('one', 'sleep');
  room.act('one', 'end_phase'); // end workday
  // Force hand near limit before weekend ends
  player.hand = Array(room.handLimit - 1).fill('skill_notes'); // 8 cards
  const deckBefore = room.deck.length;
  room.act('one', 'sleep');
  room.act('one', 'end_phase'); // end weekend → refill tries to add 0 (8 >= 5, no-op)
  // Hand is 8, refill target is 5, need = max(0, 5-8) = 0, no draw, no overflow
  assert.equal(player.hand.length, 8);
  assert.equal(player.pendingDiscard, null);
});

test('discard payloads cannot bypass the hand limit', () => {
  const room = roomWithTwoPlayers();
  const player = room.activePlayer;
  assert.throws(() => room.act('one', 'draw_turn', { count: 99 }), /unavailable/);
  // Skill-based discard+draw still validates payload
  player.hand = ['skill_fresh_start', 'skill_notes'];
  room.act('one', 'play_card', { index: 0 });
  assert.throws(() => room.act('one', 'discard_card', { index: 0, drawCount: 99 }), /unavailable/);
  assert.equal(player.pendingDiscard.count, 1);
  room.act('one', 'discard_card', { index: 0 });
  assert.equal(player.hand.length, 2);
  assert.equal(room.viewFor('one').deck.pendingDiscard, null);
});

test('a skill waits for the chosen discard and draws from the shared finite deck', () => {
  const room = roomWithTwoPlayers();
  const player = room.activePlayer;
  player.hand = ['skill_fresh_start', 'skill_notes', 'skill_home_cooking'];
  room.deck = ['skill_network', 'skill_overtime'];
  room.discard = [];
  room.act('one', 'play_card', { index: 0 });
  assert.deepEqual(player.pendingDiscard, { count: 1, drawCount: 2, sourceCardId: 'skill_fresh_start' });
  assert.deepEqual(room.actionsFor('one').map((action) => action.type), ['discard_card', 'discard_card']);
  assert.throws(() => room.act('one', 'end_phase'), /unavailable/);
  assert.throws(() => room.travel('one', 'market', 'walk'), /discard/);
  assert.throws(() => room.act('one', 'discard_card', { index: 8 }), /unavailable/);
  room.act('one', 'discard_card', { index: 1 });
  assert.equal(player.pendingDiscard, null);
  assert.deepEqual(player.hand, ['skill_notes', 'skill_overtime', 'skill_network']);
  assert.deepEqual(room.discard, ['skill_fresh_start', 'skill_home_cooking']);
  const beforeTotal = player.hand.length + room.deck.length + room.discard.length;
  room.drawFromDeck(player, 1);
  assert.equal(player.hand.length, 4);
  assert.equal(room.discard.length, 0);
  assert.equal(room.deck.length, 1);
  assert.equal(player.hand.length + room.deck.length + room.discard.length, beforeTotal);
  const opponent = room.viewFor('two');
  assert.notDeepEqual(opponent.hand.map((card) => card.id), player.hand);
  assert.ok(!JSON.stringify(opponent.players).includes('skill_fresh_start'));
});


test('travel previews and presentation paths follow roads and match the charged trip', () => {
  const room = roomWithTwoPlayers();
  const player = room.activePlayer;
  room.data.balance.transportEventChanceByMode.bus = 0;
  player.passives = ['transit_pass'];
  const preview = room.viewFor('one').travelOptions.school.find((trip) => trip.transport === 'bus');
  const tiles = roadTiles(room.data.map);
  assert.deepEqual(preview.path[0], player.position);
  assert.deepEqual(preview.path.at(-1), { x: 6, y: 4 });
  for (let index = 0; index < preview.path.length; index += 1) {
    const point = preview.path[index];
    assert.ok(tiles.has(`${point.x},${point.y}`));
    if (index) assert.equal(Math.abs(point.x - preview.path[index - 1].x) + Math.abs(point.y - preview.path[index - 1].y), 1);
  }
  assert.equal(preview.path.length - 1, preview.distanceTiles);
  const before = room.snapshot(player);
  const trip = room.travel('one', 'school', 'bus');
  assert.equal(trip.ap, preview.ap);
  assert.equal(trip.fare, preview.fare);
  assert.deepEqual(room.lastPresentation.before, before);
  assert.equal(room.lastPresentation.rewards.cash, -trip.fare);
  assert.equal(room.lastPresentation.type, 'travel');
  assert.deepEqual(room.lastPresentation.path, preview.path);
  player.stats.health -= 2;
  assert.notEqual(room.lastPresentation.after.stats.health, player.stats.health);
});

test('card actions consume AP so reshuffling skills cannot generate an unlimited free loop', () => {
  const room = roomWithTwoPlayers();
  const player = room.activePlayer;
  player.hand = ['skill_fresh_start', 'skill_power_nap', 'skill_overtime'];
  room.deck = [];
  room.discard = [];
  player.ap=20;
  const before = player.ap;
  room.act('one', 'play_card', { index: 1 });
  assert.equal(player.ap, before + 0.5);
  room.act('one', 'play_card', { index: 0 });
  assert.equal(player.ap, before - 0.5);
  room.act('one', 'discard_card', { index: 0 });
  player.ap = 0.5;
  assert.ok(!room.actionsFor('one').some((action) => action.type === 'play_card'));
  assert.throws(() => room.act('one', 'play_card', { index: 0 }), /unavailable/);
});

test('exhausted skill and nap decks terminate even after repeated reshuffles', () => {
  for (let seed = 1; seed <= 100; seed += 1) {
    let state = seed;
    const rng = () => {
      state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
      return state / 4294967296;
    };
    const room = roomWithTwoPlayers({ rng });
    const player = room.activePlayer;
    player.hand = ['skill_fresh_start', 'skill_fresh_start', 'skill_refocus', 'skill_refocus',
      'skill_power_nap', 'skill_power_nap', 'skill_overtime', 'skill_overtime'];
    room.deck = [];
    room.discard = [];
    player.ap = 3;
    const startingHandSize = player.hand.length;
    // A nap gains 0.5 AP but spends one hand card. Neither skill grows the hand.
    const maximumPlays = startingHandSize + Math.floor(player.ap + startingHandSize * 0.5);
    let plays = 0;
    let reshuffled = false;
    while (true) {
      const playable = room.actionsFor('one').filter((action) => action.type === 'play_card');
      if (!playable.length) break;
      const selected = playable.find((action) => player.hand[action.payload.index] === 'skill_power_nap') ??
        playable.find((action) => player.hand[action.payload.index] === 'skill_fresh_start') ?? playable[0];
      const priorHandSize = player.hand.length;
      const priorRank = 2 * player.ap + priorHandSize;
      const priorDeckSize = room.deck.length;
      const selectedCardId = player.hand[selected.payload.index];
      room.act('one', selected.type, selected.payload);
      while (player.pendingDiscard) {
        const choices = room.actionsFor('one');
        const discard = choices[Math.floor(rng() * choices.length)];
        room.act('one', discard.type, discard.payload);
      }
      if (!priorDeckSize && selectedCardId === 'skill_fresh_start') reshuffled = true;
      const rank = 2 * player.ap + player.hand.length;
      assert.ok(rank < priorRank || (rank === priorRank && player.hand.length < priorHandSize), `decreasing rank: seed ${seed}`);
      assert.ok(player.hand.length <= priorHandSize, `hand must not grow: seed ${seed}`);
      plays += 1;
      assert.ok(plays <= maximumPlays, `finite number of plays: seed ${seed}`);
    }
    assert.ok(reshuffled, `exercised discard reshuffle: seed ${seed}`);
    assert.equal(player.hand.length + room.deck.length + room.discard.length, startingHandSize);
  }
});
