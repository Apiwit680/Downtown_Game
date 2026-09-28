import { randomUUID } from 'node:crypto';
import { planTrip } from './path.js';
import { lifeMethods } from './life.js';

const clamp = (value, low = 0, high = 100) => Math.min(high, Math.max(low, value));
const round2 = (value) => Math.round((value + Number.EPSILON) * 100) / 100;
const money = (value) => Math.round(value);
const choose = (items, rng) => {
  const total = items.reduce((sum, item) => sum + (item.weight ?? 1), 0);
  if (!items.length || total <= 0) return null;
  let roll = rng() * total;
  for (const item of items) {
    roll -= item.weight ?? 1;
    if (roll < 0) return item;
  }
  return items.at(-1);
};

export class GameRoom {
  constructor({ code, mode, hostId = randomUUID(), hostName, data, singlePlayer = false, rng = Math.random }) {
    if (!['season', 'marathon'].includes(mode)) throw new Error('Choose Season or Marathon');
    this.code = code;
    this.singlePlayer = singlePlayer;
    this.version = 0;
    this.mode = mode;
    this.data = data;
    this.rng = rng;
    this.status = 'lobby';
    this.week = 1;
    this.maxWeeks = data.balance.maxWeeks[mode];
    this.goal = data.balance.exitNetSavingsGoal[mode];
    this.phase = 'workday';
    this.activeIndex = 0;
    this.turnOrder = [];
    this.startingPlayerId = null;
    this.players = [];
    this.deck = [];
    this.discard = [];
    this.deckSize = data.balance.deckSize?.[mode] ?? (mode === 'marathon' ? 104 : 52);
    this.openingDeal = null;
    this.log = [];
    this.scoreboard = null;
    this.lastPresentation = null;
    this.seasonal = null;
    this.seasonalWeeksUsed = 0;
    this.addPlayer(hostName, hostId, true);
  }

  get activePlayer() {
    const id = this.turnOrder[this.activeIndex];
    return id ? this.players.find((player) => player.id === id) : this.players[this.activeIndex];
  }
  get activePlayerId() { return this.status === 'playing' ? this.activePlayer?.id : null; }
  get maxSeasonalWeeks() { return this.data.balance.seasonalDurationCapTurns[this.mode]; }
  get locationMap() { return new Map(this.data.map.locations.map((item) => [item.id, item])); }
  get cardMap() { return new Map(this.data.cards.map((item) => [item.id, item])); }
  get careerMap() { return new Map(this.data.careers.map((item) => [item.id, item])); }

  consumeEventShield(player) {
    if (player.eventShieldNext > 0) {
      player.eventShieldNext -= 1;
      return 1;
    }
    return Math.max(0, ...player.passives.map((id) => this.cardMap.get(id)?.effect?.eventShield ?? 0));
  }

  addPlayer(name, id = randomUUID(), host = false) {
    if (this.status !== 'lobby') throw new Error('The match has already started');
    if (this.singlePlayer && this.players.length) throw new Error('Solo room has one seat');
    if (this.players.length >= 6) throw new Error('Room is full (maximum 6 players)');
    const safeName = String(name ?? '').trim().slice(0, 24);
    if (!safeName) throw new Error('Enter a player name');
    if (this.players.some((player) => player.id === id)) throw new Error('Duplicate player ID');
    const home = this.locationMap.get('home');
    const player = {
      id, name: safeName, host, connected: true, lobbyOrder: this.players.length,
      color: ['#ffcf70', '#82dbff', '#f7a9d5', '#b6f68e', '#d5b4ff', '#f4b799'].find((color) => !this.players.some((member) => member.color === color)),
      cash: this.data.balance.startingCash, debt: 0,
      stats: { ...this.data.balance.startingStats },
      position: { x: home.x, y: home.y }, locationId: 'home',
      education: { level: 'm3', track: null, credits: 0 },
      experience: 0, mainJobId: null, parttimeJobId: null, parttimeReadyWeek: null,
      mainMissedConsecutive: 0, mainMissedTotal: 0, parttimeMissedConsecutive: 0,
      workedMainWeek: false, workedParttimeWeek: false,
      hand: [], passives: [], assets: [], ownsCar: false, partnerToken: false,
      travelDiscountNext: 0, eventShieldNext: 0,
      ap: 0, phaseInitialAp: 0, sleepAp: 0, hasEaten: false,
      mealPaid: 0, mealHealthApplied: 0,
      pendingSleepPenalty: 0, phaseFlags: {}, pendingDiscard: null
    };
    this.initializeLife(player);
    this.players.push(player);
    this.say(`${safeName} เข้าร่วมเมือง`);
    return player;
  }

  say(text) {
    this.log.push({ id: randomUUID(), text });
    if (this.log.length > 60) this.log.shift();
  }

  snapshot(player) {
    return { ap: player.ap, cash: player.cash, stats: { ...player.stats }, position: { ...player.position } };
  }

  present(player, type, before, extra = {}) {
    const after = extra.after ?? this.snapshot(player);
    this.lastPresentation = {
      id: randomUUID(), actorId: player.id, type, locationId: player.locationId,
      text: this.log.at(-1)?.text ?? '', before, after,
      rewards: { ap: round2(after.ap - before.ap), cash: after.cash - before.cash,
        ...Object.fromEntries(['knowledge', 'happiness', 'health'].map((key) => [key, round2(after.stats[key] - before.stats[key])])) },
      ...extra
    };
  }

