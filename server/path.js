const key = (x, y) => `${x},${y}`;

export function roadTiles(map) {
  const tiles = new Set();
  for (const segment of map.roads ?? []) {
    const [x1, y1, x2, y2] = segment;
    if (![x1, y1, x2, y2].every(Number.isInteger) || (x1 !== x2 && y1 !== y2)) {
      throw new Error(`Invalid road segment: ${JSON.stringify(segment)}`);
    }
    const dx = Math.sign(x2 - x1);
    const dy = Math.sign(y2 - y1);
    const steps = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1));
    for (let i = 0; i <= steps; i += 1) {
      const x = x1 + dx * i;
      const y = y1 + dy * i;
      if (x < 0 || y < 0 || x >= map.width || y >= map.height) {
        throw new Error(`Road leaves map at ${x},${y}`);
      }
      tiles.add(key(x, y));
    }
  }
  return tiles;
}

const pathCaches = new WeakMap();

export function shortestRoadPath(map, from, to, tiles = roadTiles(map)) {
  let cache = pathCaches.get(map);
  if (!cache) { cache = new Map(); pathCaches.set(map, cache); }
  const start = key(from.x, from.y);
  const goal = key(to.x, to.y);
  const cacheKey = `${start}>${goal}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey);
  if (!tiles.has(start) || !tiles.has(goal)) return null;
  if (start === goal) return [{ x: from.x, y: from.y }];
  const queue = [[from.x, from.y]];
  const seen = new Set([start]);
  const previous = new Map();
  for (let index = 0; index < queue.length; index += 1) {
    const [x, y] = queue[index];
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nextX = x + dx;
      const nextY = y + dy;
      const next = key(nextX, nextY);
      if (!tiles.has(next) || seen.has(next)) continue;
      previous.set(next, key(x, y));
      if (next === goal) {
        const path = [];
        for (let cursor = goal; cursor; cursor = previous.get(cursor)) {
          const [pathX, pathY] = cursor.split(',').map(Number);
          path.unshift({ x: pathX, y: pathY });
        }
        cache.set(cacheKey, path);
        cache.set(`${goal}>${start}`, [...path].reverse());
        return path;
      }
      seen.add(next);
      queue.push([nextX, nextY]);
    }
  }
  return null;
}

export function shortestRoadDistance(map, from, to, tiles = roadTiles(map)) {
  const path = shortestRoadPath(map, from, to, tiles);
  return path ? path.length - 1 : Infinity;
}

export function assertConnectedMap(map) {
  const tiles = roadTiles(map);
  if (tiles.size === 0) throw new Error('Map has no roads');
  const start = map.locations?.[0];
  if (!start) throw new Error('Map has no locations');
  for (const point of [...map.locations, ...(map.busStops ?? []), map.exit]) {
    if (!point || !Number.isInteger(point.x) || !Number.isInteger(point.y)) {
      throw new Error('Map contains a point without integer coordinates');
    }
    if (!tiles.has(key(point.x, point.y))) {
      throw new Error(`Point ${point.id ?? point.name ?? 'exit'} is not on a road`);
    }
    if (!Number.isFinite(shortestRoadDistance(map, start, point, tiles))) {
      throw new Error(`Point ${point.id ?? point.name ?? 'exit'} cannot be reached`);
    }
  }
  const stopIds = new Set((map.busStops ?? []).map((stop) => stop.id));
  for (const route of map.busRoutes ?? []) {
    if (!Array.isArray(route.stops) || route.stops.length < 2) {
      throw new Error(`Bus route ${route.id} needs at least two stops`);
    }
    for (const stopId of route.stops) {
      if (!stopIds.has(stopId)) throw new Error(`Unknown bus stop ${stopId}`);
    }
  }
}

function roundedUpAp(value) {
  return Math.max(0.01, Math.ceil((value - 1e-9) * 100) / 100);
}

function fare(rule, tiles) {
  return Math.max(0, Math.ceil((rule.baseFare ?? 0) + tiles * (rule.perTileFare ?? 0)));
}

export function planTrip(map, balance, from, to, transport) {
  const tiles = roadTiles(map);
  const directTiles = shortestRoadDistance(map, from, to, tiles);
  const directPath = shortestRoadPath(map, from, to, tiles);
  if (!Number.isFinite(directTiles)) throw new Error('No connected route to destination');
  if (directTiles === 0) return { distanceTiles: 0, rawAp: 0, ap: 0, fare: 0, transport, path: directPath, legs: [] };
  const rules = balance.transport ?? {};
  const rule = rules[transport];
  if (!rule || !Number.isFinite(rule.speed) || rule.speed <= 0) {
    throw new Error('Unknown transport option');
  }
  if (transport !== 'bus') {
    return {
      distanceTiles: directTiles,
      rawAp: directTiles / rule.speed,
      ap: roundedUpAp(directTiles / rule.speed),
      fare: fare(rule, directTiles),
      transport, path: directPath, legs: [{ transport, path: directPath }]
    };
  }

  const stops = new Map((map.busStops ?? []).map((stop) => [stop.id, stop]));
  let best = null;
  for (const route of map.busRoutes ?? []) {
    for (let boardIndex = 0; boardIndex < route.stops.length; boardIndex += 1) {
      for (let alightIndex = 0; alightIndex < route.stops.length; alightIndex += 1) {
        if (boardIndex === alightIndex) continue;
        const board = stops.get(route.stops[boardIndex]);
        const alight = stops.get(route.stops[alightIndex]);
        const walkTo = shortestRoadDistance(map, from, board, tiles);
        const walkFrom = shortestRoadDistance(map, alight, to, tiles);
        if (!Number.isFinite(walkTo) || !Number.isFinite(walkFrom)) continue;
        let busTiles = 0;
        const busPath = [];
        const step = Math.sign(alightIndex - boardIndex);
        for (let index = boardIndex; index !== alightIndex; index += step) {
          const current = stops.get(route.stops[index]);
          const next = stops.get(route.stops[index + step]);
          busTiles += shortestRoadDistance(map, current, next, tiles);
          const segment = shortestRoadPath(map, current, next, tiles);
          busPath.push(...(busPath.length ? segment.slice(1) : segment));
        }
        const rawAp = (walkTo + walkFrom) / rules.walk.speed + busTiles / rule.speed;
        const candidate = {
          distanceTiles: walkTo + busTiles + walkFrom,
          rawAp,
          ap: roundedUpAp(rawAp),
          fare: fare(rule, busTiles),
          transport,
          routeId: route.id,
          boardStopId: board.id,
          alightStopId: alight.id,
          legs: [
            { transport: 'walk', path: shortestRoadPath(map, from, board, tiles) },
            { transport: 'bus', path: busPath },
            { transport: 'walk', path: shortestRoadPath(map, alight, to, tiles) }
          ]
        };
        candidate.path = candidate.legs.reduce((path, leg) => [...path, ...(path.length ? leg.path.slice(1) : leg.path)], []);
        if (!best || candidate.ap < best.ap ||
            (candidate.ap === best.ap && candidate.fare < best.fare)) {
          best = candidate;
        }
      }
    }
  }
  if (!best) throw new Error('No usable bus route');
  return best;
}
