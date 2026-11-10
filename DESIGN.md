---
version: alpha
name: One Shamiri Digital Hub
description: >-
  The Shamiri Digital Hub's visual system, taken from the One Shamiri brand file: a navy parent
  brand with lime, lavender and magenta accents, set in Urbanist. app/globals.css holds the same
  values as Tailwind theme tokens; keep the two in step.
colors:
  navy: "#132964"
  navy-80: "#41477d"
  navy-60: "#666996"
  navy-40: "#8b8caf"
  navy-20: "#b1b1c9"
  navy-5: "#d8d7e4"
  lavender: "#9a8ee6"
  lavender-80: "#aca0eb"
  lavender-60: "#bdb2ef"
  lavender-40: "#cec5f3"
  lavender-20: "#dfd8f7"
  lavender-5: "#efebfb"
  lime: "#b8e91a"
  lime-80: "#c7ed53"
  lime-60: "#d5f179"
  lime-40: "#e1f49b"
  lime-20: "#edf8bd"
  lime-5: "#f6fbde"
  magenta: "#d91892"
  magenta-80: "#e354a3"
  magenta-60: "#ec7ab5"
  magenta-40: "#f39dc7"
  magenta-20: "#f9beda"
  magenta-5: "#fddfec"
  white: "#ffffff"
  black: "#000000"
  canvas: "#f7f6fc"
  background: "#ffffff"
  foreground: "#1a1f3f"
  muted: "#f1f0f7"
  muted-foreground: "#666996"
  border: "#e4e3ee"
  input: "#b1b1c9"
  ring: "#6e5fd3"
  primary: "{colors.navy}"
  primary-foreground: "#ffffff"
  secondary: "{colors.lavender-5}"
  secondary-foreground: "{colors.navy}"
  accent: "{colors.lavender-5}"
  accent-foreground: "{colors.navy}"
  info: "{colors.navy}"
  info-bg: "{colors.lavender-5}"
  info-border: "{colors.lavender-20}"
  success: "#1e7b34"
  success-bg: "#e8f5ea"
  success-border: "#bfe3c5"
  warning: "#a35700"
  warning-bg: "#fff3e2"
  warning-border: "#ffd6a3"
  destructive: "#c81e1e"
  destructive-foreground: "#ffffff"
  destructive-bg: "#fdecec"
  destructive-border: "#f7c6c6"
  rating: "#f98600"
  chart-1: "#5b4fc4"
  chart-2: "#00a3a3"
  chart-3: "#c96f00"
  chart-4: "#d91892"
  chart-5: "#6f9400"
  chart-6: "#3d6fd9"
typography:
  page-title:
    fontFamily: Urbanist
    fontSize: 36px
    fontWeight: 700
    lineHeight: 1.25
  section-title:
    fontFamily: Urbanist
    fontSize: 18px
    fontWeight: 700
    lineHeight: 1.33
  body:
    fontFamily: Urbanist
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.5
  body-sm:
    fontFamily: Urbanist
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.43
  label:
    fontFamily: Urbanist
    fontSize: 12px
    fontWeight: 600
    lineHeight: 1.33
    letterSpacing: 0.05em
rounded:
  sm: 4px
  md: 6px
  lg: 8px
  xl: 12px
  full: 9999px
spacing:
  unit: 4px
  gutter: 24px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.md}"
  button-outline:
    backgroundColor: "{colors.white}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.md}"
  card:
    backgroundColor: "{colors.white}"
    rounded: "{rounded.xl}"
  app-header:
    backgroundColor: "{colors.navy}"
    textColor: "{colors.white}"
---

# One Shamiri Digital Hub

## Overview

The Digital Hub is where Shamiri's coordinators, supervisors, fellows and clinicians do daily
operational work: schedules, attendance, cases, reports. It is a dense, data-first tool used for
hours at a time, often on mid-range laptops and phones in Kenya. The brand shows in the frame
(the navy header, the logo, the lime marker on the current tab, navy headings) and stays out of
the way of the data.

The values come from the One Shamiri brand file in Figma ("One Shamiri Color Schemes",
"One Shamiri_Parent Brand" tints and the logo on "Website Assets").

## Colors

The brand's colour hierarchy is primary 60%, secondary 30%, accent 10%.