  shuffle(cards) {
    const shuffled = [...cards];
    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      const target = Math.min(index, Math.floor(this.rng() * (index + 1)));
      [shuffled[index], shuffled[target]] = [shuffled[target], shuffled[index]];
    }
    return shuffled;
  }

  buildDeck() {
    const composition = this.data.balance.deckComposition[this.mode];
    const cards = Object.entries(composition.counts).flatMap(([id,count]) => Array(count).fill(id));
    if (cards.length !== this.deckSize) throw new Error(`Invalid ${this.mode} deck composition`);
    return this.shuffle(cards);
  }

  drawFromDeck(player, count, { respectHandLimit = true } = {}) {
    const drawn = [];
    for (let index = 0; index < count && (!respectHandLimit || player.hand.length < this.handLimit); index += 1) {
      if (!this.deck.length && this.discard.length) {
        this.deck = this.shuffle(this.discard);
        this.discard = [];
      }
      if (!this.deck.length) break;
      const id = this.deck.pop();
      player.hand.push(id);
      drawn.push(id);
    }
    return drawn;
  }

  refillHand(player) {
    // Draw up to refillToHandSize at the end of Weekend (Phase 2) to top up the hand.
    const target = this.data.balance.refillToHandSize ?? 5;
    const need = Math.max(0, target - player.hand.length);
    if (!need || !this.hasDrawableCard()) return [];
    const drawn = this.drawFromDeck(player, need, { respectHandLimit: false });
    // Guard: if somehow hand exceeds the hard limit, ask the player to discard.
    const overflow = Math.max(0, player.hand.length - this.handLimit);
    if (overflow) player.pendingDiscard = { count: overflow, drawCount: 0, sourceCardId: null, reason: 'hand_limit' };
    return drawn;
  }

  get handLimit() { return this.data.balance.cardHandLimit ?? 9; }
  hasDrawableCard() { return this.deck.length + this.discard.length > 0; }

  start(requesterId) {
    if (this.status !== 'lobby') throw new Error('Match already started');
    if (this.players[0].id !== requesterId) throw new Error('Only the host can start');
    if (!this.singlePlayer && this.players.length < 2) throw new Error('Need 2–6 players to start');
    this.status = 'playing';
    this.version++;
    const startingIndex = Math.min(this.players.length - 1, Math.floor(this.rng() * this.players.length));
    this.turnOrder = [...this.players.slice(startingIndex), ...this.players.slice(0, startingIndex)].map((player) => player.id);
    this.startingPlayerId = this.turnOrder[0];
    this.activeIndex = 0;
    this.deck = this.buildDeck();
    this.matchSalaries = this.buildMatchSalaries();
    this.stockHistory = {};
    for (const asset of (this.data.balance.stockMarket?.assets || [])) {
      this.stockHistory[asset.id] = [asset.basePrice];
    }
    this.playerStocks = {};
    for (const p of this.players) this.playerStocks[p.id] = {};
    this.discard = [];
    for (const playerId of this.turnOrder) {
      const player = this.players.find((item) => item.id === playerId);
      this.drawFromDeck(player, this.data.balance.startingHandSize ?? 5);
    }
    this.openingDeal = {
      id: randomUUID(), order: [...this.turnOrder], startingPlayerId: this.startingPlayerId,
      startingHandSize: this.data.balance.startingHandSize ?? 5,
      refillToHandSize: this.data.balance.refillToHandSize ?? 5
    };
    this.startGlobalWeek();
    this.beginPhase();
  }

  buildMatchSalaries() {
    const range = this.data.balance.salaryRandomization?.rangeFraction ?? 0.30;
    const salaries = {};
    const used = new Set();
    for (const career of this.data.careers) {
      let mult;
      let attempts = 0;
      do {
        mult = Math.round((1 - range + this.rng() * range * 2) * 100) / 100;
        attempts++;
      } while (used.has(mult) && attempts < 20);
      used.add(mult);
      salaries[career.id] = {
        workday: Math.round(career.payByPhase.workday * mult),
        weekend: Math.round(career.payByPhase.weekend * mult)
      };
    }
    return salaries;
  }

  startGlobalWeek() {
    if (this.stockHistory) {
      for (const asset of (this.data.balance.stockMarket?.assets || [])) {
        const history = this.stockHistory[asset.id];
        const last = history[history.length - 1];
        const vol = asset.volatility ?? 0.1;
        const change = 1 + (this.rng() - 0.5) * 2 * vol;
        history.push(Math.max(100, Math.round(last * change)));
      }
      for (const player of this.players) {
        const holdings = this.playerStocks?.[player.id] || {};
        for (const asset of (this.data.balance.stockMarket?.assets || [])) {
          const qty = holdings[asset.id] || 0;
          if (qty > 0 && asset.passiveIncome) player.cash += qty * asset.passiveIncome;
        }
      }
    }
    if (this.seasonal) {
      this.seasonal.remaining -= 1;
      if (this.seasonal.remaining <= 0) this.seasonal = null;
    }
    const remaining = this.maxSeasonalWeeks - this.seasonalWeeksUsed;
    const chance = this.mode === 'marathon'
      ? (this.data.balance.seasonalChanceMarathon ?? 0.08)
      : (this.data.balance.seasonalChanceSeason ?? 0.18);
    const guaranteed = this.mode === 'marathon' && this.seasonalWeeksUsed === 0 &&
      this.week >= (this.data.balance.marathonSeasonalGuaranteeWeek ?? 12);
    if (!this.seasonal && remaining > 0 && (guaranteed || this.rng() < chance)) {
      const event = choose(this.data.events.filter((item) => item.scope === 'seasonal'), this.rng);
      if (event) {
        const duration = Math.min(remaining, Math.max(1, event.durationTurns ?? 1));
        this.seasonal = { eventId: event.id, remaining: duration };
        this.seasonalWeeksUsed += duration;
        this.say(`สัปดาห์ ${this.week}: ${event.name} (${duration} สัปดาห์)`);
      }
    }
    const seasonalEvent = this.currentSeasonalEvent();
    if (seasonalEvent) {
      for (const player of this.players) {
        const cashBeforeEvent = player.cash;
        this.applyEffect(player, seasonalEvent.effect, { event: true, ignoreAp: true });
        player.pendingEventNotices.push(seasonalEvent.name);
        player.pendingEventMoneyLoss += Math.max(0, cashBeforeEvent - player.cash);
        if (this.status === 'finished') return;
      }
    }
  }

  currentSeasonalEvent() {
    return this.seasonal ? this.data.events.find((item) => item.id === this.seasonal.eventId) : null;
  }

  score(player) {
    const netSavings = player.cash - player.debt;
    const knowledge = clamp(player.stats.knowledge);
    const wealth = clamp((netSavings / this.goal) * 100);
    const happiness = clamp(player.stats.happiness);
    const health = clamp(player.stats.health);
    return {
      playerId: player.id, name: player.name,
      knowledge, wealth: round2(wealth), happiness, health,
      total: round2(knowledge + wealth + happiness + health),
      cash: player.cash, debt: player.debt, netSavings: money(netSavings)
    };
  }

  finish(winnerId = null) {
    if (this.status === 'finished') return;
    this.status = 'finished';
    this.scoreboard = this.players.map((player) => ({ ...this.score(player), joinOrder: player.lobbyOrder }));
    this.scoreboard.sort((a, b) =>
      b.total - a.total || b.netSavings - a.netSavings || b.health - a.health || a.joinOrder - b.joinOrder);
    this.scoreboard.forEach((row, index) => { row.rank = index + 1; delete row.joinOrder; });
    if (winnerId) {
      const winner = this.players.find((player) => player.id === winnerId);
      this.say(`${winner.name} เก็บเงินสุทธิถึงเป้าหมายและออกจากเมือง!`);
      // The goal winner takes first place even if another player has more general stats.
      const winnerRowIndex = this.scoreboard.findIndex((row) => row.playerId === winnerId);
      const [winnerRow] = this.scoreboard.splice(winnerRowIndex, 1);
      this.scoreboard.unshift(winnerRow);
      this.scoreboard.forEach((row, index) => { row.rank = index + 1; });
    } else this.say('ครบกำหนดเกม · จัดอันดับด้วยคะแนนทั้ง 4 ด้าน');
  }

  checkGoal(player) {
    if (this.status === 'playing' && player.cash - player.debt >= this.goal) this.finish(player.id);
  }

  applyEffect(player, effect = {}, { event = false, ignoreAp = false, shieldOverride } = {}) {
    const shield = event ? (shieldOverride ?? this.consumeEventShield(player)) : 0;
    const adjusted = (value) => value < 0 ? value * (1 - shield) : value;
    if (Number.isFinite(effect.cash)) player.cash = Math.max(0, money(player.cash + adjusted(effect.cash)));
    for (const key of ['knowledge', 'happiness', 'health']) {
      if (Number.isFinite(effect[key])) player.stats[key] = clamp(round2(player.stats[key] + adjusted(effect[key])));
    }
    if (!ignoreAp && Number.isFinite(effect.ap)) player.ap = clamp(round2(player.ap + adjusted(effect.ap)), 0, 24);
    if (Number.isFinite(effect.experience)) player.experience = round2(player.experience + effect.experience);
    if (Number.isFinite(effect.weeklyIncome)) player.assets.push({ income: effect.weeklyIncome, cadence: 'weekly' });
    if (Number.isFinite(effect.monthlyIncome)) player.assets.push({ income: effect.monthlyIncome });
    if (Number.isFinite(effect.travelDiscount)) player.travelDiscountNext = Math.max(player.travelDiscountNext, effect.travelDiscount);
    if (Number.isFinite(effect.eventShield)) player.eventShieldNext += effect.eventShield;
    if (effect.carOwnership) { player.ownsCar = true; player.usedCar = !!effect.usedCar; }
    if (effect.partnerToken) player.partnerToken = true;
    this.checkGoal(player);
  }

  canPay(player, ap = 0, cash = 0) { return player.ap + 1e-9 >= ap && player.cash >= cash; }
  at(player, locationId) { return player.locationId === locationId; }
  isOpen(locationId) { return this.locationMap.get(locationId)?.openPhases?.includes(this.phase); }
  actionsFor(playerId) {
    const player = this.players.find((item) => item.id === playerId);
    if (!player || this.status !== 'playing' || this.activePlayerId !== playerId) return [];
    const actions = [];
    const add = (type, label, payload = {}) => actions.push({ type, label, payload });
    if (player.pendingDiscard) {
      const prefix = player.pendingDiscard.reason === 'hand_limit' ? 'มือเกิน 9 ใบ · ทิ้ง' : 'ทิ้ง';
      player.hand.forEach((id, index) => add('discard_card', `${prefix}: ${this.cardMap.get(id)?.name}`, { index }));
      return actions;
    }
    if (player.custody) return this.lifeActions(player);
    actions.push(...this.lifeActions(player));
    if (this.at(player, 'home') && player.ap >= 4) add('sleep', 'นอน 4 AP · ที่อพาร์ตเมนต์');
    if (this.at(player, 'home') && player.phaseInitialAp < 7 && player.sleepAp < 4) add('emergency_rest', 'พักฉุกเฉิน · ฟื้นจากโทษอดนอน');
    if (this.at(player, 'home') && player.ap === player.phaseInitialAp && player.sleepAp === 0 && !player.phaseFlags.anyAction && player.phaseInitialAp >= 20) add('full_rest', `Full Rest · พักทั้ง Phase · อาหาร ฿${this.data.balance.basicMealCost} (เงินไม่พอ สุขภาพ -2)`);
    if (this.isOpen(player.locationId)) {
      if (this.at(player, 'school') && player.education.level === 'm3' && !player.education.track) {
        add('choose_track', 'เลือกสายอาชีพ', { track: 'vocational' });
        add('choose_track', 'เลือกสายสามัญ', { track: 'highschool' });
      }
      const stage = this.studyStage(player);
      const study = this.data.balance.study;
      if (stage && this.at(player, stage.locationId) && this.canPay(player, study.apCost, study.tuition)) {
        add('study', `เรียน ${stage.key} · ${study.apCost} AP / ฿${study.tuition}`);
      }
      if (this.at(player, 'job_center') && player.ap >= 1) {
        for (const job of this.data.careers) {
          const other = job.kind === 'main' ? player.parttimeJobId : player.mainJobId;
          if (!this.qualifies(player, job) || (other && this.careerMap.get(other)?.locationId === job.locationId)) continue;
          if ((job.kind === 'main' ? player.mainJobId : player.parttimeJobId) === job.id || player.applications.some(a => a.jobId === job.id) || player.offers.includes(job.id)) continue;
          add('apply_job', `สมัคร${job.kind === 'main' ? 'งานหลัก' : 'พาร์ตไทม์'}: ${job.name}`, { jobId: job.id });
        }
      }
      for (const [kind, jobId] of [['main', player.mainJobId], ['parttime', player.parttimeJobId]]) {
        const job = this.careerMap.get(jobId);
        if (!job || !this.at(player, job.locationId) || !job.workPhases.includes(this.phase)) continue;
        if (kind === 'parttime' && this.week < player.parttimeReadyWeek) continue;
        if (player.ap >= 1) {
          add('work', `Working: ${job.name} · +฿${job.payByPhase[this.phase]} / 1 AP`, { kind });
        }
      }
      if (this.at(player, 'mall') && player.mallDrawWeek !== this.week && this.canPay(player, 1, this.data.balance.cardDrawCost) && player.hand.length < this.handLimit && this.hasDrawableCard()) {
        add('draw_card', `สุ่มการ์ด · ฿${this.data.balance.cardDrawCost}`);
      }
      if (this.at(player, 'automotive') && !player.ownsCar && this.canPay(player, 1, this.data.balance.carPrice)) {
        add('buy_car', `ซื้อรถ · ฿${this.data.balance.carPrice}`);
      }
      if (this.at(player, 'bank') && player.ap >= 1) {
        for (const asset of (this.data.balance.stockMarket?.assets || [])) {
          const price = this.stockHistory?.[asset.id]?.slice(-1)[0] ?? asset.basePrice;
          const hasPartner = player.partnerToken;
          if (player.cash >= price) {
            add('stock_buy', `ซื้อ ${asset.name} · ฿${price}`, { assetId: asset.id, mode: 'solo' });
            if (hasPartner) add('stock_buy_partner', `ซื้อแบบหุ้นส่วน ${asset.name}`, { assetId: asset.id });
          }
          const qty = this.playerStocks?.[player.id]?.[asset.id] || 0;
          if (qty > 0) add('stock_sell', `ขาย ${asset.name} (มี ${qty} หุ้น) · ฿${price}`, { assetId: asset.id });
        }
        for (const amount of [1000, 5000]) {
          if (player.debt + amount <= (this.data.balance.loanLimit ?? 20000)) add('bank', `กู้ ฿${amount}`, { operation: 'borrow', amount });
        }
        if (player.debt > 0 && player.cash >= 1) add('bank', 'ชำระหนี้ · ระบุจำนวนเต็มได้ถึงยอดหนี้ทั้งหมด', { operation: 'repay', amount: Math.min(player.debt, player.cash) });
        for (const other of this.players) {
          if (other.id !== player.id && other.partnerToken && player.partnerToken && player.cash >= 1000 && other.cash >= 1000) {
            add('form_partnership', `ร่วมลงทุนกับ ${other.name} · คนละ ฿1,000`, { partnerId: other.id });
          }
        }
      }
      const casino = this.data.balance.casino;
      if (this.at(player, 'casino') && player.ap >= casino.apCost) {
        for (const stake of [200, 500, 1000, 5000]) {
          if (stake >= casino.minBet && stake <= casino.maxBet && player.cash >= stake) add('casino', `เดิมพัน ฿${stake}`, { stake });
        }
      }
      for (const activity of this.data.activities) {
        if (!this.at(player, activity.locationId)) continue;
        if (!player.phaseFlags.activity && this.canPay(player, activity.apCost, activity.price)) {
          add('activity', `${activity.name} · ฿${activity.price} / ${activity.apCost} AP`, { activityId: activity.id });
        }
      }
    }
    for (const [index, cardId] of player.hand.entries()) {
      const card = this.cardMap.get(cardId);
      const discardCount = card?.effect?.discardCount ?? 0;
      const drawCount = card?.effect?.drawCount ?? 0;
      const canResolveDraw = !drawCount || (player.hand.length - 1 >= discardCount && player.hand.length - 1 - discardCount + drawCount <= this.handLimit && (this.hasDrawableCard() || card.kind === 'active'));
      if (card && !(card.effect.carOwnership && player.ownsCar) && !(this.singlePlayer && card.effect.partnerToken) && (!(card.effect.ap > 0) || !player.phaseFlags.apCards.includes(card.id)) && canResolveDraw && this.canPay(player, this.data.balance.cardPlayApCost ?? 1, card.cost) && (!card.playAt || card.playAt === player.locationId) && (card.kind !== 'passive' || !player.passives.includes(card.id))) {
        add('play_card', `ใช้การ์ด: ${card.name} · ${this.data.balance.cardPlayApCost ?? 1} AP${card.cost ? ` · ฿${card.cost}` : ''}`, { index });
      }
    }
    add('end_phase', 'จบ Phase');
    return actions;
  }

  act(playerId, type, payload = {}) {
    if (this.status !== 'playing' || this.activePlayerId !== playerId) throw new Error('It is not your turn');
    const repayment = type === 'bank' && payload?.operation === 'repay';
    const p = this.activePlayer;
    const allowed = repayment
      ? !p.pendingDiscard && !p.custody && this.at(p, 'bank') && this.isOpen('bank') && p.ap >= 1 && Object.keys(payload).length === 2 && Number.isSafeInteger(payload.amount) && payload.amount >= 1 && payload.amount <= p.debt && payload.amount <= p.cash
      : this.actionsFor(playerId).some((action) => action.type === type && JSON.stringify(action.payload) === JSON.stringify(payload ?? {}));
    if (!allowed) throw new Error('Action is unavailable now');
    const player = this.activePlayer;
    const before = this.snapshot(player);
    this.version++;
    const actionLabel = this.actionsFor(playerId).find((action) => action.type === type && JSON.stringify(action.payload) === JSON.stringify(payload ?? {}))?.label;
    const playedCardId = type === 'play_card' ? player.hand[payload.index] : null;
    if (type !== 'end_phase') player.phaseFlags.anyAction = true;
    if (this.actLife(player, type, payload)) { this.checkGoal(player); this.present(player,type,before,{text:this.log.at(-1)?.text}); return; }
    switch (type) {
      case 'end_phase':
        const completedPhase = this.completePhase();
        this.present(player, type, before, {
          ...completedPhase, after: completedPhase.after, refillCount: completedPhase.refillCount,
          text: `${player.name} จบ Phase`
        });
        return;
      case 'sleep':
        player.ap = round2(player.ap - 4);
        player.sleepAp += 4;
        player.stats.health = clamp(player.stats.health + this.data.balance.sleep.healthGain);
        player.stats.happiness = clamp(player.stats.happiness + this.data.balance.sleep.happinessGain);
        this.say(`${player.name} นอน 4 AP`);
        break;
      case 'emergency_rest':
        player.sleepAp = 4;
        player.ap = 0;
        player.stats.health = clamp(player.stats.health + 2);
        this.say(`${player.name} พักฉุกเฉินและกลับมาฟื้นตัว`);
        break;
      case 'serve_jail':
        player.sleepAp = 4; player.hasEaten = true; player.ap = 0;
        const jailCompleted = this.completePhase();
        this.present(player, type, before, { ...jailCompleted, text: 'พักระหว่างควบคุมตัว' });
        return;
      case 'full_rest':
        player.sleepAp = 20; player.hasEaten = true;
        if (player.cash >= this.data.balance.basicMealCost) player.cash -= this.data.balance.basicMealCost;
        else player.stats.health = clamp(player.stats.health - 2);
        player.ap = 0;
        player.stats.health = clamp(player.stats.health + 16);
        player.stats.happiness = clamp(player.stats.happiness + 10);
        this.say(`${player.name} พักเต็ม 24 AP รวมอาหาร`);
        const fullCompleted = this.completePhase();
        this.present(player, type, before, { ...fullCompleted, text: `${player.name} พักเต็ม Phase` });
        return;
      case 'stock_buy': {
        const asset = this.data.balance.stockMarket.assets.find(a => a.id === payload.assetId);
        const price = this.stockHistory[asset.id].slice(-1)[0];
        player.cash -= price; player.ap = round2(player.ap - 1);
        this.playerStocks[player.id][asset.id] = (this.playerStocks[player.id][asset.id] || 0) + 1;
        this.say(`${player.name} ซื้อหุ้น ${asset.name} · ฿${price}`);
        break;
      }
      case 'stock_sell': {
        const asset = this.data.balance.stockMarket.assets.find(a => a.id === payload.assetId);
        const price = this.stockHistory[asset.id].slice(-1)[0];
        player.cash += price; player.ap = round2(player.ap - 1);
        this.playerStocks[player.id][asset.id] = Math.max(0, (this.playerStocks[player.id][asset.id] || 0) - 1);
        this.say(`${player.name} ขายหุ้น ${asset.name} · ฿${price}`);
        break;
      }
      case 'choose_track':
        player.education.track = payload.track;
        this.say(`${player.name} เลือก${payload.track === 'vocational' ? 'สายอาชีพ' : 'สายสามัญ'}`);
        break;
      case 'study': this.study(player); break;
      case 'apply_job': this.applyJob(player, payload.jobId); break;
      case 'work': this.work(player, payload.kind); break;
      case 'draw_card': this.drawCard(player); break;
      case 'discard_card': {
        const [id] = player.hand.splice(payload.index, 1);
        this.discard.push(id);
        player.pendingDiscard.count -= 1;
        if (player.pendingDiscard.count === 0) {
          const drawn = this.drawFromDeck(player, player.pendingDiscard.drawCount);
          const wasHandLimit = player.pendingDiscard.reason === 'hand_limit';
          player.pendingDiscard = null;
          this.say(wasHandLimit ? `${player.name} ทิ้งการ์ดให้เหลือไม่เกิน ${this.handLimit} ใบ` : `${player.name} แลกการ์ดและจั่ว ${drawn.length} ใบ`);
        } else this.say(`${player.name} ทิ้งการ์ด · เหลือเลือก ${player.pendingDiscard.count} ใบ`);
        break;
      }
      case 'play_card': this.playCard(player, payload.index); break;
      case 'buy_car':
        player.cash -= this.data.balance.carPrice;
        player.ap = round2(player.ap - 1);
        player.ownsCar = true;
        player.usedCar = false;
        this.say(`${player.name} ซื้อรถส่วนตัว`);
        break;
      case 'bank':
        player.ap = round2(player.ap - 1);
        if (payload.operation === 'borrow') { player.cash += payload.amount; player.debt += payload.amount; }
        else { player.cash -= payload.amount; player.debt -= payload.amount; }
        this.say(`${player.name} ${payload.operation === 'borrow' ? 'กู้' : 'คืนหนี้'} ฿${payload.amount}`);
        break;
      case 'form_partnership': {
        const other = this.players.find((item) => item.id === payload.partnerId);
        for (const partner of [player, other]) {
          partner.cash -= 1000;
          partner.partnerToken = false;
          partner.assets.push({ income: 800 });
        }
        player.ap = round2(player.ap - 1);
        this.say(`${player.name} และ ${other.name} ร่วมลงทุน ได้รายเดือนคนละ ฿800`);
        break;
      }
      case 'casino': {
        const rules = this.data.balance.casino;
        player.ap = round2(player.ap - rules.apCost);
        player.cash -= payload.stake;
        player.phaseFlags.casino += 1;
        const won = this.rng() < rules.winChance;
        if (won) player.cash += money(payload.stake * rules.jackpotMultiplier);
        else player.stats.happiness = clamp(player.stats.happiness - rules.happinessLoss);
        this.say(`${player.name} เดิมพัน ฿${payload.stake} ${won ? 'ชนะ' : 'แพ้'}`);
        break;
      }
      case 'activity': {
        const activity = this.data.activities.find((item) => item.id === payload.activityId);
        player.cash -= activity.price; player.ap = round2(player.ap - activity.apCost);
        if (activity.category === 'meal') player.hasEaten = true;
        else player.phaseFlags.activity = true;
        this.applyEffect(player, activity.effect);
        this.say(`${player.name}: ${activity.name}`);
        break;
      }
      default: throw new Error('Unknown action');
    }
    this.checkGoal(player);
    this.present(player, type, before, { text: actionLabel ?? this.log.at(-1)?.text, ...payload, ...(playedCardId ? { cardId: playedCardId } : {}) });
  }

  drawCard(player) {
    player.cash -= this.data.balance.cardDrawCost;
    player.ap = round2(player.ap - 1);
    player.mallDrawWeek = this.week;
    this.drawFromDeck(player, 1);
    this.say(`${player.name} สุ่มการ์ดเพิ่มที่ห้าง`);
  }

  playCard(player, index) {
    const [id] = player.hand.splice(index, 1);
    const card = this.cardMap.get(id);
    if (card.effect.ap > 0) player.phaseFlags.apCards.push(id);
    player.cash -= card.cost;
    player.ap = round2(player.ap - (this.data.balance.cardPlayApCost ?? 1));
    if (card.kind === 'passive') {
      player.passives.push(card.id);
      for (const stat of ['knowledge', 'happiness', 'health']) {
        if (card.effect?.[stat]) player.stats[stat] = clamp(player.stats[stat] + card.effect[stat]);
      }
    } else {
      this.discard.push(id);
      this.applyEffect(player, card.effect);
      if (card.lunchboxCard || card.id === 'skill_home_cooking') player.hasEaten = true;
      if (card.effect.drawCount) {
        if (card.effect.discardCount) player.pendingDiscard = { count: card.effect.discardCount, drawCount: card.effect.drawCount, sourceCardId: id };
        else this.drawFromDeck(player, card.effect.drawCount);
      }
    }
    this.say(`${player.name} ใช้การ์ด ${card.name}`);
  }

  travel(playerId, locationId, transport) {
    if (this.status !== 'playing' || this.activePlayerId !== playerId) throw new Error('It is not your turn');
    const player = this.activePlayer;
    if (player.custody) throw new Error('Cannot travel while in custody');
    if (player.pendingDiscard) throw new Error('Finish choosing cards to discard first');
    const before = this.snapshot(player);
    const target = this.locationMap.get(locationId);
    if (!target) throw new Error('Unknown destination');
    if (!['walk', 'bus', 'moto', 'car', 'taxi'].includes(transport)) throw new Error('Unknown transport option');
    if (transport === 'car' && !player.ownsCar) throw new Error('A car is required');
    const base = planTrip(this.data.map, this.data.balance, player.position, target, transport);
    if (base.distanceTiles === 0) throw new Error('Already at destination');
    const estimated = this.estimateTrip(player, target, transport, base);
    const baseAp = estimated.ap;
    const baseFare = estimated.fare;
    if (!this.canPay(player, baseAp, baseFare)) throw new Error('Not enough AP or cash for this trip');
    this.version++;
    const odds = this.data.balance.transportEventChanceByMode?.[transport] ?? 0;
    const event = this.rng() < odds ? choose(this.data.events.filter((item) => item.scope === 'transport' && item.transport === transport), this.rng) : null;
    const shield = event ? this.consumeEventShield(player) : 0;
    const rawFare = event ? money(baseFare * (event.effect?.fareMultiplier ?? 1)) : baseFare;
    const eventFare = baseFare + money(Math.max(0, rawFare - baseFare) * (1 - shield)) + Math.min(0, rawFare - baseFare);
    const eventAp = event ? Math.max(0, round2(baseAp + Math.max(0, -(event.effect?.ap ?? 0)) * (1 - shield))) : baseAp;
    const excess = Math.max(0, eventFare - player.cash);
    player.cash = Math.max(0, player.cash - eventFare);
    player.debt += excess;
    player.ap = Math.max(0, round2(player.ap - eventAp));
    player.position = { x: target.x, y: target.y };
    player.locationId = locationId;
    player.travelDiscountNext = 0;
    player.phaseFlags.anyAction = true;
    let eventCashLoss = 0;
    if (event) {
      // AP and fare changes were accounted for as trip costs above.
      const remainingEffect = { ...event.effect };
      delete remainingEffect.ap;
      delete remainingEffect.fareMultiplier;
      const cashBeforeEffect = player.cash;
      this.applyEffect(player, remainingEffect, { event: true, shieldOverride: shield });
      eventCashLoss = Math.max(0, cashBeforeEffect - player.cash);
      this.say(`${player.name}: ${event.name}`);
    }
    const entryLoss = locationId === 'black_market' ? this.enterBlackMarket(player) : null;
    this.say(`${player.name} เดินทางไป ${target.name} ด้วย ${transport} · ${baseAp} AP · ฿${eventFare}`);
    this.checkGoal(player);
    this.present(player, 'travel', before, { path: base.path, legs: base.legs, transport, locationId,
      entryLoss, eventId: event?.id ?? null, moneyLoss: event ? Math.max(0, eventFare - baseFare) + eventCashLoss : 0, text: `เดินทางถึง ${target.name}${event ? ` · ${event.name}` : ''}` });
    return { ...base, ap: eventAp, fare: eventFare, event: event?.id ?? null };
  }

  estimateTrip(player, target, transport, base = planTrip(this.data.map, this.data.balance, player.position, target, transport)) {
    const factor = this.currentSeasonalEvent()?.effect?.travelApMultiplier ?? 1;
    const ap = base.distanceTiles ? round2(Math.max(0.01, Math.ceil((base.rawAp * factor - 1e-9) * 100) / 100)) : 0;
    const passiveDiscount = player.passives.reduce((largest, id) => Math.max(largest, this.cardMap.get(id)?.effect?.travelDiscount ?? 0), 0);
    const discount = Math.min(0.9, Math.max(passiveDiscount, player.travelDiscountNext));
    return { ...base, ap, fare: money(base.fare * (1 - discount)) };
  }

  travelOptionsFor(player) {
    if (this.status !== 'playing' || this.activePlayerId !== player.id) return {};
    return Object.fromEntries(this.data.map.locations.map((target) => [target.id,
      ['walk', 'bus', 'moto', 'taxi', 'car'].map((transport) => {
        const trip = this.estimateTrip(player, target, transport);
        const reason = player.custody ? 'อยู่ระหว่างควบคุมตัว' : player.pendingDiscard ? 'เลือกการ์ดที่จะทิ้งให้ครบก่อน' : !trip.distanceTiles ? 'อยู่ที่นี่แล้ว' :
          transport === 'car' && !player.ownsCar ? 'ต้องมีรถส่วนตัว' : player.ap < trip.ap ? 'AP ไม่พอ' : player.cash < trip.fare ? 'เงินไม่พอ' : null;
        return { ...trip, available: !reason, reason, eventRisk: this.data.balance.transportEventChanceByMode[transport] ?? 0 };
      })
    ]));
  }

  completePhase() {
    const player = this.activePlayer;
    if (!player.hasEaten && !player.custody) {
      const { min, max } = this.data.balance.hungerPenalty;
      player.pendingHungerPenalty = min + Math.min(max - min, Math.floor(this.rng() * (max - min + 1)));
      this.say(`${player.name} ไม่ได้กินอาหาร · Phase ถัดไปลด ${player.pendingHungerPenalty} AP`);
    }
    if (player.sleepAp < 4) {
      const sleepRules = this.data.balance.sleep;
      const penalty = sleepRules.nextPhaseApPenaltyMin +
        Math.floor(this.rng() * (sleepRules.nextPhaseApPenaltyMax - sleepRules.nextPhaseApPenaltyMin + 1));
      player.pendingSleepPenalty = penalty;
      player.stats.health = clamp(player.stats.health + sleepRules.missedHealth);
      player.stats.happiness = clamp(player.stats.happiness + sleepRules.missedHappiness);
      this.say(`${player.name} อดนอน · Phase ถัดไปลด ${penalty} AP`);
    }
    // Refill hand to target size at the end of every Weekend (Phase 2).
    let refillDrawn = [];
    if (this.phase === 'weekend') {
      refillDrawn = this.refillHand(player);
      if (refillDrawn.length) {
        this.say(`${player.name} จบสัปดาห์ · จั่วการ์ดเติมมือ ${refillDrawn.length} ใบ (มือ ${player.hand.length} ใบ)`);
      }
    }
    const completed = { after: this.snapshot(player), refillCount: refillDrawn.length, completedPhase: this.phase, completedWeek: this.week, actorName: player.name };
    if (this.phase === 'workday') this.phase = 'weekend';
    else {
      this.phase = 'workday';
      this.activeIndex += 1;
    }
    if (this.activeIndex >= this.players.length) {
      this.endGlobalWeek();
      if (this.status !== 'playing') return completed;
      this.activeIndex = 0;
      this.week += 1;
      this.startGlobalWeek();
    }
    if (this.status === 'playing') {
      this.beginPhase();
      completed.nextPlayerId = this.activePlayerId; completed.nextPlayerName = this.activePlayer.name;
      completed.nextWeek = this.week; completed.applicationResults = [...this.activePlayer.applicationResults];
      completed.phaseNotices = [...this.activePlayer.phaseNotices]; completed.moneyLoss = this.activePlayer.phaseEventLoss?.cash || 0;
    }
    return completed;
  }

  endGlobalWeek() {
    for (const player of this.players) {
      if (player.mainJobId && !player.custody) {
        player.mainMissedConsecutive = player.workedMainWeek ? 0 : player.mainMissedConsecutive + 1;
        if (!player.workedMainWeek) player.mainMissedTotal += 1;
        if (player.mainMissedConsecutive >= 2 || player.mainMissedTotal >= 4) {
          this.say(`${player.name} เสียงานหลักเพราะขาดงาน`);
          player.mainJobId = null;
        }
      }
      if (player.parttimeJobId && !player.custody && this.week >= player.parttimeReadyWeek) {
        player.parttimeMissedConsecutive = player.workedParttimeWeek ? 0 : player.parttimeMissedConsecutive + 1;
        if (player.parttimeMissedConsecutive >= 2) {
          this.say(`${player.name} เสียงานพาร์ตไทม์เพราะขาดงาน`);
          player.parttimeJobId = null;
        }
      }
      player.workedMainWeek = false;
      player.workedParttimeWeek = false;
      for (const asset of player.assets) if (asset.cadence === 'weekly') player.cash += asset.income;
      this.checkGoal(player); if (this.status === 'finished') return;
      if (this.week % 4 === 0) {
        const rentShortfall = Math.max(0, this.data.balance.rentPerMonth - player.cash);
        player.cash = Math.max(0, player.cash - this.data.balance.rentPerMonth);
        player.debt += rentShortfall;
        player.debt += money(player.debt * this.data.balance.loanInterestMonthly);
        for (const asset of player.assets) if (asset.cadence !== 'weekly') player.cash += asset.income;
        player.passives = player.passives.filter((id) => {
          const card = this.cardMap.get(id);
          if (player.cash < card.monthlyFee) { this.discard.push(id); this.say(`${player.name} หยุดต่ออายุ ${card.name}`); return false; }
          player.cash -= card.monthlyFee;
          if (card.effect?.monthlyIncome) player.cash += card.effect.monthlyIncome;
          for (const stat of ['knowledge', 'happiness', 'health']) {
            if (card.effect?.[stat]) player.stats[stat] = clamp(player.stats[stat] + card.effect[stat]);
          }
          return true;
        });
        this.say(`สิ้นเดือนสัปดาห์ ${this.week}: ค่าเช่า รายได้สินทรัพย์ ค่าบัตร และดอกเบี้ย`);
        this.checkGoal(player);
        if (this.status === 'finished') return;
      }
    }
    if (this.status === 'playing' && this.week >= this.maxWeeks) this.finish();
  }

  viewFor(playerId) {
    const self = this.players.find((player) => player.id === playerId);
    if (!self) throw new Error('Unknown player');
    return {
      roomCode: this.code, status: this.status, mode: this.mode, week: this.week, version: this.version, singlePlayer: this.singlePlayer,
      maxWeeks: this.maxWeeks, goal: this.goal, phase: this.phase,
      activePlayerId: this.activePlayerId,
      you: { id: self.id, host: self.host },
      players: this.players.map((player) => ({
        id: player.id, name: player.name, color: player.color,
        cash: player.cash, debt: player.debt, netSavings: player.cash - player.debt,
        stats: { ...player.stats, wealth: this.score(player).wealth },
        ap: player.ap, position: player.position, locationId: player.locationId,
        education: player.education, experience: player.experience,
        mainJobId: player.mainJobId, parttimeJobId: player.parttimeJobId,
        sleepAp: player.sleepAp, hasEaten: player.hasEaten, connected: player.connected,
        ownsCar: player.ownsCar, usedCar: player.usedCar, phaseNotices: [...player.phaseNotices], equipment: [...player.equipment], custody: player.custody, parttimeReadyWeek: player.parttimeReadyWeek, surrendered: player.surrendered
      })),
      map: this.data.map,
      catalog: { cards: this.data.cards, careers: this.data.careers, activities: this.data.activities, life: this.data.life, study: this.data.balance.study, blackMarket: this.data.balance.blackMarket },
      matchSalaries: this.matchSalaries,
      stockMarket: {
        assets: this.data.balance.stockMarket?.assets || [],
        history: this.stockHistory || {},
        holdings: this.playerStocks?.[playerId] || {}
      },
      inventory: { ...self.inventory }, applications: structuredClone(self.applications), offers: [...self.offers],
      applicationResults: structuredClone(self.applicationResults),
      recipes: this.data.life.recipes.map(r => ({ ...r, ...this.recipeStatus(self,r) })),
      hand: self.hand.map((id) => this.cardMap.get(id)),
      deck: { size: this.deckSize, remaining: this.deck.length, discardCount: this.discard.length,
        refillToHandSize: this.data.balance.refillToHandSize ?? 5,
        pendingDiscard: self.pendingDiscard && { ...self.pendingDiscard } },
      travelOptions: this.travelOptionsFor(self),
      lastPresentation: this.lastPresentation,
      passives: self.passives.map((id) => this.cardMap.get(id)),
      actions: this.actionsFor(playerId),
      turnOrder: [...this.turnOrder], startingPlayerId: this.startingPlayerId, openingDeal: this.openingDeal,
      log: this.log.slice(-25), scoreboard: this.scoreboard,
      seasonal: this.seasonal && { ...this.currentSeasonalEvent(), remaining: this.seasonal.remaining }
    };
  }
}

Object.assign(GameRoom.prototype, lifeMethods);
