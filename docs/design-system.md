# Saamba Design System Specification (v2.0)

> **Branch:** `dev-ag-v2`  
> **Status:** Draft / Active Specification  
> **Target Stack:** Next.js 15, React 19, TypeScript, Tailwind CSS v4, Radix UI Primitives, Lucide Icons.

---

## 1. Design Philosophy & Aesthetic Identity

Saamba is an intimate, calm, and distraction-free audio library for meetings, conversations, and spoken thoughts.  
The aesthetic blends **warm editorial elegance** (analog warmth, classic serif typography, cream/ivory surfaces) with **precision modern ergonomics** (fluid spacing, zero-outline accessible focus states, tactile micro-interactions, responsive sidebars).

### Core Principles
1. **Calm Presence:** No high-saturation neon colors or distracting gradient borders. Content and audio take center stage.
2. **Tactile & Responsive:** Every interaction (clicking waveforms, toggling tabs, expanding drawers) responds with subtle, predictable physics.
3. **Inclusive & Accessible:** Fully keyboard-operable, WCAG 2.1 AA compliant contrast ratios across light and dark modes, explicit ARIA attributes on all interactive states.

---

## 2. Design Tokens (The Foundation)

### 2.1 Color Palette & Semantic Roles

```css
:root {
  /* Brand Primaries */
  --color-brand-forest: #1A382B;          /* Deep Forest Green - Main brand accent */
  --color-brand-forest-hover: #132A20;    /* Darker green for hover states */
  --color-brand-forest-active: #0E1E17;   /* Pressed green */
  --color-brand-forest-tint: #EEF4F1;     /* 5% tint for subtle active backgrounds */
  --color-brand-gold: #DEB569;            /* Warm Ochre / Gold accent */
  --color-brand-gold-muted: #F8F2E4;      /* Soft gold wash for badges & active tabs */

  /* Neutral Surfaces (Warm Editorial) */
  --color-surface-bg: #FBF9F5;            /* App canvas background */
  --color-surface-card: #FFFFFF;          /* Elevated cards and main content sheets */
  --color-surface-muted: #F5F2EB;         /* Subtle secondary panels (sidebar rail, controls) */
  --color-surface-hover: #EFECE4;         /* Hover state for surface items */
  --color-surface-active: #E6E2D8;        /* Active item background */

  /* Borders & Dividers */
  --color-border-subtle: #E8E4DC;         /* Default border for cards and dividers */
  --color-border-strong: #D5D0C6;         /* Emphasized borders, dropdown boundaries */
  --color-border-focus: #1A382B;          /* Accessible focus indicator */

  /* Typography / Text Content */
  --color-text-primary: #1A1A1A;          /* Headings, high-contrast readable text */
  --color-text-body: #3D3D3D;             /* Primary paragraph, transcript, and notes text */
  --color-text-muted: #767676;            /* Secondary timestamps, hints, metadata */
  --color-text-disabled: #A8A8A8;         /* Disabled text */
  --color-text-inverse: #FFFFFF;          /* Text on dark forest backgrounds */

  /* Semantic Feedback */
  --color-status-busy: #1A382B;           /* In-flight processing (generating transcript/summary) */
  --color-status-ready: #235A3D;          /* Ready status */
  --color-status-error: #D32F2F;          /* Alert/Error notification */
  --color-status-error-bg: #FDEDED;       /* Error badge background */
}
```

### 2.2 Typography Scale & Pairing

| Scale Token | Font Size | Line Height | Letter Spacing | Font Family | Usage |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `font-display` | `30px` (1.875rem) | `1.2` | `-0.02em` | Editorial Serif (`Georgia`, `Newsreader`) | Workspace H1, Brand Wordmark |
| `font-title-lg` | `24px` (1.5rem) | `1.25` | `-0.015em` | Editorial Serif | Meeting Detail Title |
| `font-title-md` | `18px` (1.125rem) | `1.3` | `-0.01em` | Geometric Sans (`Inter`, `system-ui`) | Section Headers, Dialog Titles |
| `font-body-lg` | `16px` (1rem) | `1.55` | `0` | Geometric Sans | Meeting Summary Body, Notes Prose |
| `font-body-md` | `14.5px` (0.906rem)| `1.5` | `0` | Geometric Sans | Transcript lines, Chat bubbles |
| `font-label` | `13px` (0.8125rem)| `1.4` | `+0.01em` | Geometric Sans (Medium 500) | Tab Labels, Button Labels, Tags |
| `font-mono-meta`| `12px` (0.75rem) | `1.3` | `+0.02em` | Monospace (`ui-monospace`, `SFMono`) | Audio timestamps `[01:24]`, Shortcut keys |

