# Cogram brand: design-system notes

These notes come from the public cogram.com site (home, `/rfi-submittal-management`, `/about`, `/blog`) and docs.cogram.com, captured on 2026-10-06. I read the values from the live stylesheets (`/_next/static/css/*.css`), the inline SVG markup and computed styles. I did not guess them from screenshots. The Submittal Review Desk uses these tokens as-is.

> Independent concept by Ayo Ahmed. Not affiliated with Cogram. The Cogram name, logo and visual identity belong to Cogram Inc. They are reproduced here only so this concept reads as an extension of their product line.

## 1. Logo

| Asset | Source | File in this repo |
|---|---|---|
| Wordmark (mark + "cogram") | Inline `<svg viewBox="0 0 3150 620">` in the cogram.com nav, `aria-label="Cogram — home"` | `public/assets/brand/cogram-logo.svg` |
| Square mark | Inline `<svg viewBox="0 0 512 512">` in the Submittals window chrome on `/rfi-submittal-management` | `public/assets/brand/cogram-mark.svg` |
| Favicon / app icon | `https://cogram.com/favicon-32.png`, `/icon-192.png` | `public/assets/brand/` |

- The mark is a 512×512 square, masked by a circle (r = 97.79) and a horizontal bar that runs from the centre to the right edge. That leaves a solid square with a "c"-shaped cut-out.
- The wordmark is lower-case **"cogram"** set in **Poppins 400**, letter-spacing −9.6 (SVG units), `fill="currentColor"`. It is near-black on light pages and white on the dark hero and footer.
- Placement: top-left, 24px tall, inside a bordered header. I copied the markup character-for-character and only renamed the mask IDs. I did not redraw it.

## 2. Colour palette (light theme, which the product pages use)

| Token | Hex | Use |
|---|---|---|
| `--background` | `#f0f2ed` | Page canvas: warm off-white with a faint film-grain texture |
| `--foreground` | `#0a0a0a` | Primary text, logo, footer background |
| `--card` / `--popover` | `#ffffff` | Raised surfaces |
| `--muted` / `--secondary` / `--accent` | `#e8eae5` | Column backgrounds, hover fills, kanban lanes (used at 30–40 % opacity) |
| `--muted-foreground` | `#4a4a4a` | Secondary text, metadata, counts |
| `--border` / `--input` | `#d0d2cd` | Hairline 1px borders everywhere |
| `--primary` / `--ring` / `--chart-1` | `#3d5a80` | Slate blue: primary CTA ("Start for free"), eyebrow labels, focus ring, links |
| `--primary-foreground` | `#ffffff` | Text on primary |
| `--destructive` | `#dc2626` | Errors / rejections |
| `--chart-2` / sync dot | `#22c55e` | "Synced" status dot, success |
| `--chart-3` | `#4a4a4a` | Neutral data series |

Dark theme (hero, footer): background `#0a0a0a`, card `#1a1a1a`, border `#ffffff1a`, primary `#5d7a9a`, muted foreground `#a0a0a0`.

## 3. Typography

| Role | Family (as rendered) | Size / weight / tracking |
|---|---|---|
| Body, UI, headings | `ui-sans-serif, system-ui, sans-serif` (computed style on `body`, `h1`–`h3`; this is SF Pro on macOS and Segoe UI on Windows) | body 16/24 · 400 |
| H1 (product pages) | same | 60/66 · 500 · −1.5px (`text-6xl font-medium tracking-tight`) |
| H2 / H3 | same | 36/40 · 500, 24/32 · 500 |
| Eyebrow labels, IDs, dates, spec numbers | **Space Mono** 400/700 | 12/16 · uppercase · tracking 0.2em (2.4px) · colour `--primary` |
| Wordmark only | **Poppins** 400 | n/a |

- The stylesheet also declares **DM Sans** (`--font-geist-sans`), but the computed body font on the live pages is the system stack. I mirror what actually renders.
- Font files: Space Mono and Poppins are SIL Open Font License families. I self-host their latin subsets from the same files the site serves (`public/assets/fonts/`). DM Sans comes along as a declared fallback.
- Kanban card IDs (`28 31 00-SKY-SUB-0232`) and due dates use the mono family at 12px in muted grey.

## 4. Shape, spacing, elevation

- `--radius: 1px`. Corners are effectively square: buttons are 0px, cards 1px. Nothing is pill-shaped except status dots.
- Base spacing unit `--spacing: .25rem` (4px Tailwind scale). Cards use `p-3` (12px), columns use `p-2` gutters with `space-y-2`, and headers use `px-4 h-[41px]`.
- Borders do the work and shadows are rare: 1px `#d0d2cd` hairlines between columns, headers and cards. Only the product "window" mockup carries `shadow-2xl shadow-black/8`.
- Max content width is 1400px with `px-4 sm:px-6 lg:px-8` gutters.
- The sticky header sits on `background/80` with a backdrop blur and a 1px bottom border.

## 5. Components (observed)

| Component | Spec |
|---|---|
| Primary button | bg `#3d5a80`, white text, 14px/500, padding 8×16 (12×24 large), radius 0 |
| Secondary button | transparent, 1px `#d0d2cd` border, `#0a0a0a` text, 14px/400 |
| Ghost / text link | `#4a4a4a` → `#0a0a0a` on hover, with an optional trailing `→` |
| Eyebrow | 32px × 1px primary rule, mono uppercase label, rule (centred) |
| Window chrome | 41px bar, three 10px grey dots, square mark plus "Submittals", right side: green dot "Synced 2 min ago" plus a bordered "Sync Procore" button |
| Kanban column | flex column, `bg-muted/40`, header row (title 14/500, count 12px tabular muted) on `--background`, 1px right border |
| Kanban card | `--background` fill, 1px border, radius 1px, padding 12px. Project name 12/500, mono ID 12px muted, title 14px (2-line clamp), calendar icon plus "Due Feb 27" 12px muted |
| Modal | centred card, title 18/500, mono-ish subtitle (ID · title), labelled field group in a bordered box, footer with "Cancel" text button and a muted "Send Invitations →" button |
| Chip / status | small 12px text, bordered 1px, square corners; status shown as a 6px dot plus a label |
| Blog / content card | 1px border, mono uppercase date (`JULY 7, 2026`), title 18–20px/400, two-line muted excerpt, "Read more →" |
| Footer | `#0a0a0a` background, `#f0f2ed` text, 96px vertical padding |
| Docs (GitBook) | white canvas, left nav with icons, Inter typeface, slate-blue active link (the docs are on GitBook's theme, not the marketing system) |

Kanban column names on the live product mockup: **Received · With Consultants · In Our Court · Issued**. Those are Cogram's real lanes. This concept adds review outcomes (Approved / Rejected / Revise & Resubmit) as the brief asks, and documents the mapping in `docs/VIABILITY.md`.

Icons are Heroicons-style 24px outline at stroke 1.5 (calendar, refresh, chevron, phone).

## 6. Texture

The light canvas has a fine monochrome film grain over `#f0f2ed`. The concept reproduces it with a tiny inline SVG `feTurbulence` noise at about 4 % opacity.

## 7. Tone of voice (characterised, not copied)

- Short, plain declaratives aimed at practitioners: architects, engineers, consultants and contractors.
- Leads with the pain ("spreadsheets and email threads") and then the outcome. Low on adjectives.
- Trust and control come up repeatedly: no training on customer data, SOC 2, data stays accessible if an integration drops.
- Labels are nouns, not slogans: "Triage at a glance", "Procore sync". Product UI copy is terse: "Synced 2 min ago", "Due Feb 27", "Send Invitations".
- The concept follows this register. All its copy is original.
