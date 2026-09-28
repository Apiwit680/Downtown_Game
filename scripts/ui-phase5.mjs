import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createGameServer } from '../server/index.js';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const artifacts = process.env.DOWNTOWN_UI_ARTIFACTS || join(process.cwd(), 'qa-phase5');
mkdirSync(artifacts, { recursive: true });
const game = createGameServer();
await new Promise(resolve => game.httpServer.listen(0, '127.0.0.1', resolve));
let browser;
try { browser = await chromium.launch({ headless: true, channel: process.env.PLAYWRIGHT_BROWSER_CHANNEL || 'chrome' }); }
catch (error) { await new Promise(resolve => game.io.close(resolve)); throw error; }
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
await context.addInitScript(() => {
  let original;
  Object.defineProperty(window, 'io', { configurable: true, get() { return original; }, set(fn) {
    original = (...args) => { const socket = fn(...args); window.qaSocket = socket; socket.on('game:state', state => window.qaState = state); return socket; };
  } });
});
const page = await context.newPage(), errors = [], checks = [];
page.on('pageerror', error => errors.push(error.message));
let room, player;
const ready = () => page.waitForFunction(() => window.qaState?.status === 'playing' && !document.querySelector('#end-phase').disabled, {}, { timeout: 20000 });
const publish = async () => { await page.evaluate(async () => window.qaSocket.timeout(5000).emitWithAck('room:resume', { code: window.qaState.roomCode, playerId: window.qaState.you.id })); await ready(); };
async function fixture(location, fn = () => {}) {
  const loc = room.locationMap.get(location); player.locationId = location; player.position = { x: loc.x, y: loc.y }; player.ap = 24; fn(); await publish();
}
async function open(location) {
  if (await page.locator('#info-dialog').evaluate(d => d.open)) await page.click('#close-info');
  if (await page.locator('#location-panel').isVisible()) await page.click('#close-location');
  await page.locator(`[data-location="${location}"]`).click();
}
async function command(type, scope = '#location-panel') { await page.locator(`${scope} [data-action="${type}"]:not([disabled])`).first().click(); await ready(); assert.equal(await page.locator('#location-panel').isVisible(), true); }
async function shot(name) { await page.screenshot({ path: join(artifacts, name + '.png') }); }
try {
  await page.goto('http://127.0.0.1:' + game.httpServer.address().port);
  await page.fill('#player-name', 'Phase5 QA'); await page.selectOption('#play-mode', 'solo'); await page.click('#create-form button');
  await page.waitForFunction(() => window.qaState?.roomCode);
  room = game.rooms.get(await page.evaluate(() => window.qaState.roomCode)); room.rng = () => 0;
  room.data.balance.personalEventChance = 0; room.data.balance.seasonalChanceSeason = 0;
  for (const mode of Object.keys(room.data.balance.transportEventChanceByMode)) room.data.balance.transportEventChanceByMode[mode] = 0;
  await page.click('#start-game'); await ready(); player = room.activePlayer;

  await fixture('school'); await open('school');
  await page.locator('[data-action="choose_track"]').filter({ hasText: 'สามัญ' }).click(); await ready();
  assert.equal(await page.locator('#location-panel').isVisible(), true);
  await page.locator('[data-action="study"]').click();
  await page.waitForSelector('.activity-particle', { state: 'attached' }); await ready();
  assert.match(await page.locator('.study-progress').textContent(), /Step 1 of 8/);
  await page.keyboard.press('Escape'); await page.mouse.click(5, 5); assert.equal(await page.locator('#location-panel').isVisible(), true);
  for (let i = 0; i < 7; i++) await command('study');
  assert.equal(player.education.level, 'highschool'); assert.equal(await page.locator('#location-panel').isVisible(), true);
  checks.push('1,4: school track/study persists through graduation; book particles, progress and explicit close only');
  await page.emulateMedia({ reducedMotion: 'reduce' });

  await fixture('university', () => { player.education.track = 'vocational'; player.education.level = 'diploma'; player.cash = 10000; }); await open('university');
  assert.equal(await page.locator('[data-faculty]').count(), 1); assert.match(await page.locator('[data-faculty]').textContent(), /Step 0 of 12/);
  await command('study_degree'); assert.equal(player.education.progress['engineering:bachelor'], 1);
  player.education.progress['engineering:bachelor'] = 11; await publish(); await command('study_degree');
  assert.equal(player.education.degrees.engineering, 'bachelor');
  checks.push('2: Vocational Engineering-only UI and half-time Bachelor completion');

  await fixture('mall', () => { player.offers = ['mall_sales']; }); await open('mall');
  assert.match(await page.locator('.job-offer').textContent(), /Workday pay: ฿413/);
  assert.match(await page.locator('.job-offer').textContent(), /Weekend pay: ฿227/);
  await command('accept_job'); await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.locator('[data-action="work"]').click(); await page.waitForSelector('.activity-particle', { state: 'attached' }); await ready();
  await command('work'); assert.equal(await page.locator('#location-panel').isVisible(), true);
  await shot('01-work-panel'); await page.emulateMedia({ reducedMotion: 'reduce' });
  checks.push('3,6: repeat Working persists with tools/papers/coins burst; offer shows both pay rates');
  const cash = player.cash; await command('resign_job'); assert.equal(player.mainJobId, null); assert.equal(player.cash - cash, Math.round(413 * 8 * .3));
  const part = room.data.careers.find(j => j.kind === 'parttime');
  await fixture(part.locationId, () => { player.parttimeJobId = part.id; }); await open(part.locationId); await command('resign_job'); assert.equal(player.parttimeJobId, null);
  checks.push('13: both job slots resign at their workplace and pay severance once');

  await fixture('bank', () => { player.debt = 1717; player.cash = 10000; }); await open('bank');
  await page.fill('input[name="repayment"]', '1000'); await page.locator('.repayment-form button').click(); await ready(); assert.equal(player.debt, 717);
  assert.equal(await page.locator('input[name="repayment"]').getAttribute('max'), '717');
  await page.fill('input[name="repayment"]', '717'); await page.locator('.repayment-form button').click(); await ready(); assert.equal(player.debt, 0);
  await fixture('bank', () => { player.debt = 2501; }); await page.fill('input[name="repayment"]', '2501'); await page.locator('.repayment-form button').click(); await ready(); assert.equal(player.debt, 0);
  await shot('02-bank'); checks.push('14: actual input repays 1000 + 717 and full 2501 without artificial cap');

  await fixture('market'); await open('market'); assert.equal(await page.locator('[data-food="krapao"]').count(), 0);
  await fixture('restaurant'); await open('restaurant');
  for (const [id, cost] of [['krapao', 2.75], ['chicken_salad', 3.25], ['somtam', 3.75]]) {
    const row = page.locator(`[data-food="${id}"]`); assert.match(await row.textContent(), new RegExp(String(cost).replace('.', '\\.'))); await row.locator('[data-action="buy_eat"]').click(); await ready();
  }
  await shot('03-restaurant'); const condo = room.locationMap.get('condo'); assert.deepEqual([condo.x, condo.y], [20, 13]);
  assert.ok(room.travelOptionsFor(player).condo.every(t => Number.isFinite(t.ap)));
  checks.push('7,8: connected center Condominium; restaurant-only meals show individual prices/AP');

  await fixture('convenience', () => { player.equipment = []; }); await open('convenience');
  assert.equal(await page.locator('[data-action="buy_food"]').count(), 0); await command('buy_eat');
  player.equipment.push('fridge'); await publish(); assert.ok(await page.locator('[data-action="buy_food"]').count() > 0);
  await command('buy_food'); await shot('04-fridge-choice'); checks.push('11: without fridge immediate eating; owned fridge offers eat or store');

  await fixture('home', () => { player.sleepAp = 4; player.hasEaten = false; }); await open('home'); await page.click('#end-phase'); await ready();
  assert.equal(player.ap, 21); assert.match(await page.locator('.phase-notices').textContent(), /ไม่ได้กินอาหาร/);
  checks.push('12: next-phase hunger AP deduction and visible reason; home panel stays open');

  await fixture('home', () => { player.cash = 10000; const i = room.deck.indexOf('vehicle_used_car'); assert.ok(i >= 0); [room.deck[i], player.hand[0]] = [player.hand[0], room.deck[i]]; });
  await page.click('#close-location'); if (await page.locator('#hand-toggle').getAttribute('aria-expanded') === 'false') await page.click('#hand-toggle');
  await page.locator('.hand-card').nth(player.hand.indexOf('vehicle_used_car')).click(); await page.locator('#info-dialog button').filter({ hasText: 'ใช้การ์ด' }).click(); await ready();
  assert.equal(player.usedCar, true); assert.equal(player.cash, 2000); assert.equal(await page.locator('#info-dialog').evaluate(d => d.open), true);
  await page.keyboard.press('Escape'); assert.equal(await page.locator('#info-dialog').evaluate(d => d.open), true);
  const popup = await page.locator('#info-dialog').boundingBox(); assert.ok(popup.width >= 700 && popup.width < 1440 && popup.height < 1000);
  await page.click('#close-info'); checks.push('5,9: used car card purchase; enlarged rectangular card popup remains until close');

  await fixture('home', () => { room.data.balance.transportEventChanceByMode.walk = 1; room.data.events = [{ id: 'loss_walk', name: 'ของตกหาย ฿120', scope: 'transport', transport: 'walk', weight: 1, durationTurns: 0, effect: { cash: -120 } }]; });
  await open('market'); await page.locator('.transport-row').filter({ hasText: 'เดินเท้า' }).click();
  await page.waitForSelector('.scene-overlay.money-loss:popover-open'); await shot('05-money-loss'); await ready(); assert.equal(room.lastPresentation.moneyLoss, 120);
  checks.push('10: actual money-loss travel event presents center rectangle above activity panel');

  await page.setViewportSize({ width: 390, height: 844 }); await open('market');
  const rect = await page.locator('#location-panel').boundingBox(); assert.ok(rect.width < 390 && rect.height < 844);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), 390);
  await shot('06-mobile-panel'); await page.reload(); await ready(); assert.equal(player.usedCar, true);
  checks.push('4,9: bounded mobile activity/popup sizing, no overflow and reconnect preserves ownership');
  assert.deepEqual(errors, []);
  const report = { ok: true, checks, browserErrors: errors, fixtures: 'Isolated server: credentials, inventory/cash/location and deterministic event setup; real browser clicks and server assertions. Human fun/balance approval pending.' };
  writeFileSync(join(artifacts, 'browser-phase5.json'), JSON.stringify(report, null, 2)); console.log(JSON.stringify(report));
} catch (error) { await shot('failure'); console.log(JSON.stringify({ error: String(error), browserErrors: errors, location: player?.locationId, artifacts })); throw error; }
finally { await browser.close(); await new Promise(resolve => game.io.close(resolve)); }
