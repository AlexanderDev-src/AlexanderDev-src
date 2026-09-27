#!/usr/bin/env node
// Generate animated icon SVGs without deploying anything.
//
//   node bin/cli.js -i rust,js,cpp --perline 8 --anim pop,wave,shine -o skills.svg
//   node bin/cli.js --search linux
//   node bin/cli.js --list
import fs from 'node:fs';
import { render, parseOptions, catalogue, ANIMATIONS } from '../lib/render.js';

const argv = process.argv.slice(2);
const HELP = `animated-skill-icons – animated tech-stack icons for READMEs

Usage
  node bin/cli.js -i <names> [options] [-o file.svg]
  node bin/cli.js --search <text>      find icon names
  node bin/cli.js --list               print every icon name

Options
  -i, --icons     comma-separated names, e.g. rust,js,cpp  (or "all")
  -t, --theme     dark | light                   (default dark)
  -p, --perline   icons per row, 1-50            (default 15)
  -a, --anim      ${ANIMATIONS.join(', ')}, all, none
                  combine with commas            (default pop,wave,shine)
  -s, --speed     0.25 - 4                       (default 1)
      --size      icon size in px, 16 - 128      (default 48)
  -o, --out       write to a file instead of stdout
`;

const alias = { i: 'icons', t: 'theme', p: 'perline', a: 'anim', s: 'speed', o: 'out', h: 'help' };
const opts = {};
for (let k = 0; k < argv.length; k++) {
  let key = argv[k];
  if (!key.startsWith('-')) continue;
  key = key.replace(/^--?/, '');
  if (key.includes('=')) { const [a, b] = key.split('='); opts[alias[a] ?? a] = b; continue; }
  key = alias[key] ?? key;
  const next = argv[k + 1];
  if (next === undefined || next.startsWith('-')) opts[key] = true;
  else { opts[key] = next; k++; }
}

if (opts.help || argv.length === 0) { process.stdout.write(HELP); process.exit(0); }

if (opts.list || opts.search) {
  const term = typeof opts.search === 'string' ? opts.search.toLowerCase() : '';
  const rows = catalogue().icons.filter(x => !term || x.id.includes(term) || (x.title ?? '').toLowerCase().includes(term));
  for (const x of rows) {
    const extra = [x.title && x.title.toLowerCase() !== x.id ? x.title : '', x.aliases ? `aliases: ${x.aliases.join(', ')}` : '', x.src === 'k' ? 'skill-icons' : 'simple-icons', x.lic ? `logo licence: ${x.lic}` : '']
      .filter(Boolean).join(' · ');
    console.log(`${x.id.padEnd(28)} ${extra}`);
  }
  console.error(`\n${rows.length} icon(s)`);
  process.exit(0);
}

const q = new URLSearchParams();
for (const [k, v] of Object.entries({ i: opts.icons, theme: opts.theme, perline: opts.perline, anim: opts.anim, speed: opts.speed, size: opts.size }))
  if (v !== undefined && v !== true) q.set(k, v);

const parsed = parseOptions(q);
if (parsed.errors.length) { console.error(parsed.errors.join('\n')); process.exit(1); }
const { svg, unknown, count } = render(parsed);
if (unknown.length) console.error(`skipped unknown icon(s): ${unknown.join(', ')}  (try --search)`);
if (!svg) { console.error('no valid icons'); process.exit(1); }

if (opts.out && opts.out !== true) {
  fs.writeFileSync(opts.out, svg);
  console.error(`wrote ${opts.out}  (${count} icons, ${(svg.length / 1024).toFixed(1)} KB)`);
} else process.stdout.write(svg);
