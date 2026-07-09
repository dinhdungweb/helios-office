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
- Cards must use small radii and should only frame repeated items, widgets, and tools.
- Mobile must collapse to a single-column workflow with bottom navigation.

## QA Checklist

- Keyboard can reach every action.
- Focus is visible without relying on color alone.
- Text does not overflow controls at mobile width.
- No component uses raw hex values outside token definitions.
- Empty, loading, and error states are present for data-backed views.