- **Navy** (`primary`) is the brand's voice: the app header, page and dialog headings, primary
  buttons, links, the selected state of controls. White text on navy is 13.7:1.
- **Lavender** is the supporting colour: soft fills for selected and informational states
  (`secondary`, `accent`, `info-bg`), avatar fallbacks. Its 100% tint is too light for text on
  white (2.8:1); use navy text on lavender fills.
- **Lime** is the accent and is used sparingly: the slash in the logo, the marker under the
  current tab, the "Digital Hub" label on navy. Lime never carries text on white (1.4:1); text on
  a lime fill is navy (9.6:1).
- **Magenta** is a second accent, used in charts.
- Text is `foreground` (#1a1f3f, 16:1 on white). Secondary text is `muted-foreground`, the brand's
  navy 60% tint (5.2:1 on white, 4.6:1 on `muted`).
- Status tones each have a text colour, a soft fill and an outline (`success`, `success-bg`,
  `success-border`, and likewise `warning`, `destructive`, `info`). Each text colour passes 4.5:1
  on its own fill. Status colours are for state only, never for a chart series.
- Charts take `chart-1` to `chart-6` in that order, and fold anything beyond into a neutral
  (`navy-40`) "other". The order passes the dataviz palette checks: every hue sits in the OKLCH
  lightness band, has enough chroma, stays apart from its neighbour for colour-blind readers and
  reaches 3:1 on white. A single-series chart uses `primary`.
- Tailwind's default palette is switched off in `app/globals.css`, so only these colours exist.

## Typography

Urbanist, the brand's typeface, is the only family, loaded through `next/font` (the logo
wordmark is drawn in it). The brand file sets display headings in ITC Avant Garde Gothic, which
is not licensed for the web app; Urbanist Bold takes its place.

- Page titles: 30px on phones, 36px from `lg`, bold, navy.
- Card, dialog and section titles: 18px bold.
- Body and table text: 14–16px regular.
- Labels above values and the "Digital Hub" lockup: 12–14px semibold, uppercase, tracked.
- Headings use `text-wrap: balance`.

The survey print PDFs keep Figtree (`public/fonts/figtree`): their text layout is measured against
that font's metrics.

## Layout

A 4px spacing grid. Pages sit in a full-width container with a 24px gutter. The
app header is navy and holds the logo, the role and project switchers, the account menu and the
role's tabs; the tabs scroll sideways on phones. Page content sits on white.

## Elevation & Depth

Surfaces are flat. Cards, tables and panels are defined by a 1px `border` with no shadow. Only
things that float over the page have a shadow: menus and popovers (`shadow-md`, with a border) and
dialogs (`shadow-xl`, no border, over a navy scrim at 40%).

Menus, popovers and selects fade in over 100ms, dialogs over 150ms. They fade without scaling or
sliding, and accordion sections open at once: an item that moves while it is being pressed loses
the click.

## Shapes

Controls are `rounded-md` (6px), cards and dialogs `rounded-xl` (12px), badges `rounded-md`,
avatars and status dots fully round.

## Components

- **Button**: `default` is navy on white text; `outline` is white with the `input` border;
  `secondary` is lavender; `ghost` and `link` are navy text; `destructive` is red. There is one
  primary style: the old blue `brand` variant became `default`.
- **Badge**: `default` (info), `success`, `warning`, `destructive`, `secondary`, `outline`.
- **Alert**: `default`, `info`, `destructive`.
- **Focus**: one 2px `ring` outline with a 2px offset for every focusable element, set in
  `app/globals.css`; inside the navy header it turns lime. Components do not add their own rings.
- **Checkbox**: white with the `input` border; checked is navy. Callers set only the size.
- **Rating stars**: filled stars are `rating` orange, empty ones `navy-5`, always beside the number.

## Do's and Don'ts

- Do use the semantic tokens (`primary`, `muted-foreground`, `destructive-bg`) in components; reach
  for a brand tint only for charts or a deliberate brand moment.
- Do pair every status colour with a word or an icon.
- Don't put lime or lavender text on white, or grey text on a coloured fill.
- Don't add a shadow to a bordered card, or a coloured stripe down one side of a card.
- Don't add colours, fonts or radii outside this file; `npm run design:audit` checks them.
