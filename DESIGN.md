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
- **Display/Hero:** Fraunces (variable) — optical-size serif, editorial quality. Rare in dev tools — most use grotesque stacks. The variable `opsz` axis means headings feel designed, not defaulted. Stronger personality than Instrument Serif at large sizes; the "heavy serif against monospace code" contrast is more pronounced.
- **Body:** Outfit — geometric grotesque with warm apertures. Better x-height than Instrument Sans for long-form reading. Clean and friendly without being bland.
- **UI/Labels:** Outfit (same as body), weight 500-600 for emphasis
- **Data/Tables:** Outfit with `font-variant-numeric: tabular-nums`
- **Code/URLs:** Geist Mono — Vercel's monospace. Clean, modern, perfect for `.md` URLs. Native to the Next.js stack. (unchanged)
- **Loading:** Google Fonts — `Outfit:wght@400;500;600;700` + `Fraunces:ital,opsz,wght@0,9..144,300..900;1,9..144,300..900`. Geist Mono via `@vercel/font` or self-hosted.
- **Body line-height:** 1.7 — explicitly set on body/article content for comfortable reading of long-form posts.
- **Scale:**
  - `xs`: 11px / 0.6875rem — mono labels, timestamps
  - `sm`: 13px / 0.8125rem — secondary text, tags, metadata
  - `base`: 16px / 1rem — body text (raised from 15px for WCAG readability)
  - `lg`: 18px / 1.125rem — subheadings, profile names
  - `xl`: 24px / 1.5rem — section headers
  - `2xl`: 32px / 2rem — page titles
  - `3xl`: 42px / 2.625rem — landing hero (Fraunces)
  - `4xl`: 48px / 3rem — marketing hero (Fraunces)

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
  - Muted: `#76766E` (darkened from `#999990` — old value failed WCAG AA at 2.5:1 contrast; new value achieves 4.5:1)
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

### The `/llm.txt` LandingHero Badge

The hero badge row shows two badges side-by-side — human and agent entry points paired:

```
"Your profile lives at"  [/profile/your-name.md]  · "AI agents start at"  [/llm.txt]
```

- Both badges: `.md-url` class — Geist Mono 11px, `#0D9373`, bg `#E6F5F0`, padding 3px 8px, border-radius 4px
- Container: `display: flex; flex-wrap: wrap; gap: var(--space-sm)`
- Separator label: `font-size: 13px; color: var(--color-muted)` — `"· AI agents start at"`
- Both badges visible on desktop and mobile — `flex-wrap` handles small screens naturally
- The pairing is intentional: it signals that linked.md speaks both protocols (HTTP for humans, HTTP+`text/plain` for agents)

### AI-Facing Copy Voice (`?format=llm`, `/llm.txt`)

Text/plain API responses for AI agents follow a specific voice and format:

- **Tone:** Direct and scannable — no markdown headers, no prose preamble
- **Count line:** `Found N professionals matching "rails":` (no "We found" or "Results:")
- **Separator:** `---` between results
- **Field labels:** `Name:` / `Slug:` / `Title:` / `Bio:` / `Profile:` — sentence case, colon-delimited
- **Null fields:** Omitted entirely — never emit `Title: null` or `Bio: null`
- **Zero results:** Normal output format — `Found 0 professionals matching "rails":` (not an error)
- **Errors:** Plain text, action-oriented:
  - 400: `"Query required. Use ?q=rails to search professionals."`
  - 500: `"Error: {message}"`
- **No JSON in error paths:** An agent consuming `text/plain` cannot detect a JSON error response

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
| 2026-03-21 | Agent Gateway /llm.txt homepage badge | Two-badge LandingHero row pairs human (/profile/your-name.md) and agent (/llm.txt) entry points using same .md-url class — signals the network speaks both protocols |
| 2026-03-21 | AI-facing copy voice | text/plain responses are terse, colon-delimited, null-fields-omitted, errors action-oriented — format designed for LLM context windows, not human reading |
| 2026-03-21 | Dark mode shipped in v0.1.2.0 | Original decision deferred dark mode to M2; shipped alongside mobile responsive (M9) via CSS custom properties `[data-theme="dark"]` with localStorage persistence and flash-prevention inline script |
| 2026-03-20 | .md URL as design feature | The visible file path below each post is the brand differentiator — styled prominently, not as a footnote |
| 2026-03-21 | Home page LinkedIn-style left sidebar | Logged-in users see left profile card with avatar, name/title/location, profile-views + post-impressions counters (7-day), llm.txt badge, .md URL, and Write a post CTA. Removed "Recent posts" heading — the feed speaks for itself. Sidebar hidden on mobile (<768px), inline write button shown instead. |
| 2026-03-23 | Fraunces replaces Instrument Serif | Variable optical-size serif — more personality at large display sizes via `opsz` axis, rarer in dev tools, stronger contrast against Geist Mono accents |
| 2026-03-23 | Outfit replaces Instrument Sans | Geometric grotesque with warmer apertures, better x-height for long-form post reading, cleaner distinction from body→heading contrast |
| 2026-03-23 | Body size raised 15px → 16px | Minimum comfortable reading size, WCAG 2.1 recommendation for body text |
| 2026-03-23 | Body line-height explicitly 1.7 | Long-form post content needs more breathing room than default 1.5; improves readability of dense professional writing |
| 2026-03-23 | Muted color `#999990` → `#76766E` | Previous value failed WCAG AA (2.5:1 on `#FAFAF8`); new value passes at 4.5:1. Affects timestamps, metadata labels, secondary UI text throughout the app |
