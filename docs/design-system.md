# Helios Office Design System

This project follows `.agents/skills/design-system/SKILL.md`.

## Intent

Helios Office must feel like a structured, accessible dashboard web app for authenticated employees and operators.

## Tokens

- Font family: `InterTight, Roboto, Arial, sans-serif`
- Base font: `14px`, line-height `21px`
- Text: `--color-text-primary`, `--color-text-secondary`, `--color-text-tertiary`
- Surfaces: `--color-surface-muted`, `--color-surface-raised`, `--color-surface-strong`
- Spacing: `--space-1` through `--space-8`
- Radius: `--radius-xs`, `--radius-sm`, `--radius-md`, `--radius-lg`, `--radius-xl`
- Motion: `--motion-duration-instant`

## Component Requirements

- Every interactive component must have default, hover, focus-visible, active, disabled, loading, and error states where applicable.
- Forms must expose labels, help text, and error messages.
- Tables must support overflow and dense scanning.
- Data tables must use one typography contract across every admin/user table:
  - Table section titles above a data table must use 16px via `--table-section-title-font-size`, and subtitles/counts under that title must use 12px via `--table-section-subtitle-font-size`.
  - Column headers must use 12px via `--table-header-font-size`, `--table-header-line-height`, `--font-weight-strong`, uppercase only when the table family already uses uppercase headers, and `letter-spacing: 0`.
  - Body cell text must use 14px via `--table-cell-font-size` and `--table-cell-line-height`.
  - Primary row titles, including `th strong` and `td strong`, must use 14px via `--table-title-font-size`, `--table-title-line-height`, and `--font-weight-strong`.
  - Secondary row metadata, helper text, and `small` text must use 12px via `--table-meta-font-size`, `--table-meta-line-height`, and `--color-text-secondary`.
  - Badges, chips, and status pills inside tables must use the shared badge typography token; avatars, code tags, and action buttons may use their own component typography but must not change surrounding table title/cell typography.
  - A page must not create local table font-size values unless it introduces a new table variant documented here first.
- Panel, card, and list content must use the same primary/secondary hierarchy:
  - Grouped setting headers must follow the same section header hierarchy as table sections: title 16px and subtitle/count 12px.
  - Primary content text such as item titles, row titles, and panel/list item names must use 14px via `--content-primary-font-size`.
  - Secondary content text such as descriptions, helper text, captions, counts, compact chips, and status badges inside cards/lists must use 12px via `--content-secondary-font-size`.
  - Page-level headings, metric numbers, and navigation labels may use their documented component typography, but must not be used for ordinary item text.
- Badges, chips, status pills, tag pills, and compact count indicators must use the shared `Badge` component from `components/ui/badge.tsx`, one 10px typography token via `--badge-font-size` and `--badge-line-height`, and semantic tones (`neutral`, `info`, `success`, `warning`, `danger`, `accent`); brand badges such as app-store style artwork may keep their own typography.
- Cards must use small radii and should only frame repeated items, widgets, and tools.
- Mobile must collapse to a single-column workflow with bottom navigation.

## QA Checklist

- Keyboard can reach every action.
- Focus is visible without relying on color alone.
- Text does not overflow controls at mobile width.
- No component uses raw hex values outside token definitions.
- Empty, loading, and error states are present for data-backed views.
