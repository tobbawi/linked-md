# Design System — linked.md

## Product Context
- **What this is:** An open professional network where every profile, post, and company is a markdown file
- **Who it's for:** Developers first, expanding to all professionals
- **Space/industry:** Professional networking, open data, developer tools
- **Project type:** Social web app (feed, profiles, editor, `.md` URL endpoints)

## Aesthetic Direction
- **Direction:** Industrial Refined — function-first clarity with editorial warmth
- **Decoration level:** Intentional — subtle paper-like texture on card backgrounds for warmth
- **Mood:** The seriousness of a terminal with the polish of Linear. Infrastructure you can trust meets publication you want to read. "Polished but honest."
- **Reference sites:** Linear (minimal polish), GitHub (monospace accents), Notion (clean surfacing of page IDs)

## Typography
- **Display/Hero:** Instrument Serif — editorial warmth, professional gravitas. A serif for headings signals "publication platform," not "SaaS app." The contrast with monospace accents IS the brand.
- **Body:** Instrument Sans — clean, modern, pairs with the serif. Excellent readability at all sizes.
- **UI/Labels:** Instrument Sans (same as body), weight 500-600 for emphasis
- **Data/Tables:** Instrument Sans with tabular-nums
- **Code/URLs:** Geist Mono — Vercel's monospace. Clean, modern, perfect for `.md` URLs. Native to the Next.js stack.
- **Loading:** Google Fonts — `Instrument+Sans:wght@400;500;600;700` + `Instrument+Serif:ital,wght@0,400;1,400`. Geist Mono via `@vercel/font` or self-hosted.
- **Scale:**
  - `xs`: 11px / 0.6875rem — mono labels, timestamps
  - `sm`: 13px / 0.8125rem — secondary text, tags, metadata
  - `base`: 15px / 0.9375rem — body text
  - `lg`: 18px / 1.125rem — subheadings, profile names
  - `xl`: 24px / 1.5rem — section headers
  - `2xl`: 32px / 2rem — page titles
  - `3xl`: 42px / 2.625rem — landing hero (Instrument Serif)
  - `4xl`: 48px / 3rem — marketing hero (Instrument Serif)

## Color
- **Approach:** Restrained — one accent + warm neutrals. Color is rare and meaningful.
- **Primary:** `#0D9373` (Emerald) — open, fresh, technical. NOT blue (LinkedIn), NOT purple (GitHub). Green connotes growth and open source. Used for: primary buttons, `.md` URL text, `llm.txt` badges, active states.
- **Primary hover:** `#0B7D62`
- **Primary light:** `#E6F5F0` — wikilink backgrounds, badge backgrounds
- **Ink:** `#1A1A1A` — highest contrast text (headings, names)
- **Neutrals (warm gray, not cool):**
  - Background: `#FAFAF8`
  - Card: `#F0F0EC`
  - Border: `#E0E0D8`
  - Muted: `#999990`
  - Secondary text: `#666660`
  - Text: `#333330`
- **Semantic:**
  - Success: `#0D9373` (same as primary — open/positive actions)
  - Warning: `#D97706` (amber)
  - Error: `#DC2626` (red)
  - Info: `#2563EB` (blue)
- **Dark mode strategy:**
  - Primary shifts to `#10B981` (slightly brighter for dark backgrounds)
  - Surfaces: `#141413` (bg), `#1E1E1C` (card), `#333330` (border)
  - Text: `#E0E0D8` (body), `#F5F5F0` (headings)
  - Semantic colors desaturate 10-20% on dark backgrounds

## Spacing
- **Base unit:** 4px
- **Density:** Comfortable — social content needs breathing room
- **Scale:**
  - `2xs`: 2px
  - `xs`: 4px
  - `sm`: 8px
  - `md`: 16px
  - `lg`: 24px
  - `xl`: 32px
  - `2xl`: 48px
  - `3xl`: 64px

## Layout
- **Approach:** Grid-disciplined — strict columns, predictable alignment
- **Grid:**
  - Desktop (1024+): 3 columns — 200px sidebar | fluid feed | 180px widgets
  - Tablet (768-1023): 2 columns — fluid feed | 180px widgets
  - Mobile (<768): 1 column — feed only, bottom nav bar
- **Max content width:** 960px
- **Border radius:**
  - `sm`: 4px — buttons, inputs, tags, badges
  - `md`: 8px — cards, widgets, post cards
  - `lg`: 12px — modal, shell containers
  - `full`: 9999px — avatars, pills

## Motion
- **Approach:** Minimal-functional — only transitions that aid comprehension
- **Easing:** enter: ease-out, exit: ease-in, move: ease-in-out
- **Duration:** micro: 50-100ms (hover, focus), short: 150-250ms (toggle, expand), medium: 250-400ms (page transition)
- **No:** scroll-driven animations, entrance animations, parallax, or spectacle. Content loads; it's there. The product is about substance.

## Key Design Elements

### The `.md` URL
The `.md` file path visible below each post is the single most distinctive design element. It is styled as:
- Font: Geist Mono, 11px
- Color: `#0D9373` (primary)
- Background: `#E6F5F0` (primary-light)
- Padding: 3px 8px
- Border-radius: 4px
- Desktop: always visible
- Mobile: collapsed to icon, tap to reveal

### The `llm.txt` Badge
Profile cards show an `llm.txt available` badge:
- Font: Geist Mono, 11px
- Color: `#0D9373`
- Background: `#E6F5F0`
- Border: 1px solid `#0D9373`
- Border-radius: 4px

### Wikilinks `[[Name]]`
Resolved wikilinks in post content:
- Color: `#0D9373`
- Background: `#E6F5F0`
- Padding: 0 3px
- Border-radius: 2px
- Font-weight: 500
- Hover: underline

Unresolved wikilinks: rendered as plain `[[Name]]` in muted text with tooltip.

## Decisions Log
| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-03-20 | Initial design system created | Created by /design-consultation based on /office-hours product context and competitive research (Linear, GitHub, Bluesky, LinkedIn) |
| 2026-03-20 | Instrument Serif for display | Serif headings signal "publication platform" not "SaaS app" — distinctive in the dev tool space |
| 2026-03-20 | Emerald green primary | Unclaimed color in professional networking (LinkedIn=blue, GitHub=purple). Connotes growth and open source |
| 2026-03-20 | Warm neutrals | Cool grays feel corporate (LinkedIn). Warm grays add humanity to a technical product |
| 2026-03-20 | No dark mode in v1 | Design focus. Light mode with warm neutrals is the editorial statement. Dark mode planned for M2 |
| 2026-03-20 | .md URL as design feature | The visible file path below each post is the brand differentiator — styled prominently, not as a footnote |
