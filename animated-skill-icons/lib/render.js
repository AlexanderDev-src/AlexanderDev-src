// Core renderer: turns a list of icon names into one animated SVG.
// Pure functions, no dependencies – shared by the Vercel API, the local server and the CLI.
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const DATA = require('./icons.json');

export const ANIMATIONS = ['pop', 'wave', 'float', 'bounce', 'flip', 'pulse', 'wiggle', 'shine'];
export const DEFAULT_ANIM = ['pop', 'wave', 'shine'];
export const THEMES = ['dark', 'light'];
export const LIMITS = { perline: [1, 50], size: [16, 128], speed: [0.25, 4], maxIcons: 250 };

const TILE = 256;
const CELL = 300; // 256 tile + 44 gap, same grid as skillicons.dev
const TILE_BG = { dark: '#242938', light: '#F4F2ED' };

// ---------------------------------------------------------------- names
export function resolveName(raw) {
  let n = String(raw ?? '').trim().toLowerCase();
  if (!n) return null;
  let forceSimple = false;
  if (n.startsWith('si-') || n.startsWith('si:')) { forceSimple = true; n = n.slice(3); }

  if (!forceSimple) {
    if (DATA.skill[n]) return { id: n, src: 'k' };
    const short = DATA.skillShort[n];
    if (short && DATA.skill[short]) return { id: short, src: 'k' };
  }
  const alias = DATA.aliases[n];
  if (alias) {
    if (!forceSimple && DATA.skill[alias]) return { id: alias, src: 'k' };
    if (DATA.simple[alias]) return { id: alias, src: 's' };
  }
  if (DATA.simple[n]) return { id: n, src: 's' };

  const loose = n.replace(/[^a-z0-9]/g, '');
  if (loose && loose !== n) return resolveName((forceSimple ? 'si-' : '') + loose);
  return null;
}

export function titleOf(ref) {
  return ref.src === 's' ? DATA.simple[ref.id].t : ref.id;
}

// ---------------------------------------------------------------- colour helpers
function channel(v) { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }
function lum(hex) {
  const h = hex.replace('#', '');
  return 0.2126 * channel(parseInt(h.slice(0, 2), 16)) + 0.7152 * channel(parseInt(h.slice(2, 4), 16)) + 0.0722 * channel(parseInt(h.slice(4, 6), 16));
}
function contrast(a, b) { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); }
function mix(a, b, t) {
  const pa = a.replace('#', ''), pb = b.replace('#', '');
  let out = '#';
  for (let i = 0; i < 6; i += 2) {
    const v = Math.round(parseInt(pa.slice(i, i + 2), 16) * (1 - t) + parseInt(pb.slice(i, i + 2), 16) * t);
    out += v.toString(16).padStart(2, '0');
  }
  return out;
}
// keep the brand colour, but nudge it lighter/darker until it reads on the tile
function readable(hex, theme) {
  const bg = TILE_BG[theme];
  const target = theme === 'dark' ? '#ffffff' : '#000000';
  let c = hex;
  for (let t = 0.1; contrast(c, bg) < 3 && t <= 1.0001; t += 0.1) c = mix(hex, target, t);
  return c;
}

// ---------------------------------------------------------------- tiles
function tileMarkup(ref, theme) {
  if (ref.src === 'k') {
    const e = DATA.skill[ref.id];
    return e.b ?? (theme === 'light' ? e.l : e.d);
  }
  const e = DATA.simple[ref.id];
  const logo = 150, off = (TILE - logo) / 2, k = logo / 24;
  return `<rect width="256" height="256" rx="60" fill="${TILE_BG[theme]}"/>` +
    `<path transform="translate(${off} ${off}) scale(${k})" fill="${readable('#' + e.h, theme)}" d="${e.p}"/>`;
}

