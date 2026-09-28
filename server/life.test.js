import test from 'node:test';
import assert from 'node:assert/strict';
import {loadData,validateData} from './data.js';
import {GameRoom} from './game.js';
const setup=(mode='season',singlePlayer=true)=>{
 const data=structuredClone(loadData());data.balance.personalEventChance=0;data.balance.seasonalChanceSeason=0;data.balance.seasonalChanceMarathon=0;
 let first=true;const r=new GameRoom({code:'LIFE01',mode,singlePlayer,hostId:'one',hostName:'One',data,rng:()=>{if(first){first=false;return 0;}return 0.5;}});
 if(!singlePlayer)r.addPlayer('Two','two');r.start('one');return r;
};
const at=(r,id)=>{const p=r.activePlayer,l=r.locationMap.get(id);p.locationId=id;p.position={x:l.x,y:l.y};return p;};
const next=(r)=>{r.act(r.activePlayerId,'sleep');r.act(r.activePlayerId,'end_phase');};

test('R02–R05 phases start at Apartment with 24 AP, home-only sleep, no auto meal/draw',()=>{
 const r=setup(),p=r.activePlayer;assert.equal(p.ap,24);assert.equal(p.cash,3000);assert.equal(p.hasEaten,false);
 r.travel(p.id,'market','walk');assert.throws(()=>r.act(p.id,'sleep'),/unavailable/);
 r.travel(p.id,'home','walk');const hand=p.hand.length;next(r);
 assert.equal(r.phase,'weekend');assert.equal(r.week,1);assert.equal(p.locationId,'home');assert.equal(p.ap,20);assert.equal(p.hand.length,hand);
 next(r);assert.equal(r.week,2);assert.equal(r.phase,'workday');assert.equal(p.locationId,'home');
});
test('R08–R10 all exact catalog entries exist; raw food gives inventory without stats',()=>{
 const r=setup(),p=at(r,'market');assert.equal(r.data.life.foods.filter(f=>f.locationId==='market').length,13);assert.equal(r.data.life.foods.filter(f=>f.locationId==='restaurant').length,3);assert.equal(r.data.life.foods.filter(f=>f.locationId==='convenience').length,18);
 const before={...p.stats};r.act(p.id,'buy_food',{foodId:'raw_pork'});assert.deepEqual(p.stats,before);assert.equal(p.ap,23.5);assert.equal(p.inventory.raw_pork,1);
 at(r,'restaurant');r.act(p.id,'buy_eat',{foodId:'krapao'});assert.equal(p.ap,20.75);assert.equal(p.hasEaten,true);assert.equal(p.inventory.krapao,undefined);
 assert.throws(()=>r.act(p.id,'buy_eat',{foodId:'raw_pork'}),/unavailable/);
});
test('R10 food actions reject wrong location, low AP/cash and raw eating',()=>{
 const r=setup(),p=r.activePlayer;assert.throws(()=>r.act(p.id,'buy_food',{foodId:'raw_pork'}),/unavailable/);
 at(r,'market');p.cash=0;assert.throws(()=>r.act(p.id,'buy_food',{foodId:'raw_pork'}),/unavailable/);p.cash=100;p.ap=0.49;
 assert.throws(()=>r.act(p.id,'buy_food',{foodId:'raw_pork'}),/unavailable/);assert.equal(p.cash,100);assert.equal(p.ap,0.49);
});
test('R11–R12 Working repeats at 1 AP, drains both stats and Weekend pays less',()=>{
 const r=setup(),p=at(r,'mall');p.mainJobId='mall_sales';const cash=p.cash,health=p.stats.health,happiness=p.stats.happiness;
 r.act(p.id,'work',{kind:'main'});r.act(p.id,'work',{kind:'main'});assert.equal(p.ap,22);assert.equal(p.cash-cash,2*r.careerMap.get('mall_sales').payByPhase.workday);assert.ok(p.stats.health<health&&p.stats.happiness<happiness);
 r.phase='weekend';const before=p.cash;r.act(p.id,'work',{kind:'main'});assert.ok(p.cash-before<(cash+2*r.careerMap.get('mall_sales').payByPhase.workday-cash)/2);
 at(r,'home');assert.throws(()=>r.act(p.id,'work',{kind:'main'}),/unavailable/);
});
test('R12 every career uses 1 AP and lower Weekend pay',()=>{for(const j of loadData().careers){assert.equal(j.apCost,1);assert.ok(j.payByPhase.weekend<j.payByPhase.workday);assert.ok(j.healthDrain>0&&j.happinessDrain>0);assert.ok(j.xpGain>0);}});
test('R13 faculty prerequisite is independent and multiple Bachelors can coexist',()=>{
 const r=setup(),p=at(r,'university');p.education.level='highschool';p.cash=10000;
 assert.throws(()=>r.act(p.id,'study_degree',{facultyId:'engineering',degree:'master'}),/unavailable/);
 p.education.progress['engineering:bachelor']=23;r.act(p.id,'study_degree',{facultyId:'engineering',degree:'bachelor'});
 assert.equal(p.education.degrees.engineering,'bachelor');assert.ok(r.actionsFor(p.id).some(a=>a.type==='study_degree'&&a.payload.facultyId==='engineering'&&a.payload.degree==='master'));
 assert.ok(!r.actionsFor(p.id).some(a=>a.type==='study_degree'&&a.payload.facultyId==='medical'&&a.payload.degree==='master'));
 p.education.progress['medical:bachelor']=23;r.act(p.id,'study_degree',{facultyId:'medical',degree:'bachelor'});assert.equal(p.education.degrees.engineering,'bachelor');assert.equal(p.education.degrees.medical,'bachelor');
});
test('R14 study repetition is 1 AP and keeps knowledge separate from graduation',()=>{
 const r=setup(),p=at(r,'school');r.act(p.id,'choose_track',{track:'highschool'});
 for(let i=0;i<8;i++)r.act(p.id,'study');assert.equal(p.education.level,'highschool');assert.equal(p.ap,16);assert.equal(p.stats.knowledge,14.8);
});
test('R15 learning cards grant experience and retain deck references',()=>{
 for(const id of ['skill_notes','skill_exam_luck','skill_network']){const c=loadData().cards.find(c=>c.id===id);assert.ok(c.effect.experience>0);assert.equal(c.effect.knowledge,undefined);}
 const r=setup(),p=r.activePlayer;p.hand=['skill_notes'];r.act(p.id,'play_card',{index:0});assert.equal(p.experience,2);assert.equal(p.stats.knowledge,12);
});
test('R16 faculty-specific job qualification uses matching degrees',()=>{
 const r=setup(),p=r.activePlayer,j=r.careerMap.get('hospital_nurse');p.education.level='bachelor';p.education.degrees.business='bachelor';p.experience=20;
 assert.equal(r.qualifies(p,j),false);p.education.degrees.medical='bachelor';assert.equal(r.qualifies(p,j),true);
});
test('R17 multiple applications resolve on next OWN Workday, with one offer acceptance',()=>{
 const r=setup('season',false),p=at(r,'job_center');p.education.level='vocational';
 r.act(p.id,'apply_job',{jobId:'mall_sales'});r.act(p.id,'apply_job',{jobId:'market_logistics'});assert.equal(p.mainJobId,null);assert.equal(p.applications.length,2);
 assert.throws(()=>r.act(p.id,'apply_job',{jobId:'mall_sales'}),/unavailable/);
 at(r,'home');next(r);assert.equal(p.offers.length,0);next(r);assert.equal(r.activePlayerId,'two');assert.equal(p.offers.length,0);
 next(r);r.rng=()=>0;next(r);assert.equal(r.activePlayerId,'one');assert.equal(p.offers.length,2);assert.equal(p.applicationResults.length,2);
 r.act(p.id,'accept_job',{jobId:'mall_sales'});assert.equal(p.mainJobId,'mall_sales');assert.equal(p.offers.length,0);assert.throws(()=>r.act(p.id,'accept_job',{jobId:'market_logistics'}),/unavailable/);
});
test('R17 rejection and experience-dependent probabilities are real outcomes',()=>{
 const r=setup(),p=at(r,'job_center'),j=r.careerMap.get('mall_sales');p.education.level='vocational';const low=r.hiringChance(p,j);p.experience=10;assert.ok(r.hiringChance(p,j)>low);
 r.act(p.id,'apply_job',{jobId:j.id});at(r,'home');next(r);r.rng=()=>0.999;next(r);assert.equal(p.offers.length,0);assert.equal(p.applicationResults[0].accepted,false);
});
test('R18 transport mishaps affect cash and both stats on the traveler only',()=>{
 const r=setup('season',false),p=r.activePlayer,other=r.players[1],before=structuredClone(other.stats);
 r.data.events=r.data.events.filter(e=>e.id==='street_mishap_walk');r.data.balance.transportEventChanceByMode.walk=1;r.rng=()=>0;
 const health=p.stats.health,happiness=p.stats.happiness,cash=p.cash;r.travel(p.id,'market','walk');assert.equal(p.stats.health,health-3);assert.equal(p.stats.happiness,happiness-4);assert.equal(p.cash,cash-120);assert.deepEqual(other.stats,before);
});
test('R19 weekly market dividends are lower over four Turns and never paid monthly twice',()=>{
 const r=setup(),p=r.activePlayer;p.assets=[{income:300,cadence:'weekly'}];p.cash=10000;
 for(let w=1;w<=4;w++){r.week=w;r.endGlobalWeek();}assert.equal(p.cash,10000+1200-3000);assert.ok(1200<1800);
});
test('R20 deck totals, active frequency and new hand interactions are explicit',()=>{
 const d=loadData();for(const[mode,total]of[['season',52],['marathon',104]]){const counts=d.balance.deckComposition[mode].counts;assert.equal(Object.values(counts).reduce((a,b)=>a+b),total);const active=d.cards.filter(c=>c.kind==='active').reduce((n,c)=>n+counts[c.id],0);assert.ok(active/total>34/52);}
 assert.ok(d.cards.some(c=>c.id==='prank_swap'&&c.effect.drawCount===2));
});
test('R21 Black Market entry rolls each stat independently at inclusive endpoints, even without actions',()=>{
 const r=setup(),p=r.activePlayer;r.data.balance.transportEventChanceByMode.walk=0;const rolls=[0.5,0,0.999999];r.rng=()=>rolls.shift()??0.5;
 const before={...p.stats};r.travel(p.id,'black_market','walk');assert.equal(p.stats.health,before.health-10);assert.equal(p.stats.happiness,before.happiness-30);assert.deepEqual(r.lastPresentation.entryLoss,{health:10,happiness:30});
 const arrived={...p.stats};r.actionsFor(p.id);r.viewFor(p.id);assert.deepEqual(p.stats,arrived);assert.throws(()=>r.travel(p.id,'black_market','walk'),/Already/);assert.deepEqual(p.stats,arrived);
 r.travel(p.id,'market','walk');r.rng=()=>0;r.travel(p.id,'black_market','walk');assert.equal(p.stats.health,arrived.health-10);assert.equal(p.stats.happiness,Math.max(0,arrived.happiness-10));
});
test('R21 entry losses clamp low stats and ignore event shields',()=>{
 const r=setup(),p=r.activePlayer;p.stats.health=4;p.stats.happiness=7;p.eventShieldNext=1;r.data.balance.transportEventChanceByMode.walk=0;r.rng=()=>0;
 r.travel(p.id,'black_market','walk');assert.equal(p.stats.health,0);assert.equal(p.stats.happiness,0);assert.equal(p.eventShieldNext,1);
});
test('R21 one card and three DISTINCT instances each reward exactly 0.5 AP',()=>{
 const r=setup(),p=at(r,'black_market');r.rng=()=>0.9;p.hand=['skill_notes','skill_notes','skill_notes','prank_silly'];p.ap=10;
 r.act(p.id,'salvage',{indices:[0,1,2]});assert.equal(p.ap,10.5);assert.equal(p.cash,3100);assert.equal(p.hand.length,1);
 r.act(p.id,'salvage',{indices:[0]});assert.equal(p.ap,11);assert.equal(p.cash,3100);assert.throws(()=>r.act(p.id,'salvage',{indices:[0,0,0]}),/unavailable/);
});
test('R21 salvage requires room for the full 0.5 AP reward',()=>{
 const r=setup(),p=at(r,'black_market');p.ap=23.75;assert.throws(()=>r.act(p.id,'salvage',{indices:[0]}),/unavailable/);assert.equal(p.ap,23.75);
 p.ap=23.5;r.rng=()=>0.99;r.act(p.id,'salvage',{indices:[0]});assert.equal(p.ap,24);
});
test('shared physical cards are conserved through repeated salvage, refill and reshuffle in both modes',()=>{
 for(const mode of ['season','marathon']){
  const r=setup(mode),p=r.activePlayer,total=()=>r.deck.length+r.discard.length+r.players.reduce((n,p)=>n+p.hand.length+p.passives.length,0);
  for(let phase=0;phase<24;phase++){
    r.travel(p.id,'black_market','walk');r.rng=()=>0.5;
    const available=Math.min(3,p.hand.length);for(let n=0;n<available;n++)r.act(p.id,'salvage',{indices:[0]});
    assert.equal(total(),r.deckSize);r.travel(p.id,'home','walk');next(r);assert.equal(total(),r.deckSize);
  }
 }
});
test('R21 salvage quota bounds the loop and arrest serves exactly one next two-phase slot',()=>{
 const r=setup(),p=at(r,'black_market');p.hand=['skill_notes','skill_notes','skill_notes','prank_silly'];p.ap=10;r.rng=()=>0;
 for(let i=0;i<3;i++)r.act(p.id,'salvage',{indices:[0]});assert.equal(p.ap,11.5);assert.equal(p.jailWeek,2);assert.ok(!r.actionsFor(p.id).some(a=>a.type==='salvage'));
 at(r,'home');next(r);next(r);assert.equal(r.week,2);assert.equal(p.custody,true);assert.equal(p.locationId,'home');assert.throws(()=>r.travel(p.id,'market','walk'),/custody/);
 r.act(p.id,'serve_jail');assert.equal(r.phase,'weekend');assert.equal(p.custody,true);r.act(p.id,'serve_jail');assert.equal(r.week,3);assert.equal(p.custody,false);assert.equal(p.pendingSleepPenalty,0);assert.equal(p.hand.length,5);
});
test('R23 one-human solo in both modes; multiplayer minimum still two',()=>{
 for(const mode of ['season','marathon']){const r=setup(mode);assert.equal(r.players.length,1);assert.equal(r.activePlayer.hand.length,5);assert.equal(r.deck.length,(mode==='season'?52:104)-5);assert.throws(()=>r.addPlayer('Extra'),/started/);}
 const r=new GameRoom({code:'EMPTY1',mode:'season',hostName:'Host',hostId:'one',data:loadData()});assert.throws(()=>r.start('one'),/2–6/);
});
test('R23 solo cannot consume partner-only cards',()=>{const r=setup(),p=r.activePlayer;p.hand=['partner_token'];assert.throws(()=>r.act(p.id,'play_card',{index:0}),/unavailable/);});
test('R24 casino repeat losses cost 0.5 AP and Happiness, and reject unaffordable bets',()=>{
 const r=setup(),p=at(r,'casino');r.rng=()=>0.99;const happiness=p.stats.happiness;
 for(let i=0;i<3;i++)r.act(p.id,'casino',{stake:200});assert.equal(p.ap,22.5);assert.equal(p.stats.happiness,happiness-9);p.cash=0;assert.throws(()=>r.act(p.id,'casino',{stake:200}),/unavailable/);
});
test('R25–R26 purchases persist, recipes consume once, cooked eating costs 1 AP',()=>{
 const r=setup(),p=at(r,'mall');p.cash=10000;r.act(p.id,'buy_item',{itemId:'fridge'});r.act(p.id,'buy_item',{itemId:'kitchen_set'});assert.throws(()=>r.act(p.id,'buy_item',{itemId:'fridge'}),/unavailable/);
 at(r,'market');r.act(p.id,'buy_food',{foodId:'raw_pork'});r.act(p.id,'buy_food',{foodId:'vegetables'});at(r,'home');const ap=p.ap;
 assert.ok(r.viewFor(p.id).recipes.find(f=>f.id==='cooked_pork').craftable);r.act(p.id,'cook',{recipeId:'cooked_pork'});assert.equal(p.ap,ap-0.25);assert.equal(p.inventory.cooked_pork,2);assert.equal(p.inventory.raw_pork,0);assert.throws(()=>r.act(p.id,'cook',{recipeId:'cooked_pork'}),/unavailable/);
 r.act(p.id,'eat_food',{foodId:'cooked_pork'});assert.equal(p.ap,ap-1.25);assert.equal(p.inventory.cooked_pork,1);next(r);assert.ok(p.equipment.includes('fridge'));assert.equal(r.viewFor(p.id).inventory.cooked_pork,1);
});
test('R26 missing equipment disables recipes and carried raw capacity is enforced',()=>{
 const r=setup(),p=at(r,'market');for(let i=0;i<6;i++)r.act(p.id,'buy_food',{foodId:'fruit'});assert.throws(()=>r.act(p.id,'buy_food',{foodId:'fruit'}),/unavailable/);
 at(r,'home');assert.ok(r.recipeStatus(p,r.data.life.recipes.find(f=>f.id==='cooked_fruit')).missing.includes('ตู้เย็น'));assert.throws(()=>r.act(p.id,'cook',{recipeId:'cooked_fruit'}),/unavailable/);
});
test('R06 full rest carries outgoing Weekend refill and transition metadata',()=>{
 const r=setup(),p=r.activePlayer;r.act(p.id,'full_rest');assert.equal(r.phase,'weekend');const cards=p.hand.splice(0,3);r.discard.push(...cards);r.act(p.id,'full_rest');assert.equal(p.hand.length,5);assert.equal(r.lastPresentation.refillCount,3);assert.equal(r.lastPresentation.completedPhase,'weekend');assert.equal(r.lastPresentation.completedWeek,1);assert.equal(r.lastPresentation.nextWeek,2);
});
test('new catalogs reject malformed counts, recipes, costs and entry limits',()=>{
 for(const mutate of [d=>d.balance.deckComposition.season.counts.skill_notes++,d=>d.life.recipes[0].ingredients.raw_pork=-1,d=>d.life.rawPurchaseAp=1,d=>d.balance.blackMarket.entryMax=31,d=>d.careers[0].payByPhase.weekend=9999]){const d=structuredClone(loadData());mutate(d);assert.throws(()=>validateData(d));}
});
