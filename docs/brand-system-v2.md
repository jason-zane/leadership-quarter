# Brand System

This document defines the locked visual system for Leadership Quarter marketing surfaces.

## Color Palette

| Token | Hex / RGBA | Usage |
| --- | --- | --- |
| `--site-bg` | `#F7F4EE` | Primary canvas background |
| `--site-surface` | `#F2EEE6` | Neutral section background |
| `--site-surface-alt` | `#ECE7DD` | Alternate soft blocks |
| `--site-surface-elevated` | `rgba(255,255,255,0.84)` | Elevated cards and panels |
| `--site-surface-soft` | `rgba(255,255,255,0.64)` | Hover and soft overlays |
| `--site-text-primary` | `#1A2A3D` | Primary heading/text |
| `--site-text-body` | `#40556C` | Body text |
| `--site-text-muted` | `#6F8299` | Metadata/labels |
| `--site-accent` | `#4071AA` | Accent blue |
| `--site-accent-strong` | `#2F5F99` | Primary interactive blue |
| `--site-accent-deep` | `#244D7C` | Hover/deeper accent |
| `--site-accent-pop` | `#D9B46D` | Secondary highlight (use sparingly) |
| `--site-accent-glass-tint` | `rgba(64,113,170,0.20)` | Cool glass tint for feature cards |
| `--site-cta-bg` | `#2F5F99` | Primary CTA background |
| `--site-cta-text` | `#FCF8F1` | Primary CTA text |
| `--site-border` | `rgba(29,46,68,0.15)` | Default borders |
| `--site-border-soft` | `rgba(29,46,68,0.10)` | Subtle separators |
| `--site-blueprint-tint` | `rgba(217,180,109,0.20)` | Soft feature emphasis |

## Typography

- Display / Heading font: `Newsreader`
- Body / UI font: `Plus Jakarta Sans`
- Utility micro labels: `Space Grotesk`

### Scale and Rhythm

- Hero display uses `--text-hero` with `--type-leading-display` and negative optical tracking.
- Section headings use `--text-h2` with `--type-leading-heading`.
- Body copy uses `--text-body` and `--type-leading-body`.
- Eyebrow labels are uppercase with restrained spacing (`~0.11em`) only.

## Ambient Background

- Use one continuous page backdrop via `--site-ambient-page-gradient`.
- Sections should float on top of the ambient layer; avoid hard background resets unless contrast requires it.

## Material and Elevation

### Shadows

- `--shadow-soft`: default card depth, low contrast.
- `--shadow-lifted`: reserved for larger feature elements only.

### Glass

- `--site-glass-bg`: translucent surface for cards.
- `--site-glass-bg-strong`: stronger translucent surface for hero/media panels.
- `--site-glass-border`: subtle bright border for glass edges.
- `--site-glass-blur`: baseline blur amount for layered depth.

### Utility Classes

- `.site-glass-card`: standard soft glass card.
- `.site-glass-card-strong`: stronger glass panel.
- `.site-glass-tab-v3`: compact glass tabs/actions.
- `.site-cta-band`: immersive page-end CTA band.
- `.site-heading-display`: display line-height + tracking.
- `.site-heading-section`: section heading line-height + tracking.

## Component Rules

- Feature cards in grids should use equal heights at desktop (`auto-rows-fr` + `h-full`).
- Page-end CTAs should use immersive CTA bands, not dense box panels.
- Avoid stacking `shadow-lifted` on adjacent cards.
- Image cards should default to top-biased composition where portraits or vertical subjects are used.
- Eyebrow labels use body sans with restrained uppercase spacing; avoid decorative micro-font styles.

## External Asset Guidance (PowerPoint / Docs)

- Use `--site-accent-strong` for primary actions and key lines.
- Use `--site-accent-pop` sparingly for emphasis highlights.
- Keep large text on `--site-bg` / `--site-surface` for consistent brand feel.
- Prefer `Newsreader` for slide titles and `Plus Jakarta Sans` for body text in external decks.
