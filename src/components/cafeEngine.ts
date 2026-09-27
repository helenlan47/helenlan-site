// Canvas engine for the café homepage concept: a tiny top-down room you
// walk around in. All art is drawn procedurally at 16px tiles and scaled
// up with pixelated rendering, so there are no sprite assets to manage.

import { SAGEHEN_NUMBER, type Identity, type NetMessage, type Transport } from './cafeNetwork';

const T = 16;
const W = 20;
const H = 13;
export const VIEW_W = W * T;
export const VIEW_H = H * T;

type Rect = [x: number, y: number, w: number, h: number]; // in tiles
export type Dir = 'up' | 'down' | 'left' | 'right';

export interface Thing {
  id: string;
  rect: Rect;
  label: string;
}

// Everything you can walk up to and interact with.
export const THINGS: Thing[] = [
  { id: 'espresso', rect: [1, 2, 4, 2], label: 'Order a coffee' },
  { id: 'bakery', rect: [5, 2, 2, 2], label: 'Browse the pastries' },
  { id: 'wine', rect: [9, 2, 1, 1], label: 'Open the wine fridge' },
  { id: 'window', rect: [10, 0, 3, 2], label: 'Look outside' },
  { id: 'postcards', rect: [13, 0, 2, 2], label: 'Look at the postcards' },
  { id: 'books', rect: [15, 2, 4, 1], label: 'Browse the bookshelf' },
  { id: 'jukebox', rect: [18, 6, 1, 2], label: 'Play the jukebox' },
  { id: 'journal', rect: [5, 8, 1, 1], label: 'Read the journal' },
  { id: 'cat', rect: [13, 9, 1, 1], label: 'Pet the cat' },
  { id: 'restroom', rect: [0, 6, 1, 2], label: 'Restroom' },
  { id: 'sign', rect: [7, 11, 1, 1], label: "Today's specials" },
  { id: 'coat', rect: [16, 11, 1, 1], label: 'Coat rack' },
  { id: 'shoes', rect: [17, 11, 1, 1], label: 'Shoe bench' },
  { id: 'door', rect: [9, 12, 2, 1], label: 'Head out' },
];

// ---- Collision map -------------------------------------------------------

const solid: boolean[][] = Array.from({ length: H }, () => Array(W).fill(false));
function block(x: number, y: number, w = 1, h = 1) {
  for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) solid[j][i] = true;
}
block(0, 0, W, 2); // back wall
block(0, 0, 1, H); // side walls
block(W - 1, 0, 1, H);
block(0, H - 1, W, 1); // front wall
block(1, 2, 7, 1); // behind the counter
block(1, 3, 8, 1); // counter
block(8, 2); // counter end
block(9, 2); // wine fridge
block(15, 2, 4, 1); // bookshelf
block(18, 6, 1, 2); // jukebox
block(11, 5, 3, 1); // table + chairs
block(11, 9, 3, 1); // table + chairs (cat's chair)
block(4, 8, 3, 1); // journal table + chairs
block(1, 11); // plant
block(18, 11); // plant
block(7, 11); // sign
block(16, 11, 2, 1); // coat rack + shoe bench

const isSolid = (x: number, y: number) => solid[y]?.[x] ?? true;

const REACH = 0.95 * T;
function distToRect(px: number, py: number, [x, y, w, h]: Rect) {
  const dx = Math.max(x * T - px, 0, px - (x + w) * T);
  const dy = Math.max(y * T - py, 0, py - (y + h) * T);
  return Math.hypot(dx, dy);
}

// Breadth-first search over walkable tiles; returns tiles to visit
// (excluding the start), or null if unreachable.
function findPath(sx: number, sy: number, isGoal: (x: number, y: number) => boolean) {
  const key = (x: number, y: number) => y * W + x;
  const prev = new Map<number, number | null>([[key(sx, sy), null]]);
  const queue: [number, number][] = [[sx, sy]];
  while (queue.length) {
    const [x, y] = queue.shift()!;
    if (isGoal(x, y)) {
      const path: [number, number][] = [];
      let k: number | null = key(x, y);
      while (k !== null) {
        path.unshift([k % W, Math.floor(k / W)]);
        k = prev.get(k) ?? null;
      }
      path.shift();
      return path;
    }
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx;
      const ny = y + dy;
      if (isSolid(nx, ny) || prev.has(key(nx, ny))) continue;
      prev.set(key(nx, ny), key(x, y));
      queue.push([nx, ny]);
    }
  }
  return null;
}

// ---- Engine --------------------------------------------------------------

interface Hooks {
  onInteract: (thing: Thing) => void;
  /** Called every frame with the nearest reachable thing and the player's head position (canvas px). */
  onNearest: (thing: Thing | null, headX: number, headY: number) => void;
  isPaused: () => boolean;
  isMusicOn: () => boolean;
  me: Identity;
  transport: Transport;
  /** Element overlaying the canvas; the engine puts name tags and chirp bubbles here. */
  labelLayer: HTMLElement;
  onCount: (online: number) => void;
}

interface Remote {
  id: string;
  num: number;
  look: number;
  x: number;
  y: number;
  tx: number;
  ty: number;
  dir: Dir;
  moving: boolean;
  anim: number;
  seen: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  kind: 'steam' | 'note' | 'zzz';
  seed: number;
}

type Palette = { hair: string; skin: string; shirt: string; pants: string; apron?: string; long?: boolean; bun?: boolean };

// Every guest is a Cecil-style sagehen; the `look` seed picks their tee
// color so people can tell each other apart. Cecil 47 wears the classic
// light "SAGEHEN athletics" tee from the reference art.
const TEES = ['#b5502f', '#4f7a55', '#e7c77a', '#8b3a5a', '#5d8aa8', '#f28c8c', '#2f3a33', '#9b6bd1'];
const CLASSIC_TEE = '#dfe6ee';
function teeFor(num: number, look: number) {
  return num === SAGEHEN_NUMBER ? CLASSIC_TEE : TEES[look % TEES.length];
}

