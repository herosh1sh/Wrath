# Wrath Design System

## Overview
A powerful, self-hosted note-taking and knowledge base application for those who demand more. Built with a darker, more aggressive aesthetic while maintaining elegance and usability.

## Color Palette (Dark Steel + Blood Red)

Based on a warrior's palette - dark steel neutrals with blood red accents for a bold, commanding presence.

### Light Mode (Primary)
| Token | Hex | Usage |
|-------|-----|-------|
| `--color-primary` | `#6B7280` | Primary actions, active states |
| `--color-primary-hover` | `#4B5563` | Hover states for primary |
| `--color-secondary` | `#78716C` | Secondary actions, muted text |
| `--color-accent` | `#0891B2` | Links, focus rings, highlights |
| `--color-accent-hover` | `#0E7490` | Accent hover states |
| `--color-background` | `#F5F5F0` | Page background (warm off-white) |
| `--color-surface` | `#FFFFFF` | Cards, modals, editor surface |
| `--color-surface-hover` | `#FAFAF8` | Hover on surfaces |
| `--color-foreground` | `#0F172A` | Primary text |
| `--color-foreground-muted` | `#475569` | Secondary text, placeholders |
| `--color-border` | `#EDEEEF` | Borders, dividers |
| `--color-border-strong` | `#E5E5E5` | Stronger borders |
| `--color-muted` | `#F6F6F7` | Muted backgrounds, disabled states |
| `--color-muted-foreground` | `#475569` | Text on muted backgrounds |
| `--color-destructive` | `#DC2626` | Delete, dangerous actions |
| `--color-destructive-hover` | `#B91C1C` | Destructive hover |
| `--color-ring` | `#0891B2` | Focus rings |
| `--color-success` | `#059669` | Success states |
| `--color-warning` | `#D97706` | Warning states |

### Dark Mode
| Token | Hex | Usage |
|-------|-----|-------|
| `--color-primary` | `#9CA3AF` | Primary actions |
| `--color-primary-hover` | `#D1D5DB` | Primary hover |
| `--color-secondary` | `#A8A29E` | Secondary actions |
| `--color-accent` | `#22D3EE` | Links, focus |
| `--color-accent-hover` | `#67E8F9` | Accent hover |
| `--color-background` | `#0F172A` | Page background |
| `--color-surface` | `#1E293B` | Cards, modals |
| `--color-surface-hover` | `#334155` | Surface hover |
| `--color-foreground` | `#F8FAFC` | Primary text |
| `--color-foreground-muted` | `#94A3B8` | Secondary text |
| `--color-border` | `#334155` | Borders |
| `--color-border-strong` | `#475569` | Stronger borders |
| `--color-muted` | `#1E293B` | Muted backgrounds |
| `--color-muted-foreground` | `#94A3B8` | Muted text |
| `--color-destructive` | `#EF4444` | Destructive actions |
| `--color-destructive-hover` | `#F87171` | Destructive hover |
| `--color-ring` | `#22D3EE` | Focus rings |

## Typography

### Font Pairing: "Battle Ready" - Lora + Raleway
- **Headings**: Lora (serif) - sharp serifs, commanding presence, authoritative
- **Body**: Raleway (sans-serif) - geometric precision, clean efficiency

```css
@import url('https://fonts.googleapis.com/css2?family=Lora:wght@400;500;600;700&family=Raleway:wght@300;400;500;600;700&display=swap');

--font-heading: 'Lora', Georgia, serif;
--font-body: 'Raleway', -apple-system, BlinkMacSystemFont, sans-serif;
--font-mono: 'JetBrains Mono', 'Fira Code', monospace;
```

### Type Scale
| Element | Size | Weight | Line Height | Font |
|---------|------|--------|-------------|------|
| H1 | 32px | 600 | 1.2 | Heading |
| H2 | 24px | 600 | 1.3 | Heading |
| H3 | 20px | 500 | 1.4 | Heading |
| H4 | 18px | 500 | 1.4 | Heading |
| Body Large | 16px | 400 | 1.6 | Body |
| Body | 15px | 400 | 1.6 | Body |
| Body Small | 13px | 400 | 1.5 | Body |
| Caption | 12px | 400 | 1.4 | Body |
| Code | 13px | 400 | 1.5 | Mono |
| Button | 14px | 500 | 1.0 | Body |

