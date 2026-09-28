// Review 02 life systems. All actions are checked by GameRoom before mutation.
const clamp = n => Math.max(0, Math.min(100, n));
const round = n => Math.round((n + Number.EPSILON) * 100) / 100;
export const lifeMethods = {
  initializeLife(player) {
    player.education.degrees = {};
    player.education.progress = {};
    player.inventory = {};
    player.equipment = [];
    player.applications = [];
    player.offers = [];
    player.applicationResults = [];
    player.jailWeek = null;
    player.custody = false;
    player.pendingHungerPenalty = 0;
    player.usedCar = false;
    player.phaseNotices = [];
    player.phaseEventLoss = null;
    player.pendingEventNotices = [];
    player.pendingEventMoneyLoss = 0;
    player.doctorExp = 0;
  },
  beginPhase() {
    const player = this.activePlayer, before = this.snapshot(player);
    const home = this.locationMap.get('home');
    player.position = { x: home.x, y: home.y };
    player.locationId = 'home';
    player.phaseNotices = [...player.pendingEventNotices];
    player.phaseEventLoss = { cash: player.pendingEventMoneyLoss };
    player.pendingEventNotices = []; player.pendingEventMoneyLoss = 0;
    if (player.pendingHungerPenalty) player.phaseNotices.push(`ไม่ได้กินอาหารใน Phase ก่อน · AP ลด ${player.pendingHungerPenalty} ใน Phase นี้`);
    if (player.pendingSleepPenalty) player.phaseNotices.push(`นอนไม่ครบใน Phase ก่อน · AP ลด ${player.pendingSleepPenalty} ใน Phase นี้`);
    player.phaseInitialAp = Math.max(0, 24 - player.pendingSleepPenalty - player.pendingHungerPenalty);
    player.pendingSleepPenalty = 0;
    player.pendingHungerPenalty = 0;
    player.ap = player.phaseInitialAp;
    player.sleepAp = 0;
    player.hasEaten = false;
    player.phaseFlags = { casino: 0, salvages: 0, apCards: [], activity: false, anyAction: false };
    player.custody = player.jailWeek === this.week;
    player.applicationResults = [];
    if (this.phase === 'workday') {
      if (player.ownsCar && player.usedCar) {
        const fee = this.data.balance.usedCar.maintenance;
        if (player.cash >= fee) {
          player.cash -= fee;
          player.phaseNotices.push(`รถมือสอง: ค่าบำรุงรักษาประจำ Turn ฿${fee}`);
        } else {
          player.ownsCar = false; player.usedCar = false;
          player.phaseNotices.push(`จ่ายค่าบำรุงรถมือสอง ฿${fee} ไม่ไหว · รถเสียและไม่สามารถเดินทางด้วยรถได้`);
        }
      }
      const due = player.applications.filter(a => a.resolveWeek <= this.week);
      player.applications = player.applications.filter(a => a.resolveWeek > this.week);
      for (const application of due) {
        const job = this.careerMap.get(application.jobId);
        const chance = this.hiringChance(player, job);
        const accepted = this.qualifies(player, job) && this.rng() < chance;
        const result = { jobId: job.id, accepted, chance, week: this.week };
        player.applicationResults.push(result);
        if (accepted && !player.offers.includes(job.id)) player.offers.push(job.id);
        this.say(`${player.name}: ${accepted ? 'ได้รับข้อเสนองาน' : 'Resume ไม่ผ่าน'} ${job.name}`);
      }
      if (!player.custody && this.rng() < this.data.balance.personalEventChance) {
        const events = this.data.events.filter(e => e.scope === 'personal');
        const event = events[Math.min(events.length - 1, Math.floor(this.rng() * events.length))];
        if (event) { const cash = player.cash; this.applyEffect(player, event.effect, { event: true }); this.say(event.name); player.phaseNotices.push(event.name); player.phaseEventLoss.cash += Math.max(0, cash - player.cash); }
      }
    }
    this.say(`${player.name}: Turn ${this.week} · ${this.phase} · ${player.ap} AP${player.custody ? ' · ถูกควบคุมตัวครบ Turn นี้' : ''}`);
    this.checkGoal(player);
    for (const text of player.phaseNotices) this.say(text);
    this.present(player, 'begin_phase', before, { week: this.week, phase: this.phase, drawnCount: 0, phaseNotices: [...player.phaseNotices], moneyLoss: player.phaseEventLoss?.cash || 0,
      applicationResults: [...player.applicationResults] });
  },
  vocationalPath(player) {
    return player.education.universityEntryTrack === 'vocational' || player.education.track === 'vocational' || ['vocational', 'diploma'].includes(player.education.level);
  },
  degreeCredits(player, degree) {
    const credits = this.data.life.degrees[degree].credits;
    return degree === 'bachelor' && this.vocationalPath(player) ? credits / 2 : credits;
  },
  qualifies(player, job) {
    const ranks = { m3: 0, highschool: 1, vocational: 1, diploma: 2, bachelor: 3, master: 4, doctorate: 5 };
    const degrees = player.education.degrees || {};
    const degreeRank = Math.max(0, ...Object.values(degrees).map(d => ranks[d] || 0));
    const rank = Math.max(ranks[player.education.level] || 0, degreeRank);
    if (job.requiredFaculty) {
      if ((ranks[degrees[job.requiredFaculty]] || 0) < ranks[job.requiredEducation]) return false;
      const trackLock = this.data.balance.educationTrackLock?.[job.requiredFaculty];
      if (trackLock) {
        const playerTrack = this.vocationalPath(player) ? 'vocational' : (player.education.universityEntryTrack || player.education.track || 'highschool');
        if (!trackLock.includes(playerTrack)) return false;
      }
    }
    if (job.requiredDoctorExp) {
      if ((player.doctorExp || 0) < job.requiredDoctorExp) return false;
    }
    return rank >= ranks[job.requiredEducation] && player.experience >= job.requiredExperience;
  },
  hiringChance(player, job) {
    const b = this.data.balance.hiring;
    const competitiveness = job.competitiveness ?? (this.data.balance.careerCompetitiveness?.[job.id] ?? 0);
    const hasRelevantExp = player.experience >= job.requiredExperience;
    const noExpPenalty = !hasRelevantExp ? (b.noExperiencePenalty ?? 0.2) : 0;
    const base = Math.max(0.05, b.baseChance - competitiveness - noExpPenalty);
    return Math.min(b.maxChance, base + Math.max(0, player.experience - job.requiredExperience) * b.experienceBonus);
  },
  studyStage(player) {
    const { level, track } = player.education;
    if (level === 'm3' && track) return { key: track, next: track, locationId: 'school' };
    if (level === 'vocational') return { key: 'diploma', next: 'diploma', locationId: 'school' };
    return null;
  },
  study(player) {
    const rules = this.data.balance.study, stage = this.studyStage(player);
    player.cash -= rules.tuition;
    player.ap = round(player.ap - 1);
    player.education.credits++;
    this.studyKnowledge(player);
    if (player.education.credits >= rules.credits[stage.key]) {
      player.education.level = stage.next;
      player.education.credits = 0;
    }
    this.say(`${player.name} เรียน ${stage.key} · 1 AP`);
  },
  studyKnowledge(player) {
    const bonus = player.passives.reduce((n, id) => n + (this.cardMap.get(id)?.effect.studyBonus || 0), 0);
    player.stats.knowledge = clamp(round(player.stats.knowledge + this.data.balance.study.knowledgeGainPerCredit * (1 + bonus)));
  },
  applyJob(player, jobId) {
    const job = this.careerMap.get(jobId);
    player.ap = round(player.ap - 1);
    if (job.kind === 'main') {
      player.applications.push({ jobId, resolveWeek: this.week + 1 });
      this.say(`${player.name} ส่ง Resume: ${job.name} · ตาของคุณ Turn ถัดไปทราบผล`);
    } else {
      player.parttimeJobId = jobId;
      player.parttimeReadyWeek = this.week + 1;
      player.parttimeMissedConsecutive = 0;
      player.workedParttimeWeek = false;
      this.say(`${player.name} ได้งานพาร์ตไทม์ ${job.name} · เริ่ม Turn ถัดไป`);
    }
  },
  work(player, kind) {
    const job = this.careerMap.get(kind === 'main' ? player.mainJobId : player.parttimeJobId);
    const bonus = player.passives.reduce((n, id) => n + (this.cardMap.get(id)?.effect.workBonus || 0), 0);
    const pay = Math.round(job.payByPhase[this.phase] * (1 + bonus));
    player.cash += pay;
    player.ap = round(player.ap - 1);
    player.experience = round(player.experience + job.xpGain);
    if (job.id === 'doctor') player.doctorExp = round((player.doctorExp || 0) + job.xpGain);
    player.stats.health = clamp(round(player.stats.health - job.healthDrain));
    player.stats.happiness = clamp(round(player.stats.happiness - job.happinessDrain));
    if (kind === 'main') player.workedMainWeek = true;
    else player.workedParttimeWeek = true;
    this.say(`${player.name} Working: ${job.name} · +฿${pay} · 1 AP`);
  },
  recipeStatus(player, recipe) {
    const missing = [];
    for (const id of recipe.equipment) if (!player.equipment.includes(id)) missing.push(this.data.life.items.find(i => i.id === id).name);
    for (const [id, count] of Object.entries(recipe.ingredients)) if ((player.inventory[id] || 0) < count) missing.push(`${this.data.life.foods.find(i => i.id === id).name} ×${count}`);
    return { missing, craftable: !missing.length };
  },
  lifeActions(player) {
    const out = [], add = (type, label, payload = {}, category = '') => out.push({ type, label, payload, category });
    if (player.custody) return [{ type: 'serve_jail', label: 'พักระหว่างควบคุมตัว · จบ Phase', payload: {}, category: 'ควบคุมตัว' }];
    // R10: accept_job shown in job_center location panel AND details panel; action itself is location-agnostic
    for (const jobId of player.offers) add('accept_job', `รับข้อเสนอ: ${this.careerMap.get(jobId).name}`, { jobId }, 'ข้อเสนองาน');
    if (!this.isOpen(player.locationId)) return out;
    const life = this.data.life;
    for (const [kind, jobId] of [['main', player.mainJobId], ['parttime', player.parttimeJobId]]) {
      const job = this.careerMap.get(jobId);
      if (job && this.at(player, job.locationId)) add('resign_job', `ลาออก: ${job.name} · เงินชดเชย ฿${Math.round(job.payByPhase.workday * job.originalShift.apCost * this.data.balance.resignationRate)}`, { kind }, 'งาน');
    }
    for (const food of life.foods.filter(f => f.locationId === player.locationId)) {
      const ap = food.raw ? life.rawPurchaseAp : life.purchaseAp;
      const capacity = player.equipment.includes('fridge') ? life.fridgeCapacity : life.bagCapacity;
      const storedCount = Object.values(player.inventory).reduce((n, count) => n + count, 0);
      const canStore = food.raw || food.locationId !== 'convenience' || player.equipment.includes('fridge');
      if (canStore && storedCount < capacity && this.canPay(player, ap, food.price)) add('buy_food', `ซื้อ ${food.name} · ฿${food.price}${food.raw ? '' : ` · ${ap} AP`}`, { foodId: food.id }, food.category);
      const eatAp = food.eatAp ?? life.eatAp;
      if (!food.raw && this.canPay(player, eatAp + life.purchaseAp, food.price)) add('buy_eat', `ซื้อแล้วกิน ${food.name} · ฿${food.price} · ${eatAp + life.purchaseAp} AP`, { foodId: food.id }, food.category);
    }
    for (const [foodId, count] of Object.entries(player.inventory)) {
      const food = life.foods.find(f => f.id === foodId) || life.recipes.find(f => f.id === foodId);
      const eatAp = food?.cooked ? life.cookedEatAp : (food?.eatAp ?? life.eatAp);
      if (food && !food.raw && count > 0 && this.canPay(player, eatAp))
        add('eat_food', `กิน ${food.name} ×${count} · ${eatAp} AP`, { foodId }, 'อาหารที่เก็บไว้');
    }
    if (this.at(player, 'mall')) for (const item of life.items) {
      if (!player.equipment.includes(item.id) && this.canPay(player, item.apCost, item.price)) add('buy_item', `ซื้อ ${item.name} · ฿${item.price}`, { itemId: item.id }, item.category);
    }
    if (this.at(player, 'home')) for (const recipe of life.recipes) {
      if (this.recipeStatus(player, recipe).craftable && this.canPay(player, life.cookAp)) add('cook', `ทำ ${recipe.name} · ${life.cookAp} AP / ${recipe.portions} ที่`, { recipeId: recipe.id }, 'ครัว');
    }
    if (this.at(player, 'university') && ['highschool', 'diploma', 'bachelor', 'master', 'doctorate'].includes(player.education.level)) {
      const ranks = ['bachelor', 'master', 'doctorate'];
      for (const faculty of life.faculties) {
        if (this.vocationalPath(player) && faculty.id !== 'engineering') continue;
        const current = player.education.degrees[faculty.id];
        const degree = ranks[ranks.indexOf(current) + 1];
        if (degree && this.canPay(player, 1, life.degrees[degree].tuition)) add('study_degree', `เรียน ${faculty.name} · ${degree} · 1 AP / ฿${life.degrees[degree].tuition}`, { facultyId: faculty.id, degree }, 'การเรียน');
      }
    }
    if (this.at(player, 'black_market') && player.ap <= 23.5 && player.phaseFlags.salvages < this.data.balance.blackMarket.maxSalvagesPerPhase) {
      for (let a = 0; a < player.hand.length; a++) {
        add('salvage', 'ย่อย 1 ใบ · +0.5 AP', { indices: [a] }, 'ย่อยการ์ด');
        for (let b = a + 1; b < player.hand.length; b++) for (let c = b + 1; c < player.hand.length; c++)
          add('salvage', `ย่อย 3 ใบ · +0.5 AP / ฿${this.data.balance.blackMarket.tripleCash}`, { indices: [a, b, c] }, 'ย่อยการ์ด');
      }
    }
    return out;
  },
  actLife(player, type, payload) {
    const life = this.data.life;
    switch (type) {
      case 'resign_job': {
        const slot = payload.kind === 'main' ? 'mainJobId' : 'parttimeJobId';
        const job = this.careerMap.get(player[slot]);
        const severance = Math.round(job.payByPhase.workday * job.originalShift.apCost * this.data.balance.resignationRate);
        player.cash += severance; player[slot] = null;
        if (payload.kind === 'main') { player.mainMissedConsecutive = 0; player.mainMissedTotal = 0; player.workedMainWeek = false; }
        else { player.parttimeReadyWeek = 0; player.parttimeMissedConsecutive = 0; player.workedParttimeWeek = false; }
        this.say(`${player.name} ลาออก ${job.name} · ชดเชย 30% ของกะ Workday ${job.originalShift.apCost} AP = ฿${severance}`);
        return true;
      }
      case 'accept_job': {
        player.mainJobId = payload.jobId;
        player.offers = [];
        player.mainMissedConsecutive = 0; player.mainMissedTotal = 0; player.workedMainWeek = false;
        this.say(`${player.name} รับงาน ${this.careerMap.get(payload.jobId).name}`);
        return true;
      }
      case 'study_degree': {
        const key = `${payload.facultyId}:${payload.degree}`, rule = life.degrees[payload.degree];
        player.education.universityEntryTrack ||= this.vocationalPath(player) ? 'vocational' : 'highschool';
        player.ap = round(player.ap - 1); player.cash -= rule.tuition;
        player.education.progress[key] = (player.education.progress[key] || 0) + 1;
        this.studyKnowledge(player);
        if (player.education.progress[key] >= this.degreeCredits(player, payload.degree)) {
          player.education.degrees[payload.facultyId] = payload.degree;
          const rank = ['m3', 'highschool', 'diploma', 'bachelor', 'master', 'doctorate'];
          if (rank.indexOf(payload.degree) > rank.indexOf(player.education.level)) player.education.level = payload.degree;
        }
        this.say(`${player.name} เรียน ${payload.facultyId} ${payload.degree}`);
        return true;
      }
      case 'buy_food': case 'buy_eat': {
        const food = life.foods.find(f => f.id === payload.foodId);
        player.cash -= food.price;
        player.ap = round(player.ap - (food.raw ? life.rawPurchaseAp : life.purchaseAp) - (type === 'buy_eat' ? (food.eatAp ?? life.eatAp) : 0));
        if (type === 'buy_eat') { this.applyEffect(player, food.effect); player.hasEaten = true; }
        else player.inventory[food.id] = (player.inventory[food.id] || 0) + 1;
        this.say(`${player.name} ${type === 'buy_eat' ? 'กิน' : 'ซื้อ'} ${food.name}`);
        return true;
      }
      case 'eat_food': {
        const food = life.foods.find(f => f.id === payload.foodId) || life.recipes.find(f => f.id === payload.foodId);
        player.inventory[food.id]--; player.ap = round(player.ap - (food.cooked ? life.cookedEatAp : (food.eatAp ?? life.eatAp)));
        this.applyEffect(player, food.effect); player.hasEaten = true;
        this.say(`${player.name} กิน ${food.name}`); return true;
      }
      case 'buy_item': {
        const item = life.items.find(i => i.id === payload.itemId);
        player.cash -= item.price; player.ap = round(player.ap - item.apCost); player.equipment.push(item.id);
        this.applyEffect(player, item.effect); this.say(`${player.name} ซื้อ ${item.name}`); return true;
      }
      case 'cook': {
        const recipe = life.recipes.find(r => r.id === payload.recipeId);
        for (const [id, count] of Object.entries(recipe.ingredients)) player.inventory[id] -= count;
        player.inventory[recipe.id] = (player.inventory[recipe.id] || 0) + recipe.portions;
        player.ap = round(player.ap - life.cookAp); this.say(`${player.name} ทำ ${recipe.name} ${recipe.portions} ที่`); return true;
      }
      case 'salvage': {
        for (const index of [...payload.indices].sort((a,b) => b-a)) this.discard.push(player.hand.splice(index, 1)[0]);
        player.ap = Math.min(24, round(player.ap + 0.5));
        if (payload.indices.length === 3) player.cash += this.data.balance.blackMarket.tripleCash;
        player.phaseFlags.salvages++;
        const arrested = this.rng() < this.data.balance.blackMarket.arrestChance;
        if (arrested) player.jailWeek = this.week + 1;
        this.say(`${player.name} ย่อย ${payload.indices.length} ใบ · +0.5 AP${arrested ? ' · ถูกจับ! ควบคุมตัวใน Turn ถัดไป' : ''}`);
        return true;
      }
      default: return false;
    }
  },
  enterBlackMarket(player) {
    const { entryMin, entryMax } = this.data.balance.blackMarket;
    const loss = () => entryMin + Math.min(entryMax-entryMin, Math.floor(this.rng() * (entryMax-entryMin+1)));
    const health = loss(), happiness = loss();
    player.stats.health = clamp(player.stats.health - health);
    player.stats.happiness = clamp(player.stats.happiness - happiness);
    this.say(`เข้าตลาดมืด: สุขภาพ -${health}, ความสุข -${happiness} แม้ไม่ใช้บริการ`);
    return { health, happiness };
  }
};