### 2.3 Spacing, Radii & Shadows

- **Spacing Base Unit:** `4px` grid:
  - `space-1`: `4px`
  - `space-2`: `8px`
  - `space-3`: `12px`
  - `space-4`: `16px`
  - `space-5`: `20px`
  - `space-6`: `24px`
  - `space-8`: `32px`
  - `space-12`: `48px`
- **Border Radii:**
  - `radius-sm`: `4px` (badges, chips, timestamp tags)
  - `radius-md`: `8px` (buttons, inputs, dropdown items)
  - `radius-lg`: `12px` (content cards, dialog windows, audio pane)
  - `radius-full`: `9999px` (pills, floating action buttons, avatars)
- **Elevations (Shadows):**
  - `shadow-sm`: `0 1px 3px rgba(0, 0, 0, 0.05)` (subtle cards)
  - `shadow-md`: `0 4px 12px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.04)` (menus, dropdowns)
  - `shadow-lg`: `0 12px 32px rgba(0, 0, 0, 0.12), 0 2px 6px rgba(0, 0, 0, 0.06)` (modal dialogs, floating panels)

---

## 3. Atomic Component Specifications

### 3.1 Button (`<Button />`)

| Variant | Visual Specs | Default | Hover | Active / Pressed | Disabled |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Primary** | Solid Forest Green (`#1A382B`), White text | Solid `#1A382B` | `#132A20`, slight scale (1.00) | `#0E1E17`, translate-y (0.5px) | Opacity 45%, cursor not-allowed |
| **Secondary** | White background, border `#E8E4DC`, text `#1A1A1A` | Border `#E8E4DC` | Border `#D5D0C6`, bg `#FBF9F5` | Bg `#F5F2EB` | Opacity 50% |
| **Subtle / Ghost** | Transparent bg, text `#4A4A4A` | Transparent | Bg `#F5F2EB`, text `#1A1A1A` | Bg `#EFECE4` | Opacity 40% |
| **Destructive** | Red text `#D32F2F`, transparent or red wash | Transparent / Light red | Bg `#FDEDED`, text `#B71C1C` | Bg `#FFCDD2` | Opacity 45% |

### 3.2 Tabs (`<Tabs />`)
- **Structure:** Horizontal flex container with bottom active indicator or pill background.
- **States:**
  - Default: Color `#767676`, subtle hover underline.
  - Active: Bold `#1A382B`, 2px solid green underline or warm ochre pill highlight.
  - With Spinner: Inline 12px animated SVG spinner for streaming transcription/summary.
  - With Close: Integrated 12px `×` button for dismissable translation tabs.

### 3.3 Dropdown Menu & Side Flyout (`<DropdownMenu />`)
- **Trigger:** Button with chevron icon (`aria-haspopup="true"`, `aria-expanded`).
- **Container:** Radix-style floating popover with backdrop blur, border `#E8E4DC`, shadow-md.
- **Submenu / Flyout:**
  - Nested container opening to the right with 4px gap.
  - Auto-alignment flip when approaching viewport boundary.
  - Dividers for group separation (e.g. `Saved`, `Export`).

### 3.4 Modal Dialog (`<ModalDialog />`)
- **Backdrop:** `rgba(0, 0, 0, 0.4)` with 4px backdrop blur.
- **Card:** Centered max-width `460px`, padding `24px`, radius `12px`, shadow-lg.
- **Behavior:** Focus trapped on open, Escape key closes, clicking outside backdrop closes.

### 3.5 Interactive Audio Waveform (`<WaveformPlayer />`)
- **Structure:** 42 vertical bars reflecting audio amplitude levels.
- **Playback Sync:** Bars left of the playback head receive `.played` state (warm gold / green accent).
- **Seek Interaction:** Hovering over any bar shows timestamp preview; clicking scrubs player directly to timestamp.

---

## 4. Implementation Checklist

- [x] Create centralized design token specification (`docs/design-system.md`).
- [ ] Implement standalone interactive Design System Showcase page (`static/design-system.html`).
- [ ] Mount `/design-system` route in FastAPI backend for live preview.
- [ ] Verify accessibility, contrast ratios, and keyboard navigation.
- [ ] User review & sign-off on design tokens and component styling.
