

# Darken Deadline Gradients and Fix Color Consistency

## Problem
The deadline card gradients are too faint (opacity 0.03-0.15) and blend into the white/dark card backgrounds. The `.deadline-warning` class uses a hardcoded `#FF524D` instead of the design system's HSL variables, creating inconsistency.

## Changes

### File: `src/index.css` (lines 200-238)

**Overdue (past due)** -- strongest visual urgency:
- Increase gradient opacity from `0.05/0.15/0.05` to `0.15/0.30/0.15`
- Keep using `--destructive` for the ring

**Urgent (due within 24h)** -- moderate urgency:
- Increase gradient opacity from `0.03/0.1/0.03` to `0.10/0.22/0.10`
- Increase ring opacity from `0.7` to `0.8`

**Warning (due within 48h)** -- mild urgency:
- Replace hardcoded `#FF524D` / `rgb(255 82 77)` with `--primary` (which is `2 100% 65%`, a red that fits the design system)
- Increase gradient opacity from `0.04/0.12/0.04` to `0.08/0.18/0.08`

### File: `src/components/kanban/TaskCard.tsx` (line 88)
- Remove `bg-card` from the base class so the gradient background is not overridden by the solid card color. Instead, apply `bg-card` conditionally only when there is no deadline status.

This ensures the gradient is actually visible rather than being painted over by the opaque card background.

## Technical Details

All three deadline classes will use HSL design system variables exclusively (no hardcoded hex/rgb). The darker gradients will contrast well against the card surface in both light and dark modes. The `bg-card` conditional ensures gradient backgrounds aren't masked.