const BARISTA: Palette = { hair: '#8a4b2a', skin: '#e0b08a', shirt: '#ffffff', pants: '#3b3b3b', apron: '#4f7a55', long: true, bun: true };

const SPEED = 60; // px per second
const FEET = 10; // feet sit this far below a tile's top edge

export function startCafe(canvas: HTMLCanvasElement, hooks: Hooks) {
  canvas.width = VIEW_W;
  canvas.height = VIEW_H;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  const hour = new Date().getHours();
  const timeOfDay = hour >= 7 && hour < 17 ? 'day' : hour >= 17 && hour < 20 ? 'sunset' : 'night';
  const background = drawBackground(timeOfDay);

  const { me, transport } = hooks;
  const player = {
    x: (8 + Math.floor(Math.random() * 5)) * T + T / 2,
    y: 10 * T + FEET,
    dir: 'up' as Dir,
    moving: false,
    anim: 0,
    path: [] as [number, number][],
    target: null as Thing | null,
  };
  const keys = new Set<string>();
  const particles: Particle[] = [];
  const emitClock: Record<string, number> = {};
  let nearest: Thing | null = null;
  let time = 0;
  let stepDt = 0;
  let last = performance.now();
  let raf = 0;

  // -- other visitors

  const remotes = new Map<string, Remote>();
  const tags = new Map<string, { name: HTMLDivElement; bubble: HTMLDivElement; chirpUntil: number; nextChirp: number }>();
  let sendClock = 0;
  let lastSent = '';
  let lastCount = 0;

  function tagFor(id: string, num: number) {
    let tag = tags.get(id);
    if (!tag) {
      const name = document.createElement('div');
      name.textContent = `cecil ${num}`;
      name.style.cssText =
        'position:absolute;transform:translate(-50%,0);white-space:nowrap;pointer-events:none;' +
        'font:500 10px/1.2 Inter,system-ui,sans-serif;color:#fff8ee;background:rgba(33,29,24,.55);' +
        'padding:1px 5px;border-radius:6px;';
      if (id === me.id) name.style.background = 'rgba(181,80,47,.85)';
      const bubble = document.createElement('div');
      bubble.textContent = 'chirp chirp!';
      bubble.style.cssText =
        'position:absolute;transform:translate(-50%,-100%);white-space:nowrap;pointer-events:none;' +
        'font:600 12px/1.2 Inter,system-ui,sans-serif;color:#1f3bb3;background:#fff;border:2px solid #1f3bb3;' +
        'padding:2px 8px;border-radius:10px;display:none;';
      hooks.labelLayer.append(name, bubble);
      // the sagehen chirps on arrival, then every so often
      tag = { name, bubble, chirpUntil: num === SAGEHEN_NUMBER ? time + 3.5 : 0, nextChirp: time + 12 + Math.random() * 12 };
      tags.set(id, tag);
    }
    return tag;
  }

  function placeTag(id: string, num: number, x: number, y: number) {
    const tag = tagFor(id, num);
    tag.name.style.left = `${(x / VIEW_W) * 100}%`;
    tag.name.style.top = `${((y + 2) / VIEW_H) * 100}%`;
    if (num !== SAGEHEN_NUMBER) return;
    if (time > tag.nextChirp) {
      tag.chirpUntil = time + 2.5;
      tag.nextChirp = time + 12 + Math.random() * 12;
    }
    const chirping = time < tag.chirpUntil;
    tag.bubble.style.display = chirping ? 'block' : 'none';
    if (chirping) {
      tag.bubble.style.left = `${(x / VIEW_W) * 100}%`;
      tag.bubble.style.top = `${((y - 22) / VIEW_H) * 100}%`;
    }
  }

  function dropRemote(id: string) {
    remotes.delete(id);
    const tag = tags.get(id);
    tag?.name.remove();
    tag?.bubble.remove();
    tags.delete(id);
  }

  transport.subscribe((m: NetMessage) => {
    if (m.id === me.id) return;
    if (m.type === 'leave') return dropRemote(m.id);
    const known = remotes.get(m.id);
    if (known) {
      Object.assign(known, { tx: m.x, ty: m.y, dir: m.dir as Dir, moving: m.moving, seen: now() });
    } else {
      remotes.set(m.id, {
        id: m.id, num: m.num, look: m.look, x: m.x, y: m.y, tx: m.x, ty: m.y,
        dir: m.dir as Dir, moving: m.moving, anim: 0, seen: now(),
      });
      transport.send(myState()); // say hi right away so the newcomer sees us
    }
  });

  // Wall-clock seconds (game time freezes while the tab is hidden).
  function now() {
    return performance.now() / 1000;
  }
  function myState() {
    return { type: 'state' as const, id: me.id, num: me.num, look: me.look, x: Math.round(player.x), y: Math.round(player.y), dir: player.dir, moving: player.moving };
  }
  // Heartbeat on a timer, not the render loop, so we stay visible to
  // others while our tab is in the background.
  const heartbeat = window.setInterval(() => transport.send(myState()), 2000);

  function sendLeave() {
    transport.send({ type: 'leave', id: me.id });
  }
  window.addEventListener('pagehide', sendLeave);

  const r = (x: number, y: number, w: number, h: number, c: string) => {
    ctx.fillStyle = c;
    ctx.fillRect(x, y, w, h);
  };

  // -- helpers

  function feetPoint() {
    return [player.x, player.y - 2] as const;
  }

  function isNear(thing: Thing) {
    const [px, py] = feetPoint();
    return distToRect(px, py, thing.rect) < REACH;
  }

  function face(thing: Thing) {
    const [x, y, w, h] = thing.rect;
    const dx = (x + w / 2) * T - player.x;
    const dy = (y + h / 2) * T - player.y;
    player.dir = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : dy < 0 ? 'up' : 'down';
  }

  function interact(thing: Thing) {
    face(thing);
    hooks.onInteract(thing);
  }

  function hits(x: number, y: number) {
    const corners = [[x - 4, y - 3], [x + 3.9, y - 3], [x - 4, y + 0.9], [x + 3.9, y + 0.9]];
    return corners.some(([a, b]) => isSolid(Math.floor(a / T), Math.floor(b / T)));
  }

  // -- input

  const KEYMAP: Record<string, Dir> = {
    ArrowUp: 'up', w: 'up', W: 'up',
    ArrowDown: 'down', s: 'down', S: 'down',
    ArrowLeft: 'left', a: 'left', A: 'left',
    ArrowRight: 'right', d: 'right', D: 'right',
  };

  function onKeyDown(e: KeyboardEvent) {
    if (hooks.isPaused() || e.metaKey || e.ctrlKey || e.altKey) return;
    if (KEYMAP[e.key]) {
      keys.add(KEYMAP[e.key]);
      e.preventDefault();
    } else if (e.key === 'e' || e.key === 'E' || e.key === 'Enter' || e.key === ' ') {
      if (nearest) interact(nearest);
      e.preventDefault();
    }
  }
  function onKeyUp(e: KeyboardEvent) {
    if (KEYMAP[e.key]) keys.delete(KEYMAP[e.key]);
  }
  function onBlur() {
    keys.clear();
  }

  function onPointerDown(e: PointerEvent) {
    if (hooks.isPaused()) return;
    const box = canvas.getBoundingClientRect();
    const tx = Math.floor(((e.clientX - box.left) / box.width) * W);
    const ty = Math.floor(((e.clientY - box.top) / box.height) * H);
    const sx = Math.floor(player.x / T);
    const sy = Math.floor(player.y / T);
    const thing = THINGS.find(({ rect: [x, y, w, h] }) => tx >= x && tx < x + w && ty >= y && ty < y + h);

    if (thing) {
      if (isNear(thing)) return interact(thing);
      const path = findPath(sx, sy, (x, y) => distToRect(x * T + 8, y * T + 8, thing.rect) < REACH);
      if (path) {
        player.path = path;
        player.target = thing;
      }
    } else if (!isSolid(tx, ty)) {
      const path = findPath(sx, sy, (x, y) => x === tx && y === ty);
      if (path) {
        player.path = path;
        player.target = null;
      }
    }
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);
  canvas.addEventListener('pointerdown', onPointerDown);

  // -- simulation

  function update(dt: number) {
    time += dt;
    stepDt = dt;
    player.moving = false;

    let vx = 0;
    let vy = 0;
    if (!hooks.isPaused()) {
      if (keys.has('left')) vx--;
      if (keys.has('right')) vx++;
      if (keys.has('up')) vy--;
      if (keys.has('down')) vy++;
    }

    if (vx || vy) {
      player.path = [];
      player.target = null;
      const len = Math.hypot(vx, vy);
      const nx = player.x + (vx / len) * SPEED * dt;
      if (!hits(nx, player.y)) player.x = nx;
      const ny = player.y + (vy / len) * SPEED * dt;
      if (!hits(player.x, ny)) player.y = ny;
      player.dir = Math.abs(vx) > Math.abs(vy) ? (vx < 0 ? 'left' : 'right') : vy < 0 ? 'up' : 'down';
      player.moving = true;
    } else if (player.path.length && !hooks.isPaused()) {
      const [tx, ty] = player.path[0];
      const gx = tx * T + T / 2;
      const gy = ty * T + FEET;
      const dx = gx - player.x;
      const dy = gy - player.y;
      const d = Math.hypot(dx, dy);
      const step = SPEED * dt;
      if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
        player.dir = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : dy < 0 ? 'up' : 'down';
      }
      if (d <= step) {
        player.x = gx;
        player.y = gy;
        player.path.shift();
        if (!player.path.length && player.target) {
          const target = player.target;
          player.target = null;
          interact(target);
        }
      } else {
        player.x += (dx / d) * step;
        player.y += (dy / d) * step;
      }
      player.moving = true;
    }
    player.anim = player.moving ? player.anim + dt * 8 : 0;

    // nearest interactable
    const [px, py] = feetPoint();
    let best: Thing | null = null;
    let bestD = REACH;
    for (const thing of THINGS) {
      const d = distToRect(px, py, thing.rect);
      if (d < bestD) {
        best = thing;
        bestD = d;
      }
    }
    nearest = best;
    hooks.onNearest(nearest, player.x, player.y - 24);

    // network: send our state ~10x/sec while it changes
    sendClock += dt;
    const state = myState();
    const key = JSON.stringify(state);
    if (sendClock > 0.1 && key !== lastSent) {
      transport.send(state);
      lastSent = key;
      sendClock = 0;
    }
    for (const rem of remotes.values()) {
      if (now() - rem.seen > 10) {
        dropRemote(rem.id);
        continue;
      }
      const k = Math.min(1, dt * 12);
      rem.x += (rem.tx - rem.x) * k;
      rem.y += (rem.ty - rem.y) * k;
      rem.anim = rem.moving ? rem.anim + dt * 8 : 0;
    }
    if (remotes.size + 1 !== lastCount) {
      lastCount = remotes.size + 1;
      hooks.onCount(lastCount);
    }

    // particles
    emit('cup1', 0.5, () => spawn(12.5 * T - 3, 5.5 * T - 4, 'steam'));
    emit('cup2', 0.6, () => spawn(5.5 * T + 5, 8.5 * T - 1, 'steam'));
    emit('espresso', 0.4, () => spawn(T + 13, 3 * T - 11, 'steam'));
    emit('cat', 1.8, () => spawn(13.5 * T + 5, 9.5 * T - 8, 'zzz'));
    if (hooks.isMusicOn()) emit('jukebox', 0.9, () => spawn(18.5 * T - 2, 6 * T, 'note'));

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.life > p.max) particles.splice(i, 1);
    }
  }

  function emit(id: string, every: number, fn: () => void) {
    emitClock[id] = (emitClock[id] ?? Math.random() * every) + stepDt;
    if (emitClock[id] >= every) {
      emitClock[id] = 0;
      fn();
    }
  }

  function spawn(x: number, y: number, kind: Particle['kind']) {
    const base = { x, y, life: 0, seed: Math.random() * 10, kind };
    if (kind === 'steam') particles.push({ ...base, vx: 0, vy: -5, max: 1.8 });
    if (kind === 'zzz') particles.push({ ...base, vx: 3, vy: -4, max: 2.2 });
    if (kind === 'note') particles.push({ ...base, vx: -6 - Math.random() * 4, vy: -8, max: 2.4 });
  }

  // -- rendering

  function render() {
    ctx.drawImage(background, 0, 0);
    drawStringLights();
    drawJukeboxLights();

    // barista (stands behind the counter; occasionally turns to the machine)
    const baristaDir: Dir = time % 7 < 1.6 ? 'left' : 'down';
    drawPerson(4.5 * T, 3 * T - (Math.floor(time * 1.5) % 2), baristaDir, 0, BARISTA, false);

    drawCat();

    // everyone in the room, back to front
    const everyone = [
      { id: me.id, num: me.num, look: me.look, x: player.x, y: player.y, dir: player.dir, moving: player.moving, anim: player.anim },
      ...remotes.values(),
    ].sort((a, b) => a.y - b.y);
    for (const c of everyone) {
      const frame = c.moving ? Math.floor(c.anim) % 4 : 0;
      drawSagehen(c.x, c.y, c.dir, frame, teeFor(c.num, c.look));
      placeTag(c.id, c.num, c.x, c.y);
    }

    drawParticles();

    // warm vignette, plus a cool tint after dark
    const g = ctx.createRadialGradient(VIEW_W / 2, VIEW_H / 2, 60, VIEW_W / 2, VIEW_H / 2, 220);
    g.addColorStop(0, 'rgba(255,200,140,0)');
    g.addColorStop(1, timeOfDay === 'night' ? 'rgba(20,15,40,0.35)' : 'rgba(60,30,10,0.22)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }

  function drawPerson(cx: number, fy: number, dir: Dir, frame: number, pal: Palette, legs: boolean) {
    const x = Math.round(cx) - 5;
    const y = Math.round(fy) - 16;
    if (legs) {
      r(x + 1, y + 15, 8, 2, 'rgba(0,0,0,0.2)');
      const a = frame === 1 ? 1 : 0;
      const b = frame === 3 ? 1 : 0;
      r(x + 2, y + 12, 2, 3 - a, pal.pants);
      r(x + 6, y + 12, 2, 3 - b, pal.pants);
      r(x + 2, y + 15 - a, 2, 1, '#3b2a20');
      r(x + 6, y + 15 - b, 2, 1, '#3b2a20');
    }
    const yy = y - (frame === 1 || frame === 3 ? 1 : 0);
    const hairLen = pal.long ? 9 : 4;
    const eye = '#2a1c16';

    r(x + 1, yy + 7, 8, 6, pal.shirt); // body
    if (pal.apron && dir !== 'up') r(x + 2, yy + 8, 6, 5, pal.apron);
    r(x, yy + 8, 1, 4, pal.shirt); // arms
    r(x + 9, yy + 8, 1, 4, pal.shirt);
    r(x, yy + 11, 1, 1, pal.skin);
    r(x + 9, yy + 11, 1, 1, pal.skin);
    r(x + 2, yy + 1, 6, 6, pal.skin); // head
    r(x + 1, yy, 8, 2, pal.hair); // hair
    if (pal.bun) r(x + 3, yy - 2, 4, 2, pal.hair);
    if (dir === 'up') {
      r(x + 1, yy, 8, hairLen + 1, pal.hair);
      return;
    }
    r(x + 1, yy + 2, 1, hairLen - 1, pal.hair);
    r(x + 8, yy + 2, 1, hairLen - 1, pal.hair);
    if (dir === 'left') {
      r(x + 6, yy + 1, 3, hairLen, pal.hair);
      r(x + 3, yy + 4, 1, 1, eye);
    } else if (dir === 'right') {
      r(x + 1, yy + 1, 3, hairLen, pal.hair);
      r(x + 6, yy + 4, 1, 1, eye);
    } else {
      r(x + 3, yy + 4, 1, 1, eye);
      r(x + 6, yy + 4, 1, 1, eye);
      r(x + 2, yy + 5, 1, 1, 'rgba(240,120,120,0.5)');
      r(x + 7, yy + 5, 1, 1, 'rgba(240,120,120,0.5)');
    }
  }

  // Cecil the Sagehen (every guest): royal-blue fluff, orange beak and big orange feet,
  // a tuft on top, and a light "SAGEHEN athletics" tee.
  function drawSagehen(cx: number, fy: number, dir: Dir, frame: number, tee: string) {
    const x = Math.round(cx) - 6;
    const y = Math.round(fy) - 18;
    const blue = '#1f3bb3';
    const wing = '#4a63d8';
    const orange = '#ff5a2a';
    const a = frame === 1 ? 1 : 0;
    const b = frame === 3 ? 1 : 0;
    const flap = frame === 1 || frame === 3 ? -1 : 0;

    r(x + 1, y + 17, 10, 2, 'rgba(0,0,0,0.2)');
    r(x + 1, y + 16 - a, 4, 2, orange); // feet
    r(x + 7, y + 16 - b, 4, 2, orange);
    r(x + 3, y + 14 - a, 1, 2, orange);
    r(x + 8, y + 14 - b, 1, 2, orange);

    const yy = y + flap;
    r(x + 1, yy + 6, 10, 9, blue); // body
    r(x, yy + 8, 1, 5, blue);
    r(x + 11, yy + 8, 1, 5, blue);
    r(x + 2, yy + 15, 2, 1, blue); // fluffy fringe
    r(x + 6, yy + 15, 2, 1, blue);
    r(x + 1, yy + 8, 10, 4, tee); // tee
    if (dir !== 'up') {
      const lettering = tee === CLASSIC_TEE ? blue : 'rgba(255,255,255,0.7)';
      r(x + 3, yy + 9, 6, 1, lettering);
      r(x + 4, yy + 11, 4, 1, lettering);
    }
    r(x - 2, yy + 6 + flap, 2, 5, wing); // wings, flapping while walking
    r(x - 3, yy + 5 + flap, 1, 2, wing);
    r(x + 12, yy + 6 + flap, 2, 5, wing);
    r(x + 14, yy + 5 + flap, 1, 2, wing);

    r(x + 2, yy + 1, 8, 6, blue); // head
    r(x + 1, yy + 2, 10, 4, blue);
    r(x + 4, yy - 1, 1, 2, blue); // tuft
    r(x + 6, yy - 2, 1, 3, blue);
    r(x + 7, yy - 1, 1, 2, blue);

    const eye = '#0b1440';
    if (dir === 'down') {
      r(x + 3, yy + 3, 1, 1, eye);
      r(x + 8, yy + 3, 1, 1, eye);
      r(x + 4, yy + 4, 4, 2, orange);
      r(x + 5, yy + 6, 2, 1, '#e04a1f');
    } else if (dir === 'left') {
      r(x + 3, yy + 3, 1, 1, eye);
      r(x - 1, yy + 4, 4, 2, orange);
    } else if (dir === 'right') {
      r(x + 8, yy + 3, 1, 1, eye);
      r(x + 9, yy + 4, 4, 2, orange);
    }
  }

  function drawCat() {
    const cx = 13.5 * T;
    const cy = 9.5 * T;
    const breathe = Math.sin(time * 2) > 0 ? 1 : 0;
    const tail = Math.round(Math.sin(time * 1.3) * 1.5);
    r(cx - 7, cy + tail - 1, 3, 1, '#e39a4f');
    r(cx - 4, cy - 3 - breathe, 9, 5 + breathe, '#e39a4f');
    r(cx - 2, cy - 3 - breathe, 1, 3, '#c47a35');
    r(cx, cy - 3 - breathe, 1, 3, '#c47a35');
    r(cx + 3, cy - 5, 5, 5, '#e39a4f');
    r(cx + 3, cy - 6, 1, 1, '#e39a4f');
    r(cx + 7, cy - 6, 1, 1, '#e39a4f');
    r(cx + 4, cy - 3, 1, 1, '#3b2a20');
    r(cx + 6, cy - 3, 1, 1, '#3b2a20');
  }

  function drawStringLights() {
    const colors = ['#ffd27a', '#ff9f7a', '#b8e0a0', '#9fc9ff'];
    let i = 0;
    for (let x = 4; x < VIEW_W; x += 11, i++) {
      const y = 3 + Math.round(2 * Math.abs(Math.sin((x / 44) * Math.PI)));
      const a = 0.65 + 0.35 * Math.sin(time * 2 + i * 1.7);
      ctx.globalAlpha = 0.18 * a;
      ctx.fillStyle = colors[i % 4];
      ctx.beginPath();
      ctx.arc(x + 0.5, y + 1, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = a;
      r(x, y, 2, 2, colors[i % 4]);
      ctx.globalAlpha = 1;
      r(x, y - 1, 2, 1, '#3b2a20');
    }
  }

  function drawJukeboxLights() {
    const on = hooks.isMusicOn();
    for (let k = 0; k < 7; k++) {
      const hue = (time * (on ? 120 : 30) + k * 40) % 360;
      const c = `hsl(${hue}, 80%, ${on ? 65 : 45}%)`;
      r(18 * T + 1, 6 * T + 10 + k * 2, 1, 2, c);
      r(18 * T + 14, 6 * T + 10 + k * 2, 1, 2, c);
    }
  }

  function drawParticles() {
    for (const p of particles) {
      const fade = 1 - p.life / p.max;
      const x = Math.round(p.x + Math.sin(p.life * 3 + p.seed) * 1.5);
      const y = Math.round(p.y);
      if (p.kind === 'steam') {
        r(x, y, 1, 1, `rgba(255,255,255,${0.7 * fade})`);
      } else if (p.kind === 'zzz') {
        const c = `rgba(255,248,230,${0.9 * fade})`;
        r(x, y, 3, 1, c);
        r(x + 1, y + 1, 1, 1, c);
        r(x, y + 2, 3, 1, c);
      } else {
        const c = `rgba(255,220,150,${fade})`;
        r(x + 2, y, 1, 4, c);
        r(x, y + 3, 2, 2, c);
        r(x + 3, y, 1, 1, c);
      }
    }
  }

  function loop(now: number) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    update(dt);
    render();
    raf = requestAnimationFrame(loop);
  }
  raf = requestAnimationFrame(loop);

  return {
    interactNearest() {
      if (nearest && !hooks.isPaused()) interact(nearest);
    },
    stop() {
      cancelAnimationFrame(raf);
      window.clearInterval(heartbeat);
      sendLeave();
      window.removeEventListener('pagehide', sendLeave);
      for (const id of [...tags.keys()]) dropRemote(id);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      canvas.removeEventListener('pointerdown', onPointerDown);
    },
  };
}

// ---- Static room art (drawn once to an offscreen canvas) -----------------

function drawBackground(timeOfDay: 'day' | 'sunset' | 'night') {
  const c = document.createElement('canvas');
  c.width = VIEW_W;
  c.height = VIEW_H;
  const ctx = c.getContext('2d')!;
  const r = (x: number, y: number, w: number, h: number, col: string) => {
    ctx.fillStyle = col;
    ctx.fillRect(x, y, w, h);
  };
  const circ = (x: number, y: number, rad: number, col: string) => {
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.arc(x, y, rad, 0, Math.PI * 2);
    ctx.fill();
  };
  let seed = 11;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

  // floor planks
  const planks = ['#c99c70', '#c4956a', '#cfa679'];
  for (let y = 2; y < H - 1; y++) {
    for (let x = 1; x < W - 1; x++) {
      const px = x * T;
      const py = y * T;
      for (let k = 0; k < 2; k++) {
        r(px, py + k * 8, T, 8, planks[(x * 3 + y * 5 + k * 2) % 3]);
        r(px, py + k * 8 + 7, T, 1, '#a97b52');
      }
      if ((x + y) % 3 === 0) r(px, py, 1, 7, '#a97b52');
      if ((x + y) % 3 === 1) r(px + 8, py + 8, 1, 7, '#a97b52');
    }
  }

  // rug under the tables
  r(10 * T + 4, 4 * T + 2, 5 * T - 8, 7 * T - 4, '#9b4a3c');
  r(10 * T + 6, 4 * T + 4, 5 * T - 12, 7 * T - 8, '#d9b36c');
  r(10 * T + 7, 4 * T + 5, 5 * T - 14, 7 * T - 10, '#9b4a3c');
  for (let y = 4 * T + 9; y < 11 * T - 6; y += 8) {
    for (let x = 10 * T + 11; x < 15 * T - 8; x += 8) r(x, y, 2, 2, '#c7775f');
  }

  // back wall: striped wallpaper + wainscoting
  r(0, 0, VIEW_W, 2 * T, '#f1e3cf');
  for (let x = 0; x < VIEW_W; x += 8) r(x, 0, 3, 2 * T, '#ead8c0');
  r(0, 2 * T - 8, VIEW_W, 8, '#8b5a3c');
  r(0, 2 * T - 9, VIEW_W, 1, '#6b3f25');
  r(0, 2 * T - 1, VIEW_W, 1, '#5a3420');
  for (let x = 4; x < VIEW_W; x += 12) r(x, 2 * T - 7, 1, 6, '#7a4c30');

  // window
  const sky = { day: ['#9fd3f0', '#c8e8f8'], sunset: ['#f4a67a', '#f7d08a'], night: ['#1f2a55', '#2e3b6e'] }[timeOfDay];
  r(162, 3, 44, 20, '#6b3f25');
  r(164, 5, 40, 8, sky[0]);
  r(164, 13, 40, 8, sky[1]);
  if (timeOfDay === 'night') {
    for (let i = 0; i < 9; i++) r(165 + Math.floor(rnd() * 38), 6 + Math.floor(rnd() * 13), 1, 1, '#fff8d8');
    circ(196, 9, 2.5, '#fff3c4');
  } else if (timeOfDay === 'day') {
    r(170, 8, 8, 2, '#fff');
    r(172, 7, 4, 1, '#fff');
    r(190, 15, 9, 2, '#fff');
  } else {
    circ(176, 17, 3, '#ffe6a0');
  }
  r(183, 5, 2, 16, '#6b3f25');
  r(164, 12, 40, 1, '#6b3f25');
  r(160, 22, 48, 2, '#7a4c30');

  // postcard corkboard
  r(211, 4, 26, 16, '#6b3f25');
  r(212, 5, 24, 14, '#c89b62');
  const cards: [number, number, number, number, string][] = [
    [214, 7, 6, 4, '#ffffff'], [221, 6, 6, 5, '#9fd3f0'], [228, 8, 6, 4, '#f4b6a0'],
    [215, 13, 6, 4, '#c7e3b0'], [223, 13, 5, 4, '#fff3b0'], [229, 13, 6, 4, '#ffffff'],
  ];
  for (const [x, y, w, h, col] of cards) {
    r(x, y, w, h, col);
    r(x + Math.floor(w / 2), y, 1, 1, '#c0392b');
  }

  // chalkboard menu behind the counter
  r(36, 3, 72, 19, '#5a3420');
  r(38, 5, 68, 15, '#2f3a33');
  r(58, 6, 28, 2, '#f3efe6');
  for (const y of [10, 13, 16]) {
    r(41, y, 16 + (y % 5), 1, '#d8d4c8');
    r(62, y, 3, 1, '#e7c77a');
    r(72, y, 18 - (y % 4), 1, '#d8d4c8');
    r(98, y, 4, 1, '#e7c77a');
  }

  // side + front walls
  r(0, 2 * T, T, 11 * T, '#5c3d2b');
  r(T - 2, 2 * T, 2, 10 * T, '#4a2f20');
  r(19 * T, 2 * T, T, 11 * T, '#5c3d2b');
  r(19 * T, 2 * T, 2, 10 * T, '#4a2f20');
  r(0, 12 * T, VIEW_W, T, '#5c3d2b');
  r(T, 12 * T, 18 * T, 2, '#4a2f20');

  // front door threshold + mat
  r(9 * T, 12 * T, 2 * T, T, '#b98a5e');
  r(9 * T, 12 * T, 2 * T, 2, '#8b5a3c');
  r(9 * T + 2, 11 * T + 4, 2 * T - 4, T - 5, '#6b8f5e');
  for (let x = 9 * T + 4; x < 11 * T - 4; x += 4) r(x, 11 * T + 5, 1, T - 7, '#5a7a4e');

  // restroom door on the left wall
  r(1, 6 * T + 2, T - 3, 2 * T - 4, '#b07a4f');
  r(2, 6 * T + 4, T - 5, 2 * T - 8, '#c28a5c');
  r(T - 5, 7 * T, 2, 2, '#e7c77a');
  r(4, 6 * T + 7, 6, 6, '#faf6f0');
  r(6, 6 * T + 8, 2, 2, '#5c564c');
  r(6, 6 * T + 10, 2, 2, '#5c564c');

  // bookshelf
  r(15 * T, T, 4 * T, 2 * T, '#6b3f25');
  r(15 * T + 2, T + 2, 4 * T - 4, 2 * T - 4, '#4a2c1a');
  const bookColors = ['#b5502f', '#4f7a55', '#3d4a63', '#e7c77a', '#8b3a5a', '#f1e3cf', '#5d8aa8'];
  for (let k = 0; k < 3; k++) {
    const bottom = T + 2 + 9 * (k + 1) - 1;
    let x = 15 * T + 3;
    while (x < 19 * T - 5) {
      const w = rnd() < 0.5 ? 2 : 3;
      const h = 5 + Math.floor(rnd() * 3);
      r(x, bottom - h, w, h, bookColors[Math.floor(rnd() * bookColors.length)]);
      x += w + (rnd() < 0.12 ? 2 : 0);
    }
    r(15 * T + 2, bottom, 4 * T - 4, 1, '#6b3f25');
  }

  // wine fridge
  r(9 * T + 1, T + 4, T - 2, 2 * T - 4, '#3a3f45');
  r(9 * T + 3, T + 6, T - 6, 2 * T - 10, '#1f2a33');
  for (let y = T + 8; y < 3 * T - 6; y += 4) {
    r(9 * T + 4, y, 2, 2, '#7a1f2b');
    r(9 * T + 7, y, 2, 2, '#e8d9a0');
    r(9 * T + 10, y, 2, 2, '#7a1f2b');
  }
  r(9 * T + 3, T + 6, 1, 2 * T - 10, 'rgba(160,200,255,0.4)');

  // counter
  r(T, 3 * T, 8 * T, 8, '#7a4a2b');
  r(T, 3 * T, 8 * T, 1, '#95603a');
  r(T, 3 * T + 8, 8 * T, 8, '#5c3620');
  for (let x = T + 8; x < 9 * T; x += 16) r(x, 3 * T + 9, 1, 6, '#4a2a18');
  r(8 * T, 2 * T, T, T + 8, '#7a4a2b');
  r(8 * T, 2 * T, 1, T + 8, '#95603a');

  // espresso machine
  r(T + 2, 3 * T - 9, 22, 12, '#c9ccd2');
  r(T + 2, 3 * T - 10, 22, 2, '#8e939b');
  r(T + 4, 3 * T - 7, 18, 4, '#3b3f45');
  r(T + 6, 3 * T - 6, 2, 2, '#e7c77a');
  r(T + 18, 3 * T - 6, 2, 2, '#e7c77a');
  r(T + 7, 3 * T + 1, 3, 2, '#555');
  r(T + 16, 3 * T + 1, 3, 2, '#555');
  r(T + 11, 3 * T + 3, 3, 3, '#fff');

  // tip jar, pastry case, register
  r(3 * T + 6, 3 * T + 1, 4, 5, 'rgba(220,240,255,0.7)');
  r(3 * T + 7, 3 * T + 4, 2, 1, '#e7c77a');
  r(5 * T + 2, 3 * T - 6, 2 * T - 4, 12, '#9ec7cf');
  r(5 * T + 3, 3 * T - 5, 2 * T - 6, 10, '#d6eef2');
  const pastries: [number, number, number, number, string][] = [
    [5, -2, 5, 2, '#d9a24e'], [12, -2, 4, 3, '#8b4a2b'], [19, -2, 5, 2, '#e8b0c0'],
    [6, 2, 4, 2, '#f0d27a'], [14, 2, 5, 2, '#d9a24e'], [22, 2, 3, 2, '#8b4a2b'],
  ];
  for (const [dx, dy, w, h, col] of pastries) r(5 * T + dx, 3 * T + dy, w, h, col);
  r(7 * T + 3, 3 * T - 3, 10, 7, '#3b3f45');
  r(7 * T + 5, 3 * T - 2, 6, 2, '#9fe0b0');

  // tables with chairs
  const chair = (cx: number, cy: number, backOnLeft: boolean) => {
    r(cx - 5, cy - 4, 10, 9, '#6b3f25');
    r(cx - 4, cy - 3, 8, 7, '#8b5a3c');
    r(backOnLeft ? cx - 5 : cx + 3, cy - 7, 2, 12, '#5a3420');
  };
  const table = (cx: number, cy: number) => {
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.beginPath();
    ctx.ellipse(cx, cy + 6, 7, 2, 0, 0, Math.PI * 2);
    ctx.fill();
    r(cx - 1, cy + 2, 2, 5, '#4a2c1a');
    circ(cx, cy, 6.5, '#9a5b34');
    circ(cx, cy - 0.5, 5.5, '#b06d42');
  };
  const cup = (x: number, y: number) => {
    r(x, y, 3, 3, '#fff');
    r(x + 1, y + 1, 1, 1, '#6b3f25');
  };

  for (const [cx, cy] of [[12.5 * T, 5.5 * T], [12.5 * T, 9.5 * T], [5.5 * T, 8.5 * T]]) {
    chair(cx - T, cy, true);
    chair(cx + T, cy, false);
    table(cx, cy);
  }
  cup(12.5 * T - 4, 5.5 * T - 3);
  cup(12.5 * T + 2, 5.5 * T);
  // vase on the cat's table
  r(12.5 * T - 1, 9.5 * T - 4, 2, 4, '#7fb3c8');
  circ(12.5 * T, 9.5 * T - 5, 1.5, '#f28c8c');
  // open journal + pen + cup
  r(5.5 * T - 5, 8.5 * T - 3, 10, 6, '#fdf8ec');
  r(5.5 * T, 8.5 * T - 3, 1, 6, '#c9b99a');
  for (const dy of [-2, 0, 2]) {
    r(5.5 * T - 4, 8.5 * T + dy, 3, 1, '#9a8f7c');
    r(5.5 * T + 2, 8.5 * T + dy, 2, 1, '#9a8f7c');
  }
  r(5.5 * T + 3, 8.5 * T + 3, 3, 1, '#b5502f');
  cup(5.5 * T + 4, 8.5 * T - 2);

  // jukebox body (lights are animated separately)
  r(18 * T + 1, 6 * T + 6, 14, 2 * T - 7, '#8b3a3a');
  circ(18 * T + 8, 6 * T + 8, 7, '#b5502f');
  r(18 * T + 3, 6 * T + 6, 10, 6, '#ffe6a8');
  r(18 * T + 3, 7 * T + 4, 10, 9, '#5a2020');
  for (let y = 7 * T + 5; y < 7 * T + 13; y += 2) r(18 * T + 4, y, 8, 1, '#7a3030');

  // plants
  for (const cx of [1.5 * T, 18.5 * T]) {
    const cy = 11 * T + 8;
    r(cx - 4, cy, 8, 6, '#b5651d');
    r(cx - 5, cy - 1, 10, 2, '#c97a2e');
    circ(cx - 3, cy - 4, 4, '#4f8a4b');
    circ(cx + 3, cy - 5, 4, '#5f9e56');
    circ(cx, cy - 8, 4, '#6cb062');
  }

  // A-frame specials sign
  r(7 * T + 3, 11 * T + 2, 1, 12, '#5a3420');
  r(7 * T + 12, 11 * T + 2, 1, 12, '#5a3420');
  r(7 * T + 2, 11 * T + 1, 12, 10, '#5a3420');
  r(7 * T + 3, 11 * T + 2, 10, 8, '#2f3a33');
  r(7 * T + 5, 11 * T + 4, 6, 1, '#f3efe6');
  r(7 * T + 4, 11 * T + 6, 8, 1, '#d8d4c8');
  r(7 * T + 5, 11 * T + 8, 5, 1, '#e7c77a');

  // coat rack
  r(16 * T + 7, 10 * T + 6, 2, T + 8, '#5a3420');
  r(16 * T + 4, 11 * T + 12, 8, 2, '#5a3420');
  r(16 * T + 3, 10 * T + 9, 5, 9, '#c7a27a');
  r(16 * T + 9, 10 * T + 8, 4, 7, '#4a5a7a');
  circ(16 * T + 8, 10 * T + 6, 3, '#2f2f2f');

  // shoe bench
  r(17 * T + 1, 11 * T + 3, 14, 6, '#8b5a3c');
  r(17 * T + 1, 11 * T + 3, 14, 1, '#a0693f');
  r(17 * T + 2, 11 * T + 9, 1, 3, '#5a3420');
  r(17 * T + 13, 11 * T + 9, 1, 3, '#5a3420');
  r(17 * T + 3, 11 * T + 11, 4, 3, '#e8e2d6');
  r(17 * T + 8, 11 * T + 11, 4, 3, '#2f2f2f');

  return c;
}

// ---- Jukebox: a tiny generative lo-fi loop via Web Audio ----------------

export function createLofi() {
  let ac: AudioContext | null = null;
  let master: GainNode | null = null;
  let timer = 0;
  let step = 0;
  const chords = [[53, 57, 60, 64], [52, 55, 59, 62], [50, 53, 57, 60], [48, 52, 55, 59]]; // Fmaj7 Em7 Dm7 Cmaj7
  const melody = [72, 74, 76, 79, 81];

  function note(midi: number, t: number, dur: number, vol: number, type: OscillatorType = 'triangle') {
    const osc = ac!.createOscillator();
    const gain = ac!.createGain();
    osc.type = type;
    osc.frequency.value = 440 * 2 ** ((midi - 69) / 12);
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(vol, t + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain).connect(master!);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  function bar() {
    const t = ac!.currentTime + 0.05;
    const chord = chords[step % chords.length];
    chord.forEach((m, i) => note(m, t + i * 0.03, 2.2, 0.035));
    note(chord[0] - 12, t, 1.8, 0.06, 'sine');
    for (let i = 0; i < 4; i++) {
      if (Math.random() < 0.45) {
        note(melody[Math.floor(Math.random() * melody.length)], t + i * 0.6 + (Math.random() < 0.5 ? 0.3 : 0), 0.9, 0.025, 'sine');
      }
    }
    step++;
  }

  return {
    start() {
      if (!ac) {
        ac = new AudioContext();
        const lowpass = ac.createBiquadFilter();
        lowpass.type = 'lowpass';
        lowpass.frequency.value = 1400;
        master = ac.createGain();
        master.gain.value = 0.9;
        master.connect(lowpass).connect(ac.destination);
      }
      void ac.resume();
      bar();
      timer = window.setInterval(bar, 2400);
    },
    stop() {
      window.clearInterval(timer);
      timer = 0;
      void ac?.suspend();
    },
  };
}
