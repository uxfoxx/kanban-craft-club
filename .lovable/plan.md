
# Tier-Based Hybrid Costing System — Implementation Status

## ✅ Completed

### Database Migration
- Fixed `recalculate_project_financials` variable collision bug (inner loop `r` → `sub_r`) — **Kanban "move to Done" now works**
- Added `project_category`, `agency_markup_pct`, `equipment_cost`, `miscellaneous_cost`, `discount` to `projects`
- Added `sub_category` to `commission_rate_card`
- Created `project_line_items` table with RLS
- Cleaned up duplicate rate card entries
- Re-seeded rate card with tier-specific roles (Director, DOP, Editor, etc.) grouped by sub_category (films/photography/design/tech)
- Added new deliverables (Reel, Static Post, Retouch Photo, Animation, Video, Corporate/Music Video) with complexity tiers
- Added documentation entries (Moodboard/Script, Pitch Deck)

### Frontend
- Updated `Project` type with new fields, added `ProjectLineItem` type
- Updated `RateCardEntry` with `sub_category` and `documentation` category support
- Added `useRateCardForTier`, `useRateCardDocumentation` helpers
- Created `useProjectLineItems` hook (CRUD for line items)
- Updated `useUpdateProject` to support all new fields
- Created `ProjectCostSheet` component — full cost breakdown UI with roles/deliverables/documentation/additional costs
- Updated `ProjectSettings` — mandatory tier selector, category selector for MAJOR, cost sheet navigation
- Updated `RateCardSettings` — documentation tab, sub_category grouping for roles

## 🔜 Future Enhancements
- Filter role dropdown in TaskDetailSheet by project tier + category
- Filter deliverable dropdown in CreateTaskDialog by project tier
- Show tier badge in FinancialsTab project breakdown
- Internal cost sheet PDF / client-facing quotation generation
