import test from 'node:test';
import assert from 'node:assert/strict';
import { io as connect } from 'socket.io-client';
import { createGameServer } from './index.js';

async function setup(t) {
  const server = createGameServer();
  await new Promise((resolve) => server.httpServer.listen(0, '127.0.0.1', resolve));
  const clients = [];
  t.after(async () => {
    clients.forEach((client) => client.disconnect());
    await new Promise((resolve) => server.io.close(resolve));
  });
  async function client() {
    const socket = connect(`http://127.0.0.1:${server.httpServer.address().port}`, { forceNew: true, reconnection: false });
    clients.push(socket);
    socket.on('game:state', (state) => { socket.view = state; });
    await new Promise((resolve, reject) => {
      socket.once('connect', resolve);
      socket.once('connect_error', reject);
    });
    return socket;
  }
  return { ...server, client };
}

const emit = (socket, event, payload = {}) => socket.timeout(2000).emitWithAck(event, payload);

test('socket repayment accepts residual 717 and rejects stale replay without double debit', async t => {
  const server = await setup(t), host = await server.client();
  const created = await emit(host, 'room:create', { name: 'Repayment', mode: 'season', singlePlayer: true });
  await emit(host, 'game:start'); const room = server.rooms.get(created.roomCode), player = room.activePlayer;
  const bank = room.locationMap.get('bank'); player.locationId = 'bank'; player.position = { x: bank.x, y: bank.y }; player.debt = 1717; player.cash = 3000;
  const version = room.version, payment = { type: 'bank', payload: { operation: 'repay', amount: 1000 }, expectedVersion: version };
  assert.equal((await emit(host, 'game:action', payment)).ok, true);
  assert.equal((await emit(host, 'game:action', payment)).ok, false);
  assert.equal(player.debt, 717); assert.equal(player.cash, 2000);
  assert.equal((await emit(host, 'game:action', { type: 'bank', payload: { operation: 'repay', amount: 717 }, expectedVersion: room.version })).ok, true);
  assert.equal(player.debt, 0); assert.equal(player.cash, 1283);
});

test('R22 finished departure clears resume only for departing player and allows another room',async t=>{
 const s=await setup(t),host=await s.client(),guest=await s.client();const a=await emit(host,'room:create',{name:'Host',mode:'season'});const b=await emit(guest,'room:join',{name:'Guest',code:a.roomCode});await emit(host,'game:start');
 const room=s.rooms.get(a.roomCode);room.finish();await emit(host,'room:resume',{code:a.roomCode,playerId:a.playerId});
 assert.equal((await emit(host,'room:leave')).ok,true);assert.equal((await emit(host,'room:resume',{code:a.roomCode,playerId:a.playerId})).ok,false);
 assert.equal((await emit(guest,'room:resume',{code:a.roomCode,playerId:b.playerId})).ok,true);assert.equal(guest.view.status,'finished');
 assert.equal((await emit(host,'room:create',{name:'Again',mode:'marathon',singlePlayer:true})).ok,true);
 await emit(guest,'room:leave');assert.equal(s.rooms.has(a.roomCode),false);
});
test('R23 socket solo mode and stale action replay reject duplicate rewards',async t=>{
 const s=await setup(t),host=await s.client(),guest=await s.client();const a=await emit(host,'room:create',{name:'Solo',mode:'marathon',singlePlayer:true});assert.equal((await emit(guest,'room:join',{name:'Guest',code:a.roomCode})).ok,false);assert.equal((await emit(host,'game:start')).ok,true);
 const r=s.rooms.get(a.roomCode),p=r.activePlayer,version=r.version;
 assert.equal((await emit(host,'game:action',{type:'sleep',expectedVersion:version})).ok,true);assert.equal(p.sleepAp,4);
 assert.equal((await emit(host,'game:action',{type:'sleep',expectedVersion:version})).ok,false);assert.equal(p.sleepAp,4);
 assert.equal((await emit(host,'game:travel',{locationId:'market',transport:'walk',expectedVersion:version})).ok,false);
});
test('socket hands stay private and real Weekend completion refills only outgoing hand',async t=>{
 const s=await setup(t),host=await s.client(),guest=await s.client();const a=await emit(host,'room:create',{name:'Host',mode:'season'});await emit(guest,'room:join',{name:'Guest',code:a.roomCode});const r=s.rooms.get(a.roomCode);r.rng=()=>0;await emit(host,'game:start');
 const p=r.activePlayer;r.discard.push(...p.hand.splice(0,3));
 assert.equal((await emit(host,'game:action',{type:'full_rest',expectedVersion:r.version})).ok,true);assert.equal(p.hand.length,2);
 assert.equal((await emit(host,'game:action',{type:'full_rest',expectedVersion:r.version})).ok,true);assert.equal(p.hand.length,5);assert.equal(r.lastPresentation.refillCount,3);
 assert.ok(guest.view.players.every(p=>!('hand' in p)));assert.equal(guest.view.hand.length,5);assert.ok(!('drawnCardIds' in guest.view.lastPresentation));
});