## Spacing Scale (8px base)

| Token | Value | Usage |
|-------|-------|-------|
| `--space-1` | 4px | Micro spacing |
| `--space-2` | 8px | Base unit |
| `--space-3` | 12px | Small gaps |
| `--space-4` | 16px | Standard gaps |
| `--space-5` | 20px | Medium gaps |
| `--space-6` | 24px | Large gaps |
| `--space-8` | 32px | Section spacing |
| `--space-10` | 40px | Major sections |
| `--space-12` | 48px | Page padding |
| `--space-16` | 64px | Hero spacing |

## Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `--radius-sm` | 4px | Buttons, inputs |
| `--radius-md` | 8px | Cards, modals |
| `--radius-lg` | 12px | Large cards |
| `--radius-xl` | 16px | Modals, sheets |
| `--radius-full` | 9999px | Pills, badges |

## Shadows (Subtle, Layered)

| Token | Value | Usage |
|-------|-------|-------|
| `--shadow-xs` | `0 1px 2px rgba(15, 23, 42, 0.03)` | Subtle hover |
| `--shadow-sm` | `0 1px 3px rgba(15, 23, 42, 0.05), 0 1px 2px rgba(15, 23, 42, 0.03)` | Cards |
| `--shadow-md` | `0 4px 6px rgba(15, 23, 42, 0.04), 0 2px 4px rgba(15, 23, 42, 0.03)` | Elevated cards |
| `--shadow-lg` | `0 10px 15px rgba(15, 23, 42, 0.05), 0 4px 6px rgba(15, 23, 42, 0.03)` | Modals, dropdowns |
| `--shadow-xl` | `0 20px 25px rgba(15, 23, 42, 0.06), 0 10px 10px rgba(15, 23, 42, 0.03)` | Sheets, drawers |

## Transitions

| Token | Value | Usage |
|-------|-------|-------|
| `--transition-fast` | `150ms ease` | Hover, focus |
| `--transition-base` | `200ms ease` | Standard transitions |
| `--transition-slow` | `300ms ease` | Modals, drawers |

## Breakpoints

| Token | Value |
|-------|-------|
| `--bp-sm` | 640px |
| `--bp-md` | 768px |
| `--bp-lg` | 1024px |
| `--bp-xl` | 1280px |
| `--bp-2xl` | 1536px |

## Component Patterns

### Sidebar Navigation
- Collapsible (icon-only / full)
- Responsive: overlay on mobile, fixed on desktop
- Keyboard navigable (Arrow keys, Escape to close)
- Active state with accent color left border

### Editor (Block-based)
- Slash commands (`/`) for block types
- Markdown shortcuts (`# `, `## `, `- `, `> `, etc.)
- Drag-and-drop reordering
- Inline formatting toolbar on selection
- Auto-save with debounce (1s)

### Block Types
- Text (paragraph)
- Headings (H1-H3)
- Bullet list, Numbered list, Todo list
- Quote, Callout, Code block
- Divider, Image, Embed
- Table, Database view

### Page Hierarchy
- Nested pages in sidebar
- Breadcrumb navigation
- Page properties (tags, dates, status)

### Search
- Global search (Cmd/Ctrl + K)
- Fuzzy matching
- Recent pages, suggestions

## Accessibility Requirements
- Contrast ratio ≥ 4.5:1 (text), ≥ 3:1 (UI elements)
- Focus visible on all interactive elements
- Keyboard navigation for all features
- ARIA labels on icon-only buttons
- Reduced motion support
- Screen reader announcements for dynamic content

## Icon System
- Lucide React icons (consistent, clean)
- 20px default, 16px small, 24px large
- Stroke width: 2px
- No emoji as icons

## Animation Guidelines
- Subtle micro-interactions (150-250ms)
- Staggered entrance for lists (50ms delay)
- No animation on width/height (use transform)
- Respect `prefers-reduced-motion`