// every icon brings its own ids (clip0_33_628 …) – prefix them so icons can't steal each other's gradients
function scopeIds(svg, prefix) {
  const ids = new Set();
  svg.replace(/\bid="([^"]+)"/g, (_, id) => ids.add(id));
  if (!ids.size) return svg;
  return svg
    .replace(/\bid="([^"]+)"/g, (_, id) => `id="${prefix}${id}"`)
    .replace(/url\((['"]?)#([^)'"]+)\1\)/g, (m, q, id) => (ids.has(id) ? `url(#${prefix}${id})` : m))
    .replace(/((?:xlink:)?href)="#([^"]+)"/g, (m, attr, id) => (ids.has(id) ? `${attr}="#${prefix}${id}"` : m));
}

// ---------------------------------------------------------------- animation
// all transforms happen in a tile-local space centred on the tile, so scale/rotate pivot on the middle
const KEYFRAMES = {
  pop: '@keyframes pop{0%{transform:scale(0);opacity:0}55%{transform:scale(1.14);opacity:1}75%{transform:scale(.94)}90%{transform:scale(1.03)}100%{transform:scale(1);opacity:1}}',
  wave: '@keyframes wave{0%,100%{transform:translateY(0)}50%{transform:translateY(-22px)}}',
  float: '@keyframes float{0%,100%{transform:translate(0,0) rotate(0deg)}30%{transform:translate(5px,-14px) rotate(-3deg)}65%{transform:translate(-5px,-6px) rotate(2.5deg)}}',
  bounce: '@keyframes bounce{0%,48%,100%{transform:translateY(0) scale(1,1)}6%{transform:translateY(18px) scale(1.12,.86)}18%{transform:translateY(-52px) scale(.92,1.08)}30%{transform:translateY(13px) scale(1.1,.9)}38%{transform:translateY(-8px) scale(.98,1.02)}44%{transform:translateY(0) scale(1,1)}}',
  flip: '@keyframes flip{0%,70%,100%{transform:scaleX(1)}77%{transform:scaleX(.04)}84%{transform:scaleX(1)}}',
  pulse: '@keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.08)}}',
  wiggle: '@keyframes wiggle{0%,80%,100%{transform:rotate(0deg)}83%{transform:rotate(-11deg)}86%{transform:rotate(9deg)}89%{transform:rotate(-6deg)}92%{transform:rotate(4deg)}95%{transform:rotate(-2deg)}}',
  shine: '@keyframes shine{0%{transform:translateX(-340px)}35%,100%{transform:translateX(340px)}}',
};
// outer -> inner nesting order (shine is drawn on top of the tile, inside every layer)
const LAYER_ORDER = ['pop', 'wave', 'float', 'bounce', 'wiggle', 'pulse', 'flip'];
// how far each effect can reach outside the tile (top, side, bottom) in tile units
const REACH = {
  pop: [18, 18, 18], wave: [22, 0, 0], float: [21, 12, 7], bounce: [62, 15, 0],
  flip: [0, 0, 0], pulse: [10, 10, 10], wiggle: [22, 22, 22], shine: [0, 0, 0],
};

// tiny deterministic PRNG so "random" float/wiggle timings are stable per icon position
function rand(i, salt) {
  let x = Math.sin((i + 1) * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
}
const s = v => `${+v.toFixed(3)}s`;

function timing(anim, i, col, row, speed) {
  const k = 1 / speed;
  switch (anim) {
    case 'pop': return { dur: 0.55 * k, delay: (0.05 + i * 0.06) * k, once: true };
    case 'wave': return { dur: 2.6 * k, delay: -(col * 0.16 + row * 0.09) * k };
    case 'float': { const d = (3 + rand(i, 1) * 1.8) * k; return { dur: d, delay: -rand(i, 2) * d }; }
    case 'bounce': return { dur: 2.6 * k, delay: (0.3 + i * 0.12) * k };
    case 'flip': return { dur: 4 * k, delay: (i * 0.12) * k };
    case 'pulse': return { dur: 2.2 * k, delay: -(i * 0.15) * k };
    case 'wiggle': { const d = (3.2 + rand(i, 3) * 2.2) * k; return { dur: d, delay: rand(i, 4) * d }; }
    case 'shine': return { dur: 3.4 * k, delay: (0.8 + col * 0.1 + row * 0.06) * k };
  }
}

// ---------------------------------------------------------------- params
function clampNum(v, [lo, hi], dflt) {
  const n = Number(v);
  if (v === undefined || v === null || v === '' || Number.isNaN(n)) return dflt;
  return Math.min(hi, Math.max(lo, n));
}

export function parseOptions(q) {
  const get = (...keys) => { for (const k of keys) { const v = q.get(k); if (v !== null) return v; } return null; };
  const errors = [];

  const iconParam = get('i', 'icons');
  if (!iconParam) errors.push('Add icons with ?i=rust,js,cpp');

  const theme = (get('t', 'theme') || 'dark').toLowerCase();
  if (!THEMES.includes(theme)) errors.push('theme must be "dark" or "light"');

  const perRaw = get('perline', 'p');
  const perline = Math.round(clampNum(perRaw, LIMITS.perline, 15));

  const animRaw = get('anim', 'a', 'animation');
  let anim = DEFAULT_ANIM;
  if (animRaw !== null) {
    const list = animRaw.toLowerCase().split(/[,\s]+/).filter(Boolean);
    if (list.includes('none') || list.length === 0) anim = [];
    else if (list.includes('all')) anim = [...ANIMATIONS];
    else {
      const bad = list.filter(a => !ANIMATIONS.includes(a));
      if (bad.length) errors.push(`unknown animation: ${bad.join(', ')} (use ${ANIMATIONS.join(', ')}, all or none)`);
      anim = ANIMATIONS.filter(a => list.includes(a));
    }
  }
  const speed = clampNum(get('speed', 's'), LIMITS.speed, 1);
  const size = clampNum(get('size'), LIMITS.size, 48);

  let names = [];
  if (iconParam) names = iconParam === 'all' ? Object.keys(DATA.skill).sort() : iconParam.split(',');
  return { names, theme, perline, anim, speed, size, errors };
}

// ---------------------------------------------------------------- render
export function render({ names, theme = 'dark', perline = 15, anim = DEFAULT_ANIM, speed = 1, size = 48 }) {
  const refs = [], unknown = [];
  for (const n of names) {
    if (!String(n).trim()) continue;
    const r = resolveName(n);
    r ? refs.push(r) : unknown.push(String(n).trim());
  }
  const list = refs.slice(0, LIMITS.maxIcons);
  if (!list.length) return { svg: null, unknown, count: 0 };

  const per = Math.max(1, Math.min(perline, list.length));
  const rows = Math.ceil(list.length / per);
  const W = per * CELL - (CELL - TILE);
  const H = rows * CELL - (CELL - TILE);

  const reach = anim.reduce((m, a) => REACH[a].map((v, j) => Math.max(v, m[j])), [0, 0, 0]);
  const [pt, ps, pb] = reach.map(v => (v ? v + 4 : 0));
  const vbX = -ps, vbY = -pt, vbW = W + ps * 2, vbH = H + pt + pb;
  const scale = size / TILE;

  const layers = LAYER_ORDER.filter(a => anim.includes(a));
  const shine = anim.includes('shine');

  const css = [
    '.l{transform-box:view-box;transform-origin:0 0}',
    ...layers.map(a => `.${a}{animation-name:${a};animation-timing-function:${a === 'pop' ? 'cubic-bezier(.2,.7,.3,1)' : a === 'bounce' || a === 'flip' || a === 'wiggle' ? 'linear' : 'ease-in-out'};animation-iteration-count:${a === 'pop' ? 1 : 'infinite'};animation-fill-mode:both}`),
    ...(shine ? ['.shine{animation-name:shine;animation-timing-function:cubic-bezier(.5,0,.3,1);animation-iteration-count:infinite;animation-fill-mode:both}'] : []),
    ...anim.map(a => KEYFRAMES[a]),
    '@media (prefers-reduced-motion:reduce){.l,.shine{animation:none!important}.sh{display:none}}',
  ].join('');

  const tiles = list.map((ref, i) => {
    const col = i % per, row = Math.floor(i / per);
    let body = `<g transform="translate(-128 -128)">${scopeIds(tileMarkup(ref, theme), `i${i}_`)}</g>`;
    if (shine) {
      const t = timing('shine', i, col, row, speed);
      body += `<g class="sh" clip-path="url(#tc)"><g class="shine" style="animation-duration:${s(t.dur)};animation-delay:${s(t.delay)}">` +
        '<rect x="-60" y="-230" width="120" height="460" fill="url(#sg)" transform="rotate(22)"/></g></g>';
    }
    for (const a of [...layers].reverse()) {
      const t = timing(a, i, col, row, speed);
      body = `<g class="l ${a}" style="animation-duration:${s(t.dur)};animation-delay:${s(t.delay)}">${body}</g>`;
    }
    return `<g transform="translate(${col * CELL + 128} ${row * CELL + 128})">${body}</g>`;
  });

  const title = list.map(titleOf).join(', ');
  const defs = shine
    ? '<defs><clipPath id="tc"><rect x="-128" y="-128" width="256" height="256" rx="60"/></clipPath>' +
      '<linearGradient id="sg" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/>' +
      '<stop offset=".5" stop-color="#fff" stop-opacity=".32"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient></defs>'
    : '';

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${+(vbW * scale).toFixed(2)}" height="${+(vbH * scale).toFixed(2)}" ` +
    `viewBox="${vbX} ${vbY} ${vbW} ${vbH}" fill="none" role="img" aria-label="${esc(title)}">` +
    `<title>${esc(title)}</title>` +
    (unknown.length ? `<!-- unknown icons skipped: ${esc(unknown.join(', ')).replace(/--/g, '- -')} -->` : '') +
    (anim.length ? `<style>${css}</style>` : '') +
    defs + tiles.join('') + '</svg>';

  return { svg, unknown, count: list.length };
}

function esc(v) {
  return String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ---------------------------------------------------------------- catalogue (for the picker page / CLI)
export function catalogue() {
  const skill = Object.keys(DATA.skill).sort().map(id => ({ id, src: 'k', themed: !DATA.skill[id].b }));
  const taken = new Set(skill.map(x => x.id));
  const aliasTargets = new Map();
  for (const [a, t] of Object.entries({ ...DATA.skillShort, ...DATA.aliases })) {
    if (!aliasTargets.has(t)) aliasTargets.set(t, []);
    aliasTargets.get(t).push(a);
  }
  // a simple-icons slug keeps its plain name only if that name really resolves to it
  const plain = id => { const r = resolveName(id); return !taken.has(id) && r && r.src === 's' && r.id === id; };
  const simple = Object.entries(DATA.simple)
    .map(([id, e]) => ({ id: plain(id) ? id : `si-${id}`, title: e.t, hex: e.h, src: 's', ...(e.lic ? { lic: e.lic } : {}) }))
    .sort((a, b) => a.title.localeCompare(b.title));
  for (const x of skill) if (aliasTargets.has(x.id)) x.aliases = aliasTargets.get(x.id);
  return { meta: DATA.meta, animations: ANIMATIONS, defaultAnim: DEFAULT_ANIM, icons: [...skill, ...simple] };
}
