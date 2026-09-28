import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { assertConnectedMap } from './path.js';

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const dataDirectory = join(projectRoot, 'data');

function readJson(name) {
  return JSON.parse(readFileSync(join(dataDirectory, name), 'utf8'));
}

function uniqueIds(items, label) {
  if (!Array.isArray(items)) throw new Error(`${label} must be an array`);
  const ids = new Set();
  for (const item of items) {
    if (typeof item.id !== 'string' || !item.id) throw new Error(`${label} item has no id`);
    if (ids.has(item.id)) throw new Error(`Duplicate ${label} id: ${item.id}`);
    ids.add(item.id);
  }
  return ids;
}

function nonnegative(value, label) {
  if (!Number.isFinite(value) || value < 0) throw new Error(`${label} must be a nonnegative number`);
}

function probability(value, label) {
  if (!Number.isFinite(value) || value < 0 || value > 1) throw new Error(`${label} must be between 0 and 1`);
}

function numericEffect(effect, label) {
  if (!effect || typeof effect !== 'object' || Array.isArray(effect)) throw new Error(`${label} needs an effect object`);
  for (const [key, value] of Object.entries(effect)) {
    if (!Number.isFinite(value)) throw new Error(`${label} effect ${key} must be numeric`);
  }
}

export function validateData(data) {
  const { map, careers, cards, events, activities, balance, life } = data;
  if (!Number.isInteger(map.width) || !Number.isInteger(map.height) || map.tileMeters !== 250) {
    throw new Error('Map needs integer dimensions and 250 meters per tile');
  }
  assertConnectedMap(map);
  const zoneIds = uniqueIds(map.zones, 'zone');
  const locationIds = uniqueIds(map.locations, 'location');
  uniqueIds(map.busStops, 'bus stop');
  uniqueIds(map.busRoutes, 'bus route');
  const careerIds = uniqueIds(careers, 'career');
  const cardIds = uniqueIds(cards, 'card');
  uniqueIds(events, 'event');
  uniqueIds(activities, 'activity');
  if (!locationIds.has('home')) throw new Error('Map needs home location');
  if (!locationIds.has(map.exit.locationId)) throw new Error('Map exit locationId does not exist');
  const exitLocation = map.locations.find((item) => item.id === map.exit.locationId);
  if (exitLocation.x !== map.exit.x || exitLocation.y !== map.exit.y) throw new Error('Exit coordinates do not match exit location');
  for (const zone of map.zones) {
    if (!Array.isArray(zone.bounds) || zone.bounds.length !== 4 || !zone.bounds.every(Number.isInteger)) {
      throw new Error(`Zone ${zone.id} needs integer bounds`);
    }
    const [x1, y1, x2, y2] = zone.bounds;
    if (x1 < 0 || y1 < 0 || x2 >= map.width || y2 >= map.height || x2 < x1 || y2 < y1) {
      throw new Error(`Zone ${zone.id} leaves map bounds`);
    }
  }
  for (const location of map.locations) {
    if (!zoneIds.has(location.zone)) throw new Error(`Location ${location.id} has unknown zone`);
    if (!Array.isArray(location.openPhases) || !location.openPhases.length ||
      location.openPhases.some((phase) => !['workday', 'weekend'].includes(phase))) {
      throw new Error(`Location ${location.id} needs valid open phases`);
    }
    if (!Array.isArray(location.actions)) throw new Error(`Location ${location.id} needs actions`);
  }
  for (const job of careers) {
    if (!['main', 'parttime'].includes(job.kind)) throw new Error(`Invalid career kind: ${job.id}`);
    if (!locationIds.has(job.locationId)) throw new Error(`Career ${job.id} has unknown workplace`);
    if (!['m3', 'vocational', 'highschool', 'diploma', 'bachelor', 'master', 'doctorate'].includes(job.requiredEducation)) throw new Error(`Career ${job.id} has unknown education level`);
    for (const key of ['pay', 'apCost', 'xpGain', 'requiredExperience']) nonnegative(job[key], `Career ${job.id} ${key}`);
    if (!Array.isArray(job.workPhases) || !job.workPhases.length || job.workPhases.some((phase) => !['workday', 'weekend'].includes(phase))) {
      throw new Error(`Career ${job.id} needs valid work phases`);
    }
  }
  for (const card of cards) {
    if (!['active', 'passive'].includes(card.kind)) throw new Error(`Invalid card kind: ${card.id}`);
    nonnegative(card.cost, `Card ${card.id} cost`);
    nonnegative(card.monthlyFee, `Card ${card.id} monthly fee`);
    if (card.playAt && !locationIds.has(card.playAt)) throw new Error(`Card ${card.id} has unknown playAt location`);
    numericEffect(card.effect, `Card ${card.id}`);
    for (const key of ['discardCount', 'drawCount']) {
      if (card.effect[key] !== undefined && (!Number.isInteger(card.effect[key]) || card.effect[key] < 0)) throw new Error(`Card ${card.id} ${key} must be a nonnegative integer`);
    }
    if (card.effect.discardCount && !card.effect.drawCount) throw new Error(`Card ${card.id} cannot request a discard without a draw reward`);
  }
  for (const event of events) {
    if (!['personal', 'transport', 'seasonal'].includes(event.scope)) throw new Error(`Invalid event scope: ${event.id}`);
    if (event.scope === 'transport' && !['walk', 'bus', 'moto', 'car', 'taxi'].includes(event.transport)) {
      throw new Error(`Event ${event.id} needs a transport type`);
    }
    nonnegative(event.weight, `Event ${event.id} weight`);
    nonnegative(event.durationTurns, `Event ${event.id} duration`);
    numericEffect(event.effect, `Event ${event.id}`);
  }
  for (const activity of activities) {
    if (!locationIds.has(activity.locationId)) throw new Error(`Activity ${activity.id} has unknown location`);
    nonnegative(activity.price, `Activity ${activity.id} price`);
    nonnegative(activity.apCost, `Activity ${activity.id} AP cost`);
    if (activity.category === 'meal' && activity.apCost !== balance.basicMealApCost) {
      throw new Error(`Meal ${activity.id} AP must match the basic meal`);
    }
    numericEffect(activity.effect, `Activity ${activity.id}`);
  }
  if (!Number.isFinite(balance.startingCash) || !balance.startingStats || !balance.transport) {
    throw new Error('Balance needs starting cash, stats and transport rules');
  }
  nonnegative(balance.startingCash, 'Starting cash');
  for (const stat of ['knowledge', 'happiness', 'health']) probability(balance.startingStats[stat] / 100, `Starting ${stat}`);
  for (const key of ['basicMealCost', 'basicMealApCost', 'rentPerMonth', 'cardDrawCost', 'cardPlayApCost', 'carPrice']) nonnegative(balance[key], key);
  if (balance.cardPlayApCost < 1) throw new Error('Card play AP cost must prevent free skill loops');
  for (const key of ['startingHandSize', 'refillToHandSize', 'cardHandLimit']) {
    if (!Number.isInteger(balance[key]) || balance[key] <= 0) throw new Error(`${key} must be a positive integer`);
  }
  if (balance.startingHandSize > balance.cardHandLimit) throw new Error('Starting hand exceeds the hand limit');
  for (const mode of ['season', 'marathon']) {
    const size = balance.deckSize?.[mode];
    if (!Number.isInteger(size) || size < balance.startingHandSize * 6) {
      throw new Error(`${mode} deck must be large enough to deal six opening hands`);
    }
    const composition = balance.deckComposition?.[mode];
    if (size !== (mode === 'season' ? 52 : 104)) throw new Error('Deck sizes must be 52/104');
    if (!composition?.counts || Object.keys(composition.counts).length !== cards.length) throw new Error('Deck needs a count for every card');
    let total = 0;
    for (const [id,count] of Object.entries(composition.counts)) {
      if (!cardIds.has(id) || !Number.isInteger(count) || count < 1) throw new Error('Invalid deck card count');
      total += count;
    }
    if (total !== size) throw new Error(`${mode} deck distribution must total ${size} cards`);
  }
  numericEffect(balance.basicMealEffect, 'Basic meal');
  probability(balance.personalEventChance, 'Personal event chance');
  probability(balance.seasonalChanceSeason, 'Season event chance');
  probability(balance.seasonalChanceMarathon, 'Marathon event chance');
  probability(balance.loanInterestMonthly, 'Loan interest');
  for (const mode of ['walk', 'bus', 'moto', 'car', 'taxi']) {
    const rule = balance.transport[mode];
    if (!Number.isFinite(rule?.speed) || rule.speed <= 0) throw new Error(`Missing ${mode} transport speed`);
    nonnegative(rule.baseFare, `${mode} base fare`);
    nonnegative(rule.perTileFare, `${mode} distance fare`);
    probability(balance.transportEventChanceByMode?.[mode], `${mode} event chance`);
  }
  for (const key of ['apCost', 'tuition', 'knowledgeGainPerCredit']) nonnegative(balance.study?.[key], `Study ${key}`);
  for (const name of ['vocational', 'highschool', 'diploma', 'bachelorVoc', 'bachelorGeneral']) {
    if (!Number.isInteger(balance.study?.credits?.[name]) || balance.study.credits[name] <= 0) {
      throw new Error(`Missing education credit requirement ${name}`);
    }
  }
  probability(balance.casino?.winChance, 'Casino win chance');
  for (const key of ['apCost', 'happinessLoss', 'minBet', 'maxBet', 'jackpotMultiplier']) nonnegative(balance.casino?.[key], `Casino ${key}`);
  if (balance.casino.minBet > balance.casino.maxBet) throw new Error('Casino minBet exceeds maxBet');
  for (const mode of ['season', 'marathon']) {
    if (!Number.isInteger(balance.maxWeeks?.[mode]) || balance.maxWeeks[mode] <= 0) throw new Error(`Invalid ${mode} match length`);
    nonnegative(balance.exitNetSavingsGoal?.[mode], `${mode} savings goal`);
    nonnegative(balance.seasonalDurationCapTurns?.[mode], `${mode} seasonal cap`);
  }
  const foodIds = uniqueIds(life.foods, 'food'), itemIds = uniqueIds(life.items, 'shop item');
  const recipeIds = uniqueIds(life.recipes, 'recipe'); const facultyIds = uniqueIds(life.faculties, 'faculty');
  if ([...recipeIds].some(id=>foodIds.has(id))) throw new Error('Food and recipe IDs must not overlap');
  for (const key of ['purchaseAp','rawPurchaseAp','eatAp','cookedEatAp','cookAp','bagCapacity','fridgeCapacity']) nonnegative(life[key],key);
  if (!(life.rawPurchaseAp > 0 && life.rawPurchaseAp < 1 && life.eatAp > 1 && life.cookedEatAp === 1 && balance.study.apCost === 1)) throw new Error('Invalid life AP rules');
  if (!(life.purchaseAp > 0 && life.cookAp > 0 && balance.study.tuition > 0 && balance.casino.apCost > 0 && balance.casino.apCost < 2 && balance.casino.minBet > 0)) throw new Error('Repeatable actions need positive costs');
  for (const key of ['bagCapacity','fridgeCapacity']) if (!Number.isInteger(life[key]) || life[key] <= 0) throw new Error('Invalid inventory capacity');
  for (const food of life.foods) { if (!locationIds.has(food.locationId)) throw new Error('Unknown food venue'); nonnegative(food.price,food.id); if (food.eatAp !== undefined) { nonnegative(food.eatAp,food.id+' eat AP'); if (food.eatAp <= 0 || food.raw) throw new Error('Invalid food eat AP'); } numericEffect(food.effect,food.id); if(food.raw && Object.keys(food.effect).length) throw new Error('Raw food cannot grant stats'); }
  for (const item of life.items) { nonnegative(item.price,item.id); nonnegative(item.apCost,item.id); numericEffect(item.effect,item.id); }
  for (const recipe of life.recipes) {
    if (!Number.isInteger(recipe.portions) || recipe.portions <= 0) throw new Error('Invalid portions');
    for (const [id,n] of Object.entries(recipe.ingredients)) if (!foodIds.has(id) || !life.foods.find(f=>f.id===id).raw || !Number.isInteger(n) || n <= 0) throw new Error('Invalid ingredient');
    if (recipe.equipment.some(id=>!itemIds.has(id))) throw new Error('Unknown recipe equipment'); numericEffect(recipe.effect,recipe.id);
  }
  for (const job of careers) { if(job.requiredFaculty && !facultyIds.has(job.requiredFaculty)) throw new Error('Unknown faculty'); for(const phase of ['workday','weekend']) nonnegative(job.payByPhase[phase],job.id); if(job.apCost!==1 || job.payByPhase.weekend>=job.payByPhase.workday) throw new Error('Invalid work rates'); nonnegative(job.healthDrain,job.id);nonnegative(job.happinessDrain,job.id); }
  for (const degree of ['bachelor','master','doctorate']) { const rule=life.degrees[degree]; if(!Number.isInteger(rule.credits)||rule.credits<=0)throw new Error('Invalid degree credits');nonnegative(rule.tuition,degree); }
  if(balance.blackMarket.entryMin!==10||balance.blackMarket.entryMax!==30)throw new Error('Black Market losses must be 10–30');
  probability(balance.blackMarket.arrestChance,'Arrest chance'); nonnegative(balance.blackMarket.tripleCash,'Salvage cash');
  if(!Number.isInteger(balance.blackMarket.maxSalvagesPerPhase)||balance.blackMarket.maxSalvagesPerPhase<1)throw new Error('Invalid salvage quota');
  probability(balance.hiring.baseChance,'Hiring chance'); probability(balance.hiring.maxChance,'Hiring maximum'); nonnegative(balance.hiring.experienceBonus,'Hiring experience bonus');
  if (balance.hungerPenalty?.min !== 3 || balance.hungerPenalty?.max !== 5) throw new Error('Hunger penalty must be 3–5 AP');
  const usedCar = cards.find(c => c.id === 'vehicle_used_car');
  if (!usedCar || usedCar.cost !== balance.usedCar?.purchaseCost || usedCar.cost >= balance.carPrice || usedCar.effect.usedCar !== 1 || usedCar.effect.carOwnership !== 1) throw new Error('Invalid used car card');
  if (!Number.isSafeInteger(balance.usedCar.maintenance) || balance.usedCar.maintenance <= 0) throw new Error('Invalid used car maintenance');
  if (balance.resignationRate !== 0.3) throw new Error('Severance must be 30%');
  if (life.degrees.bachelor.credits % 2 || balance.study.credits.bachelorGeneral !== life.degrees.bachelor.credits || balance.study.credits.bachelorVoc !== life.degrees.bachelor.credits / 2) throw new Error('Vocational Bachelor must take half time');
  const dishes = life.foods.filter(f => f.category === 'อาหารจานเดียว');
  if (!dishes.length || dishes.some(f => f.locationId !== 'restaurant' || !Number.isFinite(f.eatAp)) || new Set(dishes.map(f => f.price)).size !== dishes.length || new Set(dishes.map(f => f.eatAp)).size !== dishes.length) throw new Error('Single dishes need restaurant and distinct prices/AP');
  return { locations: locationIds.size, careers: careerIds.size, cards: cards.length, events: events.length };
}

export function loadData() {
  const data = {
    map: readJson('map.json'),
    careers: readJson('careers.json'),
    cards: readJson('cards.json'),
    events: readJson('events.json'),
    life: readJson('life.json'),
    activities: readJson('activities.json'),
    balance: readJson('balance.json')
  };
  validateData(data);
  return data;
}
