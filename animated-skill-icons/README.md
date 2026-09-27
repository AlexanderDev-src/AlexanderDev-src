# Animated Skill Icons

Animated tech-stack icons for your GitHub README. Works like [skillicons.dev](https://skillicons.dev), with the same `?i=rust,js,cpp` links, but the icons move.

- **3,702 icons.** All 239 original skillicons tiles, plus 3,463 brand logos from Simple Icons drawn in the same tile style.
- **8 animations**, and you can combine them: `pop`, `wave`, `float`, `bounce`, `flip`, `pulse`, `wiggle`, `shine`.
- **Picker page.** Search, click icons, reorder, preview on GitHub dark/light, then copy the snippet.
- **No dependencies at runtime.** Runs on Vercel for free, on any Node server, or as a CLI that writes SVG files into your repo.

```md
![My stack](https://YOUR-DEPLOYMENT.vercel.app/icons?i=rust,js,cpp,react,arch&perline=8)
```

## Parameters

| param | values | default |
|---|---|---|
| `i` / `icons` | comma-separated names (`rust,js,cpp`), or `all` for every original tile | required |
| `theme` / `t` | `dark`, `light` | `dark` |
| `perline` | 1–50 | 15 |
| `anim` | any mix of `pop,wave,float,bounce,flip,pulse,wiggle,shine`, or `all` / `none` | `pop,wave,shine` |
| `speed` | 0.25–4 (2 = twice as fast) | 1 |
| `size` | icon size in px, 16–128 | 48 |

Names:

- Every skillicons.dev name and short name works: `js`, `ts`, `py`, `postgres`, `tailwind`, `md`, and so on.
- Simple Icons slugs work too, for example `hyprland`, `zed`, `obsidian` and `gsap`.
- Put `si-` in front of a name to force the brand-logo version, e.g. `si-rust`.
- Friendly aliases also work: `cplusplus`, `csharp`, `node`, `nvim`, `threejs`.
- Use `cpp` rather than `c++`, and `cs` rather than `c#`. In a URL, `+` turns into a space and `#` cuts the link off.

Unknown names are skipped. They are listed in the `X-Unknown-Icons` response header and in a comment inside the SVG.

## Deploy (free, about 2 minutes)

1. Push this folder to a GitHub repo.
2. On [vercel.com](https://vercel.com), choose **Add New → Project**, import the repo, and click **Deploy**. Nothing needs configuring: the framework is "Other" and no build command is needed.
3. Open `https://<your-project>.vercel.app/` to use the picker. Image links look like `https://<your-project>.vercel.app/icons?i=...`.

Any Node 18+ host works as well (a VPS, a home server, Docker): `node server.js`, then open `PORT` (default 3000).

## Run locally

```sh
npm run dev              # http://localhost:3000  – picker + /icons + /list
```

## CLI: no server at all

Write the SVG straight into your profile repo and link it with a relative path:

```sh
node bin/cli.js -i rust,java,cpp,c,python,ts,js,react -p 8 -o assets/languages.svg
node bin/cli.js -i arch,neovim,git --anim bounce,shine --speed 1.5 -o assets/tools.svg
node bin/cli.js --search linux          # find names
node bin/cli.js --list                  # every name
```

```html
<img src="./assets/languages.svg" alt="Languages" />
```

## How it works

- `lib/icons.json` holds every tile. It is built by `npm run build:icons` from `vendor/skill-icons` and the `simple-icons` package.
- `lib/render.js` lays tiles on the same 300-unit grid as skillicons.dev. It prefixes every `id` inside each tile so gradients from different icons can't clash. Animations are nested CSS layers, so several can run on the same tile.
- Only CSS animations are used, and there's no JavaScript inside the SVG. That's why they keep playing when GitHub shows the SVG as an `<img>`. Viewers who have "reduce motion" turned on get static icons.
- Simple Icons logos are drawn on the skillicons tile colours. If a brand colour is too dark or too light to read on the tile, it is lightened or darkened a little.

To update icons, refresh `vendor/skill-icons/icons` from [tandpfun/skill-icons](https://github.com/tandpfun/skill-icons), run `npm i -D simple-icons@latest`, then run `npm run build:icons`.

## Credits and licences

- Code in this repo: MIT (see `LICENSE`).
- Original tiles: [skill-icons](https://github.com/tandpfun/skill-icons) by tandpfun, MIT.
- Brand logos: [Simple Icons](https://simpleicons.org), CC0-1.0. Some logos carry their own licence, which is shown in the picker and in `--list`.
- All logos are trademarks of their owners. Use them to say which tools you work with, not to suggest endorsement. See `THIRD_PARTY_NOTICES.md`.
