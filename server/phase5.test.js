import test from 'node:test';
import assert from 'node:assert/strict';
import { loadData, validateData } from './data.js';
import { GameRoom } from './game.js';

function setup(two = false) {
  const data = structuredClone(loadData());
  data.balance.personalEventChance = 0;
  data.balance.seasonalChanceSeason = 0;
  const room = new GameRoom({ code: 'PHASE5', mode: 'season', singlePlayer: !two, hostId: 'one', hostName: 'One', data, rng: () => 0 });
  if (two) room.addPlayer('Two', 'two');
  room.start('one');
  return room;
}
function at(room, id) {
  const player = room.activePlayer, location = room.locationMap.get(id);
  player.locationId = id; player.position = { x: location.x, y: location.y };
  return player;
}
function finish(room, eaten = true) {
  const player = room.activePlayer;
  player.hasEaten = eaten; player.sleepAp = 4;
  room.act(player.id, 'end_phase');
}

test('bank repayment accepts 1000 then remaining 717, with exact AP and cash accounting', () => {
  const room = setup(), player = at(room, 'bank'); player.debt = 1717;
  const cash = player.cash;
  room.act(player.id, 'bank', { operation: 'repay', amount: 1000 });
  assert.equal(player.debt, 717); assert.equal(player.ap, 23);
  room.act(player.id, 'bank', { operation: 'repay', amount: 717 });
  assert.equal(player.debt, 0); assert.equal(player.cash, cash - 1717); assert.equal(player.ap, 22);
  assert.ok(!room.actionsFor(player.id).some(a => a.type === 'bank' && a.payload.operation === 'repay'));
});
test('bank repayment permits any whole amount including 1 and full debt above 1000', () => {
  for (const amount of [1, 42, 716, 1717, 2501]) {
    const room = setup(), player = at(room, 'bank'); player.debt = 2501;
    room.act(player.id, 'bank', { operation: 'repay', amount });
    assert.equal(player.debt, 2501 - amount);
  }
});
test('repayment rejects malformed amounts, excess cash/debt, offsite, wrong turn and no AP without mutation', () => {
  const room = setup(true), player = at(room, 'bank'); player.debt = 1717;
  for (const amount of [0, -1, 1.5, '717', NaN, Infinity, 1718]) {
    const before = structuredClone(player), version = room.version;
    assert.throws(() => room.act(player.id, 'bank', { operation: 'repay', amount }), /unavailable/);
    assert.deepEqual(player, before); assert.equal(room.version, version);
  }
  player.cash = 10; assert.throws(() => room.act(player.id, 'bank', { operation: 'repay', amount: 11 }), /unavailable/);
  player.cash = 3000; player.ap = 0; assert.throws(() => room.act(player.id, 'bank', { operation: 'repay', amount: 1 }), /unavailable/);
  player.ap = 24; at(room, 'home'); assert.throws(() => room.act(player.id, 'bank', { operation: 'repay', amount: 1 }), /unavailable/);
  assert.throws(() => room.act('two', 'bank', { operation: 'repay', amount: 1 }), /turn/);
});
test('main and part-time resignation requires the workplace and grants one 30% Workday shift payment', () => {
  for (const kind of ['main', 'parttime']) {
    const room = setup(), player = room.activePlayer;
    const job = room.data.careers.find(j => j.kind === kind), slot = kind === 'main' ? 'mainJobId' : 'parttimeJobId';
    player[slot] = job.id;
    assert.throws(() => room.act(player.id, 'resign_job', { kind }), /unavailable/);
    at(room, job.locationId); room.phase = 'weekend';
    const cash = player.cash;
    room.act(player.id, 'resign_job', { kind });
    assert.equal(player.cash - cash, Math.round(job.payByPhase.workday * job.originalShift.apCost * 0.3));
    assert.equal(player[slot], null);
    assert.throws(() => room.act(player.id, 'resign_job', { kind }), /unavailable/);
    assert.throws(() => room.act(player.id, 'work', { kind }), /unavailable/);
  }
});
test('used car costs 8000, preserves deck identity and pays maintenance only on next own Workday', () => {
  const room = setup(), player = room.activePlayer, card = room.cardMap.get('vehicle_used_car');
  assert.equal(card.cost, 8000); assert.ok(card.cost < room.data.balance.carPrice);
  const index = room.deck.indexOf(card.id); room.deck.splice(index, 1); room.discard.push(...player.hand); player.hand = [card.id]; player.cash = 10000;
  room.act(player.id, 'play_card', { index: 0 });
  assert.equal(player.cash, 2000); assert.equal(player.ownsCar, true); assert.equal(player.usedCar, true);
  finish(room); assert.equal(player.cash, 2000);
  finish(room); assert.equal(player.cash, 1750); assert.equal(player.ownsCar, true);
  assert.ok(player.phaseNotices.some(n => n.includes('฿250')));
  assert.ok(room.travelOptionsFor(player).market.find(t => t.transport === 'car').available);
});
test('used car breakdown revokes car transport without charging unaffordable maintenance; regular car exempt', () => {
  const room = setup(), player = room.activePlayer;
  player.ownsCar = true; player.usedCar = true; player.cash = 249;
  finish(room); finish(room);
  assert.equal(player.cash, 249); assert.equal(player.ownsCar, false); assert.equal(player.usedCar, false);
  assert.throws(() => room.travel(player.id, 'market', 'car'), /car/);
  assert.ok(player.phaseNotices.some(n => n.includes('รถเสีย')));
  player.ownsCar = true; player.usedCar = false;
  finish(room); finish(room); assert.equal(player.cash, 249); assert.equal(player.ownsCar, true);
});
test('hunger endpoints 3 and 5 apply only to next phase with reason and are consumed once', () => {
  for (const [rng, penalty] of [[0, 3], [0.999, 5]]) {
    const room = setup(), player = room.activePlayer; room.rng = () => rng;
    assert.equal(player.ap, 24); finish(room, false);
    assert.equal(player.ap, 24 - penalty); assert.equal(player.pendingHungerPenalty, 0);
    assert.ok(player.phaseNotices.some(n => n.includes('ไม่ได้กิน') && n.includes(String(penalty))));
    finish(room); assert.equal(player.ap, 24);
  }
});
test('Weekend hunger waits for next OWN Workday, leaves other players AP untouched and stacks with sleep', () => {
  const room = setup(true), player = room.activePlayer;
  finish(room); finish(room, false);
  assert.equal(room.activePlayerId, 'two'); assert.equal(room.activePlayer.ap, 24); assert.equal(player.pendingHungerPenalty, 3);
  finish(room); finish(room);
  assert.equal(room.activePlayerId, 'one'); assert.equal(player.ap, 21);
  player.hasEaten = false; player.sleepAp = 0; room.act(player.id, 'end_phase');
  assert.equal(player.ap, 9); assert.equal(player.phaseNotices.length, 2);
});
test('storing food does not prevent hunger, eating does; custody and Full Rest include meals', () => {
  const room = setup(), player = at(room, 'market');
  room.act(player.id, 'buy_food', { foodId: 'pork_skewer' });
  finish(room, player.hasEaten); assert.equal(player.ap, 21);
  room.act(player.id, 'eat_food', { foodId: 'pork_skewer' });
  finish(room, player.hasEaten); assert.equal(player.ap, 24);
  room.act(player.id, 'full_rest'); assert.equal(player.pendingHungerPenalty, 0); assert.equal(player.ap, 24);
  player.custody = true; player.jailWeek = room.week;
  room.act(player.id, 'serve_jail'); assert.equal(player.pendingHungerPenalty, 0);
});
test('Vocational diploma restricts university to Engineering and graduates after exactly 12 study actions', () => {
  const room = setup(), player = at(room, 'university'); player.education.level = 'diploma'; player.education.track = 'vocational'; player.cash = 10000;
  for (const facultyId of ['business', 'medical', 'liberal_arts']) assert.throws(() => room.act(player.id, 'study_degree', { facultyId, degree: 'bachelor' }), /unavailable/);
  for (let i = 0; i < 11; i++) room.act(player.id, 'study_degree', { facultyId: 'engineering', degree: 'bachelor' });
  assert.equal(player.education.degrees.engineering, undefined);
  room.act(player.id, 'study_degree', { facultyId: 'engineering', degree: 'bachelor' });
  assert.equal(player.education.degrees.engineering, 'bachelor'); assert.equal(player.ap, 12);
  assert.equal(player.education.universityEntryTrack, 'vocational');
  assert.throws(() => room.act(player.id, 'study_degree', { facultyId: 'medical', degree: 'bachelor' }), /unavailable/);
  assert.equal(room.degreeCredits(player, 'master'), 32);
});
test('academic track still takes 24 Bachelor actions and has all faculties', () => {
  const room = setup(), player = at(room, 'university'); player.education.level = 'highschool'; player.education.track = 'highschool'; player.cash = 10000;
  assert.equal(room.actionsFor(player.id).filter(a => a.type === 'study_degree').length, 4);
  for (let i = 0; i < 23; i++) room.act(player.id, 'study_degree', { facultyId: 'business', degree: 'bachelor' });
  assert.equal(player.education.degrees.business, undefined);
  room.act(player.id, 'study_degree', { facultyId: 'business', degree: 'bachelor' });
  assert.equal(player.education.degrees.business, 'bachelor'); assert.equal(player.ap, 0);
});
test('single dishes are restaurant-only and charge their distinct AP and prices', () => {
  const room = setup(), player = at(room, 'market');
  const dishes = room.data.life.foods.filter(f => f.category === 'อาหารจานเดียว');
  assert.equal(new Set(dishes.map(f => f.price)).size, dishes.length);
  assert.equal(new Set(dishes.map(f => f.eatAp)).size, dishes.length);
  for (const food of dishes) {
    at(room, 'market'); assert.throws(() => room.act(player.id, 'buy_eat', { foodId: food.id }), /unavailable/);
    at(room, 'restaurant'); const cash = player.cash, ap = player.ap;
    room.act(player.id, 'buy_eat', { foodId: food.id });
    assert.equal(player.cash, cash - food.price); assert.equal(player.ap, ap - food.eatAp - room.data.life.purchaseAp);
  }
});
test('convenience store eat/store choices are fridge-gated, capacity-checked and persist across phases', () => {
  const room = setup(), player = at(room, 'convenience'), food = room.data.life.foods.find(f => f.locationId === 'convenience' && !f.raw);
  assert.throws(() => room.act(player.id, 'buy_food', { foodId: food.id }), /unavailable/);
  room.act(player.id, 'buy_eat', { foodId: food.id }); assert.equal(player.hasEaten, true);
  player.equipment.push('fridge'); room.act(player.id, 'buy_food', { foodId: food.id });
  assert.equal(player.inventory[food.id], 1); finish(room);
  assert.equal(room.viewFor(player.id).inventory[food.id], 1);
  player.inventory[food.id] = room.data.life.fridgeCapacity; at(room, 'convenience');
  assert.throws(() => room.act(player.id, 'buy_food', { foodId: food.id }), /unavailable/);
  room.act(player.id, 'buy_eat', { foodId: food.id }); // immediate eating requires no storage
});
test('money-loss personal/travel events carry notification data, shielded loss is zero', () => {
  const room = setup(), player = room.activePlayer;
  room.data.balance.personalEventChance = 1;
  room.data.events = [{ id: 'loss', name: 'เสียเงิน', scope: 'personal', effect: { cash: -200 }, weight: 1, durationTurns: 0 }];
  finish(room); finish(room); assert.equal(room.lastPresentation.moneyLoss, 200);
  player.eventShieldNext = 1; finish(room); finish(room); assert.equal(room.lastPresentation.moneyLoss, 0);
  room.data.balance.personalEventChance = 0;
  room.data.events = [{ id: 'travel_loss', name: 'เดินสะดุด', scope: 'transport', transport: 'walk', effect: { cash: -120 }, weight: 1, durationTurns: 0 }];
  room.data.balance.transportEventChanceByMode.walk = 1;
  room.travel(player.id, 'market', 'walk'); assert.equal(room.lastPresentation.moneyLoss, 120);
});
test('updated data rejects invalid hunger, car, severance, degree time and menu configuration', () => {
  for (const mutate of [d => d.balance.hungerPenalty.max = 6, d => d.balance.usedCar.maintenance = -1, d => d.balance.resignationRate = 0.5, d => d.balance.study.credits.bachelorVoc = 24, d => d.life.foods.find(f => f.id === 'krapao').locationId = 'market']) {
    const data = structuredClone(loadData()); mutate(data); assert.throws(() => validateData(data));
  }
});

test('seasonal cash loss is notified once on each affected players next phase', () => {
  const room = setup(true), first = room.activePlayer, second = room.players[1];
  room.data.events = [{ id: 'season_loss', name: 'ค่าซ่อมหลังน้ำท่วม', scope: 'seasonal', weight: 1, durationTurns: 1, effect: { cash: -100 } }];
  room.seasonal = { eventId: 'season_loss', remaining: 2 }; room.startGlobalWeek();
  assert.equal(first.pendingEventMoneyLoss, 100); assert.equal(second.pendingEventMoneyLoss, 100);
  finish(room); assert.equal(room.lastPresentation.moneyLoss, 100); assert.equal(first.pendingEventMoneyLoss, 0);
  finish(room); assert.equal(room.lastPresentation.moneyLoss, 100); assert.equal(second.pendingEventMoneyLoss, 0);
  finish(room); assert.equal(room.lastPresentation.moneyLoss, 0);
});
