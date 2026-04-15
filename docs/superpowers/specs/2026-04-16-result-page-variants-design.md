# Result Page Design Variants

## Overview

Three result page designs (A, B, C) for the loan review app. Design A is the current implementation (unchanged). Designs B and C are new alternatives addressing client feedback: too much information, hard to know where to start, need to save time. A design switcher lets users toggle between all three.

## Target Audience

- 35-45yo bank officers and management (Hong Leong Bank)
- Not tech-savvy, reviewing loan applications at their desk
- Want to save time, increase productivity
- Need information presented in a less cluttered, quick-to-read manner

## Constraints

- AI presents **findings only**, never makes lending decisions — officers decide
- Must show all 9 risk categories in the client's fixed framework order:
  1. Management Risk
  2. Collateral Risk / Asset Quality
  3. Market / Industry News / Bursa Announcements
  4. Cashflow / Capacity Risk / Cash Conversion Cycle
  5. Operational / Project Risk
  6. Fraud Risk
  7. Related Party Transaction / Fund Leakage / Dividend Paid
  8. Financial Analysis
  9. Areas for Probe (Others) Risk
- Must be responsive (mobile, tablet, desktop)
- Must include dark mode toggle and chat bubble (Ask AI)
- Progressive disclosure: all data from Design A must be accessible, but organized for faster scanning

## Data Parity (all 3 designs)

Every design exposes the same data via progressive disclosure:

1. Group info (name, CA reference, application type)
2. AI Summary / Briefing (reasoning text, findings only)
3. Risk score + risk band (gauge or badge)
4. FAIL / WARNING / PASS / MISSING stat counts
5. All 9 risk categories with per-category summary, stacked bar, rule count
6. Status filter chips (ALL / FAIL / WARN / MISS / PASS)
7. Per-category drill-down: AI category summary + individual rule items (expandable with explanation + action items)
8. Key Concerns (collapsible list)
9. Key Strengths (collapsible list)
10. Required Conditions (collapsible list)
11. Missing Information (collapsible list)
12. CA Data tab (collapsible sections for financial data, facilities, securities, T&Cs)
13. Chat bubble (Ask AI — floating bottom-right)
14. Dark mode toggle

## Design A — Sidebar + Detail (Current, Unchanged)

Two-column layout: left sidebar (360px) with summary, right panel with filterable category sections.

**Structure:**

- Left sidebar: group info banner → AI summary → risk gauge → stat strip → 9 category breakdown with mini bars → collapsible Key Concerns/Strengths/Conditions/Missing
- Right panel: filter chips → expandable category sections with AI summaries and individual rule items
- Tabs: Risks / CA Data

No changes to this design.

## Design B — Briefing Sheet

**Aesthetic:** Editorial, report-like. Warm paper tones (cream/sand), serif headings (Source Serif 4), structured like a well-typeset executive briefing document.

**Layout:** Single-column, top-to-bottom narrative flow.

**Structure (top to bottom):**

1. Tab bar (Risk Assessment / CA Data)
2. Masthead: group name, CA reference, application type
3. Risk score strip: score number + band + FAIL/WARN/PASS/MISS counts in a row
4. AI Briefing: serif text block with findings
5. Section divider: "Categories Requiring Attention"
6. Flag strip: colored pills for problem categories (numbered, clickable)
7. Section divider: "All 9 Risk Categories"
8. Filter chips (ALL / FAIL / WARN / MISS / PASS + rule count)
9. 9 category rows: number, name, one-line summary, stacked bar, pass ratio badge
   - "Click to expand N rules →" hint below each row
   - Expanded state: AI category summary + individual rule items
10. Key Concerns (collapsible, red dots)
11. Key Strengths (collapsible, green dots)
12. Required Conditions (collapsible, amber dots)
13. Missing Information (collapsible, grey dots)
14. Chat bubble (bottom-right) + dark mode toggle (bottom-right, left of chat)

**Typography:**

- Headings: Source Serif 4 (serif)
- Body: Source Sans 3 (sans-serif)
- Numbers/ratios: monospace

**Color palette (OKLCH):**

- Paper: `oklch(0.98 0.005 80)` — warm cream
- Ink: `oklch(0.18 0.01 60)` — warm dark
- Accent: `oklch(0.45 0.12 55)` — muted warm purple (for AI label only)
- Status colors: standard red/amber/green/grey (only for risk indicators)

**Responsive behavior:**

- Mobile (<640px): single column, stacked bars hidden, score strip wraps
- Tablet (640-1023px): two-column category grid
- Desktop (1024+): max-width container with subtle borders

## Design C — Structured Ledger

**Aesthetic:** Tabular, precise, architectural. Monospace numbers (JetBrains Mono), grid-based rows, compact like an auditor's workbook.

**Layout:** Compact header + side-by-side briefing/stats + ledger table.

**Structure (top to bottom):**

1. Top bar: group name + CA ref (monospace badge) + risk score pill (score + band)
2. Tab bar (Risk Ledger / CA Data)
3. Summary header (two columns on desktop):
   - Left: AI Briefing box (purple-tinted background)
   - Right: 2×2 stat grid (FAIL/WARN/PASS/MISS)
4. Ledger table header: # | Category | Summary | Breakdown | Rules
5. Filter chips (ALL / FAIL / WARN / MISS / PASS + rule count)
6. 9 ledger rows: numbered, with category name, one-line summary, stacked bar, pass ratio
   - Problem rows (FAIL) have red background tint
   - Warning rows have amber background tint
   - Incomplete rows (MISSING) have grey background tint
   - Click to expand: AI category summary + individual rule items
7. Key Concerns (collapsible row)
8. Key Strengths (collapsible row)
9. Required Conditions (collapsible row)
10. Missing Information (collapsible row)
11. Chat bubble (bottom-right) + dark mode toggle (bottom-right, left of chat)

**Typography:**

- Headings: Manrope (geometric sans)
- Numbers/ratios: JetBrains Mono (monospace)

**Color palette (OKLCH):**

- Surface: `oklch(0.99 0.003 70)` — near-white with warm undertone
- Ink: `oklch(0.15 0.01 70)` — warm black
- Accent: `oklch(0.42 0.14 65)` — warm purple (AI label)
- Status colors: standard red/amber/green/grey

**Responsive behavior:**

- Mobile (<768px): table header hidden, summary/bar/summary columns hidden, full category name shown below, single column layout
- Desktop (768+): full 5-column table

## Design Switcher

A toggle in the result page header area that lets users switch between Design A, B, and C. Three options labeled clearly (e.g., "Layout A", "Layout B", "Layout C"). User preference persisted in localStorage.

## Implementation Notes

- All three designs share the same data layer and components where possible
- The switcher controls which layout component renders
- Individual rule items (RiskItem), category sections, and CA data panel are reused across all designs
- The sidebar-specific components from Design A (ResultSidebar) are only rendered for Design A
- Designs B and C use their own layout components but share RiskItem, RiskCategorySection internals, and CaDataPanel
