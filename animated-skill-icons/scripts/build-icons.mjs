// Builds lib/icons.json from the two icon sources.
//
//   1. skill-icons  (MIT)  – the exact tiles skillicons.dev serves      -> vendor/skill-icons/icons/*.svg
//   2. simple-icons (CC0*) – ~3,400 brand logos, drawn here as tiles    -> npm devDependency
//
// Run:  npm run build:icons
// Update sources:  refresh vendor/skill-icons from github.com/tandpfun/skill-icons, `npm i -D simple-icons@latest`
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);

// ---------- 1. skill-icons ----------
const SKILL_DIR = path.join(root, 'vendor/skill-icons/icons');

// same short names skillicons.dev accepts, so existing URLs keep working
const SKILL_SHORT = {
  js: 'javascript', ts: 'typescript', py: 'python', tailwind: 'tailwindcss', vue: 'vuejs', nuxt: 'nuxtjs',
  go: 'golang', cf: 'cloudflare', wasm: 'webassembly', postgres: 'postgresql', k8s: 'kubernetes', next: 'nextjs',
  mongo: 'mongodb', md: 'markdown', ps: 'photoshop', ai: 'illustrator', pr: 'premiere', ae: 'aftereffects',
  scss: 'sass', sc: 'scala', net: 'dotnet', gatsbyjs: 'gatsby', gql: 'graphql', vlang: 'v',
  amazonwebservices: 'aws', bots: 'discordbots', express: 'expressjs', googlecloud: 'gcp', mui: 'materialui',
  windi: 'windicss', unreal: 'unrealengine', nest: 'nestjs', ktorio: 'ktor', pwsh: 'powershell', au: 'audition',
  rollup: 'rollupjs', rxjs: 'reactivex', rxjava: 'reactivex', ghactions: 'githubactions', sklearn: 'scikitlearn',
};

function inner(svg) {
  // keep only what is inside the root <svg>…</svg>, collapse whitespace between tags
  const body = svg.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
  return body.replace(/>\s+</g, '><').trim();
}

const skill = {};
for (const file of fs.readdirSync(SKILL_DIR)) {
  if (!file.endsWith('.svg')) continue;
  const base = file.slice(0, -4).toLowerCase();
  const [name, variant] = base.split('-');
  const svg = fs.readFileSync(path.join(SKILL_DIR, file), 'utf8');
  if (!/viewBox="0 0 256 256"/.test(svg)) throw new Error(`unexpected viewBox in ${file}`);
  skill[name] ??= {};
  if (variant === 'dark' || variant === 'light') skill[name][variant] = inner(svg);
  else skill[name].both = inner(svg);
}
const skillEntries = {};
for (const [name, v] of Object.entries(skill)) {
  skillEntries[name] = v.both ? { s: 'k', b: v.both } : { s: 'k', d: v.dark, l: v.light ?? v.dark };
}

// ---------- 2. simple-icons ----------
const SI_DIR = path.join(root, 'node_modules/simple-icons');
const siPkg = JSON.parse(fs.readFileSync(path.join(SI_DIR, 'package.json'), 'utf8'));
const siData = JSON.parse(fs.readFileSync(path.join(SI_DIR, 'data/simple-icons.json'), 'utf8'));
const siLicence = Object.fromEntries(siData.map(d => [d.slug ?? null, d.license?.type]).filter(([k]) => k));
const si = Object.values(require('simple-icons'));

const simple = {};
for (const icon of si) {
  simple[icon.slug] = { s: 's', t: icon.title, h: icon.hex, p: icon.path, ...(siLicence[icon.slug] ? { lic: siLicence[icon.slug] } : {}) };
}

// friendlier names. Checked after skill-icons names, before simple-icons slugs.
const EXTRA_ALIASES = {
  'c++': 'cpp', cplusplus: 'cpp', 'c#': 'cs', csharp: 'cs', three: 'threejs', threedotjs: 'threejs',
  zed: 'zedindustries', hypr: 'hyprland', archlinux: 'arch', node: 'nodejs', 'node.js': 'nodejs',
  'next.js': 'nextjs', 'vue.js': 'vuejs', 'nuxt.js': 'nuxtjs', 'three.js': 'threejs',
  visualstudiocode: 'vscode', intellij: 'idea', intellijidea: 'idea', ij: 'idea', jb: 'jetbrains',
  gh: 'github', ghactions: 'githubactions', tf: 'tensorflow', torch: 'pytorch', rb: 'ruby', rs: 'rust',
  kt: 'kotlin', sh: 'bash', zshell: 'zsh', nvim: 'neovim', pg: 'postgresql', sql: 'mysql', k8: 'kubernetes',
};

const out = {
  meta: {
    built: new Date().toISOString(),
    skillIcons: { count: Object.keys(skillEntries).length, licence: 'MIT', source: 'https://github.com/tandpfun/skill-icons' },
    simpleIcons: { count: Object.keys(simple).length, version: siPkg.version, licence: 'CC0-1.0 (some logos carry their own licence)', source: 'https://github.com/simple-icons/simple-icons' },
  },
  skill: skillEntries,
  simple,
  skillShort: SKILL_SHORT,
  aliases: EXTRA_ALIASES,
};

fs.writeFileSync(path.join(root, 'lib/icons.json'), JSON.stringify(out));
const kb = (fs.statSync(path.join(root, 'lib/icons.json')).size / 1024).toFixed(0);
console.log(`lib/icons.json  ${kb} KB  skill-icons=${out.meta.skillIcons.count}  simple-icons=${out.meta.simpleIcons.count}`);