test('host cancellation releases every lobby socket and invalidates the old room', async (t) => {
  const server = await setup(t), host = await server.client(), guest = await server.client();
  const created = await emit(host, 'room:create', { name: 'Host', mode: 'season' });
  const joined = await emit(guest, 'room:join', { code: created.roomCode, name: 'Guest' });
  const closed = [];
  host.on('room:closed', (event) => closed.push(['host', event.roomCode]));
  guest.on('room:closed', (event) => closed.push(['guest', event.roomCode]));
  assert.equal((await emit(host, 'room:leave')).closed, true);
  // Awaiting a later guest request guarantees the guest has processed the earlier closure.
  const resume = await emit(guest, 'room:resume', { code: created.roomCode, playerId: joined.playerId });
  assert.equal(resume.ok, false);
  assert.equal(server.rooms.size, 0);
  assert.deepEqual(closed.sort(), [['guest', created.roomCode], ['host', created.roomCode]]);
  assert.equal((await emit(host, 'room:create', { name: 'Host again', mode: 'season' })).ok, true);
  assert.equal((await emit(guest, 'room:create', { name: 'Guest again', mode: 'marathon' })).ok, true);
});

test('guest Exit removes only that seat and can rejoin without duplicate player colors', async (t) => {
  const server = await setup(t), host = await server.client(), guest = await server.client(), third = await server.client();
  const created = await emit(host, 'room:create', { name: 'Host', mode: 'season' });
  const joined = await emit(guest, 'room:join', { code: created.roomCode, name: 'Guest' });
  await emit(third, 'room:join', { code: created.roomCode, name: 'Third' });
  // A guest-supplied host ID must not grant permission to close the host's room.
  const left = await emit(guest, 'room:leave', { playerId: created.playerId });
  assert.equal(left.ok, true);
  assert.equal(left.closed, false);
  const room = server.rooms.get(created.roomCode);
  assert.deepEqual(room.players.map((player) => player.id), [created.playerId, third.view.you.id]);
  assert.equal((await emit(guest, 'room:resume', { code: created.roomCode, playerId: joined.playerId })).ok, false);
  assert.equal((await emit(guest, 'room:join', { code: created.roomCode, name: 'Returned' })).ok, true);
  assert.equal(new Set(room.players.map((player) => player.color)).size, 3);
  assert.equal((await emit(host, 'game:start')).ok, true);
});

test('the lobby Exit command cannot silently cancel a match that has started', async (t) => {
  const server = await setup(t), host = await server.client(), guest = await server.client();
  const created = await emit(host, 'room:create', { name: 'Host', mode: 'season' });
  await emit(guest, 'room:join', { code: created.roomCode, name: 'Guest' });
  await emit(host, 'game:start');
  const room = server.rooms.get(created.roomCode), before = room.viewFor(created.playerId);
  assert.equal((await emit(host, 'room:leave')).ok, false);
  assert.equal((await emit(guest, 'room:leave')).ok, false);
  assert.deepEqual(room.viewFor(created.playerId), before);
});
